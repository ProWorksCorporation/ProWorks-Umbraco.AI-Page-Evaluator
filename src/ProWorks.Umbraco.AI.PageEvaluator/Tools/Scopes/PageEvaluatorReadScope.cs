using Umbraco.AI.Core.Tools.Scopes;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tools.Scopes;

/// <summary>
/// Read scope for the Page Evaluator agent tools: <c>evaluate_current_page</c>, <c>recommend_page_values</c>
/// (Copilot frontend tools) and the <c>evaluate_page</c> server tool (006 research R6). It has no
/// <c>ForEntityTypes</c>, so <c>evaluate_page</c> stays available to agents with no open entity. Discovered by
/// Umbraco.AI through its attribute; no agent receives it automatically.
/// </summary>
[AIToolScope(ScopeId, Icon = "icon-checkbox", Domain = "Page Evaluator")]
public sealed class PageEvaluatorReadScope : AIToolScopeBase
{
    /// <summary>The scope id admins grant per agent (<c>AllowedToolScopeIds</c>).</summary>
    public const string ScopeId = "page-evaluator-read";
}
