/**
 * ============================================================
 * PHINOX Business Operating System (PBOS)
 * Setup.gs
 * System Bootstrap
 * ============================================================
 */

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  const menu = ui.createMenu(t("system_short"));
  
  menu.addItem(t("menu_initialize"), "initializeSystem")
      .addItem(t("menu_rebuild"), "rebuildStructure")
      .addSeparator()
      .addItem(t("menu_trigger"), "createDailyTrigger")
      .addItem(t("menu_dashboard"), "showDashboardUI")
      .addItem(t("menu_refresh"), "safeRefresh")
      .addSeparator()
      .addSubMenu(ui.createMenu(t("menu_language"))
          .addItem(t("lang_ar"), "switchLanguageToArabic")
          .addItem(t("lang_en"), "switchLanguageToEnglish"))
      .addSeparator()
      .addSubMenu(ui.createMenu("💰 Mini ERP")
          .addItem("فاتورة مبيعات", "openSaleDialog")
          .addItem("مصروف جديد", "openExpenseDialog")
          .addItem("إضافة مساهم", "openShareholderDialog")
          .addSeparator()
          .addItem("تحديث Mini ERP", "refreshMiniERPDashboard"))
      .addSeparator()
      .addItem(t("menu_about"), "showAbout")
      .addToUi();
}

function openSaleDialog(){
  const html = HtmlService.createHtmlOutputFromFile('SaleDialog')
    .setWidth(500).setHeight(600);
  SpreadsheetApp.getUi().showModalDialog(html, 'فاتورة مبيعات جديدة');
}

function openExpenseDialog(){
  const html = HtmlService.createHtmlOutputFromFile('ExpenseDialog')
    .setWidth(500).setHeight(550);
  SpreadsheetApp.getUi().showModalDialog(html, 'مصروف جديد');
}

function openShareholderDialog(){
  const html = HtmlService.createHtmlOutputFromFile('ShareholderDialog')
    .setWidth(450).setHeight(400);
  SpreadsheetApp.getUi().showModalDialog(html, 'إضافة مساهم جديد');
}

function refreshMiniERPDashboard(){
  buildDashboard();
  SpreadsheetApp.getUi().toast("تم تحديث Mini ERP في لوحة التحكم");
}

function initializeSystem() {
  const ui = SpreadsheetApp.getUi();
  const result = ui.alert(t("init_title"), t("init_message"), ui.ButtonSet.YES_NO);
  if (result !== ui.Button.YES) return;
  
  createSheets();
  formatSheets();
  applyValidationRules();
  
  try{ getCurrentLanguage(); }catch(e){ setCurrentLanguage(DEFAULT_LANGUAGE); }
  
  ui.alert(t("init_title"), t("init_success"), ui.ButtonSet.OK);
}

function rebuildStructure() {
  createSheets();
  formatSheets();
  applyValidationRules();
}

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

function applySchema(sheetName, sheet) {
  const key = sheetName.replace(/\s/g, "");
  if (!SCHEMA[key]) return;
  const headers = SCHEMA[key];
  sheet.getRange(1,1,1,headers.length).setValues([headers]);
}

function formatSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.values(APP.SHEETS).forEach(name => {
      const sheet = ss.getSheetByName(name);
      if(!sheet) return;
      formatSheet(sheet);
  });
}

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
 * ============================================================
 * PHINOX BOS - Web App Entry Point
 * ============================================================
 */

function showAbout(){
  const cfg = getMiniERPConfig ? getMiniERPConfig() : {};
  const currency = cfg.currency || APP.INFO.CURRENCY;
  SpreadsheetApp.getUi().alert(
    t("system_name") + "\n\n" +
    t("system_version") + " : " + APP.INFO.VERSION + "\n" +
    t("system_brand") + " : " + APP.INFO.BRAND + "\n" +
    t("system_timezone") + " : " + APP.INFO.TIMEZONE + "\n" +
    t("system_currency") + " : " + currency
  );
}