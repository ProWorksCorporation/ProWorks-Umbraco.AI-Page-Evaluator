const e = {
  evaluatePage: {
    // Workspace action
    actionLabel: "पेज का मूल्यांकन करें",
    // Modal: chrome
    modalHeadline: "पेज मूल्यांकन",
    rerunButton: "मूल्यांकन फिर से चलाएँ",
    closeButton: "बंद करें",
    lastEvaluated: "अंतिम मूल्यांकन:",
    // Modal: progress
    progressSendingData: "पेज डेटा भेजा जा रहा है…",
    progressWaitingForAI: "AI प्रतिक्रिया की प्रतीक्षा की जा रही है…",
    progressRendering: "रिपोर्ट तैयार की जा रही है…",
    // Modal: report sections
    reportScore: "स्कोर",
    reportChecks: "जाँचें",
    reportPassed: "सफल",
    reportWarning: "चेतावनी",
    reportWarnings: "चेतावनियाँ",
    reportFailed: "असफल",
    reportPassingItems: "सफल आइटम",
    reportAttentionItems: "ध्यान देने योग्य आइटम",
    reportSuggestions: "सुझाव",
    // Modal: parse failure warning
    parseFailedWarning: "AI की प्रतिक्रिया को एक संरचित रिपोर्ट के रूप में फ़ॉर्मेट नहीं किया जा सका। नीचे मूल आउटपुट दिखाया गया है।",
    parseFailedLinkText: "मूल्यांकनकर्ता प्रॉम्प्ट को परिष्कृत करें",
    parseFailedSuffix: "संरचित आउटपुट को बेहतर बनाने के लिए।",
    // Modal: AI error
    aiErrorMessage: "मूल्यांकन पूरा नहीं किया जा सका। AI प्रदाता ने त्रुटि लौटाई।",
    temporaryRetryableMessage: "AI प्रदाता अस्थायी रूप से अनुपलब्ध है। कृपया कुछ ही देर में फिर से प्रयास करें।",
    connectivityMessage: "AI प्रदाता तक नहीं पहुँचा जा सका। कृपया अपना कनेक्शन जाँचें और फिर से प्रयास करें।",
    authenticationConfigurationMessage: "AI कनेक्शन पर ध्यान देने की आवश्यकता है। कृपया AI प्रोफ़ाइल की क्रेडेंशियल या कॉन्फ़िगरेशन जाँचने के लिए अपने व्यवस्थापक से संपर्क करें।",
    retryButton: "फिर से प्रयास करें",
    // Modal: guardrail block
    guardrailBlockedMessage: "Umbraco.AI गार्डरेल नीति द्वारा मूल्यांकन को अवरुद्ध कर दिया गया था। AI प्रोफ़ाइल पर कॉन्फ़िगर किए गए गार्डरेल नियमों की समीक्षा करें।",
    // Modal: dimensional scoring
    overallScore: "कुल स्कोर",
    axisScores: "स्कोर विवरण",
    // Recommendations
    recGenerate: "सिफ़ारिश जनरेट करें",
    recGenerating: "सिफ़ारिश जनरेट की जा रही है…",
    recCurrent: "वर्तमान मान",
    recCurrentFor: "के लिए वर्तमान मान",
    recSuggested: "सुझाया गया मान",
    recSuggestedFor: "के लिए सुझाया गया मान",
    recApply: "फ़ील्ड पर लागू करें",
    recApplied: "फ़ील्ड पर लागू किया गया",
    recRegenerate: "फिर से जनरेट करें",
    recCopy: "कॉपी करें",
    recCopied: "कॉपी किया गया",
    recError: "सिफ़ारिश जनरेट नहीं की जा सकी। फिर से प्रयास करें।"
  },
  evaluatorConfig: {
    // Workspace: list
    sectionLabel: "पेज मूल्यांकनकर्ता",
    listHeadline: "पेज मूल्यांकनकर्ता कॉन्फ़िगरेशन",
    createButton: "नया बनाएँ",
    activeLabel: "सक्रिय",
    inactiveLabel: "निष्क्रिय",
    activateButton: "सक्रिय करें",
    editButton: "संपादित करें",
    deleteButton: "हटाएँ",
    emptyState: "कोई मूल्यांकनकर्ता कॉन्फ़िगरेशन नहीं मिला। शुरू करने के लिए एक बनाएँ।",
    loadError: "मूल्यांकनकर्ता कॉन्फ़िगरेशन लोड करने में विफल।",
    formLoadError: "मूल्यांकनकर्ता कॉन्फ़िगरेशन लोड करने में विफल।",
    activateError: "मूल्यांकनकर्ता कॉन्फ़िगरेशन सक्रिय करने में विफल।",
    deleteError: "मूल्यांकनकर्ता कॉन्फ़िगरेशन हटाने में विफल।",
    tableHeaderName: "नाम",
    tableHeaderProfile: "प्रोफ़ाइल",
    tableHeaderStatus: "स्थिति",
    tableHeaderActions: "कार्रवाइयाँ",
    // Workspace: form chrome
    editHeadline: "मूल्यांकनकर्ता संपादित करें",
    createHeadline: "मूल्यांकनकर्ता बनाएँ",
    backButton: "वापस",
    backLabel: "सूची पर वापस जाएँ",
    // Workspace: confirm delete
    deleteConfirmHeadline: "कॉन्फ़िगरेशन हटाएँ",
    deleteConfirmContent: "क्या आप वाकई इस मूल्यांकनकर्ता कॉन्फ़िगरेशन को हटाना चाहते हैं?",
    // Form: sections
    generalSection: "सामान्य",
    aiSettingsSection: "AI सेटिंग्स",
    propertyFilterSection: "प्रॉपर्टी फ़िल्टर",
    promptSection: "प्रॉम्प्ट",
    // Form: fields
    nameLabel: "नाम",
    namePlaceholder: "एक नाम दर्ज करें…",
    nameRequired: "नाम आवश्यक है।",
    descriptionLabel: "विवरण",
    descriptionHelp: "कॉन्फ़िगरेशन सूची में दिखाया गया वैकल्पिक सारांश।",
    documentTypeLabel: "दस्तावेज़ प्रकार",
    documentTypeHelp: "दस्तावेज़ प्रकार जिस पर यह मूल्यांकनकर्ता कॉन्फ़िगरेशन लागू होता है।",
    documentTypeRequired: "दस्तावेज़ प्रकार आवश्यक है।",
    documentTypePlaceholder: "नाम से खोजें…",
    documentTypeAliasPrefix: "उपनाम:",
    documentTypeAliasError: "चयनित दस्तावेज़ प्रकार का उपनाम प्राप्त नहीं किया जा सका।",
    profileLabel: "AI प्रोफ़ाइल",
    profileHelp: "पेजों का मूल्यांकन करते समय उपयोग की जाने वाली Umbraco.AI चैट प्रोफ़ाइल।",
    profileRequired: "AI प्रोफ़ाइल आवश्यक है।",
    contextLabel: "AI संदर्भ",
    contextHelp: "प्रॉम्प्ट के साथ इंजेक्ट करने के लिए वैकल्पिक Umbraco.AI संदर्भ।",
    propertiesLabel: "मूल्यांकन के लिए प्रॉपर्टीज़",
    propertiesHelp: "सभी प्रॉपर्टीज़ डिफ़ॉल्ट रूप से शामिल हैं। जिन्हें आप मूल्यांकन से बाहर करना चाहते हैं, उन्हें अनचेक करें।",
    propertyReferenceHeading: "दस्तावेज़ प्रकार की प्रॉपर्टीज़",
    propertyReferenceHelp: "अपना प्रॉम्प्ट तैयार करने के लिए संदर्भ। बाहर की गई प्रॉपर्टीज़ (कटी हुई) AI को नहीं भेजी जाएँगी।",
    propertyExcludedTooltip: "मूल्यांकन से बाहर रखा गया",
    promptFinalHeading: "अंतिम प्रॉम्प्ट",
    promptFinalHelp: "यह वह प्रॉम्प्ट है जो मूल्यांकनकर्ता चलने पर AI को भेजा जाएगा।",
    promptLabel: "मूल्यांकन प्रॉम्प्ट",
    promptHelp: "पेज की सामग्री का मूल्यांकन करने के लिए AI को भेजा गया प्रॉम्प्ट।",
    promptRequired: "प्रॉम्प्ट टेक्स्ट आवश्यक है।",
    validationBanner: "सहेजने से पहले निम्नलिखित को ठीक करें:",
    saveButton: "सहेजें",
    savingButton: "सहेजा जा रहा है…",
    cancelButton: "रद्द करें",
    validationRequired: "यह फ़ील्ड आवश्यक है।",
    // Form: dimensional scoring
    scoringLabel: "स्कोरिंग सक्षम करें",
    scoringHelp: "AI से आपके प्रॉम्प्ट में नामित आयामों में पेज को 1-5 के पैमाने पर रेट करने के लिए कहें।",
    recommendationsLabel: "सिफ़ारिशें सक्षम करें",
    recommendationsHelp: "मैप की गई प्रॉपर्टी वाले जाँच परिणामों के साथ AI-जनरेटेड सिफ़ारिश बटन दिखाएँ।"
  },
  promoNotice: {
    headline: "देखें कि AI आपके ब्रांड संदेश की व्याख्या कैसे करता है",
    body: "अपनी वेबसाइट का एक निःशुल्क AI-संचालित विश्लेषण प्राप्त करें। जानें कि आपकी साइट की पोज़िशनिंग, संदेश और मूल्य को AI द्वारा कैसे समझा जाता है।",
    body2: "हमारी पूर्ण मूल्यांकन सेवा आपकी वेबसाइट की समीक्षा करती है, बताती है कि AI आपके ब्रांड को क्या दर्शाता है, और कार्रवाई योग्य सिफ़ारिशों के साथ विशिष्ट समस्याओं और अवसरों की पहचान करती है।",
    linkText: "अपना निःशुल्क वेबसाइट ब्रांड विश्लेषण प्राप्त करें"
  },
  promptBuilder: {
    openButton: "प्रॉम्प्ट बिल्डर खोलें",
    closeButton: "प्रॉम्प्ट बिल्डर बंद करें",
    title: "प्रॉम्प्ट बिल्डर",
    categoriesLabel: "चेकलिस्ट श्रेणियाँ",
    categoriesHelpText: "जनरेट किए गए प्रॉम्प्ट में शामिल करने के लिए श्रेणियाँ चुनें। प्रत्येक श्रेणी मूल्यांकन मानदंड जोड़ती है जिन्हें AI आपकी पेज सामग्री के विरुद्ध जाँचेगा।",
    siteContextLabel: "साइट संदर्भ (वैकल्पिक)",
    siteContextPlaceholder: "साइट का उद्देश्य, दर्शक, या ब्रांड दिशानिर्देश बताएँ…",
    generateButton: "प्रॉम्प्ट ड्राफ़्ट जनरेट करें",
    usePromptButton: "इस प्रॉम्प्ट का उपयोग करें",
    propertiesLabel: "दस्तावेज़ प्रकार की प्रॉपर्टीज़",
    generatedDraftLabel: "जनरेट किया गया ड्राफ़्ट",
    loadError: "दस्तावेज़ प्रकार की प्रॉपर्टीज़ लोड नहीं की जा सकीं।",
    categoryRequiredFields: "आवश्यक फ़ील्ड",
    categoryMetadataSeo: "मेटाडेटा और SEO",
    categoryContentQuality: "सामग्री गुणवत्ता",
    categorySchemaStructuredData: "स्कीमा और संरचित डेटा",
    categoryAccessibilityVisibility: "पहुँच-योग्यता और दृश्यता",
    categoryCallsToAction: "कॉल टू एक्शन"
  }
};
export {
  e as default
};
//# sourceMappingURL=hi-Drdztl0c.js.map
