// ═══════════════════════════════════════════════════════════════
// HtmlAPI.gs — Web App + API (محسّن)
// ═══════════════════════════════════════════════════════════════

/**
 * doGet — يُرجع صفحة HTML أو بيانات JSON (للاختبار)
 */
function doGet(e) {
  try {
    var action = e && e.parameter ? e.parameter.action : null;
    
    // إذا كان هناك action → إرجاع JSON (للاختبار المباشر)
    if (action) {
      var result = handleAction(action, e.parameter);
      return jsonResponse(result);
    }
    
    // إلا → إرجاع صفحة HTML العادية
    var html = HtmlService.createHtmlOutputFromFile('WebApp')
      .setTitle('CEO Dashboard')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    return html;
    
  } catch (err) {
    Logger.log('doGet ERROR: ' + err);
    return jsonResponse({ success: false, error: err.toString() });
  }
}

/**
 * doPost — يستقبل طلبات API من الـ Frontend
 */
function doPost(e) {
  try {
    Logger.log('doPost received');
    Logger.log('postData: ' + (e.postData ? e.postData.contents : 'null'));
    
    var data = {};
    
    // محاولة قراءة JSON من postData
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        // إذا فشل JSON.parse، جرب قراءة كـ form data
        data = e.parameter || {};
      }
    } else {
      data = e.parameter || {};
    }
    
    Logger.log('Parsed data: ' + JSON.stringify(data));
    
    var action = data.action || (e.parameter ? e.parameter.action : null);
    
    if (!action) {
      return jsonResponse({ success: false, error: 'No action specified' });
    }
    
    var result = handleAction(action, data);
    return jsonResponse(result);
    
  } catch (err) {
    Logger.log('doPost ERROR: ' + err);
    return jsonResponse({ success: false, error: err.toString() });
  }
}

/**
 * jsonResponse — يرجع JSON مع CORS headers
 */
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * handleAction — موزّع الطلبات
 */
function handleAction(action, params) {
  Logger.log('Action: ' + action);
  
  switch(action) {
    case 'getOverview':    return getOverview();
    case 'getCEO':         return getCEO();
    case 'getFinance':     return getFinance();
    case 'getInventory':   return getInventory();
    case 'getOrders':      return getOrders();
    case 'getKPI':         return getKPI();
    case 'getSecurity':    return getSecurity();
    case 'addTask':        return addTask(params);
    case 'addMember':      return addMember(params);
    case 'addProduct':     return addProduct(params);
    case 'addOrder':       return addOrder(params);
    case 'addSale':        return addSale(params);
    case 'addExpense':     return addExpense(params);
    case 'addShareholder': return addShareholder(params);
    case 'approveItem':    return approveItem(params);
    case 'restoreItem':    return restoreItem(params);
    case 'createBackup':   return createBackupAPI();
    case 'updateKPIBatch': return updateKPIBatch(params);
    
    default:
      return { success: false, error: 'Unknown action: ' + action };
  }
}

// ═══════════════════════════════════════════════════════════════
// الدوال المساعدة (API Functions)
// ═══════════════════════════════════════════════════════════════

function getOverview() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Overview');
    if (!sheet) return { success: false, error: 'Sheet Overview not found' };
    
    var data = sheet.getDataRange().getValues();
    return { success: true, data: data };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function getCEO() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('CEO');
    if (!sheet) return { success: false, error: 'Sheet CEO not found' };
    
    var data = sheet.getDataRange().getValues();
    return { success: true, data: data };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function getFinance() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Finance');
    if (!sheet) return { success: false, error: 'Sheet Finance not found' };
    
    var data = sheet.getDataRange().getValues();
    return { success: true, data: data };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function getInventory() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Inventory');
    if (!sheet) return { success: false, error: 'Sheet Inventory not found' };
    
    var data = sheet.getDataRange().getValues();
    return { success: true, data: data };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function getOrders() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Orders');
    if (!sheet) return { success: false, error: 'Sheet Orders not found' };
    
    var data = sheet.getDataRange().getValues();
    return { success: true, data: data };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function getKPI() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('KPI');
    if (!sheet) return { success: false, error: 'Sheet KPI not found' };
    
    var data = sheet.getDataRange().getValues();
    return { success: true, data: data };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function getSecurity() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Security');
    if (!sheet) return { success: false, error: 'Sheet Security not found' };
    
    var data = sheet.getDataRange().getValues();
    return { success: true, data: data };
  } catch(e) { return { success: false, error: e.toString() }; }
}

// ═══════════════════════════════════════════════════════════════
// دوال الإضافة (Add Functions)
// ═══════════════════════════════════════════════════════════════

function addTask(params) {
  try {
    if (!params || !params.taskName) return { success: false, error: 'taskName required' };
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Tasks') || ss.insertSheet('Tasks');
    sheet.appendRow([new Date(), params.taskName, params.assignee || '', params.status || 'Pending', params.priority || 'Normal']);
    return { success: true };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function addMember(params) {
  try {
    if (!params || !params.name) return { success: false, error: 'name required' };
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Members') || ss.insertSheet('Members');
    sheet.appendRow([new Date(), params.name, params.role || '', params.department || '', params.email || '']);
    return { success: true };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function addProduct(params) {
  try {
    if (!params || !params.productName) return { success: false, error: 'productName required' };
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Products') || ss.insertSheet('Products');
    sheet.appendRow([new Date(), params.productName, params.category || '', params.price || 0, params.stock || 0]);
    return { success: true };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function addOrder(params) {
  try {
    if (!params || !params.customerName) return { success: false, error: 'customerName required' };
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Orders') || ss.insertSheet('Orders');
    sheet.appendRow([new Date(), params.customerName, params.product || '', params.quantity || 0, params.total || 0, params.status || 'New']);
    return { success: true };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function addSale(params) {
  try {
    if (!params || !params.amount) return { success: false, error: 'amount required' };
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Sales') || ss.insertSheet('Sales');
    sheet.appendRow([new Date(), params.amount, params.customer || '', params.product || '', params.salesRep || '']);
    return { success: true };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function addExpense(params) {
  try {
    if (!params || !params.amount) return { success: false, error: 'amount required' };
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Expenses') || ss.insertSheet('Expenses');
    sheet.appendRow([new Date(), params.amount, params.category || '', params.description || '', params.approvedBy || '']);
    return { success: true };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function addShareholder(params) {
  try {
    if (!params || !params.name) return { success: false, error: 'name required' };
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Shareholders') || ss.insertSheet('Shareholders');
    sheet.appendRow([new Date(), params.name, params.shares || 0, params.percentage || 0, params.contact || '']);
    return { success: true };
  } catch(e) { return { success: false, error: e.toString() }; }
}

// ═══════════════════════════════════════════════════════════════
// دوال الأمان والاعتماد (Security Functions)
// ═══════════════════════════════════════════════════════════════

function approveItem(params) {
  try {
    if (!params || !params.sheetName || !params.rowIndex) return { success: false, error: 'sheetName and rowIndex required' };
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(params.sheetName);
    if (!sheet) return { success: false, error: 'Sheet not found' };
    
    var lastCol = sheet.getLastColumn();
    sheet.getRange(params.rowIndex, lastCol).setValue('Approved');
    sheet.getRange(params.rowIndex, lastCol - 1).setValue(new Date());
    return { success: true };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function restoreItem(params) {
  try {
    if (!params || !params.sheetName || !params.rowIndex) return { success: false, error: 'sheetName and rowIndex required' };
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(params.sheetName);
    if (!sheet) return { success: false, error: 'Sheet not found' };
    
    sheet.getRange(params.rowIndex, 1, 1, sheet.getLastColumn()).setBackground(null);
    return { success: true };
  } catch(e) { return { success: false, error: e.toString() }; }
}

// ═══════════════════════════════════════════════════════════════
// النسخ الاحتياطي و KPI
// ═══════════════════════════════════════════════════════════════

function createBackupAPI() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var backupSS = SpreadsheetApp.create('Backup_' + ss.getName() + '_' + new Date().toISOString().slice(0,10));
    
    var sheets = ss.getSheets();
    for (var i = 0; i < sheets.length; i++) {
      var source = sheets[i];
      var dest = backupSS.insertSheet(source.getName());
      var range = source.getDataRange();
      range.copyTo(dest.getRange(1, 1));
    }
    
    // حذف الـ Sheet الافتراضي
    var defaultSheet = backupSS.getSheetByName('Sheet1');
    if (defaultSheet) backupSS.deleteSheet(defaultSheet);
    
    return { success: true, backupUrl: backupSS.getUrl() };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function updateKPIBatch(params) {
  try {
    if (!params || !params.kpis) return { success: false, error: 'kpis array required' };
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('KPI');
    if (!sheet) return { success: false, error: 'Sheet KPI not found' };
    
    var kpis = params.kpis;
    for (var i = 0; i < kpis.length; i++) {
      var kpi = kpis[i];
      if (kpi.row && kpi.col && kpi.value !== undefined) {
        sheet.getRange(kpi.row, kpi.col).setValue(kpi.value);
      }
    }
    return { success: true };
  } catch(e) { return { success: false, error: e.toString() }; }
}