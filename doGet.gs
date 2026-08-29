function doGet() {
  try {
    return HtmlService.createTemplateFromFile('UI_Shell').evaluate()
      .setTitle('PHINOX BOS v6 Enterprise')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
  } catch (e) {
    console.error('doGet template error:', e.message, e.stack);
    var errMsg = 'خطأ في تحميل النظام: ' + (e.message || e.toString());
    return HtmlService.createHtmlOutput('<h2>' + errMsg + '</h2><p>تأكد من رفع كل ملفات UI_*.html و Code_Include.gs</p>')
      .setTitle('PHINOX BOS — Error')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}