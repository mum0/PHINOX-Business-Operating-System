// doGet.js — PHINOX BOS v5 Enterprise
// ============================================
// تم التعديل: doGet.js أصبح Entry Point وحيد
// السبب: كان هناك doGet في UI_Server.js وdoGet.js — تكرار يسبب تعارضاً
// الحل: doGet.js هو Entry Point الوحيد، UI_Server.js يحتوي على _handleDoGetInternal
// تاريخ التعديل: 2026-08-27
// ============================================

/**
 * Entry Point الرئيسي للـ Web App
 * @param {Object} e — معلمات الطلب
 * @returns {HtmlOutput}
 */
function doGet(e) {
  try {
    const userEmail = Session.getActiveUser().getEmail() || 'anonymous';
    AppLogger.info('doGet', `Web App accessed by ${userEmail}`, { params: e.parameter });

    try {
      RateLimiter.check('doGet', { maxRequests: 200, windowSeconds: 3600 });
    } catch (rateErr) {
      AppLogger.error('doGet.rateLimit', rateErr, userEmail);
      return HtmlService.createHtmlOutput(
        '<h2>⛔ Rate Limit Exceeded</h2><p>Please try again later.</p>'
      );
    }

    const page = e.parameter ? (e.parameter.page || 'index') : 'index';
    const validPages = ['index', 'dashboard', 'login'];

    if (!validPages.includes(page)) {
      AppLogger.error('doGet.invalidPage', new Error(`Invalid page: ${page}`), userEmail);
      return HtmlService.createHtmlOutput('<h2>⛔ Invalid Request</h2>');
    }

    if (typeof _handleDoGetInternal === 'function') {
      return _handleDoGetInternal(e);
    }

    return HtmlService.createHtmlOutputFromFile('UI_Index')
      .setTitle('PHINOX BOS')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  } catch (err) {
    AppLogger.error('doGet.fatal', err, 'system');
    return HtmlService.createHtmlOutput(
      '<h2>⚠️ System Error</h2><p>Please contact support.</p>'
    );
  }
}