const e = {
  evaluatePage: {
    // Workspace action
    actionLabel: "Évaluer la page",
    // Modal: chrome
    modalHeadline: "Évaluation de la page",
    rerunButton: "Relancer l'évaluation",
    closeButton: "Fermer",
    lastEvaluated: "Dernière évaluation :",
    // Modal: progress
    progressSendingData: "Envoi des données de la page…",
    progressWaitingForAI: "En attente de la réponse de l'IA…",
    progressRendering: "Génération du rapport…",
    // Modal: report sections
    reportScore: "Score",
    reportChecks: "vérifications",
    reportPassed: "réussies",
    reportWarning: "avertissement",
    reportWarnings: "avertissements",
    reportFailed: "échouées",
    reportPassingItems: "Éléments réussis",
    reportAttentionItems: "Éléments nécessitant une attention",
    reportSuggestions: "Suggestions",
    // Modal: parse failure warning
    parseFailedWarning: "La réponse de l'IA n'a pas pu être mise en forme comme un rapport structuré. La sortie brute est affichée ci-dessous.",
    parseFailedLinkText: "Affiner l'invite de l'évaluateur",
    parseFailedSuffix: "pour améliorer la sortie structurée.",
    // Modal: AI error
    aiErrorMessage: "L'évaluation n'a pas pu être terminée. Le fournisseur d'IA a renvoyé une erreur.",
    temporaryRetryableMessage: "Le fournisseur d'IA est temporairement indisponible. Veuillez réessayer dans un instant.",
    connectivityMessage: "Impossible de contacter le fournisseur d'IA. Vérifiez votre connexion et réessayez.",
    authenticationConfigurationMessage: "La connexion IA nécessite votre attention. Contactez votre administrateur pour vérifier les identifiants ou la configuration du profil IA.",
    retryButton: "Réessayer",
    // Modal: guardrail block
    guardrailBlockedMessage: "L'évaluation a été bloquée par une politique de garde-fou Umbraco.AI. Vérifiez les règles de garde-fou configurées sur le profil IA.",
    // Modal: dimensional scoring
    overallScore: "Score global",
    axisScores: "Détail du score",
    // Recommendations
    recGenerate: "Générer une recommandation",
    recGenerating: "Génération de la recommandation…",
    recCurrent: "Valeur actuelle",
    recCurrentFor: "Valeur actuelle pour",
    recSuggested: "Valeur suggérée",
    recSuggestedFor: "Valeur suggérée pour",
    recApply: "Appliquer au champ",
    recApplied: "Appliqué au champ",
    recRegenerate: "Régénérer",
    recCopy: "Copier",
    recCopied: "Copié",
    recError: "Impossible de générer une recommandation. Réessayez."
  },
  evaluatorConfig: {
    // Workspace: list
    sectionLabel: "Évaluateur de page",
    listHeadline: "Configurations de l'évaluateur de page",
    createButton: "Créer",
    activeLabel: "Actif",
    inactiveLabel: "Inactif",
    activateButton: "Activer",
    editButton: "Modifier",
    deleteButton: "Supprimer",
    emptyState: "Aucune configuration d'évaluateur trouvée. Créez-en une pour commencer.",
    loadError: "Échec du chargement des configurations de l'évaluateur.",
    formLoadError: "Échec du chargement de la configuration de l'évaluateur.",
    activateError: "Échec de l'activation de la configuration de l'évaluateur.",
    deleteError: "Échec de la suppression de la configuration de l'évaluateur.",
    tableHeaderName: "Nom",
    tableHeaderProfile: "Profil",
    tableHeaderStatus: "Statut",
    tableHeaderActions: "Actions",
    // Workspace: form chrome
    editHeadline: "Modifier l'évaluateur",
    createHeadline: "Créer un évaluateur",
    backButton: "Retour",
    backLabel: "Retour à la liste",
    // Workspace: confirm delete
    deleteConfirmHeadline: "Supprimer la configuration",
    deleteConfirmContent: "Êtes-vous sûr de vouloir supprimer cette configuration d'évaluateur ?",
    // Form: sections
    generalSection: "Général",
    aiSettingsSection: "Paramètres IA",
    propertyFilterSection: "Filtre de propriétés",
    promptSection: "Invite",
    // Form: fields
    nameLabel: "Nom",
    namePlaceholder: "Entrez un nom…",
    nameRequired: "Le nom est obligatoire.",
    descriptionLabel: "Description",
    descriptionHelp: "Résumé facultatif affiché dans la liste des configurations.",
    documentTypeLabel: "Type de document",
    documentTypeHelp: "Le type de document auquel s'applique cette configuration d'évaluateur.",
    documentTypeRequired: "Le type de document est obligatoire.",
    documentTypePlaceholder: "Rechercher par nom…",
    documentTypeAliasPrefix: "Alias :",
    documentTypeAliasError: "Impossible de récupérer l'alias du type de document sélectionné.",
    profileLabel: "Profil IA",
    profileHelp: "Le profil de chat Umbraco.AI utilisé lors de l'évaluation des pages.",
    profileRequired: "Le profil IA est obligatoire.",
    contextLabel: "Contexte IA",
    contextHelp: "Contexte Umbraco.AI facultatif à injecter avec l'invite.",
    propertiesLabel: "Propriétés à évaluer",
    propertiesHelp: "Toutes les propriétés sont incluses par défaut. Décochez celles que vous souhaitez exclure de l'évaluation.",
    propertyReferenceHeading: "Propriétés du type de document",
    propertyReferenceHelp: "Référence pour composer votre invite. Les propriétés exclues (barrées) ne seront pas envoyées à l'IA.",
    propertyExcludedTooltip: "Exclu de l'évaluation",
    promptFinalHeading: "Invite finale",
    promptFinalHelp: "Voici l'invite qui sera envoyée à l'IA lors de l'exécution de l'évaluateur.",
    promptLabel: "Invite d'évaluation",
    promptHelp: "L'invite envoyée à l'IA pour évaluer le contenu de la page.",
    promptRequired: "Le texte de l'invite est obligatoire.",
    validationBanner: "Veuillez corriger les éléments suivants avant d'enregistrer :",
    saveButton: "Enregistrer",
    savingButton: "Enregistrement…",
    cancelButton: "Annuler",
    validationRequired: "Ce champ est obligatoire.",
    // Form: dimensional scoring
    scoringLabel: "Activer la notation",
    scoringHelp: "Demander à l'IA de noter la page sur une échelle de 1 à 5 selon les dimensions indiquées dans votre invite.",
    recommendationsLabel: "Activer les recommandations",
    recommendationsHelp: "Afficher des boutons de recommandation générés par IA à côté des résultats de vérification associés à une propriété."
  },
  promoNotice: {
    headline: "Découvrez comment l'IA interprète le message de votre marque",
    body: "Obtenez une analyse gratuite de votre site web basée sur l'IA. Découvrez comment le positionnement, le message et la valeur de votre site sont interprétés par l'IA.",
    body2: "Notre service d'évaluation complet examine votre site web, indique ce que l'IA pense que votre marque représente et identifie des problèmes et opportunités spécifiques avec des recommandations concrètes.",
    linkText: "Obtenez votre analyse gratuite de marque de site web"
  },
  promptBuilder: {
    openButton: "Ouvrir le générateur d'invites",
    closeButton: "Fermer le générateur d'invites",
    title: "Générateur d'invites",
    categoriesLabel: "Catégories de la liste de contrôle",
    categoriesHelpText: "Sélectionnez les catégories à inclure dans l'invite générée. Chaque catégorie ajoute des critères d'évaluation que l'IA vérifiera par rapport au contenu de votre page.",
    siteContextLabel: "Contexte du site (facultatif)",
    siteContextPlaceholder: "Décrivez l'objectif du site, le public ou les directives de marque…",
    generateButton: "Générer un brouillon d'invite",
    usePromptButton: "Utiliser cette invite",
    propertiesLabel: "Propriétés du type de document",
    generatedDraftLabel: "Brouillon généré",
    loadError: "Impossible de charger les propriétés du type de document.",
    categoryRequiredFields: "Champs obligatoires",
    categoryMetadataSeo: "Métadonnées et SEO",
    categoryContentQuality: "Qualité du contenu",
    categorySchemaStructuredData: "Schéma et données structurées",
    categoryAccessibilityVisibility: "Accessibilité et visibilité",
    categoryCallsToAction: "Appels à l'action"
  }
};
export {
  e as default
};
//# sourceMappingURL=fr-CqN3hDFA.js.map
