// doGet.gs — PHINOX BOS v5 (Split Architecture)
// Uses createTemplateFromFile + include() instead of single UI_Index.html

function doGet(e) {
  try {
    var userEmail = "";
    try { userEmail = Session.getActiveUser().getEmail() || "anonymous"; } catch(e) {}

    try {
      if (typeof RateLimiter !== "undefined" && RateLimiter.check) {
        RateLimiter.check("doGet", { maxRequests: 200, windowSeconds: 3600 });
      }
    } catch(e) {}

    var page = "index";
    if (e && e.parameter && e.parameter.page) {
      page = String(e.parameter.page).toLowerCase().trim();
    }
    if (page === "diagnose") {
      return HtmlService.createHtmlOutputFromFile("DIAGNOSE").setTitle("PHINOX Diagnostics");
    }

    // SPLIT: serve via template includes
    var template = HtmlService.createTemplateFromFile('UI_Shell');
    return template.evaluate()
      .setTitle('PHINOX BOS v5')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  } catch (fatalErr) {
    Logger.log("[doGet FATAL] " + fatalErr.message);
    return HtmlService.createHtmlOutput(
      '<p style="color:red">Error: ' + fatalErr.message + '</p>'
    ).setTitle("PHINOX BOS Error");
  }
}