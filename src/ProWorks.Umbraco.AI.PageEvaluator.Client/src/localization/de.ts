export default {
  evaluatePage: {
    // Workspace action
    actionLabel: 'Seite bewerten',

    // Modal: chrome
    modalHeadline: 'Seitenbewertung',
    rerunButton: 'Bewertung erneut ausführen',
    closeButton: 'Schließen',
    lastEvaluated: 'Zuletzt bewertet:',

    // Modal: progress
    progressSendingData: 'Seitendaten werden gesendet…',
    progressWaitingForAI: 'Warte auf KI-Antwort…',
    progressRendering: 'Bericht wird erstellt…',

    // Modal: report sections
    reportScore: 'Bewertung',
    reportChecks: 'Prüfungen',
    reportPassed: 'bestanden',
    reportWarning: 'Warnung',
    reportWarnings: 'Warnungen',
    reportFailed: 'fehlgeschlagen',
    reportPassingItems: 'Bestandene Elemente',
    reportAttentionItems: 'Elemente, die Aufmerksamkeit benötigen',
    reportSuggestions: 'Vorschläge',

    // Modal: parse failure warning
    parseFailedWarning:
      'Die KI-Antwort konnte nicht als strukturierter Bericht formatiert werden. Die Rohausgabe wird unten angezeigt.',
    parseFailedLinkText: 'Bewertungs-Prompt verfeinern',
    parseFailedSuffix: 'um die strukturierte Ausgabe zu verbessern.',

    // Modal: AI error
    aiErrorMessage:
      'Die Bewertung konnte nicht abgeschlossen werden. Der KI-Anbieter hat einen Fehler zurückgegeben.',
    temporaryRetryableMessage:
      'Der KI-Anbieter ist vorübergehend nicht verfügbar. Bitte versuchen Sie es in Kürze erneut.',
    connectivityMessage:
      'Der KI-Anbieter konnte nicht erreicht werden. Überprüfen Sie Ihre Verbindung und versuchen Sie es erneut.',
    authenticationConfigurationMessage:
      'Die KI-Verbindung erfordert Aufmerksamkeit. Wenden Sie sich an Ihren Administrator, um die Anmeldedaten oder die Konfiguration des KI-Profils zu überprüfen.',
    retryButton: 'Erneut versuchen',

    // Modal: guardrail block
    guardrailBlockedMessage:
      'Die Bewertung wurde durch eine Umbraco.AI-Guardrail-Richtlinie blockiert. Überprüfen Sie die im KI-Profil konfigurierten Guardrail-Regeln.',

    // Modal: dimensional scoring
    overallScore: 'Gesamtbewertung',
    axisScores: 'Bewertungsübersicht',

    // Recommendations
    recGenerate: 'Empfehlung generieren',
    recGenerating: 'Empfehlung wird generiert…',
    recCurrent: 'Aktueller Wert',
    recCurrentFor: 'Aktueller Wert für',
    recSuggested: 'Vorgeschlagener Wert',
    recSuggestedFor: 'Vorgeschlagener Wert für',
    recApply: 'Auf Feld anwenden',
    recApplied: 'Auf Feld angewendet',
    recRegenerate: 'Neu generieren',
    recCopy: 'Kopieren',
    recCopied: 'Kopiert',
    recError: 'Es konnte keine Empfehlung generiert werden. Versuchen Sie es erneut.',
  },

  evaluatorConfig: {
    // Workspace: list
    sectionLabel: 'Seitenbewerter',
    listHeadline: 'Seitenbewerter-Konfigurationen',
    createButton: 'Neu erstellen',
    activeLabel: 'Aktiv',
    inactiveLabel: 'Inaktiv',
    activateButton: 'Aktivieren',
    editButton: 'Bearbeiten',
    deleteButton: 'Löschen',
    emptyState: 'Keine Bewerter-Konfigurationen gefunden. Erstellen Sie eine, um zu beginnen.',
    loadError: 'Die Bewerter-Konfigurationen konnten nicht geladen werden.',
    formLoadError: 'Die Bewerter-Konfiguration konnte nicht geladen werden.',
    activateError: 'Die Bewerter-Konfiguration konnte nicht aktiviert werden.',
    deleteError: 'Die Bewerter-Konfiguration konnte nicht gelöscht werden.',
    tableHeaderName: 'Name',
    tableHeaderProfile: 'Profil',
    tableHeaderStatus: 'Status',
    tableHeaderActions: 'Aktionen',

    // Workspace: form chrome
    editHeadline: 'Bewerter bearbeiten',
    createHeadline: 'Bewerter erstellen',
    backButton: 'Zurück',
    backLabel: 'Zurück zur Liste',

    // Workspace: confirm delete
    deleteConfirmHeadline: 'Konfiguration löschen',
    deleteConfirmContent: 'Sind Sie sicher, dass Sie diese Bewerter-Konfiguration löschen möchten?',

    // Form: sections
    generalSection: 'Allgemein',
    aiSettingsSection: 'KI-Einstellungen',
    propertyFilterSection: 'Eigenschaftsfilter',
    promptSection: 'Prompt',

    // Form: fields
    nameLabel: 'Name',
    namePlaceholder: 'Namen eingeben…',
    nameRequired: 'Name ist erforderlich.',
    descriptionLabel: 'Beschreibung',
    descriptionHelp: 'Optionale Zusammenfassung, die in der Konfigurationsliste angezeigt wird.',
    documentTypeLabel: 'Dokumenttyp',
    documentTypeHelp: 'Der Dokumenttyp, auf den diese Bewerter-Konfiguration angewendet wird.',
    documentTypeRequired: 'Dokumenttyp ist erforderlich.',
    documentTypePlaceholder: 'Nach Namen suchen…',
    documentTypeAliasPrefix: 'Alias:',
    documentTypeAliasError: 'Der Alias für den ausgewählten Dokumenttyp konnte nicht abgerufen werden.',
    profileLabel: 'KI-Profil',
    profileHelp: 'Das Umbraco.AI-Chatprofil, das bei der Bewertung von Seiten verwendet wird.',
    profileRequired: 'KI-Profil ist erforderlich.',
    contextLabel: 'KI-Kontext',
    contextHelp: 'Optionaler Umbraco.AI-Kontext, der zusammen mit dem Prompt eingefügt wird.',
    propertiesLabel: 'Zu bewertende Eigenschaften',
    propertiesHelp: 'Standardmäßig sind alle Eigenschaften enthalten. Deaktivieren Sie diejenigen, die Sie von der Bewertung ausschließen möchten.',
    propertyReferenceHeading: 'Dokumenttyp-Eigenschaften',
    propertyReferenceHelp: 'Referenz zum Erstellen Ihres Prompts. Ausgeschlossene Eigenschaften (durchgestrichen) werden nicht an die KI gesendet.',
    propertyExcludedTooltip: 'Von der Bewertung ausgeschlossen',
    promptFinalHeading: 'Endgültiger Prompt',
    promptFinalHelp: 'Dies ist der Prompt, der an die KI gesendet wird, wenn der Bewerter ausgeführt wird.',
    promptLabel: 'Bewertungs-Prompt',
    promptHelp: 'Der Prompt, der an die KI gesendet wird, um den Seiteninhalt zu bewerten.',
    promptRequired: 'Prompt-Text ist erforderlich.',
    validationBanner: 'Bitte beheben Sie Folgendes, bevor Sie speichern:',
    saveButton: 'Speichern',
    savingButton: 'Wird gespeichert…',
    cancelButton: 'Abbrechen',
    validationRequired: 'Dieses Feld ist erforderlich.',

    // Form: dimensional scoring
    scoringLabel: 'Bewertung aktivieren',
    scoringHelp: 'Bitten Sie die KI, die Seite auf einer Skala von 1 bis 5 anhand der in Ihrem Prompt genannten Dimensionen zu bewerten.',
    recommendationsLabel: 'Empfehlungen aktivieren',
    recommendationsHelp: 'KI-generierte Empfehlungsschaltflächen neben Prüfungsergebnissen anzeigen, die eine zugeordnete Eigenschaft haben.',
  },

  promoNotice: {
    headline: 'Erfahren Sie, wie KI Ihre Markenbotschaft interpretiert',
    body: 'Erhalten Sie eine kostenlose KI-gestützte Analyse Ihrer Website. Erfahren Sie, wie die Positionierung, Botschaft und der Wert Ihrer Website von der KI interpretiert werden.',
    body2: 'Unser vollständiger Bewertungsservice überprüft Ihre Website, berichtet, wofür die KI Ihre Marke hält, und identifiziert konkrete Probleme und Chancen mit umsetzbaren Empfehlungen.',
    linkText: 'Holen Sie sich Ihre kostenlose Website-Markenanalyse',
  },

  promptBuilder: {
    openButton: 'Prompt-Builder öffnen',
    closeButton: 'Prompt-Builder schließen',
    title: 'Prompt-Builder',
    categoriesLabel: 'Checklisten-Kategorien',
    categoriesHelpText: 'Wählen Sie die Kategorien aus, die in den generierten Prompt aufgenommen werden sollen. Jede Kategorie fügt Bewertungskriterien hinzu, die die KI anhand Ihres Seiteninhalts prüft.',
    siteContextLabel: 'Website-Kontext (optional)',
    siteContextPlaceholder: 'Beschreiben Sie den Zweck der Website, die Zielgruppe oder die Markenrichtlinien…',
    generateButton: 'Prompt-Entwurf generieren',
    usePromptButton: 'Diesen Prompt verwenden',
    propertiesLabel: 'Dokumenttyp-Eigenschaften',
    generatedDraftLabel: 'Generierter Entwurf',
    loadError: 'Die Dokumenttyp-Eigenschaften konnten nicht geladen werden.',
    categoryRequiredFields: 'Pflichtfelder',
    categoryMetadataSeo: 'Metadaten & SEO',
    categoryContentQuality: 'Inhaltsqualität',
    categorySchemaStructuredData: 'Schema & strukturierte Daten',
    categoryAccessibilityVisibility: 'Barrierefreiheit & Sichtbarkeit',
    categoryCallsToAction: 'Handlungsaufforderungen',
  },
};
