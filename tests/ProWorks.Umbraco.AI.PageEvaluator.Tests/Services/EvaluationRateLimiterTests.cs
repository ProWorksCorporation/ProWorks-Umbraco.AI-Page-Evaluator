using System.Threading.RateLimiting;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using ProWorks.Umbraco.AI.PageEvaluator.Services;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.Services;

/// <summary>
/// One per-user budget shared by <c>POST /evaluate</c>, <c>POST /recommend</c> and the <c>evaluate_page</c>
/// server tool (006 research R4): a fixed window of 10 per minute per key, no queue.
/// </summary>
public class EvaluationRateLimiterTests
{
    private readonly ManualTimeProvider _time = new(new DateTimeOffset(2026, 11, 3, 12, 0, 0, TimeSpan.Zero));

    private EvaluationRateLimiter CreateSut() => new(_time);

    [Fact]
    public void AllowsTenPermitsPerKeyPerMinute_AndRefusesTheEleventh()
    {
        IEvaluationRateLimiter sut = CreateSut();

        for (int i = 0; i < 10; i++)
            Assert.True(sut.TryAcquire("user-a"), $"request {i + 1} should be allowed");

        Assert.False(sut.TryAcquire("user-a"));
    }

    [Fact]
    public void KeysAreIndependent()
    {
        IEvaluationRateLimiter sut = CreateSut();
        for (int i = 0; i < 10; i++)
            sut.TryAcquire("user-a");

        Assert.False(sut.TryAcquire("user-a"));
        Assert.True(sut.TryAcquire("user-b"));
    }

    [Fact]
    public void TheWindowResetsAfterAMinute()
    {
        IEvaluationRateLimiter sut = CreateSut();
        for (int i = 0; i < 10; i++)
            sut.TryAcquire("user-a");

        _time.Advance(TimeSpan.FromSeconds(59));
        Assert.False(sut.TryAcquire("user-a"));

        _time.Advance(TimeSpan.FromSeconds(1));
        Assert.True(sut.TryAcquire("user-a"));
    }

    [Fact]
    public async Task IsAPartitionedRateLimiter_ThatNeverQueues()
    {
        EvaluationRateLimiter sut = CreateSut();
        PartitionedRateLimiter<string> limiter = sut;
        for (int i = 0; i < 10; i++)
            using (RateLimitLease lease = limiter.AttemptAcquire("user-a"))
                Assert.True(lease.IsAcquired);

        // QueueLimit = 0: an exhausted window fails immediately instead of waiting.
        using RateLimitLease refused = await limiter.AcquireAsync("user-a").AsTask().WaitAsync(TimeSpan.FromSeconds(5));
        Assert.False(refused.IsAcquired);
        Assert.True(refused.TryGetMetadata(MetadataName.RetryAfter, out TimeSpan retryAfter));
        Assert.Equal(TimeSpan.FromMinutes(1), retryAfter);
    }

    [Fact]
    public void AnUnusedKeyReportsTheFullPermitCount()
    {
        EvaluationRateLimiter sut = CreateSut();
        sut.TryAcquire("user-a");

        Assert.Equal(9, sut.GetStatistics("user-a")!.CurrentAvailablePermits);
        Assert.Equal(10, sut.GetStatistics("user-b")!.CurrentAvailablePermits);
    }

    private sealed class ManualTimeProvider(DateTimeOffset start) : TimeProvider
    {
        private DateTimeOffset _now = start;

        public override DateTimeOffset GetUtcNow() => _now;

        public void Advance(TimeSpan by) => _now += by;
    }
}
