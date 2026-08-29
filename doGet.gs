function doGet() {
  try {
    return HtmlService.createTemplateFromFile('UI_Shell').evaluate()
      .setTitle('PHINOX BOS v6 Enterprise')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
  } catch (e) {
    console.error('doGet template error:', e.message, e.stack);
    var errMsg = 'خطأ في تحميل النظام: ' + (e.message || e.toString());
    return HtmlService.createHtmlOutput(
      '<div style="directٍion:rtl;font-family:Tahoma,sans-serif;padding:40px;text-align:center;color:#c0392b;">' +
      '<h2>' + errMsg + '</h2>' +
      '<p>تأكد من رفع كل ملفات UI_*.html و Code_Include.gs</p>' +
      '<p style="color:#888;font-size:12px;">PHINOX BOS v6 — doGet fallback</p>' +
      '</div>'
    )
      .setTitle('PHINOX BOS v6 — Error')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}