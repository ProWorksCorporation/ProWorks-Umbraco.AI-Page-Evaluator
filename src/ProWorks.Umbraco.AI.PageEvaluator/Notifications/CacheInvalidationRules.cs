using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using Umbraco.Cms.Core.Models;
using Umbraco.Extensions;

namespace ProWorks.Umbraco.AI.PageEvaluator.Notifications;

/// <summary>
/// Shared cache-invalidation rule for publish/unpublish notifications
/// (FR-018e, specs/003-upgrade-umbraco-17-6/contracts/management-api.md §5).
/// </summary>
/// <remarks>
/// CMS 17.6 reports the cultures involved per content key. When that information is missing — the
/// dictionaries are null (descendant re-publish, sort), the node isn't listed (side-effect re-publish),
/// or it lists <c>"*"</c> (invariant content) — every cached culture for the node is cleared. Otherwise
/// only the listed cultures are cleared, plus the pre-upgrade <see cref="string.Empty"/> row on
/// culture-varying documents (it is never shown for a specific culture, so there's no value in keeping it).
/// </remarks>
internal static class CacheInvalidationRules
{
    private const string AllCultures = "*";

    public static async Task InvalidateAsync(
        IEvaluationCacheRepository cacheRepository,
        IContent content,
        IReadOnlyList<IReadOnlyDictionary<Guid, IReadOnlyCollection<string>>?> cultureMaps,
        CancellationToken cancellationToken)
    {
        var cultures = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        bool listed = false;
        foreach (IReadOnlyDictionary<Guid, IReadOnlyCollection<string>>? map in cultureMaps)
        {
            if (map is not null && map.TryGetValue(content.Key, out IReadOnlyCollection<string>? forNode))
            {
                listed = true;
                cultures.UnionWith(forNode);
            }
        }

        if (!listed || cultures.Contains(AllCultures))
        {
            await cacheRepository.DeleteAllCulturesAsync(content.Key, cancellationToken);
            return;
        }

        foreach (string culture in cultures)
            await cacheRepository.DeleteAsync(content.Key, culture.ToLowerInvariant(), cancellationToken);

        if (content.ContentType.VariesByCulture())
            await cacheRepository.DeleteAsync(content.Key, string.Empty, cancellationToken);
    }
}
