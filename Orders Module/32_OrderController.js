/**
 * Order Controller
 * Presentation / routing layer for Orders.
 * NO business logic. NO direct sheet access.
 */

const OrderController = (function() {
  'use strict';

  function _alert(title, msg) {
    try { SpreadsheetApp.getUi().alert(title, msg, SpreadsheetApp.getUi().ButtonSet.OK); }
    catch (e) { Logger.warn('OrderController', 'Cannot show alert', { error: e.message }); }
  }

  function onEdit(payload) {
    if (!payload || payload.sheet !== 'Orders') return;
    Logger.debug('OrderController', 'Orders sheet edited', {
      row: payload.range ? payload.range.getRow() : null,
      user: payload.user
    });
  }

  function showOrderStats() {
    const stats = {
      total: OrderService.totalOrders(),
      pending: OrderService.getPendingOrders().data.length,
      confirmed: OrderService.getOrdersByStatus(OrderSchema.STATUS.CONFIRMED).data.length,
      shipped: OrderService.getOrdersByStatus(OrderSchema.STATUS.SHIPPED).data.length,
      delivered: OrderService.getOrdersByStatus(OrderSchema.STATUS.DELIVERED).data.length,
      cancelled: OrderService.getOrdersByStatus(OrderSchema.STATUS.CANCELLED).data.length,
      totalSales: OrderService.getTotalSales()
    };
    const html = HtmlService.createHtmlOutput(
      '<div style="font-family:Arial;padding:12px;"><h2 style="color:#1a237e;margin-top:0;">📋 Order Statistics</h2>' +
      '<table style="width:100%;border-collapse:collapse;">' +
      '<tr><td style="padding:6px;border-bottom:1px solid #ddd;"><b>Total Orders</b></td><td style="padding:6px;border-bottom:1px solid #ddd;text-align:right;">' + stats.total + '</td></tr>' +
      '<tr><td style="padding:6px;border-bottom:1px solid #ddd;color:#f57c00;"><b>Pending</b></td><td style="padding:6px;border-bottom:1px solid #ddd;text-align:right;color:#f57c00;">' + stats.pending + '</td></tr>' +
      '<tr><td style="padding:6px;border-bottom:1px solid #ddd;"><b>Confirmed</b></td><td style="padding:6px;border-bottom:1px solid #ddd;text-align:right;">' + stats.confirmed + '</td></tr>' +
      '<tr><td style="padding:6px;border-bottom:1px solid #ddd;"><b>Shipped</b></td><td style="padding:6px;border-bottom:1px solid #ddd;text-align:right;">' + stats.shipped + '</td></tr>' +
      '<tr><td style="padding:6px;border-bottom:1px solid #ddd;color:#2e7d32;"><b>Delivered</b></td><td style="padding:6px;border-bottom:1px solid #ddd;text-align:right;color:#2e7d32;">' + stats.delivered + '</td></tr>' +
      '<tr><td style="padding:6px;border-bottom:1px solid #ddd;color:#c62828;"><b>Cancelled</b></td><td style="padding:6px;border-bottom:1px solid #ddd;text-align:right;color:#c62828;">' + stats.cancelled + '</td></tr>' +
      '<tr><td style="padding:6px;"><b>Total Sales (Delivered)</b></td><td style="padding:6px;text-align:right;">' + stats.totalSales + '</td></tr>' +
      '</table><p style="margin-top:12px;font-size:12px;color:#666;text-align:center;">PHINOX BOS v5.0</p></div>'
    ).setWidth(380).setHeight(360);
    SpreadsheetApp.getUi().showModalDialog(html, 'Order Statistics');
    return stats;
  }

  function handleApiAction(action, params) {
    params = params || {};
    if (!action || typeof action !== 'string') throw ErrorHandler.validation('Action required', {}, 'OrderController');
    Logger.info('OrderController', 'API action: ' + action, { params: Object.keys(params) });
    switch (action) {
      case 'order.stats': return showOrderStats();
      case 'order.list': return OrderService.getOrders(params);
      case 'order.get': if (!params.id) throw ErrorHandler.validation('ID required', {}, 'OrderController'); return OrderService.getOrder(params.id);
      case 'order.create': return OrderService.createOrder(params);
      case 'order.update': if (!params.id) throw ErrorHandler.validation('ID required', {}, 'OrderController'); return OrderService.updateOrder(params.id, params.updates || Utils.omit(params, ['id', 'action']));
      case 'order.delete': if (!params.id) throw ErrorHandler.validation('ID required', {}, 'OrderController'); return OrderService.deleteOrder(params.id);
      case 'order.confirm': if (!params.id) throw ErrorHandler.validation('ID required', {}, 'OrderController'); return OrderService.confirmOrder(params.id);
      case 'order.cancel': if (!params.id) throw ErrorHandler.validation('ID required', {}, 'OrderController'); return OrderService.cancelOrder(params.id);
      case 'order.ship': if (!params.id) throw ErrorHandler.validation('ID required', {}, 'OrderController'); return OrderService.shipOrder(params.id);
      case 'order.deliver': if (!params.id) throw ErrorHandler.validation('ID required', {}, 'OrderController'); return OrderService.deliverOrder(params.id);
      case 'order.pending': return OrderService.getPendingOrders();
      case 'order.byCustomer': if (!params.email) throw ErrorHandler.validation('Email required', {}, 'OrderController'); return OrderService.getOrdersByCustomer(params.email);
      default: throw ErrorHandler.validation('Unknown action: ' + action, {}, 'OrderController');
    }
  }

  function menuShowStats() {
    try { showOrderStats(); }
    catch (e) { _alert('Error', e.message); throw e; }
  }

  function menuCreateOrder() {
    const ui = SpreadsheetApp.getUi();
    const r1 = ui.prompt('Create Order', 'Enter customer email:', ui.ButtonSet.OK_CANCEL);
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
      const id = OrderService.createOrder({
        customerEmail: email,
        items: [{ sku: sku, qty: qty }],
        shippingCost: shipping
      });
      _alert('Success', 'Order created: ' + id);
    } catch (e) { _alert('Error', e.message); }
  }

  EventBus.on('sheet:edited', onEdit);

  return {
    onEdit: onEdit,
    handleApiAction: handleApiAction,
    showOrderStats: showOrderStats,
    menuShowStats: menuShowStats,
    menuCreateOrder: menuCreateOrder
  };
})();

// ═══════════════════════════════════════════════════
// Global Menu Wrappers
// ═══════════════════════════════════════════════════

function menuOrderStats() { return OrderController.menuShowStats(); }
function menuOrderCreate() { return OrderController.menuCreateOrder(); }
function menuRunOrderTests() {
  try {
    const result = testOrderE2E();
    SpreadsheetApp.getUi().alert('✅ Order E2E Tests Passed', result, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    SpreadsheetApp.getUi().alert('❌ Order E2E Tests Failed', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
    throw e;
  }
}
