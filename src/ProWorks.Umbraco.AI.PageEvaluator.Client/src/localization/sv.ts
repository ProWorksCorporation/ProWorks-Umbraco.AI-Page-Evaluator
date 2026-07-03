export default {
  evaluatePage: {
    // Workspace action
    actionLabel: 'Utvärdera sida',

    // Modal: chrome
    modalHeadline: 'Sidutvärdering',
    rerunButton: 'Kör utvärdering igen',
    closeButton: 'Stäng',
    lastEvaluated: 'Senast utvärderad:',

    // Modal: progress
    progressSendingData: 'Skickar siddata…',
    progressWaitingForAI: 'Väntar på AI-svar…',
    progressRendering: 'Skapar rapport…',

    // Modal: report sections
    reportScore: 'Poäng',
    reportChecks: 'kontroller',
    reportPassed: 'godkända',
    reportWarning: 'varning',
    reportWarnings: 'varningar',
    reportFailed: 'underkända',
    reportPassingItems: 'Godkända objekt',
    reportAttentionItems: 'Objekt som kräver uppmärksamhet',
    reportSuggestions: 'Förslag',

    // Modal: parse failure warning
    parseFailedWarning:
      'AI-svaret kunde inte formateras som en strukturerad rapport. Rådata visas nedan.',
    parseFailedLinkText: 'Finjustera utvärderarens prompt',
    parseFailedSuffix: 'för att förbättra den strukturerade utdata.',

    // Modal: AI error
    aiErrorMessage:
      'Utvärderingen kunde inte slutföras. AI-leverantören returnerade ett fel.',
    temporaryRetryableMessage:
      'AI-leverantören är tillfälligt otillgänglig. Försök igen om en stund.',
    connectivityMessage:
      'Det gick inte att nå AI-leverantören. Kontrollera din anslutning och försök igen.',
    authenticationConfigurationMessage:
      'AI-anslutningen behöver åtgärdas. Kontakta din administratör för att kontrollera AI-profilens autentiseringsuppgifter eller konfiguration.',
    retryButton: 'Försök igen',

    // Modal: guardrail block
    guardrailBlockedMessage:
      'Utvärderingen blockerades av en Umbraco.AI-guardrail-policy. Granska guardrail-reglerna som är konfigurerade på AI-profilen.',

    // Modal: dimensional scoring
    overallScore: 'Totalpoäng',
    axisScores: 'Poängfördelning',

    // Recommendations
    recGenerate: 'Generera rekommendation',
    recGenerating: 'Genererar rekommendation…',
    recCurrent: 'Nuvarande värde',
    recCurrentFor: 'Nuvarande värde för',
    recSuggested: 'Föreslaget värde',
    recSuggestedFor: 'Föreslaget värde för',
    recApply: 'Tillämpa på fält',
    recApplied: 'Tillämpad på fält',
    recRegenerate: 'Generera igen',
    recCopy: 'Kopiera',
    recCopied: 'Kopierad',
    recError: 'Det gick inte att generera en rekommendation. Försök igen.',
  },

  evaluatorConfig: {
    // Workspace: list
    sectionLabel: 'Sidutvärderare',
    listHeadline: 'Konfigurationer för sidutvärderare',
    createButton: 'Skapa ny',
    activeLabel: 'Aktiv',
    inactiveLabel: 'Inaktiv',
    activateButton: 'Aktivera',
    editButton: 'Redigera',
    deleteButton: 'Ta bort',
    emptyState: 'Inga utvärderarkonfigurationer hittades. Skapa en för att komma igång.',
    loadError: 'Det gick inte att läsa in utvärderarkonfigurationerna.',
    formLoadError: 'Det gick inte att läsa in utvärderarkonfigurationen.',
    activateError: 'Det gick inte att aktivera utvärderarkonfigurationen.',
    deleteError: 'Det gick inte att ta bort utvärderarkonfigurationen.',
    tableHeaderName: 'Namn',
    tableHeaderProfile: 'Profil',
    tableHeaderStatus: 'Status',
    tableHeaderActions: 'Åtgärder',

    // Workspace: form chrome
    editHeadline: 'Redigera utvärderare',
    createHeadline: 'Skapa utvärderare',
    backButton: 'Tillbaka',
    backLabel: 'Tillbaka till listan',

    // Workspace: confirm delete
    deleteConfirmHeadline: 'Ta bort konfiguration',
    deleteConfirmContent: 'Är du säker på att du vill ta bort den här utvärderarkonfigurationen?',

    // Form: sections
    generalSection: 'Allmänt',
    aiSettingsSection: 'AI-inställningar',
    propertyFilterSection: 'Egenskapsfilter',
    promptSection: 'Prompt',

    // Form: fields
    nameLabel: 'Namn',
    namePlaceholder: 'Ange ett namn…',
    nameRequired: 'Namn krävs.',
    descriptionLabel: 'Beskrivning',
    descriptionHelp: 'Valfri sammanfattning som visas i konfigurationslistan.',
    documentTypeLabel: 'Dokumenttyp',
    documentTypeHelp: 'Den dokumenttyp som denna utvärderarkonfiguration gäller för.',
    documentTypeRequired: 'Dokumenttyp krävs.',
    documentTypePlaceholder: 'Sök efter namn…',
    documentTypeAliasPrefix: 'Alias:',
    documentTypeAliasError: 'Det gick inte att hämta alias för den valda dokumenttypen.',
    profileLabel: 'AI-profil',
    profileHelp: 'Den Umbraco.AI-chattprofil som används vid utvärdering av sidor.',
    profileRequired: 'AI-profil krävs.',
    contextLabel: 'AI-kontext',
    contextHelp: 'Valfri Umbraco.AI-kontext som ska infogas tillsammans med prompten.',
    propertiesLabel: 'Egenskaper att utvärdera',
    propertiesHelp: 'Alla egenskaper ingår som standard. Avmarkera de du vill exkludera från utvärderingen.',
    propertyReferenceHeading: 'Dokumenttypsegenskaper',
    propertyReferenceHelp: 'Referens för att skapa din prompt. Exkluderade egenskaper (överstrukna) skickas inte till AI:n.',
    propertyExcludedTooltip: 'Exkluderad från utvärdering',
    promptFinalHeading: 'Slutgiltig prompt',
    promptFinalHelp: 'Detta är prompten som skickas till AI:n när utvärderaren körs.',
    promptLabel: 'Utvärderingsprompt',
    promptHelp: 'Prompten som skickas till AI:n för att utvärdera sidinnehållet.',
    promptRequired: 'Prompttext krävs.',
    validationBanner: 'Åtgärda följande innan du sparar:',
    saveButton: 'Spara',
    savingButton: 'Sparar…',
    cancelButton: 'Avbryt',
    validationRequired: 'Detta fält är obligatoriskt.',

    // Form: dimensional scoring
    scoringLabel: 'Aktivera poängsättning',
    scoringHelp: 'Be AI:n att betygsätta sidan på en skala 1–5 utifrån dimensionerna som anges i din prompt.',
    recommendationsLabel: 'Aktivera rekommendationer',
    recommendationsHelp: 'Visa AI-genererade rekommendationsknappar bredvid kontrollresultat som har en kopplad egenskap.',
  },

  promoNotice: {
    headline: 'Se hur AI tolkar ditt varumärkesbudskap',
    body: 'Få en gratis AI-driven analys av din webbplats. Se hur din webbplats positionering, budskap och värde tolkas av AI.',
    body2: 'Vår fullständiga utvärderingstjänst granskar din webbplats, rapporterar vad AI tror att ditt varumärke representerar och identifierar specifika problem och möjligheter med konkreta rekommendationer.',
    linkText: 'Få din kostnadsfria varumärkesanalys av webbplatsen',
  },

  promptBuilder: {
    openButton: 'Öppna promptbyggare',
    closeButton: 'Stäng promptbyggare',
    title: 'Promptbyggare',
    categoriesLabel: 'Checklistekategorier',
    categoriesHelpText: 'Välj de kategorier som ska ingå i den genererade prompten. Varje kategori lägger till utvärderingskriterier som AI:n kommer att kontrollera mot ditt sidinnehåll.',
    siteContextLabel: 'Webbplatskontext (valfritt)',
    siteContextPlaceholder: 'Beskriv webbplatsens syfte, målgrupp eller varumärkesriktlinjer…',
    generateButton: 'Generera promptutkast',
    usePromptButton: 'Använd den här prompten',
    propertiesLabel: 'Dokumenttypsegenskaper',
    generatedDraftLabel: 'Genererat utkast',
    loadError: 'Det gick inte att läsa in dokumenttypsegenskaper.',
    categoryRequiredFields: 'Obligatoriska fält',
    categoryMetadataSeo: 'Metadata och SEO',
    categoryContentQuality: 'Innehållskvalitet',
    categorySchemaStructuredData: 'Schema och strukturerad data',
    categoryAccessibilityVisibility: 'Tillgänglighet och synlighet',
    categoryCallsToAction: 'Uppmaningar till handling',
  },
};
