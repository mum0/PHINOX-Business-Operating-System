// doGet.js — PHINOX BOS v6 Modular
// ============================================
// تم التعديل: 2026-08-30 — دعم النظام المعياري (UI_Shell + include)
// السبب: ملفات UI_JS_*.html تحتوي JS خام، يجب تغليفها بـ <script>
//       واستخدام createTemplateFromFile().evaluate() لمعالجة scriptlets
// ===========================================

/**
 * Entry Point الرئيسي للـ Web App
 * @param {Object} e — معلمات الطلب
 * @returns {HtmlOutput}
 */
function doGet(e) {
  try {
    // ─── التحقق من البريد ───
    var userEmail = "";
    try {
      userEmail = Session.getActiveUser().getEmail() || "anonymous";
    } catch (sessionErr) {
      userEmail = "anonymous";
    }

    // ─── Rate Limiting ───
    try {
      if (typeof RateLimiter !== "undefined" && RateLimiter.check) {
        RateLimiter.check("doGet", { maxRequests: 200, windowSeconds: 3600 });
      }
    } catch (rateErr) {
      // silent — لا نمنع الوصول بسبب rate limit في البداية
    }

    // ─── تحديد الصفحة المطلوبة ───
    var page = "index";
    if (e && e.parameter && e.parameter.page) {
      page = String(e.parameter.page).toLowerCase().trim();
    }

    // ─── صفحة Diagnostics ───
    if (page === "diagnose") {
      try {
        var diagnoseHtml = HtmlService.createHtmlOutputFromFile("DIAGNOSE");
        if (diagnoseHtml && diagnoseHtml.setTitle) {
          return diagnoseHtml.setTitle("PHINOX Diagnostics");
        }
      } catch (diagErr) {
        Logger.log("[doGet] DIAGNOSE file error: " + diagErr.message);
      }
      // fallback إذا ملف DIAGNOSE مش موجود
      return HtmlService.createHtmlOutput(
        "<h2>DIAGNOSE file not found</h2><p>Create an HTML file named DIAGNOSE in GAS IDE.</p>"
      ).setTitle("PHINOX Diagnostics");
    }

    // ─── الصفحة الرئيسية ───
    var htmlOutput = null;

    // محاولة 1: النظام المعياري v6 (UI_Shell + include)
    // مهم: يجب استخدام createTemplateFromFile + evaluate لمعالجة <?!= include() ?>
    try {
      var t = HtmlService.createTemplateFromFile("UI_Shell");
      htmlOutput = t.evaluate();
      if (htmlOutput && htmlOutput.setTitle) {
        return htmlOutput.setTitle("PHINOX BOS v6").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      }
    } catch (shellErr) {
      Logger.log("[doGet] UI_Shell template error: " + shellErr.message);
    }

    // محاولة 2: الملف الموحد v5 (UI_Index)
    try {
      htmlOutput = HtmlService.createHtmlOutputFromFile("UI_Index");
      if (htmlOutput && htmlOutput.setTitle) {
        return htmlOutput.setTitle("PHINOX BOS v5").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      }
    } catch (indexErr) {
      Logger.log("[doGet] UI_Index error: " + indexErr.message);
    }

    // ─── Fallback النهائي ───
    // إذا كل المحاولات فشلت — نرجع صفحة بسيطة آمنة
    var fallbackHtml =
      "<html><head><meta charset=\"UTF-8\"><title>PHINOX BOS</title></head>" +
      "<body style=\"font-family:sans-serif;text-align:center;padding:40px;background:#0f172a;color:#e2e8f0;\">" +
      "<h1>🔷 PHINOX BOS v5</h1>" +
      "<p>جاري التحميل...</p>" +
      "<p style=\"color:#f87171;\">إذا استمر التحميل، تحقق من:</p>" +
      "<ul style=\"text-align:right;display:inline-block;\">" +
      "<li>وجود ملف UI_Index.html</li>" +
      "<li>صلاحيات النشر (Execute as: Me)</li>" +
      "<li>Console logs للأخطاء</li>" +
      "</ul></body></html>";

    return HtmlService.createHtmlOutput(fallbackHtml).setTitle("PHINOX BOS v5");

  } catch (fatalErr) {
    // ─── خطأ فادح — نرجع صفحة خطأ آمنة ───
    Logger.log("[doGet FATAL] " + fatalErr.message);
    var errorHtml =
      "<html><head><meta charset=\"UTF-8\"><title>Error</title></head>" +
      "<body style=\"font-family:sans-serif;text-align:center;padding:40px;background:#0f172a;color:#e2e8f0;\">" +
      "<h1 style=\"color:#f87171;\">⚠️ System Error</h1>" +
      "<p>" + fatalErr.message + "</p>" +
      "<p>Please contact support.</p></body></html>";
    return HtmlService.createHtmlOutput(errorHtml).setTitle("PHINOX BOS — Error");
  }
}