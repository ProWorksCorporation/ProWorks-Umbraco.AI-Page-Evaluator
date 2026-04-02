/**
 * Localisation key registration for the ProWorks AI Page Evaluator.
 * All user-visible strings MUST be referenced via these keys and resolved through
 * UmbLocalizationContext — hardcoded English strings in component templates are
 * forbidden per constitution Principle III.
 *
 * Keys follow the Umbraco localisation naming convention:
 *   <section>_<key>
 */

export const LOCALIZATION_KEYS = {
  // Workspace action button
  evaluatePage_actionLabel: 'evaluatePage_actionLabel',

  // Modal: progress messages (FR-013)
  evaluatePage_progressSendingData: 'evaluatePage_progressSendingData',
  evaluatePage_progressWaitingForAI: 'evaluatePage_progressWaitingForAI',
  evaluatePage_progressRendering: 'evaluatePage_progressRendering',

  // Modal: report sections (FR-004)
  evaluatePage_reportScore: 'evaluatePage_reportScore',
  evaluatePage_reportPassingItems: 'evaluatePage_reportPassingItems',
  evaluatePage_reportAttentionItems: 'evaluatePage_reportAttentionItems',
  evaluatePage_reportSuggestions: 'evaluatePage_reportSuggestions',

  // Modal: parse failure warning (FR-015)
  evaluatePage_parseFailedWarning: 'evaluatePage_parseFailedWarning',
  evaluatePage_parseFailedLinkText: 'evaluatePage_parseFailedLinkText',

  // Modal: AI error (FR-011)
  evaluatePage_aiErrorMessage: 'evaluatePage_aiErrorMessage',
  evaluatePage_retryButton: 'evaluatePage_retryButton',

  // Config section: list
  evaluatorConfig_sectionLabel: 'evaluatorConfig_sectionLabel',
  evaluatorConfig_createButton: 'evaluatorConfig_createButton',
  evaluatorConfig_activeLabel: 'evaluatorConfig_activeLabel',
  evaluatorConfig_inactiveLabel: 'evaluatorConfig_inactiveLabel',
  evaluatorConfig_editButton: 'evaluatorConfig_editButton',
  evaluatorConfig_deleteButton: 'evaluatorConfig_deleteButton',
  evaluatorConfig_emptyState: 'evaluatorConfig_emptyState',

  // Config section: form
  evaluatorConfig_nameLabel: 'evaluatorConfig_nameLabel',
  evaluatorConfig_descriptionLabel: 'evaluatorConfig_descriptionLabel',
  evaluatorConfig_documentTypeLabel: 'evaluatorConfig_documentTypeLabel',
  evaluatorConfig_profileLabel: 'evaluatorConfig_profileLabel',
  evaluatorConfig_contextLabel: 'evaluatorConfig_contextLabel',
  evaluatorConfig_promptLabel: 'evaluatorConfig_promptLabel',
  evaluatorConfig_saveButton: 'evaluatorConfig_saveButton',
  evaluatorConfig_cancelButton: 'evaluatorConfig_cancelButton',
  evaluatorConfig_validationRequired: 'evaluatorConfig_validationRequired',

  // Prompt Builder
  promptBuilder_openButton: 'promptBuilder_openButton',
  promptBuilder_title: 'promptBuilder_title',
  promptBuilder_categoriesLabel: 'promptBuilder_categoriesLabel',
  promptBuilder_siteContextLabel: 'promptBuilder_siteContextLabel',
  promptBuilder_generateButton: 'promptBuilder_generateButton',
  promptBuilder_usePromptButton: 'promptBuilder_usePromptButton',
  promptBuilder_propertiesLabel: 'promptBuilder_propertiesLabel',
} as const;

export type LocalizationKey = (typeof LOCALIZATION_KEYS)[keyof typeof LOCALIZATION_KEYS];

/**
 * Default English fallback strings. Used as the en-US localisation resource.
 * Registered via the Umbraco Localisation API at entry-point initialisation.
 */
export const DEFAULT_STRINGS: Record<LocalizationKey, string> = {
  evaluatePage_actionLabel: 'Evaluate Page',
  evaluatePage_progressSendingData: 'Sending page data\u2026',
  evaluatePage_progressWaitingForAI: 'Waiting for AI response\u2026',
  evaluatePage_progressRendering: 'Rendering report\u2026',
  evaluatePage_reportScore: 'Score',
  evaluatePage_reportPassingItems: 'Passing Items',
  evaluatePage_reportAttentionItems: 'Items Needing Attention',
  evaluatePage_reportSuggestions: 'Suggestions',
  evaluatePage_parseFailedWarning:
    'The AI response could not be formatted as a structured report. Raw output is shown below.',
  evaluatePage_parseFailedLinkText: 'Refine the evaluator prompt',
  evaluatePage_aiErrorMessage:
    'The evaluation could not be completed. The AI provider returned an error.',
  evaluatePage_retryButton: 'Retry',
  evaluatorConfig_sectionLabel: 'Page Evaluator',
  evaluatorConfig_createButton: 'Create Evaluator',
  evaluatorConfig_activeLabel: 'Active',
  evaluatorConfig_inactiveLabel: 'Inactive',
  evaluatorConfig_editButton: 'Edit',
  evaluatorConfig_deleteButton: 'Delete',
  evaluatorConfig_emptyState: 'No evaluator configurations yet. Create one to get started.',
  evaluatorConfig_nameLabel: 'Name',
  evaluatorConfig_descriptionLabel: 'Description',
  evaluatorConfig_documentTypeLabel: 'Document Type',
  evaluatorConfig_profileLabel: 'AI Profile',
  evaluatorConfig_contextLabel: 'AI Context (optional)',
  evaluatorConfig_promptLabel: 'Evaluation Prompt',
  evaluatorConfig_saveButton: 'Save',
  evaluatorConfig_cancelButton: 'Cancel',
  evaluatorConfig_validationRequired: 'This field is required.',
  promptBuilder_openButton: 'Open Prompt Builder',
  promptBuilder_title: 'Prompt Builder',
  promptBuilder_categoriesLabel: 'Checklist Categories',
  promptBuilder_siteContextLabel: 'Site Context',
  promptBuilder_generateButton: 'Generate Prompt Draft',
  promptBuilder_usePromptButton: 'Use This Prompt',
  promptBuilder_propertiesLabel: 'Document Type Properties',
};
