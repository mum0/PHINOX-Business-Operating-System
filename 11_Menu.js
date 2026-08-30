/**
 * Google Sheets custom menu.
 * Updated: Added Tasks + Inventory + Orders + Sales submenus (Phase 2-5)
 * Updated v7B: Added Analytics submenu with KPI Dashboard
 * SECURITY FIX (2026-08-27):
 *   - Removed menuSetRole (critical vulnerability: self-escalation)
 *   - Added getCurrentMemberRole() + isAdminRole()
 *   - Admin/Tools menus hidden from non-admins
 *   - Role changes now require Admin Panel or direct sheet edit by admin
 * AUDIT FIX (2026-08-31):
 *   - Added Members submenu with Add/Stats/Test options
 *   - menuAddMember now supports 13-column format (with department)
 *   - Case-insensitive header matching in menuAddMemberSubmit
 */

function onOpen(e) {
  var ui = SpreadsheetApp.getUi();
  var menu = ui.createMenu('PHINOX BOS');

  menu.addItem('Initialize System', 'menuInitialize');
  menu.addItem('Open Dashboard', 'showPhinoxDashboard');
  menu.addItem('Run Core Tests', 'menuRunTests');
  menu.addSeparator();

  // Members submenu
  menu.addSubMenu(
    ui.createMenu('Members')
      .addItem('Add Member', 'menuAddMember')
      .addItem('View Members Stats', 'menuMemberStats')
      .addItem('Run Members Tests', 'menuRunMembersTests')
  );

  menu.addSubMenu(
    ui.createMenu('Tasks')
      .addItem('Show Stats', 'menuTaskStats')
      .addItem('Create Task', 'menuTaskCreate')
      .addItem('Refresh Tasks', 'menuTaskRefresh')
      .addItem('Run Task E2E Tests', 'menuRunTaskTests')
  );

  menu.addSubMenu(
    ui.createMenu('Dashboard')
      .addItem('Open Dashboard', 'showPhinoxDashboard')
      .addItem('Sidebar Mode', 'showPhinoxDashboardSidebar')
  );

  menu.addSubMenu(
    ui.createMenu('Inventory')
      .addItem('Show Stats', 'menuInventoryStats')
      .addItem('Add Item', 'menuInventoryCreate')
      .addItem('Run Inventory E2E Tests', 'menuRunInventoryTests')
  );

  menu.addSubMenu(
    ui.createMenu('Orders')
      .addItem('Show Stats', 'menuOrderStats')
      .addItem('Create Order', 'menuOrderCreate')
      .addItem('Run Order E2E Tests', 'menuRunOrderTests')
  );

  menu.addSubMenu(
    ui.createMenu('Sales')
      .addItem('Show Stats', 'menuSaleStats')
      .addItem('Create Sale', 'menuSaleCreate')
      .addItem('Run Sale E2E Tests', 'menuRunSaleTests')
  );

  menu.addSubMenu(
    ui.createMenu('Customers')
      .addItem('Customer Stats', 'menuCustomerStats')
      .addItem('Sync from Orders', 'menuCustomerSync')
  );

  menu.addSubMenu(
    ui.createMenu('Finance')
      .addItem('Dashboard', 'menuFinanceStats')
      .addItem('View Ledger', 'menuFinanceLedger')
      .addItem('Create Expense', 'menuFinanceCreateExpense')
      .addItem('Approve Expense', 'menuFinanceApproveExpense')
      .addItem('Post Expense', 'menuFinancePostExpense')
      .addItem('Run Finance Tests', 'menuRunFinanceTests')
  );

  menu.addSubMenu(
    ui.createMenu('Analytics')
      .addItem('Business Dashboard', 'menuKpiDashboard')
      .addItem('Recalculate All KPIs', 'menuKpiRecalculateAll')
      .addItem('View KPI History', 'menuKpiHistory')
      .addItem('Run KPI Tests', 'menuRunKpiTests')
      .addItem('Run Mkt/Soc Tests', 'menuRunMktSocTests')
  );

  menu.addSubMenu(
    ui.createMenu('Marketing')
      .addItem('Enter Marketing Data', 'menuMktEnter')
      .addItem('Import Marketing CSV', 'menuMktImport')
      .addItem('Marketing Dashboard', 'menuMktDashboard')
  );

  menu.addSubMenu(
    ui.createMenu('Social Media')
      .addItem('Enter Social Data', 'menuSocEnter')
      .addItem('Import Social CSV', 'menuSocImport')
      .addItem('Social Dashboard', 'menuSocDashboard')
  );

  // Admin & Tools - visible only to admins
  var currentRole = getCurrentMemberRole();
  if (isAdminRole(currentRole)) {
    menu.addSubMenu(
      ui.createMenu('Admin')
        .addItem('View Logs', 'menuViewLogs')
        .addItem('Flush Logger', 'menuFlushLogger')
        .addItem('Audit Log', 'showAuditLog')
    );
    menu.addSubMenu(
      ui.createMenu('Tools')
        .addItem('Clear Cache', 'menuClearCache')
        .addItem('Build Index', 'menuBuildIndex')
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
// SECURITY HELPERS
// ═══════════════════════════════════════════════════

/**
 * Get current user role from Members Sheet (secure, case-insensitive)
 */
function getCurrentMemberRole() {
  try {
    var email = Session.getActiveUser().getEmail();
    if (!email) return 'GUEST';

    // Spreadsheet owner is always treated as Admin
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    try {
      var owner = ss.getOwner().getEmail();
      if (owner && owner.toLowerCase().trim() === email.toLowerCase().trim()) {
        return 'ADMIN';
      }
    } catch (e) {
      // getOwner may fail in some contexts
    }

    var sheetName = (typeof CONFIG !== 'undefined' && CONFIG.SHEETS && CONFIG.SHEETS.MEMBERS)
      ? CONFIG.SHEETS.MEMBERS : 'Members';
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return 'GUEST';

    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    // Case-insensitive header search
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

/**
 * Check if role is admin-level
 */
function isAdminRole(role) {
  if (!role) return false;
  var adminRoles = ['CEO', 'ADMIN', 'SUPER_ADMIN', 'OWNER'];
  var r = role.toUpperCase().trim();
  for (var i = 0; i < adminRoles.length; i++) {
    if (r === adminRoles[i]) return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════
// CORE MENU HANDLERS
// ═══════════════════════════════════════════════════

function menuInitialize() {
  try {
    var result = run();
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
// MEMBERS MENU HANDLERS (2026-08-31)
// ═══════════════════════════════════════════════════

function menuMemberStats() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = (typeof CONFIG !== 'undefined' && CONFIG.SHEETS && CONFIG.SHEETS.MEMBERS)
      ? CONFIG.SHEETS.MEMBERS : 'Members';
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      SpreadsheetApp.getUi().alert('Members sheet not found. Run Setup first.');
      return;
    }

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var total = data.length - 1;
    var active = 0, inactive = 0;
    var roleCount = {};
    var deptCount = {};

    // Find column indices (case-insensitive)
    var statusCol = -1, roleCol = -1, deptCol = -1;
    for (var h = 0; h < headers.length; h++) {
      var hdr = String(headers[h] || '').toLowerCase().trim();
      if (hdr === 'status') statusCol = h;
      if (hdr === 'role') roleCol = h;
      if (hdr === 'department' || hdr === 'dept') deptCol = h;
    }

    for (var i = 1; i < data.length; i++) {
      if (statusCol !== -1) {
        var st = String(data[i][statusCol] || '').toLowerCase().trim();
        if (st === 'active') active++;
        else if (st === 'inactive' || st === 'disabled') inactive++;
        else active++;
      } else {
        active++;
      }
      if (roleCol !== -1) {
        var role = String(data[i][roleCol] || 'Unknown').toUpperCase().trim();
        roleCount[role] = (roleCount[role] || 0) + 1;
      }
      if (deptCol !== -1) {
        var dept = String(data[i][deptCol] || 'Unassigned').trim();
        if (!dept) dept = 'Unassigned';
        deptCount[dept] = (deptCount[dept] || 0) + 1;
      }
    }

    var msg = '=== Members Statistics ===\n';
    msg += 'Total: ' + total + '\n';
    msg += 'Active: ' + active + '\n';
    msg += 'Inactive: ' + inactive + '\n\n';

    msg += '--- By Role ---\n';
    var roles = Object.keys(roleCount);
    for (var r = 0; r < roles.length; r++) {
      msg += roles[r] + ': ' + roleCount[roles[r]] + '\n';
    }

    if (deptCol !== -1 && Object.keys(deptCount).length > 0) {
      msg += '\n--- By Department ---\n';
      var depts = Object.keys(deptCount);
      for (var d = 0; d < depts.length; d++) {
        msg += depts[d] + ': ' + deptCount[depts[d]] + '\n';
      }
    }

    SpreadsheetApp.getUi().alert(msg);
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error: ' + e.message);
  }
}

function menuRunMembersTests() {
  try {
    testMembersLayer();
    SpreadsheetApp.getUi().alert('Members tests passed.');
  } catch (e) {
    SpreadsheetApp.getUi().alert('Members test failed: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════
// ADD MEMBER HANDLER (Updated: 13-column format + department)
// ═══════════════════════════════════════════════════

function menuAddMember() {
  var ui = SpreadsheetApp.getUi();

  var currentRole = getCurrentMemberRole();
  if (!isAdminRole(currentRole)) {
    ui.alert('Access Denied: Admin only');
    return;
  }

  var htmlContent = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' +
    'body{font-family:Arial,sans-serif;padding:20px;max-width:400px;margin:0 auto;}' +
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
    '<div><label>Role *</label><select id="role"><option value="MEMBER">MEMBER</option><option value="MANAGER">MANAGER</option><option value="PARTNER">PARTNER</option><option value="ADMIN">ADMIN</option><option value="CEO">CEO</option></select></div>' +
    '<div><label>Department</label><input type="text" id="department" placeholder="e.g. Operations, Sales, Marketing"></div>' +
    '<div><label>Phone</label><input type="text" id="phone" placeholder="Optional"></div>' +
    '<div><label>Notes</label><input type="text" id="notes" placeholder="Optional"></div>' +
    '<button id="submitBtn" onclick="submitForm()">Add Member</button>' +
    '<div id="result"></div>' +
    '<script>' +
    'function showResult(msg, isError){' +
    '  var el=document.getElementById("result");' +
    '  el.textContent=msg;' +
    '  el.className=isError?"error":"success";' +
    '  el.style.display="block";' +
    '}' +
    'function submitForm(){' +
    '  var btn=document.getElementById("submitBtn");' +
    '  btn.disabled=true;btn.textContent="Adding...";' +
    '  var fullName=document.getElementById("fullName").value.trim();' +
    '  var email=document.getElementById("email").value.trim();' +
    '  var role=document.getElementById("role").value;' +
    '  var department=document.getElementById("department").value.trim();' +
    '  var phone=document.getElementById("phone").value.trim();' +
    '  var notes=document.getElementById("notes").value.trim();' +
    '  if(!fullName||!email){showResult("Full Name and Email are required",true);btn.disabled=false;btn.textContent="Add Member";return;}' +
    '  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){showResult("Invalid email format",true);btn.disabled=false;btn.textContent="Add Member";return;}' +
    '  google.script.run' +
    '    .withSuccessHandler(function(res){showResult("Member added! ID: "+res.id,false);document.getElementById("fullName").value="";document.getElementById("email").value="";document.getElementById("department").value="";document.getElementById("phone").value="";document.getElementById("notes").value="";btn.disabled=false;btn.textContent="Add Member";})' +
    '    .withFailureHandler(function(err){showResult("Error: "+err.message,true);btn.disabled=false;btn.textContent="Add Member";})' +
    '    .menuAddMemberSubmit({fullName:fullName,email:email,role:role,department:department,phone:phone,notes:notes});' +
    '}' +
    '</script></body></html>';

  ui.showModalDialog(HtmlService.createHtmlOutput(htmlContent).setWidth(440).setHeight(600), 'Add New Member');
}

function menuAddMemberSubmit(data) {
  try {
    // Sanitize inputs
    var fullName = data.fullName ? String(data.fullName).trim().substring(0, 100) : "";
    var email = data.email ? String(data.email).trim().toLowerCase() : "";
    var role = data.role ? String(data.role).trim().toUpperCase() : "MEMBER";
    var phone = data.phone ? String(data.phone).trim().substring(0, 50) : "";
    var department = data.department ? String(data.department).trim().substring(0, 50) : "";
    var notes = data.notes ? String(data.notes).trim().substring(0, 500) : "";

    // Validate
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Invalid email address");
    }
    if (!fullName) {
      throw new Error("Full Name is required");
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = (typeof CONFIG !== 'undefined' && CONFIG.SHEETS && CONFIG.SHEETS.MEMBERS)
      ? CONFIG.SHEETS.MEMBERS : 'Members';
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      throw new Error("Members sheet not found. Please run Initialize System first.");
    }

    // Read existing data
    var members = sheet.getDataRange().getValues();
    var headers = members[0];

    // Case-insensitive column detection
    var colMap = {};
    for (var h = 0; h < headers.length; h++) {
      var hdr = String(headers[h] || '').toLowerCase().trim();
      if (hdr === 'id' || hdr === 'member_id') colMap.id = h;
      else if (hdr === 'fullname' || hdr === 'full_name' || hdr === 'name') colMap.fullName = h;
      else if (hdr === 'email') colMap.email = h;
      else if (hdr === 'role') colMap.role = h;
      else if (hdr === 'phone') colMap.phone = h;
      else if (hdr === 'status') colMap.status = h;
      else if (hdr === 'department' || hdr === 'dept') colMap.department = h;
      else if (hdr === 'joindate' || hdr === 'join_date') colMap.joinDate = h;
      else if (hdr === 'kpiscore' || hdr === 'kpi_score') colMap.kpiScore = h;
      else if (hdr === 'taskscompleted' || hdr === 'tasks_completed') colMap.tasksCompleted = h;
      else if (hdr === 'taskslate' || hdr === 'tasks_late') colMap.tasksLate = h;
      else if (hdr === 'averagequality' || hdr === 'average_quality') colMap.averageQuality = h;
      else if (hdr === 'notes') colMap.notes = h;
    }

    // Check duplicate email
    if (colMap.email !== undefined) {
      for (var i = 1; i < members.length; i++) {
        if (String(members[i][colMap.email] || '').toLowerCase().trim() === email) {
          throw new Error("Email already exists: " + email);
        }
      }
    }

    // Check Admin/CEO limit (max 1 each)
    if (role === 'ADMIN' || role === 'CEO') {
      if (colMap.role !== undefined) {
        var count = 0;
        for (var j = 1; j < members.length; j++) {
          if (String(members[j][colMap.role] || '').toUpperCase().trim() === role) count++;
        }
        if (count >= 1) {
          throw new Error("Only one " + role + " allowed. Remove existing " + role + " first.");
        }
      }
    }

    // Generate ID
    var id = 'MEM-' + String(members.length).padStart(3, '0');

    // Build row matching the sheet's 13-column header order
    var row = [];
    for (var h = 0; h < headers.length; h++) {
      var col = String(headers[h] || '').toLowerCase().trim();
      if (col === 'id' || col === 'member_id') row.push(id);
      else if (col === 'fullname' || col === 'full_name' || col === 'name') row.push(fullName);
      else if (col === 'email') row.push(email);
      else if (col === 'role') row.push(role);
      else if (col === 'phone') row.push(phone);
      else if (col === 'department' || col === 'dept') row.push(department || 'General');
      else if (col === 'status') row.push('Active');
      else if (col === 'joindate' || col === 'join_date') row.push(new Date().toISOString().split('T')[0]);
      else if (col === 'kpiscore' || col === 'kpi_score') row.push(0);
      else if (col === 'taskscompleted' || col === 'tasks_completed') row.push(0);
      else if (col === 'taskslate' || col === 'tasks_late') row.push(0);
      else if (col === 'averagequality' || col === 'average_quality') row.push(0);
      else if (col === 'notes') row.push(notes);
      else row.push('');
    }

    sheet.appendRow(row);

    // Audit log
    try {
      if (typeof AuditLog !== 'undefined' && AuditLog.log) {
        AuditLog.log('MEMBER_ADD', id, { email: email, role: role, department: department }, 'SUCCESS');
      }
    } catch (e) {
      console.log('[AuditLog] ' + e.message);
    }

    return { success: true, id: id };
  } catch (e) {
    console.log('[menuAddMemberSubmit] ERROR: ' + e.message);
    throw new Error('Failed to add member: ' + e.message);
  }
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
// ANALYTICS MENU HANDLERS
// ═══════════════════════════════════════════════════

function menuKpiDashboard() {
  try {
    var dashboard = KpiService.getDashboardKpis();
    var html = '<h2>PHINOX Analytics Dashboard</h2>';
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
      var html = '<h2>' + kpiId + ' History</h2>' +
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
// MARKETING MENU HANDLERS
// ═══════════════════════════════════════════════════

function menuMktEnter() { MktSocController.showMarketingForm(); }
function menuMktImport() { MktSocController.showMarketingCsvImport(); }
function menuMktDashboard() { MktSocController.showMarketingDashboard(); }

// ═══════════════════════════════════════════════════
// SOCIAL MEDIA MENU HANDLERS
// ═══════════════════════════════════════════════════

function menuSocEnter() { MktSocController.showSocialForm(); }
function menuSocImport() { MktSocController.showSocialCsvImport(); }
function menuSocDashboard() { MktSocController.showSocialDashboard(); }

// ═══════════════════════════════════════════════════
// CUSTOMER MENU HANDLERS
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
// MKT/SOC TEST HANDLER
// ═══════════════════════════════════════════════════

function menuRunMktSocTests() {
  try {
    testMktSocLayer();
    SpreadsheetApp.getUi().alert('Marketing/Social tests passed.');
  } catch(e) {
    SpreadsheetApp.getUi().alert('Mkt/Soc test failed: ' + e.message);
  }
}