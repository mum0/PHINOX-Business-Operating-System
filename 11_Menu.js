/**
 * Google Sheets custom menu.
 * Updated: Added Tasks + Inventory + Orders + Sales submenus (Phase 2-5)
 * Updated v7B: Added Analytics submenu with KPI Dashboard
 * SECURITY FIX (2026-08-27):
 *   - Removed menuSetRole (critical vulnerability: self-escalation)
 *   - Added getCurrentMemberRole() + isAdminRole()
 *   - Admin/Tools menus hidden from non-admins
 *   - Role changes now require Admin Panel or direct sheet edit by admin
 */

function onOpen(e) {
  var ui = SpreadsheetApp.getUi();
  var menu = ui.createMenu('🚀 PHINOX BOS');

  menu.addItem('▶️ Initialize System', 'menuInitialize');
  menu.addItem('🧪 Run Core Tests', 'menuRunTests');
  menu.addItem('📊 Open Dashboard', 'showPhinoxDashboard');
  menu.addSeparator();

  menu.addSubMenu(
    ui.createMenu('📋 Tasks')
      .addItem('📊 Show Stats', 'menuTaskStats')
      .addItem('➕ Create Task', 'menuTaskCreate')
      .addItem('🔄 Refresh Tasks', 'menuTaskRefresh')
      .addItem('🧪 Run Task E2E Tests', 'menuRunTaskTests')
  );

  menu.addSubMenu(
    ui.createMenu('🖥️ Dashboard')
      .addItem('📊 Open Dashboard', 'showPhinoxDashboard')
      .addItem('📱 Sidebar Mode', 'showPhinoxDashboardSidebar')
  );

  menu.addSubMenu(
    ui.createMenu('📦 Inventory')
      .addItem('📊 Show Stats', 'menuInventoryStats')
      .addItem('➕ Add Item', 'menuInventoryCreate')
      .addItem('🧪 Run Inventory E2E Tests', 'menuRunInventoryTests')
  );

  menu.addSubMenu(
    ui.createMenu('📋 Orders')
      .addItem('📊 Show Stats', 'menuOrderStats')
      .addItem('➕ Create Order', 'menuOrderCreate')
      .addItem('🧪 Run Order E2E Tests', 'menuRunOrderTests')
  );

  menu.addSubMenu(
    ui.createMenu('💰 Sales')
      .addItem('📊 Show Stats', 'menuSaleStats')
      .addItem('➕ Create Sale', 'menuSaleCreate')
      .addItem('🧪 Run Sale E2E Tests', 'menuRunSaleTests')
  );

  menu.addSubMenu(
    ui.createMenu('👥 Customers')
      .addItem('📊 Customer Stats', 'menuCustomerStats')
      .addItem('🔄 Sync from Orders', 'menuCustomerSync')
  );

  menu.addSubMenu(
    ui.createMenu('💰 Finance')
      .addItem('📊 Dashboard', 'menuFinanceStats')
      .addItem('📒 View Ledger', 'menuFinanceLedger')
      .addItem('➕ Create Expense', 'menuFinanceCreateExpense')
      .addItem('✅ Approve Expense', 'menuFinanceApproveExpense')
      .addItem('📤 Post Expense', 'menuFinancePostExpense')
      .addItem('🧪 Run Finance Tests', 'menuRunFinanceTests')
  );

  menu.addSubMenu(
    ui.createMenu('📊 Analytics')
      .addItem('📈 Business Dashboard', 'menuKpiDashboard')
      .addItem('🔁 Recalculate All KPIs', 'menuKpiRecalculateAll')
      .addItem('📋 View KPI History', 'menuKpiHistory')
      .addItem('🧪 Run KPI Tests', 'menuRunKpiTests')
      .addItem('🧪 Run Mkt/Soc Tests', 'menuRunMktSocTests')
  );

  menu.addSubMenu(
    ui.createMenu('📣 Marketing')
      .addItem('➕ Enter Marketing Data', 'menuMktEnter')
      .addItem('📥 Import Marketing CSV', 'menuMktImport')
      .addItem('📊 Marketing Dashboard', 'menuMktDashboard')
  );

  menu.addSubMenu(
    ui.createMenu('📱 Social Media')
      .addItem('➕ Enter Social Data', 'menuSocEnter')
      .addItem('📥 Import Social CSV', 'menuSocImport')
      .addItem('📊 Social Dashboard', 'menuSocDashboard')
  );

  // ─── Admin & Tools — visible only to admins ───
  var currentRole = getCurrentMemberRole();
  if (isAdminRole(currentRole)) {
    menu.addSubMenu(
      ui.createMenu('⚙️ Admin')
        .addItem('📊 View Logs', 'menuViewLogs')
        .addItem('🔄 Flush Logger', 'menuFlushLogger')
        .addItem('📜 Audit Log', 'showAuditLog')
    );
    menu.addSubMenu(
      ui.createMenu('🛠️ Tools')
        .addItem('🗑️ Clear Cache', 'menuClearCache')
        .addItem('📈 Build Index', 'menuBuildIndex')
    );
  }

  menu.addToUi();

  try {
    Logger.info('Menu', 'Menu loaded for ' + Session.getActiveUser().getEmail());
  } catch (err) {
    // silent
  }
}

// ═══════════════════════════════════════════════════
// SECURITY HELPERS (NEW — 2026-08-27)
// ═══════════════════════════════════════════════════

/**
 * Get current user role from Members Sheet (secure)
 * @returns {string} role
 */
function getCurrentMemberRole() {
  try {
    var email = Session.getActiveUser().getEmail();
    if (!email) return 'GUEST';

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.SHEETS.MEMBERS);
    if (!sheet) return 'GUEST';

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var emailCol = headers.indexOf('email');
    var roleCol = headers.indexOf('role');
    var statusCol = headers.indexOf('status');

    if (emailCol === -1 || roleCol === -1) return 'GUEST';

    for (var i = 1; i < data.length; i++) {
      if (data[i][emailCol] === email) {
        if (statusCol !== -1 && data[i][statusCol] === 'inactive') {
          return 'GUEST';
        }
        return data[i][roleCol] || 'GUEST';
      }
    }
    return 'GUEST';
  } catch (e) {
    Logger.error('Menu.getCurrentMemberRole', e.message, { error: e.toString() });
    return 'GUEST';
  }
}

/**
 * Check if role is admin-level
 * @param {string} role
 * @returns {boolean}
 */
function isAdminRole(role) {
  var adminRoles = ['CEO', 'ADMIN', 'SUPER_ADMIN', 'OWNER'];
  return adminRoles.indexOf(role) !== -1;
}

// ═══════════════════════════════════════════════════
// CORE MENU HANDLERS
// ═══════════════════════════════════════════════════

function menuInitialize() {
  try {
    var result = Setup.run();
    SpreadsheetApp.getUi().alert(result);
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error: ' + e.message);
  }
}

function menuRunTests() {
  try {
    testCoreLayer();
    SpreadsheetApp.getUi().alert('Tests passed. Check console logs.');
  } catch (e) {
    SpreadsheetApp.getUi().alert('Test failed: ' + e.message);
  }
}

// ⚠️ SECURITY FIX: menuSetRole removed — was critical vulnerability
// Users could escalate their own role via UserProperties
// Alternative: Use Admin Panel in UI, or edit Members Sheet directly

function menuViewLogs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Logs');
  if (sheet) ss.setActiveSheet(sheet);
}

function menuFlushLogger() {
  Logger.flush();
  SpreadsheetApp.getUi().alert('Logger flushed.');
}

function menuClearCache() {
  CacheService.getScriptCache().removeAll();
  SpreadsheetApp.getUi().alert('Cache cleared.');
}

// ═══════════════════════════════════════════════════
// FINANCE MENU HANDLERS
// ═══════════════════════════════════════════════════

function menuFinanceStats() {
  try { FinanceController.showFinanceStats(); }
  catch(e) { SpreadsheetApp.getUi().alert('Error: ' + e.message); }
}

function menuFinanceLedger() {
  try { FinanceController.showLedger(); }
  catch(e) { SpreadsheetApp.getUi().alert('Error: ' + e.message); }
}

function menuFinanceCreateExpense() { FinanceController.showCreateExpenseForm(); }
function menuFinanceApproveExpense() { FinanceController.showApproveExpense(); }
function menuFinancePostExpense() { FinanceController.showPostExpense(); }

function menuRunFinanceTests() {
  try {
    testFinanceLayer();
    SpreadsheetApp.getUi().alert('Finance tests passed.');
  } catch(e) {
    SpreadsheetApp.getUi().alert('Finance test failed: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════
// ANALYTICS MENU HANDLERS (v7B)
// ═══════════════════════════════════════════════════

function menuKpiDashboard() {
  try {
    var dashboard = KpiService.getDashboardKpis();
    var html = '<h2>📊 PHINOX Analytics Dashboard</h2>';
    var categories = { 'Finance': [], 'Sales': [], 'Inventory': [], 'Operations': [] };

    Object.keys(dashboard).forEach(function(k) {
      var item = dashboard[k];
      if (categories[item.category]) {
        categories[item.category].push(item);
      }
    });

    Object.keys(categories).forEach(function(cat) {
      html += '<h3>' + cat + '</h3>';
      html += '<table border="1" cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;">';
      html += '<tr><th>KPI</th><th>Value</th><th>Unit</th></tr>';
      categories[cat].forEach(function(item) {
        html += '<tr><td>' + item.name + '</td><td>' +
          Number(item.value).toFixed(2) +
          '</td><td>' + item.unit + '</td></tr>';
      });
      html += '</table>';
    });

    SpreadsheetApp.getUi().showModalDialog(
      HtmlService.createHtmlOutput(html).setWidth(600).setHeight(700),
      'Analytics Dashboard'
    );
  } catch(e) {
    SpreadsheetApp.getUi().alert('Error: ' + e.message);
  }
}

function menuKpiRecalculateAll() {
  try {
    var result = KpiService.calculateAll();
    var msg = 'KPIs calculated: ' + result.results.length +
      '\nErrors: ' + (result.errors ? result.errors.length : 0);
    SpreadsheetApp.getUi().alert(msg);
  } catch(e) {
    SpreadsheetApp.getUi().alert('Error: ' + e.message);
  }
}

function menuKpiHistory() {
  try {
    var ui = SpreadsheetApp.getUi();
    var response = ui.prompt('Enter KPI Code (e.g., FIN-01):', ui.ButtonSet.OK_CANCEL);
    if (response.getSelectedButton() === ui.Button.OK) {
      var kpiId = response.getResponseText().trim();
      var history = KpiService.getKpiHistory(kpiId, 12);
      var html = '<h2>📋 ' + kpiId + ' History</h2>' +
        '<table border="1" cellpadding="6" style="border-collapse:collapse;">' +
        '<tr><th>Period</th><th>Value</th></tr>';
      history.forEach(function(h) {
        html += '<tr><td>' + h.period + '</td><td>' + Number(h.value).toFixed(2) + '</td></tr>';
      });
      html += '</table>';
      ui.showModalDialog(
        HtmlService.createHtmlOutput(html).setWidth(400).setHeight(500),
        'KPI History'
      );
    }
  } catch(e) {
    SpreadsheetApp.getUi().alert('Error: ' + e.message);
  }
}

function menuRunKpiTests() {
  try {
    testKpiLayer();
    SpreadsheetApp.getUi().alert('KPI tests passed.');
  } catch(e) {
    SpreadsheetApp.getUi().alert('KPI test failed: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════
// TOOLS MENU HANDLERS
// ═══════════════════════════════════════════════════

function menuBuildIndex() {
  var schemas = {
    'Tasks': { id: 1 },
    'Members': { id: 1 },
    'Inventory': { id: 1 },
    'Orders': { id: 1 },
    'Sales': { id: 1 },
    'Finance Ledger': { id: 1 },
    'Finance Expenses': { id: 1 },
    'KPI Results': { id: 1 },
    'Customers': { id: 1 },
    'Satisfaction': { id: 1 },
    'NPS': { id: 1 }
  };
  Object.keys(schemas).forEach(function(sheetName) {
    try {
      var repo = BaseRepository.create(sheetName, schemas[sheetName]);
      repo.buildIndex();
    } catch (e) {
      Logger.warn('Menu', 'Index build skipped for ' + sheetName, { error: e.message });
    }
  });
  SpreadsheetApp.getUi().alert('Index built for available sheets.');
}

// ═══════════════════════════════════════════════════
// MARKETING MENU HANDLERS (v7C)
// ═══════════════════════════════════════════════════

function menuMktEnter() { MktSocController.showMarketingForm(); }
function menuMktImport() { MktSocController.showMarketingCsvImport(); }
function menuMktDashboard() { MktSocController.showMarketingDashboard(); }

// ═══════════════════════════════════════════════════
// SOCIAL MEDIA MENU HANDLERS (v7C)
// ═══════════════════════════════════════════════════

function menuSocEnter() { MktSocController.showSocialForm(); }
function menuSocImport() { MktSocController.showSocialCsvImport(); }
function menuSocDashboard() { MktSocController.showSocialDashboard(); }

// ═══════════════════════════════════════════════════
// CUSTOMER MENU HANDLERS (Phase 8G)
// ═══════════════════════════════════════════════════

function menuCustomerStats() {
  try {
    var stats = CustomerService.getCustomerStats();
    var msg = 'Total Customers: ' + stats.total + '\n' +
              'Active: ' + stats.active + '\n' +
              'New (this month): ' + stats.newThisMonth + '\n' +
              'Returning: ' + stats.returning + '\n' +
              'Churned: ' + stats.churned;
    SpreadsheetApp.getUi().alert(msg);
  } catch(e) {
    SpreadsheetApp.getUi().alert('Error: ' + e.message);
  }
}

function menuCustomerSync() {
  try {
    var count = CustomerService.syncFromOrders();
    SpreadsheetApp.getUi().alert('Synced ' + count + ' customers from orders.');
  } catch(e) {
    SpreadsheetApp.getUi().alert('Error: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════
// MKT/SOC TEST HANDLER (Phase 8G)
// ═══════════════════════════════════════════════════

function menuRunMktSocTests() {
  try {
    testMktSocLayer();
    SpreadsheetApp.getUi().alert('Marketing/Social tests passed.');
  } catch(e) {
    SpreadsheetApp.getUi().alert('Mkt/Soc test failed: ' + e.message);
  }
}