// PHINOX BOS v5 — Web App Entry Point
// PHINOX PATCH — EXTRACTED doGet TO STANDALONE FILE

function doGet(e) {
  try {
    var html = HtmlService.createHtmlOutputFromFile('UI_Index');
    html.setTitle('PHINOX BOS v5');
    html.setFaviconUrl('https://www.gstatic.com/images/branding/product/1x/apps_script_48dp.png');
    html.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    return html;
  } catch (err) {
    return HtmlService.createHtmlOutput(
      '<h1 style="color:#c62828;font-family:sans-serif;">PHINOX BOS v5 Error</h1>' +
      '<p style="font-family:sans-serif;">Failed to load UI_Index.html</p>' +
      '<pre style="background:#f5f5f5;padding:12px;border-radius:4px;">' + err.toString() + '</pre>'
    );
  }
}
