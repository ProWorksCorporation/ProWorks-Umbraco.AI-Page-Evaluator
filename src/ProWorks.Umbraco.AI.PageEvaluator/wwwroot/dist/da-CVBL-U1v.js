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
    // 003-upgrade-umbraco-17-6: gateway/culture errors, variability notice, rich-text Apply
    gatewayTimeoutMessage: "Evalueringen tog længere tid, end din netværksgateway tillader, så den blev stoppet. Prøv igen. Hvis det bliver ved med at ske, så bed din administrator om at hæve proxy- eller CDN-timeouten for backoffice.",
    gatewayUnreachableMessage: "Serveren kunne ikke nås gennem din netværksgateway. Kontrollér din forbindelse, og prøv igen.",
    cultureNotCreatedMessage: "Denne sprogversion af siden har endnu intet indhold, så der er intet at evaluere.",
    invalidCultureMessage: "Det valgte sprog kunne ikke evalueres. Genindlæs siden, og prøv igen.",
    rteApplyBlockedMessage: "Dette forslag ville fjerne indlejret indhold (blokke eller medier) fra feltet, så det kan ikke anvendes automatisk. Kopiér det, og redigér manuelt i stedet.",
    applyFailedMessage: "Forslaget kunne ikke anvendes på dette felt. Dit eksisterende indhold er ikke blevet ændret.",
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
    // 003-upgrade-umbraco-17-6: sampling-support notice under the profile picker
    samplingVariesNotice: "Den valgte AI-profil bruger en model, der ikke understøtter deterministisk output. Evalueringsscorerne kan variere mellem kørsler.",
    // 005-upgrade-cms-17-8-ai-17-6: profile system-prompt notice under the profile picker
    profileSystemPromptNotice: "Den valgte AI-profil har sin egen systemprompt. Umbraco.AI sender den før evaluatorens instruktioner ved hver evaluering og anbefaling, hvilket kan ændre eller ødelægge resultaterne. Brug en dedikeret AI-profil uden systemprompt til Page Evaluator for at få forudsigelige resultater.",
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
  },
  // 006: Copilot frontend tools and the evaluate_page server tool (Umbraco.AI admin labels: uaiTool_{toolName}Label)
  uaiTool: {
    evaluateCurrentPageLabel: "Evaluer den aktuelle side",
    evaluateCurrentPageDescription: "Evaluerer siden, der er åben i editoren, med dens Page Evaluator-tjek og bruger værdierne på skærmen for det viste sprog.",
    recommendPageValuesLabel: "Anbefal værdier for siden",
    recommendPageValuesDescription: "Foreslår bedre værdier for felter, som fejlede tjek eller tjek med advarsler i sidens evaluering peger på.",
    applyPageRecommendationLabel: "Anvend sideanbefaling",
    applyPageRecommendationDescription: "Skriver en accepteret anbefaling i dens felt, når brugeren har godkendt den. Ændringen gemmes ikke.",
    evaluatePageLabel: "Evaluer side",
    evaluatePageDescription: "Evaluerer den senest gemte version af en side ud fra dens id med dens Page Evaluator-tjek."
  },
  // 006: tool scopes shown when granting tools to an agent
  uaiToolScope: {
    pageEvaluatorReadLabel: "Page Evaluator (læse)",
    pageEvaluatorReadDescription: "Evaluere sider og hente anbefalede værdier uden at ændre indhold",
    pageEvaluatorWriteLabel: "Page Evaluator (skrive)",
    pageEvaluatorWriteDescription: "Anvende accepterede anbefalinger på den åbne side (klargjort, ikke gemt), når brugeren har godkendt"
  },
  uaiToolScopeDomain: {
    pageEvaluator: "Page Evaluator"
  },
  // 006: approval prompt before the Copilot apply tool writes a value
  pageEvaluatorCopilot: {
    applyApprovalTitle: "Anvend anbefaling",
    applyApprovalMessage: "Kontrollér værdien, der vises ovenfor. Den klargøres i editoren og gemmes ikke.",
    // 006: Copilot tool renderers (the recommended values shown in the chat)
    recommendationsLoading: "Henter anbefalinger…",
    recommendationsHeading: "Anbefalede værdier",
    recommendationsNone: "Der blev ikke returneret nogen anbefalinger.",
    recommendationsFailed: "Anbefalingerne kunne ikke hentes.",
    recommendationsHint: "Bed Copilot om at anvende dem, du vil have.",
    notApplicableRichTextBlocks: "Kan ikke anvendes automatisk: den ville fjerne en indlejret blok.",
    notApplicableGeneric: "Kan ikke anvendes automatisk på dette felt.",
    skippedHeading: "Oversprungne felter",
    skippedNotFailing: "ingen fejlet kontrol eller advarsel nævner dette felt",
    skippedNotRecommendable: "der er ingen anbefalinger til dette felt",
    skippedNoRecommendation: "der blev ikke returneret nogen anbefaling",
    applyLoading: "Forbereder ændringen…",
    applyWillWrite: "Denne værdi skrives i feltet:",
    applyStagedNote: "Klargjort i editoren, ikke gemt.",
    applyApplied: "Anvendt (ikke gemt – klik på Gem for at beholde den).",
    applyNotApplied: "Ikke anvendt.",
    applyNotFound: "Anbefalingen blev ikke fundet. Bed Copilot om nye anbefalinger."
  },
  // 006: settings of the Umbraco Automate "Evaluate Page" step
  pageEvaluatorAutomate: {
    contentKeyLabel: "Side",
    contentKeyDescription: "Nøglen til den side, der skal evalueres. Kan være en binding, f.eks. ${ trigger.contentKey }.",
    cultureLabel: "Sidens sprog",
    cultureDescription: "Hvilken sprogversion af siden der skal evalueres: en sprogkode som da-DK eller en binding til triggerens sprog. Påkrævet for sider, der varierer efter sprog. E-mailens sprog vælges under Rapportsprog.",
    passThresholdLabel: "Beståelsesgrænse",
    passThresholdDescription: "Valgfri. Den laveste samlede score (1–5, samme skala som rapporten), der består.",
    failOnAnyFailedCheckLabel: "Afvis ved ethvert fejlet tjek",
    failOnAnyFailedCheckDescription: "Slået til som standard. Et fejlet tjek afviser siden, selv om scoren når grænsen. Advarsler gør aldrig.",
    reportLanguageLabel: "Rapportsprog",
    reportLanguageDescription: "Sproget i den mailede rapport og i meddelelserne. Automatisk bruger sidens sprog, hvis det understøttes, ellers engelsk."
  }
};
export {
  e as default
};
//# sourceMappingURL=da-CVBL-U1v.js.map
