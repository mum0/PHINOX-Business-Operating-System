/**
 * Inventory Service
 * Business logic layer for Inventory.
 * PHINOX is a clothing store — SKU is per-variant.
 * NO SpreadsheetApp. NO direct sheet access.
 * UPDATED Phase 3B: Added StockMovement integration, adjustStock, returnStock.
 *                  Split _updateItemRaw (internal) from updateItem (public, blocks stock fields).
 */

const InventoryService = (function() {
 'use strict';

 const S = InventorySchema.STATUS;

 function _now() { return new Date(); }
 function _toNumber(value, def) { const n = Number(value); return isNaN(n) ? (def !== undefined ? def : 0) : n; }
 function _round(num, d) { d = d || 2; return Math.round(num * Math.pow(10, d)) / Math.pow(10, d); }
 function _generateInvId() { return 'INV-' + Math.random().toString(36).substr(2, 9).toUpperCase(); }

 function _validateInput(data, isUpdate) {
   const schema = {};
   const fields = isUpdate ? Object.keys(data) : Object.keys(InventorySchema.VALIDATION);
   fields.forEach(function(f) { if (InventorySchema.VALIDATION[f]) schema[f] = InventorySchema.VALIDATION[f]; });
   if (!isUpdate) {
     const defaults = InventorySchema.getDefaultItem();
     Object.keys(defaults).forEach(function(k) {
       if (data[k] === undefined || data[k] === null || data[k] === '') data[k] = defaults[k];
     });
   }
   return Validator.validate(data, schema, 'InventoryService');
 }

 function _recalculateAvailable(item) {
   item.available = Math.max(0, _toNumber(item.quantity) - _toNumber(item.reserved));
   return item;
 }

 function _checkSkuUnique(sku) {
   const existing = InventoryRepository.findBySku(sku);
   if (existing) throw ErrorHandler.conflict('SKU already exists: ' + sku, { sku: sku }, 'InventoryService');
 }

 function _checkStockInvariant(item) {
   const q = _toNumber(item.quantity), r = _toNumber(item.reserved);
   if (r > q) throw ErrorHandler.validation('Reserved (' + r + ') cannot exceed quantity (' + q + ')', { reserved: r, quantity: q }, 'InventoryService');
   if (item.available < 0) throw ErrorHandler.validation('Available cannot be negative', { available: item.available }, 'InventoryService');
 }

 function _autoStatus(item) {
   if (_toNumber(item.quantity) === 0) item.status = S.OUT_OF_STOCK;
   return item;
 }

 function _handleMovementFailure(item, movementType, qty, qtyBefore, qtyAfter, refType, refId, error) {
   Logger.error('InventoryService', 'CRITICAL: Movement creation failed after inventory update', {
     inventoryId: item.id, sku: item.sku, intendedType: movementType, quantity: qty,
     quantityBefore: qtyBefore, quantityAfter: qtyAfter,
     referenceType: refType || '', referenceId: refId || '',
     error: error.message, timestamp: _now().toISOString()
   });
   try {
     if (typeof logActivity === 'function') {
       var user = 'System';
       try { user = getCurrentMember() || 'System'; } catch (e) {}
       logActivity(user, 'STOCK_RECONCILE_REQUIRED', 'StockMovement',
         movementType + ':' + item.id, item.sku,
         'Inventory updated but movement creation failed. qtyBefore=' + qtyBefore +
         ' qtyAfter=' + qtyAfter + ' type=' + movementType + ' error=' + error.message);
     }
   } catch (auditError) {
     Logger.error('InventoryService', 'CRITICAL: Audit log also failed', { error: auditError.message });
   }
 }

 function _recordMovement(data) {
   if (typeof StockMovementService === 'undefined' || !StockMovementService.recordMovement) {
     Logger.warn('InventoryService', 'StockMovementService not available, movement not recorded', { sku: data.sku });
     return;
   }
   StockMovementService.recordMovement(data);
 }

 // ============ CRUD ============

 function createItem(data) {
   const item = Utils.clone(data);
   if (!item.id) item.id = _generateInvId();
   const defaults = InventorySchema.getDefaultItem();
   Object.keys(defaults).forEach(function(k) {
     if (item[k] === undefined || item[k] === null || item[k] === '') item[k] = defaults[k];
   });
   _validateInput(item, false);
   _checkSkuUnique(item.sku);
   if (item.sku) item.sku = Utils.safeStr(item.sku).trim().toUpperCase();
   if (item.name) item.name = Utils.safeStr(item.name).trim();
   if (item.category) item.category = Utils.safeStr(item.category).trim();
   if (item.size) item.size = Utils.safeStr(item.size).trim();
   if (item.color) item.color = Utils.safeStr(item.color).trim();
   if (item.location) item.location = Utils.safeStr(item.location).trim();
   if (item.notes) item.notes = Utils.safeStr(item.notes).trim();
   item.quantity = _toNumber(item.quantity);
   item.reserved = _toNumber(item.reserved);
   item.cost = _toNumber(item.cost);
   item.price = _toNumber(item.price);
   item.reorderLevel = _toNumber(item.reorderLevel);
   _recalculateAvailable(item); _autoStatus(item); _checkStockInvariant(item);
   const created = InventoryRepository.create(item);
   Logger.info('InventoryService', 'Item created', { id: created.id, sku: created.sku, name: created.name });
   return created.id;
 }

 function getItem(id) { return id ? InventoryRepository.findById(id) : null; }
 function getItemBySku(sku) { return sku ? InventoryRepository.findBySku(String(sku).trim().toUpperCase()) : null; }
 function getItems(options) { return InventoryRepository.findAll(options); }

 function _updateItemRaw(id, updates) {
   if (!id) throw ErrorHandler.validation('ID required', {}, 'InventoryService');
   const existing = InventoryRepository.findById(id);
   if (!existing) throw ErrorHandler.notFound('Inventory Item', id, 'InventoryService');
   const data = Utils.clone(updates);
   delete data.id; delete data.createdAt; delete data.createdBy;
   if (data.sku !== undefined) {
     const normalized = String(data.sku).trim().toUpperCase();
     if (normalized !== existing.sku) _checkSkuUnique(normalized);
     data.sku = normalized;
   }
   if (data.name !== undefined) data.name = Utils.safeStr(data.name).trim();
   if (data.category !== undefined) data.category = Utils.safeStr(data.category).trim();
   if (data.size !== undefined) data.size = Utils.safeStr(data.size).trim();
   if (data.color !== undefined) data.color = Utils.safeStr(data.color).trim();
   if (data.location !== undefined) data.location = Utils.safeStr(data.location).trim();
   if (data.notes !== undefined) data.notes = Utils.safeStr(data.notes).trim();
   if (data.quantity !== undefined) data.quantity = _toNumber(data.quantity);
   if (data.reserved !== undefined) data.reserved = _toNumber(data.reserved);
   if (data.cost !== undefined) data.cost = _toNumber(data.cost);
   if (data.price !== undefined) data.price = _toNumber(data.price);
   if (data.reorderLevel !== undefined) data.reorderLevel = _toNumber(data.reorderLevel);
   if (Object.keys(data).length > 0) _validateInput(data, true);
   const merged = Object.assign({}, existing, data);
   _recalculateAvailable(merged); _autoStatus(merged); _checkStockInvariant(merged);
   data.available = merged.available; data.status = merged.status;
   const updated = InventoryRepository.update(id, data);
   Logger.info('InventoryService', 'Item updated (raw)', { id: id, sku: updated.sku });
   return updated;
 }

 function updateItem(id, updates) {
   if (!id) throw ErrorHandler.validation('ID required', {}, 'InventoryService');
   const data = Utils.clone(updates);
   if (data.quantity !== undefined) {
     throw ErrorHandler.validation('Direct quantity changes are not permitted. Use adjustStock() or returnStock() instead.', { field: 'quantity' }, 'InventoryService');
   }
   if (data.reserved !== undefined) {
     throw ErrorHandler.validation('Direct reserved changes are not permitted. Use reserveStock() or releaseStock() instead.', { field: 'reserved' }, 'InventoryService');
   }
   return _updateItemRaw(id, data);
 }

 function deleteItem(id) {
   if (!id) throw ErrorHandler.validation('ID required', {}, 'InventoryService');
   const existing = InventoryRepository.findById(id);
   if (!existing) throw ErrorHandler.notFound('Inventory Item', id, 'InventoryService');
   if (_toNumber(existing.quantity) > 0 || _toNumber(existing.reserved) > 0) {
     throw ErrorHandler.validation('Cannot delete item with stock. Set status to Discontinued instead.', { quantity: existing.quantity, reserved: existing.reserved }, 'InventoryService');
   }
   InventoryRepository.delete(id);
   Logger.info('InventoryService', 'Item deleted', { id: id });
   return true;
 }

 // ============ STOCK OPERATIONS ============

 function reserveStock(sku, qty, referenceType, referenceId) {
   if (!sku || qty === undefined || qty === null) throw ErrorHandler.validation('SKU and quantity required', {}, 'InventoryService');
   qty = _toNumber(qty);
   if (qty <= 0) throw ErrorHandler.validation('Reserve quantity must be positive', { qty: qty }, 'InventoryService');
   const item = getItemBySku(sku);
   if (!item) throw ErrorHandler.notFound('SKU', sku, 'InventoryService');
   if (item.status === S.DISCONTINUED) throw ErrorHandler.validation('Cannot reserve discontinued item', { sku: sku }, 'InventoryService');
   if (_toNumber(item.available) < qty) throw ErrorHandler.validation('Insufficient stock. Available: ' + item.available + ', Requested: ' + qty, { available: item.available, requested: qty }, 'InventoryService');
   const newReserved = _toNumber(item.reserved) + qty;
   const qtyBefore = _toNumber(item.quantity); const qtyAfter = qtyBefore;
   const updated = _updateItemRaw(item.id, { reserved: newReserved });
   try { SpreadsheetApp.flush(); } catch (e) {}
   try {
     _recordMovement({ inventoryId: item.id, sku: item.sku, movementType: 'RESERVE', quantity: qty,
       quantityBefore: qtyBefore, quantityAfter: qtyAfter, reason: 'Stock reservation',
       referenceType: referenceType || '', referenceId: referenceId || '', notes: '' });
   } catch (movementError) { _handleMovementFailure(item, 'RESERVE', qty, qtyBefore, qtyAfter, referenceType, referenceId, movementError); }
   Logger.info('InventoryService', 'Stock reserved', { sku: sku, qty: qty, reserved: updated.reserved, available: updated.available });
   return true;
 }

 function releaseStock(sku, qty, referenceType, referenceId) {
   if (!sku || qty === undefined || qty === null) throw ErrorHandler.validation('SKU and quantity required', {}, 'InventoryService');
   qty = _toNumber(qty);
   if (qty <= 0) throw ErrorHandler.validation('Release quantity must be positive', { qty: qty }, 'InventoryService');
   const item = getItemBySku(sku);
   if (!item) throw ErrorHandler.notFound('SKU', sku, 'InventoryService');
   if (_toNumber(item.reserved) < qty) throw ErrorHandler.validation('Cannot release more than reserved. Reserved: ' + item.reserved + ', Requested: ' + qty, { reserved: item.reserved, requested: qty }, 'InventoryService');
   const newReserved = _toNumber(item.reserved) - qty;
   const qtyBefore = _toNumber(item.quantity); const qtyAfter = qtyBefore;
   const updated = _updateItemRaw(item.id, { reserved: newReserved });
   try { SpreadsheetApp.flush(); } catch (e) {}
   try {
     _recordMovement({ inventoryId: item.id, sku: item.sku, movementType: 'RELEASE', quantity: qty,
       quantityBefore: qtyBefore, quantityAfter: qtyAfter, reason: 'Stock release',
       referenceType: referenceType || '', referenceId: referenceId || '', notes: '' });
   } catch (movementError) { _handleMovementFailure(item, 'RELEASE', qty, qtyBefore, qtyAfter, referenceType, referenceId, movementError); }
   Logger.info('InventoryService', 'Stock released', { sku: sku, qty: qty, reserved: updated.reserved, available: updated.available });
   return true;
 }

 function commitStock(sku, qty, referenceType, referenceId) {
   if (!sku || qty === undefined || qty === null) throw ErrorHandler.validation('SKU and quantity required', {}, 'InventoryService');
   qty = _toNumber(qty);
   if (qty <= 0) throw ErrorHandler.validation('Commit quantity must be positive', { qty: qty }, 'InventoryService');
   const item = getItemBySku(sku);
   if (!item) throw ErrorHandler.notFound('SKU', sku, 'InventoryService');
   if (_toNumber(item.available) < qty) throw ErrorHandler.validation('Insufficient stock to commit. Available: ' + item.available + ', Requested: ' + qty, { available: item.available, requested: qty }, 'InventoryService');
   const newQuantity = _toNumber(item.quantity) - qty;
   const newReserved = _toNumber(item.reserved) - qty;
   if (newReserved < 0) throw ErrorHandler.validation('Cannot commit more than reserved', { reserved: item.reserved, requested: qty }, 'InventoryService');
   const qtyBefore = _toNumber(item.quantity); const qtyAfter = newQuantity;
   const updated = _updateItemRaw(item.id, { quantity: newQuantity, reserved: newReserved });
   try { SpreadsheetApp.flush(); } catch (e) {}
   try {
     _recordMovement({ inventoryId: item.id, sku: item.sku, movementType: 'COMMIT', quantity: qty,
       quantityBefore: qtyBefore, quantityAfter: qtyAfter, reason: 'Stock commit',
       referenceType: referenceType || '', referenceId: referenceId || '', notes: '' });
   } catch (movementError) { _handleMovementFailure(item, 'COMMIT', qty, qtyBefore, qtyAfter, referenceType, referenceId, movementError); }
   Logger.info('InventoryService', 'Stock committed', { sku: sku, qty: qty, quantity: updated.quantity, reserved: updated.reserved, available: updated.available });
   return true;
 }

 function restock(sku, qty, referenceType, referenceId) {
   if (!sku || qty === undefined || qty === null) throw ErrorHandler.validation('SKU and quantity required', {}, 'InventoryService');
   qty = _toNumber(qty);
   if (qty <= 0) throw ErrorHandler.validation('Restock quantity must be positive', { qty: qty }, 'InventoryService');
   const item = getItemBySku(sku);
   if (!item) throw ErrorHandler.notFound('SKU', sku, 'InventoryService');
   const newQuantity = _toNumber(item.quantity) + qty;
   const qtyBefore = _toNumber(item.quantity); const qtyAfter = newQuantity;
   const updated = _updateItemRaw(item.id, { quantity: newQuantity });
   try { SpreadsheetApp.flush(); } catch (e) {}
   try {
     _recordMovement({ inventoryId: item.id, sku: item.sku, movementType: 'RESTOCK', quantity: qty,
       quantityBefore: qtyBefore, quantityAfter: qtyAfter, reason: 'Stock restock',
       referenceType: referenceType || '', referenceId: referenceId || '', notes: '' });
   } catch (movementError) { _handleMovementFailure(item, 'RESTOCK', qty, qtyBefore, qtyAfter, referenceType, referenceId, movementError); }
   Logger.info('InventoryService', 'Stock restocked', { sku: sku, qty: qty, quantity: updated.quantity, available: updated.available });
   return true;
 }

 function adjustStock(inventoryId, newQuantity, reason, notes, referenceType, referenceId) {
   if (!inventoryId) throw ErrorHandler.validation('Inventory ID required', {}, 'InventoryService');
   if (newQuantity === undefined || newQuantity === null) throw ErrorHandler.validation('New quantity required', {}, 'InventoryService');
   newQuantity = _toNumber(newQuantity);
   if (newQuantity < 0) throw ErrorHandler.validation('Quantity cannot be negative', { quantity: newQuantity }, 'InventoryService');
   if (!reason || !String(reason).trim()) throw ErrorHandler.validation('Reason is required for adjustments', {}, 'InventoryService');
   const item = getItem(inventoryId);
   if (!item) throw ErrorHandler.notFound('Inventory Item', inventoryId, 'InventoryService');
   const qtyBefore = _toNumber(item.quantity);
   const reserved = _toNumber(item.reserved);
   if (newQuantity < reserved) throw ErrorHandler.validation('Adjustment would make quantity (' + newQuantity + ') less than reserved (' + reserved + ')', { quantity: newQuantity, reserved: reserved }, 'InventoryService');
   const qtyAfter = newQuantity;
   const delta = Math.abs(qtyAfter - qtyBefore);
   if (delta === 0) throw ErrorHandler.validation('No change in quantity', {}, 'InventoryService');
   const updated = _updateItemRaw(item.id, { quantity: qtyAfter });
   try { SpreadsheetApp.flush(); } catch (e) {}
   try {
     _recordMovement({ inventoryId: item.id, sku: item.sku, movementType: 'ADJUSTMENT', quantity: delta,
       quantityBefore: qtyBefore, quantityAfter: qtyAfter, reason: String(reason).trim(),
       referenceType: referenceType || '', referenceId: referenceId || '', notes: notes || '' });
   } catch (movementError) {
     _handleMovementFailure(item, 'ADJUSTMENT', delta, qtyBefore, qtyAfter, referenceType, referenceId, movementError);
     throw movementError;
   }
   Logger.info('InventoryService', 'Stock adjusted', { id: item.id, sku: item.sku, before: qtyBefore, after: qtyAfter });
   return updated;
 }

 function returnStock(inventoryId, qty, referenceId, notes, referenceType) {
   if (!inventoryId || qty === undefined || qty === null) throw ErrorHandler.validation('Inventory ID and quantity required', {}, 'InventoryService');
   qty = _toNumber(qty);
   if (qty <= 0) throw ErrorHandler.validation('Return quantity must be positive', { qty: qty }, 'InventoryService');
   const item = getItem(inventoryId);
   if (!item) throw ErrorHandler.notFound('Inventory Item', inventoryId, 'InventoryService');
   const qtyBefore = _toNumber(item.quantity);
   const qtyAfter = qtyBefore + qty;
   const updated = _updateItemRaw(item.id, { quantity: qtyAfter });
   try { SpreadsheetApp.flush(); } catch (e) {}
   try {
     _recordMovement({ inventoryId: item.id, sku: item.sku, movementType: 'CUSTOMER_RETURN', quantity: qty,
       quantityBefore: qtyBefore, quantityAfter: qtyAfter, reason: 'Customer return',
       referenceType: referenceType || 'Return', referenceId: referenceId || '', notes: notes || '' });
   } catch (movementError) {
     _handleMovementFailure(item, 'CUSTOMER_RETURN', qty, qtyBefore, qtyAfter, referenceType, referenceId, movementError);
     throw movementError;
   }
   Logger.info('InventoryService', 'Stock returned', { id: item.id, sku: item.sku, qty: qty });
   return updated;
 }

 // ============ QUERIES ============

 function getItemsByCategory(category) {
   return InventoryRepository.findAll({ limit: CONFIG.PAGINATION.MAX_LIMIT, where: function(item) { return item.category === category; } });
 }

 function getItemsByStatus(status) {
   return InventoryRepository.findAll({ limit: CONFIG.PAGINATION.MAX_LIMIT, where: function(item) { return item.status === status; } });
 }

 function getLowStockItems() {
   return InventoryRepository.findAll({ limit: CONFIG.PAGINATION.MAX_LIMIT, where: function(item) {
     return _toNumber(item.available) <= _toNumber(item.reorderLevel) && _toNumber(item.available) > 0;
   }});
 }

 function getOutOfStockItems() {
   return InventoryRepository.findAll({ limit: CONFIG.PAGINATION.MAX_LIMIT, where: function(item) {
     return _toNumber(item.available) === 0 && item.status !== S.DISCONTINUED;
   }});
 }

 function getInventoryValue() {
   const result = InventoryRepository.findAll({ limit: CONFIG.PAGINATION.MAX_LIMIT });
   return _round(result.data.reduce(function(acc, item) { return acc + (_toNumber(item.quantity) * _toNumber(item.cost)); }, 0), 2);
 }

 function getInventoryRetailValue() {
   const result = InventoryRepository.findAll({ limit: CONFIG.PAGINATION.MAX_LIMIT });
   return _round(result.data.reduce(function(acc, item) { return acc + (_toNumber(item.available) * _toNumber(item.price)); }, 0), 2);
 }

 function totalItems() { return InventoryRepository.count(); }

 return {
   createItem, getItem, getItemBySku, getItems, updateItem, deleteItem,
   reserveStock, releaseStock, commitStock, restock, adjustStock, returnStock,
   getItemsByCategory, getItemsByStatus, getLowStockItems, getOutOfStockItems,
   getInventoryValue, getInventoryRetailValue, totalItems
 };
})();
