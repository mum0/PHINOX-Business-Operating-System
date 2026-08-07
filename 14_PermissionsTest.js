/**
 * ============================================================
 * PHINOX BOS — Permissions Module Tests
 * Validates: Backward compatibility + Core integration
 * Run: Select testPermissionsModule → Run in GAS editor
 * ============================================================
 */

function testPermissionsModule() {
    console.log('=== Permissions Module Tests ===');
    var passed = 0;
    var failed = 0;
    
    function assert(cond, msg) {
      if (cond) { passed++; console.log('✓ ' + msg); }
      else { failed++; console.error('✗ ' + msg); }
    }
    
    // 1. Constants exist
    assert(typeof MEMBER_COL === 'object', 'MEMBER_COL constant');
    assert(MEMBER_COL.ROLE === 2, 'MEMBER_COL.ROLE index');
    assert(typeof AUDIT_COL === 'object', 'AUDIT_COL constant');
    assert(typeof PERMISSIONS === 'object', 'PERMISSIONS constant');
    assert(PERMISSIONS.ADMIN === 'admin', 'PERMISSIONS.ADMIN value');
    assert(typeof WORKFLOW_TYPES === 'object', 'WORKFLOW_TYPES constant');
    assert(typeof APPROVAL_COL === 'object', 'APPROVAL_COL constant');
    assert(typeof ARCHIVE_COL === 'object', 'ARCHIVE_COL constant');
    
    // 2. ensureAppConstants
    ensureAppConstants();
    assert(typeof APP !== 'undefined', 'APP exists');
    assert(typeof APP.ROLES === 'object', 'APP.ROLES created');
    assert(APP.ROLES.CEO === 'CEO', 'APP.ROLES.CEO');
    
    // 3. Permission Matrix
    var matrix = getPermissionMatrix();
    assert(typeof matrix === 'object', 'getPermissionMatrix returns object');
    assert(Array.isArray(matrix[APP.ROLES.CEO]), 'CEO has permissions array');
    assert(matrix[APP.ROLES.CEO].indexOf(PERMISSIONS.ADMIN) > -1, 'CEO has ADMIN');
    
    // 4. RBAC Core
    var mockCEO = ['M1', 'Ali', 'CEO', 'ali@co.com'];
    var mockFinance = ['M2', 'Sara', 'Finance', 'sara@co.com'];
    var mockViewer = ['M3', 'Guest', null, 'guest@co.com'];
    
    assert(getRole(mockCEO) === 'CEO', 'getRole array');
    assert(isAdmin(mockCEO) === true, 'isAdmin CEO');
    assert(isAdmin(mockFinance) === false, 'isAdmin Finance');
    assert(isManager(mockCEO) === true, 'isManager CEO');
    assert(isManager(mockFinance) === false, 'isManager Finance');
    assert(isMemberLevel(mockFinance) === true, 'isMemberLevel Finance');
    assert(isMemberLevel(mockCEO) === false, 'isMemberLevel CEO');
    
    assert(hasPermission(mockCEO, PERMISSIONS.FINANCE_WRITE) === true, 'CEO can write finance');
    assert(hasPermission(mockFinance, PERMISSIONS.FINANCE_WRITE) === true, 'Finance can write finance');
    assert(hasPermission(mockFinance, PERMISSIONS.ADMIN) === false, 'Finance cannot admin');
    assert(hasPermission(mockViewer, PERMISSIONS.FINANCE_READ) === false, 'Null role has no permissions');
    
    assert(hasAnyPermission(mockFinance, [PERMISSIONS.FINANCE_WRITE, PERMISSIONS.ADMIN]) === true, 'hasAnyPermission true');
    assert(hasAnyPermission(mockFinance, [PERMISSIONS.ADMIN, PERMISSIONS.SETTINGS_WRITE]) === false, 'hasAnyPermission false');
    
    assert(hasAllPermissions(mockCEO, [PERMISSIONS.FINANCE_READ, PERMISSIONS.FINANCE_WRITE]) === true, 'hasAllPermissions true');
    assert(hasAllPermissions(mockFinance, [PERMISSIONS.FINANCE_READ, PERMISSIONS.ADMIN]) === false, 'hasAllPermissions false');
    
    // 5. requirePermission throws
    try {
      requirePermission(mockFinance, PERMISSIONS.ADMIN);
      assert(false, 'requirePermission should throw');
    } catch (e) {
      assert(e.category === 'PERMISSION_DENIED', 'requirePermission throws BusinessError');
    }
    
    // 6. Sheet permissions
    assert(canReadSheet(mockCEO, 'Tasks') === true, 'CEO can read Tasks');
    assert(canWriteSheet(mockFinance, 'Finance') === true, 'Finance can write Finance');
    assert(canDeleteSheet(mockFinance, 'Finance') === false, 'Finance cannot delete Finance');
    assert(canApproveTasks(mockCEO) === true, 'CEO can approve');
    assert(canViewKPI(mockCEO) === true, 'CEO can view KPI');
    
    // 7. secureOperation
    var result = secureOperation(mockCEO, PERMISSIONS.TASKS_READ, function() { return 42; });
    assert(result === 42, 'secureOperation returns value');
    
    try {
      secureOperation(mockFinance, PERMISSIONS.ADMIN, function() { return 42; });
      assert(false, 'secureOperation should throw');
    } catch (e) {
      assert(true, 'secureOperation rejects');
    }
    
    // 8. Audit via BaseRepository
    logActivity('TestUser', 'TEST_ACTION', 'TestSheet', 'REC001', 'old', 'new');
    Logger.flush();
    
    var logs = getActivityLog();
    assert(Array.isArray(logs), 'getActivityLog returns array');
    assert(logs.length > 0, 'getActivityLog has entries');
    
    var lastLog = logs[logs.length - 1];
    assert(lastLog[AUDIT_COL.ACTION] === 'TEST_ACTION', 'Audit action recorded');
    assert(lastLog[AUDIT_COL.USER] === 'TestUser', 'Audit user recorded');
    assert(lastLog[AUDIT_COL.SHEET] === 'TestSheet', 'Audit sheet recorded');
    
    var byUser = getActivityByUser('TestUser');
    assert(byUser.length > 0, 'getActivityByUser works');
    
    var bySheet = getActivityBySheet('TestSheet');
    assert(bySheet.length > 0, 'getActivityBySheet works');
    
    var byAction = getActivityByAction('TEST_ACTION');
    assert(byAction.length > 0, 'getActivityByAction works');
    
    var recent = getRecentActivity(5);
    assert(recent.length <= 5, 'getRecentActivity respects limit');
    
  // 9. Approval Workflow (skip if no current member — expected in GAS editor)
  var currentMember = getCurrentMember();
  if (!currentMember) {
    console.log('⚠ Skipping approval workflow tests — no current member (expected in GAS editor)');
  } else {
    var approvalId = submitApprovalRequest({
      type: 'EXPENSE_APPROVAL',
      targetSheet: 'Finance',
      targetId: 'EXP-001',
      details: { amount: 100, description: 'Test expense' },
      notes: 'Test approval'
    });
    assert(typeof approvalId === 'string' && approvalId.indexOf('APR-') === 0, 'submitApprovalRequest returns ID');
    
    var pending = getPendingApprovalRequests();
    assert(Array.isArray(pending), 'getPendingApprovalRequests returns array');
    var foundPending = pending.find(function(p) { return p.id === approvalId; });
    assert(foundPending !== undefined, 'Pending request found');
    assert(foundPending.type === 'اعتماد مصروف', 'Pending request has correct type');
    
    // Approve
    var approveResult = approveRequest({ requestId: approvalId, notes: 'Approved in test' });
    assert(approveResult.success === true, 'approveRequest succeeds');
    
    // Verify no longer pending
    var pendingAfter = getPendingApprovalRequests();
    var stillPending = pendingAfter.find(function(p) { return p.id === approvalId; });
    assert(stillPending === undefined, 'Approved request no longer pending');
    
    // Reject test
    var rejectId = submitApprovalRequest({
      type: 'TASK_CANCEL',
      targetSheet: 'Tasks',
      targetId: 'TASK-999',
      details: { taskId: 'TASK-999' }
    });
    var rejectResult = rejectRequest({ requestId: rejectId });
    assert(rejectResult.success === true, 'rejectRequest succeeds');
    
   } // end approval workflow tests
  
  // 10. Soft Delete / Archive (skip if no current member)
  if (!getCurrentMember()) {
    console.log('⚠ Skipping soft delete tests — no current member (expected in GAS editor)');
  } else {
  var testSheetName = 'TestArchive';
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var testSheet = ss.getSheetByName(testSheetName);
    if (!testSheet) {
      testSheet = ss.insertSheet(testSheetName);
      testSheet.appendRow(['id', 'name', 'value']);
    }
    var testId = 'TEST-ARCH-' + Math.random().toString(36).substr(2, 5);
    testSheet.appendRow([testId, 'TestRecord', 42]);
    
    var delResult = softDeleteRecord({ sheet: testSheetName, id: testId });
    assert(delResult.success === true, 'softDeleteRecord succeeds');
    
    // Verify record gone from source
    var sourceData = testSheet.getDataRange().getValues();
    var foundInSource = false;
    for (var i = 1; i < sourceData.length; i++) {
      if (sourceData[i][0] === testId) { foundInSource = true; break; }
    }
    assert(foundInSource === false, 'Record removed from source');
    
    // Verify in archive
    var archiveLogs = getActivityLog().filter(function(r) { return r[AUDIT_COL.ACTION] === 'حذف ناعم'; });
    assert(archiveLogs.length > 0, 'Archive activity logged');
    
    // Find archive record
    var archiveRepo = _getArchiveRepo();
    var archiveAll = archiveRepo.findAll({ limit: 100 });
    var archiveRecord = null;
    for (var j = 0; j < archiveAll.data.length; j++) {
      if (archiveAll.data[j].originalSheet === testSheetName && archiveAll.data[j].data.indexOf(testId) > -1) {
        archiveRecord = archiveAll.data[j];
        break;
      }
    }
    
    if (archiveRecord) {
      assert(archiveRecord.deletedBy !== '', 'Archive has deletedBy');
      assert(archiveRecord.purgeAfter !== '', 'Archive has purgeAfter');
    }
    
    // Cleanup test sheet
    try { ss.deleteSheet(testSheet); } catch(e) {}
    
  } // end soft delete tests
  
  // 11. getCurrentMember (best effort)
  var current = getCurrentMember();
  console.log('Current member:', current ? current[MEMBER_COL.EMAIL] : 'null (expected in editor)');
    assert(current === null || Array.isArray(current), 'getCurrentMember returns array or null');
    
    // 12. listRoles
    var roles = listRoles();
    assert(Array.isArray(roles), 'listRoles returns array');
    assert(roles.indexOf('CEO') > -1, 'listRoles includes CEO');
    
    // 13. getRolePermissions
    var ceoPerms = getRolePermissions('CEO');
    assert(Array.isArray(ceoPerms), 'getRolePermissions returns array');
    assert(ceoPerms.indexOf(PERMISSIONS.ADMIN) > -1, 'CEO perms include ADMIN');
    
    console.log('=== Permissions Tests: ' + passed + ' passed, ' + failed + ' failed ===');
    if (failed > 0) throw new Error(failed + ' tests failed');
    return 'Permissions module: ' + passed + ' tests passed';
  }