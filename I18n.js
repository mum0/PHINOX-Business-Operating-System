/**
 * ============================================================
 * PHINOX Business Operating System v2.0
 * I18n.gs — Localization Engine
 * ============================================================
 */

const I18N = {
  ar: {
    err_invalid_amount: "الكمية يجب أن تكون أكبر من صفر.",
    err_product_not_found: "المنتج غير موجود.",
    err_insufficient_stock: "المخزون غير كافٍ.",
    inv_summary_title: "ملخص المخزون",
    inv_total_products: "إجمالي المنتجات",
    inv_total_quantity: "إجمالي الكمية",
    inv_total_value: "القيمة الإجمالية",
    inv_warehouses: "المستودعات",
    inv_low_stock: "منخفض المخزون",
    inv_out_of_stock: "نفذ من المخزون",

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

    sup_add: "إضافة مورد",
    sup_update: "تحديث مورد",
    sup_delete: "حذف مورد",
    sup_summary_title: "ملخص الموردين",
    sup_total: "إجمالي الموردين",
    sup_active: "النشطون",
    sup_avg_rating: "متوسط التقييم",
    sup_avg_lead: "متوسط وقت التوريد",
    sup_total_purchases: "إجمالي المشتريات",
    sup_top: "أفضل الموردين",

    ord_add: "إنشاء طلب",
    ord_update: "تحديث طلب",
    ord_delete: "حذف طلب",
    ord_created: "تم إنشاء الطلب",
    ord_not_pending: "لا يمكن تأكيد طلب ليس معلقاً",
    ord_already_cancelled: "الطلب ملغى مسبقاً",
    ord_not_delivered: "لا يمكن إرجاع طلب لم يتم توصيله",
    ord_no_return: "لا يوجد طلب إرجاع معلق",
    ord_return_not_approved: "الإرجاع لم يتم اعتماده",
    ord_order: "طلب",
    ord_cancel: "إلغاء طلب",
    ord_cancelled: "تم الإلغاء",
    ord_return: "إرجاع طلب",
    ord_kpi_title: "مؤشرات الطلبات",
    ord_total: "إجمالي الطلبات",
    ord_revenue: "الإيرادات",
    ord_avg_value: "متوسط قيمة الطلب",
    ord_conversion: "نسبة التحويل",
    ord_return_rate: "نسبة الإرجاع",
    ord_cancel_rate: "نسبة الإلغاء",
    ord_status_dist: "توزيع الحالات",
    ord_shipped: "تم الشحن",
    ord_delivered: "تم التوصيل",
    ord_returned: "مرتجع",

    fin_invalid_category: "فئة غير صالحة",
    fin_txn: "معاملة مالية",
    fin_txn_update: "تعديل معاملة",
    fin_txn_delete: "حذف معاملة",
    fin_budget_alert: "تنبيه تجاوز الميزانية",
    fin_over_budget: "تجاوزت الميزانية بمقدار",

    fin_kpi_title: "المؤشرات المالية",
    fin_current_balance: "الرصيد الحالي",
    fin_monthly_income: "إيرادات الشهر",
    fin_monthly_expense: "مصروفات الشهر",
    fin_monthly_profit: "ربح الشهر",
    fin_profit_margin: "هامش الربح",
    fin_total_income: "إجمالي الإيرادات",
    fin_total_expense: "إجمالي المصروفات",
    fin_net_profit: "صافي الربح",
    fin_expense_ratio: "نسبة المصروفات",
    fin_burn_rate: "معدل الاستنزاف الشهري",

    sale_add: "فاتورة مبيعات",
    sale_customer: "العميل",
    sale_amount: "المبلغ",
    sale_payment: "طريقة الدفع",
    exp_add: "مصروف جديد",
    exp_type: "نوع المصروف",
    exp_supplier: "المورد",
    sh_add: "مساهم جديد",
    sh_name: "الاسم",
    sh_shares: "عدد الأسهم",
    sh_price: "سعر السهم",

    lang_ar: "العربية",
    lang_en: "English",
    direction: "rtl"
   
  },
  
  en: {

    
    sale_add: "Sales Invoice",
    sale_customer: "Customer",
    sale_amount: "Amount",
    sale_payment: "Payment Method",
    exp_add: "New Expense",
    exp_type: "Expense Type",
    exp_supplier: "Supplier",
    sh_add: "New Shareholder",
    sh_name: "Name",
    sh_shares: "Shares",
    sh_price: "Share Price",
    
    fin_kpi_title: "Financial KPIs",
    fin_current_balance: "Current Balance",
    fin_monthly_income: "Monthly Income",
    fin_monthly_expense: "Monthly Expense",
    fin_monthly_profit: "Monthly Profit",
    fin_profit_margin: "Profit Margin",
    fin_total_income: "Total Income",
    fin_total_expense: "Total Expense",
    fin_net_profit: "Net Profit",
    fin_expense_ratio: "Expense Ratio",
    fin_burn_rate: "Monthly Burn Rate",
    
    fin_invalid_category: "Invalid category",
    fin_txn: "Financial Transaction",
    fin_txn_update: "Update Transaction",
    fin_txn_delete: "Delete Transaction",
    fin_budget_alert: "Budget Overrun Alert",
    fin_over_budget: "over budget by",

    ord_add: "Create Order",
    ord_update: "Update Order",
    ord_delete: "Delete Order",
    ord_created: "Order created",
    ord_not_pending: "Cannot confirm non-pending order",
    ord_already_cancelled: "Order already cancelled",
    ord_not_delivered: "Cannot return undelivered order",
    ord_no_return: "No pending return request",
    ord_return_not_approved: "Return not approved",
    ord_order: "Order",
    ord_cancel: "Cancel Order",
    ord_cancelled: "Cancelled",
    ord_return: "Return Order",
    ord_kpi_title: "Order KPIs",
    ord_total: "Total Orders",
    ord_revenue: "Revenue",
    ord_avg_value: "Average Order Value",
    ord_conversion: "Conversion Rate",
    ord_return_rate: "Return Rate",
    ord_cancel_rate: "Cancellation Rate",
    ord_status_dist: "Status Distribution",
    ord_shipped: "Shipped",
    ord_delivered: "Delivered",
    ord_returned: "Returned",

    sup_add: "Add Supplier",
    sup_update: "Update Supplier",
    sup_delete: "Delete Supplier",
    sup_summary_title: "Suppliers Summary",
    sup_total: "Total Suppliers",
    sup_active: "Active",
    sup_avg_rating: "Average Rating",
    sup_avg_lead: "Average Lead Time",
    sup_total_purchases: "Total Purchases",
    sup_top: "Top Suppliers",

    err_invalid_amount: "Amount must be greater than zero.",
    err_product_not_found: "Product not found.",
    err_insufficient_stock: "Insufficient stock.",
    inv_summary_title: "Inventory Summary",
    inv_total_products: "Total Products",
    inv_total_quantity: "Total Quantity",
    inv_total_value: "Total Value",
    inv_warehouses: "Warehouses",
    inv_low_stock: "Low Stock",
    inv_out_of_stock: "Out of Stock",

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