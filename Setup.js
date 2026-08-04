/**
 * ============================================================
 * PHINOX Business Operating System (PBOS)
 * Setup.gs — System Initialization
 * ============================================================
 * 
 * ⚠️ IMPORTANT: Verify column counts against Schema.js if available.
 * This setup creates sheets with headers inferred from module code.
 * Run `initializeSystem()` once from the Apps Script editor.
 */

/**
 * Initialize the system — creates all sheets, headers, and default data
 */
function initializeSystem() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var created = [];
  var existing = [];

  // ── 1. Members (12 columns) ──
  var membersSheet = getOrCreateSheet(ss, APP.SHEETS.MEMBERS, [
    'ID', 'Name', 'Role', 'Email', 'Phone', 'Status',
    'Join Date', 'KPI Score', 'Completed Tasks', 'Late Tasks', 'Quality Avg', 'Points'
  ], created, existing);
  if (membersSheet.getLastRow() === 1) {
    membersSheet.appendRow(['ADM001', 'System Admin', APP.ROLES.CEO, 'admin@phinox.com', '01000000000', 'Active', new Date(), 0, 0, 0, 0, 0]);
  }

  // ── 2. Tasks (21 columns) ──
  getOrCreateSheet(ss, APP.SHEETS.TASKS, [
    'ID', 'Title', 'Category', 'Assigned To', 'Priority', 'Difficulty',
    'Status', 'Due Date', 'Start Date', 'Completion %', 'Quality Score',
    'Impact Score', 'Evidence Score', 'Final Score', 'Bonus', 'Total Score',
    'Penalty', 'Reviewer', 'Days Late', 'Completion Date', 'Created At'
  ], created, existing);

  // ── 3. Inventory (17 columns) ──
  getOrCreateSheet(ss, APP.SHEETS.INVENTORY, [
    'ID', 'Name', 'Category', 'Variant', 'Color', 'Size', 'Barcode',
    'Quantity', 'Min Stock', 'Cost', 'Price', 'Warehouse', 'Supplier',
    'Last Updated', 'Notes', 'Status', 'Location'
  ], created, existing);

  // ── 4. Orders (17 columns) ──
  getOrCreateSheet(ss, APP.SHEETS.ORDERS, [
    'ID', 'Customer', 'Phone', 'Email', 'Order Date', 'Status',
    'Payment Method', 'Total', 'Discount', 'Due Date', 'Address',
    'City', 'Shipping Cost', 'Ship Date', 'Delivery Date', 'Notes', 'Source'
  ], created, existing);

  // ── 5. Finance (8 columns) ──
  getOrCreateSheet(ss, APP.SHEETS.FINANCE, [
    'ID', 'Date', 'Type', 'Category', 'Description', 'Amount', 'Balance', 'Notes'
  ], created, existing);

  // ── 6. Suppliers (10 columns) ──
  getOrCreateSheet(ss, APP.SHEETS.SUPPLIERS, [
    'ID', 'Name', 'Contact Person', 'Email', 'Phone', 'Address',
    'Category', 'Rating', 'Payment Terms', 'Notes'
  ], created, existing);

  // ── 7. Sales (7 columns — Mini ERP) ──
  getOrCreateSheet(ss, APP.SHEETS.SALES, [
    'Invoice #', 'Date', 'Customer', 'Description', 'Amount', 'Payment Method', 'Notes'
  ], created, existing);

  // ── 8. Expenses (6 columns — Mini ERP) ──
  getOrCreateSheet(ss, APP.SHEETS.EXPENSES, [
    'Date', 'Type', 'Supplier', 'Description', 'Amount', 'Notes'
  ], created, existing);

  // ── 9. Shareholders (8 columns — Mini ERP) ──
  getOrCreateSheet(ss, APP.SHEETS.SHAREHOLDERS, [
    'Name', 'Email', 'Shares', 'Ownership %', 'Investment Value', 'Current Value', 'Profit', 'Loss'
  ], created, existing);

  // ── 10. KPI (8 columns) ──
  getOrCreateSheet(ss, APP.SHEETS.KPI, [
    'ID', 'Member', 'Month', 'Score', 'Grade', 'Trend', 'Date', 'Notes'
  ], created, existing);

  // ── 11. Reviews (8 columns) ──
  getOrCreateSheet(ss, APP.SHEETS.REVIEWS, [
    'ID', 'Task ID', 'Reviewer', 'Member', 'Score', 'Comments', 'Date', 'Status'
  ], created, existing);

  // ── 12. Reports (6 columns) ──
  getOrCreateSheet(ss, APP.SHEETS.REPORTS, [
    'ID', 'Type', 'Title', 'Date', 'Data JSON', 'Created By'
  ], created, existing);

  // ── 13. Settings (4 columns) ──
  var settingsSheet = getOrCreateSheet(ss, APP.SHEETS.SETTINGS, [
    'Key', 'Value', 'Category', 'Last Updated'
  ], created, existing);
  if (settingsSheet.getLastRow() === 1) {
    settingsSheet.appendRow(['initialized', new Date().toISOString(), 'system', new Date()]);
    settingsSheet.appendRow(['version', APP.INFO.VERSION, 'system', new Date()]);
    settingsSheet.appendRow(['companyName', APP.INFO.BRAND, 'company', new Date()]);
    settingsSheet.appendRow(['currency', APP.INFO.CURRENCY, 'finance', new Date()]);
    settingsSheet.appendRow(['sharePrice', '1000', 'finance', new Date()]);
    settingsSheet.appendRow(['initialCapital', '0', 'finance', new Date()]);
  }

  // ── 14. Audit Log (7 columns) ──
  getOrCreateSheet(ss, APP.SHEETS.AUDIT, [
    'ID', 'Action', 'Entity Type', 'Entity ID', 'User', 'Date', 'Details'
  ], created, existing);

  // ── 15. Notifications (6 columns) ──
  getOrCreateSheet(ss, APP.SHEETS.NOTIFICATIONS, [
    'ID', 'Title', 'Message', 'Recipient', 'Date', 'Read'
  ], created, existing);

  // ── 16. Dashboard (5 columns) ──
  getOrCreateSheet(ss, APP.SHEETS.DASHBOARD, [
    'Metric', 'Value', 'Date', 'Category', 'Notes'
  ], created, existing);

  // ── 17. KPI_Input (for manual KPI values) ──
  getOrCreateSheet(ss, 'KPI_Input', [
    'KPI_ID', 'Value', 'Month', 'Notes'
  ], created, existing);

  // ── 18. KPI_Records (for v4 engine) ──
  getOrCreateSheet(ss, 'KPI_Records', [
    'KPI_ID', 'Department', 'Month', 'Actual', 'Source', 'Updated'
  ], created, existing);

  // ── 19. KPI_Targets (for v4 engine) ──
  var kpiTargets = getOrCreateSheet(ss, 'KPI_Targets', [
    'KPI_ID', 'Department', 'Name', 'Target', 'Unit', 'Frequency'
  ], created, existing);
  if (kpiTargets.getLastRow() === 1 && typeof initDefaultTargets === 'function') {
    initDefaultTargets(kpiTargets);
  }

  // ── 20. Archive (for soft delete) ──
  getOrCreateSheet(ss, 'Archive', [
    'ID', 'Type', 'Title', 'Deleted By', 'Deleted At', 'Data JSON'
  ], created, existing);

  // ── Summary ──
  var msg = '✅ تم تهيئة النظام بنجاح!\n\n';
  if (created.length > 0) msg += 'أوراق جديدة (' + created.length + '):\n• ' + created.join('\n• ') + '\n\n';
  if (existing.length > 0) msg += 'أوراق موجودة (' + existing.length + '):\n• ' + existing.join('\n• ') + '\n\n';
  msg += 'إجمالي الأوراق: ' + ss.getSheets().length;
  SpreadsheetApp.getUi().alert(msg);
}

/**
 * Helper: get or create a sheet with headers
 */
function getOrCreateSheet(ss, name, headers, createdList, existingList) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    styleHeader(sheet.getRange(1, 1, 1, headers.length), APP.COLORS.PRIMARY, '#FFFFFF');
    if (createdList) createdList.push(name);
  } else {
    if (existingList) existingList.push(name);
  }
  return sheet;
}

/**
 * Create custom menu in Google Sheets
 * NOTE: This should be the ONLY onOpen() in the project.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🔷 PHINOX BOS')
    .addItem('🚀 Initialize System', 'initializeSystem')
    .addItem('🖥️ Open Dashboard', 'showInterface')
    .addItem('🔄 Refresh System', 'refreshSystem')
    .addSeparator()
    .addItem('⚡ Daily Trigger', 'createDailyTrigger')
    .addSeparator()
    .addItem('💾 Create Backup', 'createBackup')
    .addItem('📖 Help', 'showHelp')
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
 * Refresh all data
 */
function refreshData() {
  try {
    systemRefresh();
    SpreadsheetApp.getActiveSpreadsheet().toast('تم تحديث جميع البيانات', '✅ PHINOX', 3);
  } catch (e) {
    SpreadsheetApp.getUi().alert('خطأ في التحديث: ' + e.message);
  }
}

/**
 * Create backup copy
 */
function createBackup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var backupName = 'PHINOX_Backup_' + Utilities.formatDate(new Date(), APP.INFO.TIMEZONE, 'yyyy-MM-dd_HH-mm');
  var backup = DriveApp.getFileById(ss.getId()).makeCopy(backupName);
  SpreadsheetApp.getUi().alert('✅ تم إنشاء نسخة احتياطية:\n' + backup.getName());
}

/**
 * Show help dialog
 */
function showHelp() {
  var html = HtmlService.createHtmlOutput(
    '<div style="font-family:Arial;direction:rtl;padding:10px;">' +
    '<h2>📖 دليل PHINOX BOS</h2>' +
    '<p><b>1.</b> اضغط على <b>تهيئة النظام</b> عند أول استخدام.</p>' +
    '<p><b>2.</b> اضغط على <b>فتح Dashboard</b> لعرض لوحة التحكم.</p>' +
    '<p><b>3.</b> جميع البيانات تُحفظ تلقائياً في Google Sheets.</p>' +
    '<p><b>4.</b> استخدم <b>تحديث البيانات</b> لإعادة حساب KPI والإحصائيات.</p>' +
    '<p><b>5.</b> للدعم: افتح Console (F12) وانسخ أي خطأ.</p>' +
    '<hr><p style="color:#666;font-size:12px;">الإصدار: ' + APP.INFO.VERSION + '</p>' +
    '</div>'
  ).setWidth(450).setHeight(320);
  SpreadsheetApp.getUi().showModalDialog(html, 'مساعدة');
}