const e = {
  evaluatePage: {
    // Workspace action
    actionLabel: "Evaluer side",
    // Modal: chrome
    modalHeadline: "Sideevaluering",
    rerunButton: "Kør evaluering igen",
    closeButton: "Luk",
    lastEvaluated: "Sidst evalueret:",
    // Modal: progress
    progressSendingData: "Sender sidedata…",
    progressWaitingForAI: "Venter på AI-svar…",
    progressRendering: "Genererer rapport…",
    // Modal: report sections
    reportScore: "Score",
    reportChecks: "kontroller",
    reportPassed: "bestået",
    reportWarning: "advarsel",
    reportWarnings: "advarsler",
    reportFailed: "fejlet",
    reportPassingItems: "Beståede elementer",
    reportAttentionItems: "Elementer, der kræver opmærksomhed",
    reportSuggestions: "Forslag",
    // Modal: parse failure warning
    parseFailedWarning: "AI-svaret kunne ikke formateres som en struktureret rapport. Rådataene vises nedenfor.",
    parseFailedLinkText: "Finjuster evaluator-prompten",
    parseFailedSuffix: "for at forbedre den strukturerede output.",
    // Modal: AI error
    aiErrorMessage: "Evalueringen kunne ikke gennemføres. AI-udbyderen returnerede en fejl.",
    temporaryRetryableMessage: "AI-udbyderen er midlertidigt utilgængelig. Prøv igen om et øjeblik.",
    connectivityMessage: "Kunne ikke oprette forbindelse til AI-udbyderen. Kontrollér din forbindelse, og prøv igen.",
    authenticationConfigurationMessage: "AI-forbindelsen kræver opmærksomhed. Kontakt din administrator for at kontrollere AI-profilens legitimationsoplysninger eller konfiguration.",
    retryButton: "Prøv igen",
    // Modal: guardrail block
    guardrailBlockedMessage: "Evalueringen blev blokeret af en Umbraco.AI-guardrail-politik. Gennemgå guardrail-reglerne, der er konfigureret på AI-profilen.",
    // Modal: dimensional scoring
    overallScore: "Samlet score",
    axisScores: "Score-fordeling",
    // Recommendations
    recGenerate: "Generer anbefaling",
    recGenerating: "Genererer anbefaling…",
    recCurrent: "Aktuel værdi",
    recCurrentFor: "Aktuel værdi for",
    recSuggested: "Foreslået værdi",
    recSuggestedFor: "Foreslået værdi for",
    recApply: "Anvend på felt",
    recApplied: "Anvendt på felt",
    recRegenerate: "Generer igen",
    recCopy: "Kopiér",
    recCopied: "Kopieret",
    recError: "Kunne ikke generere en anbefaling. Prøv igen."
  },
  evaluatorConfig: {
    // Workspace: list
    sectionLabel: "Sideevaluator",
    listHeadline: "Sideevaluator-konfigurationer",
    createButton: "Opret ny",
    activeLabel: "Aktiv",
    inactiveLabel: "Inaktiv",
    activateButton: "Aktivér",
    editButton: "Rediger",
    deleteButton: "Slet",
    emptyState: "Ingen evaluator-konfigurationer fundet. Opret en for at komme i gang.",
    loadError: "Kunne ikke indlæse evaluator-konfigurationerne.",
    formLoadError: "Kunne ikke indlæse evaluator-konfigurationen.",
    activateError: "Kunne ikke aktivere evaluator-konfigurationen.",
    deleteError: "Kunne ikke slette evaluator-konfigurationen.",
    tableHeaderName: "Navn",
    tableHeaderProfile: "Profil",
    tableHeaderStatus: "Status",
    tableHeaderActions: "Handlinger",
    // Workspace: form chrome
    editHeadline: "Rediger evaluator",
    createHeadline: "Opret evaluator",
    backButton: "Tilbage",
    backLabel: "Tilbage til listen",
    // Workspace: confirm delete
    deleteConfirmHeadline: "Slet konfiguration",
    deleteConfirmContent: "Er du sikker på, at du vil slette denne evaluator-konfiguration?",
    // Form: sections
    generalSection: "Generelt",
    aiSettingsSection: "AI-indstillinger",
    propertyFilterSection: "Egenskabsfilter",
    promptSection: "Prompt",
    // Form: fields
    nameLabel: "Navn",
    namePlaceholder: "Indtast et navn…",
    nameRequired: "Navn er påkrævet.",
    descriptionLabel: "Beskrivelse",
    descriptionHelp: "Valgfrit resumé, der vises i konfigurationslisten.",
    documentTypeLabel: "Dokumenttype",
    documentTypeHelp: "Den dokumenttype, som denne evaluator-konfiguration gælder for.",
    documentTypeRequired: "Dokumenttype er påkrævet.",
    documentTypePlaceholder: "Søg efter navn…",
    documentTypeAliasPrefix: "Alias:",
    documentTypeAliasError: "Kunne ikke hente alias for den valgte dokumenttype.",
    profileLabel: "AI-profil",
    profileHelp: "Den Umbraco.AI-chatprofil, der bruges til at evaluere sider.",
    profileRequired: "AI-profil er påkrævet.",
    contextLabel: "AI-kontekst",
    contextHelp: "Valgfri Umbraco.AI-kontekst, der skal indsættes sammen med prompten.",
    propertiesLabel: "Egenskaber, der skal evalueres",
    propertiesHelp: "Alle egenskaber er inkluderet som standard. Fjern markeringen af dem, du vil udelukke fra evalueringen.",
    propertyReferenceHeading: "Dokumenttypeegenskaber",
    propertyReferenceHelp: "Reference til at udforme din prompt. Udelukkede egenskaber (gennemstreget) sendes ikke til AI'en.",
    propertyExcludedTooltip: "Udelukket fra evaluering",
    promptFinalHeading: "Endelig prompt",
    promptFinalHelp: "Dette er den prompt, der sendes til AI'en, når evaluatoren kører.",
    promptLabel: "Evalueringsprompt",
    promptHelp: "Den prompt, der sendes til AI'en for at evaluere sideindholdet.",
    promptRequired: "Prompttekst er påkrævet.",
    validationBanner: "Ret følgende, før du gemmer:",
    saveButton: "Gem",
    savingButton: "Gemmer…",
    cancelButton: "Annuller",
    validationRequired: "Dette felt er påkrævet.",
    // Form: dimensional scoring
    scoringLabel: "Aktivér scoring",
    scoringHelp: "Bed AI'en om at bedømme siden på en skala fra 1-5 på tværs af de dimensioner, der er angivet i din prompt.",
    recommendationsLabel: "Aktivér anbefalinger",
    recommendationsHelp: "Vis AI-genererede anbefalingsknapper sammen med kontrolresultater, der har en tilknyttet egenskab."
  },
  promoNotice: {
    headline: "Se, hvordan AI fortolker din brand-besked",
    body: "Få en gratis AI-drevet analyse af din hjemmeside. Se, hvordan din sides positionering, budskab og værdi fortolkes af AI.",
    body2: "Vores fulde evalueringsservice gennemgår din hjemmeside, rapporterer, hvad AI mener dit brand repræsenterer, og identificerer specifikke problemer og muligheder med handlingsorienterede anbefalinger.",
    linkText: "Få din gratis brand-analyse af hjemmesiden"
  },
  promptBuilder: {
    openButton: "Åbn promptbygger",
    closeButton: "Luk promptbygger",
    title: "Promptbygger",
    categoriesLabel: "Tjeklistekategorier",
    categoriesHelpText: "Vælg de kategorier, der skal inkluderes i den genererede prompt. Hver kategori tilføjer evalueringskriterier, som AI'en vil kontrollere mod dit sideindhold.",
    siteContextLabel: "Sitekontekst (valgfrit)",
    siteContextPlaceholder: "Beskriv sitets formål, målgruppe eller brand-retningslinjer…",
    generateButton: "Generer promptudkast",
    usePromptButton: "Brug denne prompt",
    propertiesLabel: "Dokumenttypeegenskaber",
    generatedDraftLabel: "Genereret udkast",
    loadError: "Kunne ikke indlæse dokumenttypeegenskaber.",
    categoryRequiredFields: "Påkrævede felter",
    categoryMetadataSeo: "Metadata og SEO",
    categoryContentQuality: "Indholdskvalitet",
    categorySchemaStructuredData: "Schema og strukturerede data",
    categoryAccessibilityVisibility: "Tilgængelighed og synlighed",
    categoryCallsToAction: "Call-to-actions"
  }
};
export {
  e as default
};
//# sourceMappingURL=da-C0gvm61u.js.map
