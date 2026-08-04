// ═══════════════════════════════════════════════════════════════
// HtmlAPI.gs — Web App + API Bridge
// Connects WebApp.html to real business logic
// ═══════════════════════════════════════════════════════════════

/**
 * doGet — يُرجع صفحة HTML
 */
function doGet(e) {
  try {
    var action = e && e.parameter ? e.parameter.action : null;
    
    if (action) {
      var result = handleAction(action, e.parameter);
      return jsonResponse(result);
    }
    
    var html = HtmlService.createHtmlOutputFromFile('WebApp')
      .setTitle('PHINOX Dashboard')
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
    var data = {};
    
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        data = e.parameter || {};
      }
    } else {
      data = e.parameter || {};
    }
    
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
 * jsonResponse — يرجع JSON مع CORS
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
    // ── Dashboard ──
    case 'getOverview':     return getOverviewAPI();
    case 'getCEO':          return getCEOAPI();
    case 'getFinance':      return getFinanceAPI();
    case 'getInventory':    return getInventoryAPI();
    case 'getOrders':       return getOrdersAPI();
    case 'getKPI':          return getKPIAPI();
    case 'getSecurity':     return getSecurityAPI();
    case 'getMembers':      return getMembersAPI();
    case 'getTasks':        return getTasksAPI();
    case 'getSuppliers':    return getSuppliersAPI();
    case 'getSales':        return getSalesAPI();
    case 'getExpenses':     return getExpensesAPI();
    case 'getShareholders': return getShareholdersAPI();
    
    // ── Add ──
    case 'addTask':         return addTaskAPI(params);
    case 'addMember':       return addMemberAPI(params);
    case 'addProduct':      return addProductAPI(params);
    case 'addOrder':        return addOrderAPI(params);
    case 'addSale':         return addSaleAPI(params);
    case 'addExpense':      return addExpenseAPI(params);
    case 'addShareholder':  return addShareholderAPI(params);
    case 'addSupplier':     return addSupplierAPI(params);
    
    // ── Update / Delete ──
    case 'updateTask':      return updateTaskAPI(params);
    case 'deleteTask':      return deleteTaskAPI(params);
    case 'updateMember':    return updateMemberAPI(params);
    case 'deleteMember':    return deleteMemberAPI(params);
    case 'updateProduct':   return updateProductAPI(params);
    case 'deleteProduct':   return deleteProductAPI(params);
    case 'updateOrder':     return updateOrderAPI(params);
    case 'deleteOrder':     return deleteOrderAPI(params);
    
    // ── Security & Workflow ──
    case 'approveItem':     return approveItemAPI(params);
    case 'restoreItem':     return restoreItemAPI(params);
    case 'createBackup':    return createBackupAPI();
    
    // ── KPI v4 ──
    case 'getDepartmentKPIs': return getDepartmentKPIsAPI(params);
    case 'getAllDepartmentsSummary': return getAllDepartmentsSummaryAPI();
    case 'updateKPIBatch':  return updateKPIBatchAPI(params);
    case 'getKPIsNeedingInput': return getKPIsNeedingInputAPI();
    case 'getKPIExecutiveSummary': return getKPIExecutiveSummaryAPI();
    
    // ── Dialog helpers ──
    case 'getMembersList':  return getMembersListAPI();
    case 'getProductsList': return getProductsListAPI();
    case 'getCategories':   return getCategoriesAPI();
    
    default:
      return { success: false, error: 'Unknown action: ' + action };
  }
}

// ═══════════════════════════════════════════════════════════════
// GET APIs — Bridge to real business logic
// ═══════════════════════════════════════════════════════════════

function getOverviewAPI() {
  try {
    return { success: true, data: getDashboardData() };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function getCEOAPI() {
  try {
    var best = bestMember();
    return { 
      success: true, 
      data: {
        kpi: getKPIExecutiveSummary(),
        bestMember: best ? {name: best[1], score: best[7]} : null,
        teamKPI: teamAverageKPI(),
        totalMembers: totalMembers(),
        completedTasks: completedTasks(),
        lateTasks: getLateTasks().length
      }
    };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function getFinanceAPI() {
  try {
    return { success: true, data: getFinanceData() };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function getInventoryAPI() {
  try {
    var sheet = getSheet(APP.SHEETS.INVENTORY);
    if (!sheet) return { success: false, error: 'Inventory sheet not found' };
    var data = sheet.getDataRange().getValues();
    data.shift();
    return { success: true, data: data, count: data.length };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function getOrdersAPI() {
  try {
    var sheet = getSheet(APP.SHEETS.ORDERS);
    if (!sheet) return { success: false, error: 'Orders sheet not found' };
    var data = sheet.getDataRange().getValues();
    data.shift();
    return { success: true, data: data, count: data.length };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function getKPIAPI() {
  try {
    var sheet = getSheet(APP.SHEETS.KPI);
    if (!sheet) return { success: false, error: 'KPI sheet not found' };
    var data = sheet.getDataRange().getValues();
    data.shift();
    return { success: true, data: data, count: data.length };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function getSecurityAPI() {
  try {
    var sheet = getSheet(APP.SHEETS.AUDIT);
    if (!sheet) return { success: false, error: 'Audit sheet not found' };
    var data = sheet.getDataRange().getValues();
    data.shift();
    return { success: true, data: data.slice(-50), count: data.length };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function getMembersAPI() {
  try {
    var sheet = getSheet(APP.SHEETS.MEMBERS);
    if (!sheet) return { success: false, error: 'Members sheet not found' };
    var data = sheet.getDataRange().getValues();
    data.shift();
    return { success: true, data: data, count: data.length };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function getTasksAPI() {
  try {
    var sheet = getSheet(APP.SHEETS.TASKS);
    if (!sheet) return { success: false, error: 'Tasks sheet not found' };
    var data = sheet.getDataRange().getValues();
    data.shift();
    return { success: true, data: data, count: data.length };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function getSuppliersAPI() {
  try {
    var sheet = getSheet(APP.SHEETS.SUPPLIERS);
    if (!sheet) return { success: false, error: 'Suppliers sheet not found' };
    var data = sheet.getDataRange().getValues();
    data.shift();
    return { success: true, data: data, count: data.length };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function getSalesAPI() {
  try {
    var data = getSales();
    return { success: true, data: data, count: data.length };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function getExpensesAPI() {
  try {
    var sheet = getSheet(APP.SHEETS.EXPENSES);
    if (!sheet) return { success: false, error: 'Expenses sheet not found' };
    var data = sheet.getDataRange().getValues();
    data.shift();
    return { success: true, data: data, count: data.length };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function getShareholdersAPI() {
  try {
    var sheet = getSheet(APP.SHEETS.SHAREHOLDERS);
    if (!sheet) return { success: false, error: 'Shareholders sheet not found' };
    var data = sheet.getDataRange().getValues();
    data.shift();
    return { success: true, data: data, count: data.length };
  } catch(e) { return { success: false, error: e.toString() }; }
}

// ═══════════════════════════════════════════════════════════════
// ADD APIs — Use real business logic with proper columns
// ═══════════════════════════════════════════════════════════════

function addTaskAPI(params) {
  try {
    if (!params || !params.title) return { success: false, error: 'title required' };
    
    var id = generateId('TASK');
    var now = new Date();
    var row = [
      id,
      safeStr(params.title),
      safeStr(params.category) || APP.KPI_CATEGORY.OPERATIONS,
      safeStr(params.assignedTo) || '',
      safeStr(params.priority) || APP.PRIORITY.MEDIUM,
      safeStr(params.difficulty) || APP.DIFFICULTY.MEDIUM,
      APP.TASK_STATUS.NOT_STARTED,
      params.dueDate ? new Date(params.dueDate) : '',
      '', // Start Date
      0,  // Completion %
      0,  // Quality
      0,  // Impact
      0,  // Evidence
      0,  // Final Score
      0,  // Bonus
      0,  // Total Score
      0,  // Penalty
      '', // Reviewer
      0,  // Days Late
      '', // Completion Date
      now // Created At
    ];
    
    append(APP.SHEETS.TASKS, row);
    logAudit('CREATE', 'Task', id, 'API');
    return { success: true, id: id };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function addMemberAPI(params) {
  try {
    if (!params || !params.name) return { success: false, error: 'name required' };
    
    var id = generateId('MEM');
    var row = [
      id,
      safeStr(params.name),
      safeStr(params.role) || APP.ROLES.OPERATIONS,
      safeStr(params.email) || '',
      safeStr(params.phone) || '',
      safeStr(params.status) || 'Active',
      params.joinDate ? new Date(params.joinDate) : new Date(),
      0,  // KPI Score
      0,  // Completed Tasks
      0,  // Late Tasks
      0,  // Quality Avg
      0   // Points
    ];
    
    append(APP.SHEETS.MEMBERS, row);
    logAudit('CREATE', 'Member', id, 'API');
    return { success: true, id: id };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function addProductAPI(params) {
  try {
    if (!params || !params.name) return { success: false, error: 'name required' };
    
    var id = generateId('INV');
    var row = [
      id,
      safeStr(params.name),
      safeStr(params.category) || 'General',
      safeStr(params.variant) || '',
      safeStr(params.color) || '',
      safeStr(params.size) || '',
      safeStr(params.barcode) || id,
      toNumber(params.quantity),
      toNumber(params.minStock) || 10,
      toNumber(params.cost) || 0,
      toNumber(params.price) || 0,
      safeStr(params.warehouse) || 'Main',
      safeStr(params.supplier) || '',
      new Date(),
      safeStr(params.notes) || '',
      'Active',
      safeStr(params.location) || ''
    ];
    
    append(APP.SHEETS.INVENTORY, row);
    logAudit('CREATE', 'Product', id, 'API');
    return { success: true, id: id };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function addOrderAPI(params) {
  try {
    if (!params || !params.customer) return { success: false, error: 'customer required' };
    
    var id = generateId('ORD');
    var row = [
      id,
      safeStr(params.customer),
      safeStr(params.phone) || '',
      safeStr(params.email) || '',
      new Date(),
      safeStr(params.status) || 'New',
      safeStr(params.paymentMethod) || 'Cash',
      toNumber(params.total) || 0,
      toNumber(params.discount) || 0,
      params.dueDate ? new Date(params.dueDate) : '',
      safeStr(params.address) || '',
      safeStr(params.city) || '',
      toNumber(params.shippingCost) || 0,
      '', // Ship Date
      '', // Delivery Date
      safeStr(params.notes) || '',
      safeStr(params.source) || 'Web'
    ];
    
    append(APP.SHEETS.ORDERS, row);
    logAudit('CREATE', 'Order', id, 'API');
    return { success: true, id: id };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function addSaleAPI(params) {
  try {
    if (!params || !params.amount) return { success: false, error: 'amount required' };
    
    var inv = generateId('SAL');
    var row = [
      inv,
      params.date ? new Date(params.date) : new Date(),
      safeStr(params.customer) || 'Walk-in',
      safeStr(params.description) || '',
      toNumber(params.amount),
      safeStr(params.paymentMethod) || 'Cash',
      safeStr(params.notes) || ''
    ];
    
    append(APP.SHEETS.SALES, row);
    logAudit('CREATE', 'Sale', inv, 'API');
    return { success: true, invoice: inv };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function addExpenseAPI(params) {
  try {
    if (!params || !params.amount) return { success: false, error: 'amount required' };
    
    var row = [
      params.date ? new Date(params.date) : new Date(),
      safeStr(params.type) || 'Expense',
      safeStr(params.supplier) || '',
      safeStr(params.description) || '',
      toNumber(params.amount),
      safeStr(params.notes) || ''
    ];
    
    append(APP.SHEETS.EXPENSES, row);
    logAudit('CREATE', 'Expense', '', 'API');
    return { success: true };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function addShareholderAPI(params) {
  try {
    if (!params || !params.name) return { success: false, error: 'name required' };
    
    var row = [
      safeStr(params.name),
      safeStr(params.email) || '',
      toNumber(params.shares) || 0,
      toNumber(params.ownership) || 0,
      toNumber(params.investment) || 0,
      toNumber(params.currentValue) || 0,
      toNumber(params.profit) || 0,
      toNumber(params.loss) || 0
    ];
    
    append(APP.SHEETS.SHAREHOLDERS, row);
    logAudit('CREATE', 'Shareholder', params.name, 'API');
    return { success: true };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function addSupplierAPI(params) {
  try {
    if (!params || !params.name) return { success: false, error: 'name required' };
    
    var id = generateId('SUP');
    var row = [
      id,
      safeStr(params.name),
      safeStr(params.contactPerson) || '',
      safeStr(params.email) || '',
      safeStr(params.phone) || '',
      safeStr(params.address) || '',
      safeStr(params.category) || '',
      toNumber(params.rating) || 0,
      safeStr(params.paymentTerms) || '',
      safeStr(params.notes) || ''
    ];
    
    append(APP.SHEETS.SUPPLIERS, row);
    logAudit('CREATE', 'Supplier', id, 'API');
    return { success: true, id: id };
  } catch(e) { return { success: false, error: e.toString() }; }
}

// ═══════════════════════════════════════════════════════════════
// UPDATE / DELETE APIs
// ═══════════════════════════════════════════════════════════════

function updateTaskAPI(params) {
  try {
    if (!params || !params.id) return { success: false, error: 'id required' };
    var row = findRow(APP.SHEETS.TASKS, 1, params.id);
    if (row < 0) return { success: false, error: 'Task not found' };
    
    var sheet = getSheet(APP.SHEETS.TASKS);
    var data = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    if (params.title) data[1] = safeStr(params.title);
    if (params.status) data[6] = safeStr(params.status);
    if (params.priority) data[4] = safeStr(params.priority);
    if (params.completion !== undefined) data[9] = toNumber(params.completion);
    if (params.quality !== undefined) data[10] = toNumber(params.quality);
    if (params.impact !== undefined) data[11] = toNumber(params.impact);
    if (params.evidence !== undefined) data[12] = toNumber(params.evidence);
    
    updateRow(APP.SHEETS.TASKS, row, data);
    logAudit('UPDATE', 'Task', params.id, 'API');
    return { success: true };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function deleteTaskAPI(params) {
  try {
    if (!params || !params.id) return { success: false, error: 'id required' };
    var row = findRow(APP.SHEETS.TASKS, 1, params.id);
    if (row < 0) return { success: false, error: 'Task not found' };
    
    softDeleteRecord(APP.SHEETS.TASKS, row, 'Task', params.id);
    return { success: true };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function updateMemberAPI(params) {
  try {
    if (!params || !params.id) return { success: false, error: 'id required' };
    var row = findRow(APP.SHEETS.MEMBERS, 1, params.id);
    if (row < 0) return { success: false, error: 'Member not found' };
    
    var sheet = getSheet(APP.SHEETS.MEMBERS);
    var data = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    if (params.name) data[1] = safeStr(params.name);
    if (params.role) data[2] = safeStr(params.role);
    if (params.email) data[3] = safeStr(params.email);
    if (params.phone) data[4] = safeStr(params.phone);
    if (params.status) data[5] = safeStr(params.status);
    
    updateRow(APP.SHEETS.MEMBERS, row, data);
    logAudit('UPDATE', 'Member', params.id, 'API');
    return { success: true };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function deleteMemberAPI(params) {
  try {
    if (!params || !params.id) return { success: false, error: 'id required' };
    var row = findRow(APP.SHEETS.MEMBERS, 1, params.id);
    if (row < 0) return { success: false, error: 'Member not found' };
    
    softDeleteRecord(APP.SHEETS.MEMBERS, row, 'Member', params.id);
    return { success: true };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function updateProductAPI(params) {
  try {
    if (!params || !params.id) return { success: false, error: 'id required' };
    var row = findRow(APP.SHEETS.INVENTORY, 1, params.id);
    if (row < 0) return { success: false, error: 'Product not found' };
    
    var sheet = getSheet(APP.SHEETS.INVENTORY);
    var data = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    if (params.name) data[1] = safeStr(params.name);
    if (params.quantity !== undefined) data[7] = toNumber(params.quantity);
    if (params.price !== undefined) data[10] = toNumber(params.price);
    if (params.status) data[15] = safeStr(params.status);
    
    updateRow(APP.SHEETS.INVENTORY, row, data);
    logAudit('UPDATE', 'Product', params.id, 'API');
    return { success: true };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function deleteProductAPI(params) {
  try {
    if (!params || !params.id) return { success: false, error: 'id required' };
    var row = findRow(APP.SHEETS.INVENTORY, 1, params.id);
    if (row < 0) return { success: false, error: 'Product not found' };
    
    softDeleteRecord(APP.SHEETS.INVENTORY, row, 'Product', params.id);
    return { success: true };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function updateOrderAPI(params) {
  try {
    if (!params || !params.id) return { success: false, error: 'id required' };
    var row = findRow(APP.SHEETS.ORDERS, 1, params.id);
    if (row < 0) return { success: false, error: 'Order not found' };
    
    var sheet = getSheet(APP.SHEETS.ORDERS);
    var data = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    if (params.status) data[5] = safeStr(params.status);
    if (params.paymentMethod) data[6] = safeStr(params.paymentMethod);
    if (params.total !== undefined) data[7] = toNumber(params.total);
    
    updateRow(APP.SHEETS.ORDERS, row, data);
    logAudit('UPDATE', 'Order', params.id, 'API');
    return { success: true };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function deleteOrderAPI(params) {
  try {
    if (!params || !params.id) return { success: false, error: 'id required' };
    var row = findRow(APP.SHEETS.ORDERS, 1, params.id);
    if (row < 0) return { success: false, error: 'Order not found' };
    
    softDeleteRecord(APP.SHEETS.ORDERS, row, 'Order', params.id);
    return { success: true };
  } catch(e) { return { success: false, error: e.toString() }; }
}

// ═══════════════════════════════════════════════════════════════
// SECURITY & WORKFLOW
// ═══════════════════════════════════════════════════════════════

function approveItemAPI(params) {
  try {
    if (!params || !params.sheetName || !params.rowIndex) {
      return { success: false, error: 'sheetName and rowIndex required' };
    }
    var sheet = getSheet(params.sheetName);
    if (!sheet) return { success: false, error: 'Sheet not found' };
    
    var lastCol = sheet.getLastColumn();
    sheet.getRange(params.rowIndex, lastCol).setValue('Approved');
    sheet.getRange(params.rowIndex, lastCol - 1).setValue(new Date());
    logAudit('APPROVE', params.sheetName, 'Row ' + params.rowIndex, 'API');
    return { success: true };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function restoreItemAPI(params) {
  try {
    if (!params || !params.sheetName || !params.rowIndex) {
      return { success: false, error: 'sheetName and rowIndex required' };
    }
    var sheet = getSheet(params.sheetName);
    if (!sheet) return { success: false, error: 'Sheet not found' };
    
    sheet.getRange(params.rowIndex, 1, 1, sheet.getLastColumn()).setBackground(null);
    logAudit('RESTORE', params.sheetName, 'Row ' + params.rowIndex, 'API');
    return { success: true };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function createBackupAPI() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var backupName = 'PHINOX_Backup_' + Utilities.formatDate(new Date(), APP.INFO.TIMEZONE, 'yyyy-MM-dd_HH-mm');
    var backup = DriveApp.getFileById(ss.getId()).makeCopy(backupName);
    return { success: true, backupUrl: backup.getUrl(), backupName: backupName };
  } catch(e) { return { success: false, error: e.toString() }; }
}

// ═══════════════════════════════════════════════════════════════
// KPI v4 APIs
// ═══════════════════════════════════════════════════════════════

function getDepartmentKPIsAPI(params) {
  try {
    var dept = params && params.department ? params.department : 'CEO';
    var month = params && params.month ? params.month : null;
    var result = typeof getDepartmentKPIs_v4 === 'function' 
      ? getDepartmentKPIs_v4(dept, month) 
      : getDepartmentKPIs(dept);
    return { success: true, data: result };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function getAllDepartmentsSummaryAPI() {
  try {
    var result = typeof getAllDepartmentsSummary_v4 === 'function'
      ? getAllDepartmentsSummary_v4()
      : getAllDepartmentsSummary();
    return { success: true, data: result };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function updateKPIBatchAPI(params) {
  try {
    if (!params || !params.kpis) return { success: false, error: 'kpis array required' };
    
    if (typeof submitKPIBatch === 'function') {
      return submitKPIBatch(params.kpis);
    }
    
    var sheet = getSheet('KPI_Input');
    if (!sheet) return { success: false, error: 'KPI_Input sheet not found' };
    
    var kpis = params.kpis;
    var updated = 0;
    for (var i = 0; i < kpis.length; i++) {
      var kpi = kpis[i];
      if (kpi.kpiId && kpi.value !== undefined) {
        sheet.appendRow([kpi.kpiId, toNumber(kpi.value), kpi.month || '', kpi.notes || '']);
        updated++;
      }
    }
    return { success: true, updated: updated };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function getKPIsNeedingInputAPI() {
  try {
    var result = typeof getKPIsNeedingInput === 'function' ? getKPIsNeedingInput() : [];
    return { success: true, data: result };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function getKPIExecutiveSummaryAPI() {
  try {
    var result = typeof getKPIExecutiveSummary === 'function' ? getKPIExecutiveSummary() : {};
    return { success: true, data: result };
  } catch(e) { return { success: false, error: e.toString() }; }
}

// ═══════════════════════════════════════════════════════════════
// DIALOG HELPERS
// ═══════════════════════════════════════════════════════════════

function getMembersListAPI() {
  try {
    var sheet = getSheet(APP.SHEETS.MEMBERS);
    if (!sheet) return { success: false, error: 'Members sheet not found' };
    var data = sheet.getDataRange().getValues();
    var list = [];
    for (var i = 1; i < data.length; i++) {
      list.push({ id: data[i][0], name: data[i][1], role: data[i][2] });
    }
    return { success: true, data: list };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function getProductsListAPI() {
  try {
    var sheet = getSheet(APP.SHEETS.INVENTORY);
    if (!sheet) return { success: false, error: 'Inventory sheet not found' };
    var data = sheet.getDataRange().getValues();
    var list = [];
    for (var i = 1; i < data.length; i++) {
      list.push({ id: data[i][0], name: data[i][1], quantity: data[i][7] });
    }
    return { success: true, data: list };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function getCategoriesAPI() {
  try {
    var cats = Object.keys(APP.KPI_CATEGORY).map(function(k){ return APP.KPI_CATEGORY[k]; });
    return { success: true, data: cats };
  } catch(e) { return { success: false, error: e.toString() }; }
}

// ═══════════════════════════════════════════════════════════════
// AUDIT HELPER (placeholder if Audit.js not loaded)
// ═══════════════════════════════════════════════════════════════

function logAudit(action, entityType, entityId, user) {
  try {
    if (typeof addAuditLog === 'function') {
      addAuditLog(action, entityType, entityId, user);
      return;
    }
    var sheet = getSheet(APP.SHEETS.AUDIT);
    if (!sheet) return;
    sheet.appendRow([
      generateId('AUD'),
      action,
      entityType,
      entityId,
      user || 'System',
      new Date(),
      ''
    ]);
  } catch(e) {
    Logger.log('Audit log error: ' + e);
  }
}

function softDeleteRecord(sheetName, row, type, id) {
  try {
    if (typeof softDelete === 'function') {
      softDelete(sheetName, row);
      return;
    }
    var sheet = getSheet(sheetName);
    var data = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    var archive = getSheet('Archive');
    if (archive) {
      archive.appendRow([id, type, data[1] || '', 'API', new Date(), JSON.stringify(data)]);
    }
    
    sheet.getRange(row, 1, 1, sheet.getLastColumn()).setBackground('#ffcccc');
    logAudit('SOFT_DELETE', type, id, 'API');
  } catch(e) {
    Logger.log('Soft delete error: ' + e);
    deleteRow(sheetName, row);
  }
}