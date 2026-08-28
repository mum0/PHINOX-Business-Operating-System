// doGet.gs — PHINOX BOS v5 Enterprise
// ============================================
// الإصدار: TEMPLATE INCLUDE v2.0
// التاريخ: 2026-08-29
// الوصف: يستخدم GAS Template Includes لتجميع الملفات المقسّمة
//       الطريقة الرسمية والموثوقة في GAS لتجميع HTML متعدد
// ============================================
//
// 🔧 الملفات المطلوبة في GAS IDE:
//    doGet.gs              (هذا الملف — Entry Point)
//    UI_Server.js          (بدون تغيير)
//    UI_Shell.html         (القالب الرئيسي — يجمع كل الملفات عبر <?!= include() ?>)
//    UI_CSS.html           (كل CSS styles)
//    UI_Body.html          (sidebar + main content sections)
//    UI_Modals.html        (modal HTML elements)
//    UI_JS_Core.html       (core utilities, auth, callServer)
//    UI_JS_Loaders.html    (navigation, page loaders)
//    UI_JS_Inventory.html  (inventory functions)
//    UI_JS_Finance.html    (finance, expenses functions)
//    UI_JS_TasksMkt.html   (tasks, marketing functions)
//    UI_JS_Social.html     (social media functions)
//    UI_JS_SatNPS.html     (satisfaction, NPS functions)
//    UI_JS_Members.html    (members functions)
//    UI_JS_Events.html     (event listeners, init)
// ===============include()=============================

/**
 * خريطة الملفات — لتحديد أي ملف مسؤول عند ظهور خطأ
 * أرقام الأسطر تقريبية — حدّثها حسب split الفعلي
 */
var LINE_MAP = [
  { file: "UI_Shell",        label: "HTML Shell (DOCTYPE, head)" },
  { file: "UI_CSS",          label: "CSS Styles" },
  { file: "UI_Body",         label: "HTML Body (sidebar, sections)" },
  { file: "UI_Modals",       label: "Modal HTML Elements" },
  { file: "UI_JS_Core",      label: "JS: Core, Auth, Utilities" },
  { file: "UI_JS_Loaders",   label: "JS: Navigation, Page Loaders" },
  { file: "UI_JS_Inventory", label: "JS: Inventory" },
  { file: "UI_JS_Finance",   label: "JS: Finance, Expenses" },
  { file: "UI_JS_TasksMkt",  label: "JS: Tasks, Marketing" },
  { file: "UI_JS_Social",    label: "JS: Social Media" },
  { file: "UI_JS_SatNPS",    label: "JS: Satisfaction, NPS" },
  { file: "UI_JS_Members",   label: "JS: Members" },
  { file: "UI_JS_Events",    label: "JS: Events, Init" }
];


/**
 * دالة include — تقرأ ملف HTML و ترجع محتواه
 * مستخدمة داخل UI_Shell.html عبر: <?!= include('filename'); ?>
 * @param {string} filename — اسم الملف بدون .html
 * @returns {string}
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}


/**
 * Entry Point رئيسي
 * @param {Object} e
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
      // silent
    }

    // ─── تحديد الصفحة ───
    var page = "index";
    if (e && e.parameter && e.parameter.page) {
      page = String(e.parameter.page).toLowerCase().trim();
    }

    // ─── Diagnostics ───
    if (page === "diagnose") {
      try {
        var diagnoseHtml = HtmlService.createHtmlOutputFromFile("DIAGNOSE");
        if (diagnoseHtml && diagnoseHtml.setTitle) {
          return diagnoseHtml.setTitle("PHINOX Diagnostics");
        }
      } catch (diagErr) {
        Logger.log("[doGet] DIAGNOSE error: " + diagErr.message);
      }
      return HtmlService.createHtmlOutput(
        "<h2>DIAGNOSE file not found</h2><p>Create DIAGNOSE.html in GAS IDE.</p>"
      ).setTitle("PHINOX Diagnostics");
    }

    // ─── Debug ───
    if (page === "debug") {
      return _buildDebugPage();
    }

    // ─── محاولة 1: المعالج الداخلي ───
    if (typeof _handleDoGetInternal === "function") {
      try {
        var internalOutput = _handleDoGetInternal(e);
        if (internalOutput && internalOutput.getContent) {
          return internalOutput;
        }
      } catch (internalErr) {
        Logger.log("[doGet] _handleDoGetInternal error: " + internalErr.message);
      }
    }

    // ─── محاولة 2: Template Include (الطريقة الرئيسية) ───
    try {
      var output = HtmlService.createHtmlOutputFromFile("UI_Shell");
      if (output && output.setTitle) {
        output.setTitle("PHINOX BOS v5");
        output.addMetaTag("viewport", "width=device-width, initial-scale=1.0");
        Logger.log("[doGet] Served via UI_Shell template");
        return output;
      }
    } catch (assemblerErr) {
      Logger.log("[doGet] UI_Shell error: " + assemblerErr.message);
    }

    // ─── محاولة 3: Fallback ───
    try {
      var fallbackIndex = HtmlService.createHtmlOutputFromFile("UI_Index");
      if (fallbackIndex && fallbackIndex.setTitle) {
        Logger.log("[doGet] Fell back to UI_Index.html");
        return fallbackIndex.setTitle("PHINOX BOS v5");
      }
    } catch (fbErr) {
      Logger.log("[doGet] Fallback failed: " + fbErr.message);
    }

    // ─── Fallback النهائي ───
    return _buildErrorPage(["UI_Shell.html not found"]);

  } catch (fatalErr) {
    Logger.log("[doGet FATAL] " + fatalErr.message);
    return _buildErrorPage([fatalErr.message]);
  }
}


/**
 * صفحة Debug
 */
function _buildDebugPage() {
  var html = "<html><head><meta charset=\"UTF-8\">";
  html += "<style>";
  html += "body{font-family:monospace;background:#0f172a;color:#e2e8f0;padding:20px;direction:rtl;}";
  html += "h1{color:#38bdf8;border-bottom:1px solid #334155;padding-bottom:10px;}";
  html += "h2{color:#a78bfa;margin-top:24px;}";
  html += "table{border-collapse:collapse;width:100%;margin:20px 0;}";
  html += "th,td{border:1px solid #334155;padding:8px 12px;text-align:right;}";
  html += "th{background:#1e293b;color:#38bdf8;}";
  html += ".ok{color:#4ade80;} .fail{color:#f87171;} .warn{color:#fbbf24;}";
  html += "pre{background:#1e293b;padding:15px;border-radius:8px;overflow-x:auto;}";
  html += "a{color:#38bdf8;}";
  html += "</style></head><body>";
  
  html += "<h1>PHINOX Split Assembler — Debug</h1>";
  html += "<p>" + new Date().toISOString() + "</p>";
  html += "<p>" + (Session.getActiveUser().getEmail() || "anonymous") + "</p>";
  
  // جدول الملفات
  html += "<h2>حالة الملفات</h2>";
  html += "<table><tr><th>#</th><th>الملف</th><th>الوصف</th><th>الحالة</th></tr>";
  
  for (var i = 0; i < LINE_MAP.length; i++) {
    var fname = LINE_MAP[i].file;
    var label = LINE_MAP[i].label || "";
    var statusClass = "ok";
    var statusText = "";
    
    try {
      var testContent = HtmlService.createHtmlOutputFromFile(fname).getContent();
      if (testContent && testContent.length > 0) {
        statusText = "\u2705 " + testContent.length + " chars, " + testContent.split("\n").length + " lines";
      } else {
        statusClass = "warn";
        statusText = "\u26a0\ufe0f empty";
      }
    } catch (err) {
      statusClass = "fail";
      statusText = "\u274c " + err.message;
    }
    
    html += "<tr>";
    html += "<td>" + i + "</td>";
    html += "<td><code>" + fname + ".html</code></td>";
    html += "<td>" + label + "</td>";
    html += "<td class=\"" + statusClass + "\">" + statusText + "</td>";
    html += "</tr>";
  }
  
  html += "</table>";
  
  // اختبار Template
  html += "<h2>Template Test</h2>";
  try {
    var testTemplate = HtmlService.createHtmlOutputFromFile("UI_Shell").getContent();
    html += "<pre>";
    html += "\u2705 Success! " + testTemplate.length + " chars, " + testTemplate.split("\n").length + " lines";
    html += "</pre>";
  } catch (tmplErr) {
    html += "<pre style=\"color:#f87171;\">\u274c Failed: " + tmplErr.message + "</pre>";
  }
  
  html += "</body></html>";
  
  return HtmlService.createHtmlOutput(html).setTitle("PHINOX Debug");
}


/**
 * صفحة خطأ
 */
function _buildErrorPage(errors) {
  var html = "<html><head><meta charset=\"UTF-8\">";
  html += "<style>";
  html += "body{font-family:sans-serif;text-align:center;padding:40px;background:#0f172a;color:#e2e8f0;direction:rtl;}";
  html += "h1{color:#f87171;} h2{color:#fbbf24;margin-top:30px;}";
  html += "ul{text-align:right;display:inline-block;margin:15px 0;}";
  html += "li{margin:8px 0;padding:8px;background:#1e293b;border-radius:6px;}";
  html += "code{color:#38bdf8;background:#1e293b;padding:2px 6px;border-radius:4px;}";
  html += "a{color:#38bdf8;}";
  html += "</style></head><body>";
  
  html += "<h1>\u26a0\ufe0f PHINOX BOS Load Error</h1>";
  
  if (errors && errors.length > 0) {
    html += "<h2>Details:</h2><ul>";
    for (var i = 0; i < errors.length; i++) {
      html += "<li>\u274c <code>" + errors[i] + "</code></li>";
    }
    html += "</ul>";
  }
  
  html += "<h2>Fix:</h2><ul>";
  html += "<li>Make sure <code>UI_Shell.html</code> exists in GAS IDE</li>";
  html += "<li>Make sure all 13 UI_*.html files exist</li>";
  html += "<li>Use <a href='?page=debug'>?page=debug</a> to check</li>";
  html += "<li>Delete old file: <code>UI_Index_08_JS_Satisfaction_NPS...</code></li>";
  html += "</ul>";
  
  html += "</body></html>";
  
  return HtmlService.createHtmlOutput(html).setTitle("PHINOX BOS — Error");
}