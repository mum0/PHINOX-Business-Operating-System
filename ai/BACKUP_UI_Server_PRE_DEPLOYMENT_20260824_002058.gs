// ═══════════════════════════════════════════════════════════════════════
// PHINOX BOS v5 — UI Server (Google Apps Script)
// ═══════════════════════════════════════════════════════════════════════

// ─── PERMISSIONS ───
var PERMISSIONS = {
  DASHBOARD_READ: "dashboard:read",
  INVENTORY_READ: "inventory:read",
  INVENTORY_WRITE: "inventory:write",
  INVENTORY_DELETE: "inventory:delete",
  INVENTORY_BOM_READ: "inventory:bom_read",
  INVENTORY_BOM_MANAGE: "inventory:bom_manage",
  MEMBERS_READ: "members:read",
  MEMBERS_WRITE: "members:write",
  MEMBERS_DELETE: "members:delete",
  TASK_READ: "task:read",
  TASK_WRITE: "task:write",
  TASK_DELETE: "task:delete",
  EXPENSE_READ: "expenses:read",
  EXPENSE_WRITE: "expenses:write",
  EXPENSE_APPROVE: "expenses:approve",
  EXPENSE_POST: "expenses:post",
  CUSTOMERS_READ: "customers:read",
  CUSTOMERS_WRITE: "customers:write",
  FINANCE_READ: "finance:read",
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
  SETTINGS_READ: "settings:read",
  SETTINGS_WRITE: "settings:write",
};

// ─── AUTH HELPERS ───
function _requireAuth(permission) {
  var user = Session.getActiveUser().getEmail();
  if (!user) throw new Error("Authentication required");
  var member = Members.getMemberByEmail(user);
  if (!member) throw new Error("Member not found");
  var role = member[2] || '';
  if (role === 'Admin' || role === 'CEO') return member;
  var hasPerm = Permissions.checkPermission(user, permission);
  if (!hasPerm) throw new Error("Permission denied: " + permission);
  return member;
}

// ─── UI API: CURRENT USER ───
function uiGetCurrentUser() {
  try {
    var email = Session.getActiveUser().getEmail();
    if (!email) throw new Error("No active Google session");
    var member = Members.getMemberByEmail(email);
    var perms = Permissions.getUserPermissions(email);
    if (!member) {
      // User not in Members sheet — auto-register as Guest with basic perms
      return {
        success: true,
        data: {
          email: email,
          name: email.split('@')[0],
          role: 'Guest',
          permissions: perms && perms.length ? perms : ['dashboard:read']
        }
      };
    }
    return {
      success: true,
      data: {
        email: email,
        name: member[1] || email.split('@')[0],
        role: member[2] || 'User',
        permissions: perms && perms.length ? perms : ['dashboard:read']
      }
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════
function uiGetDashboardKpis() {
  try {
    _requireAuth(PERMISSIONS.DASHBOARD_READ);
    var stats = {
      revenue: FinanceService.getTotalRevenue() || 0,
      expenses: FinanceService.getTotalExpenses() || 0,
      profit: FinanceService.getNetProfit() || 0,
      sales: SaleService.getTotalSales() || 0,
      orders: OrderService.getTotalOrders() || 0,
      customers: CustomerService.getTotalCustomers() || 0,
      inventory: InventoryService.totalItems() || 0,
      tasks: TaskService.getTaskStats() || {}
    };
    return { success: true, data: stats };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// INVENTORY
// ═══════════════════════════════════════════════════════════════════════

function uiGetInventory(options) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_READ);
    var items = InventoryService.getItems(options || { limit: 1000 });
    return { success: true, data: items };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetInventoryStats() {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_READ);
    var stats = {
      total: InventoryService.totalItems(),
      value: InventoryService.getInventoryValue(),
      retailValue: InventoryService.getInventoryRetailValue(),
      lowStock: InventoryService.getLowStockItems().length,
      outOfStock: InventoryService.getOutOfStockItems().length
    };
    return { success: true, data: stats };
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

function uiAdjustStock(id, data) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_WRITE);
    if (!id) throw new Error("Item ID required");
    InventoryService.adjustStock(id, data.qty, data.reason);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}


function uiRestockStock(data) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_WRITE);
    InventoryService.restock(data.sku, data.qty, "UI_RESTOCK", data.referenceId || "");
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetStockMovements(sku) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_READ);
    if (!sku) throw new Error("SKU required");
    var movements = StockMovementService.getMovementsBySku(sku);
    return { success: true, data: movements };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetLowStock() {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_READ);
    var items = InventoryService.getLowStockItems();
    return { success: true, data: items };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetOutOfStock() {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_READ);
    var items = InventoryService.getOutOfStockItems();
    return { success: true, data: items };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// BOM
// ═══════════════════════════════════════════════════════════════════════
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
    if (!bomId) throw new Error("BOM ID required");
    var items = BOMService.getBOMItems(bomId);
    return { success: true, data: items };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateBOM(data) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_BOM_MANAGE);
    if (!data || !data.sku) throw new Error("SKU required");
    var serviceData = {
      finishedProductSku: data.sku,
      name: data.sku,
      description: data.notes || ''
    };
    var id = BOMService.createBOM(serviceData);
    return { success: true, data: { id: id } };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
function uiUpdateBOM(id, data) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_BOM_MANAGE);
    if (!id) throw new Error("BOM ID required");
    BOMService.updateBOM(id, data);
    return { success: true };
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

function uiAddBOMItem(payload) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_BOM_MANAGE);
    var bomId = payload.bomId || payload;
    var data = payload.data || payload;
    if (!bomId) throw new Error("bomId required");
    var serviceData = {
      componentSku: data.componentSku,
      quantityRequired: data.quantity || data.quantityRequired || 0,
      unit: data.unit || 'pcs',
      notes: data.notes || ''
    };
    var id = BOMService.addBOMItem(bomId, serviceData);
    return { success: true, id: id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
function uiUpdateBOMItem(itemId, data) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_BOM_MANAGE);
    if (!itemId) throw new Error("Item ID required");
    BOMService.updateBOMItem(itemId, data);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiRemoveBOMItem(itemId) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_BOM_MANAGE);
    if (!itemId) throw new Error("Item ID required");
    BOMService.removeBOMItem(itemId);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCalculateCost(sku) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_BOM_READ);
    if (!sku) throw new Error("SKU required");
    var items = InventoryService.getItems({ sku: sku, limit: 1 });
    var item = (items && items.data && items.data[0]) || null;
    if (!item) {
      return { success: false, error: 'Inventory item not found for SKU: ' + sku };
    }
    var result = BOMService.calculateUnitCost(item.id);
    return {
      success: true,
      data: {
        finalCost: result.unitCost || 0,
        bomCost: result.source === 'BOM' ? (result.unitCost || 0) : 0,
        inventoryCost: result.source === 'INVENTORY' ? (result.unitCost || 0) : 0
      }
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCalculateAll() {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_BOM_READ);
    var result = BOMService.calculateUnitCost();
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCalculateCategory(category) {
  try {
    _requireAuth(PERMISSIONS.INVENTORY_BOM_READ);
    var result = BOMService.calculateUnitCost(category);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════════════════════════════════════
function uiGetOrders(params) {
  try {
    _requireAuth(PERMISSIONS.ORDERS_READ);
    var result = OrderController.listOrders(params || {});
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetOrdersByDateRange(params) {
  try {
    _requireAuth(PERMISSIONS.ORDERS_READ);
    var result = OrderController.listOrders(params || {});
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
    OrderService.updateOrderStatus(id, status);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// SALES
// ═══════════════════════════════════════════════════════════════════════
function uiGetSales(params) {
  try {
    _requireAuth(PERMISSIONS.SALES_READ);
    var result = SaleController.listSales(params || {});
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetSalesByDateRange(params) {
  try {
    _requireAuth(PERMISSIONS.SALES_READ);
    var result = SaleController.listSales(params || {});
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateSale(data) {
  try {
    _requireAuth(PERMISSIONS.SALES_WRITE);
    var id = SaleService.createSale(data);
    return { success: true, id: id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// CUSTOMERS
// ═══════════════════════════════════════════════════════════════════════
function uiGetCustomers(params) {
  try {
    _requireAuth(PERMISSIONS.CUSTOMERS_READ);
    var result = CustomerService.getCustomers(params || {});
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetCustomer(id) {
  try {
    _requireAuth(PERMISSIONS.CUSTOMERS_READ);
    var result = CustomerService.getCustomer(id);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetCustomerStats() {
  try {
    _requireAuth(PERMISSIONS.CUSTOMERS_READ);
    var stats = CustomerService.getCustomerStats();
    return { success: true, data: stats };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateCustomer(data) {
  try {
    _requireAuth(PERMISSIONS.CUSTOMERS_WRITE);
    var id = CustomerService.createCustomer(data);
    return { success: true, id: id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiUpdateCustomer(id, data) {
  try {
    _requireAuth(PERMISSIONS.CUSTOMERS_WRITE);
    CustomerService.updateCustomer(id, data);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiDeleteCustomer(id) {
  try {
    _requireAuth(PERMISSIONS.CUSTOMERS_WRITE);
    CustomerService.deleteCustomer(id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiSyncCustomers() {
  try {
    _requireAuth(PERMISSIONS.CUSTOMERS_WRITE);
    var result = CustomerService.syncCustomers();
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// FINANCE
// ═══════════════════════════════════════════════════════════════════════
function uiGetFinanceStats(params) {
  try {
    _requireAuth(PERMISSIONS.FINANCE_READ);
    var stats = FinanceService.getFinanceStats(params || {});
    return { success: true, data: stats };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetLedger(params) {
  try {
    _requireAuth(PERMISSIONS.FINANCE_READ);
    var result = FinanceService.getLedger(params || {});
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// EXPENSES
// ═══════════════════════════════════════════════════════════════════════
function uiGetExpenses(params) {
  try {
    _requireAuth(PERMISSIONS.EXPENSE_READ);
    var result = FinanceService.getExpenses(params || {});
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetExpense(id) {
  try {
    _requireAuth(PERMISSIONS.FINANCE_READ);
    var result = FinanceService.getExpense(id);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateExpense(data) {
  try {
    _requireAuth(PERMISSIONS.EXPENSE_WRITE);
    var id = FinanceService.createExpense(data);
    return { success: true, id: id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiSubmitExpense(data) {
  try {
    _requireAuth(PERMISSIONS.EXPENSE_WRITE);
    var id = FinanceService.submitExpense(data);
    return { success: true, id: id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiApproveExpense(id) {
  try {
    _requireAuth(PERMISSIONS.EXPENSE_APPROVE);
    FinanceService.approveExpense(id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiRejectExpense(id, reason) {
  try {
    _requireAuth(PERMISSIONS.EXPENSE_APPROVE);
    FinanceService.rejectExpense(id, reason);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiPostExpense(id, account) {
  try {
    _requireAuth(PERMISSIONS.EXPENSE_POST);
    FinanceService.postExpense(id, account);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiDeleteExpense(id) {
  try {
    _requireAuth(PERMISSIONS.EXPENSE_WRITE);
    FinanceService.deleteExpense(id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// TASKS
// ═══════════════════════════════════════════════════════════════════════
function uiGetTasks(params) {
  try {
    _requireAuth(PERMISSIONS.TASK_READ);
    var result = TaskController.listTasks(params || {});
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetTasksByDateRange(params) {
  try {
    _requireAuth(PERMISSIONS.TASK_READ);
    var result = TaskController.listTasks(params || {});
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetTaskStats() {
  try {
    _requireAuth(PERMISSIONS.TASK_READ);
    var stats = TaskService.getTaskStats();
    return { success: true, data: stats };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateTask(data) {
  try {
    _requireAuth(PERMISSIONS.TASK_WRITE);
    var id = TaskService.createTask(data);
    return { success: true, id: id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiUpdateTask(id, data) {
  try {
    _requireAuth(PERMISSIONS.TASK_WRITE);
    TaskService.updateTask(id, data);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/* PHINOX PATCH — TASK APPROVE/REJECT WRAPPERS */
/* END PHINOX PATCH */

function uiDeleteTask(id) {
  try {
    _requireAuth(PERMISSIONS.TASK_DELETE);
    TaskService.deleteTask(id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// MEMBERS
// ═══════════════════════════════════════════════════════════════════════
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
    var stats = {
      total: Members.totalMembers(),
      active: Members.activeMembers().length,
      departments: Members.getMembersByDepartment()
    };
    return { success: true, data: stats };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/* PHINOX PATCH — ADMIN/CEO UNIQUE ROLE ENFORCEMENT */
function _checkAdminCEOLimit(role, excludeId) {
  role = String(role || '').trim();
  if (role !== 'Admin' && role !== 'CEO') return;
  var all = Members.getMembers();
  for (var i = 0; i < all.length; i++) {
    var m = all[i];
    var mRole = String(m[2] || '').trim();
    if (excludeId && m[0] === excludeId) continue;
    if (role === 'Admin' && mRole === 'Admin') {
      throw new Error('Only one Admin is allowed. An Admin already exists.');
    }
    if (role === 'CEO' && mRole === 'CEO') {
      throw new Error('Only one CEO is allowed. A CEO already exists.');
    }
  }
}
/* END PHINOX PATCH */

function uiAddMember(data) {
  try {
    _requireAuth(PERMISSIONS.MEMBERS_WRITE);
    if (!data) throw new Error("Member data required");
    // Normalize: frontend sends fullName, backend may expect name
    if (data.fullName && !data.name) data.name = data.fullName;
    if (!data.name && !data.fullName) throw new Error("Member name is required");
    /* PHINOX PATCH — ADMIN/CEO SERVER-SIDE ENFORCEMENT */
    _checkAdminCEOLimit(data.role);
    /* END PHINOX PATCH */
    var id = Members.addMember(data);
    return { success: true, id: id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiUpdateMember(id, data) {
  try {
    _requireAuth(PERMISSIONS.MEMBERS_WRITE);
    /* PHINOX PATCH — ADMIN/CEO SERVER-SIDE ENFORCEMENT ON UPDATE */
    if (data && data.role) _checkAdminCEOLimit(data.role, id);
    /* END PHINOX PATCH */
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

// ═══════════════════════════════════════════════════════════════════════
// MARKETING & SOCIAL
// ═══════════════════════════════════════════════════════════════════════
function uiGetMarketingRecords(params) {
  try {
    _requireAuth(PERMISSIONS.MARKETING_READ);
    var result = MktSocController.listMarketing(params || {});
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetMarketingStats(params) {
  try {
    _requireAuth(PERMISSIONS.MARKETING_READ);
    var stats = MktSocController.getMarketingStats(params || {});
    return { success: true, data: stats };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateMarketingRecord(data) {
  try {
    _requireAuth(PERMISSIONS.MARKETING_WRITE);
    var id = MktSocController.createMarketing(data);
    return { success: true, id: id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetSocialRecords(params) {
  try {
    _requireAuth(PERMISSIONS.SOCIAL_READ);
    var result = MktSocController.listSocial(params || {});
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetSocialStats(params) {
  try {
    _requireAuth(PERMISSIONS.SOCIAL_READ);
    var stats = MktSocController.getSocialStats(params || {});
    return { success: true, data: stats };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateSocialRecord(data) {
  try {
    _requireAuth(PERMISSIONS.SOCIAL_WRITE);
    var id = MktSocController.createSocial(data);
    return { success: true, id: id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// SATISFACTION & NPS
// ═══════════════════════════════════════════════════════════════════════
function uiGetSatisfactionStats(params) {
  try {
    _requireAuth(PERMISSIONS.SATISFACTION_READ);
    var stats = SatisfactionService.getStats(params || {});
    return { success: true, data: stats };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetSatisfactionRecords(params) {
  try {
    _requireAuth(PERMISSIONS.SATISFACTION_READ);
    var result = SatisfactionService.getRecords(params || {});
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateSatisfaction(data) {
  try {
    _requireAuth(PERMISSIONS.SATISFACTION_WRITE);
    var id = SatisfactionService.createRecord(data);
    return { success: true, id: id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetNPSStats(params) {
  try {
    _requireAuth(PERMISSIONS.NPS_READ);
    var stats = NPSService.getStats(params || {});
    return { success: true, data: stats };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetNPSRecords(params) {
  try {
    _requireAuth(PERMISSIONS.NPS_READ);
    var result = NPSService.getRecords(params || {});
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateNPS(data) {
  try {
    _requireAuth(PERMISSIONS.NPS_WRITE);
    var id = NPSService.createRecord(data);
    return { success: true, id: id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// PERFORMANCE / KPI
// ═══════════════════════════════════════════════════════════════════════
function uiGetKpiHistory(params) {
  try {
    _requireAuth(PERMISSIONS.PERFORMANCE_READ);
    var result = KpiService.getHistory(params || {});
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// FRONTEND ALIASES — PHINOX PATCH
// ═══════════════════════════════════════════════════════════════════════

/** Alias: Frontend calls uiGetKPIs → maps to uiGetDashboardKpis */
function uiGetKPIs(params) {
  try {
    _requireAuth(PERMISSIONS.DASHBOARD_READ);

    // Map Frontend period values to KpiSchema.PERIOD values
    var periodMap = {
      'monthly':   KpiSchema.PERIOD.MONTHLY,
      'quarterly': KpiSchema.PERIOD.QUARTERLY,
      'yearly':    KpiSchema.PERIOD.YEARLY
    };
    var periodType = periodMap[params && params.period] || KpiSchema.PERIOD.MONTHLY;
    var refDate = (params && params.refDate) || null;

    // Calculate the 4 KPIs needed by Frontend
    var revenueRecord = KpiService.calculateKpi('FIN-01', periodType, refDate);
    var profitRecord  = KpiService.calculateKpi('FIN-04', periodType, refDate);
    var ordersRecord  = KpiService.calculateKpi('SALE-01', periodType, refDate);

    // Derive total expenses: Revenue - Net Profit
    // This includes COGS + Operating Expenses + any other deductions
    var revenue = Number(revenueRecord.value) || 0;
    var profit  = Number(profitRecord.value) || 0;
    var expenses = revenue - profit;

    return {
      success: true,
      data: {
        revenue:  revenue,
        expenses: expenses,
        profit:   profit,
        orders:   Number(ordersRecord.value) || 0
      }
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateInventory(data) {
  return uiCreateInventoryItem(data);
}

// ═══════════════════════════════════════════════════════════════════════
// LEGACY COMPATIBILITY
// ═══════════════════════════════════════════════════════════════════════
function showPhinoxDashboard() {
  return uiGetDashboardKpis();
}

function showPhinoxDashboardSidebar() {
  return uiGetCurrentUser();
}