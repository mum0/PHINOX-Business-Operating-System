// ═══════════════════════════════════════════════════════════════════════
// PHINOX BOS v5 — UI Server (Google Apps Script)
// ═══════════════════════════════════════════════════════════════════════

// ─── PERMISSIONS ───
// PERMISSIONS — extend the authoritative object from 13_Permissions.js
// Do NOT re-declare with var — it would shadow the global and break
// Permissions.checkPermission() which uses the original values.
if (typeof PERMISSIONS === 'undefined' || !PERMISSIONS) var PERMISSIONS = {};
(function() {
  var extras = {
    DASHBOARD_READ: "dashboard:read",
    INVENTORY_BOM_READ: "inventory:bom_read",
    INVENTORY_BOM_MANAGE: "inventory:bom_manage",
    CUSTOMERS_READ: "customers:read",
    CUSTOMERS_WRITE: "customers:write",
    ORDERS_READ: "orders:read",
    ORDERS_WRITE: "orders:write",
    SALES_READ: "sales:read",
    SALES_WRITE: "sales:write",
    MARKETING_READ: "marketing:read",
    MARKETING_WRITE: "marketing:write",
    SOCIAL_READ: "social:read",
    SOCIAL_WRITE: "social:write",
    SATISFACTION_READ: "satisfaction:read",
    SATISFACTION_WRITE: "satisfaction:write",
    NPS_READ: "nps:read",
    NPS_WRITE: "nps:write",
    PERFORMANCE_READ: "performance:read",
    TASKS_APPROVE: "tasks:approve",
    EXPENSE_POST: "expenses:post"
  };
  for (var k in extras) { if (!PERMISSIONS[k]) PERMISSIONS[k] = extras[k]; }
})();

// ═══════════════════════════════════════════════════════
// NUCLEAR SAFETY HELPERS — Prevent "illegal value in property: 0"
// ═══════════════════════════════════════════════════════
function _safeString(val) {
  if (val === null || val === undefined) return '';
  if (val instanceof Error) return '';
  try { return String(val); } catch (e) { return ''; }
}
function _safeRow(row) {
  if (!row || !Array.isArray(row)) return [];
  var out = [];
  for (var i = 0; i < row.length; i++) {
    var v = row[i];
    if (v instanceof Error) { out.push(''); }
    else if (v instanceof Date) {
      try { out.push(Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd')); }
      catch (e) { out.push(String(v)); }
    }
    else { out.push(v !== null && v !== undefined ? v : ''); }
  }
  return out;
}
function _nuclearSafe(obj) {
  try {
    var jsonStr = JSON.stringify(obj);
    if (jsonStr) return JSON.parse(jsonStr);
  } catch (e) {}
  return null;
}

// Universal safe return — wrap ALL ui* responses with this
// Prevents "illegal value in property: 0" for ANY data from sheets
function _safeReturn(data) {
  var cleaned = _nuclearSafe(data);
  return cleaned || { success: false, error: 'Data serialization failed' };
}

// ─── AUTH HELPERS ───
function _requireAuth(permission) {
  var member = getCurrentMember();
  if (!member) {
    var email = '';
    try { email = Session.getActiveUser().getEmail(); } catch(e) {}
    throw new Error("المستخدم غير مسجّل في النظام. البريد: " + email);
  }
  var role = member[MEMBER_COL.ROLE] || '';
  if (role === 'Admin' || role === 'CEO') return member;
  var hasPerm = hasPermission(member, permission);
  if (!hasPerm) {
    try { logActivity(member, "Access Denied", "UI_Server", permission, "", "Unauthorized attempt"); } catch(e) {}
    throw new Error("Access denied: " + permission);
  }
  return member;
}

// ============================================================
// USER AUTH API
// ============================================================

function uiGetCurrentUser() {
  try {
    var email = '';
    try { email = Session.getActiveUser().getEmail(); } catch(e) {}
    var member = getCurrentMember();

    // ── SELF-HEAL: auto-migrate Members if columns are wrong ──
    if (!member && email) {
      try {
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var membersSheet = ss.getSheetByName('Members');
        if (membersSheet && membersSheet.getLastColumn() < 12) {
          console.log('[AUTH] Members has ' + membersSheet.getLastColumn() + ' cols (need 12). Running migration...');
          if (typeof _migrateMembersIfNeeded === 'function') {
            _migrateMembersIfNeeded();
            _currentMemberCache = null;
            member = getCurrentMember();
          }
        }
      } catch (migErr) {
        console.log('[AUTH] Migration failed: ' + migErr.message);
      }
    }

    // ── AUTO-REGISTER FIRST USER ──
    if (!member && email) {
      try {
        var ss2 = SpreadsheetApp.getActiveSpreadsheet();
        var ms = ss2.getSheetByName('Members');
        if (ms && ms.getLastRow() <= 1) {
          ms.appendRow([
            'MEM-001',
            email.split('@')[0],
            'Admin',
            email,
            '',
            'Active',
            new Date().toISOString().split('T')[0],
            0, 0, 0, 0,
            'First user auto-registered'
          ]);
          console.log('[AUTH] Auto-registered first Admin: ' + email);
          _currentMemberCache = null;
          member = getCurrentMember();
        }
      } catch (autoErr) {
        console.log('[AUTH] Auto-register failed: ' + autoErr.message);
      }
    }

    if (!member) {
      return {
        success: false,
        error: String(email) + ' - غير مسجل. تحقق: (1) الإيميل في Members (2) Status=Active (3) لا تكرار.'
      };
    }

    // ── HANDLE BOTH ARRAY AND OBJECT ──
    var safeEmail = '';
    var safeName = '';
    var safeRole = '';

    if (Array.isArray(member)) {
      safeEmail = String(member[MEMBER_COL.EMAIL] || '').trim();
      safeName  = String(member[MEMBER_COL.FULL_NAME] || '').trim();
      safeRole  = String(member[MEMBER_COL.ROLE] || '').trim();
    } else if (typeof member === 'object' && member !== null) {
      safeEmail = String(member.email || member[MEMBER_COL.EMAIL] || '').trim();
      safeName  = String(member.name || member.fullName || member[MEMBER_COL.FULL_NAME] || '').trim();
      safeRole  = String(member.role || member[MEMBER_COL.ROLE] || '').trim();
    } else {
      return { success: false, error: 'بيانات المستخدم غير صالحة' };
    }

    if (!safeEmail) {
      return { success: false, error: 'البريد الإلكتروني غير موجود في بيانات المستخدم' };
    }

    // ── SAFE PERMISSIONS (filter strings only) ──
    var safePerms = [];
    try {
      var perms = getRolePermissions(safeRole);
      if (Array.isArray(perms)) {
        safePerms = perms.filter(function(p) { return typeof p === 'string'; });
      }
    } catch (permErr) {
      console.log('[AUTH] getRolePermissions failed: ' + permErr.message);
    }

    // ── NUCLEAR: JSON round-trip to strip any non-serializable values ──
    var result = {
      success: true,
      data: {
        email: safeEmail,
        name: safeName,
        role: safeRole,
        permissions: safePerms
      }
    };
    try {
      var jsonStr = JSON.stringify(result);
      if (jsonStr) return JSON.parse(jsonStr);
    } catch (e) {
      console.log('[AUTH] Nuclear safe failed, returning manual build: ' + e.message);
    }
    return result;
  } catch (e) {
    return { success: false, error: String(e.message || 'Unknown error') };
  }
}

// ============================================================
// KPI APIs
// ============================================================

function uiGetDashboardKpis() {
  try {
    _requireAuth(PERMISSIONS.KPI_READ);
    var dashboard = KpiService.getDashboardKpis();
    return _safeReturn({ success: true, data: dashboard });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetKpiHistory(kpiId, limit) {
  try {
    _requireAuth(PERMISSIONS.KPI_READ);
    var history = KpiService.getKpiHistory(kpiId, limit || 12);
    return _safeReturn({ success: true, data: history });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCalculateCategory(category, periodType, refDate) {
  try {
    _requireAuth(PERMISSIONS.KPI_READ);
    var results = KpiService.calculateCategory(category, periodType, refDate);
    return _safeReturn({ success: true, data: results });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCalculateAll(periodType, refDate) {
  try {
    _requireAuth(PERMISSIONS.KPI_READ);
    var results = KpiService.calculateAll(periodType, refDate);
    return _safeReturn({ success: true, data: results });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// CUSTOMER APIs
// ============================================================

function uiGetCustomers(options) {
  try {
    _requireAuth(PERMISSIONS.MEMBERS_READ);
    var result = CustomerService.getCustomers(options || { limit: 1000 });
    return _safeReturn({ success: true, data: result });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetCustomer(id) {
  try {
    _requireAuth(PERMISSIONS.MEMBERS_READ);
    var customer = CustomerService.getCustomer(id);
    return _safeReturn({ success: true, data: customer });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetCustomerStats() {
  try {
    _requireAuth(PERMISSIONS.MEMBERS_READ);
    var stats = CustomerService.getCustomerStats();
    return _safeReturn({ success: true, data: stats });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateCustomer(data) {
  try {
    _requireAuth(PERMISSIONS.MEMBERS_WRITE);
    var id = CustomerService.createCustomer(data);
    return _safeReturn({ success: true, id: id });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiUpdateCustomer(id, data) {
  try {
    _requireAuth(PERMISSIONS.MEMBERS_WRITE);
    var updated = CustomerService.updateCustomer(id, data);
    return _safeReturn({ success: true, data: updated });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiDeleteCustomer(id) {
  try {
    _requireAuth(PERMISSIONS.MEMBERS_DELETE);
    CustomerService.deleteCustomer(id);
    return _safeReturn({ success: true });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiSyncCustomers() {
  try {
    _requireAuth(PERMISSIONS.MEMBERS_WRITE);
    var result = CustomerService.syncFromOrders();
    return _safeReturn({ success: true, data: result });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// SATISFACTION APIs
// ============================================================

function uiGetSatisfactionRecords(options) {
  try {
    _requireAuth(PERMISSIONS.REPORTS_READ);
    var result = SatisfactionService.getRecords(options || { limit: 1000 });
    return _safeReturn({ success: true, data: result });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetSatisfactionStats(startDate, endDate) {
  try {
    _requireAuth(PERMISSIONS.REPORTS_READ);
    var avg = SatisfactionService.getAverageScore(startDate, endDate);
    var count = SatisfactionService.getCount(startDate, endDate);
    var records = SatisfactionService.getByDateRange(startDate, endDate);
    return _safeReturn({ success: true, data: { average: avg, count: count, records: records } });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateSatisfaction(data) {
  try {
    _requireAuth(PERMISSIONS.REPORTS_WRITE);
    var id = SatisfactionService.createSatisfaction(data);
    return _safeReturn({ success: true, id: id });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// NPS APIs
// ============================================================

function uiGetNPSRecords(options) {
  try {
    _requireAuth(PERMISSIONS.REPORTS_READ);
    var result = NPSService.getRecords(options || { limit: 1000 });
    return _safeReturn({ success: true, data: result });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetNPSStats(startDate, endDate) {
  try {
    _requireAuth(PERMISSIONS.REPORTS_READ);
    var nps = NPSService.getNPS(startDate, endDate);
    var breakdown = NPSService.getBreakdown(startDate, endDate);
    var count = NPSService.getCount(startDate, endDate);
    return _safeReturn({ success: true, data: { nps: nps, breakdown: breakdown, count: count } });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateNPS(data) {
  try {
    _requireAuth(PERMISSIONS.REPORTS_WRITE);
    var id = NPSService.createNPS(data);
    return _safeReturn({ success: true, id: id });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// TASK APIs
// ============================================================

function uiGetTasks(options) {
  try {
    _requireAuth(PERMISSIONS.TASKS_READ);
    var result = TaskService.getTasks(options || { limit: 1000 });
    return _safeReturn({ success: true, data: result });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetTasksByDateRange(startDate, endDate) {
  try {
    _requireAuth(PERMISSIONS.TASKS_READ);
    var result = TaskService.getTasksByDateRange(startDate, endDate);
    return _safeReturn({ success: true, data: result });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetTaskStats(startDate, endDate) {
  try {
    _requireAuth(PERMISSIONS.TASKS_READ);
    var completed = TaskService.getCompletedTasksByDateRange(startDate, endDate);
    var overdue = TaskService.getOverdueTasks(startDate, endDate);
    var avgTime = TaskService.getAverageCompletionTime(startDate, endDate);
    var onTimeRate = TaskService.getOnTimeRate(startDate, endDate);
    var avgQuality = TaskService.getAverageQuality(startDate, endDate);
    var all = TaskService.getTasksByDateRange(startDate, endDate);
    return {
      success: true,
      data: {
        completed: completed && completed.data ? completed.data.length : 0,
        overdue: overdue && overdue.data ? overdue.data.length : 0,
        avgCompletionTime: avgTime,
        onTimeRate: onTimeRate,
        avgQuality: avgQuality,
        total: all && all.data ? all.data.length : 0
      }
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateTask(data) {
  try {
    _requireAuth(PERMISSIONS.TASKS_WRITE);
    var id = TaskService.createTask(data);
    return _safeReturn({ success: true, id: id });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiUpdateTask(id, data) {
  try {
    _requireAuth(PERMISSIONS.TASKS_WRITE);
    var updated = TaskService.updateTask(id, data);
    return _safeReturn({ success: true, data: updated });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiDeleteTask(id) {
  try {
    _requireAuth(PERMISSIONS.TASKS_DELETE);
    TaskService.deleteTask(id);
    return _safeReturn({ success: true });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ── PHINOX PATCH: Task Approve / Reject ──
function uiApproveTask(id) {
  try {
    _requireAuth(PERMISSIONS.TASKS_APPROVE);
    var result = TaskService.approveTask(id);
    return _safeReturn({ success: true, data: result });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiRejectTask(id, reason) {
  try {
    _requireAuth(PERMISSIONS.TASKS_APPROVE);
    var result = TaskService.rejectTask(id, reason);
    return _safeReturn({ success: true, data: result });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// MEMBER APIs
// ============================================================

function uiGetMembers() {
  try {
    _requireAuth(PERMISSIONS.MEMBERS_READ);
    var members = Members.getMembers();
    return _safeReturn({ success: true, data: members });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetMemberStats() {
  try {
    _requireAuth(PERMISSIONS.MEMBERS_READ);
    var total = Members.totalMembers();
    var active = Members.activeMembers();
    return _safeReturn({ success: true, data: { total: total, active: active.length } });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiAddMember(data) {
  try {
    _requireAuth(PERMISSIONS.MEMBERS_WRITE);
    // PHINOX PATCH: prevent duplicate Admin/CEO
    var limitErr = _checkAdminCEOLimit(data.role, null);
    if (limitErr) throw new Error(limitErr);
    var id = Members.addMember(data);
    return _safeReturn({ success: true, id: id });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiUpdateMember(id, data) {
  try {
    _requireAuth(PERMISSIONS.MEMBERS_WRITE);
    // PHINOX PATCH: prevent duplicate Admin/CEO
    var limitErr = _checkAdminCEOLimit(data.role, id);
    if (limitErr) throw new Error(limitErr);
    Members.updateMember(id, data);
    return _safeReturn({ success: true });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiDeleteMember(id) {
  try {
    _requireAuth(PERMISSIONS.MEMBERS_DELETE);
    Members.deleteMember(id);
    return _safeReturn({ success: true });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ── PHINOX PATCH: Admin/CEO limit ──
function _checkAdminCEOLimit(role, excludeId) {
  if (role !== "Admin" && role !== "CEO") return null;
  var all = Members.getMembers();
  for (var i = 0; i < all.length; i++) {
    var m = all[i];
    if (excludeId && String(m[MEMBER_COL.MEMBER_ID]) === String(excludeId)) continue;
    if (m[MEMBER_COL.ROLE] === role) return "Cannot have more than one " + role;
  }
  return null;
}

// ============================================================
// SALE APIs
// ============================================================

function uiGetSales(options) {
  try {
    _requireAuth(PERMISSIONS.ORDERS_READ);
    var result = SaleService.getSales(options || { limit: 1000 });
    return _safeReturn({ success: true, data: result });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetSalesByDateRange(startDate, endDate) {
  try {
    _requireAuth(PERMISSIONS.ORDERS_READ);
    var result = SaleService.getSalesByDateRange(startDate, endDate);
    return _safeReturn({ success: true, data: result });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateSale(data) {
  try {
    _requireAuth(PERMISSIONS.ORDERS_WRITE);
    var id = SaleService.createSale(data);
    return _safeReturn({ success: true, id: id });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// ORDER APIs
// ============================================================

function uiGetOrders(options) {
  try {
    _requireAuth(PERMISSIONS.ORDERS_READ);
    var result = OrderService.getOrders(options || { limit: 1000 });
    return _safeReturn({ success: true, data: result });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetOrdersByDateRange(startDate, endDate) {
  try {
    _requireAuth(PERMISSIONS.ORDERS_READ);
    var result = OrderService.getOrdersByDateRange(startDate, endDate);
    return _safeReturn({ success: true, data: result });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateOrder(data) {
  try {
    _requireAuth(PERMISSIONS.ORDERS_WRITE);
    var id = OrderService.createOrder(data);
    return _safeReturn({ success: true, id: id });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiUpdateOrderStatus(id, status) {
  try {
    _requireAuth(PERMISSIONS.ORDERS_WRITE);
    var result;
    if (status === "Confirmed") result = OrderService.confirmOrder(id);
    else if (status === "Shipped") result = OrderService.shipOrder(id);
    else if (status === "Delivered") result = OrderService.deliverOrder(id);
    else if (status === "Cancelled") result = OrderService.cancelOrder(id);
    else throw new Error("Invalid status: " + status);
    return _safeReturn({ success: true, data: result });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// FINANCE APIs
// ============================================================

function uiGetFinanceStats(startDate, endDate) {
  try {
    _requireAuth(PERMISSIONS.FINANCE_READ);
    var pnl = FinanceService.getProfitAndLoss(startDate, endDate);
    var cashFlow = FinanceService.getCashFlow(startDate, endDate);
    var cashBalance = FinanceService.getCashBalance("Cash", endDate);
    return _safeReturn({ success: true, data: { pnl: pnl, cashFlow: cashFlow, cashBalance: cashBalance } });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetLedger(options) {
  try {
    _requireAuth(PERMISSIONS.FINANCE_READ);
    var result = FinanceService.getLedger(options || { limit: 1000 });
    return _safeReturn({ success: true, data: result });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// INVENTORY APIs
// ============================================================

function uiGetInventory(options) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_READ);
    var result = InventoryService.getItems(options || { limit: 1000 });
    return _safeReturn({ success: true, data: result });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetInventoryStats() {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_READ);
    var total = InventoryService.totalItems();
    var lowStock = InventoryService.getLowStockItems();
    var outOfStock = InventoryService.getOutOfStockItems();
    var value = InventoryService.getInventoryValue();
    var retailValue = InventoryService.getInventoryRetailValue();
    return {
      success: true,
      data: {
        total: total,
        lowStock: lowStock && lowStock.data ? lowStock.data.length : 0,
        outOfStock: outOfStock && outOfStock.data ? outOfStock.data.length : 0,
        value: value,
        retailValue: retailValue
      }
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateInventoryItem(data) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_WRITE);
    var id = InventoryService.createItem(data);
    return _safeReturn({ success: true, id: id });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateInventory(data) {
  return uiCreateInventoryItem(data);
}

// ============================================================
// INVENTORY APIs — PHASE 3D EXTENSIONS
// ============================================================

function uiGetStockMovements(sku, options) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_READ);
    if (!sku) throw new Error("SKU required");
    var movements = StockMovementService.getMovementsBySku(sku);
    return _safeReturn({ success: true, data: movements });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiAdjustStock(data) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_WRITE);
    if (!data || !data.inventoryId || data.newQuantity === undefined || !data.reason) {
      throw new Error("inventoryId, newQuantity, and reason required");
    }
    var result = InventoryService.adjustStock(
      data.inventoryId,
      data.newQuantity,
      data.reason,
      data.notes || ""
    );
    return _safeReturn({ success: true, data: result });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiRestockStock(data) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_WRITE);
    if (!data || !data.sku || !data.qty) throw new Error("SKU and quantity required");
    InventoryService.restock(data.sku, data.qty, "UI_RESTOCK", data.referenceId || "");
    return _safeReturn({ success: true });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// BOM APIs
// ============================================================

function uiGetBOM(sku) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_BOM_READ);
    if (!sku) throw new Error("SKU required");
    var bom = BOMService.getBOMByFinishedProductSku(sku);
    return _safeReturn({ success: true, data: bom });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetBOMItems(bomId) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_BOM_READ);
    if (!bomId) throw new Error("bomId required");
    var items = BOMService.getBOMItems(bomId);
    return _safeReturn({ success: true, data: items });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateBOM(data) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_BOM_MANAGE);
    if (!data) throw new Error("BOM data required");
    var id = BOMService.createBOM(data);
    return _safeReturn({ success: true, id: id });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiUpdateBOM(id, data) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_BOM_MANAGE);
    if (!id) throw new Error("BOM ID required");
    var updated = BOMService.updateBOM(id, data);
    return _safeReturn({ success: true, data: updated });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiDeleteBOM(id) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_BOM_MANAGE);
    if (!id) throw new Error("BOM ID required");
    BOMService.deleteBOM(id);
    return _safeReturn({ success: true });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiAddBOMItem(bomId, data) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_BOM_MANAGE);
    if (!bomId) throw new Error("bomId required");
    var id = BOMService.addBOMItem(bomId, data);
    return _safeReturn({ success: true, id: id });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiUpdateBOMItem(id, data) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_BOM_MANAGE);
    if (!id) throw new Error("BOM Item ID required");
    var updated = BOMService.updateBOMItem(id, data);
    return _safeReturn({ success: true, data: updated });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiRemoveBOMItem(id) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_BOM_MANAGE);
    if (!id) throw new Error("BOM Item ID required");
    BOMService.removeBOMItem(id);
    return _safeReturn({ success: true });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCalculateCost(productId) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_BOM_READ);
    if (!productId) throw new Error("productId required");
    var result = BOMService.calculateUnitCost(productId);
    return _safeReturn({ success: true, data: result });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCalculateMargin(productId) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_BOM_READ);
    if (!productId) throw new Error("productId required");
    var result = BOMService.calculateGrossMargin(productId);
    return _safeReturn({ success: true, data: result });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetLowStock() {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_READ);
    var result = InventoryService.getLowStockItems();
    return _safeReturn({ success: true, data: result });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetOutOfStock() {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_READ);
    var result = InventoryService.getOutOfStockItems();
    return _safeReturn({ success: true, data: result });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// EXPENSE APIs
// ============================================================

function uiGetExpenses(options) {
  try {
    _requireAuth(PERMISSIONS.EXPENSES_READ);
    var result = FinanceRepository.findAllExpenses(options || { limit: 1000 });
    return _safeReturn({ success: true, data: result });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetExpense(id) {
  try {
    _requireAuth(PERMISSIONS.EXPENSES_READ);
    var result = FinanceRepository.findExpenseById(id);
    return _safeReturn({ success: true, data: result });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateExpense(data) {
  try {
    _requireAuth(PERMISSIONS.EXPENSES_WRITE);
    var id = FinanceService.createExpenseRequest(data);
    return _safeReturn({ success: true, id: id });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiSubmitExpense(id) {
  try {
    _requireAuth(PERMISSIONS.EXPENSES_WRITE);
    var result = FinanceService.submitExpenseRequest(id);
    return _safeReturn({ success: true, data: result });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiApproveExpense(id) {
  try {
    _requireAuth(PERMISSIONS.EXPENSES_APPROVE);
    var result = FinanceService.approveExpenseRequest(id);
    return _safeReturn({ success: true, data: result });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiRejectExpense(id, reason) {
  try {
    _requireAuth(PERMISSIONS.EXPENSES_APPROVE);
    var result = FinanceService.rejectExpenseRequest(id, reason);
    return _safeReturn({ success: true, data: result });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiPostExpense(id, account) {
  try {
    _requireAuth(PERMISSIONS.EXPENSES_APPROVE);
    var result = FinanceService.postExpenseToLedger(id, account);
    return _safeReturn({ success: true, data: result });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiDeleteExpense(id) {
  try {
    _requireAuth(PERMISSIONS.EXPENSES_DELETE);
    FinanceService.deleteExpenseRequest(id);
    return _safeReturn({ success: true });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// MARKETING APIs
// ============================================================

function uiGetMarketingRecords(options) {
  try {
    _requireAuth(PERMISSIONS.REPORTS_READ);
    var result = MktService.getRecords(options || { limit: 1000 });
    return _safeReturn({ success: true, data: result });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetMarketingStats(startDate, endDate) {
  try {
    _requireAuth(PERMISSIONS.REPORTS_READ);
    var spend = MktService.getTotalSpend(startDate, endDate);
    var impressions = MktService.getTotalImpressions(startDate, endDate);
    var reach = MktService.getTotalReach(startDate, endDate);
    var clicks = MktService.getTotalClicks(startDate, endDate);
    var leads = MktService.getTotalLeads(startDate, endDate);
    var conversions = MktService.getTotalConversions(startDate, endDate);
    var revenue = MktService.getTotalAttributedRevenue(startDate, endDate);
    var cost = MktService.getTotalCost(startDate, endDate);
    return {
      success: true,
      data: {
        spend: spend,
        impressions: impressions,
        reach: reach,
        clicks: clicks,
        leads: leads,
        conversions: conversions,
        revenue: revenue,
        cost: cost,
        roas: spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0,
        ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
        cpc: clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0
      }
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateMarketingRecord(data) {
  try {
    _requireAuth(PERMISSIONS.REPORTS_WRITE);
    var id = MktService.createRecord(data);
    return _safeReturn({ success: true, id: id });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// SOCIAL MEDIA APIs
// ============================================================

function uiGetSocialRecords(options) {
  try {
    _requireAuth(PERMISSIONS.REPORTS_READ);
    var result = SocService.getRecords(options || { limit: 1000 });
    return _safeReturn({ success: true, data: result });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetSocialStats(startDate, endDate) {
  try {
    _requireAuth(PERMISSIONS.REPORTS_READ);
    var followers = SocService.getFollowersAtDate(endDate);
    var reach = SocService.getTotalReach(startDate, endDate);
    var impressions = SocService.getTotalImpressions(startDate, endDate);
    var engagements = SocService.getTotalEngagements(startDate, endDate);
    var likes = SocService.getTotalLikes(startDate, endDate);
    var comments = SocService.getTotalComments(startDate, endDate);
    var shares = SocService.getTotalShares(startDate, endDate);
    var saves = SocService.getTotalSaves(startDate, endDate);
    var videoViews = SocService.getTotalVideoViews(startDate, endDate);
    var profileVisits = SocService.getTotalProfileVisits(startDate, endDate);
    var linkClicks = SocService.getTotalLinkClicks(startDate, endDate);
    var leads = SocService.getTotalLeads(startDate, endDate);
    var purchases = SocService.getTotalPurchases(startDate, endDate);
    var revenue = SocService.getTotalAttributedRevenue(startDate, endDate);
    return {
      success: true,
      data: {
        followers: followers,
        reach: reach,
        impressions: impressions,
        engagements: engagements,
        likes: likes,
        comments: comments,
        shares: shares,
        saves: saves,
        videoViews: videoViews,
        profileVisits: profileVisits,
        linkClicks: linkClicks,
        leads: leads,
        purchases: purchases,
        revenue: revenue,
        engagementRate: impressions > 0 ? Math.round((engagements / impressions) * 10000) / 100 : 0
      }
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateSocialRecord(data) {
  try {
    _requireAuth(PERMISSIONS.REPORTS_WRITE);
    var id = SocService.createRecord(data);
    return _safeReturn({ success: true, id: id });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// KPI EXTENDED API (NEW)
// ============================================================

function uiGetKPIs(params) {
  try {
    _requireAuth(PERMISSIONS.KPI_READ);
    var p = params || {};
    var period = (p.period || "MONTHLY").toUpperCase();
    var refDate = p.refDate || new Date().toISOString().split("T")[0];
    var periodType = period === "MONTHLY" ? "MONTHLY" : period === "QUARTERLY" ? "QUARTERLY" : "YEARLY";
    var kpis = KpiService.calculateAll(periodType, refDate);
    var finStats = FinanceService.getProfitAndLoss(refDate, refDate);
    var finData = finStats || null;
    var revenue = (finData && finData.revenue) ? finData.revenue : 0;
    var operatingExpenses = (finData && finData.operatingExpenses) ? finData.operatingExpenses : 0;
    var netProfit = (finData && finData.netProfit) ? finData.netProfit : (revenue - operatingExpenses);
    var result = {
      period: period,
      refDate: refDate,
      kpis: kpis && kpis.success ? kpis.data : [],
      summary: { revenue: revenue, expenses: operatingExpenses, netProfit: netProfit }
    };
    return _safeReturn({ success: true, data: result });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// LAUNCH UI — NO BUSINESS PERMISSIONS REQUIRED
// These are UI/bootstrap functions. Authorization is enforced
// at the data layer (all business functions above).
// ============================================================

function showPhinoxDashboard() {
  var html = HtmlService.createHtmlOutputFromFile("UI_Shell")
    .setTitle("PHINOX BOS Dashboard")
    .setWidth(1280)
    .setHeight(900);
  SpreadsheetApp.getUi().showModalDialog(html, "PHINOX BOS");
}

function showPhinoxDashboardSidebar() {
  var html = HtmlService.createHtmlOutputFromFile("UI_Shell")
    .setTitle("PHINOX BOS")
    .setWidth(350);
  SpreadsheetApp.getUi().showSidebar(html);
}

// NOTE: doGet is defined in doGet.gs — do NOT re-declare here.