/**
 * ═══════════════════════════════════════════════════════════════════════
 * PHINOX BOS v6 — Google Sheets Custom Menu
 * ═══════════════════════════════════════════════════════════════════════
 *
 * UPDATED FOR v6 (2026-08-31):
 *   - Added "Open Web App" launcher (v6 primary interface is web app via doGet)
 *   - Added Authentication submenu (session management, password reset, locked accounts)
 *   - Added Satisfaction & NPS submenu
 *   - Added BOM (Bill of Materials) submenu
 *   - Enhanced Admin menu (auth sessions, rate limit stats, session cleanup)
 *   - Reorganized menu structure for better UX
 *   - Updated member form to match 12-column schema
 *   - All handlers aligned with v6 service architecture
 *
 * SECURITY (retained from previous audit):
 *   - No menuSetRole (prevents self-escalation)
 *   - Admin/Tools menus hidden from non-admins via getCurrentMemberRole()
 *   - Role changes only via Admin Panel or direct sheet edit
 *
 * DEPENDENCIES:
 *   - 00_Config.gs (CONFIG)
 *   - 01_Auth.js (Auth)
 *   - 02_AuthSession.js (AuthSession)
 *   - 15_Members.js (Members, MEMBER_COL)
 *   - Controllers: TaskController, InventoryController, OrderController,
 *     SaleController, FinanceController, MktSocController, KpiService,
 *     CustomerService, SatisfactionService, NPSService, BOMService
 * ═══════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════
// MENU REGISTRATION (onOpen)
// ═══════════════════════════════════════════════════

function onOpen(e) {
  var ui = SpreadsheetApp.getUi();
  var menu = ui.createMenu('⚙ PHINOX BOS v6');

  // ── Quick Actions ──
  menu.addItem('🌐  Open Web App', 'menuOpenWebApp');
  menu.addItem('🚀  Initialize System', 'menuInitialize');
  menu.addItem('🧪  Run Core Tests', 'menuRunTests');
  menu.addSeparator();

  // ── Authentication (NEW in v6) ──
  menu.addSubMenu(
    ui.createMenu('🔐 Authentication')
      .addItem('View Active Sessions', 'menuAuthSessions')
      .addItem('Reset User Password', 'menuAuthResetPassword')
      .addItem('View Locked Accounts', 'menuAuthLockedAccounts')
      .addItem('Unlock Account', 'menuAuthUnlockAccount')
      .addItem('Cleanup Expired Sessions', 'menuAuthCleanup')
  );

  // ── Members ──
  menu.addSubMenu(
    ui.createMenu('👥 Members')
      .addItem('Add Member', 'menuAddMember')
      .addItem('View Members Stats', 'menuMemberStats')
      .addItem('Run Members Tests', 'menuRunMembersTests')
  );

  // ── Tasks ──
  menu.addSubMenu(
    ui.createMenu('📋 Tasks')
      .addItem('Show Stats', 'menuTaskStats')
      .addItem('Create Task', 'menuTaskCreate')
      .addItem('Refresh Tasks', 'menuTaskRefresh')
      .addItem('Run Task E2E Tests', 'menuRunTaskTests')
  );

  // ── Inventory ──
  menu.addSubMenu(
    ui.createMenu('📦 Inventory')
      .addItem('Show Stats', 'menuInventoryStats')
      .addItem('Add Item', 'menuInventoryCreate')
      .addItem('Run Inventory E2E Tests', 'menuRunInventoryTests')
  );

  // ── Orders ──
  menu.addSubMenu(
    ui.createMenu('🛒 Orders')
      .addItem('Show Stats', 'menuOrderStats')
      .addItem('Create Order', 'menuOrderCreate')
      .addItem('Run Order E2E Tests', 'menuRunOrderTests')
  );

  // ── Sales ──
  menu.addSubMenu(
    ui.createMenu('💰 Sales')
      .addItem('Show Stats', 'menuSaleStats')
      .addItem('Create Sale', 'menuSaleCreate')
      .addItem('Run Sale E2E Tests', 'menuRunSaleTests')
  );

  // ── Customers ──
  menu.addSubMenu(
    ui.createMenu('🤝 Customers')
      .addItem('Customer Stats', 'menuCustomerStats')
      .addItem('Sync from Orders', 'menuCustomerSync')
  );

  // ── Finance ──
  menu.addSubMenu(
    ui.createMenu('💳 Finance')
      .addItem('Dashboard', 'menuFinanceStats')
      .addItem('View Ledger', 'menuFinanceLedger')
      .addItem('Create Expense', 'menuFinanceCreateExpense')
      .addItem('Approve Expense', 'menuFinanceApproveExpense')
      .addItem('Post Expense', 'menuFinancePostExpense')
      .addItem('Run Finance Tests', 'menuRunFinanceTests')
  );

  // ── Analytics ──
  menu.addSubMenu(
    ui.createMenu('📊 Analytics')
      .addItem('Business Dashboard', 'menuKpiDashboard')
      .addItem('Recalculate All KPIs', 'menuKpiRecalculateAll')
      .addItem('View KPI History', 'menuKpiHistory')
      .addItem('Run KPI Tests', 'menuRunKpiTests')
      .addItem('Run Mkt/Soc Tests', 'menuRunMktSocTests')
  );

  // ── Marketing (NEW: separated from Social) ──
  menu.addSubMenu(
    ui.createMenu('📣 Marketing')
      .addItem('Enter Marketing Data', 'menuMktEnter')
      .addItem('Import Marketing CSV', 'menuMktImport')
      .addItem('Marketing Dashboard', 'menuMktDashboard')
  );

  // ── Social Media ──
  menu.addSubMenu(
    ui.createMenu('📱 Social Media')
      .addItem('Enter Social Data', 'menuSocEnter')
      .addItem('Import Social CSV', 'menuSocImport')
      .addItem('Social Dashboard', 'menuSocDashboard')
  );

  // ── Satisfaction & NPS (NEW in v6) ──
  menu.addSubMenu(
    ui.createMenu('⭐ Satisfaction & NPS')
      .addItem('Satisfaction Stats', 'menuSatisfactionStats')
      .addItem('NPS Stats', 'menuNpsStats')
      .addItem('Run Satisfaction Tests', 'menuRunSatisfactionTests')
  );

  // ── BOM — Bill of Materials (NEW in v6) ──
  menu.addSubMenu(
    ui.createMenu('🔧 BOM')
      .addItem('View BOM Items', 'menuBomView')
      .addItem('BOM Stats', 'menuBomStats')
      .addItem('Run BOM Tests', 'menuRunBomTests')
  );

  // ── Admin & Tools (admin-only) ──
  var currentRole = getCurrentMemberRole();
  if (isAdminRole(currentRole)) {
    menu.addSeparator();
    menu.addSubMenu(
      ui.createMenu('🛡️ Admin')
        .addItem('View Logs', 'menuViewLogs')
        .addItem('Flush Logger', 'menuFlushLogger')
        .addItem('Pending Registrations', 'menuShowPendingRegistrations')
        .addItem('Audit Log', 'showAuditLog')
        .addSeparator()
        .addItem('Auth Session Summary', 'menuAdminSessionSummary')
        .addItem('Rate Limit Stats', 'menuAdminRateLimitStats')
        .addItem('Force Cleanup Sessions', 'menuAuthCleanup')
    );
    menu.addSubMenu(
      ui.createMenu('🔧 Tools')
        .addItem('Clear Cache', 'menuClearCache')
        .addItem('Build Index', 'menuBuildIndex')
        .addItem('Run Full Test Suite', 'menuRunAllTests')
    );
  }

  menu.addToUi();

  try {
    Logger.info('Menu', 'v6 menu loaded for ' + Session.getActiveUser().getEmail());
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

/**
 * Open the v6 Web App in a new tab
 */
function menuOpenWebApp() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var scriptId = ScriptApp.getScriptId();
    var url = 'https://script.google.com/macros/s/' + scriptId + '/exec';
    SpreadsheetApp.getUi().alert(
      'PHINOX BOS v6 - Web App URL:\n\n' + url +
      '\n\nThis link opens the full web interface. \n'+
      'You can also deploy it as a web app from Publish > Deploy as web app.'
    );
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error: ' + e.message);
  }
}

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
    SpreadsheetApp.getUi().alert('Core tests passed. Check console logs.');
  } catch (e) {
    SpreadsheetApp.getUi().alert('Test failed: ' + e.message);
  }
}

function menuRunAllTests() {
  try {
    var results = [];
    var tests = [
      { name: 'Core', fn: testCoreLayer },
      { name: 'Members', fn: testMembersLayer },
      { name: 'Tasks', fn: testTaskLayer },
      { name: 'Inventory', fn: testInventoryLayer },
      { name: 'Orders', fn: testOrderLayer },
      { name: 'Sales', fn: testSaleLayer },
      { name: 'Finance', fn: testFinanceLayer },
      { name: 'KPI', fn: testKpiLayer },
      { name: 'Mkt/Soc', fn: testMktSocLayer }
    ];
    for (var i = 0; i < tests.length; i++) {
      try {
        tests[i].fn();
        results.push('  ✅ ' + tests[i].name + ': PASSED');
      } catch (e) {
        results.push('  ❌ ' + tests[i].name + ': FAILED — ' + e.message);
      }
    }
    SpreadsheetApp.getUi().alert('=== Full Test Suite ===\n' + results.join('\n'));
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error running tests: ' + e.message);
  }
}

function menuViewLogs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = (typeof CONFIG !== 'undefined' && CONFIG.SHEETS && CONFIG.SHEETS.AUDIT)
    ? CONFIG.SHEETS.AUDIT : 'Logs';
  var sheet = ss.getSheetByName(sheetName);
  if (sheet) {
    ss.setActiveSheet(sheet);
  } else {
    SpreadsheetApp.getUi().alert('Logs sheet ("' + sheetName + '") not found.');
  }
}

function menuFlushLogger() {
  Logger.flush();
  SpreadsheetApp.getUi().alert('Logger flushed.');
}

function menuClearCache() {
  CacheService.getScriptCache().removeAll();
  SpreadsheetApp.getUi().alert('Script cache cleared.');
}

// ═══════════════════════════════════════════════════
// AUTHENTICATION MENU HANDLERS (NEW in v6)
// ═══════════════════════════════════════════════════

/**
 * View active auth sessions from ScriptProperties
 */
function menuAuthSessions() {
  try {
    var props = PropertiesService.getScriptProperties();
    var keys = props.getKeys();
    var sessions = [];
    var nowMs = Date.now();

    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf('PHINOX_AUTH_') === 0) {
        var data = props.getProperty(keys[i]);
        if (data) {
          try {
            var parsed = JSON.parse(data);
            var expiresMs = new Date(parsed.expiresAt).getTime();
            var isExpired = expiresMs < nowMs;
            sessions.push({
              token: keys[i].substring('PHINOX_AUTH_'.length).substring(0, 8) + '...',
              email: parsed.email || 'N/A',
              memberId: parsed.memberId || 'N/A',
              createdAt: parsed.createdAt || 'N/A',
              expiresAt: parsed.expiresAt || 'N/A',
              status: isExpired ? 'EXPIRED' : 'ACTIVE'
            });
          } catch(e) {
            sessions.push({ token: keys[i], status: 'PARSE_ERROR' });
          }
        }
      }
    }

    if (sessions.length === 0) {
      SpreadsheetApp.getUi().alert('No active sessions found.');
      return;
    }

    var msg = '=== Auth Sessions (' + sessions.length + ') ===\n\n';
    for (var j = 0; j < sessions.length; j++) {
      var s = sessions[j];
      msg += 'Token: ' + s.token + '\n';
      if (s.email) msg += '  Email: ' + s.email + '\n';
      if (s.memberId) msg += '  Member ID: ' + s.memberId + '\n';
      msg += '  Status: ' + s.status + '\n';
      msg += '  Created: ' + (s.createdAt || 'N/A') + '\n';
      msg += '  Expires: ' + (s.expiresAt || 'N/A') + '\n\n';
    }

    SpreadsheetApp.getUi().alert(msg);
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error: ' + e.message);
  }
}

/**
 * Reset a user's password (generates reset token)
 */
function menuAuthResetPassword() {
  try {
    var ui = SpreadsheetApp.getUi();
    var response = ui.prompt('Reset Password', 'Enter the member email:', ui.ButtonSet.OK_CANCEL);
    if (response.getSelectedButton() !== ui.Button.OK) return;

    var email = response.getResponseText().trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      ui.alert('Invalid email address.');
      return;
    }

    // Check if member exists
    var member = null;
    try {
      member = (typeof getMemberByEmail === 'function') ? getMemberByEmail(email) : null;
    } catch(e) {}

    if (!member) {
      ui.alert('Member not found: ' + email);
      return;
    }

    // Create reset token
    var resetToken = null;
    try {
      if (typeof AuthSession !== 'undefined' && AuthSession.createResetToken) {
        resetToken = AuthSession.createResetToken(email);
      }
    } catch(e) {}

    if (resetToken) {
      ui.alert(
        'Password reset token generated for: ' + email + '\n\n' +
        'Reset Token: ' + resetToken + '\n\n' +
        'This token expires in 1 hour. \n' +
        'The user can use it in the web app to set a new password.'
      );
    } else {
      ui.alert('AuthSession module not available. Cannot generate reset token.');
    }
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error: ' + e.message);
  }
}

/**
 * View locked accounts (accounts with too many failed login attempts)
 */
function menuAuthLockedAccounts() {
  try {
    var cache = CacheService.getScriptCache();
    var props = PropertiesService.getScriptProperties();
    var allKeys = [];

    // Check cache
    try {
      // We can't list all cache keys, so we scan Members and check each
    } catch(e) {}

    // Scan members and check lock status
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = (typeof CONFIG !== 'undefined' && CONFIG.SHEETS && CONFIG.SHEETS.MEMBERS)
      ? CONFIG.SHEETS.MEMBERS : 'Members';
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      SpreadsheetApp.getUi().alert('Members sheet not found.');
      return;
    }

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var emailCol = -1;
    for (var h = 0; h < headers.length; h++) {
      if (String(headers[h] || '').toLowerCase().trim() === 'email') { emailCol = h; break; }
    }
    if (emailCol === -1) {
      SpreadsheetApp.getUi().alert('Email column not found in Members sheet.');
      return;
    }

    var locked = [];
    for (var i = 1; i < data.length; i++) {
      var email = String(data[i][emailCol] || '').trim().toLowerCase();
      if (!email) continue;
      var isAccountLocked = false;
      try {
        if (typeof AuthSession !== 'undefined' && AuthSession.isLocked) {
          isAccountLocked = AuthSession.isLocked(email);
        }
      } catch(e) {}
      if (isAccountLocked) {
        locked.push(email);
      }
    }

    if (locked.length === 0) {
      SpreadsheetApp.getUi().alert('No locked accounts found.');
    } else {
      SpreadsheetApp.getUi().alert(
        '=== Locked Accounts (' + locked.length + ') ===\n\n' +
        locked.join('\n') +
        '\n\nUse "Unlock Account" to release them.'
      );
    }
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error: ' + e.message);
  }
}

/**
 * Unlock a locked account
 */
function menuAuthUnlockAccount() {
  try {
    var ui = SpreadsheetApp.getUi();
    var response = ui.prompt('Unlock Account', 'Enter the email to unlock:', ui.ButtonSet.OK_CANCEL);
    if (response.getSelectedButton() !== ui.Button.OK) return;

    var email = response.getResponseText().trim().toLowerCase();
    if (!email) {
      ui.alert('Email is required.');
      return;
    }

    try {
      if (typeof AuthSession !== 'undefined' && AuthSession.clearFailedAttempts) {
        AuthSession.clearFailedAttempts(email);
        ui.alert('Account unlocked: ' + email);
      } else {
        ui.alert('AuthSession module not available.');
      }
    } catch(e) {
      ui.alert('Error: ' + e.message);
    }
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error: ' + e.message);
  }
}

/**
 * Cleanup expired sessions from ScriptProperties
 */
function menuAuthCleanup() {
  try {
    var cleaned = 0;
    try {
      if (typeof AuthSession !== 'undefined' && AuthSession.cleanup) {
        AuthSession.cleanup();
        // We don't get the count directly, so check before/after
      }
    } catch(e) {}

    // Also clean reset tokens
    try {
      var props = PropertiesService.getScriptProperties();
      var keys = props.getKeys();
      for (var i = 0; i < keys.length; i++) {
        if (keys[i].indexOf('PHINOX_RESET_') === 0) {
          var data = props.getProperty(keys[i]);
          if (data) {
            try {
              var parsed = JSON.parse(data);
              if (new Date(parsed.expiresAt).getTime() < Date.now()) {
                props.deleteProperty(keys[i]);
                cleaned++;
              }
            } catch(e) {
              props.deleteProperty(keys[i]);
              cleaned++;
            }
          }
        }
      }
    } catch(e) {}

    SpreadsheetApp.getUi().alert('Session cleanup completed.\nExpired entries removed: ' + cleaned);
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════
// MEMBERS MENU HANDLERS
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

    // Find column indices (case-insensitive)
    var statusCol = -1, roleCol = -1;
    for (var h = 0; h < headers.length; h++) {
      var hdr = String(headers[h] || '').toLowerCase().trim();
      if (hdr === 'status') statusCol = h;
      if (hdr === 'role') roleCol = h;
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
// ADD MEMBER HANDLER (v6: 12-column schema)
// ═══════════════════════════════════════════════════

function menuAddMember() {
  var ui = SpreadsheetApp.getUi();

  var currentRole = getCurrentMemberRole();
  if (!isAdminRole(currentRole)) {
    ui.alert('Access Denied: Admin only');
    return;
  }

  var htmlContent = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' +
    'body{font-family:Arial,sans-serif;padding:20px;max-width:420px;margin:0 auto;background:#f8f9fa;}' +
    'h2{margin:0 0 20px 0;color:#1a237e;font-size:20px;}' +
    '.form-group{margin-bottom:16px;}' +
    'label{display:block;margin-bottom:6px;font-weight:600;font-size:13px;color:#37474f;}' +
    'input,select{width:100%;padding:10px 12px;border:1px solid #cfd8dc;border-radius:8px;box-sizing:border-box;font-size:14px;background:#fff;transition:border-color 0.2s;}' +
    'input:focus,select:focus{outline:none;border-color:#1a73e8;box-shadow:0 0 0 3px rgba(26,115,232,0.1);}' +
    '.btn{margin-top:20px;padding:12px 24px;background:#1a73e8;color:white;border:none;border-radius:8px;cursor:pointer;font-size:15px;width:100%;font-weight:600;transition:background 0.2s;}' +
    '.btn:hover{background:#1557b0;}' +
    '.btn:disabled{background:#b0bec5;cursor:not-allowed;}' +
    '.info{margin-top:16px;padding:12px;background:#e3f2fd;border-radius:8px;font-size:12px;color:#1565c0;line-height:1.5;}' +
    '#result{margin-top:14px;padding:12px;border-radius:8px;font-size:13px;display:none;}' +
    '#result.error{background:#fce8e6;color:#d93025;border:1px solid #f5c6cb;}' +
    '#result.success{background:#e6f4ea;color:#188038;border:1px solid #c6e7cf;}' +
    '</style></head><body>' +
    '<h2>Add New Member</h2>' +
    '<div class="form-group"><label>Full Name *</label><input type="text" id="fullName" placeholder="Enter full name"></div>' +
    '<div class="form-group"><label>Email *</label><input type="email" id="email" placeholder="member@company.com"></div>' +
    '<div class="form-group"><label>Role *</label><select id="role"><option value="MEMBER">MEMBER</option><option value="MANAGER">MANAGER</option><option value="PARTNER">PARTNER</option><option value="ADMIN">ADMIN</option><option value="CEO">CEO</option></select></div>' +
    '<div class="form-group"><label>Phone</label><input type="text" id="phone" placeholder="Optional"></div>' +
    '<div class="form-group"><label>Notes</label><input type="text" id="notes" placeholder="Optional"></div>' +
    '<button class="btn" id="submitBtn" onclick="submitForm()">Add Member</button>' +
    '<div id="result"></div>' +
    '<div class="info">After adding, the member can log in via the Web App and set their password.</div>' +
    '<script>' +
    'function showResult(msg,isError){' +
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
    '  var phone=document.getElementById("phone").value.trim();' +
    '  var notes=document.getElementById("notes").value.trim();' +
    '  if(!fullName||!email){showResult("Full Name and Email are required",true);btn.disabled=false;btn.textContent="Add Member";return;}' +
    '  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){showResult("Invalid email format",true);btn.disabled=false;btn.textContent="Add Member";return;}' +
    '  google.script.run' +
    '    .withSuccessHandler(function(res){showResult("Member added! ID: "+res.id,false);document.getElementById("fullName").value="";document.getElementById("email").value="";document.getElementById("phone").value="";document.getElementById("notes").value="";btn.disabled=false;btn.textContent="Add Member";})' +
    '    .withFailureHandler(function(err){showResult("Error: "+err.message,true);btn.disabled=false;btn.textContent="Add Member";})' +
    '    .menuAddMemberSubmit({fullName:fullName,email:email,role:role,phone:phone,notes:notes});' +
    '}' +
    '</script></body></html>';

  ui.showModalDialog(HtmlService.createHtmlOutput(htmlContent).setWidth(460).setHeight(580), 'Add New Member');
}

function menuAddMemberSubmit(data) {
  try {
    // Sanitize inputs
    var fullName = data.fullName ? String(data.fullName).trim().substring(0, 100) : "";
    var email = data.email ? String(data.email).trim().toLowerCase() : "";
    var role = data.role ? String(data.role).trim().toUpperCase() : "MEMBER";
    var phone = data.phone ? String(data.phone).trim().substring(0, 50) : "";
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

    // Build row matching the sheet's column header order
    var row = [];
    for (var h = 0; h < headers.length; h++) {
      var col = String(headers[h] || '').toLowerCase().trim();
      if (col === 'id' || col === 'member_id') row.push(id);
      else if (col === 'fullname' || col === 'full_name' || col === 'name') row.push(fullName);
      else if (col === 'email') row.push(email);
      else if (col === 'role') row.push(role);
      else if (col === 'phone') row.push(phone);
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
        AuditLog.log('MEMBER_ADD', id, { email: email, role: role }, 'SUCCESS');
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
    var html = '<h2 style="color:#1a237e;">PHINOX Analytics Dashboard</h2>';
    var categories = { 'Finance': [], 'Sales': [], 'Inventory': [], 'Operations': [] };

    Object.keys(dashboard).forEach(function(k) {
      var item = dashboard[k];
      if (categories[item.category]) {
        categories[item.category].push(item);
      }
    });

    Object.keys(categories).forEach(function(cat) {
      html += '<h3 style="color:#37474f;">' + cat + '</h3>';
      html += '<table border="1" cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;width:100%;">';
      html += '<tr style="background:#1a237e;color:#fff;"><th>KPI</th><th>Value</th><th>Unit</th></tr>';
      categories[cat].forEach(function(item) {
        html += '<tr><td>' + item.name + '</td><td>' +
          Number(item.value).toFixed(2) +
          '</td><td>' + item.unit + '</td></tr>';
      });
      html += '</table><br>';
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
// SATISFACTION & NPS MENU HANDLERS (NEW in v6)
// ═══════════════════════════════════════════════════

function menuSatisfactionStats() {
  try {
    var msg = '=== Satisfaction Statistics ===\n';
    if (typeof SatisfactionService !== 'undefined' && SatisfactionService.getSatisfactionStats) {
      var stats = SatisfactionService.getSatisfactionStats();
      msg += 'Total Records: ' + (stats.total || 0) + '\n';
      msg += 'Average Score: ' + (stats.avgScore || 0).toFixed(2) + '/5\n';
      msg += 'Highest: ' + (stats.maxScore || 'N/A') + '\n';
      msg += 'Lowest: ' + (stats.minScore || 'N/A') + '\n';
    } else {
      msg += 'SatisfactionService module not loaded.\n';
      msg += 'Check that 64_SatisfactionService.gs is included in the project.';
    }
    SpreadsheetApp.getUi().alert(msg);
  } catch(e) {
    SpreadsheetApp.getUi().alert('Error: ' + e.message);
  }
}

function menuNpsStats() {
  try {
    var msg = '=== NPS Statistics ===\n';
    if (typeof NPSService !== 'undefined' && NPSService.getNpsStats) {
      var stats = NPSService.getNpsStats();
      msg += 'Total Responses: ' + (stats.total || 0) + '\n';
      msg += 'NPS Score: ' + (stats.npsScore || 0) + '\n';
      msg += 'Promoters: ' + (stats.promoters || 0) + '\n';
      msg += 'Passives: ' + (stats.passives || 0) + '\n';
      msg += 'Detractors: ' + (stats.detractors || 0) + '\n';
    } else {
      msg += 'NPSService module not loaded.\n';
      msg += 'Check that 67_NPSService.gs is included in the project.';
    }
    SpreadsheetApp.getUi().alert(msg);
  } catch(e) {
    SpreadsheetApp.getUi().alert('Error: ' + e.message);
  }
}

function menuRunSatisfactionTests() {
  try {
    if (typeof testSatisfactionLayer === 'function') {
      testSatisfactionLayer();
      SpreadsheetApp.getUi().alert('Satisfaction tests passed.');
    } else {
      SpreadsheetApp.getUi().alert('testSatisfactionLayer function not found.');
    }
  } catch(e) {
    SpreadsheetApp.getUi().alert('Satisfaction test failed: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════
// BOM MENU HANDLERS (NEW in v6)
// ═══════════════════════════════════════════════════

function menuBomView() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = (typeof CONFIG !== 'undefined' && CONFIG.SHEETS && CONFIG.SHEETS.BOM)
      ? CONFIG.SHEETS.BOM : 'BOM';
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      SpreadsheetApp.getUi().alert('BOM sheet not found. Run Initialize System first.');
      return;
    }
    ss.setActiveSheet(sheet);
    SpreadsheetApp.getUi().alert('BOM sheet activated. Total rows: ' + (sheet.getLastRow() - 1));
  } catch(e) {
    SpreadsheetApp.getUi().alert('Error: ' + e.message);
  }
}

function menuBomStats() {
  try {
    var msg = '=== BOM Statistics ===\n';
    if (typeof BOMService !== 'undefined' && BOMService.getBomStats) {
      var stats = BOMService.getBomStats();
      msg += 'Total BOMs: ' + (stats.totalBoms || 0) + '\n';
      msg += 'Total BOM Items: ' + (stats.totalItems || 0) + '\n';
    } else {
      msg += 'BOMService module not loaded.\n';
      msg += 'Check that 73_BOMService.gs is included in the project.';
    }
    SpreadsheetApp.getUi().alert(msg);
  } catch(e) {
    SpreadsheetApp.getUi().alert('Error: ' + e.message);
  }
}

function menuRunBomTests() {
  try {
    if (typeof testBOMLayer === 'function') {
      testBOMLayer();
      SpreadsheetApp.getUi().alert('BOM tests passed.');
    } else {
      SpreadsheetApp.getUi().alert('testBOMLayer function not found.');
    }
  } catch(e) {
    SpreadsheetApp.getUi().alert('BOM test failed: ' + e.message);
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
    'NPS': { id: 1 },
    'BOM': { id: 1 },
    'BOM_ITEM': { id: 1 }
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

// ═══════════════════════════════════════════════════
// ADMIN EXTENDED HANDLERS (NEW in v6)
// ═══════════════════════════════════════════════════

/**
 * Show a summary of all active sessions for admin overview
 */
function menuAdminSessionSummary() {
  try {
    var props = PropertiesService.getScriptProperties();
    var keys = props.getKeys();
    var activeCount = 0;
    var expiredCount = 0;
    var resetCount = 0;
    var emails = {};

    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf('PHINOX_AUTH_') === 0) {
        var data = props.getProperty(keys[i]);
        if (data) {
          try {
            var parsed = JSON.parse(data);
            if (new Date(parsed.expiresAt).getTime() < Date.now()) {
              expiredCount++;
            } else {
              activeCount++;
              var em = parsed.email || 'unknown';
              emails[em] = (emails[em] || 0) + 1;
            }
          } catch(e) { expiredCount++; }
        }
      } else if (keys[i].indexOf('PHINOX_RESET_') === 0) {
        resetCount++;
      }
    }

    var msg = '=== Auth Session Summary ===\n';
    msg += 'Active Sessions: ' + activeCount + '\n';
    msg += 'Expired (not cleaned): ' + expiredCount + '\n';
    msg += 'Pending Reset Tokens: ' + resetCount + '\n\n';

    if (Object.keys(emails).length > 0) {
      msg += '--- Sessions by Email ---\n';
      Object.keys(emails).forEach(function(em) {
        msg += em + ': ' + emails[em] + ' session(s)\n';
      });
    }

    SpreadsheetApp.getUi().alert(msg);
  } catch(e) {
    SpreadsheetApp.getUi().alert('Error: ' + e.message);
  }
}

/**
 * Show rate limit statistics from Cache
 */
function menuAdminRateLimitStats() {
  try {
    var msg = '=== Rate Limit Statistics ===\n';
    msg += 'Note: Rate limits are stored in CacheService.\n';
    msg += 'Individual entries cannot be listed, but active limits are visible.\n\n';
    msg += 'Configuration:\n';
    if (typeof CONFIG !== 'undefined' && CONFIG.SECURITY) {
      msg += '  Max Login Attempts: ' + CONFIG.SECURITY.MAX_LOGIN_ATTEMPTS + '\n';
      msg += '  Lockout Duration: ' + CONFIG.SECURITY.LOCKOUT_MINUTES + ' minutes\n';
      msg += '  Session Duration: ' + CONFIG.SECURITY.SESSION_HOURS + ' hours\n';
    } else {
      msg += '  CONFIG not loaded.\n';
    }
    SpreadsheetApp.getUi().alert(msg);
  } catch(e) {
    SpreadsheetApp.getUi().alert('Error: ' + e.message);
  }
}