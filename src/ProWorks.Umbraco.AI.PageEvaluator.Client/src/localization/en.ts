export default {
  evaluatePage: {
    // Workspace action
    actionLabel: 'Evaluate Page',

    // Modal: chrome
    modalHeadline: 'Page Evaluation',
    rerunButton: 'Re-run Evaluation',
    closeButton: 'Close',
    lastEvaluated: 'Last evaluated:',

    // Modal: progress
    progressSendingData: 'Sending page data\u2026',
    progressWaitingForAI: 'Waiting for AI response\u2026',
    progressRendering: 'Rendering report\u2026',

    // Modal: report sections
    reportScore: 'Score',
    reportChecks: 'checks',
    reportPassed: 'passed',
    reportWarning: 'warning',
    reportWarnings: 'warnings',
    reportFailed: 'failed',
    reportPassingItems: 'Passing Items',
    reportAttentionItems: 'Items Needing Attention',
    reportSuggestions: 'Suggestions',

    // Modal: parse failure warning
    parseFailedWarning:
      'The AI response could not be formatted as a structured report. Raw output is shown below.',
    parseFailedLinkText: 'Refine the evaluator prompt',

    // Modal: AI error
    aiErrorMessage:
      'The evaluation could not be completed. The AI provider returned an error.',
    retryButton: 'Retry',
  },

  evaluatorConfig: {
    // Workspace: list
    sectionLabel: 'Page Evaluator',
    listHeadline: 'Page Evaluator Configurations',
    createButton: 'Create New',
    activeLabel: 'Active',
    inactiveLabel: 'Inactive',
    activateButton: 'Activate',
    editButton: 'Edit',
    deleteButton: 'Delete',
    emptyState: 'No evaluator configurations found. Create one to get started.',
    loadError: 'Failed to load evaluator configurations.',
    activateError: 'Failed to activate the evaluator configuration.',
    deleteError: 'Failed to delete the evaluator configuration.',
    tableHeaderName: 'Name',
    tableHeaderProfile: 'Profile',
    tableHeaderStatus: 'Status',
    tableHeaderActions: 'Actions',

    // Workspace: form chrome
    editHeadline: 'Edit Configuration',
    createHeadline: 'Create Configuration',
    backButton: 'Back',
    backLabel: 'Back to list',

    // Workspace: confirm delete
    deleteConfirmHeadline: 'Delete Configuration',
    deleteConfirmContent: 'Are you sure you want to delete this evaluator configuration?',

    // Form: sections
    generalSection: 'General',
    aiSettingsSection: 'AI Settings',
    propertyFilterSection: 'Property Filter',
    promptSection: 'Prompt',

    // Form: fields
    nameLabel: 'Name',
    nameRequired: 'Name is required.',
    descriptionLabel: 'Description',
    descriptionHelp: 'Optional summary shown in the configuration list.',
    documentTypeLabel: 'Document Type',
    documentTypeHelp: 'The document type this evaluator configuration applies to.',
    documentTypeRequired: 'Document type is required.',
    documentTypePlaceholder: 'Search by name\u2026',
    documentTypeAliasPrefix: 'Alias:',
    documentTypeAliasError: 'Could not retrieve alias for the selected document type.',
    profileLabel: 'AI Profile',
    profileHelp: 'The Umbraco.AI chat profile used when evaluating pages.',
    profileRequired: 'AI Profile is required.',
    contextLabel: 'AI Context',
    contextHelp: 'Optional Umbraco.AI context to inject alongside the prompt.',
    propertiesLabel: 'Properties to Evaluate',
    propertiesHelp: 'Select which properties to include in the evaluation. If none are selected, all properties will be sent.',
    promptLabel: 'Evaluation Prompt',
    promptHelp: 'The prompt sent to the AI to evaluate page content.',
    promptRequired: 'Prompt text is required.',
    validationBanner: 'Please fix the following before saving:',
    saveButton: 'Save',
    savingButton: 'Saving\u2026',
    cancelButton: 'Cancel',
    validationRequired: 'This field is required.',
  },

  promptBuilder: {
    openButton: 'Open Prompt Builder',
    title: 'Prompt Builder',
    categoriesLabel: 'Checklist Categories',
    siteContextLabel: 'Site Context (optional)',
    generateButton: 'Generate Prompt Draft',
    usePromptButton: 'Use This Prompt',
    propertiesLabel: 'Document Type Properties',
    generatedDraftLabel: 'Generated Draft',
    loadError: 'Could not load document type properties.',
  },
};
