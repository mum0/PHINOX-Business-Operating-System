/**
 * Sale Controller
 * Presentation / routing layer for Sales.
 * NO business logic. NO direct sheet access.
 */

const SaleController = (function() {
  'use strict';

  function _alert(title, msg) {
    try { SpreadsheetApp.getUi().alert(title, msg, SpreadsheetApp.getUi().ButtonSet.OK); }
    catch (e) { Logger.warn('SaleController', 'Cannot show alert', { error: e.message }); }
  }

  function onEdit(payload) {
    if (!payload || payload.sheet !== 'Sales') return;
    Logger.debug('SaleController', 'Sales sheet edited', {
      row: payload.range ? payload.range.getRow() : null,
      user: payload.user
    });
  }

  function showSaleStats() {
    const stats = {
      total: SaleService.totalSales(),
      totalRevenue: SaleService.getTotalRevenue(),
      totalCollected: SaleService.getTotalCollected(),
      totalRefunded: SaleService.getTotalRefunded(),
      netRevenue: SaleService.getNetRevenue(),
      totalCOGS: SaleService.getTotalCOGS(),
      grossProfit: SaleService.getGrossProfit(),
      pending: SaleService.getSalesByPaymentStatus(SaleSchema.PAYMENT_STATUS.PENDING).data.length,
      paid: SaleService.getSalesByPaymentStatus(SaleSchema.PAYMENT_STATUS.PAID).data.length,
      partial: SaleService.getSalesByPaymentStatus(SaleSchema.PAYMENT_STATUS.PARTIAL).data.length,
      refunded: SaleService.getSalesByPaymentStatus(SaleSchema.PAYMENT_STATUS.REFUNDED).data.length
    };
    const html = HtmlService.createHtmlOutput(
      '<div style="font-family:Arial;padding:12px;"><h2 style="color:#1a237e;margin-top:0;">💰 Sales Statistics</h2>' +
      '<table style="width:100%;border-collapse:collapse;">' +
      '<tr><td style="padding:6px;border-bottom:1px solid #ddd;"><b>Total Sales</b></td><td style="padding:6px;border-bottom:1px solid #ddd;text-align:right;">' + stats.total + '</td></tr>' +
      '<tr><td style="padding:6px;border-bottom:1px solid #ddd;"><b>Total Revenue</b></td><td style="padding:6px;border-bottom:1px solid #ddd;text-align:right;">' + stats.totalRevenue + '</td></tr>' +
      '<tr><td style="padding:6px;border-bottom:1px solid #ddd;"><b>Total Collected</b></td><td style="padding:6px;border-bottom:1px solid #ddd;text-align:right;">' + stats.totalCollected + '</td></tr>' +
      '<tr><td style="padding:6px;border-bottom:1px solid #ddd;color:#c62828;"><b>Total Refunded</b></td><td style="padding:6px;border-bottom:1px solid #ddd;text-align:right;color:#c62828;">' + stats.totalRefunded + '</td></tr>' +
      '<tr><td style="padding:6px;border-bottom:1px solid #ddd;"><b>Net Revenue</b></td><td style="padding:6px;border-bottom:1px solid #ddd;text-align:right;">' + stats.netRevenue + '</td></tr>' +
      '<tr><td style="padding:6px;border-bottom:1px solid #ddd;"><b>Total COGS</b></td><td style="padding:6px;border-bottom:1px solid #ddd;text-align:right;">' + stats.totalCOGS + '</td></tr>' +
      '<tr><td style="padding:6px;border-bottom:1px solid #ddd;color:#2e7d32;"><b>Gross Profit</b></td><td style="padding:6px;border-bottom:1px solid #ddd;text-align:right;color:#2e7d32;">' + stats.grossProfit + '</td></tr>' +
      '<tr><td style="padding:6px;border-bottom:1px solid #ddd;color:#f57c00;"><b>Pending</b></td><td style="padding:6px;border-bottom:1px solid #ddd;text-align:right;color:#f57c00;">' + stats.pending + '</td></tr>' +
      '<tr><td style="padding:6px;border-bottom:1px solid #ddd;"><b>Paid</b></td><td style="padding:6px;border-bottom:1px solid #ddd;text-align:right;">' + stats.paid + '</td></tr>' +
      '<tr><td style="padding:6px;border-bottom:1px solid #ddd;"><b>Partial</b></td><td style="padding:6px;border-bottom:1px solid #ddd;text-align:right;">' + stats.partial + '</td></tr>' +
      '<tr><td style="padding:6px;"><b>Refunded</b></td><td style="padding:6px;text-align:right;">' + stats.refunded + '</td></tr>' +
      '</table><p style="margin-top:12px;font-size:12px;color:#666;text-align:center;">PHINOX BOS v5.0</p></div>'
    ).setWidth(400).setHeight(420);
    SpreadsheetApp.getUi().showModalDialog(html, 'Sales Statistics');
    return stats;
  }

  function handleApiAction(action, params) {
    params = params || {};
    if (!action || typeof action !== 'string') throw ErrorHandler.validation('Action required', {}, 'SaleController');
    Logger.info('SaleController', 'API action: ' + action, { params: Object.keys(params) });
    switch (action) {
      case 'sale.stats': return showSaleStats();
      case 'sale.list': return SaleService.getSales(params);
      case 'sale.get': if (!params.id) throw ErrorHandler.validation('ID required', {}, 'SaleController'); return SaleService.getSale(params.id);
      case 'sale.create': return SaleService.createSale(params);
      case 'sale.update': if (!params.id) throw ErrorHandler.validation('ID required', {}, 'SaleController'); return SaleService.updateSale(params.id, params.updates || Utils.omit(params, ['id', 'action']));
      case 'sale.delete': if (!params.id) throw ErrorHandler.validation('ID required', {}, 'SaleController'); return SaleService.deleteSale(params.id);
      case 'sale.pay': if (!params.id || !params.amount) throw ErrorHandler.validation('ID and amount required', {}, 'SaleController'); return SaleService.recordPayment(params.id, params.amount, params.method);
      case 'sale.refund': if (!params.id || !params.amount) throw ErrorHandler.validation('ID and amount required', {}, 'SaleController'); return SaleService.processRefund(params.id, params.amount);
      case 'sale.byCustomer': if (!params.email) throw ErrorHandler.validation('Email required', {}, 'SaleController'); return SaleService.getSalesByCustomer(params.email);
      case 'sale.byOrder': if (!params.orderId) throw ErrorHandler.validation('Order ID required', {}, 'SaleController'); return SaleService.getSalesByOrder(params.orderId);
      default: throw ErrorHandler.validation('Unknown action: ' + action, {}, 'SaleController');
    }
  }

  function menuShowStats() {
    try { showSaleStats(); }
    catch (e) { _alert('Error', e.message); throw e; }
  }

  function menuCreateSale() {
    const ui = SpreadsheetApp.getUi();
    const r1 = ui.prompt('Create Sale', 'Enter customer email:', ui.ButtonSet.OK_CANCEL);
    if (r1.getSelectedButton() !== ui.Button.OK) return;
    const email = r1.getResponseText().trim().toLowerCase();
    if (!email) { _alert('Error', 'Email is required'); return; }

    const r2 = ui.prompt('Enter SKU (e.g. PHX-TEE-001-BLK-M):', ui.ButtonSet.OK_CANCEL);
    if (r2.getSelectedButton() !== ui.Button.OK) return;
    const sku = r2.getResponseText().trim().toUpperCase();
    if (!sku) { _alert('Error', 'SKU is required'); return; }

    const r3 = ui.prompt('Enter quantity:', ui.ButtonSet.OK_CANCEL);
    if (r3.getSelectedButton() !== ui.Button.OK) return;
    const qty = Number(r3.getResponseText().trim()) || 0;
    if (qty <= 0) { _alert('Error', 'Quantity must be positive'); return; }

    const r4 = ui.prompt('Enter shipping cost (0 if free):', ui.ButtonSet.OK_CANCEL);
    if (r4.getSelectedButton() !== ui.Button.OK) return;
    const shipping = Number(r4.getResponseText().trim()) || 0;

    try {
      const id = SaleService.createSale({
        customerEmail: email,
        items: [{ sku: sku, qty: qty }],
        shippingCost: shipping,
        paymentMethod: SaleSchema.PAYMENT_METHOD.CASH
      });
      _alert('Success', 'Sale created: ' + id);
    } catch (e) { _alert('Error', e.message); }
  }

  EventBus.on('sheet:edited', onEdit);

  return {
    onEdit: onEdit,
    handleApiAction: handleApiAction,
    showSaleStats: showSaleStats,
    menuShowStats: menuShowStats,
    menuCreateSale: menuCreateSale
  };
})();

// ═══════════════════════════════════════════════════
// Global Menu Wrappers
// ═══════════════════════════════════════════════════

function menuSaleStats() { return SaleController.menuShowStats(); }
function menuSaleCreate() { return SaleController.menuCreateSale(); }
function menuRunSaleTests() {
  try {
    const result = testSaleE2E();
    SpreadsheetApp.getUi().alert('✅ Sale E2E Tests Passed', result, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    SpreadsheetApp.getUi().alert('❌ Sale E2E Tests Failed', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
    throw e;
  }
}
