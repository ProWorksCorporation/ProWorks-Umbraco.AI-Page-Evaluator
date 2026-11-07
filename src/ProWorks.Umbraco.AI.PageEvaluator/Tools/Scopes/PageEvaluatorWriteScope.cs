using Umbraco.AI.Core.Tools.Scopes;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tools.Scopes;

/// <summary>
/// Write scope for the Copilot <c>apply_page_recommendation</c> frontend tool, which stages a recommended value
/// in the open document (never saves). It has no server tools: it exists because frontend tool scope ids are
/// checked against server-side scopes (006 research R5/R6). Destructive, documents only; no agent receives it
/// automatically.
/// </summary>
[AIToolScope(ScopeId, Icon = "icon-edit", IsDestructive = true, Domain = "Page Evaluator", ForEntityTypes = ["document"])]
public sealed class PageEvaluatorWriteScope : AIToolScopeBase
{
    /// <summary>The scope id admins grant per agent (<c>AllowedToolScopeIds</c>).</summary>
    public const string ScopeId = "page-evaluator-write";
}
