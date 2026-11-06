export default {
  evaluatePage: {
    // Workspace action
    actionLabel: "Valuta pagina",

    // Modal: chrome
    modalHeadline: "Valutazione della pagina",
    rerunButton: "Riesegui valutazione",
    closeButton: "Chiudi",
    lastEvaluated: "Ultima valutazione:",

    // Modal: progress
    progressSendingData: "Invio dei dati della pagina…",
    progressWaitingForAI: "In attesa della risposta dell'IA…",
    progressRendering: "Generazione del report…",

    // Modal: report sections
    reportScore: "Punteggio",
    reportChecks: "controlli",
    reportPassed: "superati",
    reportWarning: "avviso",
    reportWarnings: "avvisi",
    reportFailed: "falliti",
    reportPassingItems: "Elementi superati",
    reportAttentionItems: "Elementi che richiedono attenzione",
    reportSuggestions: "Suggerimenti",

    // Modal: parse failure warning
    parseFailedWarning:
      "La risposta dell'IA non è stata formattata come report strutturato. Di seguito viene mostrato l'output non elaborato.",
    parseFailedLinkText: "Affina il prompt del valutatore",
    parseFailedSuffix: "per migliorare l'output strutturato.",

    // Modal: AI error
    aiErrorMessage:
      "Non è stato possibile completare la valutazione. Il provider IA ha restituito un errore.",
    temporaryRetryableMessage:
      "Il provider IA è temporaneamente non disponibile. Riprova tra un momento.",
    connectivityMessage:
      "Impossibile raggiungere il provider IA. Controlla la connessione e riprova.",
    authenticationConfigurationMessage:
      "La connessione IA richiede attenzione. Contatta l'amministratore per verificare le credenziali o la configurazione del profilo IA.",
    // 003-upgrade-umbraco-17-6: gateway/culture errors, variability notice, rich-text Apply
    gatewayTimeoutMessage:
      "La valutazione ha richiesto più tempo di quanto consentito dal gateway di rete ed è stata interrotta. Riprova. Se continua a succedere, chiedi all'amministratore di aumentare il timeout del proxy o della CDN per il backoffice.",
    gatewayUnreachableMessage:
      "Impossibile raggiungere il server tramite il gateway di rete. Controlla la connessione e riprova.",
    cultureNotCreatedMessage:
      "Questa versione linguistica della pagina non ha ancora contenuti, quindi non c'è nulla da valutare.",
    invalidCultureMessage:
      "Non è stato possibile valutare la lingua selezionata. Ricarica la pagina e riprova.",
    rteApplyBlockedMessage:
      "Questo suggerimento rimuoverebbe contenuti incorporati (blocchi o media) dal campo, quindi non può essere applicato automaticamente. Copialo e modifica il campo manualmente.",
    applyFailedMessage:
      "Non è stato possibile applicare il suggerimento a questo campo. Il contenuto esistente non è stato modificato.",
    retryButton: "Riprova",

    // Modal: guardrail block
    guardrailBlockedMessage:
      "La valutazione è stata bloccata da una policy guardrail di Umbraco.AI. Rivedi le regole guardrail configurate sul profilo IA.",

    // Modal: dimensional scoring
    overallScore: "Punteggio complessivo",
    axisScores: "Ripartizione del punteggio",

    // Recommendations
    recGenerate: "Genera raccomandazione",
    recGenerating: "Generazione raccomandazione…",
    recCurrent: "Valore attuale",
    recCurrentFor: "Valore attuale per",
    recSuggested: "Valore suggerito",
    recSuggestedFor: "Valore suggerito per",
    recApply: "Applica al campo",
    recApplied: "Applicato al campo",
    recRegenerate: "Rigenera",
    recCopy: "Copia",
    recCopied: "Copiato",
    recError: "Impossibile generare una raccomandazione. Riprova.",
  },

  evaluatorConfig: {
    // 003-upgrade-umbraco-17-6: sampling-support notice under the profile picker
    samplingVariesNotice:
      "Il profilo IA selezionato usa un modello che non supporta output deterministico. I punteggi della valutazione potrebbero variare tra un'esecuzione e l'altra.",
    // 005-upgrade-cms-17-8-ai-17-6: profile system-prompt notice under the profile picker
    profileSystemPromptNotice:
      "Il profilo IA selezionato ha un proprio prompt di sistema. Umbraco.AI lo invia prima delle istruzioni del valutatore a ogni valutazione e raccomandazione, il che può modificare o compromettere i risultati. Per risultati prevedibili, usa per il Page Evaluator un profilo IA dedicato senza prompt di sistema.",
    // Workspace: list
    sectionLabel: "Valutatore pagina",
    listHeadline: "Configurazioni del valutatore pagina",
    createButton: "Crea nuovo",
    activeLabel: "Attivo",
    inactiveLabel: "Inattivo",
    activateButton: "Attiva",
    editButton: "Modifica",
    deleteButton: "Elimina",
    emptyState:
      "Nessuna configurazione del valutatore trovata. Creane una per iniziare.",
    loadError: "Impossibile caricare le configurazioni del valutatore.",
    formLoadError: "Impossibile caricare la configurazione del valutatore.",
    activateError: "Impossibile attivare la configurazione del valutatore.",
    deleteError: "Impossibile eliminare la configurazione del valutatore.",
    tableHeaderName: "Nome",
    tableHeaderProfile: "Profilo",
    tableHeaderStatus: "Stato",
    tableHeaderActions: "Azioni",

    // Workspace: form chrome
    editHeadline: "Modifica valutatore",
    createHeadline: "Crea valutatore",
    backButton: "Indietro",
    backLabel: "Torna all'elenco",

    // Workspace: confirm delete
    deleteConfirmHeadline: "Elimina configurazione",
    deleteConfirmContent:
      "Sei sicuro di voler eliminare questa configurazione del valutatore?",

    // Form: sections
    generalSection: "Generale",
    aiSettingsSection: "Impostazioni IA",
    propertyFilterSection: "Filtro proprietà",
    promptSection: "Prompt",

    // Form: fields
    nameLabel: "Nome",
    namePlaceholder: "Inserisci un nome…",
    nameRequired: "Il nome è obbligatorio.",
    descriptionLabel: "Descrizione",
    descriptionHelp:
      "Riepilogo facoltativo mostrato nell'elenco delle configurazioni.",
    documentTypeLabel: "Tipo di documento",
    documentTypeHelp:
      "Il tipo di documento a cui si applica questa configurazione del valutatore.",
    documentTypeRequired: "Il tipo di documento è obbligatorio.",
    documentTypePlaceholder: "Cerca per nome…",
    documentTypeAliasPrefix: "Alias:",
    documentTypeAliasError:
      "Impossibile recuperare l'alias per il tipo di documento selezionato.",
    profileLabel: "Profilo IA",
    profileHelp:
      "Il profilo di chat Umbraco.AI utilizzato durante la valutazione delle pagine.",
    profileRequired: "Il profilo IA è obbligatorio.",
    contextLabel: "Contesto IA",
    contextHelp:
      "Contesto Umbraco.AI facoltativo da inserire insieme al prompt.",
    propertiesLabel: "Proprietà da valutare",
    propertiesHelp:
      "Tutte le proprietà sono incluse per impostazione predefinita. Deseleziona quelle che desideri escludere dalla valutazione.",
    propertyReferenceHeading: "Proprietà del tipo di documento",
    propertyReferenceHelp:
      "Riferimento per comporre il tuo prompt. Le proprietà escluse (barrate) non verranno inviate all'IA.",
    propertyExcludedTooltip: "Escluso dalla valutazione",
    promptFinalHeading: "Prompt finale",
    promptFinalHelp:
      "Questo è il prompt che verrà inviato all'IA quando il valutatore viene eseguito.",
    promptLabel: "Prompt di valutazione",
    promptHelp:
      "Il prompt inviato all'IA per valutare il contenuto della pagina.",
    promptRequired: "Il testo del prompt è obbligatorio.",
    validationBanner: "Correggi quanto segue prima di salvare:",
    saveButton: "Salva",
    savingButton: "Salvataggio…",
    cancelButton: "Annulla",
    validationRequired: "Questo campo è obbligatorio.",

    // Form: dimensional scoring
    scoringLabel: "Abilita punteggio",
    scoringHelp:
      "Chiedi all'IA di valutare la pagina su una scala da 1 a 5 in base alle dimensioni indicate nel prompt.",
    recommendationsLabel: "Abilita raccomandazioni",
    recommendationsHelp:
      "Mostra i pulsanti di raccomandazione generati dall'IA accanto ai risultati dei controlli che hanno una proprietà associata.",
  },

  promoNotice: {
    headline: "Scopri come l'IA interpreta il messaggio del tuo brand",
    body: "Ottieni un'analisi gratuita del tuo sito web basata sull'IA. Scopri come il posizionamento, il messaggio e il valore del tuo sito vengono interpretati dall'IA.",
    body2:
      "Il nostro servizio di valutazione completo esamina il tuo sito web, riporta cosa l'IA pensa rappresenti il tuo brand e identifica problemi e opportunità specifici con raccomandazioni pratiche.",
    linkText: "Ottieni la tua analisi gratuita del brand del sito web",
  },

  promptBuilder: {
    openButton: "Apri generatore di prompt",
    closeButton: "Chiudi generatore di prompt",
    title: "Generatore di prompt",
    categoriesLabel: "Categorie della checklist",
    categoriesHelpText:
      "Seleziona le categorie da includere nel prompt generato. Ogni categoria aggiunge criteri di valutazione che l'IA verificherà rispetto al contenuto della tua pagina.",
    siteContextLabel: "Contesto del sito (facoltativo)",
    siteContextPlaceholder:
      "Descrivi lo scopo del sito, il pubblico o le linee guida del brand…",
    generateButton: "Genera bozza del prompt",
    usePromptButton: "Usa questo prompt",
    propertiesLabel: "Proprietà del tipo di documento",
    generatedDraftLabel: "Bozza generata",
    loadError: "Impossibile caricare le proprietà del tipo di documento.",
    categoryRequiredFields: "Campi obbligatori",
    categoryMetadataSeo: "Metadati e SEO",
    categoryContentQuality: "Qualità dei contenuti",
    categorySchemaStructuredData: "Schema e dati strutturati",
    categoryAccessibilityVisibility: "Accessibilità e visibilità",
    categoryCallsToAction: "Inviti all'azione",
  },
  // 006: Copilot frontend tools and the evaluate_page server tool (Umbraco.AI admin labels: uaiTool_{toolName}Label)
  uaiTool: {
    evaluateCurrentPageLabel: "Valuta la pagina corrente",
    evaluateCurrentPageDescription:
      "Valuta la pagina aperta nell'editor con i suoi controlli di Page Evaluator, usando i valori sullo schermo per la lingua visualizzata.",
    recommendPageValuesLabel: "Raccomanda valori per la pagina",
    recommendPageValuesDescription:
      "Suggerisce valori migliori per i campi indicati dai controlli non superati o con avvisi nella valutazione della pagina.",
    applyPageRecommendationLabel: "Applica raccomandazione per la pagina",
    applyPageRecommendationDescription:
      "Scrive una raccomandazione accettata nel suo campo dopo l'approvazione dell'utente. La modifica non viene salvata.",
    evaluatePageLabel: "Valuta pagina",
    evaluatePageDescription:
      "Valuta l'ultima versione salvata di una pagina, tramite il suo id, con i suoi controlli di Page Evaluator.",
  },
  // 006: tool scopes shown when granting tools to an agent
  uaiToolScope: {
    pageEvaluatorReadLabel: "Page Evaluator (lettura)",
    pageEvaluatorReadDescription:
      "Valutare pagine e ottenere valori raccomandati, senza modificare i contenuti",
    pageEvaluatorWriteLabel: "Page Evaluator (scrittura)",
    pageEvaluatorWriteDescription:
      "Applicare le raccomandazioni accettate alla pagina aperta (in sospeso, non salvate), dopo l'approvazione dell'utente",
  },
  uaiToolScopeDomain: {
    pageEvaluator: "Page Evaluator",
  },
  // 006: approval prompt before the Copilot apply tool writes a value
  pageEvaluatorCopilot: {
    applyApprovalTitle: "Applica raccomandazione",
    applyApprovalMessage:
      "Controlla il valore mostrato sopra. Verrà preparato nell’editor, senza essere salvato.",
    // 006: Copilot tool renderers (the recommended values shown in the chat)
    recommendationsLoading: "Recupero delle raccomandazioni…",
    recommendationsHeading: "Valori consigliati",
    recommendationsNone: "Non è stata restituita alcuna raccomandazione.",
    recommendationsFailed: "Impossibile ottenere le raccomandazioni.",
    recommendationsHint: "Chiedi a Copilot di applicare quelle che vuoi.",
    notApplicableRichTextBlocks:
      "Non può essere applicata automaticamente: rimuoverebbe un blocco incorporato.",
    notApplicableGeneric:
      "Non può essere applicata automaticamente a questo campo.",
    skippedHeading: "Campi saltati",
    skippedNotFailing:
      "nessun controllo non superato o con avviso menziona questo campo",
    skippedNotRecommendable:
      "le raccomandazioni non sono disponibili per questo campo",
    skippedNoRecommendation: "non è stata restituita alcuna raccomandazione",
    applyLoading: "Preparazione della modifica…",
    applyWillWrite: "Questo valore verrà scritto nel campo:",
    applyStagedNote: "Preparato nell’editor, non salvato.",
    applyApplied: "Applicata (non salvata: fai clic su Salva per mantenerla).",
    applyNotApplied: "Non applicata.",
    applyNotFound:
      "Raccomandazione non trovata. Chiedi a Copilot nuove raccomandazioni.",
  },
  // 006: settings of the Umbraco Automate "Evaluate Page" step
  pageEvaluatorAutomate: {
    contentKeyLabel: "Pagina",
    contentKeyDescription:
      "La chiave della pagina da valutare. Può essere un binding, ad esempio ${ trigger.contentKey }.",
    cultureLabel: "Lingua della pagina",
    cultureDescription:
      "Versione linguistica della pagina da valutare: un codice lingua come it-IT o un binding alle lingue del trigger. Obbligatorio per le pagine che variano in base alla lingua. La lingua dell’email si sceglie in Lingua del report.",
    passThresholdLabel: "Soglia di superamento",
    passThresholdDescription:
      "Facoltativa. Il punteggio complessivo minimo (da 1 a 5, la stessa scala del report) per superare la valutazione.",
    failOnAnyFailedCheckLabel: "Non superare se un controllo fallisce",
    failOnAnyFailedCheckDescription:
      "Attivo per impostazione predefinita. Un controllo non superato fa fallire la pagina anche se il punteggio raggiunge la soglia. Gli avvisi mai.",
    reportLanguageLabel: "Lingua del report",
    reportLanguageDescription:
      "Lingua del report inviato per e-mail e dei messaggi. Automatica usa la lingua della pagina se supportata, altrimenti l'inglese.",
  },
};
