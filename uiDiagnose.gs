// ═══════════════════════════════════════════════════════
// uiDiagnose.gs — Add to GAS project for diagnostics
// Usage: Deploy → visit ?page=diagnose
// ═══════════════════════════════════════════════════════

function uiDiagnose() {
  var result = {};

  // 1. Session
  try {
    result.email = Session.getActiveUser().getEmail();
  } catch(e) {
    result.email = 'ERROR: ' + e.message;
  }

  // 2. Spreadsheet
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    result.spreadsheet = ss ? ss.getName() : 'NULL';
  } catch(e) {
    result.spreadsheet = 'ERROR: ' + e.message;
  }

  // 3. Members sheet
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Members');
    if (!sheet) {
      result.membersSheet = 'NOT FOUND';
    } else {
      var lr = sheet.getLastRow();
      var lc = sheet.getLastColumn();
      var headers = lr > 0 ? sheet.getRange(1, 1, 1, lc).getValues()[0] : [];
      result.membersSheet = 'found, rows=' + lr + ', cols=' + lc + ', headers=[' + headers.join(',') + ']';
    }
  } catch(e) {
    result.membersSheet = 'ERROR: ' + e.message;
  }

  // 4. getCurrentMember
  try {
    if (typeof getCurrentMember === 'function') {
      var member = getCurrentMember();
      result.currentMember = member ? 'found: ' + member[MEMBER_COL.FULL_NAME] + ' (' + member[MEMBER_COL.ROLE] + ', status=' + member[MEMBER_COL.STATUS] + ')' : 'null';
    } else {
      result.currentMember = 'ERROR: getCurrentMember function not defined';
    }
  } catch(e) {
    result.currentMember = 'ERROR: ' + e.message;
  }

  // 5. BaseRepository
  try {
    result.baseRepository = typeof BaseRepository !== 'undefined' ? 'defined (type=' + typeof BaseRepository.create + ')' : 'NOT DEFINED';
  } catch(e) {
    result.baseRepository = 'ERROR: ' + e.message;
  }

  // 6. MEMBER_COL
  try {
    result.memberCol = typeof MEMBER_COL !== 'undefined' ? JSON.stringify(MEMBER_COL) : 'NOT DEFINED';
  } catch(e) {
    result.memberCol = 'ERROR: ' + e.message;
  }

  // 7. PERMISSIONS
  try {
    result.permissions = typeof PERMISSIONS !== 'undefined' ? 'defined (' + Object.keys(PERMISSIONS).length + ' keys)' : 'NOT DEFINED';
  } catch(e) {
    result.permissions = 'ERROR: ' + e.message;
  }

  // 8. KpiService (critical for dashboard)
  try {
    result.kpiService = typeof KpiService !== 'undefined' ? 'defined' : 'NOT DEFINED';
  } catch(e) {
    result.kpiService = 'ERROR: ' + e.message;
  }

  // 9. All required Services
  var services = ['KpiService','InventoryService','OrderService','CustomerService','FinanceService','TaskService','MktService','SocService','SatisfactionService','NPSService','BOMService','StockMovementService','SaleService'];
  var missingServices = [];
  var definedServices = [];
  services.forEach(function(s) {
    try {
      if (typeof this[s] !== 'undefined') { definedServices.push(s); }
      else { missingServices.push(s); }
    } catch(e) { missingServices.push(s); }
  });
  result.servicesDefined = definedServices.join(', ');
  result.servicesMissing = missingServices.join(', ');

  // 10. Config / APP
  try {
    result.appConfig = typeof APP !== 'undefined' ? 'defined' : 'NOT DEFINED';
  } catch(e) {
    result.appConfig = 'ERROR: ' + e.message;
  }

  return result;
}