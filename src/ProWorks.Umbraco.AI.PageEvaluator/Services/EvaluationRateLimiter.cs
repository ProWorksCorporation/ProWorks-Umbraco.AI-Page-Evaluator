using System.Collections.Concurrent;
using System.Threading.RateLimiting;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;

namespace ProWorks.Umbraco.AI.PageEvaluator.Services;

/// <summary>
/// Singleton fixed-window limiter: <see cref="PermitLimit"/> permits per key per <see cref="Window"/>,
/// <c>QueueLimit = 0</c> (an exhausted window fails immediately, also from <c>AcquireAsync</c>).
/// </summary>
/// <remarks>
/// <para>
/// This replaces the endpoint-only <c>[EnableRateLimiting]</c> policy, whose partitions live inside the ASP.NET
/// middleware: the <c>evaluate_page</c> server tool runs inside Umbraco.AI's agent stream request, so only a shared
/// singleton gives every caller one budget (006 research R4). It also applies on sites that never call
/// <c>app.UseRateLimiter()</c>.
/// </para>
/// <para>
/// It's a small <see cref="PartitionedRateLimiter{TResource}"/> of its own rather than
/// <c>PartitionedRateLimiter.Create</c> + <see cref="FixedWindowRateLimiter"/>, because the built-in limiter has no
/// <see cref="TimeProvider"/> support (it reads <c>Stopwatch</c> even with manual replenishment), so its window
/// couldn't be tested deterministically. Each key's window starts at its first request, like a
/// <see cref="FixedWindowRateLimiter"/> partition; expired windows are swept periodically.
/// </para>
/// </remarks>
public sealed class EvaluationRateLimiter : PartitionedRateLimiter<string>, IEvaluationRateLimiter
{
    /// <summary>Permits per key per window.</summary>
    public const int PermitLimit = 10;

    /// <summary>Window length.</summary>
    public static readonly TimeSpan Window = TimeSpan.FromMinutes(1);

    private const int SweepEvery = 128;

    private readonly TimeProvider _timeProvider;
    private readonly ConcurrentDictionary<string, WindowState> _windows = new(StringComparer.Ordinal);
    private int _acquiresSinceSweep;

    public EvaluationRateLimiter(TimeProvider timeProvider)
    {
        _timeProvider = timeProvider;
    }

    /// <inheritdoc />
    public bool TryAcquire(string key)
    {
        using RateLimitLease lease = AttemptAcquire(key);
        return lease.IsAcquired;
    }

    /// <inheritdoc />
    public override RateLimiterStatistics? GetStatistics(string resource)
    {
        DateTimeOffset now = _timeProvider.GetUtcNow();
        long available = PermitLimit;
        if (_windows.TryGetValue(resource, out WindowState? state))
        {
            lock (state)
            {
                if (now < state.Start + Window)
                    available = PermitLimit - state.Count;
            }
        }

        return new RateLimiterStatistics { CurrentAvailablePermits = available, CurrentQueuedCount = 0 };
    }

    /// <inheritdoc />
    protected override RateLimitLease AttemptAcquireCore(string resource, int permitCount)
    {
        ArgumentOutOfRangeException.ThrowIfNegative(permitCount);
        ArgumentOutOfRangeException.ThrowIfGreaterThan(permitCount, PermitLimit);

        DateTimeOffset now = _timeProvider.GetUtcNow();
        SweepExpiredWindows(now);

        WindowState state = _windows.GetOrAdd(resource, _ => new WindowState(now));
        lock (state)
        {
            if (now >= state.Start + Window)
            {
                state.Start = now;
                state.Count = 0;
            }

            if (permitCount == 0)
                return state.Count < PermitLimit ? Lease.Acquired : Lease.Refused(state.Start + Window - now);

            if (state.Count + permitCount > PermitLimit)
                return Lease.Refused(state.Start + Window - now);

            state.Count += permitCount;
            return Lease.Acquired;
        }
    }

    /// <inheritdoc />
    protected override ValueTask<RateLimitLease> AcquireAsyncCore(
        string resource, int permitCount, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        // QueueLimit = 0: never wait for the next window.
        return ValueTask.FromResult(AttemptAcquireCore(resource, permitCount));
    }

    private void SweepExpiredWindows(DateTimeOffset now)
    {
        if (Interlocked.Increment(ref _acquiresSinceSweep) % SweepEvery != 0)
            return;

        foreach ((string key, WindowState state) in _windows)
        {
            bool expired;
            lock (state)
                expired = now >= state.Start + Window;

            if (expired)
                _windows.TryRemove(new KeyValuePair<string, WindowState>(key, state));
        }
    }

    private sealed class WindowState(DateTimeOffset start)
    {
        public DateTimeOffset Start { get; set; } = start;

        public int Count { get; set; }
    }

    private sealed class Lease : RateLimitLease
    {
        public static readonly Lease Acquired = new(true, null);

        private readonly TimeSpan? _retryAfter;

        private Lease(bool isAcquired, TimeSpan? retryAfter)
        {
            IsAcquired = isAcquired;
            _retryAfter = retryAfter;
        }

        public static Lease Refused(TimeSpan retryAfter) => new(false, retryAfter);

        public override bool IsAcquired { get; }

        public override IEnumerable<string> MetadataNames =>
            _retryAfter is null ? [] : [MetadataName.RetryAfter.Name];

        public override bool TryGetMetadata(string metadataName, out object? metadata)
        {
            if (_retryAfter is { } retryAfter && metadataName == MetadataName.RetryAfter.Name)
            {
                metadata = retryAfter;
                return true;
            }

            metadata = null;
            return false;
        }
    }
}
