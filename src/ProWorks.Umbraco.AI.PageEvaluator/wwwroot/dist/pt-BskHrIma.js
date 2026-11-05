const a = {
  evaluatePage: {
    // Workspace action
    actionLabel: "Avaliar página",
    // Modal: chrome
    modalHeadline: "Avaliação da página",
    rerunButton: "Executar avaliação novamente",
    closeButton: "Fechar",
    lastEvaluated: "Última avaliação:",
    // Modal: progress
    progressSendingData: "A enviar dados da página…",
    progressWaitingForAI: "A aguardar resposta da IA…",
    progressRendering: "A gerar relatório…",
    // Modal: report sections
    reportScore: "Pontuação",
    reportChecks: "verificações",
    reportPassed: "aprovadas",
    reportWarning: "aviso",
    reportWarnings: "avisos",
    reportFailed: "reprovadas",
    reportPassingItems: "Itens aprovados",
    reportAttentionItems: "Itens que precisam de atenção",
    reportSuggestions: "Sugestões",
    // Modal: parse failure warning
    parseFailedWarning: "Não foi possível formatar a resposta da IA como um relatório estruturado. A saída bruta é mostrada abaixo.",
    parseFailedLinkText: "Ajustar o prompt do avaliador",
    parseFailedSuffix: "para melhorar a saída estruturada.",
    // Modal: AI error
    aiErrorMessage: "Não foi possível concluir a avaliação. O provedor de IA retornou um erro.",
    temporaryRetryableMessage: "O provedor de IA está temporariamente indisponível. Tente novamente dentro de instantes.",
    connectivityMessage: "Não foi possível contactar o provedor de IA. Verifique a sua ligação e tente novamente.",
    authenticationConfigurationMessage: "A ligação de IA precisa de atenção. Contacte o administrador para verificar as credenciais ou a configuração do perfil de IA.",
    // 003-upgrade-umbraco-17-6: gateway/culture errors, variability notice, rich-text Apply
    gatewayTimeoutMessage: "A avaliação demorou mais do que o seu gateway de rede permite e, por isso, foi interrompida. Tente novamente. Se isso continuar acontecendo, peça ao seu administrador para aumentar o tempo limite do proxy ou da CDN para o backoffice.",
    gatewayUnreachableMessage: "Não foi possível acessar o servidor pelo seu gateway de rede. Verifique sua conexão e tente novamente.",
    cultureNotCreatedMessage: "Esta versão de idioma da página ainda não tem conteúdo, então não há nada para avaliar.",
    invalidCultureMessage: "Não foi possível avaliar o idioma selecionado. Recarregue a página e tente novamente.",
    rteApplyBlockedMessage: "Esta sugestão removeria conteúdo incorporado (blocos ou mídia) do campo, por isso não pode ser aplicada automaticamente. Copie-a e edite manualmente.",
    applyFailedMessage: "Não foi possível aplicar a sugestão a este campo. Seu conteúdo existente não foi alterado.",
    retryButton: "Tentar novamente",
    // Modal: guardrail block
    guardrailBlockedMessage: "A avaliação foi bloqueada por uma política de proteção (guardrail) do Umbraco.AI. Reveja as regras de proteção configuradas no perfil de IA.",
    // Modal: dimensional scoring
    overallScore: "Pontuação geral",
    axisScores: "Detalhamento da pontuação",
    // Recommendations
    recGenerate: "Gerar recomendação",
    recGenerating: "A gerar recomendação…",
    recCurrent: "Valor atual",
    recCurrentFor: "Valor atual para",
    recSuggested: "Valor sugerido",
    recSuggestedFor: "Valor sugerido para",
    recApply: "Aplicar ao campo",
    recApplied: "Aplicado ao campo",
    recRegenerate: "Regenerar",
    recCopy: "Copiar",
    recCopied: "Copiado",
    recError: "Não foi possível gerar uma recomendação. Tente novamente."
  },
  evaluatorConfig: {
    // 003-upgrade-umbraco-17-6: sampling-support notice under the profile picker
    samplingVariesNotice: "O perfil de IA selecionado usa um modelo que não oferece saída determinística. As pontuações da avaliação podem variar entre execuções.",
    // 005-upgrade-cms-17-8-ai-17-6: profile system-prompt notice under the profile picker
    profileSystemPromptNotice: "O perfil de IA selecionado tem o seu próprio prompt de sistema. O Umbraco.AI envia-o antes das instruções do avaliador em cada avaliação e recomendação, o que pode alterar ou estragar os resultados. Para obter resultados previsíveis, use um perfil de IA dedicado, sem prompt de sistema, para o Page Evaluator.",
    // Workspace: list
    sectionLabel: "Avaliador de página",
    listHeadline: "Configurações do avaliador de página",
    createButton: "Criar novo",
    activeLabel: "Ativo",
    inactiveLabel: "Inativo",
    activateButton: "Ativar",
    editButton: "Editar",
    deleteButton: "Eliminar",
    emptyState: "Nenhuma configuração de avaliador encontrada. Crie uma para começar.",
    loadError: "Falha ao carregar as configurações do avaliador.",
    formLoadError: "Falha ao carregar a configuração do avaliador.",
    activateError: "Falha ao ativar a configuração do avaliador.",
    deleteError: "Falha ao eliminar a configuração do avaliador.",
    tableHeaderName: "Nome",
    tableHeaderProfile: "Perfil",
    tableHeaderStatus: "Estado",
    tableHeaderActions: "Ações",
    // Workspace: form chrome
    editHeadline: "Editar avaliador",
    createHeadline: "Criar avaliador",
    backButton: "Voltar",
    backLabel: "Voltar à lista",
    // Workspace: confirm delete
    deleteConfirmHeadline: "Eliminar configuração",
    deleteConfirmContent: "Tem a certeza de que pretende eliminar esta configuração do avaliador?",
    // Form: sections
    generalSection: "Geral",
    aiSettingsSection: "Definições de IA",
    propertyFilterSection: "Filtro de propriedades",
    promptSection: "Prompt",
    // Form: fields
    nameLabel: "Nome",
    namePlaceholder: "Introduza um nome…",
    nameRequired: "O nome é obrigatório.",
    descriptionLabel: "Descrição",
    descriptionHelp: "Resumo opcional apresentado na lista de configurações.",
    documentTypeLabel: "Tipo de documento",
    documentTypeHelp: "O tipo de documento a que esta configuração do avaliador se aplica.",
    documentTypeRequired: "O tipo de documento é obrigatório.",
    documentTypePlaceholder: "Pesquisar por nome…",
    documentTypeAliasPrefix: "Alias:",
    documentTypeAliasError: "Não foi possível obter o alias do tipo de documento selecionado.",
    profileLabel: "Perfil de IA",
    profileHelp: "O perfil de chat do Umbraco.AI utilizado ao avaliar páginas.",
    profileRequired: "O perfil de IA é obrigatório.",
    contextLabel: "Contexto de IA",
    contextHelp: "Contexto opcional do Umbraco.AI a injetar juntamente com o prompt.",
    propertiesLabel: "Propriedades a avaliar",
    propertiesHelp: "Todas as propriedades são incluídas por predefinição. Desmarque as que pretende excluir da avaliação.",
    propertyReferenceHeading: "Propriedades do tipo de documento",
    propertyReferenceHelp: "Referência para compor o seu prompt. As propriedades excluídas (rasuradas) não serão enviadas para a IA.",
    propertyExcludedTooltip: "Excluído da avaliação",
    promptFinalHeading: "Prompt final",
    promptFinalHelp: "Este é o prompt que será enviado para a IA quando o avaliador for executado.",
    promptLabel: "Prompt de avaliação",
    promptHelp: "O prompt enviado para a IA para avaliar o conteúdo da página.",
    promptRequired: "O texto do prompt é obrigatório.",
    validationBanner: "Corrija o seguinte antes de guardar:",
    saveButton: "Guardar",
    savingButton: "A guardar…",
    cancelButton: "Cancelar",
    validationRequired: "Este campo é obrigatório.",
    // Form: dimensional scoring
    scoringLabel: "Ativar pontuação",
    scoringHelp: "Peça à IA para classificar a página numa escala de 1 a 5 nas dimensões indicadas no seu prompt.",
    recommendationsLabel: "Ativar recomendações",
    recommendationsHelp: "Mostrar botões de recomendação gerados por IA junto aos resultados de verificação que tenham uma propriedade associada."
  },
  promoNotice: {
    headline: "Veja como a IA interpreta a mensagem da sua marca",
    body: "Obtenha uma análise gratuita do seu site com IA. Descubra como o posicionamento, a mensagem e o valor do seu site são interpretados pela IA.",
    body2: "O nosso serviço de avaliação completo analisa o seu site, indica o que a IA pensa que a sua marca representa e identifica problemas e oportunidades específicos com recomendações práticas.",
    linkText: "Obtenha a sua análise gratuita da marca do site"
  },
  promptBuilder: {
    openButton: "Abrir construtor de prompts",
    closeButton: "Fechar construtor de prompts",
    title: "Construtor de prompts",
    categoriesLabel: "Categorias da lista de verificação",
    categoriesHelpText: "Selecione as categorias a incluir no prompt gerado. Cada categoria adiciona critérios de avaliação que a IA verificará em relação ao conteúdo da sua página.",
    siteContextLabel: "Contexto do site (opcional)",
    siteContextPlaceholder: "Descreva o objetivo do site, o público ou as diretrizes de marca…",
    generateButton: "Gerar rascunho de prompt",
    usePromptButton: "Utilizar este prompt",
    propertiesLabel: "Propriedades do tipo de documento",
    generatedDraftLabel: "Rascunho gerado",
    loadError: "Não foi possível carregar as propriedades do tipo de documento.",
    categoryRequiredFields: "Campos obrigatórios",
    categoryMetadataSeo: "Metadados e SEO",
    categoryContentQuality: "Qualidade do conteúdo",
    categorySchemaStructuredData: "Esquema e dados estruturados",
    categoryAccessibilityVisibility: "Acessibilidade e visibilidade",
    categoryCallsToAction: "Chamadas para ação"
  },
  // 006: Copilot frontend tools and the evaluate_page server tool (Umbraco.AI admin labels: uaiTool_{toolName}Label)
  uaiTool: {
    evaluateCurrentPageLabel: "Avaliar a página atual",
    evaluateCurrentPageDescription: "Avalia a página aberta no editor com as verificações do Page Evaluator, usando os valores no ecrã para o idioma visualizado.",
    recommendPageValuesLabel: "Recomendar valores para a página",
    recommendPageValuesDescription: "Sugere melhores valores para os campos indicados por verificações falhadas ou com avisos na avaliação da página.",
    applyPageRecommendationLabel: "Aplicar recomendação à página",
    applyPageRecommendationDescription: "Escreve uma recomendação aceite no respetivo campo depois de o utilizador a aprovar. A alteração não é guardada.",
    evaluatePageLabel: "Avaliar página",
    evaluatePageDescription: "Avalia a última versão guardada de uma página, pelo seu id, com as verificações do Page Evaluator."
  },
  // 006: tool scopes shown when granting tools to an agent
  uaiToolScope: {
    pageEvaluatorReadLabel: "Page Evaluator (leitura)",
    pageEvaluatorReadDescription: "Avaliar páginas e obter valores recomendados, sem alterar o conteúdo",
    pageEvaluatorWriteLabel: "Page Evaluator (escrita)",
    pageEvaluatorWriteDescription: "Aplicar recomendações aceites à página aberta (preparadas, não guardadas), após a aprovação do utilizador"
  },
  uaiToolScopeDomain: {
    pageEvaluator: "Page Evaluator"
  },
  // 006: approval prompt before the Copilot apply tool writes a value
  pageEvaluatorCopilot: {
    applyApprovalTitle: "Aplicar recomendação",
    applyApprovalMessage: "Escrever o valor recomendado no campo? Ficará preparado no editor, sem ser guardado."
  },
  // 006: settings of the Umbraco Automate "Evaluate Page" step
  pageEvaluatorAutomate: {
    contentKeyLabel: "Página",
    contentKeyDescription: "A chave da página a avaliar. Pode ser uma associação (binding), por exemplo ${ trigger.contentKey }.",
    cultureLabel: "Idioma da página",
    cultureDescription: "Versão de idioma da página a avaliar: um código de idioma como pt-PT ou uma ligação aos idiomas do acionador. Obrigatório para páginas que variam por idioma. O idioma do e-mail escolhe-se em Idioma do relatório.",
    passThresholdLabel: "Limiar de aprovação",
    passThresholdDescription: "Opcional. A pontuação global mínima (de 1 a 5, a mesma escala do relatório) para aprovar.",
    failOnAnyFailedCheckLabel: "Reprovar se alguma verificação falhar",
    failOnAnyFailedCheckDescription: "Ativado por predefinição. Uma verificação falhada reprova a página mesmo que a pontuação atinja o limiar. Os avisos nunca o fazem.",
    reportLanguageLabel: "Idioma do relatório",
    reportLanguageDescription: "Idioma do relatório enviado por e-mail e das mensagens. Automático usa o idioma da página se for suportado; caso contrário, inglês."
  }
};
export {
  a as default
};
//# sourceMappingURL=pt-BskHrIma.js.map
