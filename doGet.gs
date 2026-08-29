function doGet() {
  try {
    return HtmlService.createTemplateFromFile('UI_Shell').evaluate()
      .setTitle('PHINOX BOS v6 Enterprise')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
  } catch (e) {
    console.error('doGet template error:', e.message);
    return HtmlService.createHtmlOutputFromFile('UI_Index')
      .setTitle('PHINOX BOS v5 Fallback')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}