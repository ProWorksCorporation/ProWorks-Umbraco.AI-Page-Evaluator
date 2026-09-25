using System.Collections.Concurrent;

namespace ProWorks.Umbraco.AI.PageEvaluator.Services;

/// <summary>
/// Remembers which AI profile versions rejected an enforced response schema (FR-017).
/// </summary>
/// <remarks>
/// In-memory and process-wide (registered as a singleton), so it resets on application restart.
/// Keyed by profile <em>version</em>: editing the profile bumps <c>AIProfile.Version</c>, which makes the
/// next call try the schema again — "until the application restarts or the profile is changed".
/// </remarks>
internal interface IStructuredOutputSupportCache
{
    bool IsKnownUnsupported(Guid profileId, int profileVersion);

    void MarkUnsupported(Guid profileId, int profileVersion);
}

/// <inheritdoc cref="IStructuredOutputSupportCache" />
internal sealed class StructuredOutputSupportCache : IStructuredOutputSupportCache
{
    private readonly ConcurrentDictionary<(Guid ProfileId, int Version), byte> _unsupported = new();

    public bool IsKnownUnsupported(Guid profileId, int profileVersion)
        => _unsupported.ContainsKey((profileId, profileVersion));

    public void MarkUnsupported(Guid profileId, int profileVersion)
        => _unsupported.TryAdd((profileId, profileVersion), 0);
}
