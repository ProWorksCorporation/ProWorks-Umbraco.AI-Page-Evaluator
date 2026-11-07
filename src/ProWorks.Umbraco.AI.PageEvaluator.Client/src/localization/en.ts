export default {
  evaluatePage: {
    // Workspace action
    actionLabel: "Evaluate Page",

    // Modal: chrome
    modalHeadline: "Page Evaluation",
    rerunButton: "Re-run Evaluation",
    closeButton: "Close",
    lastEvaluated: "Last evaluated:",

    // Modal: progress
    progressSendingData: "Sending page data\u2026",
    progressWaitingForAI: "Waiting for AI response\u2026",
    progressRendering: "Rendering report\u2026",

    // Modal: report sections
    reportScore: "Score",
    reportChecks: "checks",
    reportPassed: "passed",
    reportWarning: "warning",
    reportWarnings: "warnings",
    reportFailed: "failed",
    reportPassingItems: "Passing Items",
    reportAttentionItems: "Items Needing Attention",
    reportSuggestions: "Suggestions",

    // Modal: parse failure warning
    parseFailedWarning:
      "The AI response could not be formatted as a structured report. Raw output is shown below.",
    parseFailedLinkText: "Refine the evaluator prompt",
    parseFailedSuffix: "to improve structured output.",

    // Modal: AI error
    aiErrorMessage:
      "The evaluation could not be completed. The AI provider returned an error.",
    temporaryRetryableMessage:
      "The AI provider is temporarily unavailable. Please try again in a moment.",
    connectivityMessage:
      "Could not reach the AI provider. Please check your connection and try again.",
    authenticationConfigurationMessage:
      "The AI connection needs attention. Contact your administrator to check the AI profile's credentials or configuration.",
    // 003-upgrade-umbraco-17-6: gateway/culture errors, variability notice, rich-text Apply
    gatewayTimeoutMessage:
      "The evaluation took longer than your network gateway allows, so it was stopped. Please try again. If this keeps happening, ask your administrator to raise the proxy or CDN timeout for the backoffice.",
    gatewayUnreachableMessage:
      "The server could not be reached through your network gateway. Check your connection and try again.",
    cultureNotCreatedMessage:
      "This language version of the page has no content yet, so there is nothing to evaluate.",
    invalidCultureMessage:
      "The selected language could not be evaluated. Reload the page and try again.",
    rteApplyBlockedMessage:
      "This suggestion would remove embedded content (blocks or media) from the field, so it can't be applied automatically. Copy it and edit by hand instead.",
    applyFailedMessage:
      "The suggestion could not be applied to this field. Your existing content has not been changed.",
    retryButton: "Retry",

    // Modal: guardrail block
    guardrailBlockedMessage:
      "The evaluation was blocked by an Umbraco.AI guardrail policy. Review the guardrail rules configured on the AI profile.",

    // Modal: dimensional scoring
    overallScore: "Overall Score",
    axisScores: "Score Breakdown",

    // Recommendations
    recGenerate: "Generate recommendation",
    recGenerating: "Generating recommendation…",
    recCurrent: "Current value",
    recCurrentFor: "Current value for",
    recSuggested: "Suggested value",
    recSuggestedFor: "Suggested value for",
    recApply: "Apply to field",
    recApplied: "Applied to field",
    recRegenerate: "Regenerate",
    recCopy: "Copy",
    recCopied: "Copied",
    recError: "Could not generate a recommendation. Try again.",
  },

  evaluatorConfig: {
    // 003-upgrade-umbraco-17-6: sampling-support notice under the profile picker
    samplingVariesNotice:
      "The selected AI profile uses a model that does not support deterministic output. Evaluation scores may vary between re-runs.",
    // 005-upgrade-cms-17-8-ai-17-6: profile system-prompt notice under the profile picker
    profileSystemPromptNotice:
      "The selected AI profile has its own system prompt. Umbraco.AI sends it ahead of the evaluator's instructions on every evaluation and recommendation, which can change or break the results. For predictable results, use a dedicated AI profile with no system prompt for the Page Evaluator.",
    // Workspace: list
    sectionLabel: "Page Evaluator",
    listHeadline: "Page Evaluator Configurations",
    createButton: "Create New",
    activeLabel: "Active",
    inactiveLabel: "Inactive",
    activateButton: "Activate",
    editButton: "Edit",
    deleteButton: "Delete",
    emptyState: "No evaluator configurations found. Create one to get started.",
    loadError: "Failed to load evaluator configurations.",
    formLoadError: "Failed to load the evaluator configuration.",
    activateError: "Failed to activate the evaluator configuration.",
    deleteError: "Failed to delete the evaluator configuration.",
    tableHeaderName: "Name",
    tableHeaderProfile: "Profile",
    tableHeaderStatus: "Status",
    tableHeaderActions: "Actions",

    // Workspace: form chrome
    editHeadline: "Edit Evaluator",
    createHeadline: "Create Evaluator",
    backButton: "Back",
    backLabel: "Back to list",

    // Workspace: confirm delete
    deleteConfirmHeadline: "Delete Configuration",
    deleteConfirmContent:
      "Are you sure you want to delete this evaluator configuration?",

    // Form: sections
    generalSection: "General",
    aiSettingsSection: "AI Settings",
    propertyFilterSection: "Property Filter",
    promptSection: "Prompt",

    // Form: fields
    nameLabel: "Name",
    namePlaceholder: "Enter a name…",
    nameRequired: "Name is required.",
    descriptionLabel: "Description",
    descriptionHelp: "Optional summary shown in the configuration list.",
    documentTypeLabel: "Document Type",
    documentTypeHelp:
      "The document type this evaluator configuration applies to.",
    documentTypeRequired: "Document type is required.",
    documentTypePlaceholder: "Search by name\u2026",
    documentTypeAliasPrefix: "Alias:",
    documentTypeAliasError:
      "Could not retrieve alias for the selected document type.",
    profileLabel: "AI Profile",
    profileHelp: "The Umbraco.AI chat profile used when evaluating pages.",
    profileRequired: "AI Profile is required.",
    contextLabel: "AI Context",
    contextHelp: "Optional Umbraco.AI context to inject alongside the prompt.",
    propertiesLabel: "Properties to Evaluate",
    propertiesHelp:
      "All properties are included by default. Uncheck any you want to exclude from the evaluation.",
    propertyReferenceHeading: "Document Type Properties",
    propertyReferenceHelp:
      "Reference for composing your prompt. Excluded properties (struck through) will not be sent to the AI.",
    propertyExcludedTooltip: "Excluded from evaluation",
    promptFinalHeading: "Final Prompt",
    promptFinalHelp:
      "This is the prompt that will be sent to the AI when the evaluator runs.",
    promptLabel: "Evaluation Prompt",
    promptHelp: "The prompt sent to the AI to evaluate page content.",
    promptRequired: "Prompt text is required.",
    validationBanner: "Please fix the following before saving:",
    saveButton: "Save",
    savingButton: "Saving\u2026",
    cancelButton: "Cancel",
    validationRequired: "This field is required.",

    // Form: dimensional scoring
    scoringLabel: "Enable Scoring",
    scoringHelp:
      "Ask the AI to rate the page on a 1-5 scale across the dimensions named in your prompt.",
    recommendationsLabel: "Enable Recommendations",
    recommendationsHelp:
      "Show AI-generated recommendation buttons alongside check results that have a mapped property.",
  },

  promoNotice: {
    headline: "See How AI Interprets Your Brand Messaging",
    body: "Get a free AI-driven analysis of your website. Reveal how your site positioning, messaging, and value are interpreted by AI.",
    body2:
      "Our full evaluation service reviews your website, reports what AI thinks your brand represents, and identifies specific issues and opportunities with actionable recommendations.",
    linkText: "Get Your Free Website Brand Analysis",
  },

  promptBuilder: {
    openButton: "Open Prompt Builder",
    closeButton: "Close Prompt Builder",
    title: "Prompt Builder",
    categoriesLabel: "Checklist Categories",
    categoriesHelpText:
      "Select the categories to include in the generated prompt. Each category adds evaluation criteria the AI will check against your page content.",
    siteContextLabel: "Site Context (optional)",
    siteContextPlaceholder:
      "Describe the site purpose, audience, or brand guidelines…",
    generateButton: "Generate Prompt Draft",
    usePromptButton: "Use This Prompt",
    propertiesLabel: "Document Type Properties",
    generatedDraftLabel: "Generated Draft",
    loadError: "Could not load document type properties.",
    categoryRequiredFields: "Required Fields",
    categoryMetadataSeo: "Metadata & SEO",
    categoryContentQuality: "Content Quality",
    categorySchemaStructuredData: "Schema & Structured Data",
    categoryAccessibilityVisibility: "Accessibility & Visibility",
    categoryCallsToAction: "Calls to Action",
  },
  // 006: Copilot frontend tools and the evaluate_page server tool (Umbraco.AI admin labels: uaiTool_{toolName}Label)
  uaiTool: {
    evaluateCurrentPageLabel: "Evaluate current page",
    evaluateCurrentPageDescription:
      "Evaluates the page open in the editor with its Page Evaluator checks, using the values on screen for the language being viewed.",
    recommendPageValuesLabel: "Recommend page values",
    recommendPageValuesDescription:
      "Suggests better values for fields named by failed or warning checks in the page's evaluation.",
    applyPageRecommendationLabel: "Apply page recommendation",
    applyPageRecommendationDescription:
      "Writes an accepted recommendation into its field after the user approves. The change is not saved.",
    evaluatePageLabel: "Evaluate page",
    evaluatePageDescription:
      "Evaluates the latest saved version of a page, by its id, with its Page Evaluator checks.",
  },
  // 006: tool scopes shown when granting tools to an agent
  uaiToolScope: {
    pageEvaluatorReadLabel: "Page Evaluator (Read)",
    pageEvaluatorReadDescription:
      "Evaluate pages and get recommended values, without changing content",
    pageEvaluatorWriteLabel: "Page Evaluator (Write)",
    pageEvaluatorWriteDescription:
      "Apply accepted recommendations to the open page (staged, not saved), after the user approves",
  },
  uaiToolScopeDomain: {
    pageEvaluator: "Page Evaluator",
  },
  // 006: approval prompt before the Copilot apply tool writes a value
  pageEvaluatorCopilot: {
    applyApprovalTitle: "Apply recommendation",
    applyApprovalMessage:
      "Check the value shown above. It will be staged in the editor, not saved.",
    // 006: Copilot tool renderers (the recommended values shown in the chat)
    recommendationsLoading: "Getting recommendations…",
    recommendationsHeading: "Recommended values",
    recommendationsNone: "No recommendations were returned.",
    recommendationsFailed: "Couldn’t get recommendations.",
    recommendationsHint: "Ask Copilot to apply the ones you want.",
    notApplicableRichTextBlocks:
      "Can’t be applied automatically: it would remove an embedded block.",
    notApplicableGeneric: "Can’t be applied automatically to this field.",
    skippedHeading: "Skipped fields",
    skippedNotFailing: "no failed or warning check names this field",
    skippedNotRecommendable: "recommendations aren’t available for this field",
    skippedNoRecommendation: "no recommendation was returned",
    applyLoading: "Preparing the change…",
    applyWillWrite: "Will write this value into the field:",
    applyStagedNote: "Staged in the editor, not saved.",
    applyApplied: "Applied (not saved — click Save to keep it).",
    applyNotApplied: "Not applied.",
    applyNotFound:
      "Recommendation not found. Ask Copilot for new recommendations.",
  },
  // 006: settings of the Umbraco Automate "Evaluate Page" step
  pageEvaluatorAutomate: {
    contentKeyLabel: "Page",
    contentKeyDescription:
      "The key of the page to evaluate. Can be a binding, such as ${ trigger.contentKey }.",
    cultureLabel: "Page language",
    cultureDescription:
      "Which language version of the page to evaluate: a culture code such as en-US, or a binding to the trigger’s cultures. Required for pages that vary by language. The email’s language is set under Report language.",
    passThresholdLabel: "Pass threshold",
    passThresholdDescription:
      "Optional. The lowest overall score (1–5, the same scale as the report) that passes.",
    failOnAnyFailedCheckLabel: "Fail on any failed check",
    failOnAnyFailedCheckDescription:
      "On by default. A failed check fails the page even when the score meets the threshold. Warnings never do.",
    reportLanguageLabel: "Report language",
    reportLanguageDescription:
      "Language of the emailed report and messages. Automatic uses the page's language when it is supported, otherwise English.",
  },
};
