export default {
  evaluatePage: {
    // Workspace action
    actionLabel: 'Valuta pagina',

    // Modal: chrome
    modalHeadline: 'Valutazione della pagina',
    rerunButton: 'Riesegui valutazione',
    closeButton: 'Chiudi',
    lastEvaluated: 'Ultima valutazione:',

    // Modal: progress
    progressSendingData: 'Invio dei dati della pagina…',
    progressWaitingForAI: "In attesa della risposta dell'IA…",
    progressRendering: 'Generazione del report…',

    // Modal: report sections
    reportScore: 'Punteggio',
    reportChecks: 'controlli',
    reportPassed: 'superati',
    reportWarning: 'avviso',
    reportWarnings: 'avvisi',
    reportFailed: 'falliti',
    reportPassingItems: 'Elementi superati',
    reportAttentionItems: 'Elementi che richiedono attenzione',
    reportSuggestions: 'Suggerimenti',

    // Modal: parse failure warning
    parseFailedWarning:
      "La risposta dell'IA non è stata formattata come report strutturato. Di seguito viene mostrato l'output non elaborato.",
    parseFailedLinkText: 'Affina il prompt del valutatore',
    parseFailedSuffix: "per migliorare l'output strutturato.",

    // Modal: AI error
    aiErrorMessage:
      'Non è stato possibile completare la valutazione. Il provider IA ha restituito un errore.',
    temporaryRetryableMessage:
      'Il provider IA è temporaneamente non disponibile. Riprova tra un momento.',
    connectivityMessage:
      'Impossibile raggiungere il provider IA. Controlla la connessione e riprova.',
    authenticationConfigurationMessage:
      "La connessione IA richiede attenzione. Contatta l'amministratore per verificare le credenziali o la configurazione del profilo IA.",
    retryButton: 'Riprova',

    // Modal: guardrail block
    guardrailBlockedMessage:
      'La valutazione è stata bloccata da una policy guardrail di Umbraco.AI. Rivedi le regole guardrail configurate sul profilo IA.',

    // Modal: dimensional scoring
    overallScore: 'Punteggio complessivo',
    axisScores: 'Ripartizione del punteggio',

    // Recommendations
    recGenerate: 'Genera raccomandazione',
    recGenerating: 'Generazione raccomandazione…',
    recCurrent: 'Valore attuale',
    recCurrentFor: 'Valore attuale per',
    recSuggested: 'Valore suggerito',
    recSuggestedFor: 'Valore suggerito per',
    recApply: 'Applica al campo',
    recApplied: 'Applicato al campo',
    recRegenerate: 'Rigenera',
    recCopy: 'Copia',
    recCopied: 'Copiato',
    recError: 'Impossibile generare una raccomandazione. Riprova.',
  },

  evaluatorConfig: {
    // Workspace: list
    sectionLabel: 'Valutatore pagina',
    listHeadline: 'Configurazioni del valutatore pagina',
    createButton: 'Crea nuovo',
    activeLabel: 'Attivo',
    inactiveLabel: 'Inattivo',
    activateButton: 'Attiva',
    editButton: 'Modifica',
    deleteButton: 'Elimina',
    emptyState: 'Nessuna configurazione del valutatore trovata. Creane una per iniziare.',
    loadError: 'Impossibile caricare le configurazioni del valutatore.',
    formLoadError: 'Impossibile caricare la configurazione del valutatore.',
    activateError: 'Impossibile attivare la configurazione del valutatore.',
    deleteError: 'Impossibile eliminare la configurazione del valutatore.',
    tableHeaderName: 'Nome',
    tableHeaderProfile: 'Profilo',
    tableHeaderStatus: 'Stato',
    tableHeaderActions: 'Azioni',

    // Workspace: form chrome
    editHeadline: 'Modifica valutatore',
    createHeadline: 'Crea valutatore',
    backButton: 'Indietro',
    backLabel: "Torna all'elenco",

    // Workspace: confirm delete
    deleteConfirmHeadline: 'Elimina configurazione',
    deleteConfirmContent: 'Sei sicuro di voler eliminare questa configurazione del valutatore?',

    // Form: sections
    generalSection: 'Generale',
    aiSettingsSection: 'Impostazioni IA',
    propertyFilterSection: 'Filtro proprietà',
    promptSection: 'Prompt',

    // Form: fields
    nameLabel: 'Nome',
    namePlaceholder: 'Inserisci un nome…',
    nameRequired: 'Il nome è obbligatorio.',
    descriptionLabel: 'Descrizione',
    descriptionHelp: "Riepilogo facoltativo mostrato nell'elenco delle configurazioni.",
    documentTypeLabel: 'Tipo di documento',
    documentTypeHelp: 'Il tipo di documento a cui si applica questa configurazione del valutatore.',
    documentTypeRequired: 'Il tipo di documento è obbligatorio.',
    documentTypePlaceholder: 'Cerca per nome…',
    documentTypeAliasPrefix: 'Alias:',
    documentTypeAliasError: "Impossibile recuperare l'alias per il tipo di documento selezionato.",
    profileLabel: 'Profilo IA',
    profileHelp: 'Il profilo di chat Umbraco.AI utilizzato durante la valutazione delle pagine.',
    profileRequired: 'Il profilo IA è obbligatorio.',
    contextLabel: 'Contesto IA',
    contextHelp: 'Contesto Umbraco.AI facoltativo da inserire insieme al prompt.',
    propertiesLabel: 'Proprietà da valutare',
    propertiesHelp: 'Tutte le proprietà sono incluse per impostazione predefinita. Deseleziona quelle che desideri escludere dalla valutazione.',
    propertyReferenceHeading: 'Proprietà del tipo di documento',
    propertyReferenceHelp: "Riferimento per comporre il tuo prompt. Le proprietà escluse (barrate) non verranno inviate all'IA.",
    propertyExcludedTooltip: 'Escluso dalla valutazione',
    promptFinalHeading: 'Prompt finale',
    promptFinalHelp: "Questo è il prompt che verrà inviato all'IA quando il valutatore viene eseguito.",
    promptLabel: 'Prompt di valutazione',
    promptHelp: "Il prompt inviato all'IA per valutare il contenuto della pagina.",
    promptRequired: 'Il testo del prompt è obbligatorio.',
    validationBanner: 'Correggi quanto segue prima di salvare:',
    saveButton: 'Salva',
    savingButton: 'Salvataggio…',
    cancelButton: 'Annulla',
    validationRequired: 'Questo campo è obbligatorio.',

    // Form: dimensional scoring
    scoringLabel: 'Abilita punteggio',
    scoringHelp: "Chiedi all'IA di valutare la pagina su una scala da 1 a 5 in base alle dimensioni indicate nel prompt.",
    recommendationsLabel: 'Abilita raccomandazioni',
    recommendationsHelp: "Mostra i pulsanti di raccomandazione generati dall'IA accanto ai risultati dei controlli che hanno una proprietà associata.",
  },

  promoNotice: {
    headline: "Scopri come l'IA interpreta il messaggio del tuo brand",
    body: "Ottieni un'analisi gratuita del tuo sito web basata sull'IA. Scopri come il posizionamento, il messaggio e il valore del tuo sito vengono interpretati dall'IA.",
    body2: "Il nostro servizio di valutazione completo esamina il tuo sito web, riporta cosa l'IA pensa rappresenti il tuo brand e identifica problemi e opportunità specifici con raccomandazioni pratiche.",
    linkText: 'Ottieni la tua analisi gratuita del brand del sito web',
  },

  promptBuilder: {
    openButton: 'Apri generatore di prompt',
    closeButton: 'Chiudi generatore di prompt',
    title: 'Generatore di prompt',
    categoriesLabel: 'Categorie della checklist',
    categoriesHelpText: "Seleziona le categorie da includere nel prompt generato. Ogni categoria aggiunge criteri di valutazione che l'IA verificherà rispetto al contenuto della tua pagina.",
    siteContextLabel: 'Contesto del sito (facoltativo)',
    siteContextPlaceholder: 'Descrivi lo scopo del sito, il pubblico o le linee guida del brand…',
    generateButton: 'Genera bozza del prompt',
    usePromptButton: 'Usa questo prompt',
    propertiesLabel: 'Proprietà del tipo di documento',
    generatedDraftLabel: 'Bozza generata',
    loadError: 'Impossibile caricare le proprietà del tipo di documento.',
    categoryRequiredFields: 'Campi obbligatori',
    categoryMetadataSeo: 'Metadati e SEO',
    categoryContentQuality: 'Qualità dei contenuti',
    categorySchemaStructuredData: 'Schema e dati strutturati',
    categoryAccessibilityVisibility: 'Accessibilità e visibilità',
    categoryCallsToAction: "Inviti all'azione",
  },
};
