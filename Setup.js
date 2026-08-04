/**
 * Setup.gs - PHINOX BOS System Setup & Menu
 * Replace your current Setup.gs with this file
 */

/**
 * Initialize the system - creates sheets, headers, default data
 * Run this once from the Apps Script editor
 */
function initializeSystem() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Members Sheet
  var membersSheet = ss.getSheetByName('Members');
  if (!membersSheet) {
    membersSheet = ss.insertSheet('Members');
    membersSheet.getRange(1, 1, 1, 6).setValues([['ID', 'Name', 'Role', 'Email', 'Phone', 'Points']]);
    membersSheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#1a237e').setFontColor('white');
    // Add default admin
    membersSheet.appendRow(['ADM001', 'System Admin', 'CEO', 'admin@phinox.com', '01000000000', 0]);
  }

  // 2. Tasks Sheet
  var tasksSheet = ss.getSheetByName('Tasks');
  if (!tasksSheet) {
    tasksSheet = ss.insertSheet('Tasks');
    tasksSheet.getRange(1, 1, 1, 8).setValues([['ID', 'Title', 'Category', 'Assigned', 'Priority', 'Difficulty', 'Status', 'Due Date']]);
    tasksSheet.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#1a237e').setFontColor('white');
  }

  // 3. Products Sheet
  var productsSheet = ss.getSheetByName('Products');
  if (!productsSheet) {
    productsSheet = ss.insertSheet('Products');
    productsSheet.getRange(1, 1, 1, 11).setValues([['ID', 'Name', 'Category', 'Variant', 'Color', 'Size', 'Qty', 'Min', 'Cost', 'Price', 'Warehouse']]);
    productsSheet.getRange(1, 1, 1, 11).setFontWeight('bold').setBackground('#1a237e').setFontColor('white');
  }

  // 4. Orders Sheet
  var ordersSheet = ss.getSheetByName('Orders');
  if (!ordersSheet) {
    ordersSheet = ss.insertSheet('Orders');
    ordersSheet.getRange(1, 1, 1, 9).setValues([['ID', 'Customer', 'Phone', 'Status', 'Payment', 'Address', 'Total', 'Date', 'Notes']]);
    ordersSheet.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#1a237e').setFontColor('white');
  }

  // 5. Sales Sheet (Mini ERP)
  var salesSheet = ss.getSheetByName('Sales');
  if (!salesSheet) {
    salesSheet = ss.insertSheet('Sales');
    salesSheet.getRange(1, 1, 1, 7).setValues([['ID', 'Customer', 'Date', 'Items', 'Discount', 'Tax', 'Total']]);
    salesSheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#2E7D32').setFontColor('white');
  }

  // 6. Expenses Sheet (Mini ERP)
  var expensesSheet = ss.getSheetByName('Expenses');
  if (!expensesSheet) {
    expensesSheet = ss.insertSheet('Expenses');
    expensesSheet.getRange(1, 1, 1, 7).setValues([['ID', 'Title', 'Amount', 'Category', 'Date', 'Description', 'Attachment']]);
    expensesSheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#C62828').setFontColor('white');
  }

  // 7. Shareholders Sheet (Mini ERP)
  var shareholdersSheet = ss.getSheetByName('Shareholders');
  if (!shareholdersSheet) {
    shareholdersSheet = ss.insertSheet('Shareholders');
    shareholdersSheet.getRange(1, 1, 1, 6).setValues([['ID', 'Name', 'Percent', 'Capital', 'Email', 'Phone']]);
    shareholdersSheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#1565C0').setFontColor('white');
  }

  // 8. KPI Data Sheet
  var kpiSheet = ss.getSheetByName('KPI_Data');
  if (!kpiSheet) {
    kpiSheet = ss.insertSheet('KPI_Data');
    kpiSheet.getRange(1, 1, 1, 7).setValues([['Month', 'Dept', 'Metric', 'Value', 'Target', 'Weight', 'Source']]);
    kpiSheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#4a148c').setFontColor('white');
  }

  // 9. Approvals Sheet
  var approvalsSheet = ss.getSheetByName('Approvals');
  if (!approvalsSheet) {
    approvalsSheet = ss.insertSheet('Approvals');
    approvalsSheet.getRange(1, 1, 1, 7).setValues([['ID', 'Type', 'Title', 'By', 'Date', 'Status', 'ApprovedBy']]);
    approvalsSheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#E65100').setFontColor('white');
  }

  // 10. Archive Sheet
  var archiveSheet = ss.getSheetByName('Archive');
  if (!archiveSheet) {
    archiveSheet = ss.insertSheet('Archive');
    archiveSheet.getRange(1, 1, 1, 6).setValues([['ID', 'Type', 'Title', 'DeletedBy', 'DeletedAt', 'Data']]);
    archiveSheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#757575').setFontColor('white');
  }

  // 11. Config Sheet
  var configSheet = ss.getSheetByName('Config');
  if (!configSheet) {
    configSheet = ss.insertSheet('Config');
    configSheet.getRange(1, 1, 1, 2).setValues([['Key', 'Value']]);
    configSheet.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#37474f').setFontColor('white');
    configSheet.appendRow(['initialized', new Date().toISOString()]);
    configSheet.appendRow(['version', '2.0']);
    configSheet.appendRow(['companyName', 'PHINOX']);
  }

  SpreadsheetApp.getUi().alert('✅ تم تهيئة النظام بنجاح!\n\nتم إنشاء جميع الأوراق المطلوبة.');
}

/**
 * Create custom menu in Google Sheets
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🔷 PHINOX BOS')
    .addItem('🚀 فتح Dashboard', 'openDashboard')
    .addItem('⚙️ تهيئة النظام', 'initializeSystem')
    .addSeparator()
    .addItem('📊 تحديث البيانات', 'refreshData')
    .addItem('💾 نسخ احتياطي', 'createBackup')
    .addSeparator()
    .addItem('📖 دليل الاستخدام', 'showHelp')
    .addToUi();
}

/**
 * Open the Web App Dashboard
 */
function openDashboard() {
  var scriptId = ScriptApp.getScriptId();
  var url = 'https://script.google.com/macros/s/' + scriptId + '/exec';
  SpreadsheetApp.getUi().alert('رابط الـ Dashboard:\n' + url + '\n\nانسخه وافتحه في متصفح جديد.');
}

/**
 * Refresh all data (placeholder)
 */
function refreshData() {
  SpreadsheetApp.getUi().alert('تم تحديث البيانات من الـ Dashboard.');
}

/**
 * Create backup
 */
function createBackup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var backupName = 'PHINOX_Backup_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HH-mm');
  var backup = DriveApp.getFileById(ss.getId()).makeCopy(backupName);
  SpreadsheetApp.getUi().alert('✅ تم إنشاء نسخة احتياطية:\n' + backup.getName());
}

/**
 * Show help
 */
function showHelp() {
  var html = HtmlService.createHtmlOutput(
    '<h2>📖 دليل PHINOX BOS</h2>' +
    '<p><b>1.</b> اضغط على <b>فتح Dashboard</b> لعرض لوحة التحكم.</p>' +
    '<p><b>2.</b> استخدم <b>تهيئة النظام</b> عند أول استخدام.</p>' +
    '<p><b>3.</b> جميع البيانات تُحفظ تلقائياً في Google Sheets.</p>' +
    '<p><b>4.</b> للدعم: افتح Console (F12) وانسخ أي خطأ.</p>'
  ).setWidth(400).setHeight(300);
  SpreadsheetApp.getUi().showModalDialog(html, 'مساعدة');
}