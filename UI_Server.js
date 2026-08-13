/**
 * PHINOX BOS — UI Server-Side API Wrappers
 * Phase: FINAL HTML / UI / UX DASHBOARD
 * These functions wrap existing backend services for frontend consumption.
 * DO NOT MODIFY BACKEND LOGIC.
 */

// ============================================================
// KPI APIs
// ============================================================

function uiGetDashboardKpis() {
  try {
    var dashboard = KpiService.getDashboardKpis();
    return { success: true, data: dashboard };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetKpiHistory(kpiId, limit) {
  try {
    var history = KpiService.getKpiHistory(kpiId, limit || 12);
    return { success: true, data: history };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCalculateCategory(category, periodType, refDate) {
  try {
    var results = KpiService.calculateCategory(category, periodType, refDate);
    return { success: true, data: results };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCalculateAll(periodType, refDate) {
  try {
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
    var result = CustomerService.getCustomers(options || { limit: 1000 });
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetCustomer(id) {
  try {
    var customer = CustomerService.getCustomer(id);
    return { success: true, data: customer };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetCustomerStats() {
  try {
    var stats = CustomerService.getCustomerStats();
    return { success: true, data: stats };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateCustomer(data) {
  try {
    var id = CustomerService.createCustomer(data);
    return { success: true, id: id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiUpdateCustomer(id, data) {
  try {
    var updated = CustomerService.updateCustomer(id, data);
    return { success: true, data: updated };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiDeleteCustomer(id) {
  try {
    CustomerService.deleteCustomer(id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiSyncCustomers() {
  try {
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
    var result = SatisfactionService.getRecords(options || { limit: 1000 });
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetSatisfactionStats(startDate, endDate) {
  try {
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
    var result = NPSService.getRecords(options || { limit: 1000 });
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetNPSStats(startDate, endDate) {
  try {
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
    var result = TaskService.getTasks(options || { limit: 1000 });
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetTasksByDateRange(startDate, endDate) {
  try {
    var result = TaskService.getTasksByDateRange(startDate, endDate);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetTaskStats(startDate, endDate) {
  try {
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
    var id = TaskService.createTask(data);
    return { success: true, id: id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiUpdateTask(id, data) {
  try {
    var updated = TaskService.updateTask(id, data);
    return { success: true, data: updated };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiDeleteTask(id) {
  try {
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
    var members = Members.getMembers();
    return { success: true, data: members };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetMemberStats() {
  try {
    var total = Members.totalMembers();
    var active = Members.activeMembers();
    return { success: true, data: { total: total, active: active.length } };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiAddMember(data) {
  try {
    var id = Members.addMember(data);
    return { success: true, id: id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiUpdateMember(id, data) {
  try {
    Members.updateMember(id, data);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiDeleteMember(id) {
  try {
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
    var result = SaleService.getSales(options || { limit: 1000 });
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetSalesByDateRange(startDate, endDate) {
  try {
    var result = SaleService.getSalesByDateRange(startDate, endDate);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateSale(data) {
  try {
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
    var result = OrderService.getOrders(options || { limit: 1000 });
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetOrdersByDateRange(startDate, endDate) {
  try {
    var result = OrderService.getOrdersByDateRange(startDate, endDate);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateOrder(data) {
  try {
    var id = OrderService.createOrder(data);
    return { success: true, id: id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiUpdateOrderStatus(id, status) {
  try {
    var result;
    if (status === 'Confirmed') result = OrderService.confirmOrder(id);
    else if (status === 'Shipped') result = OrderService.shipOrder(id);
    else if (status === 'Delivered') result = OrderService.deliverOrder(id);
    else if (status === 'Cancelled') result = OrderService.cancelOrder(id);
    else throw new Error('Invalid status: ' + status);
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
    var pnl = FinanceService.getProfitAndLoss(startDate, endDate);
    var cashFlow = FinanceService.getCashFlow(startDate, endDate);
    var cashBalance = FinanceService.getCashBalance('Cash', endDate);
    return { success: true, data: { pnl: pnl, cashFlow: cashFlow, cashBalance: cashBalance } };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetLedger(options) {
  try {
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
    var result = InventoryService.getItems(options || { limit: 1000 });
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetInventoryStats() {
  try {
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
    var id = InventoryService.createItem(data);
    return { success: true, id: id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function openAddInventoryModal() {
  openModal('Add Inventory Item',
    '<div class="form-group"><label>SKU *</label><input type="text" class="form-input" id="addInvSku" placeholder="SKU-001"></div>' +
    '<div class="form-group"><label>Name *</label><input type="text" class="form-input" id="addInvName" placeholder="Product name"></div>' +
    '<div class="form-group"><label>Category</label><input type="text" class="form-input" id="addInvCategory" placeholder="e.g. Electronics"></div>' +
    '<div class="form-group"><label>Quantity *</label><input type="number" class="form-input" id="addInvQty" placeholder="0"></div>' +
    '<div class="form-group"><label>Cost</label><input type="number" class="form-input" id="addInvCost" placeholder="0.00" step="0.01"></div>' +
    '<div class="form-group"><label>Price</label><input type="number" class="form-input" id="addInvPrice" placeholder="0.00" step="0.01"></div>',
    '<button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" onclick="submitAddInventory()">Create Item</button>'
  );
}

function submitAddInventory() {
  var data = {
    sku: document.getElementById('addInvSku').value.trim(),
    name: document.getElementById('addInvName').value.trim(),
    category: document.getElementById('addInvCategory').value.trim(),
    quantity: parseInt(document.getElementById('addInvQty').value) || 0,
    cost: parseFloat(document.getElementById('addInvCost').value) || 0,
    price: parseFloat(document.getElementById('addInvPrice').value) || 0
  };
  if (!data.sku || !data.name) { showToast('Error', 'SKU and Name are required', 'error'); return; }
  callServer('uiCreateInventoryItem', data)
    .then(function() { showToast('Success', 'Item created', 'success'); closeModal(); loadInventory(); })
    .catch(function(err) { showToast('Error', err.message, 'error'); });
}

// ============================================================
// MARKETING APIs
// ============================================================

function uiGetMarketingRecords(options) {
  try {
    var result = MktService.getRecords(options || { limit: 1000 });
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetMarketingStats(startDate, endDate) {
  try {
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
    var result = SocService.getRecords(options || { limit: 1000 });
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetSocialStats(startDate, endDate) {
  try {
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
    var id = SocService.createRecord(data);
    return { success: true, id: id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// LAUNCH UI
// ============================================================

function showPhinoxDashboard() {
  var html = HtmlService.createHtmlOutputFromFile('UI_Index')
    .setTitle('PHINOX BOS Dashboard')
    .setWidth(1280)
    .setHeight(900);
  SpreadsheetApp.getUi().showModalDialog(html, 'PHINOX BOS');
}

function showPhinoxDashboardSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('UI_Index')
    .setTitle('PHINOX BOS')
    .setWidth(350);
  SpreadsheetApp.getUi().showSidebar(html);
}

// ============================================================
// WEB APP ENTRY POINT
// ============================================================

function doGet(e) {
  try {
    var html = HtmlService.createHtmlOutputFromFile('UI_Index')
      .setTitle('PHINOX BOS v5')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    return html;
  } catch (err) {
    return HtmlService.createHtmlOutput(
      '<h1>PHINOX BOS v5 — Error</h1>' +
      '<p>Failed to load UI_Index.html</p>' +
      '<p>Error: ' + err.message + '</p>' +
      '<p>Please verify that UI_Index.html exists in the project.</p>'
    ).setTitle('PHINOX BOS v5 — Error');
  }
}

