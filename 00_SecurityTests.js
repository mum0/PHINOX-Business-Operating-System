// 00_SecurityTests.js — PHINOX BOS v5 Enterprise
// SUPER CLEAN — No escape sequences in strings, no backticks

var SecurityTests = {

  name: "SecurityTests",

  _assert: function(condition, message) {
    if (!condition) {
      throw new Error("ASSERTION FAILED: " + message);
    }
  },

  _assertEqual: function(actual, expected, message) {
    if (actual !== expected) {
      throw new Error("ASSERTION FAILED: " + message + " | Expected: " + expected + " | Got: " + actual);
    }
  },

  _assertThrows: function(fn, expectedMessage, testName) {
    var threw = false;
    var actualError = "";
    try {
      fn();
    } catch (e) {
      threw = true;
      actualError = e.message;
    }
    if (!threw) {
      throw new Error("ASSERTION FAILED: " + testName + " — Expected error but none was thrown");
    }
    if (expectedMessage && actualError.indexOf(expectedMessage) === -1) {
      throw new Error("ASSERTION FAILED: " + testName + " — Expected error containing [" + expectedMessage + "] but got [" + actualError + "]");
    }
  },

  test1_userCannotChangeOwnRole: function() {
    var testName = "TEST 1: User cannot change own role";
    this._assert(typeof Security.setUserRole === "undefined", testName + " — Security.setUserRole should be removed");
    this._assert(typeof menuSetRole === "undefined", testName + " — menuSetRole should be removed");
    var role = Security.getUserRole();
    this._assert(typeof role === "string" && role.length > 0, testName + " — getUserRole should return a valid role string");
    if (typeof assignRole === "function") {
      this._assertThrows(function() { assignRole("test-id", "CEO", { email: "unauthorized@test.com" }); }, "FORBIDDEN", testName);
    }
    return { name: testName, status: "PASS" };
  },

  test2_formulaInjectionSanitized: function() {
    var testName = "TEST 2: Formula Injection is sanitized";
    var tabChar = String.fromCharCode(9);
    var crChar = String.fromCharCode(13);
    var dangerousInputs = [
      "=CMD|/C calc!A0",
      "+CMD|/C calc!A0",
      "-CMD|/C calc!A0",
      "@SUM(A1:A10)",
      "=HYPERLINK(http://evil.com)",
      tabChar + "=IMPORTXML(...)",
      crChar + "=WEBSERVICE(...)"
    ];
    for (var i = 0; i < dangerousInputs.length; i++) {
      var input = dangerousInputs[i];
      var sanitized = RequestValidator.sanitizeString(input);
      var firstChar = sanitized.charAt(0);
      var badChars = ["=", "+", "-", "@", tabChar, crChar];
      var isSafe = firstChar === "'" || badChars.indexOf(firstChar) === -1;
      this._assert(isSafe, testName + " — Input [" + input + "] was not properly sanitized. Got: [" + sanitized + "]");
    }
    var safeInput = "Hello World";
    this._assertEqual(RequestValidator.sanitizeString(safeInput), safeInput, testName + " — Safe input should not be modified");
    return { name: testName, status: "PASS" };
  },

  test3_lockServicePreventsRaceConditions: function() {
    var testName = "TEST 3: LockService prevents race conditions";
    this._assert(typeof LockService !== "undefined", testName + " — LockService should be available");
    var lock = LockService.getScriptLock();
    this._assert(lock !== null, testName + " — Should be able to acquire a script lock");
    var hasLock = lock.tryLock(1000);
    this._assert(hasLock, testName + " — Should successfully acquire lock");
    if (hasLock) { lock.releaseLock(); }
    if (typeof assignRole === "function") {
      var fnStr = assignRole.toString();
      this._assert(fnStr.indexOf("LockService") !== -1 || fnStr.indexOf("getScriptLock") !== -1, testName + " — assignRole should use LockService");
    }
    return { name: testName, status: "PASS" };
  },

  test4_rateLimitBlocksExcessRequests: function() {
    var testName = "TEST 4: Rate limit blocks excess requests";
    this._assert(typeof RateLimiter !== "undefined", testName + " — RateLimiter should be defined");
    var testAction = "test_rate_limit_" + Date.now();
    try { RateLimiter.check(testAction, { maxRequests: 2, windowSeconds: 60 }); } catch (e) { throw new Error(testName + " — First request should succeed, got: " + e.message); }
    try { RateLimiter.check(testAction, { maxRequests: 2, windowSeconds: 60 }); } catch (e) { throw new Error(testName + " — Second request should succeed, got: " + e.message); }
    this._assertThrows(function() { RateLimiter.check(testAction, { maxRequests: 2, windowSeconds: 60 }); }, "RATE_LIMIT_EXCEEDED", testName);
    return { name: testName, status: "PASS" };
  },

  test5_adminCanChangeRoleAndIsLogged: function() {
    var testName = "TEST 5: Admin can change role and it is logged";
    this._assert(typeof AuditLog !== "undefined", testName + " — AuditLog should be defined");
    this._assert(typeof AuditLog.log === "function", testName + " — AuditLog.log should be a function");
    var testTarget = "test-user@example.com";
    var testDetails = { oldRole: "MEMBER", newRole: "MANAGER", reason: "test" };
    try { AuditLog.log("ROLE_CHANGE", testTarget, testDetails, "SUCCESS"); } catch (e) { throw new Error(testName + " — AuditLog.log should not throw, got: " + e.message); }
    if (typeof assignRole === "function") {
      var fnStr = assignRole.toString();
      this._assert(fnStr.indexOf("AuditLog") !== -1 || fnStr.indexOf("logAudit") !== -1, testName + " — assignRole should log to AuditLog");
    }
    var currentRole = Security.getUserRole();
    var isAdmin = ["ADMIN", "CEO", "SUPER_ADMIN", "OWNER"].indexOf(currentRole) !== -1;
    if (isAdmin) {
      this._assert(Security.can(Security.getPermissions().ADMIN), testName + " — Current admin should have ADMIN permission");
    } else {
      this._assertThrows(function() { Security.requireAdmin(); }, "FORBIDDEN", testName);
    }
    return { name: testName, status: "PASS" };
  },

  test6_sensitiveFunctionsRequireAuth: function() {
    var testName = "TEST 6: Sensitive doGet functions require authentication";
    var sensitiveFunctions = ["uiDeleteCustomer", "uiDeleteTask", "uiApproveTask", "uiRejectTask", "uiAddMember", "uiUpdateMember", "uiDeleteMember", "uiAdjustStock", "uiRestockStock", "uiDeleteBOM", "uiApproveExpense", "uiRejectExpense", "uiPostExpense", "uiDeleteExpense"];
    for (var i = 0; i < sensitiveFunctions.length; i++) {
      var fnName = sensitiveFunctions[i];
      if (typeof this[fnName] === "function" || typeof globalThis[fnName] === "function") {
        var fn = this[fnName] || globalThis[fnName];
        var fnStr = fn.toString();
        var hasAuthCheck = fnStr.indexOf("requirePermission") !== -1 || fnStr.indexOf("validateRole") !== -1 || fnStr.indexOf("Security.require") !== -1 || fnStr.indexOf("RequestValidator.validateRole") !== -1;
        this._assert(hasAuthCheck, testName + " — [" + fnName + "] should have permission check");
      }
    }
    return { name: testName, status: "PASS" };
  },

  runAll: function() {
    var results = [];
    var tests = [this.test1_userCannotChangeOwnRole, this.test2_formulaInjectionSanitized, this.test3_lockServicePreventsRaceConditions, this.test4_rateLimitBlocksExcessRequests, this.test5_adminCanChangeRoleAndIsLogged, this.test6_sensitiveFunctionsRequireAuth];
    for (var i = 0; i < tests.length; i++) {
      try { var result = tests[i].call(this); results.push(result); }
      catch (e) { results.push({ name: tests[i].name || "Test " + (i + 1), status: "FAIL", error: e.message }); }
    }
    return results;
  }
};

function runSecurityTests() {
  var results = SecurityTests.runAll();
  console.log("=======================================");
  console.log("   SECURITY TEST RESULTS");
  console.log("=======================================");
  var passCount = 0;
  var failCount = 0;
  for (var i = 0; i < results.length; i++) {
    var r = results[i];
    var icon = r.status === "PASS" ? "PASS" : "FAIL";
    console.log(icon + ": " + r.name);
    if (r.error) { console.log("   Error: " + r.error); }
    if (r.status === "PASS") passCount++;
    else failCount++;
  }
  console.log("---------------------------------------");
  console.log("Total: " + results.length + " | Passed: " + passCount + " | Failed: " + failCount);
  console.log("=======================================");
  return { total: results.length, passed: passCount, failed: failCount, details: results };
}