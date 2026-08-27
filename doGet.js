// doGet.js — PHINOX BOS v5 Enterprise
// ============================================
// SECURITY FIX (2026-08-27):
//   - Single entry point (doGet in UI_Server.js removed)
//   - Rate limiting on Web App access
//   - Input validation on page parameter
//   - Uses Logger module instead of AppLogger
// ============================================

/**
 * Main Web App entry point
 * @param {Object} e — request parameters
 * @returns {HtmlOutput}
 */
function doGet(e) {
  try {
    var userEmail = Session.getActiveUser().getEmail() || 'anonymous';
    Logger.info('doGet', 'Web App accessed by ' + userEmail, { params: e.parameter });

    // Rate limiting
    try {
      RateLimiter.check('doGet', { maxRequests: 200, windowSeconds: 3600 });
    } catch (rateErr) {
      Logger.error('doGet.rateLimit', rateErr.message, { user: userEmail });
      return HtmlService.createHtmlOutput(
        '<h2>⛔ Rate Limit Exceeded</h2><p>Please try again later.</p>'
      );
    }

    // Validate page parameter
    var page = e.parameter ? (e.parameter.page || 'index') : 'index';
    var validPages = ['index', 'dashboard', 'login'];

    if (validPages.indexOf(page) === -1) {
      Logger.error('doGet.invalidPage', 'Invalid page: ' + page, { user: userEmail });
      return HtmlService.createHtmlOutput('<h2>⛔ Invalid Request</h2>');
    }

    // Delegate to UI_Server internal handler
    if (typeof _handleDoGetInternal === 'function') {
      return _handleDoGetInternal(e);
    }

    // Fallback
    return HtmlService.createHtmlOutputFromFile('UI_Index')
      .setTitle('PHINOX BOS')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  } catch (err) {
    Logger.error('doGet.fatal', err.message, { stack: err.stack });
    return HtmlService.createHtmlOutput(
      '<h2>⚠️ System Error</h2><p>Please contact support.</p>'
    );
  }
}