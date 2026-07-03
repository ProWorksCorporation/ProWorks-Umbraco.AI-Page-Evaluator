const e = {
  evaluatePage: {
    // Workspace action
    actionLabel: "Evaluar página",
    // Modal: chrome
    modalHeadline: "Evaluación de la página",
    rerunButton: "Volver a ejecutar evaluación",
    closeButton: "Cerrar",
    lastEvaluated: "Última evaluación:",
    // Modal: progress
    progressSendingData: "Enviando datos de la página…",
    progressWaitingForAI: "Esperando respuesta de la IA…",
    progressRendering: "Generando informe…",
    // Modal: report sections
    reportScore: "Puntuación",
    reportChecks: "comprobaciones",
    reportPassed: "aprobadas",
    reportWarning: "advertencia",
    reportWarnings: "advertencias",
    reportFailed: "fallidas",
    reportPassingItems: "Elementos aprobados",
    reportAttentionItems: "Elementos que requieren atención",
    reportSuggestions: "Sugerencias",
    // Modal: parse failure warning
    parseFailedWarning: "La respuesta de la IA no se pudo formatear como un informe estructurado. A continuación se muestra la salida sin procesar.",
    parseFailedLinkText: "Ajustar el prompt del evaluador",
    parseFailedSuffix: "para mejorar la salida estructurada.",
    // Modal: AI error
    aiErrorMessage: "No se pudo completar la evaluación. El proveedor de IA devolvió un error.",
    temporaryRetryableMessage: "El proveedor de IA no está disponible temporalmente. Vuelva a intentarlo en un momento.",
    connectivityMessage: "No se pudo contactar con el proveedor de IA. Compruebe su conexión e inténtelo de nuevo.",
    authenticationConfigurationMessage: "La conexión de IA necesita atención. Póngase en contacto con su administrador para revisar las credenciales o la configuración del perfil de IA.",
    retryButton: "Reintentar",
    // Modal: guardrail block
    guardrailBlockedMessage: "La evaluación fue bloqueada por una política de barreras de protección de Umbraco.AI. Revise las reglas de barrera configuradas en el perfil de IA.",
    // Modal: dimensional scoring
    overallScore: "Puntuación general",
    axisScores: "Desglose de la puntuación",
    // Recommendations
    recGenerate: "Generar recomendación",
    recGenerating: "Generando recomendación…",
    recCurrent: "Valor actual",
    recCurrentFor: "Valor actual de",
    recSuggested: "Valor sugerido",
    recSuggestedFor: "Valor sugerido para",
    recApply: "Aplicar al campo",
    recApplied: "Aplicado al campo",
    recRegenerate: "Regenerar",
    recCopy: "Copiar",
    recCopied: "Copiado",
    recError: "No se pudo generar una recomendación. Inténtelo de nuevo."
  },
  evaluatorConfig: {
    // Workspace: list
    sectionLabel: "Evaluador de páginas",
    listHeadline: "Configuraciones del evaluador de páginas",
    createButton: "Crear nuevo",
    activeLabel: "Activo",
    inactiveLabel: "Inactivo",
    activateButton: "Activar",
    editButton: "Editar",
    deleteButton: "Eliminar",
    emptyState: "No se encontraron configuraciones de evaluador. Cree una para empezar.",
    loadError: "No se pudieron cargar las configuraciones del evaluador.",
    formLoadError: "No se pudo cargar la configuración del evaluador.",
    activateError: "No se pudo activar la configuración del evaluador.",
    deleteError: "No se pudo eliminar la configuración del evaluador.",
    tableHeaderName: "Nombre",
    tableHeaderProfile: "Perfil",
    tableHeaderStatus: "Estado",
    tableHeaderActions: "Acciones",
    // Workspace: form chrome
    editHeadline: "Editar evaluador",
    createHeadline: "Crear evaluador",
    backButton: "Volver",
    backLabel: "Volver a la lista",
    // Workspace: confirm delete
    deleteConfirmHeadline: "Eliminar configuración",
    deleteConfirmContent: "¿Está seguro de que desea eliminar esta configuración del evaluador?",
    // Form: sections
    generalSection: "General",
    aiSettingsSection: "Configuración de IA",
    propertyFilterSection: "Filtro de propiedades",
    promptSection: "Prompt",
    // Form: fields
    nameLabel: "Nombre",
    namePlaceholder: "Introduzca un nombre…",
    nameRequired: "El nombre es obligatorio.",
    descriptionLabel: "Descripción",
    descriptionHelp: "Resumen opcional que se muestra en la lista de configuraciones.",
    documentTypeLabel: "Tipo de documento",
    documentTypeHelp: "El tipo de documento al que se aplica esta configuración del evaluador.",
    documentTypeRequired: "El tipo de documento es obligatorio.",
    documentTypePlaceholder: "Buscar por nombre…",
    documentTypeAliasPrefix: "Alias:",
    documentTypeAliasError: "No se pudo obtener el alias del tipo de documento seleccionado.",
    profileLabel: "Perfil de IA",
    profileHelp: "El perfil de chat de Umbraco.AI utilizado al evaluar páginas.",
    profileRequired: "El perfil de IA es obligatorio.",
    contextLabel: "Contexto de IA",
    contextHelp: "Contexto opcional de Umbraco.AI para inyectar junto con el prompt.",
    propertiesLabel: "Propiedades a evaluar",
    propertiesHelp: "Todas las propiedades se incluyen de forma predeterminada. Desmarque las que desee excluir de la evaluación.",
    propertyReferenceHeading: "Propiedades del tipo de documento",
    propertyReferenceHelp: "Referencia para redactar su prompt. Las propiedades excluidas (tachadas) no se enviarán a la IA.",
    propertyExcludedTooltip: "Excluido de la evaluación",
    promptFinalHeading: "Prompt final",
    promptFinalHelp: "Este es el prompt que se enviará a la IA cuando se ejecute el evaluador.",
    promptLabel: "Prompt de evaluación",
    promptHelp: "El prompt enviado a la IA para evaluar el contenido de la página.",
    promptRequired: "El texto del prompt es obligatorio.",
    validationBanner: "Corrija lo siguiente antes de guardar:",
    saveButton: "Guardar",
    savingButton: "Guardando…",
    cancelButton: "Cancelar",
    validationRequired: "Este campo es obligatorio.",
    // Form: dimensional scoring
    scoringLabel: "Habilitar puntuación",
    scoringHelp: "Pida a la IA que califique la página en una escala del 1 al 5 en las dimensiones indicadas en su prompt.",
    recommendationsLabel: "Habilitar recomendaciones",
    recommendationsHelp: "Mostrar botones de recomendación generados por IA junto a los resultados de comprobación que tengan una propiedad asignada."
  },
  promoNotice: {
    headline: "Descubra cómo la IA interpreta el mensaje de su marca",
    body: "Obtenga un análisis gratuito de su sitio web impulsado por IA. Descubra cómo la IA interpreta el posicionamiento, el mensaje y el valor de su sitio.",
    body2: "Nuestro servicio de evaluación completo revisa su sitio web, informa lo que la IA cree que representa su marca e identifica problemas y oportunidades específicos con recomendaciones prácticas.",
    linkText: "Obtenga su análisis gratuito de marca del sitio web"
  },
  promptBuilder: {
    openButton: "Abrir generador de prompts",
    closeButton: "Cerrar generador de prompts",
    title: "Generador de prompts",
    categoriesLabel: "Categorías de la lista de comprobación",
    categoriesHelpText: "Seleccione las categorías que se incluirán en el prompt generado. Cada categoría añade criterios de evaluación que la IA comprobará en el contenido de su página.",
    siteContextLabel: "Contexto del sitio (opcional)",
    siteContextPlaceholder: "Describa el propósito del sitio, la audiencia o las pautas de marca…",
    generateButton: "Generar borrador de prompt",
    usePromptButton: "Usar este prompt",
    propertiesLabel: "Propiedades del tipo de documento",
    generatedDraftLabel: "Borrador generado",
    loadError: "No se pudieron cargar las propiedades del tipo de documento.",
    categoryRequiredFields: "Campos obligatorios",
    categoryMetadataSeo: "Metadatos y SEO",
    categoryContentQuality: "Calidad del contenido",
    categorySchemaStructuredData: "Esquema y datos estructurados",
    categoryAccessibilityVisibility: "Accesibilidad y visibilidad",
    categoryCallsToAction: "Llamadas a la acción"
  }
};
export {
  e as default
};
//# sourceMappingURL=es-CKPvPbeA.js.map
