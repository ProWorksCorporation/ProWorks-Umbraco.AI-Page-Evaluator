using ProWorks.Umbraco.AI.PageEvaluator.Services;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.Services;

/// <summary>
/// Remembers schema rejections per (profile, profile version) until restart (FR-017).
/// </summary>
public class StructuredOutputSupportCacheTests
{
    [Fact]
    public void UnknownProfiles_AreNotKnownUnsupported()
        => Assert.False(new StructuredOutputSupportCache().IsKnownUnsupported(Guid.NewGuid(), 1));

    [Fact]
    public void MarkUnsupported_AppliesToThatProfileVersionOnly()
    {
        var cache = new StructuredOutputSupportCache();
        var profileId = Guid.NewGuid();

        cache.MarkUnsupported(profileId, 3);

        Assert.True(cache.IsKnownUnsupported(profileId, 3));
        Assert.False(cache.IsKnownUnsupported(profileId, 4));
        Assert.False(cache.IsKnownUnsupported(Guid.NewGuid(), 3));
    }

    [Fact]
    public void ConcurrentMarks_AreSafe()
    {
        var cache = new StructuredOutputSupportCache();
        Guid[] ids = Enumerable.Range(0, 200).Select(_ => Guid.NewGuid()).ToArray();

        Parallel.ForEach(ids, id => cache.MarkUnsupported(id, 1));

        Assert.All(ids, id => Assert.True(cache.IsKnownUnsupported(id, 1)));
    }
}
