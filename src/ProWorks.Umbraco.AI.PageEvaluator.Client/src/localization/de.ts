export default {
  evaluatePage: {
    // Workspace action
    actionLabel: "Seite bewerten",

    // Modal: chrome
    modalHeadline: "Seitenbewertung",
    rerunButton: "Bewertung erneut ausführen",
    closeButton: "Schließen",
    lastEvaluated: "Zuletzt bewertet:",

    // Modal: progress
    progressSendingData: "Seitendaten werden gesendet…",
    progressWaitingForAI: "Warte auf KI-Antwort…",
    progressRendering: "Bericht wird erstellt…",

    // Modal: report sections
    reportScore: "Bewertung",
    reportChecks: "Prüfungen",
    reportPassed: "bestanden",
    reportWarning: "Warnung",
    reportWarnings: "Warnungen",
    reportFailed: "fehlgeschlagen",
    reportPassingItems: "Bestandene Elemente",
    reportAttentionItems: "Elemente, die Aufmerksamkeit benötigen",
    reportSuggestions: "Vorschläge",

    // Modal: parse failure warning
    parseFailedWarning:
      "Die KI-Antwort konnte nicht als strukturierter Bericht formatiert werden. Die Rohausgabe wird unten angezeigt.",
    parseFailedLinkText: "Bewertungs-Prompt verfeinern",
    parseFailedSuffix: "um die strukturierte Ausgabe zu verbessern.",

    // Modal: AI error
    aiErrorMessage:
      "Die Bewertung konnte nicht abgeschlossen werden. Der KI-Anbieter hat einen Fehler zurückgegeben.",
    temporaryRetryableMessage:
      "Der KI-Anbieter ist vorübergehend nicht verfügbar. Bitte versuchen Sie es in Kürze erneut.",
    connectivityMessage:
      "Der KI-Anbieter konnte nicht erreicht werden. Überprüfen Sie Ihre Verbindung und versuchen Sie es erneut.",
    authenticationConfigurationMessage:
      "Die KI-Verbindung erfordert Aufmerksamkeit. Wenden Sie sich an Ihren Administrator, um die Anmeldedaten oder die Konfiguration des KI-Profils zu überprüfen.",
    // 003-upgrade-umbraco-17-6: gateway/culture errors, variability notice, rich-text Apply
    gatewayTimeoutMessage:
      "Die Auswertung hat länger gedauert, als Ihr Netzwerk-Gateway erlaubt, und wurde daher abgebrochen. Bitte versuchen Sie es erneut. Wenn das weiterhin passiert, bitten Sie Ihren Administrator, das Proxy- oder CDN-Timeout für das Backoffice zu erhöhen.",
    gatewayUnreachableMessage:
      "Der Server war über Ihr Netzwerk-Gateway nicht erreichbar. Überprüfen Sie Ihre Verbindung und versuchen Sie es erneut.",
    cultureNotCreatedMessage:
      "Diese Sprachversion der Seite hat noch keinen Inhalt, daher gibt es nichts auszuwerten.",
    invalidCultureMessage:
      "Die ausgewählte Sprache konnte nicht ausgewertet werden. Laden Sie die Seite neu und versuchen Sie es erneut.",
    rteApplyBlockedMessage:
      "Dieser Vorschlag würde eingebettete Inhalte (Blöcke oder Medien) aus dem Feld entfernen und kann daher nicht automatisch übernommen werden. Kopieren Sie ihn und bearbeiten Sie das Feld stattdessen manuell.",
    applyFailedMessage:
      "Der Vorschlag konnte nicht auf dieses Feld angewendet werden. Ihr vorhandener Inhalt wurde nicht verändert.",
    retryButton: "Erneut versuchen",

    // Modal: guardrail block
    guardrailBlockedMessage:
      "Die Bewertung wurde durch eine Umbraco.AI-Guardrail-Richtlinie blockiert. Überprüfen Sie die im KI-Profil konfigurierten Guardrail-Regeln.",

    // Modal: dimensional scoring
    overallScore: "Gesamtbewertung",
    axisScores: "Bewertungsübersicht",

    // Recommendations
    recGenerate: "Empfehlung generieren",
    recGenerating: "Empfehlung wird generiert…",
    recCurrent: "Aktueller Wert",
    recCurrentFor: "Aktueller Wert für",
    recSuggested: "Vorgeschlagener Wert",
    recSuggestedFor: "Vorgeschlagener Wert für",
    recApply: "Auf Feld anwenden",
    recApplied: "Auf Feld angewendet",
    recRegenerate: "Neu generieren",
    recCopy: "Kopieren",
    recCopied: "Kopiert",
    recError:
      "Es konnte keine Empfehlung generiert werden. Versuchen Sie es erneut.",
  },

  evaluatorConfig: {
    // 003-upgrade-umbraco-17-6: sampling-support notice under the profile picker
    samplingVariesNotice:
      "Das ausgewählte KI-Profil verwendet ein Modell, das keine deterministische Ausgabe unterstützt. Die Bewertungen können zwischen wiederholten Auswertungen abweichen.",
    // 005-upgrade-cms-17-8-ai-17-6: profile system-prompt notice under the profile picker
    profileSystemPromptNotice:
      "Das ausgewählte KI-Profil hat einen eigenen System-Prompt. Umbraco.AI sendet ihn bei jeder Bewertung und Empfehlung vor den Anweisungen des Evaluators, was die Ergebnisse verändern oder unbrauchbar machen kann. Verwenden Sie für vorhersehbare Ergebnisse ein eigenes KI-Profil ohne System-Prompt für den Page Evaluator.",
    // Workspace: list
    sectionLabel: "Seitenbewerter",
    listHeadline: "Seitenbewerter-Konfigurationen",
    createButton: "Neu erstellen",
    activeLabel: "Aktiv",
    inactiveLabel: "Inaktiv",
    activateButton: "Aktivieren",
    editButton: "Bearbeiten",
    deleteButton: "Löschen",
    emptyState:
      "Keine Bewerter-Konfigurationen gefunden. Erstellen Sie eine, um zu beginnen.",
    loadError: "Die Bewerter-Konfigurationen konnten nicht geladen werden.",
    formLoadError: "Die Bewerter-Konfiguration konnte nicht geladen werden.",
    activateError: "Die Bewerter-Konfiguration konnte nicht aktiviert werden.",
    deleteError: "Die Bewerter-Konfiguration konnte nicht gelöscht werden.",
    tableHeaderName: "Name",
    tableHeaderProfile: "Profil",
    tableHeaderStatus: "Status",
    tableHeaderActions: "Aktionen",

    // Workspace: form chrome
    editHeadline: "Bewerter bearbeiten",
    createHeadline: "Bewerter erstellen",
    backButton: "Zurück",
    backLabel: "Zurück zur Liste",

    // Workspace: confirm delete
    deleteConfirmHeadline: "Konfiguration löschen",
    deleteConfirmContent:
      "Sind Sie sicher, dass Sie diese Bewerter-Konfiguration löschen möchten?",

    // Form: sections
    generalSection: "Allgemein",
    aiSettingsSection: "KI-Einstellungen",
    propertyFilterSection: "Eigenschaftsfilter",
    promptSection: "Prompt",

    // Form: fields
    nameLabel: "Name",
    namePlaceholder: "Namen eingeben…",
    nameRequired: "Name ist erforderlich.",
    descriptionLabel: "Beschreibung",
    descriptionHelp:
      "Optionale Zusammenfassung, die in der Konfigurationsliste angezeigt wird.",
    documentTypeLabel: "Dokumenttyp",
    documentTypeHelp:
      "Der Dokumenttyp, auf den diese Bewerter-Konfiguration angewendet wird.",
    documentTypeRequired: "Dokumenttyp ist erforderlich.",
    documentTypePlaceholder: "Nach Namen suchen…",
    documentTypeAliasPrefix: "Alias:",
    documentTypeAliasError:
      "Der Alias für den ausgewählten Dokumenttyp konnte nicht abgerufen werden.",
    profileLabel: "KI-Profil",
    profileHelp:
      "Das Umbraco.AI-Chatprofil, das bei der Bewertung von Seiten verwendet wird.",
    profileRequired: "KI-Profil ist erforderlich.",
    contextLabel: "KI-Kontext",
    contextHelp:
      "Optionaler Umbraco.AI-Kontext, der zusammen mit dem Prompt eingefügt wird.",
    propertiesLabel: "Zu bewertende Eigenschaften",
    propertiesHelp:
      "Standardmäßig sind alle Eigenschaften enthalten. Deaktivieren Sie diejenigen, die Sie von der Bewertung ausschließen möchten.",
    propertyReferenceHeading: "Dokumenttyp-Eigenschaften",
    propertyReferenceHelp:
      "Referenz zum Erstellen Ihres Prompts. Ausgeschlossene Eigenschaften (durchgestrichen) werden nicht an die KI gesendet.",
    propertyExcludedTooltip: "Von der Bewertung ausgeschlossen",
    promptFinalHeading: "Endgültiger Prompt",
    promptFinalHelp:
      "Dies ist der Prompt, der an die KI gesendet wird, wenn der Bewerter ausgeführt wird.",
    promptLabel: "Bewertungs-Prompt",
    promptHelp:
      "Der Prompt, der an die KI gesendet wird, um den Seiteninhalt zu bewerten.",
    promptRequired: "Prompt-Text ist erforderlich.",
    validationBanner: "Bitte beheben Sie Folgendes, bevor Sie speichern:",
    saveButton: "Speichern",
    savingButton: "Wird gespeichert…",
    cancelButton: "Abbrechen",
    validationRequired: "Dieses Feld ist erforderlich.",

    // Form: dimensional scoring
    scoringLabel: "Bewertung aktivieren",
    scoringHelp:
      "Bitten Sie die KI, die Seite auf einer Skala von 1 bis 5 anhand der in Ihrem Prompt genannten Dimensionen zu bewerten.",
    recommendationsLabel: "Empfehlungen aktivieren",
    recommendationsHelp:
      "KI-generierte Empfehlungsschaltflächen neben Prüfungsergebnissen anzeigen, die eine zugeordnete Eigenschaft haben.",
  },

  promoNotice: {
    headline: "Erfahren Sie, wie KI Ihre Markenbotschaft interpretiert",
    body: "Erhalten Sie eine kostenlose KI-gestützte Analyse Ihrer Website. Erfahren Sie, wie die Positionierung, Botschaft und der Wert Ihrer Website von der KI interpretiert werden.",
    body2:
      "Unser vollständiger Bewertungsservice überprüft Ihre Website, berichtet, wofür die KI Ihre Marke hält, und identifiziert konkrete Probleme und Chancen mit umsetzbaren Empfehlungen.",
    linkText: "Holen Sie sich Ihre kostenlose Website-Markenanalyse",
  },

  promptBuilder: {
    openButton: "Prompt-Builder öffnen",
    closeButton: "Prompt-Builder schließen",
    title: "Prompt-Builder",
    categoriesLabel: "Checklisten-Kategorien",
    categoriesHelpText:
      "Wählen Sie die Kategorien aus, die in den generierten Prompt aufgenommen werden sollen. Jede Kategorie fügt Bewertungskriterien hinzu, die die KI anhand Ihres Seiteninhalts prüft.",
    siteContextLabel: "Website-Kontext (optional)",
    siteContextPlaceholder:
      "Beschreiben Sie den Zweck der Website, die Zielgruppe oder die Markenrichtlinien…",
    generateButton: "Prompt-Entwurf generieren",
    usePromptButton: "Diesen Prompt verwenden",
    propertiesLabel: "Dokumenttyp-Eigenschaften",
    generatedDraftLabel: "Generierter Entwurf",
    loadError: "Die Dokumenttyp-Eigenschaften konnten nicht geladen werden.",
    categoryRequiredFields: "Pflichtfelder",
    categoryMetadataSeo: "Metadaten & SEO",
    categoryContentQuality: "Inhaltsqualität",
    categorySchemaStructuredData: "Schema & strukturierte Daten",
    categoryAccessibilityVisibility: "Barrierefreiheit & Sichtbarkeit",
    categoryCallsToAction: "Handlungsaufforderungen",
  },
  // 006: Copilot frontend tools and the evaluate_page server tool (Umbraco.AI admin labels: uaiTool_{toolName}Label)
  uaiTool: {
    evaluateCurrentPageLabel: "Aktuelle Seite bewerten",
    evaluateCurrentPageDescription:
      "Bewertet die im Editor geöffnete Seite mit ihren Page-Evaluator-Prüfungen anhand der angezeigten Werte der aktuell angezeigten Sprache.",
    recommendPageValuesLabel: "Werte für die Seite empfehlen",
    recommendPageValuesDescription:
      "Schlägt bessere Werte für Felder vor, die in der Bewertung der Seite von fehlgeschlagenen Prüfungen oder Prüfungen mit Warnung genannt werden.",
    applyPageRecommendationLabel: "Seitenempfehlung übernehmen",
    applyPageRecommendationDescription:
      "Schreibt eine akzeptierte Empfehlung in ihr Feld, nachdem der Benutzer zugestimmt hat. Die Änderung wird nicht gespeichert.",
    evaluatePageLabel: "Seite bewerten",
    evaluatePageDescription:
      "Bewertet die zuletzt gespeicherte Version einer Seite anhand ihrer ID mit ihren Page-Evaluator-Prüfungen.",
  },
  // 006: tool scopes shown when granting tools to an agent
  uaiToolScope: {
    pageEvaluatorReadLabel: "Page Evaluator (Lesen)",
    pageEvaluatorReadDescription:
      "Seiten bewerten und empfohlene Werte abrufen, ohne Inhalte zu ändern",
    pageEvaluatorWriteLabel: "Page Evaluator (Schreiben)",
    pageEvaluatorWriteDescription:
      "Akzeptierte Empfehlungen nach Zustimmung des Benutzers in die geöffnete Seite übernehmen (vorgemerkt, nicht gespeichert)",
  },
  uaiToolScopeDomain: {
    pageEvaluator: "Page Evaluator",
  },
  // 006: approval prompt before the Copilot apply tool writes a value
  pageEvaluatorCopilot: {
    applyApprovalTitle: "Empfehlung übernehmen",
    applyApprovalMessage:
      "Prüfen Sie den oben angezeigten Wert. Er wird im Editor vorbereitet, nicht gespeichert.",
    // 006: Copilot tool renderers (the recommended values shown in the chat)
    recommendationsLoading: "Empfehlungen werden abgerufen…",
    recommendationsHeading: "Empfohlene Werte",
    recommendationsNone: "Es wurden keine Empfehlungen zurückgegeben.",
    recommendationsFailed: "Die Empfehlungen konnten nicht abgerufen werden.",
    recommendationsHint: "Bitten Sie Copilot, die gewünschten zu übernehmen.",
    notApplicableRichTextBlocks:
      "Kann nicht automatisch übernommen werden: Ein eingebetteter Block würde entfernt.",
    notApplicableGeneric:
      "Kann für dieses Feld nicht automatisch übernommen werden.",
    skippedHeading: "Übersprungene Felder",
    skippedNotFailing:
      "keine fehlgeschlagene Prüfung und keine Warnung nennt dieses Feld",
    skippedNotRecommendable:
      "für dieses Feld sind keine Empfehlungen verfügbar",
    skippedNoRecommendation: "es wurde keine Empfehlung zurückgegeben",
    applyLoading: "Änderung wird vorbereitet…",
    applyWillWrite: "Dieser Wert wird in das Feld geschrieben:",
    applyStagedNote: "Im Editor vorbereitet, nicht gespeichert.",
    applyApplied:
      "Übernommen (nicht gespeichert – klicken Sie auf Speichern, um ihn zu behalten).",
    applyNotApplied: "Nicht übernommen.",
    applyNotFound:
      "Empfehlung nicht gefunden. Bitten Sie Copilot um neue Empfehlungen.",
  },
  // 006: settings of the Umbraco Automate "Evaluate Page" step
  pageEvaluatorAutomate: {
    contentKeyLabel: "Seite",
    contentKeyDescription:
      "Der Schlüssel der zu bewertenden Seite. Kann eine Bindung sein, z. B. ${ trigger.contentKey }.",
    cultureLabel: "Seitensprache",
    cultureDescription:
      "Welche Sprachversion der Seite bewertet wird: ein Sprachcode wie de-DE oder eine Bindung an die Sprachen des Auslösers. Erforderlich für Seiten, die nach Sprache variieren. Die Sprache der E-Mail legen Sie unter Berichtssprache fest.",
    passThresholdLabel: "Bestehensschwelle",
    passThresholdDescription:
      "Optional. Die niedrigste Gesamtpunktzahl (1–5, dieselbe Skala wie im Bericht), mit der die Seite besteht.",
    failOnAnyFailedCheckLabel: "Bei jeder fehlgeschlagenen Prüfung durchfallen",
    failOnAnyFailedCheckDescription:
      "Standardmäßig aktiviert. Eine fehlgeschlagene Prüfung lässt die Seite durchfallen, auch wenn die Punktzahl die Schwelle erreicht. Warnungen nie.",
    reportLanguageLabel: "Berichtssprache",
    reportLanguageDescription:
      "Sprache des per E-Mail gesendeten Berichts und der Meldungen. Automatisch verwendet die Sprache der Seite, sofern unterstützt, sonst Englisch.",
  },
};
