using System.Reflection;
using ProWorks.Umbraco.AI.PageEvaluator.Tools.Scopes;
using Umbraco.AI.Core.Tools.Scopes;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.Tools;

/// <summary>
/// Agent tool scopes (006 research R6, contracts/server-tool.md). Umbraco.AI discovers them by their
/// <see cref="AIToolScopeAttribute"/>; admins grant them per agent.
/// </summary>
public class PageEvaluatorScopesTests
{
    private static AIToolScopeAttribute ScopeOf<T>() where T : AIToolScopeBase
        => typeof(T).GetCustomAttribute<AIToolScopeAttribute>(inherit: false)
            ?? throw new InvalidOperationException($"{typeof(T).Name} has no [AIToolScope].");

    [Fact]
    public void ReadScope_IsNonDestructive_AndNotTiedToAnEntityType()
    {
        AIToolScopeAttribute scope = ScopeOf<PageEvaluatorReadScope>();

        Assert.Equal("page-evaluator-read", scope.Id);
        Assert.Equal(PageEvaluatorReadScope.ScopeId, scope.Id);
        Assert.Equal("Page Evaluator", scope.Domain);
        Assert.Equal("icon-checkbox", scope.Icon);
        Assert.False(scope.IsDestructive);
        // No ForEntityTypes: evaluate_page must work without an open entity (e.g. Automate's Run AI Agent).
        Assert.Null(scope.ForEntityTypes);
    }

    [Fact]
    public void WriteScope_IsDestructive_AndForDocuments()
    {
        AIToolScopeAttribute scope = ScopeOf<PageEvaluatorWriteScope>();

        Assert.Equal("page-evaluator-write", scope.Id);
        Assert.Equal(PageEvaluatorWriteScope.ScopeId, scope.Id);
        Assert.Equal("Page Evaluator", scope.Domain);
        Assert.Equal("icon-edit", scope.Icon);
        Assert.True(scope.IsDestructive);
        Assert.Equal(["document"], scope.ForEntityTypes!);
    }

    [Fact]
    public void BothScopes_CanBeConstructed_ByUmbracoAI()
    {
        // AIToolScopeBase reads the attribute in its constructor and throws when it is missing.
        Assert.Equal("page-evaluator-read", new PageEvaluatorReadScope().Id);
        Assert.Empty(new PageEvaluatorReadScope().ForEntityTypes);
        Assert.Equal(["document"], new PageEvaluatorWriteScope().ForEntityTypes);
    }
}
