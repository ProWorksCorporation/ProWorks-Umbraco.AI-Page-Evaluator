const e = {
  evaluatePage: {
    // Workspace action
    actionLabel: "Evaluer side",
    // Modal: chrome
    modalHeadline: "Sideevaluering",
    rerunButton: "Kjør evaluering på nytt",
    closeButton: "Lukk",
    lastEvaluated: "Sist evaluert:",
    // Modal: progress
    progressSendingData: "Sender sidedata…",
    progressWaitingForAI: "Venter på AI-svar…",
    progressRendering: "Genererer rapport…",
    // Modal: report sections
    reportScore: "Poengsum",
    reportChecks: "kontroller",
    reportPassed: "bestått",
    reportWarning: "advarsel",
    reportWarnings: "advarsler",
    reportFailed: "mislyktes",
    reportPassingItems: "Beståtte elementer",
    reportAttentionItems: "Elementer som krever oppmerksomhet",
    reportSuggestions: "Forslag",
    // Modal: parse failure warning
    parseFailedWarning: "AI-svaret kunne ikke formateres som en strukturert rapport. Rådata vises nedenfor.",
    parseFailedLinkText: "Finjuster evaluatorprompten",
    parseFailedSuffix: "for å forbedre den strukturerte utdataen.",
    // Modal: AI error
    aiErrorMessage: "Evalueringen kunne ikke fullføres. AI-leverandøren returnerte en feil.",
    temporaryRetryableMessage: "AI-leverandøren er midlertidig utilgjengelig. Prøv igjen om et øyeblikk.",
    connectivityMessage: "Kunne ikke nå AI-leverandøren. Kontroller tilkoblingen og prøv igjen.",
    authenticationConfigurationMessage: "AI-tilkoblingen trenger oppmerksomhet. Kontakt administratoren for å kontrollere AI-profilens legitimasjon eller konfigurasjon.",
    retryButton: "Prøv igjen",
    // Modal: guardrail block
    guardrailBlockedMessage: "Evalueringen ble blokkert av en Umbraco.AI-guardrail-policy. Se gjennom guardrail-reglene som er konfigurert på AI-profilen.",
    // Modal: dimensional scoring
    overallScore: "Samlet poengsum",
    axisScores: "Poengfordeling",
    // Recommendations
    recGenerate: "Generer anbefaling",
    recGenerating: "Genererer anbefaling…",
    recCurrent: "Gjeldende verdi",
    recCurrentFor: "Gjeldende verdi for",
    recSuggested: "Foreslått verdi",
    recSuggestedFor: "Foreslått verdi for",
    recApply: "Bruk på felt",
    recApplied: "Brukt på felt",
    recRegenerate: "Generer på nytt",
    recCopy: "Kopier",
    recCopied: "Kopiert",
    recError: "Kunne ikke generere en anbefaling. Prøv igjen."
  },
  evaluatorConfig: {
    // Workspace: list
    sectionLabel: "Sideevaluator",
    listHeadline: "Sideevaluator-konfigurasjoner",
    createButton: "Opprett ny",
    activeLabel: "Aktiv",
    inactiveLabel: "Inaktiv",
    activateButton: "Aktiver",
    editButton: "Rediger",
    deleteButton: "Slett",
    emptyState: "Ingen evaluatorkonfigurasjoner funnet. Opprett en for å komme i gang.",
    loadError: "Kunne ikke laste evaluatorkonfigurasjonene.",
    formLoadError: "Kunne ikke laste evaluatorkonfigurasjonen.",
    activateError: "Kunne ikke aktivere evaluatorkonfigurasjonen.",
    deleteError: "Kunne ikke slette evaluatorkonfigurasjonen.",
    tableHeaderName: "Navn",
    tableHeaderProfile: "Profil",
    tableHeaderStatus: "Status",
    tableHeaderActions: "Handlinger",
    // Workspace: form chrome
    editHeadline: "Rediger evaluator",
    createHeadline: "Opprett evaluator",
    backButton: "Tilbake",
    backLabel: "Tilbake til listen",
    // Workspace: confirm delete
    deleteConfirmHeadline: "Slett konfigurasjon",
    deleteConfirmContent: "Er du sikker på at du vil slette denne evaluatorkonfigurasjonen?",
    // Form: sections
    generalSection: "Generelt",
    aiSettingsSection: "AI-innstillinger",
    propertyFilterSection: "Egenskapsfilter",
    promptSection: "Prompt",
    // Form: fields
    nameLabel: "Navn",
    namePlaceholder: "Skriv inn et navn…",
    nameRequired: "Navn er påkrevd.",
    descriptionLabel: "Beskrivelse",
    descriptionHelp: "Valgfritt sammendrag som vises i konfigurasjonslisten.",
    documentTypeLabel: "Dokumenttype",
    documentTypeHelp: "Dokumenttypen denne evaluatorkonfigurasjonen gjelder for.",
    documentTypeRequired: "Dokumenttype er påkrevd.",
    documentTypePlaceholder: "Søk etter navn…",
    documentTypeAliasPrefix: "Alias:",
    documentTypeAliasError: "Kunne ikke hente alias for den valgte dokumenttypen.",
    profileLabel: "AI-profil",
    profileHelp: "Umbraco.AI-chatprofilen som brukes ved evaluering av sider.",
    profileRequired: "AI-profil er påkrevd.",
    contextLabel: "AI-kontekst",
    contextHelp: "Valgfri Umbraco.AI-kontekst som skal settes inn sammen med prompten.",
    propertiesLabel: "Egenskaper som skal evalueres",
    propertiesHelp: "Alle egenskaper er inkludert som standard. Fjern haken for de du vil ekskludere fra evalueringen.",
    propertyReferenceHeading: "Dokumenttypeegenskaper",
    propertyReferenceHelp: "Referanse for å utforme prompten din. Ekskluderte egenskaper (gjennomstreket) sendes ikke til AI-en.",
    propertyExcludedTooltip: "Ekskludert fra evaluering",
    promptFinalHeading: "Endelig prompt",
    promptFinalHelp: "Dette er prompten som sendes til AI-en når evaluatoren kjører.",
    promptLabel: "Evalueringsprompt",
    promptHelp: "Prompten som sendes til AI-en for å evaluere sideinnholdet.",
    promptRequired: "Prompttekst er påkrevd.",
    validationBanner: "Rett opp følgende før du lagrer:",
    saveButton: "Lagre",
    savingButton: "Lagrer…",
    cancelButton: "Avbryt",
    validationRequired: "Dette feltet er påkrevd.",
    // Form: dimensional scoring
    scoringLabel: "Aktiver poengsetting",
    scoringHelp: "Be AI-en om å vurdere siden på en skala fra 1–5 langs dimensjonene som er navngitt i prompten din.",
    recommendationsLabel: "Aktiver anbefalinger",
    recommendationsHelp: "Vis AI-genererte anbefalingsknapper ved siden av kontrollresultater som har en tilknyttet egenskap."
  },
  promoNotice: {
    headline: "Se hvordan AI tolker merkevarebudskapet ditt",
    body: "Få en gratis AI-drevet analyse av nettstedet ditt. Se hvordan nettstedets posisjonering, budskap og verdi tolkes av AI.",
    body2: "Vår fullstendige evalueringstjeneste gjennomgår nettstedet ditt, rapporterer hva AI mener merkevaren din representerer, og identifiserer spesifikke problemer og muligheter med handlingsrettede anbefalinger.",
    linkText: "Få din gratis merkevareanalyse av nettstedet"
  },
  promptBuilder: {
    openButton: "Åpne promptbygger",
    closeButton: "Lukk promptbygger",
    title: "Promptbygger",
    categoriesLabel: "Sjekklistekategorier",
    categoriesHelpText: "Velg kategoriene som skal inkluderes i den genererte prompten. Hver kategori legger til evalueringskriterier som AI-en vil kontrollere mot sideinnholdet ditt.",
    siteContextLabel: "Nettstedkontekst (valgfritt)",
    siteContextPlaceholder: "Beskriv nettstedets formål, målgruppe eller merkevareretningslinjer…",
    generateButton: "Generer promptutkast",
    usePromptButton: "Bruk denne prompten",
    propertiesLabel: "Dokumenttypeegenskaper",
    generatedDraftLabel: "Generert utkast",
    loadError: "Kunne ikke laste dokumenttypeegenskaper.",
    categoryRequiredFields: "Obligatoriske felt",
    categoryMetadataSeo: "Metadata og SEO",
    categoryContentQuality: "Innholdskvalitet",
    categorySchemaStructuredData: "Skjema og strukturerte data",
    categoryAccessibilityVisibility: "Tilgjengelighet og synlighet",
    categoryCallsToAction: "Handlingsoppfordringer"
  }
};
export {
  e as default
};
//# sourceMappingURL=nb-KGQL_anc.js.map
