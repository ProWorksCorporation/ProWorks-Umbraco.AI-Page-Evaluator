namespace ProWorks.Umbraco.AI.PageEvaluator.Deploy;

/// <summary>
/// Constants for the ProWorks AI Page Evaluator Deploy add-on (006 contracts/deploy-artifact.md §2.1).
/// </summary>
public static class PageEvaluatorDeployConstants
{
    /// <summary>UDI entity types registered by the add-on.</summary>
    public static class UdiEntityType
    {
        /// <summary>
        /// UDI entity type for evaluator configurations (<c>umb://proworks-ai-evaluator-config/{guid}</c>). Its
        /// artifacts are Deploy schema items: <c>.uda</c> files under <c>umbraco/Deploy/Revision</c>.
        /// </summary>
        public const string EvaluatorConfig = "proworks-ai-evaluator-config";
    }
}
