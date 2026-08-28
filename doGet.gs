// doGet.js — PHINOX BOS v5 Enterprise
// ============================================
// الإصدار: SPLIT ASSEMBLER v1.0
// التاريخ: 2026-08-29
// الوصف: يجمع 11 ملف HTML مقسّم في وقت التشغيل
//       بدلاً من الاعتماد على ملف UI_Index.html واحد
// الفائدة: عزل الأخطاء — معرفة أي Segment فيه المشكلة
// ============================================
//
// 📋 خريطة الملفات المقسّمة (Split Files Map):
// ┌──────────────────────────────────────┬────────────┬────────────┐
// │ الملف (بدون .html)                   │ من سطر    │ إلى سطر   │
// ├──────────────────────────────────────┼────────────┼────────────┤
// │ UI_Index_00_CSS                      │ 1          │ 109        │
// │ UI_Index_01_HTML_Body                │ 110        │ 393        │
// │ UI_Index_02_JS_Core_Auth             │ 394        │ 593        │
// │ UI_Index_03_JS_Navigation_Loaders    │ 594        │ 745        │
// │ UI_Index_04_JS_Inventory             │ 746        │ 1060       │
// │ UI_Index_05_JS_Finance_Expenses      │ 1061       │ 1261       │
// │ UI_Index_06_JS_Tasks_Marketing       │ 1262       │ 1454       │
// │ UI_Index_07_JS_Social_Satisfaction   │ 1455       │ 1515       │
// │ UI_Index_08_JS_Satisfaction_NPS      │ 1516       │ 1582       │
// │ UI_Index_09_JS_Members               │ 1583       │ 1694       │
// │ UI_Index_10_JS_Events_Init           │ 1695       │ 1815       │
// └──────────────────────────────────────┴────────────┴────────────┘
// المجموع: 1815 سطر
//
// ⚠️  لإضافة ملف جديد: أضف اسمه في المصفوفة SPLIT_FILES أدناه
//     واستخدم ?page=debug في الرابط لرؤية معلومات التجميع
// ============================================

/**
 * قائمة الملفات المقسّمة بالترتيب
 * الأسماء WITHOUT .html — GAS يضيفها تلقائياً
 */
var SPLIT_FILES = [
  "UI_Index_00_CSS",
  "UI_Index_01_HTML_Body",
  "UI_Index_02_JS_Core_Auth",
  "UI_Index_03_JS_Navigation_Loaders",
  "UI_Index_04_JS_Inventory",
  "UI_Index_05_JS_Finance_Expenses",
  "UI_Index_06_JS_Tasks_Marketing",
  "UI_Index_07_JS_Social_Satisfaction",
  "UI_Index_08_JS_Satisfaction_NPS",
  "UI_Index_09_JS_Members",
  "UI_Index_10_JS_Events_Init"
];

/**
 * خريطة الأسطر — لتحديد أي Segment يحتوي على سطر معين
 * مفيد عند ظهور أخطاء برقم سطر في Console
 */
var LINE_MAP = [
  { file: "UI_Index_00_CSS",                    start: 1,    end: 109  },
  { file: "UI_Index_01_HTML_Body",              start: 110,  end: 393  },
  { file: "UI_Index_02_JS_Core_Auth",           start: 394,  end: 593  },
  { file: "UI_Index_03_JS_Navigation_Loaders",  start: 594,  end: 745  },
  { file: "UI_Index_04_JS_Inventory",           start: 746,  end: 1060 },
  { file: "UI_Index_05_JS_Finance_Expenses",    start: 1061, end: 1261 },
  { file: "UI_Index_06_JS_Tasks_Marketing",     start: 1262, end: 1454 },
  { file: "UI_Index_07_JS_Social_Satisfaction", start: 1455, end: 1515 },
  { file: "UI_Index_08_JS_Satisfaction_NPS",    start: 1516, end: 1582 },
  { file: "UI_Index_09_JS_Members",             start: 1583, end: 1694 },
  { file: "UI_Index_10_JS_Events_Init",         start: 1695, end: 1815 }
];


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
      // silent
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
      return HtmlService.createHtmlOutput(
        "<h2>DIAGNOSE file not found</h2><p>Create an HTML file named DIAGNOSE in GAS IDE.</p>"
      ).setTitle("PHINOX Diagnostics");
    }

    // ─── صفحة Debug — عرض معلومات التجميع ───
    if (page === "debug") {
      return _buildDebugPage();
    }

    // ─── محاولة 1: المعالج الداخلي من UI_Server.js ───
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

    // ─── محاولة 2: التجميع من الملفات المقسّمة ───
    var assembled = _assembleSplitFiles();
    if (assembled.success) {
      var htmlOutput = HtmlService.createHtmlOutput(assembled.html);
      htmlOutput.setTitle("PHINOX BOS v5");
      htmlOutput.addMetaTag("viewport", "width=device-width, initial-scale=1.0");
      // إضافة معلومات التجميع كتعليق مخفي في HTML (للتصحيح)
      htmlOutput.append("\n<!-- PHINOX Split Assembler: " + assembled.loadedCount + "/" + SPLIT_FILES.length + " segments loaded -->");
      return htmlOutput;
    }

    // ─── محاولة 3: Fallback إلى الملف المجمل (إذا لا يزال موجوداً) ───
    try {
      var fallbackIndex = HtmlService.createHtmlOutputFromFile("UI_Index");
      if (fallbackIndex && fallbackIndex.setContent) {
        Logger.log("[doGet] Split assembly failed, fell back to UI_Index.html");
        return fallbackIndex.setTitle("PHINOX BOS v5");
      }
    } catch (fbErr) {
      Logger.log("[doGet] UI_Index fallback also failed: " + fbErr.message);
    }

    // ─── Fallback النهائي: صفحة خطأ تفصيلية ───
    return _buildErrorPage(assembled.errors || ["All loading methods failed"]);

  } catch (fatalErr) {
    Logger.log("[doGet FATAL] " + fatalErr.message);
    return _buildErrorPage([fatalErr.message]);
  }
}


/**
 * تجميع الملفات المقسّمة إلى HTML واحد
 * @returns {{ success: boolean, html: string, loadedCount: number, errors: string[] }}
 */
function _assembleSplitFiles() {
  var result = {
    success: false,
    html: "",
    loadedCount: 0,
    errors: []
  };

  var parts = [];

  for (var i = 0; i < SPLIT_FILES.length; i++) {
    var fileName = SPLIT_FILES[i];
    try {
      // قراءة الملف و استخراج المحتوى كنص
      var partOutput = HtmlService.createHtmlOutputFromFile(fileName);
      var content = partOutput.getContent();
      
      if (content && content.length > 0) {
        parts.push(content);
        result.loadedCount++;
        Logger.log("[Assembler] ✅ Loaded: " + fileName + " (" + content.length + " chars)");
      } else {
        result.errors.push(fileName + ": empty content");
        Logger.log("[Assembler] ⚠️  Empty: " + fileName);
      }
    } catch (loadErr) {
      result.errors.push(fileName + ": " + loadErr.message);
      Logger.log("[Assembler] ❌ Failed: " + fileName + " — " + loadErr.message);
    }
  }

  if (parts.length > 0) {
    // تجميع بدون فواصل إضافية — كل ملف يحتفظ بـ newlines الأصلية
    result.html = parts.join("");
    result.success = true;
  }

  Logger.log("[Assembler] Result: " + result.loadedCount + "/" + SPLIT_FILES.length + " loaded, " + result.html.length + " total chars");
  return result;
}


/**
 * صفحة Debug — عرض حالة الملفات المقسّمة وأي أخطاء
 * @returns {HtmlOutput}
 */
function _buildDebugPage() {
  var html = "<html><head><meta charset=\"UTF-8\">";
  html += "<style>";
  html += "body{font-family:monospace;background:#0f172a;color:#e2e8f0;padding:20px;direction:rtl;}";
  html += "h1{color:#38bdf8;border-bottom:1px solid #334155;padding-bottom:10px;}";
  html += "table{border-collapse:collapse;width:100%;margin:20px 0;}";
  html += "th,td{border:1px solid #334155;padding:8px 12px;text-align:right;}";
  html += "th{background:#1e293b;color:#38bdf8;}";
  html += ".ok{color:#4ade80;} .fail{color:#f87171;} .warn{color:#fbbf24;}";
  html += "pre{background:#1e293b;padding:15px;border-radius:8px;overflow-x:auto;}";
  html += "</style></head><body>";
  
  html += "<h1>PHINOX Split Assembler — Debug</h1>";
  html += "<p>تاريخ: " + new Date().toISOString() + "</p>";
  html += "<p>المستخدم: " + (Session.getActiveUser().getEmail() || "anonymous") + "</p>";
  
  // جدول الملفات
  html += "<h2>ملفات Split Files</h2>";
  html += "<table><tr><th>#</th><th>الملف</th><th>من سطر</th><th>إلى سطر</th><th>الحالة</th></tr>";
  
  for (var i = 0; i < SPLIT_FILES.length; i++) {
    var fname = SPLIT_FILES[i];
    var mapInfo = LINE_MAP[i] || {};
    var statusClass = "ok";
    var statusText = "جاري الفحص...";
    
    try {
      var testOutput = HtmlService.createHtmlOutputFromFile(fname);
      var testContent = testOutput.getContent();
      if (testContent && testContent.length > 0) {
        statusText = "✅ " + testContent.length + " chars";
      } else {
        statusClass = "warn";
        statusText = "⚠️ فارغ";
      }
    } catch (err) {
      statusClass = "fail";
      statusText = "❌ " + err.message;
    }
    
    html += "<tr>";
    html += "<td>" + i + "</td>";
    html += "<td><code>" + fname + ".html</code></td>";
    html += "<td>" + (mapInfo.start || "-") + "</td>";
    html += "<td>" + (mapInfo.end || "-") + "</td>";
    html += "<td class=\"" + statusClass + "\">" + statusText + "</td>";
    html += "</tr>";
  }
  
  html += "</table>";
  
  // دليل ترجمة رقم السطر
  html += "<h2>دليل ترجمة الأخطاء</h2>";
  html += "<p>عند ظهور خطأ برقم سطر في Console، استخدم هذا الجدول لمعرفة أي ملف:</p>";
  html += "<table><tr><th>نطاق الأسطر</th><th>الملف المسؤول</th></tr>";
  for (var j = 0; j < LINE_MAP.length; j++) {
    html += "<tr><td>" + LINE_MAP[j].start + " — " + LINE_MAP[j].end + "</td>";
    html += "<td><code>" + LINE_MAP[j].file + ".html</code></td></tr>";
  }
  html += "</table>";
  
  // تجميع اختباري
  html += "<h2>اختبار التجميع</h2>";
  try {
    var testAssemble = _assembleSplitFiles();
    html += "<pre>";
    html += "النجاح: " + testAssemble.success + "\n";
    html += "الملفات المحملة: " + testAssemble.loadedCount + "/" + SPLIT_FILES.length + "\n";
    html += "إجمالي الأحرف: " + testAssemble.html.length + "\n";
    if (testAssemble.errors.length > 0) {
      html += "\nالأخطاء:\n";
      for (var e = 0; e < testAssemble.errors.length; e++) {
        html += "  ❌ " + testAssemble.errors[e] + "\n";
      }
    }
    html += "</pre>";
  } catch (assembleErr) {
    html += "<pre class=\"fail\">خطأ في التجميع: " + assembleErr.message + "</pre>";
  }
  
  html += "</body></html>";
  
  return HtmlService.createHtmlOutput(html).setTitle("PHINOX Debug — Split Assembler");
}


/**
 * صفحة خطأ تفصيلية — تعرض أي ملف مقسّم فشل تحميله
 * @param {string[]} errors
 * @returns {HtmlOutput}
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
  
  html += "<h1>⚠️ خطأ في تحميل PHINOX BOS</h1>";
  html += "<p>فشل تحميل بعض ملفات Split Files</p>";
  
  if (errors && errors.length > 0) {
    html += "<h2>التفاصيل:</h2><ul>";
    for (var i = 0; i < errors.length; i++) {
      html += "<li>❌ <code>" + errors[i] + "</code></li>";
    }
    html += "</ul>";
  }
  
  html += "<h2>الحلول الممكنة:</h2><ul>";
  html += "<li>تأكد أن جميع ملفات <code>UI_Index_XX_*.html</code> موجودة في GAS IDE</li>";
  html += "<li>تحقق من أسماء الملفات تطابق تماماً الأسماء في <code>SPLIT_FILES</code></li>";
  html += "<li>استخدم <a href='?page=debug'>?page=debug</a> لفحص حالة كل ملف</li>";
  html += "</ul>";
  
  html += "</body></html>";
  
  return HtmlService.createHtmlOutput(html).setTitle("PHINOX BOS — Error");
}