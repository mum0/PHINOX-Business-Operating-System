// ═══════════════════════════════════════════════════════════════════════
// PHINOX BOS v5 — UI Server (Google Apps Script)
// ═══════════════════════════════════════════════════════════════════════
// تم التعديل: إزالة doGet المكرر، إضافة RequestValidator + RateLimiter + AuditLog
// تاريخ التعديل: 2026-08-27
// ═══════════════════════════════════════════════════════════════════════

// ─── PERMISSIONS ───
if (typeof PERMISSIONS === "undefined" || !PERMISSIONS) var PERMISSIONS = {};
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

// ─── AUTH HELPERS ───
function _requireAuth(permission) {
  var member = getCurrentMember();
  if (!member) {
    var email = "";
    try { email = Session.getActiveUser().getEmail(); } catch(e) {}
    throw new Error("المستخدم غير مسجّل في النظام. البريد: " + email);
  }
  var role = String(member[MEMBER_COL.ROLE] || "").trim().toLowerCase();
  if (role === "admin" || role === "ceo") return member;
  var hasPerm = hasPermission(member, permission);
  if (!hasPerm) {
    try { logActivity(member, "Access Denied", "UI_Server", permission, "", "Unauthorized attempt"); } catch(e) {}
    throw new Error("Access denied: " + permission);
  }
  return member;
}

// ─── INPUT SANITIZATION HELPER ───
function _sanitizeInput(value) {
  if (value === null || value === undefined) return "";
  var str = String(value).trim();
  var dangerous = ["=", "+", "-", "@", "\t", "\r"];
  if (str.length > 0 && dangerous.indexOf(str[0]) !== -1) {
    str = "'" + str;
  }
  if (str.length > 5000) str = str.substring(0, 5000);
  return str;
}

function _sanitizeId(value) {
  if (!value) return null;
  var id = String(value).trim();
  if (!/^[a-zA-Z0-9-_]+$/.test(id)) return null;
  return id;
}

function _sanitizeEmail(value) {
  if (!value) return null;
  var email = String(value).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

// ─── RATE LIMIT HELPER ───
function _checkRateLimit(action) {
  try {
    if (typeof RateLimiter !== "undefined" && RateLimiter.check) {
      RateLimiter.check(action || "ui_api", { maxRequests: 200, windowSeconds: 3600 });
    }
  } catch (e) {
    throw new Error("RATE_LIMIT_EXCEEDED: " + e.message);
  }
}

// ─── AUDIT LOG HELPER ───
function _auditLog(action, target, details, status) {
  try {
    if (typeof AuditLog !== "undefined" && AuditLog.log) {
      AuditLog.log(action, target, details, status || "SUCCESS");
    }
  } catch (e) {
    console.log("[AuditLog ERROR] " + e.message);
  }
}

// ============================================================
// USER AUTH API
// ============================================================

function uiGetCurrentUser() {
  try {
    _checkRateLimit("uiGetCurrentUser");
    var email = "";
    try { email = Session.getActiveUser().getEmail(); } catch(e) {}
    var member = getCurrentMember();

    if (!member) {
      return {
        success: false,
        error: String(email) + " - غير مسجل. تحقق: (1) الإيميل في Members (2) Status=Active (3) لا تكرار."
      };
    }

    // ── SAFE EXTRACTION: String() wrapper prevents Date/undefined serialization failure ──
    var safeEmail = String(member[MEMBER_COL.EMAIL] || "").trim();
    var safeName = String(member[MEMBER_COL.FULL_NAME] || "").trim();
    var safeRole = String(member[MEMBER_COL.ROLE] || "").trim();

    var safePermissions = [];
    try {
      var perms = getRolePermissions(safeRole);
      if (Array.isArray(perms)) {
        safePermissions = perms.filter(function(p) { return typeof p === "string"; });
      }
    } catch (permErr) {
      console.log("[AUTH] getRolePermissions failed: " + permErr.message);
    }

    return {
      success: true,
      data: {
        email: safeEmail,
        name: safeName,
        role: safeRole,
        permissions: safePermissions
      }
    };
  } catch (e) {
    return { success: false, error: String(e.message || "Unknown error") };
  }
}
// ============================================================
// KPI APIs
// ============================================================

function uiGetDashboardKpis() {
  try {
    _checkRateLimit("uiGetDashboardKpis");
    _requireAuth(PERMISSIONS.KPI_READ);
    var dashboard = KpiService.getDashboardKpis();
    // ── Contract normalization: ensure client-expected field names ──
    if (dashboard && typeof dashboard === 'object') {
      if (dashboard.totalRevenue !== undefined && dashboard.revenue === undefined) dashboard.revenue = dashboard.totalRevenue;
      if (dashboard.totalExpenses !== undefined && dashboard.expenses === undefined) dashboard.expenses = dashboard.totalExpenses;
      if (dashboard.netProfit !== undefined && dashboard.profit === undefined) dashboard.profit = dashboard.netProfit;
      if (dashboard.totalCustomers !== undefined && dashboard.customers === undefined) dashboard.customers = dashboard.totalCustomers;
      if (dashboard.totalItems !== undefined && dashboard.inventory === undefined) dashboard.inventory = dashboard.totalItems;
    }
    return { success: true, data: dashboard };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetKpiHistory(kpiId, limit) {
  try {
    _checkRateLimit("uiGetKpiHistory");
    _requireAuth(PERMISSIONS.KPI_READ);
    var history = KpiService.getKpiHistory(kpiId, limit || 12);
    return { success: true, data: history };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCalculateCategory(category, periodType, refDate) {
  try {
    _checkRateLimit("uiCalculateCategory");
    _requireAuth(PERMISSIONS.KPI_READ);
    var results = KpiService.calculateCategory(category, periodType, refDate);
    return { success: true, data: results };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCalculateAll(periodType, refDate) {
  try {
    _checkRateLimit("uiCalculateAll");
    _requireAuth(PERMISSIONS.KPI_READ);
    var results = KpiService.calculateAll(periodType, refDate);
    return { success: true, data: results };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// CUSTOMER APIs
// ============================================================

function uiGetCustomers(options) {
  try {
    _checkRateLimit("uiGetCustomers");
    _requireAuth(PERMISSIONS.MEMBERS_READ);
    var result = CustomerService.getCustomers(options || { limit: 1000 });
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetCustomer(id) {
  try {
    _checkRateLimit("uiGetCustomer");
    _requireAuth(PERMISSIONS.MEMBERS_READ);
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid customer ID");
    var customer = CustomerService.getCustomer(safeId);
    return { success: true, data: customer };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetCustomerStats() {
  try {
    _checkRateLimit("uiGetCustomerStats");
    _requireAuth(PERMISSIONS.MEMBERS_READ);
    var stats = CustomerService.getCustomerStats();
    return { success: true, data: stats };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateCustomer(data) {
  try {
    _checkRateLimit("uiCreateCustomer");
    _requireAuth(PERMISSIONS.MEMBERS_WRITE);
    if (data && data.name) data.name = _sanitizeInput(data.name);
    if (data && data.email) data.email = _sanitizeEmail(data.email);
    if (data && data.phone) data.phone = _sanitizeInput(data.phone);
    if (data && data.notes) data.notes = _sanitizeInput(data.notes);
    var id = CustomerService.createCustomer(data);
    _auditLog("CUSTOMER_CREATE", id, { name: data && data.name }, "SUCCESS");
    return { success: true, id: id };
  } catch (e) {
    _auditLog("CUSTOMER_CREATE", "", { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiUpdateCustomer(id, data) {
  try {
    _checkRateLimit("uiUpdateCustomer");
    _requireAuth(PERMISSIONS.MEMBERS_WRITE);
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid customer ID");
    if (data && data.name) data.name = _sanitizeInput(data.name);
    if (data && data.email) data.email = _sanitizeEmail(data.email);
    if (data && data.phone) data.phone = _sanitizeInput(data.phone);
    if (data && data.notes) data.notes = _sanitizeInput(data.notes);
    var updated = CustomerService.updateCustomer(safeId, data);
    _auditLog("CUSTOMER_UPDATE", safeId, { name: data && data.name }, "SUCCESS");
    return { success: true, data: updated };
  } catch (e) {
    _auditLog("CUSTOMER_UPDATE", id, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiDeleteCustomer(id) {
  try {
    _checkRateLimit("uiDeleteCustomer");
    _requireAuth(PERMISSIONS.MEMBERS_DELETE);
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid customer ID");
    CustomerService.deleteCustomer(safeId);
    _auditLog("CUSTOMER_DELETE", safeId, {}, "SUCCESS");
    return { success: true };
  } catch (e) {
    _auditLog("CUSTOMER_DELETE", id, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiSyncCustomers() {
  try {
    _checkRateLimit("uiSyncCustomers");
    _requireAuth(PERMISSIONS.MEMBERS_WRITE);
    var result = CustomerService.syncFromOrders();
    _auditLog("CUSTOMER_SYNC", "", { count: result && result.length }, "SUCCESS");
    return { success: true, data: result };
  } catch (e) {
    _auditLog("CUSTOMER_SYNC", "", { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

// ============================================================
// SATISFACTION APIs
// ============================================================

function uiGetSatisfactionRecords(options) {
  try {
    _checkRateLimit("uiGetSatisfactionRecords");
    _requireAuth(PERMISSIONS.REPORTS_READ);
    var result = SatisfactionService.getRecords(options || { limit: 1000 });
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetSatisfactionStats(startDate, endDate) {
  try {
    _checkRateLimit("uiGetSatisfactionStats");
    _requireAuth(PERMISSIONS.REPORTS_READ);
    var avg = SatisfactionService.getAverageScore(startDate, endDate);
    var count = SatisfactionService.getCount(startDate, endDate);
    var records = SatisfactionService.getByDateRange(startDate, endDate);
    return { success: true, data: { average: avg, count: count, records: records } };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateSatisfaction(data) {
  try {
    _checkRateLimit("uiCreateSatisfaction");
    _requireAuth(PERMISSIONS.REPORTS_WRITE);
    if (data && data.notes) data.notes = _sanitizeInput(data.notes);
    var id = SatisfactionService.createSatisfaction(data);
    _auditLog("SATISFACTION_CREATE", id, {}, "SUCCESS");
    return { success: true, id: id };
  } catch (e) {
    _auditLog("SATISFACTION_CREATE", "", { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

// ============================================================
// NPS APIs
// ============================================================

function uiGetNPSRecords(options) {
  try {
    _checkRateLimit("uiGetNPSRecords");
    _requireAuth(PERMISSIONS.REPORTS_READ);
    var result = NPSService.getRecords(options || { limit: 1000 });
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetNPSStats(startDate, endDate) {
  try {
    _checkRateLimit("uiGetNPSStats");
    _requireAuth(PERMISSIONS.REPORTS_READ);
    var nps = NPSService.getNPS(startDate, endDate);
    var breakdown = NPSService.getBreakdown(startDate, endDate);
    var count = NPSService.getCount(startDate, endDate);
    return { success: true, data: { nps: nps, breakdown: breakdown, count: count } };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateNPS(data) {
  try {
    _checkRateLimit("uiCreateNPS");
    _requireAuth(PERMISSIONS.REPORTS_WRITE);
    if (data && data.feedback) data.feedback = _sanitizeInput(data.feedback);
    var id = NPSService.createNPS(data);
    _auditLog("NPS_CREATE", id, {}, "SUCCESS");
    return { success: true, id: id };
  } catch (e) {
    _auditLog("NPS_CREATE", "", { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

// ============================================================
// TASK APIs
// ============================================================

function uiGetTasks(options) {
  try {
    _checkRateLimit("uiGetTasks");
    _requireAuth(PERMISSIONS.TASKS_READ);
    var result = TaskService.getTasks(options || { limit: 1000 });
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetTasksByDateRange(startDate, endDate) {
  try {
    _checkRateLimit("uiGetTasksByDateRange");
    _requireAuth(PERMISSIONS.TASKS_READ);
    var result = TaskService.getTasksByDateRange(startDate, endDate);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetTaskStats(startDate, endDate) {
  try {
    _checkRateLimit("uiGetTaskStats");
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
    _checkRateLimit("uiCreateTask");
    _requireAuth(PERMISSIONS.TASKS_WRITE);
    if (data && data.title) data.title = _sanitizeInput(data.title);
    if (data && data.description) data.description = _sanitizeInput(data.description);
    var id = TaskService.createTask(data);
    _auditLog("TASK_CREATE", id, { title: data && data.title }, "SUCCESS");
    return { success: true, id: id };
  } catch (e) {
    _auditLog("TASK_CREATE", "", { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiUpdateTask(id, data) {
  try {
    _checkRateLimit("uiUpdateTask");
    _requireAuth(PERMISSIONS.TASKS_WRITE);
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid task ID");
    if (data && data.title) data.title = _sanitizeInput(data.title);
    if (data && data.description) data.description = _sanitizeInput(data.description);
    var updated = TaskService.updateTask(safeId, data);
    _auditLog("TASK_UPDATE", safeId, { title: data && data.title }, "SUCCESS");
    return { success: true, data: updated };
  } catch (e) {
    _auditLog("TASK_UPDATE", id, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiDeleteTask(id) {
  try {
    _checkRateLimit("uiDeleteTask");
    _requireAuth(PERMISSIONS.TASKS_DELETE);
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid task ID");
    TaskService.deleteTask(safeId);
    _auditLog("TASK_DELETE", safeId, {}, "SUCCESS");
    return { success: true };
  } catch (e) {
    _auditLog("TASK_DELETE", id, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiApproveTask(id) {
  try {
    _checkRateLimit("uiApproveTask");
    _requireAuth(PERMISSIONS.TASKS_APPROVE);
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid task ID");
    var result = TaskService.approveTask(safeId);
    _auditLog("TASK_APPROVE", safeId, {}, "SUCCESS");
    return { success: true, data: result };
  } catch (e) {
    _auditLog("TASK_APPROVE", id, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiRejectTask(id, reason) {
  try {
    _checkRateLimit("uiRejectTask");
    _requireAuth(PERMISSIONS.TASKS_APPROVE);
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid task ID");
    var safeReason = _sanitizeInput(reason);
    var result = TaskService.rejectTask(safeId, safeReason);
    _auditLog("TASK_REJECT", safeId, { reason: safeReason }, "SUCCESS");
    return { success: true, data: result };
  } catch (e) {
    _auditLog("TASK_REJECT", id, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

// ============================================================
// MEMBER APIs
// ============================================================

function uiGetMembers() {
  try {
    _checkRateLimit("uiGetMembers");
    _requireAuth(PERMISSIONS.MEMBERS_READ);
    var members = Members.getMembers();
    // ── Serialization safety: sanitize Date/Error objects in member rows ──
    if (Array.isArray(members)) {
      for (var i = 0; i < members.length; i++) {
        if (Array.isArray(members[i])) {
          for (var j = 0; j < members[i].length; j++) {
            var val = members[i][j];
            if (val instanceof Date) {
              try { members[i][j] = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
              catch(e) { members[i][j] = String(val); }
            } else if (val instanceof Error) {
              members[i][j] = '';
            }
          }
        } else if (members[i] && typeof members[i] === 'object') {
          for (var key in members[i]) {
            var v = members[i][key];
            if (v instanceof Date) {
              try { members[i][key] = Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
              catch(e2) { members[i][key] = String(v); }
            } else if (v instanceof Error) {
              members[i][key] = '';
            }
          }
        }
      }
    }
    return { success: true, data: members };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetMemberStats() {
  try {
    _checkRateLimit("uiGetMemberStats");
    _requireAuth(PERMISSIONS.MEMBERS_READ);
    var total = Members.totalMembers();
    var active = Members.activeMembers();
    return { success: true, data: { total: total, active: active.length } };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiAddMember(data) {
  try {
    _checkRateLimit("uiAddMember");
    _requireAuth(PERMISSIONS.MEMBERS_WRITE);
    if (data && data.fullName) data.fullName = _sanitizeInput(data.fullName);
    if (data && data.email) data.email = _sanitizeEmail(data.email);
    if (data && data.phone) data.phone = _sanitizeInput(data.phone);
    var limitErr = _checkAdminCEOLimit(data.role, null);
    if (limitErr) throw new Error(limitErr);
    var id = Members.addMember(data);
    _auditLog("MEMBER_ADD", id, { email: data && data.email, role: data && data.role }, "SUCCESS");
    return { success: true, id: id };
  } catch (e) {
    _auditLog("MEMBER_ADD", "", { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiUpdateMember(id, data) {
  try {
    _checkRateLimit("uiUpdateMember");
    _requireAuth(PERMISSIONS.MEMBERS_WRITE);
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid member ID");
    if (data && data.fullName) data.fullName = _sanitizeInput(data.fullName);
    if (data && data.email) data.email = _sanitizeEmail(data.email);
    if (data && data.phone) data.phone = _sanitizeInput(data.phone);
    var limitErr = _checkAdminCEOLimit(data.role, safeId);
    if (limitErr) throw new Error(limitErr);
    Members.updateMember(safeId, data);
    _auditLog("MEMBER_UPDATE", safeId, { role: data && data.role }, "SUCCESS");
    return { success: true };
  } catch (e) {
    _auditLog("MEMBER_UPDATE", id, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiDeleteMember(id) {
  try {
    _checkRateLimit("uiDeleteMember");
    _requireAuth(PERMISSIONS.MEMBERS_DELETE);
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid member ID");
    Members.deleteMember(safeId);
    _auditLog("MEMBER_DELETE", safeId, {}, "SUCCESS");
    return { success: true };
  } catch (e) {
    _auditLog("MEMBER_DELETE", id, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

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
    _checkRateLimit("uiGetSales");
    _requireAuth(PERMISSIONS.ORDERS_READ);
    var result = SaleService.getSales(options || { limit: 1000 });
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetSalesByDateRange(startDate, endDate) {
  try {
    _checkRateLimit("uiGetSalesByDateRange");
    _requireAuth(PERMISSIONS.ORDERS_READ);
    var result = SaleService.getSalesByDateRange(startDate, endDate);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateSale(data) {
  try {
    _checkRateLimit("uiCreateSale");
    _requireAuth(PERMISSIONS.ORDERS_WRITE);
    if (data && data.notes) data.notes = _sanitizeInput(data.notes);
    var id = SaleService.createSale(data);
    _auditLog("SALE_CREATE", id, {}, "SUCCESS");
    return { success: true, id: id };
  } catch (e) {
    _auditLog("SALE_CREATE", "", { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

// ============================================================
// ORDER APIs
// ============================================================

function uiGetOrders(options) {
  try {
    _checkRateLimit("uiGetOrders");
    _requireAuth(PERMISSIONS.ORDERS_READ);
    var result = OrderService.getOrders(options || { limit: 1000 });
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetOrdersByDateRange(startDate, endDate) {
  try {
    _checkRateLimit("uiGetOrdersByDateRange");
    _requireAuth(PERMISSIONS.ORDERS_READ);
    var result = OrderService.getOrdersByDateRange(startDate, endDate);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateOrder(data) {
  try {
    _checkRateLimit("uiCreateOrder");
    _requireAuth(PERMISSIONS.ORDERS_WRITE);
    if (data && data.notes) data.notes = _sanitizeInput(data.notes);
    var id = OrderService.createOrder(data);
    _auditLog("ORDER_CREATE", id, {}, "SUCCESS");
    return { success: true, id: id };
  } catch (e) {
    _auditLog("ORDER_CREATE", "", { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiUpdateOrderStatus(id, status) {
  try {
    _checkRateLimit("uiUpdateOrderStatus");
    _requireAuth(PERMISSIONS.ORDERS_WRITE);
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid order ID");
    var safeStatus = _sanitizeInput(status);
    var result;
    if (safeStatus === "Confirmed") result = OrderService.confirmOrder(safeId);
    else if (safeStatus === "Shipped") result = OrderService.shipOrder(safeId);
    else if (safeStatus === "Delivered") result = OrderService.deliverOrder(safeId);
    else if (safeStatus === "Cancelled") result = OrderService.cancelOrder(safeId);
    else throw new Error("Invalid status: " + safeStatus);
    _auditLog("ORDER_STATUS_UPDATE", safeId, { status: safeStatus }, "SUCCESS");
    return { success: true, data: result };
  } catch (e) {
    _auditLog("ORDER_STATUS_UPDATE", id, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

// ============================================================
// FINANCE APIs
// ============================================================

function uiGetFinanceStats(startDate, endDate) {
  try {
    _checkRateLimit("uiGetFinanceStats");
    _requireAuth(PERMISSIONS.FINANCE_READ);
    var pnl = FinanceService.getProfitAndLoss(startDate, endDate);
    var cashFlow = FinanceService.getCashFlow(startDate, endDate);
    var cashBalance = FinanceService.getCashBalance("Cash", endDate);
    return { success: true, data: { pnl: pnl, cashFlow: cashFlow, cashBalance: cashBalance } };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetLedger(options) {
  try {
    _checkRateLimit("uiGetLedger");
    _requireAuth(PERMISSIONS.FINANCE_READ);
    var result = FinanceService.getLedger(options || { limit: 1000 });
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// INVENTORY APIs
// ============================================================

function uiGetInventory(options) {
  try {
    _checkRateLimit("uiGetInventory");
    _requireAuth(PERMISSIONS.INVENTORY_READ);
    var result = InventoryService.getItems(options || { limit: 1000 });
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetInventoryStats() {
  try {
    _checkRateLimit("uiGetInventoryStats");
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
    _checkRateLimit("uiCreateInventoryItem");
    _requireAuth(PERMISSIONS.INVENTORY_WRITE);
    if (data && data.name) data.name = _sanitizeInput(data.name);
    if (data && data.sku) data.sku = _sanitizeInput(data.sku);
    if (data && data.description) data.description = _sanitizeInput(data.description);
    var id = InventoryService.createItem(data);
    _auditLog("INVENTORY_CREATE", id, { sku: data && data.sku }, "SUCCESS");
    return { success: true, id: id };
  } catch (e) {
    _auditLog("INVENTORY_CREATE", "", { error: e.message }, "FAILED");
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
    _checkRateLimit("uiGetStockMovements");
    _requireAuth(PERMISSIONS.INVENTORY_READ);
    if (!sku) throw new Error("SKU required");
    var safeSku = _sanitizeInput(sku);
    var movements = StockMovementService.getMovementsBySku(safeSku);
    return { success: true, data: movements };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiAdjustStock(data) {
  try {
    _checkRateLimit("uiAdjustStock");
    _requireAuth(PERMISSIONS.INVENTORY_WRITE);
    if (!data || !data.inventoryId || data.newQuantity === undefined || !data.reason) {
      throw new Error("inventoryId, newQuantity, and reason required");
    }
    var safeReason = _sanitizeInput(data.reason);
    var safeNotes = data.notes ? _sanitizeInput(data.notes) : "";
    var result = InventoryService.adjustStock(
      data.inventoryId,
      data.newQuantity,
      safeReason,
      safeNotes
    );
    _auditLog("STOCK_ADJUST", data.inventoryId, { qty: data.newQuantity, reason: safeReason }, "SUCCESS");
    return { success: true, data: result };
  } catch (e) {
    _auditLog("STOCK_ADJUST", data && data.inventoryId, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiRestockStock(data) {
  try {
    _checkRateLimit("uiRestockStock");
    _requireAuth(PERMISSIONS.INVENTORY_WRITE);
    if (!data || !data.sku || !data.qty) throw new Error("SKU and quantity required");
    var safeSku = _sanitizeInput(data.sku);
    var refId = data.referenceId ? _sanitizeInput(data.referenceId) : "";
    InventoryService.restock(safeSku, data.qty, "UI_RESTOCK", refId);
    _auditLog("STOCK_RESTOCK", safeSku, { qty: data.qty }, "SUCCESS");
    return { success: true };
  } catch (e) {
    _auditLog("STOCK_RESTOCK", data && data.sku, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

// ============================================================
// BOM APIs
// ============================================================

function uiGetBOM(sku) {
  try {
    _checkRateLimit("uiGetBOM");
    _requireAuth(PERMISSIONS.INVENTORY_BOM_READ);
    if (!sku) throw new Error("SKU required");
    var safeSku = _sanitizeInput(sku);
    var bom = BOMService.getBOMByFinishedProductSku(safeSku);
    return { success: true, data: bom };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetBOMItems(bomId) {
  try {
    _checkRateLimit("uiGetBOMItems");
    _requireAuth(PERMISSIONS.INVENTORY_BOM_READ);
    if (!bomId) throw new Error("bomId required");
    var safeId = _sanitizeId(bomId);
    if (!safeId) throw new Error("Invalid bomId");
    var items = BOMService.getBOMItems(safeId);
    return { success: true, data: items };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateBOM(data) {
  try {
    _checkRateLimit("uiCreateBOM");
    _requireAuth(PERMISSIONS.INVENTORY_BOM_MANAGE);
    if (!data) throw new Error("BOM data required");
    if (data.name) data.name = _sanitizeInput(data.name);
    if (data.sku) data.sku = _sanitizeInput(data.sku);
    var id = BOMService.createBOM(data);
    _auditLog("BOM_CREATE", id, { name: data.name }, "SUCCESS");
    return { success: true, id: id };
  } catch (e) {
    _auditLog("BOM_CREATE", "", { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiUpdateBOM(id, data) {
  try {
    _checkRateLimit("uiUpdateBOM");
    _requireAuth(PERMISSIONS.INVENTORY_BOM_MANAGE);
    if (!id) throw new Error("BOM ID required");
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid BOM ID");
    if (data && data.name) data.name = _sanitizeInput(data.name);
    var updated = BOMService.updateBOM(safeId, data);
    _auditLog("BOM_UPDATE", safeId, {}, "SUCCESS");
    return { success: true, data: updated };
  } catch (e) {
    _auditLog("BOM_UPDATE", id, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiDeleteBOM(id) {
  try {
    _checkRateLimit("uiDeleteBOM");
    _requireAuth(PERMISSIONS.INVENTORY_BOM_MANAGE);
    if (!id) throw new Error("BOM ID required");
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid BOM ID");
    BOMService.deleteBOM(safeId);
    _auditLog("BOM_DELETE", safeId, {}, "SUCCESS");
    return { success: true };
  } catch (e) {
    _auditLog("BOM_DELETE", id, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiAddBOMItem(bomId, data) {
  try {
    _checkRateLimit("uiAddBOMItem");
    _requireAuth(PERMISSIONS.INVENTORY_BOM_MANAGE);
    if (!bomId) throw new Error("bomId required");
    var safeId = _sanitizeId(bomId);
    if (!safeId) throw new Error("Invalid bomId");
    var id = BOMService.addBOMItem(safeId, data);
    _auditLog("BOM_ITEM_ADD", safeId, {}, "SUCCESS");
    return { success: true, id: id };
  } catch (e) {
    _auditLog("BOM_ITEM_ADD", bomId, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiUpdateBOMItem(id, data) {
  try {
    _checkRateLimit("uiUpdateBOMItem");
    _requireAuth(PERMISSIONS.INVENTORY_BOM_MANAGE);
    if (!id) throw new Error("BOM Item ID required");
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid BOM Item ID");
    var updated = BOMService.updateBOMItem(safeId, data);
    _auditLog("BOM_ITEM_UPDATE", safeId, {}, "SUCCESS");
    return { success: true, data: updated };
  } catch (e) {
    _auditLog("BOM_ITEM_UPDATE", id, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiRemoveBOMItem(id) {
  try {
    _checkRateLimit("uiRemoveBOMItem");
    _requireAuth(PERMISSIONS.INVENTORY_BOM_MANAGE);
    if (!id) throw new Error("BOM Item ID required");
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid BOM Item ID");
    BOMService.removeBOMItem(safeId);
    _auditLog("BOM_ITEM_REMOVE", safeId, {}, "SUCCESS");
    return { success: true };
  } catch (e) {
    _auditLog("BOM_ITEM_REMOVE", id, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiCalculateCost(productId) {
  try {
    _checkRateLimit("uiCalculateCost");
    _requireAuth(PERMISSIONS.INVENTORY_BOM_READ);
    if (!productId) throw new Error("productId required");
    var safeId = _sanitizeId(productId);
    if (!safeId) throw new Error("Invalid productId");
    var result = BOMService.calculateUnitCost(safeId);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCalculateMargin(productId) {
  try {
    _checkRateLimit("uiCalculateMargin");
    _requireAuth(PERMISSIONS.INVENTORY_BOM_READ);
    if (!productId) throw new Error("productId required");
    var safeId = _sanitizeId(productId);
    if (!safeId) throw new Error("Invalid productId");
    var result = BOMService.calculateGrossMargin(safeId);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetLowStock() {
  try {
    _checkRateLimit("uiGetLowStock");
    _requireAuth(PERMISSIONS.INVENTORY_READ);
    var result = InventoryService.getLowStockItems();
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetOutOfStock() {
  try {
    _checkRateLimit("uiGetOutOfStock");
    _requireAuth(PERMISSIONS.INVENTORY_READ);
    var result = InventoryService.getOutOfStockItems();
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// EXPENSE APIs
// ============================================================

function uiGetExpenses(options) {
  try {
    _checkRateLimit("uiGetExpenses");
    _requireAuth(PERMISSIONS.EXPENSES_READ);
    var result = FinanceRepository.findAllExpenses(options || { limit: 1000 });
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetExpense(id) {
  try {
    _checkRateLimit("uiGetExpense");
    _requireAuth(PERMISSIONS.EXPENSES_READ);
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid expense ID");
    var result = FinanceRepository.findExpenseById(safeId);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateExpense(data) {
  try {
    _checkRateLimit("uiCreateExpense");
    _requireAuth(PERMISSIONS.EXPENSES_WRITE);
    if (data && data.description) data.description = _sanitizeInput(data.description);
    if (data && data.notes) data.notes = _sanitizeInput(data.notes);
    var id = FinanceService.createExpenseRequest(data);
    _auditLog("EXPENSE_CREATE", id, {}, "SUCCESS");
    return { success: true, id: id };
  } catch (e) {
    _auditLog("EXPENSE_CREATE", "", { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiSubmitExpense(id) {
  try {
    _checkRateLimit("uiSubmitExpense");
    _requireAuth(PERMISSIONS.EXPENSES_WRITE);
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid expense ID");
    var result = FinanceService.submitExpenseRequest(safeId);
    _auditLog("EXPENSE_SUBMIT", safeId, {}, "SUCCESS");
    return { success: true, data: result };
  } catch (e) {
    _auditLog("EXPENSE_SUBMIT", id, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiApproveExpense(id) {
  try {
    _checkRateLimit("uiApproveExpense");
    _requireAuth(PERMISSIONS.EXPENSES_APPROVE);
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid expense ID");
    var result = FinanceService.approveExpenseRequest(safeId);
    _auditLog("EXPENSE_APPROVE", safeId, {}, "SUCCESS");
    return { success: true, data: result };
  } catch (e) {
    _auditLog("EXPENSE_APPROVE", id, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiRejectExpense(id, reason) {
  try {
    _checkRateLimit("uiRejectExpense");
    _requireAuth(PERMISSIONS.EXPENSES_APPROVE);
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid expense ID");
    var safeReason = _sanitizeInput(reason);
    var result = FinanceService.rejectExpenseRequest(safeId, safeReason);
    _auditLog("EXPENSE_REJECT", safeId, { reason: safeReason }, "SUCCESS");
    return { success: true, data: result };
  } catch (e) {
    _auditLog("EXPENSE_REJECT", id, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiPostExpense(id, account) {
  try {
    _checkRateLimit("uiPostExpense");
    _requireAuth(PERMISSIONS.EXPENSES_APPROVE);
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid expense ID");
    var safeAccount = _sanitizeInput(account);
    var result = FinanceService.postExpenseToLedger(safeId, safeAccount);
    _auditLog("EXPENSE_POST", safeId, { account: safeAccount }, "SUCCESS");
    return { success: true, data: result };
  } catch (e) {
    _auditLog("EXPENSE_POST", id, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiDeleteExpense(id) {
  try {
    _checkRateLimit("uiDeleteExpense");
    _requireAuth(PERMISSIONS.EXPENSES_DELETE);
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid expense ID");
    FinanceService.deleteExpenseRequest(safeId);
    _auditLog("EXPENSE_DELETE", safeId, {}, "SUCCESS");
    return { success: true };
  } catch (e) {
    _auditLog("EXPENSE_DELETE", id, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

// ============================================================
// MARKETING APIs
// ============================================================

function uiGetMarketingRecords(options) {
  try {
    _checkRateLimit("uiGetMarketingRecords");
    _requireAuth(PERMISSIONS.REPORTS_READ);
    var result = MktService.getRecords(options || { limit: 1000 });
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetMarketingStats(startDate, endDate) {
  try {
    _checkRateLimit("uiGetMarketingStats");
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
    _checkRateLimit("uiCreateMarketingRecord");
    _requireAuth(PERMISSIONS.REPORTS_WRITE);
    if (data && data.campaignName) data.campaignName = _sanitizeInput(data.campaignName);
    if (data && data.notes) data.notes = _sanitizeInput(data.notes);
    var id = MktService.createRecord(data);
    _auditLog("MARKETING_CREATE", id, {}, "SUCCESS");
    return { success: true, id: id };
  } catch (e) {
    _auditLog("MARKETING_CREATE", "", { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

// ============================================================
// SOCIAL MEDIA APIs
// ============================================================

function uiGetSocialRecords(options) {
  try {
    _checkRateLimit("uiGetSocialRecords");
    _requireAuth(PERMISSIONS.REPORTS_READ);
    var result = SocService.getRecords(options || { limit: 1000 });
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetSocialStats(startDate, endDate) {
  try {
    _checkRateLimit("uiGetSocialStats");
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
    _checkRateLimit("uiCreateSocialRecord");
    _requireAuth(PERMISSIONS.REPORTS_WRITE);
    if (data && data.caption) data.caption = _sanitizeInput(data.caption);
    if (data && data.notes) data.notes = _sanitizeInput(data.notes);
    var id = SocService.createRecord(data);
    _auditLog("SOCIAL_CREATE", id, {}, "SUCCESS");
    return { success: true, id: id };
  } catch (e) {
    _auditLog("SOCIAL_CREATE", "", { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

// ============================================================
// KPI EXTENDED API (NEW)
// ============================================================

function uiGetKPIs(params) {
  try {
    _checkRateLimit("uiGetKPIs");
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
    // ── Flat aliases for client contract compatibility ──
    result.revenue = revenue;
    result.expenses = operatingExpenses;
    result.profit = netProfit;
    result.orders = 0; // not provided by current services
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// LAUNCH UI — NO BUSINESS PERMISSIONS REQUIRED
// ============================================================

function showPhinoxDashboard() {
  var html = HtmlService.createHtmlOutputFromFile("UI_Index")
    .setTitle("PHINOX BOS Dashboard")
    .setWidth(1280)
    .setHeight(900);
  SpreadsheetApp.getUi().showModalDialog(html, "PHINOX BOS");
}

function showPhinoxDashboardSidebar() {
  var html = HtmlService.createHtmlOutputFromFile("UI_Index")
    .setTitle("PHINOX BOS")
    .setWidth(350);
  SpreadsheetApp.getUi().showSidebar(html);
}
function _handleDoGetInternal(e) {
  var page = e.parameter ? (e.parameter.page || "index") : "index";
  if (page === "index" || page === "dashboard") {
    return HtmlService.createHtmlOutputFromFile("UI_Index")
      .setTitle("PHINOX BOS")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  if (page === "login") {
    return HtmlService.createHtmlOutput("<h2>Login Page</h2>");
  }
  return HtmlService.createHtmlOutputFromFile("UI_Index")
    .setTitle("PHINOX BOS")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ============================================================
// DIAGNOSTIC API (temporary - remove after fixing)
// ============================================================

function uiDiagnose() {
  var result = { checks: [] };
  function check(name, pass, detail) {
    result.checks.push({ name: name, pass: !!pass, detail: detail || '' });
  }

  try {
    // 1. Session email
    var email = '';
    try { email = Session.getActiveUser().getEmail(); } catch(e) {}
    check('Session.getEmail', email.length > 0, email || 'empty');

    // 2. Spreadsheet
    var ss = null;
    try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch(e) {}
    check('ActiveSpreadsheet', ss !== null, ss ? ss.getName() : e.message);

    // 3. Members sheet
    if (ss) {
      var ms = ss.getSheetByName('Members');
      check('Members sheet exists', ms !== null, '');

      if (ms) {
        var lastRow = ms.getLastRow();
        var lastCol = ms.getLastColumn();
        check('Members data rows', lastRow > 1, 'rows=' + lastRow + ' (1=header)');
        check('Members columns', lastCol >= 12, 'cols=' + lastCol + ' (need 12)');

        // 4. Read headers
        var headers = ms.getRange(1, 1, 1, lastCol).getValues()[0];
        check('Members headers', headers.length > 0, headers.join(' | '));

        // 5. Find current user
        if (email && lastRow > 1) {
          var data = ms.getRange(2, 1, lastRow - 1, lastCol).getValues();
          var found = false;
          var matchInfo = [];
          for (var i = 0; i < data.length; i++) {
            var rowEmail = String(data[i][3] || '').trim().toLowerCase();
            var rowStatus = String(data[i][5] || '').trim();
            if (rowEmail === email.toLowerCase()) {
              found = true;
              matchInfo.push({ row: i+2, status: rowStatus, name: data[i][1], role: data[i][2] });
            }
          }
          check('Email match in Members', found, matchInfo.length > 0 ? JSON.stringify(matchInfo) : 'No match for: ' + email);

          if (found) {
            var isActive = matchInfo.some(function(m) { return m.status === 'Active'; });
            check('Status is Active', isActive, JSON.stringify(matchInfo));
          }
        }

        // 6. Check CONFIG
        check('CONFIG defined', typeof CONFIG !== 'undefined', CONFIG ? 'v' + CONFIG.APP.VERSION : 'missing');
        check('CONFIG.SHEETS.MEMBERS', CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.MEMBERS === 'Members', '');

        // 7. Check BaseRepository
        check('BaseRepository defined', typeof BaseRepository !== 'undefined', '');

        // 8. Check ErrorHandler
        check('ErrorHandler defined', typeof ErrorHandler !== 'undefined', '');

        // 9. Check Logger
        check('Logger defined', typeof Logger !== 'undefined', '');
        check('console.log exists', typeof Logger !== 'undefined' && typeof console.log === 'function', typeof Logger !== 'undefined' ? Object.keys(Logger).join(',') : 'N/A');

        // 10. Check RateLimiter
        check('RateLimiter defined', typeof RateLimiter !== 'undefined', '');

        // 11. Check Security
        check('Security defined', typeof Security !== 'undefined', '');
        if (typeof Security !== 'undefined' && typeof Security.getUserRole === 'function') {
          var role = 'ERROR';
          try { role = Security.getUserRole(); } catch(e) { role = 'ERROR: ' + e.message; }
          check('Security.getUserRole()', role !== 'GUEST' && role !== 'ERROR', 'role=' + role);
        }

        // 12. Check getCurrentMember
        if (typeof getCurrentMember === 'function') {
          var member = null;
          try { member = getCurrentMember(); } catch(e) {
            check('getCurrentMember()', false, e.message);
          }
          if (member) {
            check('getCurrentMember()', true, 'name=' + member[1] + ' role=' + member[2]);
          } else if (!result.checks.some(function(c) { return c.name === 'getCurrentMember()'; })) {
            check('getCurrentMember()', false, 'returned null');
          }
        }
      }
    }
  } catch (e) {
    check('DIAGNOSTIC ERROR', false, e.message);
  }

  return result;
}
