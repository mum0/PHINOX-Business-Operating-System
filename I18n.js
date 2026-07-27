/**
 * ============================================================
 * PHINOX Business Operating System v2.0
 * I18n.gs — Localization Engine
 * ============================================================
 */

const I18N = {
  ar: {
    menu_initialize: "🚀 تهيئة النظام",
    menu_rebuild: "🔄 إعادة بناء الهيكل",
    menu_trigger: "⚡ إنشاء مؤقت يومي",
    menu_dashboard: "📊 فتح لوحة التحكم",
    menu_refresh: "🔄 تحديث آمن",
    menu_about: "ℹ️ عن النظام",
    menu_language: "🌐 تغيير اللغة",
    
    dialog_confirm: "تأكيد",
    dialog_cancel: "إلغاء",
    dialog_yes: "نعم",
    dialog_no: "لا",
    dialog_ok: "موافق",
    dialog_close: "إغلاق",
    dialog_save: "حفظ",
    dialog_delete: "حذف",
    dialog_add: "إضافة",
    dialog_search: "بحث",
    
    system_name: "نظام فينوكس التشغيلي",
    system_short: "فينوكس",
    system_version: "الإصدار",
    system_brand: "العلامة التجارية",
    system_timezone: "المنطقة الزمنية",
    system_currency: "العملة",
    
    init_title: "فينوكس",
    init_message: "سيتم إنشاء جميع صفحات النظام.\nهل تريد المتابعة؟",
    init_success: "✅ تم إنشاء النظام بنجاح.",
    
    val_task_title_required: "عنوان المهمة مطلوب.",
    val_member_required: "العضو المسند إليه مطلوب.",
    val_invalid_priority: "أولوية غير صالحة.",
    val_invalid_difficulty: "صعوبة غير صالحة.",
    val_invalid_email: "بريد إلكتروني غير صالح.",
    
    task_new_assigned: "مهمة جديدة مسندة",
    task_approved: "تم اعتماد المهمة",
    task_rejected: "تم رفض المهمة",
    task_deadline: "تذكير الموعد النهائي",
    
    notif_type_task: "مهمة",
    notif_type_review: "مراجعة",
    notif_type_deadline: "موعد",
    notif_type_broadcast: "إذاعة",
    notif_type_performance: "أداء",
    notif_type_inventory: "مخزون",
    notif_low_performance: "تنبيه الأداء",
    notif_low_performance_msg: "مؤشر KPI أقل من الحد المقبول (70%).",
    notif_low_stock: "تنبيه مخزون منخفض",
    
    perf_excellent: "أداء ممتاز",
    perf_reduce_delay: "قلل المهام المتأخرة",
    perf_improve_quality: "حسّن جودة العمل",
    perf_increase_productivity: "زد من إنتاجيتك",
    perf_maintain: "حافظ على الأداء الحالي",
    perf_trend_up: "مرتفع ↑",
    perf_trend_down: "منخفض ↓",
    perf_trend_stable: "مستقر →",
    
    rpt_period_daily: "يومي",
    rpt_period_weekly: "أسبوعي",
    rpt_period_monthly: "شهري",
    rpt_member: "العضو",
    rpt_kpi: "KPI",
    rpt_completed: "المنجزة",
    rpt_late: "المتأخرة",
    rpt_quality: "الجودة",
    rpt_productivity: "الإنتاجية",
    
    dash_title: "لوحة التحكم الرئيسية",
    dash_generated: "تاريخ التوليد",
    dash_total_tasks: "إجمالي المهام",
    dash_completed: "المنجزة",
    dash_in_progress: "قيد التنفيذ",
    dash_waiting_review: "بانتظار المراجعة",
    dash_late: "المتأخرة",
    dash_avg_score: "متوسط الدرجة",
    dash_team_kpi: "متوسط KPI الفريق",
    dash_avg_productivity: "متوسط الإنتاجية",
    dash_top_members: "أفضل الأعضاء",
    dash_tasks_summary: "ملخص المهام",
    dash_kpi_summary: "ملخص المؤشرات",
    
    inv_low_stock_alert: "المخزون منخفض: {name} ({variant}) — المتبقي {qty} فقط.",
    
    fin_budget_alert: "تجاوز الميزانية",
    
    err_access_denied: "غير مصرح: {permission} مطلوب.",
    err_member_not_found: "العضو غير موجود.",
    err_invalid_role: "دور غير صالح.",
    err_product_not_found: "المنتج غير موجود.",
    err_insufficient_stock: "المخزون غير كافٍ.",
    err_order_not_found: "الطلب غير موجود.",
    
    lang_ar: "العربية",
    lang_en: "English",
    direction: "rtl"
  },
  
  en: {
    menu_initialize: "🚀 Initialize System",
    menu_rebuild: "🔄 Rebuild Structure",
    menu_trigger: "⚡ Create Daily Trigger",
    menu_dashboard: "📊 Open Dashboard",
    menu_refresh: "🔄 Safe Refresh",
    menu_about: "ℹ️ About",
    menu_language: "🌐 Language",
    
    dialog_confirm: "Confirm",
    dialog_cancel: "Cancel",
    dialog_yes: "Yes",
    dialog_no: "No",
    dialog_ok: "OK",
    dialog_close: "Close",
    dialog_save: "Save",
    dialog_delete: "Delete",
    dialog_add: "Add",
    dialog_search: "Search",
    
    system_name: "PHINOX Business Operating System",
    system_short: "PHINOX",
    system_version: "Version",
    system_brand: "Brand",
    system_timezone: "Timezone",
    system_currency: "Currency",
    
    init_title: "PHINOX",
    init_message: "All system sheets will be created.\nDo you want to continue?",
    init_success: "✅ System initialized successfully.",
    
    val_task_title_required: "Task title is required.",
    val_member_required: "Assigned member is required.",
    val_invalid_priority: "Invalid priority.",
    val_invalid_difficulty: "Invalid difficulty.",
    val_invalid_email: "Invalid email address.",
    
    task_new_assigned: "New Task Assigned",
    task_approved: "Task Approved",
    task_rejected: "Task Rejected",
    task_deadline: "Deadline Reminder",
    
    notif_type_task: "Task",
    notif_type_review: "Review",
    notif_type_deadline: "Deadline",
    notif_type_broadcast: "Broadcast",
    notif_type_performance: "Performance",
    notif_type_inventory: "Inventory",
    notif_low_performance: "Performance Alert",
    notif_low_performance_msg: "Your KPI is below the acceptable threshold (70%).",
    notif_low_stock: "Low Stock Alert",
    
    perf_excellent: "Excellent Performance",
    perf_reduce_delay: "Reduce Delayed Tasks",
    perf_improve_quality: "Improve Quality",
    perf_increase_productivity: "Increase Productivity",
    perf_maintain: "Maintain Current Performance",
    perf_trend_up: "Up ↑",
    perf_trend_down: "Down ↓",
    perf_trend_stable: "Stable →",
    
    rpt_period_daily: "Daily",
    rpt_period_weekly: "Weekly",
    rpt_period_monthly: "Monthly",
    rpt_member: "Member",
    rpt_kpi: "KPI",
    rpt_completed: "Completed",
    rpt_late: "Late",
    rpt_quality: "Quality",
    rpt_productivity: "Productivity",
    
    dash_title: "Main Dashboard",
    dash_generated: "Generated",
    dash_total_tasks: "Total Tasks",
    dash_completed: "Completed",
    dash_in_progress: "In Progress",
    dash_waiting_review: "Waiting Review",
    dash_late: "Late",
    dash_avg_score: "Average Score",
    dash_team_kpi: "Team KPI",
    dash_avg_productivity: "Average Productivity",
    dash_top_members: "Top Members",
    dash_tasks_summary: "Tasks Summary",
    dash_kpi_summary: "KPI Summary",
    
    inv_low_stock_alert: "Low stock: {name} ({variant}) — {qty} remaining.",
    
    fin_budget_alert: "Budget Overrun",
    
    err_access_denied: "Access Denied: {permission} required.",
    err_member_not_found: "Member not found.",
    err_invalid_role: "Invalid role.",
    err_product_not_found: "Product not found.",
    err_insufficient_stock: "Insufficient stock.",
    err_order_not_found: "Order not found.",
    
    lang_ar: "العربية",
    lang_en: "English",
    direction: "ltr"
  }
};

const DEFAULT_LANGUAGE = "ar";
const LANG_CACHE_KEY = "phinox_lang_v2";

/**
 * Get current language (cached)
 */
function getCurrentLanguage(){
  try{
    const cache = CacheService.getScriptCache();
    const cached = cache.get(LANG_CACHE_KEY);
    if(cached) return cached;
  }catch(e){}
  
  try{
    const sheet = getSheet(APP.SHEETS.SETTINGS);
    if(sheet){
      const data = sheet.getDataRange().getValues();
      for(let i = 1; i < data.length; i++){
        if(data[i][0] === "language"){
          const lang = data[i][1] || DEFAULT_LANGUAGE;
          try{ CacheService.getScriptCache().put(LANG_CACHE_KEY, lang, 21600); }catch(e){}
          return lang;
        }
      }
    }
  }catch(e){}
  
  return DEFAULT_LANGUAGE;
}

/**
 * Set language preference
 */
function setCurrentLanguage(lang){
  if(!I18N[lang]){
    throw new Error("Unsupported language: " + lang);
  }
  
  const sheet = getSheet(APP.SHEETS.SETTINGS);
  const data = sheet.getDataRange().getValues();
  let found = false;
  
  for(let i = 1; i < data.length; i++){
    if(data[i][0] === "language"){
      data[i][1] = lang;
      sheet.getRange(i + 1, 1, 1, 3).setValues([[data[i][0], data[i][1], data[i][2] || "System language"]]);
      found = true;
      break;
    }
  }
  
  if(!found){
    sheet.appendRow(["language", lang, "System language preference"]);
  }
  
  try{ CacheService.getScriptCache().put(LANG_CACHE_KEY, lang, 21600); }catch(e){}
  return true;
}

/**
 * Translate with optional replacements
 * Usage: t("err_access_denied", {permission: "admin"})
 */
function t(key, replacements){
  const lang = getCurrentLanguage();
  const dict = I18N[lang] || I18N[DEFAULT_LANGUAGE];
  let text = dict[key] || key;
  
  if(replacements){
    Object.keys(replacements).forEach(k => {
      text = text.replace(new RegExp("{" + k + "}", "g"), replacements[k]);
    });
  }
  return text;
}

/**
 * Is current language RTL?
 */
function isRTL(){
  return getCurrentLanguage() === "ar";
}

/**
 * Get HTML direction
 */
function getDirection(){
  return isRTL() ? "rtl" : "ltr";
}

/**
 * Switch language handlers
 */
function switchLanguageToArabic(){
  setCurrentLanguage("ar");
  SpreadsheetApp.getUi().alert(t("init_title"), "تم تغيير اللغة إلى العربية. يرجى إعادة تحميل الصفحة (F5).", SpreadsheetApp.getUi().ButtonSet.OK);
}

function switchLanguageToEnglish(){
  setCurrentLanguage("en");
  SpreadsheetApp.getUi().alert(t("init_title"), "Language changed to English. Please refresh the page (F5).", SpreadsheetApp.getUi().ButtonSet.OK);
}