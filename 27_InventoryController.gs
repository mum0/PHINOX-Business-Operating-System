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

 /**
 * PHINOX BOS — Inventory Controller
 * Phase 3D Extensions: BOM, Stock Movement, Cost & Margin
 */

// ============================================================
// EXISTING FUNCTIONS (preserve all existing code above this point)
// ============================================================

function handleApiAction(action, params) {
  params = params || {};
  
  // ── Existing Phase 3A/3B Actions ──
  switch (action) {
    case 'inventory.stats':
      return showInventoryStats();
    case 'inventory.list':
      return InventoryService.getItems(params);
    case 'inventory.get':
      if (!params.id) throw new Error('ID required');
      return InventoryService.getItem(params.id);
    case 'inventory.getBySku':
      if (!params.sku) throw new Error('SKU required');
      return InventoryService.getItemBySku(params.sku);
    case 'inventory.create':
      return InventoryService.createItem(params);
    case 'inventory.update':
      if (!params.id) throw new Error('ID required');
      return InventoryService.updateItem(params.id, params);
    case 'inventory.delete':
      if (!params.id) throw new Error('ID required');
      return InventoryService.deleteItem(params.id);
    case 'inventory.reserve':
      if (!params.sku || !params.qty) throw new Error('SKU and quantity required');
      return InventoryService.reserveStock(params.sku, params.qty);
    case 'inventory.release':
      if (!params.sku || !params.qty) throw new Error('SKU and quantity required');
      return InventoryService.releaseStock(params.sku, params.qty);
    case 'inventory.commit':
      if (!params.sku || !params.qty) throw new Error('SKU and quantity required');
      return InventoryService.commitStock(params.sku, params.qty);
    case 'inventory.restock':
      if (!params.sku || !params.qty) throw new Error('SKU and quantity required');
      return InventoryService.restock(params.sku, params.qty);
    case 'inventory.lowStock':
      return InventoryService.getLowStockItems();
    case 'inventory.outOfStock':
      return InventoryService.getOutOfStockItems();
      
    // ═══════════════════════════════════════════════════════
    // PHASE 3D — NEW ACTIONS
    // ═══════════════════════════════════════════════════════
    
    // ── FLOW 3: Stock Movement History ──
    case 'inventory.movements':
      if (!params.sku) throw new Error('SKU required for movement history');
      return StockMovementService.getMovementsBySku(params.sku);
    
    // ── FLOW 2: Stock Adjustment ──
    case 'inventory.adjust':
      if (!params.inventoryId || params.newQuantity === undefined || !params.reason) {
        throw new Error('inventoryId, newQuantity, and reason required');
      }
      return InventoryService.adjustStock(
        params.inventoryId,
        params.newQuantity,
        params.reason,
        params.notes || ''
      );
    
    // ── FLOW 4: BOM View ──
    case 'inventory.bom':
      if (!params.sku) throw new Error('SKU required');
      return BOMService.getBOMByFinishedProductSku(params.sku);
    
    case 'inventory.bomItems':
      if (!params.bomId) throw new Error('bomId required');
      return BOMService.getBOMItems(params.bomId);
    
    // ── FLOW 5: BOM Management ──
    case 'inventory.bomCreate':
      return BOMService.createBOM(params);
    
    case 'inventory.bomUpdate':
      if (!params.id) throw new Error('BOM ID required');
      return BOMService.updateBOM(params.id, params);
    
    case 'inventory.bomDelete':
      if (!params.id) throw new Error('BOM ID required');
      return BOMService.deleteBOM(params.id);
    
    case 'inventory.bomItemAdd':
      if (!params.bomId) throw new Error('bomId required');
      return BOMService.addBOMItem(params.bomId, params);
    
    case 'inventory.bomItemUpdate':
      if (!params.id) throw new Error('BOM Item ID required');
      return BOMService.updateBOMItem(params.id, params);
    
    case 'inventory.bomItemRemove':
      if (!params.id) throw new Error('BOM Item ID required');
      return BOMService.removeBOMItem(params.id);
    
    // ── FLOW 6: Cost & Margin ──
    case 'inventory.cost':
      if (!params.productId) throw new Error('productId required');
      return BOMService.calculateUnitCost(params.productId);
    
    case 'inventory.margin':
      if (!params.productId) throw new Error('productId required');
      return BOMService.calculateGrossMargin(params.productId);
    
    default:
      throw new Error('Unknown inventory action: ' + action);
  }
}

// ============================================================
// PHASE 3D — MENU FUNCTIONS
// ============================================================

function menuShowBOM() {
  try {
    var html = HtmlService.createHtmlOutput(
      '<p style="font-family:sans-serif;padding:20px;">Use the HTML Dashboard (Inventory tab) to view and manage BOMs.</p>'
    )
    .setWidth(400)
    .setHeight(150);
    SpreadsheetApp.getUi().showModalDialog(html, 'BOM Management');
  } catch (e) {
    SpreadsheetApp.getActiveSpreadsheet().toast('Error: ' + e.message);
  }
}

function menuShowMovements() {
  try {
    var html = HtmlService.createHtmlOutput(
      '<p style="font-family:sans-serif;padding:20px;">Use the HTML Dashboard (Inventory tab → Movements) to view stock movement history.</p>'
    )
    .setWidth(400)
    .setHeight(150);
    SpreadsheetApp.getUi().showModalDialog(html, 'Stock Movements');
  } catch (e) {
    SpreadsheetApp.getActiveSpreadsheet().toast('Error: ' + e.message);
  }
}

function menuAdjustStock() {
  try {
    var html = HtmlService.createHtmlOutput(
      '<p style="font-family:sans-serif;padding:20px;">Use the HTML Dashboard (Inventory tab → Adjust Stock) to adjust inventory quantities.</p>'
    )
    .setWidth(400)
    .setHeight(150);
    SpreadsheetApp.getUi().showModalDialog(html, 'Stock Adjustment');
  } catch (e) {
    SpreadsheetApp.getActiveSpreadsheet().toast('Error: ' + e.message);
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
