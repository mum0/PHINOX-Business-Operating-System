/**
 * PHINOX BOS — UI Server-Side API Wrappers
 * Phase: FINAL HTML / UI / UX DASHBOARD
 * These functions wrap existing backend services for frontend consumption.
 * DO NOT MODIFY BACKEND LOGIC.
 * ============================================================
 * PHASE 1 SECURITY FIXES (2026-08-14):
 * 1. Added _requireAuth(permission) centralized authorization helper
 * 2. All business functions now enforce RBAC before executing service calls
 * 3. DELETE endpoints protected first (highest risk)
 * 4. CREATE endpoints protected second
 * 5. UPDATE endpoints protected third
 * 6. READ endpoints protected fourth
 * 7. UI launch functions (doGet, showPhinoxDashboard) remain unprotected by design
 * 8. No function signatures, arguments, or return structures changed
 * ============================================================
 * PHASE 3D FIXES (2026-08-21):
 * 1. Merged duplicate Expense API blocks (Phase 2 + Phase 3D)
 * 2. Added uiGetCurrentUser for auth system
 * 3. Added _requireAuth to all Phase 3D Inventory/BOM endpoints
 * 4. Fixed uiRestockStock parameter mapping
 * 5. Removed conflicting function re-declarations
 */

// ============================================================
// AUTHORIZATION HELPER
// ============================================================

/**
 * Centralized authorization check for all UI business functions.
 *
 * @param {string} permission - The PERMISSIONS constant to check
 * @returns {Array} The authenticated member array (for audit/logging if needed)
 * @throws {Error} If no active member or insufficient permission
 */
function _requireAuth(permission) {
  var member = getCurrentMember();
  if (!member) {
    throw new Error("Authentication required. Please ensure you are registered as an active member in the system.");
  }
  if (!hasPermission(member, permission)) {
    try {
      logActivity(member, "Access Denied", "UI_Server", permission, "", "Unauthorized attempt");
    } catch (e) {}
    throw new Error("Access denied: " + permission);
  }
  return member;
}

// ============================================================
// USER AUTH API
// ============================================================

function uiGetCurrentUser() {
  try {
    var member = getCurrentMember();
    if (!member) {
      return { success: false, error: "Not authenticated" };
    }
    return {
      success: true,
      data: {
        email: member[MEMBER_COL.EMAIL],
        name: member[MEMBER_COL.FULL_NAME],
        role: member[MEMBER_COL.ROLE],
        permissions: getRolePermissions(member[MEMBER_COL.ROLE])
      }
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// KPI APIs
// ============================================================

function uiGetDashboardKpis() {
  try {
    _requireAuth(PERMISSIONS.KPI_READ);
    var dashboard = KpiService.getDashboardKpis();
    return { success: true, data: dashboard };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetKpiHistory(kpiId, limit) {
  try {
    _requireAuth(PERMISSIONS.KPI_READ);
    var history = KpiService.getKpiHistory(kpiId, limit || 12);
    return { success: true, data: history };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCalculateCategory(category, periodType, refDate) {
  try {
    _requireAuth(PERMISSIONS.KPI_READ);
    var results = KpiService.calculateCategory(category, periodType, refDate);
    return { success: true, data: results };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCalculateAll(periodType, refDate) {
  try {
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
    _requireAuth(PERMISSIONS.MEMBERS_READ);
    var result = CustomerService.getCustomers(options || { limit: 1000 });
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetCustomer(id) {
  try {
    _requireAuth(PERMISSIONS.MEMBERS_READ);
    var customer = CustomerService.getCustomer(id);
    return { success: true, data: customer };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetCustomerStats() {
  try {
    _requireAuth(PERMISSIONS.MEMBERS_READ);
    var stats = CustomerService.getCustomerStats();
    return { success: true, data: stats };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateCustomer(data) {
  try {
    _requireAuth(PERMISSIONS.MEMBERS_WRITE);
    var id = CustomerService.createCustomer(data);
    return { success: true, id: id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiUpdateCustomer(id, data) {
  try {
    _requireAuth(PERMISSIONS.MEMBERS_WRITE);
    var updated = CustomerService.updateCustomer(id, data);
    return { success: true, data: updated };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiDeleteCustomer(id) {
  try {
    _requireAuth(PERMISSIONS.MEMBERS_DELETE);
    CustomerService.deleteCustomer(id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiSyncCustomers() {
  try {
    _requireAuth(PERMISSIONS.MEMBERS_WRITE);
    var result = CustomerService.syncFromOrders();
    return { success: true, data: result };
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
    return { success: true, data: result };
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
    return { success: true, data: { average: avg, count: count, records: records } };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateSatisfaction(data) {
  try {
    _requireAuth(PERMISSIONS.REPORTS_WRITE);
    var id = SatisfactionService.createSatisfaction(data);
    return { success: true, id: id };
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
    return { success: true, data: result };
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
    return { success: true, data: { nps: nps, breakdown: breakdown, count: count } };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateNPS(data) {
  try {
    _requireAuth(PERMISSIONS.REPORTS_WRITE);
    var id = NPSService.createNPS(data);
    return { success: true, id: id };
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
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetTasksByDateRange(startDate, endDate) {
  try {
    _requireAuth(PERMISSIONS.TASKS_READ);
    var result = TaskService.getTasksByDateRange(startDate, endDate);
    return { success: true, data: result };
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
    return { success: true, id: id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiUpdateTask(id, data) {
  try {
    _requireAuth(PERMISSIONS.TASKS_WRITE);
    var updated = TaskService.updateTask(id, data);
    return { success: true, data: updated };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiDeleteTask(id) {
  try {
    _requireAuth(PERMISSIONS.TASKS_DELETE);
    TaskService.deleteTask(id);
    return { success: true };
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
    return { success: true, data: members };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetMemberStats() {
  try {
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
    _requireAuth(PERMISSIONS.MEMBERS_WRITE);
    var id = Members.addMember(data);
    return { success: true, id: id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiUpdateMember(id, data) {
  try {
    _requireAuth(PERMISSIONS.MEMBERS_WRITE);
    Members.updateMember(id, data);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiDeleteMember(id) {
  try {
    _requireAuth(PERMISSIONS.MEMBERS_DELETE);
    Members.deleteMember(id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// SALE APIs
// ============================================================

function uiGetSales(options) {
  try {
    _requireAuth(PERMISSIONS.ORDERS_READ);
    var result = SaleService.getSales(options || { limit: 1000 });
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetSalesByDateRange(startDate, endDate) {
  try {
    _requireAuth(PERMISSIONS.ORDERS_READ);
    var result = SaleService.getSalesByDateRange(startDate, endDate);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateSale(data) {
  try {
    _requireAuth(PERMISSIONS.ORDERS_WRITE);
    var id = SaleService.createSale(data);
    return { success: true, id: id };
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
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetOrdersByDateRange(startDate, endDate) {
  try {
    _requireAuth(PERMISSIONS.ORDERS_READ);
    var result = OrderService.getOrdersByDateRange(startDate, endDate);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateOrder(data) {
  try {
    _requireAuth(PERMISSIONS.ORDERS_WRITE);
    var id = OrderService.createOrder(data);
    return { success: true, id: id };
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
    return { success: true, data: result };
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
    return { success: true, data: { pnl: pnl, cashFlow: cashFlow, cashBalance: cashBalance } };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetLedger(options) {
  try {
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
    _requireAuth(PERMISSIONS.INVENTORY_READ);
    var result = InventoryService.getItems(options || { limit: 1000 });
    return { success: true, data: result };
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
    return { success: true, id: id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function openAddInventoryModal() {
  openModal("Add Inventory Item",
    "<p><label>SKU *</label><input type=\"text\" id=\"addInvSku\" /></p>" +
    "<p><label>Name *</label><input type=\"text\" id=\"addInvName\" /></p>" +
    "<p><label>Category</label><input type=\"text\" id=\"addInvCategory\" /></p>" +
    "<p><label>Quantity *</label><input type=\"number\" id=\"addInvQty\" /></p>" +
    "<p><label>Cost</label><input type=\"number\" id=\"addInvCost\" /></p>" +
    "<p><label>Price</label><input type=\"number\" id=\"addInvPrice\" /></p>",
    "" +
    "<button onclick=\"submitAddInventory()\">Add</button>" +
    "<button onclick=\"closeModal()\">Cancel</button>"
  );
}

function submitAddInventory() {
  var data = {
    sku: document.getElementById("addInvSku").value.trim(),
    name: document.getElementById("addInvName").value.trim(),
    category: document.getElementById("addInvCategory").value.trim(),
    quantity: parseInt(document.getElementById("addInvQty").value) || 0,
    cost: parseFloat(document.getElementById("addInvCost").value) || 0,
    price: parseFloat(document.getElementById("addInvPrice").value) || 0
  };
  if (!data.sku || !data.name) { showToast("Error", "SKU and Name are required", "error"); return; }
  callServer("uiCreateInventoryItem", data)
    .then(function() { showToast("Success", "Item created", "success"); closeModal(); loadInventory(); })
    .catch(function(err) { showToast("Error", err.message, "error"); });
}

// ============================================================
// INVENTORY APIs — PHASE 3D EXTENSIONS (FIXED: added _requireAuth)
// ============================================================

function uiGetStockMovements(sku, options) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_READ);
    if (!sku) throw new Error("SKU required");
    var movements = StockMovementService.getMovementsBySku(sku);
    return { success: true, data: movements };
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
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiRestockStock(data) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_WRITE);
    if (!data || !data.sku || !data.qty) throw new Error("SKU and quantity required");
    InventoryService.restock(data.sku, data.qty, "UI_RESTOCK", data.referenceId || "");
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetBOM(sku) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_BOM_READ);
    if (!sku) throw new Error("SKU required");
    var bom = BOMService.getBOMByFinishedProductSku(sku);
    return { success: true, data: bom };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetBOMItems(bomId) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_BOM_READ);
    if (!bomId) throw new Error("bomId required");
    var items = BOMService.getBOMItems(bomId);
    return { success: true, data: items };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateBOM(data) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_BOM_MANAGE);
    if (!data) throw new Error("BOM data required");
    var id = BOMService.createBOM(data);
    return { success: true, id: id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiUpdateBOM(id, data) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_BOM_MANAGE);
    if (!id) throw new Error("BOM ID required");
    var updated = BOMService.updateBOM(id, data);
    return { success: true, data: updated };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiDeleteBOM(id) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_BOM_MANAGE);
    if (!id) throw new Error("BOM ID required");
    BOMService.deleteBOM(id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiAddBOMItem(bomId, data) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_BOM_MANAGE);
    if (!bomId) throw new Error("bomId required");
    var id = BOMService.addBOMItem(bomId, data);
    return { success: true, id: id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiUpdateBOMItem(id, data) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_BOM_MANAGE);
    if (!id) throw new Error("BOM Item ID required");
    var updated = BOMService.updateBOMItem(id, data);
    return { success: true, data: updated };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiRemoveBOMItem(id) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_BOM_MANAGE);
    if (!id) throw new Error("BOM Item ID required");
    BOMService.removeBOMItem(id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCalculateCost(productId) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_BOM_READ);
    if (!productId) throw new Error("productId required");
    var result = BOMService.calculateUnitCost(productId);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCalculateMargin(productId) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_BOM_READ);
    if (!productId) throw new Error("productId required");
    var result = BOMService.calculateGrossMargin(productId);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetLowStock() {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_READ);
    var result = InventoryService.getLowStockItems();
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetOutOfStock() {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_READ);
    var result = InventoryService.getOutOfStockItems();
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// EXPENSE APIs — MERGED (Phase 2 + Phase 3D unified)
// ============================================================

function uiGetExpenses(options) {
  try {
    _requireAuth(PERMISSIONS.EXPENSES_READ);
    var result = FinanceRepository.findAllExpenses(options || { limit: 1000 });
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetExpense(id) {
  try {
    _requireAuth(PERMISSIONS.EXPENSES_READ);
    var result = FinanceRepository.findExpenseById(id);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateExpense(data) {
  try {
    _requireAuth(PERMISSIONS.EXPENSES_WRITE);
    var id = FinanceService.createExpenseRequest(data);
    return { success: true, id: id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiSubmitExpense(id) {
  try {
    _requireAuth(PERMISSIONS.EXPENSES_WRITE);
    var result = FinanceService.submitExpenseRequest(id);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiApproveExpense(id) {
  try {
    _requireAuth(PERMISSIONS.EXPENSES_APPROVE);
    var result = FinanceService.approveExpenseRequest(id);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiRejectExpense(id, reason) {
  try {
    _requireAuth(PERMISSIONS.EXPENSES_APPROVE);
    var result = FinanceService.rejectExpenseRequest(id, reason);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiPostExpense(id, account) {
  try {
    _requireAuth(PERMISSIONS.EXPENSES_APPROVE);
    var result = FinanceService.postExpenseToLedger(id, account);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiDeleteExpense(id) {
  try {
    _requireAuth(PERMISSIONS.EXPENSES_DELETE);
    FinanceService.deleteExpenseRequest(id);
    return { success: true };
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
    return { success: true, data: result };
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
    return { success: true, id: id };
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
    return { success: true, data: result };
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
    return { success: true, id: id };
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

// ============================================================
// WEB APP ENTRY POINT — NO BUSINESS PERMISSIONS REQUIRED
// Authorization enforced at data layer.
// ============================================================

function doGet(e) {
  try {
    var html = HtmlService.createHtmlOutputFromFile("UI_Index")
      .setTitle("PHINOX BOS v5")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    return html;
  } catch (err) {
    return HtmlService.createHtmlOutput(
      "<div style=\"padding:40px;font-family:sans-serif;text-align:center;\">" +
      "<h2>Failed to load UI_Index.html</h2>" +
      "<p>Error: " + err.message + "</p>" +
      "<p>Please verify that UI_Index.html exists in the project.</p>" +
      "</div>"
    ).setTitle("PHINOX BOS v5 — Error");
  }
}