/**
 * Inventory Controller
 * Presentation / routing layer for Inventory.
 * NO business logic. NO direct sheet access.
 */

const InventoryController = (function() {
  'use strict';

  function _alert(title, msg) {
    try { SpreadsheetApp.getUi().alert(title, msg, SpreadsheetApp.getUi().ButtonSet.OK); }
    catch (e) { Logger.warn('InventoryController', 'Cannot show alert', { error: e.message }); }
  }

  function onEdit(payload) {
    if (!payload || payload.sheet !== 'Inventory') return;
    Logger.debug('InventoryController', 'Inventory sheet edited', {
      row: payload.range ? payload.range.getRow() : null,
      user: payload.user
    });
  }

  function showInventoryStats() {
    const stats = {
      total: InventoryService.totalItems(),
      active: InventoryService.getItemsByStatus(InventorySchema.STATUS.ACTIVE).data.length,
      outOfStock: InventoryService.getOutOfStockItems().data.length,
      lowStock: InventoryService.getLowStockItems().data.length,
      inventoryValue: InventoryService.getInventoryValue(),
      retailValue: InventoryService.getInventoryRetailValue()
    };
    const html = HtmlService.createHtmlOutput(
      '<div style="font-family:Arial;padding:12px;"><h2 style="color:#1a237e;margin-top:0;">📦 Inventory Statistics</h2>' +
      '<table style="width:100%;border-collapse:collapse;">' +
      '<tr><td style="padding:6px;border-bottom:1px solid #ddd;"><b>Total SKUs</b></td><td style="padding:6px;border-bottom:1px solid #ddd;text-align:right;">' + stats.total + '</td></tr>' +
      '<tr><td style="padding:6px;border-bottom:1px solid #ddd;"><b>Active</b></td><td style="padding:6px;border-bottom:1px solid #ddd;text-align:right;">' + stats.active + '</td></tr>' +
      '<tr><td style="padding:6px;border-bottom:1px solid #ddd;color:#c62828;"><b>Out of Stock</b></td><td style="padding:6px;border-bottom:1px solid #ddd;text-align:right;color:#c62828;">' + stats.outOfStock + '</td></tr>' +
      '<tr><td style="padding:6px;border-bottom:1px solid #ddd;color:#f57c00;"><b>Low Stock</b></td><td style="padding:6px;border-bottom:1px solid #ddd;text-align:right;color:#f57c00;">' + stats.lowStock + '</td></tr>' +
      '<tr><td style="padding:6px;border-bottom:1px solid #ddd;"><b>Inventory Value (Cost)</b></td><td style="padding:6px;border-bottom:1px solid #ddd;text-align:right;">' + stats.inventoryValue + '</td></tr>' +
      '<tr><td style="padding:6px;"><b>Retail Value</b></td><td style="padding:6px;text-align:right;">' + stats.retailValue + '</td></tr>' +
      '</table><p style="margin-top:12px;font-size:12px;color:#666;text-align:center;">PHINOX BOS v5.0</p></div>'
    ).setWidth(380).setHeight(340);
    SpreadsheetApp.getUi().showModalDialog(html, 'Inventory Statistics');
    return stats;
  }

  function handleApiAction(action, params) {
    params = params || {};
    if (!action || typeof action !== 'string') throw ErrorHandler.validation('Action required', {}, 'InventoryController');
    Logger.info('InventoryController', 'API action: ' + action, { params: Object.keys(params) });
    switch (action) {
      case 'inventory.stats': return showInventoryStats();
      case 'inventory.list': return InventoryService.getItems(params);
      case 'inventory.get': if (!params.id) throw ErrorHandler.validation('ID required', {}, 'InventoryController'); return InventoryService.getItem(params.id);
      case 'inventory.getBySku': if (!params.sku) throw ErrorHandler.validation('SKU required', {}, 'InventoryController'); return InventoryService.getItemBySku(params.sku);
      case 'inventory.create': return InventoryService.createItem(params);
      case 'inventory.update': if (!params.id) throw ErrorHandler.validation('ID required', {}, 'InventoryController'); return InventoryService.updateItem(params.id, params.updates || Utils.omit(params, ['id', 'action']));
      case 'inventory.delete': if (!params.id) throw ErrorHandler.validation('ID required', {}, 'InventoryController'); return InventoryService.deleteItem(params.id);
      case 'inventory.reserve': if (!params.sku || !params.qty) throw ErrorHandler.validation('SKU and qty required', {}, 'InventoryController'); return InventoryService.reserveStock(params.sku, params.qty);
      case 'inventory.release': if (!params.sku || !params.qty) throw ErrorHandler.validation('SKU and qty required', {}, 'InventoryController'); return InventoryService.releaseStock(params.sku, params.qty);
      case 'inventory.commit': if (!params.sku || !params.qty) throw ErrorHandler.validation('SKU and qty required', {}, 'InventoryController'); return InventoryService.commitStock(params.sku, params.qty);
      case 'inventory.restock': if (!params.sku || !params.qty) throw ErrorHandler.validation('SKU and qty required', {}, 'InventoryController'); return InventoryService.restock(params.sku, params.qty);
      case 'inventory.lowStock': return InventoryService.getLowStockItems();
      case 'inventory.outOfStock': return InventoryService.getOutOfStockItems();
      default: throw ErrorHandler.validation('Unknown action: ' + action, {}, 'InventoryController');
    }
  }

  function menuShowStats() {
    try { showInventoryStats(); }
    catch (e) { _alert('Error', e.message); throw e; }
  }

  function menuCreateItem() {
    const ui = SpreadsheetApp.getUi();
    const r1 = ui.prompt('Create Inventory Item', 'Enter product name:', ui.ButtonSet.OK_CANCEL);
    if (r1.getSelectedButton() !== ui.Button.OK) return;
    const name = r1.getResponseText().trim();
    if (!name) { _alert('Error', 'Name is required'); return; }
    const r2 = ui.prompt('Enter SKU (e.g. PHX-TEE-001-BLK-M):', ui.ButtonSet.OK_CANCEL);
    if (r2.getSelectedButton() !== ui.Button.OK) return;
    const sku = r2.getResponseText().trim().toUpperCase();
    if (!sku) { _alert('Error', 'SKU is required'); return; }
    const r3 = ui.prompt('Enter category (e.g. T-Shirts):', ui.ButtonSet.OK_CANCEL);
    if (r3.getSelectedButton() !== ui.Button.OK) return;
    const category = r3.getResponseText().trim();
    const r4 = ui.prompt('Enter quantity:', ui.ButtonSet.OK_CANCEL);
    if (r4.getSelectedButton() !== ui.Button.OK) return;
    const qty = Number(r4.getResponseText().trim()) || 0;
    const r5 = ui.prompt('Enter cost per unit:', ui.ButtonSet.OK_CANCEL);
    if (r5.getSelectedButton() !== ui.Button.OK) return;
    const cost = Number(r5.getResponseText().trim()) || 0;
    const r6 = ui.prompt('Enter price per unit:', ui.ButtonSet.OK_CANCEL);
    if (r6.getSelectedButton() !== ui.Button.OK) return;
    const price = Number(r6.getResponseText().trim()) || 0;
    try {
      const id = InventoryService.createItem({
        sku: sku, name: name, category: category,
        quantity: qty, cost: cost, price: price,
        size: '', color: '', location: '', reorderLevel: 10
      });
      _alert('Success', 'Item created: ' + id);
    } catch (e) { _alert('Error', e.message); }
  }

  EventBus.on('sheet:edited', onEdit);

  return {
    onEdit: onEdit,
    handleApiAction: handleApiAction,
    showInventoryStats: showInventoryStats,
    menuShowStats: menuShowStats,
    menuCreateItem: menuCreateItem
  };
})();

// ═══════════════════════════════════════════════════
// Global Menu Wrappers
// ═══════════════════════════════════════════════════

function menuInventoryStats() { return InventoryController.menuShowStats(); }
function menuInventoryCreate() { return InventoryController.menuCreateItem(); }
function menuRunInventoryTests() {
  try {
    const result = testInventoryE2E();
    SpreadsheetApp.getUi().alert('✅ Inventory E2E Tests Passed', result, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    SpreadsheetApp.getUi().alert('❌ Inventory E2E Tests Failed', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
    throw e;
  }
}
