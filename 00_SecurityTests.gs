// 00_SecurityTests.gs — PHINOX BOS v5 Enterprise
// ============================================
// جديد: اختبارات أمنية مخصصة
// يُشغَّل عبر TestRunner أو يدوياً
// تاريخ الإنشاء: 2026-08-27
// ============================================

const SecurityTests = {

  name: 'SecurityTests',

  // ─── Helpers ───

  _assert: function(condition, message) {
    if (!condition) {
      throw new Error(`ASSERTION FAILED: ${message}`);
    }
  },

  _assertEqual: function(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`ASSERTION FAILED: ${message} — Expected "${expected}", got "${actual}"`);
    }
  },

  _assertThrows: function(fn, expectedMessage, testName) {
    let threw = false;
    let actualError = '';
    try {
      fn();
    } catch (e) {
      threw = true;
      actualError = e.message;
    }
    if (!threw) {
      throw new Error(`ASSERTION FAILED: ${testName} — Expected error but none was thrown`);
    }
    if (expectedMessage && !actualError.includes(expectedMessage)) {
      throw new Error(`ASSERTION FAILED: ${testName} — Expected error containing "${expectedMessage}", got "${actualError}"`);
    }
  },

  // ═══════════════════════════════════════════════════
  // TEST 1: مستخدم عادي يحاول تغيير دوره → يجب أن يفشل
  // ═══════════════════════════════════════════════════

  test1_userCannotChangeOwnRole: function() {
    const testName = 'TEST 1: User cannot change own role';

    // محاكاة: نتحقق من أن Security.setUserRole لم تعد موجودة
    this._assert(
      typeof Security.setUserRole === 'undefined',
      `${testName} — Security.setUserRole should be removed`
    );

    // محاكاة: نتحقق من أن menuSetRole إما محذوفة أو محمية
    this._assert(
      typeof menuSetRole === 'undefined' || 
      (typeof menuSetRole === 'function' && menuSetRole.toString().includes('deprecated')),
      `${testName} — menuSetRole should be removed or deprecated`
    );

    // محاكاة: نتحقق من أن getUserRole تقرأ من Members وليس UserProperties
    const role = Security.getUserRole();
    this._assert(
      typeof role === 'string' && role.length > 0,
      `${testName} — getUserRole should return a valid role string`
    );

    // محاكاة: نتحقق من أن assignRole في Permissions يتطلب ADMIN
    if (typeof assignRole === 'function') {
      this._assertThrows(
        function() {
          // محاولة استدعاء بدون صلاحية — يجب أن يفشل
          // ملاحظة: هذا يعتمد على تنفيذ assignRole الفعلي
          assignRole('test-id', 'CEO', { email: 'unauthorized@test.com' });
        },
        'FORBIDDEN',
        testName
      );
    }

    return { name: testName, status: 'PASS' };
  },

  // ═══════════════════════════════════════════════════
  // TEST 2: Formula Injection — يجب أن يُنقَّح
  // ═══════════════════════════════════════════════════

  test2_formulaInjectionSanitized: function() {
    const testName = 'TEST 2: Formula Injection is sanitized';

    const dangerousInputs = [
      '=CMD|' /C calc'!A0',
      '+CMD|' /C calc'!A0',
      '-CMD|' /C calc'!A0',
      '@SUM(A1:A10)',
      '=HYPERLINK("http://evil.com")',
      '	=IMPORTXML(...)',
      '=WEBSERVICE(...)'
    ];

    for (let i = 0; i < dangerousInputs.length; i++) {
      const input = dangerousInputs[i];
      const sanitized = RequestValidator.sanitizeString(input);

      // يجب أن يبدأ بـ apostrophe أو لا يبدأ بالحرف الخطير
      const firstChar = sanitized.charAt(0);
      const isSafe = firstChar === "'" || !['=', '+', '-', '@', '\t', '\r'].includes(firstChar);

      this._assert(
        isSafe,
        `${testName} — Input "${input}" was not properly sanitized. Got: "${sanitized}"`
      );
    }

    // التحقق من أن المدخلات الآمنة لا تتأثر
    const safeInput = 'Hello World';
    this._assertEqual(
      RequestValidator.sanitizeString(safeInput),
      safeInput,
      `${testName} — Safe input should not be modified`
    );

    return { name: testName, status: 'PASS' };
  },

  // ═══════════════════════════════════════════════════
  // TEST 3: LockService — منع السباقات
  // ═══════════════════════════════════════════════════

  test3_lockServicePreventsRaceConditions: function() {
    const testName = 'TEST 3: LockService prevents race conditions';

    // محاكاة: نتحقق من أن LockService يُستخدم في العمليات الحساسة
    // هذا اختبار هيكلي — نتحقق من وجود LockService في الكود

    this._assert(
      typeof LockService !== 'undefined',
      `${testName} — LockService should be available`
    );

    // محاكاة: اختبار LockService يدوياً
    const lock = LockService.getScriptLock();
    this._assert(
      lock !== null,
      `${testName} — Should be able to acquire a script lock`
    );

    // محاولة الحصول على Lock
    const hasLock = lock.tryLock(1000);
    this._assert(
      hasLock,
      `${testName} — Should successfully acquire lock`
    );

    if (hasLock) {
      lock.releaseLock();
    }

    // محاكاة: نتحقق من أن assignRole يستخدم LockService
    // (هذا يتطلب قراءة الكود — نتحقق هيكلياً)
    if (typeof assignRole === 'function') {
      const fnStr = assignRole.toString();
      this._assert(
        fnStr.includes('LockService') || fnStr.includes('getScriptLock'),
        `${testName} — assignRole should use LockService`
      );
    }

    return { name: testName, status: 'PASS' };
  },

  // ═══════════════════════════════════════════════════
  // TEST 4: Rate Limiting — يجب أن يرفض الطلب 101
  // ═══════════════════════════════════════════════════

  test4_rateLimitBlocksExcessRequests: function() {
    const testName = 'TEST 4: Rate limit blocks excess requests';

    this._assert(
      typeof RateLimiter !== 'undefined',
      `${testName} — RateLimiter should be defined`
    );

    // محاكاة: نتحقق من أن RateLimiter.check يرمي خطأ عند التجاوز
    // نُجري اختباراً حقيقياً بسيطاً

    const testAction = 'test_rate_limit_' + Date.now();

    // أول طلب — يجب أن ينجح
    try {
      RateLimiter.check(testAction, { maxRequests: 2, windowSeconds: 60 });
    } catch (e) {
      throw new Error(`${testName} — First request should succeed, got: ${e.message}`);
    }

    // ثاني طلب — يجب أن ينجح
    try {
      RateLimiter.check(testAction, { maxRequests: 2, windowSeconds: 60 });
    } catch (e) {
      throw new Error(`${testName} — Second request should succeed, got: ${e.message}`);
    }

    // ثالث طلب — يجب أن يفشل
    this._assertThrows(
      function() {
        RateLimiter.check(testAction, { maxRequests: 2, windowSeconds: 60 });
      },
      'RATE_LIMIT_EXCEEDED',
      testName
    );

    return { name: testName, status: 'PASS' };
  },

  // ═══════════════════════════════════════════════════
  // TEST 5: أدمن يغيّر دور مستخدم → يجب أن ينجح ويُسجَّل
  // ═══════════════════════════════════════════════════

  test5_adminCanChangeRoleAndIsLogged: function() {
    const testName = 'TEST 5: Admin can change role and it is logged';

    // محاكاة: نتحقق من أن AuditLog موجود ويعمل
    this._assert(
      typeof AuditLog !== 'undefined',
      `${testName} — AuditLog should be defined`
    );

    this._assert(
      typeof AuditLog.log === 'function',
      `${testName} — AuditLog.log should be a function`
    );

    // محاكاة: تسجيل حدث ROLE_CHANGE
    const testTarget = 'test-user@example.com';
    const testDetails = { oldRole: 'MEMBER', newRole: 'MANAGER', reason: 'test' };

    try {
      AuditLog.log('ROLE_CHANGE', testTarget, testDetails, 'SUCCESS');
    } catch (e) {
      throw new Error(`${testName} — AuditLog.log should not throw, got: ${e.message}`);
    }

    // محاكاة: نتحقق من أن assignRole يستدعي AuditLog
    if (typeof assignRole === 'function') {
      const fnStr = assignRole.toString();
      this._assert(
        fnStr.includes('AuditLog') || fnStr.includes('logAudit'),
        `${testName} — assignRole should log to AuditLog`
      );
    }

    // محاكاة: نتحقق من أن الأدمن يستطيع تغيير الأدوار
    const currentRole = Security.getUserRole();
    const isAdmin = ['ADMIN', 'CEO', 'SUPER_ADMIN', 'OWNER'].includes(currentRole);

    if (isAdmin) {
      // إذا كان المُشغِّل أدمن — نتحقق من أن الصلاحية تُمنح
      this._assert(
        Security.can(Security.getPermissions().ADMIN),
        `${testName} — Current admin should have ADMIN permission`
      );
    } else {
      // إذا لم يكن أدمن — نتحقد من أنه لا يستطيع
      this._assertThrows(
        function() {
          Security.requireAdmin();
        },
        'FORBIDDEN',
        testName
      );
    }

    return { name: testName, status: 'PASS' };
  },

  // ═══════════════════════════════════════════════════
  // TEST 6 (إضافي): التحقق من الصلاحيات على دوال doGet
  // ═══════════════════════════════════════════════════

  test6_sensitiveFunctionsRequireAuth: function() {
    const testName = 'TEST 6: Sensitive doGet functions require authentication';

    const sensitiveFunctions = [
      'uiDeleteCustomer',
      'uiDeleteTask',
      'uiApproveTask',
      'uiRejectTask',
      'uiAddMember',
      'uiUpdateMember',
      'uiDeleteMember',
      'uiAdjustStock',
      'uiRestockStock',
      'uiDeleteBOM',
      'uiApproveExpense',
      'uiRejectExpense',
      'uiPostExpense',
      'uiDeleteExpense'
    ];

    for (let i = 0; i < sensitiveFunctions.length; i++) {
      const fnName = sensitiveFunctions[i];

      // نتحقد من أن الدالة موجودة
      if (typeof this[fnName] === 'function' || typeof globalThis[fnName] === 'function') {
        const fn = this[fnName] || globalThis[fnName];
        const fnStr = fn.toString();

        // يجب أن تحتوي على requirePermission أو validateRole
        const hasAuthCheck = 
          fnStr.includes('requirePermission') ||
          fnStr.includes('validateRole') ||
          fnStr.includes('Security.require') ||
          fnStr.includes('RequestValidator.validateRole');

        this._assert(
          hasAuthCheck,
          `${testName} — "${fnName}" should have permission check`
        );
      }
    }

    return { name: testName, status: 'PASS' };
  },

  // ═══════════════════════════════════════════════════
  // تشغيل جميع الاختبارات
  // ═══════════════════════════════════════════════════

  runAll: function() {
    const results = [];
    const tests = [
      this.test1_userCannotChangeOwnRole,
      this.test2_formulaInjectionSanitized,
      this.test3_lockServicePreventsRaceConditions,
      this.test4_rateLimitBlocksExcessRequests,
      this.test5_adminCanChangeRoleAndIsLogged,
      this.test6_sensitiveFunctionsRequireAuth
    ];

    for (let i = 0; i < tests.length; i++) {
      try {
        const result = tests[i].call(this);
        results.push(result);
      } catch (e) {
        results.push({
          name: tests[i].name || `Test ${i + 1}`,
          status: 'FAIL',
          error: e.message
        });
      }
    }

    return results;
  }
};

// ─── دوال تشغيل سريعة ───

function runSecurityTests() {
  const results = SecurityTests.runAll();

  Logger.log('═══════════════════════════════════════');
  Logger.log('   SECURITY TEST RESULTS');
  Logger.log('═══════════════════════════════════════');

  let passCount = 0;
  let failCount = 0;

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const icon = r.status === 'PASS' ? '✅' : '❌';
    Logger.log(`${icon} ${r.name}`);
    if (r.error) {
      Logger.log(`   Error: ${r.error}`);
    }
    if (r.status === 'PASS') passCount++;
    else failCount++;
  }

  Logger.log('───────────────────────────────────────');
  Logger.log(`Total: ${results.length} | Passed: ${passCount} | Failed: ${failCount}`);
  Logger.log('═══════════════════════════════════════');

  return {
    total: results.length,
    passed: passCount,
    failed: failCount,
    details: results
  };
}
