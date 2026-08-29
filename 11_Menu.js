/**
 * Google Sheets custom menu.
 * Updated: Unified member creation (2026-08-30)
 * SECURITY FIX (2026-08-27):
 *   - Removed menuSetRole (critical vulnerability: self-escalation)
 *   - Added getCurrentMemberRole() + isAdminRole()
 */

function onOpen(e) {
  var ui = SpreadsheetApp.getUi();
  var menu = ui.createMenu('🚀 PHINOX BOS');

  menu.addItem('▶️ Initialize System', 'menuInitialize');
  menu.addItem('🧪 Run Core Tests', 'menuRunTests');
  menu.addItem('📊 Open Dashboard', 'showPhinoxDashboard');
  menu.addItem('➕ Add Member', 'menuAddMember');
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
        .addItem('➕ Add Member', 'menuAddMember')
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
  } catch (err) {}
}

// ═══════════════════════════════════════════════════
// SECURITY HELPERS
// ═══════════════════════════════════════════════════

function getCurrentMemberRole() {
  try {
    var email = Session.getActiveUser().getEmail();
    if (!email) return 'GUEST';
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    try {
      var owner = ss.getOwner().getEmail();
      if (owner && owner === email) return 'ADMIN';
    } catch (e) {}
    var sheet = ss.getSheetByName(CONFIG.SHEETS.MEMBERS);
    if (!sheet) return 'GUEST';
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var emailCol = -1, roleCol = -1, statusCol = -1;
    for (var h = 0; h < headers.length; h++) {
      var hdr = String(headers[h] || '').toLowerCase().trim();
      if (hdr === 'email') emailCol = h;
      if (hdr === 'role') roleCol = h;
      if (hdr === 'status') statusCol = h;
    }
    if (emailCol === -1 || roleCol === -1) return 'GUEST';
    for (var i = 1; i < data.length; i++) {
      var rowEmail = String(data[i][emailCol] || '').toLowerCase().trim();
      if (rowEmail === email.toLowerCase().trim()) {
        if (statusCol !== -1) {
          var st = String(data[i][statusCol] || '').toLowerCase().trim();
          if (st === 'inactive' || st === 'disabled') return 'GUEST';
        }
        return String(data[i][roleCol] || 'GUEST').toUpperCase().trim();
      }
    }
    return 'GUEST';
  } catch (e) {
    console.log('[Menu.getCurrentMemberRole] ERROR: ' + e.message);
    return 'GUEST';
  }
}

function isAdminRole(role) {
  if (!role) return false;
  var adminRoles = ['CEO', 'ADMIN', 'SUPER_ADMIN', 'OWNER'];
  return adminRoles.indexOf(role) !== -1;
}

// ═══════════════════════════════════════════════════
// CORE MENU HANDLERS
// ═══════════════════════════════════════════════════

function menuInitialize() {
  try { var result = Setup.run(); SpreadsheetApp.getUi().alert(result); }
  catch (e) { SpreadsheetApp.getUi().alert('Error: ' + e.message); }
}

function menuRunTests() {
  try { testCoreLayer(); SpreadsheetApp.getUi().alert('Tests passed.'); }
  catch (e) { SpreadsheetApp.getUi().alert('Test failed: ' + e.message); }
}

function menuViewLogs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Logs');
  if (sheet) ss.setActiveSheet(sheet);
}

function menuFlushLogger() { Logger.flush(); SpreadsheetApp.getUi().alert('Logger flushed.'); }
function menuClearCache() { CacheService.getScriptCache().removeAll(); SpreadsheetApp.getUi().alert('Cache cleared.'); }

// ═══════════════════════════════════════════════════
// FINANCE MENU HANDLERS
// ═══════════════════════════════════════════════════

function menuFinanceStats() { try { FinanceController.showFinanceStats(); } catch(e) { SpreadsheetApp.getUi().alert('Error: ' + e.message); } }
function menuFinanceLedger() { try { FinanceController.showLedger(); } catch(e) { SpreadsheetApp.getUi().alert('Error: ' + e.message); } }
function menuFinanceCreateExpense() { FinanceController.showCreateExpenseForm(); }
function menuFinanceApproveExpense() { FinanceController.showApproveExpense(); }
function menuFinancePostExpense() { FinanceController.showPostExpense(); }
function menuRunFinanceTests() { try { testFinanceLayer(); SpreadsheetApp.getUi().alert('Finance tests passed.'); } catch(e) { SpreadsheetApp.getUi().alert('Finance test failed: ' + e.message); } }

// ═══════════════════════════════════════════════════
// ANALYTICS MENU HANDLERS
// ═══════════════════════════════════════════════════

function menuKpiDashboard() {
  try {
    var dashboard = KpiService.getDashboardKpis();
    var html = '<h2>📊 PHINOX Analytics</h2>';
    var categories = { 'Finance': [], 'Sales': [], 'Inventory': [], 'Operations': [] };
    Object.keys(dashboard).forEach(function(k) {
      var item = dashboard[k];
      if (categories[item.category]) categories[item.category].push(item);
    });
    Object.keys(categories).forEach(function(cat) {
      html += '<h3>' + cat + '</h3><table border="1" cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;"><tr><th>KPI</th><th>Value</th><th>Unit</th></tr>';
      categories[cat].forEach(function(item) { html += '<tr><td>' + item.name + '</td><td>' + Number(item.value).toFixed(2) + '</td><td>' + item.unit + '</td></tr>'; });
      html += '</table>';
    });
    SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(600).setHeight(700), 'Analytics');
  } catch(e) { SpreadsheetApp.getUi().alert('Error: ' + e.message); }
}

function menuKpiRecalculateAll() { try { var r = KpiService.calculateAll(); SpreadsheetApp.getUi().alert('KPIs calculated: ' + r.results.length); } catch(e) { SpreadsheetApp.getUi().alert('Error: ' + e.message); } }
function menuKpiHistory() { try { var ui = SpreadsheetApp.getUi(); var r = ui.prompt('KPI Code:', ui.ButtonSet.OK_CANCEL); if (r.getSelectedButton() === ui.Button.OK) { var h = KpiService.getKpiHistory(r.getResponseText().trim(), 12); var html = '<h2>📋 KPI History</h2><table border="1" cellpadding="6"><tr><th>Period</th><th>Value</th></tr>'; h.forEach(function(x) { html += '<tr><td>' + x.period + '</td><td>' + Number(x.value).toFixed(2) + '</td></tr>'; }); html += '</table>'; ui.showModalDialog(HtmlService.createHtmlOutput(html).setWidth(400).setHeight(500), 'KPI History'); } } catch(e) { SpreadsheetApp.getUi().alert('Error: ' + e.message); } }
function menuRunKpiTests() { try { testKpiLayer(); SpreadsheetApp.getUi().alert('KPI tests passed.'); } catch(e) { SpreadsheetApp.getUi().alert('KPI test failed: ' + e.message); } }

// ═══════════════════════════════════════════════════
// TOOLS MENU HANDLERS
// ═══════════════════════════════════════════════════

function menuBuildIndex() {
  var schemas = { 'Tasks': { id: 1 }, 'Members': { id: 1 }, 'Inventory': { id: 1 }, 'Orders': { id: 1 }, 'Sales': { id: 1 }, 'Finance Ledger': { id: 1 }, 'Finance Expenses': { id: 1 }, 'KPI Results': { id: 1 }, 'Customers': { id: 1 }, 'Satisfaction': { id: 1 }, 'NPS': { id: 1 } };
  Object.keys(schemas).forEach(function(sheetName) { try { BaseRepository.create(sheetName, schemas[sheetName]).buildIndex(); } catch (e) {} });
  SpreadsheetApp.getUi().alert('Index built.');
}

// ═══════════════════════════════════════════════════
// MARKETING / SOCIAL MENU HANDLERS
// ═══════════════════════════════════════════════════

function menuMktEnter() { MktSocController.showMarketingForm(); }
function menuMktImport() { MktSocController.showMarketingCsvImport(); }
function menuMktDashboard() { MktSocController.showMarketingDashboard(); }
function menuSocEnter() { MktSocController.showSocialForm(); }
function menuSocImport() { MktSocController.showSocialCsvImport(); }
function menuSocDashboard() { MktSocController.showSocialDashboard(); }

// ═══════════════════════════════════════════════════
// CUSTOMER MENU HANDLERS
// ═══════════════════════════════════════════════════

function menuCustomerStats() { try { var s = CustomerService.getCustomerStats(); SpreadsheetApp.getUi().alert('Total: ' + s.total + '\nActive: ' + s.active + '\nNew: ' + s.newThisMonth); } catch(e) { SpreadsheetApp.getUi().alert('Error: ' + e.message); } }
function menuCustomerSync() { try { var c = CustomerService.syncFromOrders(); SpreadsheetApp.getUi().alert('Synced ' + c + ' customers.'); } catch(e) { SpreadsheetApp.getUi().alert('Error: ' + e.message); } }
function menuRunMktSocTests() { try { testMktSocLayer(); SpreadsheetApp.getUi().alert('Tests passed.'); } catch(e) { SpreadsheetApp.getUi().alert('Test failed: ' + e.message); } }

// ═══════════════════════════════════════════════════════════════
// UNIFIED ADD MEMBER (Menu Path)
// ═══════════════════════════════════════════════════════════════
// Uses same ID format, 13 columns, and Title Case roles as all other paths.
// ═══════════════════════════════════════════════════════════════

function menuAddMember() {
  var ui = SpreadsheetApp.getUi();
  if (!isAdminRole(getCurrentMemberRole())) { ui.alert('Access Denied: Admin only'); return; }

  var htmlContent = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' +
    'body{font-family:Arial,sans-serif;padding:20px;max-width:380px;margin:0 auto;}' +
    'label{display:block;margin-top:14px;font-weight:bold;font-size:13px;color:#333;}' +
    'input,select{width:100%;padding:10px;margin-top:6px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;font-size:14px;}' +
    'input:focus,select:focus{outline:none;border-color:#4285f4;}' +
    'button{margin-top:20px;padding:12px 24px;background:#1a73e8;color:white;border:none;border-radius:6px;cursor:pointer;font-size:15px;width:100%;}' +
    'button:hover{background:#1557b0;}' +
    'button:disabled{background:#ccc;cursor:not-allowed;}' +
    '#result{margin-top:14px;padding:10px;border-radius:6px;font-size:13px;display:none;}' +
    '#result.error{background:#fce8e6;color:#d93025;border:1px solid #f5c6cb;}' +
    '#result.success{background:#e6f4ea;color:#188038;border:1px solid #c6e7cf;}' +
    '</style></head><body>' +
    '<h2 style="margin-top:0;color:#1a73e8;">Add New Member</h2>' +
    '<div><label>Full Name *</label><input type="text" id="fullName" placeholder="Enter full name"></div>' +
    '<div><label>Email *</label><input type="email" id="email" placeholder="Enter email address"></div>' +
    '<div><label>Role *</label><select id="role"><option value="Operations">Operations</option><option value="Manager">Manager</option><option value="Partner">Partner</option><option value="Admin">Admin</option><option value="CEO">CEO</option></select></div>' +
    '<div><label>Phone</label><input type="text" id="phone" placeholder="Optional"></div>' +
    '<div><label>Notes</label><input type="text" id="notes" placeholder="Optional"></div>' +
    '<button id="submitBtn" onclick="submitForm()">Add Member</button>' +
    '<div id="result"></div>' +
    '<script>' +
    'function showResult(msg,isError){var el=document.getElementById("result");el.textContent=msg;el.className=isError?"error":"success";el.style.display="block";}' +
    'function submitForm(){' +
    '  var btn=document.getElementById("submitBtn");btn.disabled=true;btn.textContent="Adding...";' +
    '  var d={fullName:document.getElementById("fullName").value.trim(),email:document.getElementById("email").value.trim(),role:document.getElementById("role").value,phone:document.getElementById("phone").value.trim(),notes:document.getElementById("notes").value.trim()};' +
    '  if(!d.fullName||!d.email){showResult("Name and Email required",true);btn.disabled=false;btn.textContent="Add Member";return;}' +
    '  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)){showResult("Invalid email",true);btn.disabled=false;btn.textContent="Add Member";return;}' +
    '  google.script.run' +
    '    .withSuccessHandler(function(res){showResult("Member added! ID: "+res.id,false);document.getElementById("fullName").value="";document.getElementById("email").value="";document.getElementById("phone").value="";document.getElementById("notes").value="";btn.disabled=false;btn.textContent="Add Member";})' +
    '    .withFailureHandler(function(err){showResult("Error: "+err.message,true);btn.disabled=false;btn.textContent="Add Member";})' +
    '    .menuAddMemberSubmit(d);' +
    '}' +
    '</script></body></html>';

  ui.showModalDialog(HtmlService.createHtmlOutput(htmlContent).setWidth(420).setHeight(520), 'Add New Member');
}

function menuAddMemberSubmit(data) {
  try {
    var fullName = String(data.fullName || '').trim().substring(0, 100);
    var email = String(data.email || '').trim().toLowerCase();
    var rawRole = String(data.role || 'Operations').trim();
    var role = rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase();
    var phone = String(data.phone || '').trim().substring(0, 50);
    var notes = String(data.notes || '').trim().substring(0, 500);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email');
    if (!fullName) throw new Error('Full Name is required');

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = (typeof CONFIG !== 'undefined' && CONFIG.SHEETS && CONFIG.SHEETS.MEMBERS) ? CONFIG.SHEETS.MEMBERS : 'Members';
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error('Members sheet not found. Run Setup first.');

    // Ensure 13 columns
    var lastCol = sheet.getLastColumn();
    if (lastCol < 13) {
      for (var c = lastCol + 1; c <= 13; c++) {
        var hdr = (c === 13) ? 'password' : '';
        sheet.getRange(1, c, 1, 1).setValue(hdr);
        sheet.getRange(1, c, 1, 1).setFontWeight('bold').setBackground('#1a237e').setFontColor('#ffffff');
        sheet.setColumnWidth(c, 30);
      }
    }

    // Read existing & check duplicate (col 3 = email)
    var members = sheet.getDataRange().getValues();
    for (var i = 1; i < members.length; i++) {
      if (String(members[i][3] || '').toLowerCase() === email) {
        throw new Error('Email already exists: ' + email);
      }
    }

    // Check Admin/CEO limit
    if (role === 'Admin' || role === 'CEO') {
      var count = 0;
      for (var j = 1; j < members.length; j++) {
        if (String(members[j][2] || '') === role) count++;
      }
      if (count >= 1) throw new Error('Only one ' + role + ' allowed.');
    }

    // Unified ID (same as UI + Registration paths)
    var id = _generateMemberId();

    // Fixed 13-column row
    var row = [
      id,
      fullName,
      role,
      email,
      phone,
      'Active',
      new Date().toISOString().split('T')[0],
      0, 0, 0, 0,
      notes,
      ''
    ];

    sheet.appendRow(row);
    console.log('[menuAddMemberSubmit] Created ' + id + ' (' + email + ') role=' + role);
    return { success: true, id: id };
  } catch (e) {
    console.log('[menuAddMemberSubmit] ERROR: ' + e.message);
    throw new Error('Failed to add member: ' + e.message);
  }
}