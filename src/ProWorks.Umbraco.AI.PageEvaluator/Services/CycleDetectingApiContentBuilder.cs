using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core.DeliveryApi;
using Umbraco.Cms.Core.Models.DeliveryApi;
using Umbraco.Cms.Core.Models.PublishedContent;

namespace ProWorks.Umbraco.AI.PageEvaluator.Services;

/// <summary>
/// Decorates <see cref="IApiContentBuilder"/> to detect and break cyclic content-graph
/// references before they cause a <see cref="StackOverflowException"/>.
///
/// Strategy: an <see cref="AsyncLocal{T}"/> <see cref="HashSet{T}"/> tracks the content
/// node Keys visited on the current async call chain. When a node is seen for a second
/// time before its first <see cref="Build"/> returns (i.e. a cycle), this decorator
/// returns <c>null</c> and logs a warning. Acyclic DAGs are unaffected because each
/// node's key is removed from the set as soon as <see cref="Build"/> returns.
/// </summary>
internal sealed class CycleDetectingApiContentBuilder : IApiContentBuilder
{
    // Null = no traversal in progress on this async call chain.
    // Non-null = a root Build() is in flight; the set contains all node Keys
    // that are currently being processed (i.e. on the call stack).
    private static readonly AsyncLocal<HashSet<Guid>?> _visiting = new();

    private readonly IApiContentBuilder _inner;
    private readonly ILogger<CycleDetectingApiContentBuilder> _logger;

    public CycleDetectingApiContentBuilder(
        IApiContentBuilder inner,
        ILogger<CycleDetectingApiContentBuilder> logger)
    {
        _inner = inner;
        _logger = logger;
    }

    /// <inheritdoc />
    public IApiContent? Build(IPublishedContent content)
    {
        HashSet<Guid>? visited = _visiting.Value;
        bool isRoot = visited is null;

        if (isRoot)
        {
            visited = [];
            _visiting.Value = visited;
        }

        if (!visited!.Add(content.Key))
        {
            _logger.LogWarning(
                "[PageEvaluator] Cyclic content reference detected: node {Key} (id={Id}) is already being expanded. " +
                "Returning null to prevent StackOverflowException. Check your Block List / Content Picker configuration.",
                content.Key, content.Id);
            return null;
        }

        try
        {
            return _inner.Build(content);
        }
        finally
        {
            visited.Remove(content.Key);

            if (isRoot)
                _visiting.Value = null;
        }
    }
}
