/**
 * عرض الواجهة الرسومية
 */
function showDashboardUI(){
  const html = HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('PHINOX Dashboard')
    .setWidth(1400)
    .setHeight(900);
  SpreadsheetApp.getUi().showModalDialog(html, 'PHINOX Business Operating System');
}

/**
 * تضمين ملفات HTML
 */
function include(filename){
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * دوال مساعدة للواجهة
 */
function getDashboardCards(){
  return [
    {label:'الأعضاء', value:totalMembers(), class:''},
    {label:'المهام', value:totalTasks(), class:''},
    {label:'المنجزة', value:completedTasks(), class:'success'},
    {label:'المتأخرة', value:getLateTasks().length, class:'danger'},
    {label:'متوسط KPI', value:teamAverageKPI(), class:''},
    {label:'الإنتاجية', value:averageProductivity()+'%', class:'success'}
  ];
}

function getTasksSummary(){
  return [
    ['قيد الانتظار', pendingReviewCount()],
    ['قيد التنفيذ', activeTasks()],
    ['المنجزة', completedTasks()],
    ['المتأخرة', getLateTasks().length],
    ['متوسط الدرجة', averageTaskScore()]
  ];
}

/**
 * ============================================================
 * PHINOX Business Operating System (PBOS)
 * Setup.gs
 * System Bootstrap
 * ============================================================
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("PHINOX")
    .addItem("🚀 Initialize System", "initializeSystem")
    .addItem("🔄 Rebuild Structure", "rebuildStructure")
    .addSeparator()
    .addItem("⚡ Create Daily Trigger", "createDailyTrigger")
    .addItem("📊 Open Dashboard", "showDashboardUI")
    .addItem("📊 Refresh Dashboard", "refreshDashboard")
    .addSeparator()
    .addItem("ℹ️ About", "showAbout")
    .addToUi();
}

/**
 * أول تشغيل للنظام
 */
function initializeSystem() {

  const ui = SpreadsheetApp.getUi();

  const result = ui.alert(
    "PHINOX",
    "سيتم إنشاء جميع صفحات النظام.\nهل تريد المتابعة؟",
    ui.ButtonSet.YES_NO
  );

  if (result !== ui.Button.YES) return;

  createSheets();
  formatSheets();
  applyValidationRules();

  ui.alert("✅ تم إنشاء النظام بنجاح.");

}

/**
 * إعادة بناء النظام
 */
function rebuildStructure() {

  createSheets();
  formatSheets();
  applyValidationRules();

}

/**
 * إنشاء جميع الـ Sheets
 */
function createSheets() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  Object.values(APP.SHEETS).forEach(sheetName => {

    let sheet = ss.getSheetByName(sheetName);

    if (!sheet) {

      sheet = ss.insertSheet(sheetName);

    } else {

      sheet.clear();

    }

    applySchema(sheetName, sheet);

  });

}

/**
 * تطبيق Schema
 */
function applySchema(sheetName, sheet) {

  const key = sheetName.replace(/\s/g, "");

  if (!SCHEMA[key]) return;

  const headers = SCHEMA[key];

  sheet.getRange(1,1,1,headers.length)
       .setValues([headers]);

}

/**
 * تنسيق جميع الصفحات
 */
function formatSheets() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  Object.values(APP.SHEETS).forEach(name=>{

      const sheet = ss.getSheetByName(name);

      if(!sheet) return;

      formatSheet(sheet);

  });

}

/**
 * تنسيق Sheet واحد
 */
function formatSheet(sheet){

    const lastColumn = sheet.getLastColumn();

    sheet.setFrozenRows(1);

    sheet.getRange(1,1,1,lastColumn)
    .setBackground(APP.COLORS.HEADER)
    .setFontColor("#FFFFFF")
    .setFontWeight("bold");

    for(let i=1;i<=lastColumn;i++){

        sheet.setColumnWidth(i,160);

    }

}

/**
 * معلومات النظام
 */
function showAbout(){

SpreadsheetApp.getUi().alert(

APP.INFO.NAME+

"\n\nVersion : "+APP.INFO.VERSION+

"\nBrand : "+APP.INFO.BRAND+

"\nTimezone : "+APP.INFO.TIMEZONE

);

}