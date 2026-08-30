/**
 * Auth System — Tests
 * PHINOX BOS v5
 *
 * اختبارات شاملة لنظام المصادقة.
 * للتشغيل: شغّل كل دالة اختبار من محرر GAS
 */

// ─── اختبارات 03_AuthPassword ─────────────────────

function testPasswordHash() {
  Logger.log('=== testPasswordHash ===');

  // 1. تشفير كلمة مرور
  var hash1 = AuthPassword.hash('Test1234');
  Logger.log('Hash created: ' + hash1.substring(0, 20) + '...');

  // 2. التحقق من التنسيق (salt$hash)
  var parts = hash1.split('$');
  Logger.log('Salt length: ' + parts[0].length + ' (expected 16)');
  Logger.log('Hash length: ' + parts[1].length + ' (expected 64)');

  if (parts.length !== 2) {
    Logger.log('FAIL: Hash format should be salt$hash');
    return;
  }
  if (parts[0].length !== 16) {
    Logger.log('FAIL: Salt should be 16 chars');
    return;
  }
  if (parts[1].length !== 64) {
    Logger.log('FAIL: SHA-256 hash should be 64 hex chars');
    return;
  }

  // 3. التحقق من كلمة صحيحة
  var isCorrect = AuthPassword.verify('Test1234', hash1);
  Logger.log('Correct password: ' + isCorrect + ' (expected true)');

  // 4. التحقق من كلمة خاطئة
  var isWrong = AuthPassword.verify('Wrong1234', hash1);
  Logger.log('Wrong password: ' + isWrong + ' (expected false)');

  // 5. كلمتا مرور مختلفتين → hash مختلف
  var hash2 = AuthPassword.hash('Other5678');
  var different = (hash1 !== hash2);
  Logger.log('Different passwords = different hashes: ' + different + ' (expected true)');

  // 6. نفس كلمة المرور → hash مختلف (بسبب salt مختلف)
  var hash3 = AuthPassword.hash('Test1234');
  var saltDiffers = (hash1 !== hash3);
  Logger.log('Same password = different hashes (different salt): ' + saltDiffers + ' (expected true)');

  // النتيجة
  var allPass = isCorrect && !isWrong && different && saltDiffers;
  Logger.log(allPass ? 'PASS: All password tests passed' : 'FAIL: Some tests failed');
}

function testPasswordStrength() {
  Logger.log('=== testPasswordStrength ===');

  // كلمة قوية
  var r1 = AuthPassword.validateStrength('Test1234');
  Logger.log('Test1234: valid=' + r1.valid + ', strength=' + r1.strength + ' (expected true, medium)');

  // كلمة قصيرة جداً
  var r2 = AuthPassword.validateStrength('ab');
  Logger.log('ab: valid=' + r2.valid + ', errors=' + JSON.stringify(r2.errors) + ' (expected false)');

  // بدون أرقام
  var r3 = AuthPassword.validateStrength('abcdef');
  Logger.log('abcdef: valid=' + r3.valid + ' (expected false)');

  // بدون أحرف
  var r4 = AuthPassword.validateStrength('123456');
  Logger.log('123456: valid=' + r4.valid + ' (expected false)');

  var allPass = r1.valid && !r2.valid && !r3.valid && !r4.valid;
  Logger.log(allPass ? 'PASS: All strength tests passed' : 'FAIL: Some tests failed');
}

// ─── اختبارات 02_AuthSession ─────────────────────

function testSessionLifecycle() {
  Logger.log('=== testSessionLifecycle ===');

  // 1. إنشاء جلسة
  var token = AuthSession.createSession('MEM-TEST001', 'test@example.com');
  Logger.log('Token created: ' + token.substring(0, 12) + '...');

  // 2. التحقق من الجلسة
  var session = AuthSession.validateSession(token);
  Logger.log('Session valid: ' + !!session + ' (expected true)');
  if (session) {
    Logger.log('Session memberId: ' + session.memberId);
    Logger.log('Session email: ' + session.email);
  }

  // 3. تدمير الجلسة
  AuthSession.destroySession(token);
  var destroyed = AuthSession.validateSession(token);
  Logger.log('After destroy: ' + !!destroyed + ' (expected false)');

  // 4. رمز غير موجود
  var fake = AuthSession.validateSession('fake-token-12345');
  Logger.log('Fake token: ' + !!fake + ' (expected false)');

  var allPass = !!session && !destroyed && !fake;
  Logger.log(allPass ? 'PASS: Session lifecycle tests passed' : 'FAIL: Some tests failed');
}

function testFailedAttempts() {
  Logger.log('=== testFailedAttempts ===');

  var testEmail = 'lockout-test@example.com';

  // مسح أي محاولات سابقة
  AuthSession.clearFailedAttempts(testEmail);

  // محاولات فاشلة
  for (var i = 1; i <= 6; i++) {
    var result = AuthSession.recordFailedAttempt(testEmail);
    Logger.log('Attempt ' + i + ': locked=' + result.isLocked + ', remaining=' + result.remaining);
  }

  // التحقق من القفل
  var isLocked = AuthSession.isLocked(testEmail);
  Logger.log('Account locked: ' + isLocked + ' (expected true after 5 attempts)');

  // مسح وإعادة التحقق
  AuthSession.clearFailedAttempts(testEmail);
  var unlocked = !AuthSession.isLocked(testEmail);
  Logger.log('After clear: locked=' + !unlocked + ' (expected false)');

  Logger.log((isLocked && unlocked) ? 'PASS: Failed attempts tests passed' : 'FAIL: Some tests failed');
}

function testResetTokens() {
  Logger.log('=== testResetTokens ===');

  var testEmail = 'reset-test@example.com';

  // 1. إنشاء رمز
  var token = AuthSession.createResetToken(testEmail);
  Logger.log('Reset token created: ' + token.substring(0, 12) + '...');

  // 2. التحقق
  var data = AuthSession.validateResetToken(token);
  Logger.log('Token valid: ' + !!data + ' (expected true)');
  if (data) {
    Logger.log('Token email: ' + data.email);
  }

  // 3. حذف
  AuthSession.destroyResetToken(token);
  var deleted = AuthSession.validateResetToken(token);
  Logger.log('After destroy: ' + !!deleted + ' (expected false)');

  Logger.log((!!data && !deleted) ? 'PASS: Reset token tests passed' : 'FAIL: Some tests failed');
}

// ─── اختبارات 04_AuthGuard ───────────────────────

function testAuthGuardUnauthenticated() {
  Logger.log('=== testAuthGuardUnauthenticated ===');

  // بدون token
  try {
    AuthGuard.requireSession(null);
    Logger.log('FAIL: Should have thrown error for null token');
  } catch(e) {
    Logger.log('Null token rejected: ' + (e.message.indexOf('AUTH_REQUIRED') === 0 ? 'PASS' : 'FAIL: ' + e.message));
  }

  // token غير موجود
  try {
    AuthGuard.requireSession('invalid-token-xyz');
    Logger.log('FAIL: Should have thrown error for invalid token');
  } catch(e) {
    Logger.log('Invalid token rejected: ' + (e.message.indexOf('AUTH_SESSION_EXPIRED') === 0 ? 'PASS' : 'FAIL: ' + e.message));
  }

  // التحقق الاختياري
  var result = AuthGuard.getMemberIfAuthenticated('invalid-token-xyz');
  Logger.log('Optional auth with invalid token: ' + (result === null ? 'PASS (null)' : 'FAIL'));
}

// ─── اختبار شامل (يُشغّل كل الاختبارات) ───────────

function testAuthSystemAll() {
  Logger.log('===========================================');
  Logger.log('PHINOX Auth System — Full Test Suite');
  Logger.log('===========================================');
  Logger.log('');

  testPasswordHash();
  Logger.log('');
  testPasswordStrength();
  Logger.log('');
  testSessionLifecycle();
  Logger.log('');
  testFailedAttempts();
  Logger.log('');
  testResetTokens();
  Logger.log('');
  testAuthGuardUnauthenticated();

  Logger.log('');
  Logger.log('===========================================');
  Logger.log('All tests completed. Check results above.');
  Logger.log('===========================================');
}
