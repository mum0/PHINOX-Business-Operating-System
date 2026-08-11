/**
 * Google Sheets custom menu.
 * Updated: Added Tasks + Inventory + Orders + Sales submenus (Phase 2-5)
 * Updated v7B: Added Analytics submenu with KPI Dashboard
 */

function onOpen(e) {
  SpreadsheetApp.getUi()
    .createMenu('🚀 PHINOX BOS')
    .addItem('▶️ Initialize System', 'menuInitialize')
    .addItem('🧪 Run Core Tests', 'menuRunTests')
    .addItem('📊 Open Dashboard', 'showPhinoxDashboard')
    .addSeparator()
    .addSubMenu(
      SpreadsheetApp.getUi()
        .createMenu('📋 Tasks')
        .addItem('📊 Show Stats', 'menuTaskStats')
        .addItem('➕ Create Task', 'menuTaskCreate')
        .addItem('🔄 Refresh Tasks', 'menuTaskRefresh')
        .addItem('🧪 Run Task E2E Tests', 'menuRunTaskTests')
    )
    .addSubMenu(
      SpreadsheetApp.getUi()
        .createMenu('🖥️ Dashboard')
        .addItem('📊 Open Dashboard', 'showPhinoxDashboard')
        .addItem('📱 Sidebar Mode', 'showPhinoxDashboardSidebar')
    )

    .addSubMenu(
      SpreadsheetApp.getUi()
        .createMenu('📦 Inventory')
        .addItem('📊 Show Stats', 'menuInventoryStats')
        .addItem('➕ Add Item', 'menuInventoryCreate')
        .addItem('🧪 Run Inventory E2E Tests', 'menuRunInventoryTests')
    )
    .addSubMenu(
      SpreadsheetApp.getUi()
        .createMenu('📋 Orders')
        .addItem('📊 Show Stats', 'menuOrderStats')
        .addItem('➕ Create Order', 'menuOrderCreate')
        .addItem('🧪 Run Order E2E Tests', 'menuRunOrderTests')
    )
    .addSubMenu(
      SpreadsheetApp.getUi()
        .createMenu('💰 Sales')
        .addItem('📊 Show Stats', 'menuSaleStats')
        .addItem('➕ Create Sale', 'menuSaleCreate')
        .addItem('🧪 Run Sale E2E Tests', 'menuRunSaleTests')
    )

        .addSubMenu(
      SpreadsheetApp.getUi()
        .createMenu('👥 Customers')
        .addItem('📊 Customer Stats', 'menuCustomerStats')
        .addItem('🔄 Sync from Orders', 'menuCustomerSync')
    )
    .addSubMenu(
      SpreadsheetApp.getUi()
        .createMenu('💰 Finance')
        .addItem('📊 Dashboard', 'menuFinanceStats')
        .addItem('📒 View Ledger', 'menuFinanceLedger')
        .addItem('➕ Create Expense', 'menuFinanceCreateExpense')
        .addItem('✅ Approve Expense', 'menuFinanceApproveExpense')
        .addItem('📤 Post Expense', 'menuFinancePostExpense')
        .addItem('🧪 Run Finance Tests', 'menuRunFinanceTests')
    )
    .addSubMenu(
      SpreadsheetApp.getUi()
        .createMenu('📊 Analytics')
        .addItem('📈 Business Dashboard', 'menuKpiDashboard')
        .addItem('🔁 Recalculate All KPIs', 'menuKpiRecalculateAll')
        .addItem('📋 View KPI History', 'menuKpiHistory')
        .addItem('🧪 Run KPI Tests', 'menuRunKpiTests')
        .addItem('🧪 Run Mkt/Soc Tests', 'menuRunMktSocTests')
    )
    .addSubMenu(
      SpreadsheetApp.getUi()
        .createMenu('📣 Marketing')
        .addItem('➕ Enter Marketing Data', 'menuMktEnter')
        .addItem('📥 Import Marketing CSV', 'menuMktImport')
        .addItem('📊 Marketing Dashboard', 'menuMktDashboard')
    )
    .addSubMenu(
      SpreadsheetApp.getUi()
        .createMenu('📱 Social Media')
        .addItem('➕ Enter Social Data', 'menuSocEnter')
        .addItem('📥 Import Social CSV', 'menuSocImport')
        .addItem('📊 Social Dashboard', 'menuSocDashboard')
    )
    .addSubMenu(
      SpreadsheetApp.getUi()
        .createMenu('⚙️ Admin')
        .addItem('👤 Set My Role', 'menuSetRole')
        .addItem('📊 View Logs', 'menuViewLogs')
        .addItem('🔄 Flush Logger', 'menuFlushLogger')
    )
    .addSubMenu(
      SpreadsheetApp.getUi()
        .createMenu('🛠️ Tools')
        .addItem('🗑️ Clear Cache', 'menuClearCache')
        .addItem('📈 Build Index', 'menuBuildIndex')
    )
    .addToUi();

  Logger.info('Menu', 'Menu loaded for ' + Security.currentUser());
}

function menuInitialize() {
  try {
    const result = Setup.run();
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

function menuSetRole() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt('Enter role (admin/ceo/manager/finance/marketing/warehouse/sales/viewer):');
  if (response.getSelectedButton() === ui.Button.OK) {
    const role = response.getResponseText().trim();
    try {
      Security.setUserRole(Security.currentUser(), role);
      ui.alert('Role set to: ' + role);
    } catch (e) {
      ui.alert('Error: ' + e.message);
    }
  }
}

function menuViewLogs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Logs');
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

function menuFinanceStats() { try { FinanceController.showFinanceStats(); } catch(e) { SpreadsheetApp.getUi().alert('Error: ' + e.message); } }
function menuFinanceLedger() { try { FinanceController.showLedger(); } catch(e) { SpreadsheetApp.getUi().alert('Error: ' + e.message); } }
function menuFinanceCreateExpense() { FinanceController.showCreateExpenseForm(); }
function menuFinanceApproveExpense() { FinanceController.showApproveExpense(); }
function menuFinancePostExpense() { FinanceController.showPostExpense(); }
function menuRunFinanceTests() {
  try { testFinanceLayer(); SpreadsheetApp.getUi().alert('Finance tests passed.'); }
  catch(e) { SpreadsheetApp.getUi().alert('Finance test failed: ' + e.message); }
}

// ─── ANALYTICS MENU HANDLERS (v7B) ───

function menuKpiDashboard() {
  try {
    var dashboard = KpiService.getDashboardKpis();
    var html = '<h2>📊 PHINOX Analytics Dashboard</h2>';
    var categories = {
      'Finance': [],
      'Sales': [],
      'Inventory': [],
      'Operations': []
    };

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
      HtmlService.createHtmlOutput(html)
        .setWidth(600)
        .setHeight(700),
      'Analytics Dashboard'
    );

  } catch(e) {
    SpreadsheetApp.getUi().alert('Error: ' + e.message);
  }
}

function menuKpiRecalculateAll() {
  try {
    var result = KpiService.calculateAll();

    var msg =
      'KPIs calculated: ' + result.results.length +
      '\nErrors: ' + (result.errors ? result.errors.length : 0);

    SpreadsheetApp.getUi().alert(msg);

  } catch(e) {
    SpreadsheetApp.getUi().alert('Error: ' + e.message);
  }
}

function menuKpiHistory() {
  try {
    var ui = SpreadsheetApp.getUi();

    var response = ui.prompt(
      'Enter KPI Code (e.g., FIN-01):',
      ui.ButtonSet.OK_CANCEL
    );

    if (response.getSelectedButton() === ui.Button.OK) {

      var kpiId = response.getResponseText().trim();

      var history = KpiService.getKpiHistory(kpiId, 12);

      var html =
        '<h2>📋 ' + kpiId + ' History</h2>' +
        '<table border="1" cellpadding="6" style="border-collapse:collapse;">' +
        '<tr><th>Period</th><th>Value</th></tr>';

      history.forEach(function(h) {
        html += '<tr><td>' + h.period + '</td><td>' +
          Number(h.value).toFixed(2) +
          '</td></tr>';
      });

      html += '</table>';

      ui.showModalDialog(
        HtmlService.createHtmlOutput(html)
          .setWidth(400)
          .setHeight(500),
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
    SpreadsheetApp.getUi().alert(
      'KPI test failed: ' + e.message
    );
  }
}

// ─── END ANALYTICS HANDLERS ───

function menuBuildIndex() {
  const schemas = {
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
      const repo = BaseRepository.create(sheetName, schemas[sheetName]);
      repo.buildIndex();
    } catch (e) {
      Logger.warn('Menu', 'Index build skipped for ' + sheetName, { error: e.message });
    }
  });
  SpreadsheetApp.getUi().alert('Index built for available sheets.');
}

// ─── MARKETING MENU HANDLERS (v7C) ───

function menuMktEnter() { MktSocController.showMarketingForm(); }
function menuMktImport() { MktSocController.showMarketingCsvImport(); }
function menuMktDashboard() { MktSocController.showMarketingDashboard(); }

// ─── SOCIAL MEDIA MENU HANDLERS (v7C) ───

function menuSocEnter() { MktSocController.showSocialForm(); }
function menuSocImport() { MktSocController.showSocialCsvImport(); }
function menuSocDashboard() { MktSocController.showSocialDashboard(); }

// ─── CUSTOMER MENU HANDLERS (Phase 8G) ───
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

// ─── MKT/SOC TEST HANDLER (Phase 8G) ───
function menuRunMktSocTests() {
  try {
    testMktSocLayer();
    SpreadsheetApp.getUi().alert('Marketing/Social tests passed.');
  } catch(e) {
    SpreadsheetApp.getUi().alert('Mkt/Soc test failed: ' + e.message);
  }
}

