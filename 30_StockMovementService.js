/**
 * Stock Movement Service
 * Business logic layer for StockMovement audit trail.
 * Append-only. NO updates or deletes exposed through public API.
 */

const StockMovementService = (function() {
  'use strict';

  const MT = StockMovementSchema.MOVEMENT_TYPES;

  function _now() { return new Date(); }
  function _toNumber(value, def) { const n = Number(value); return isNaN(n) ? (def !== undefined ? def : 0) : n; }
  function _generateMovementId() { return 'MOV-' + Math.random().toString(36).substr(2, 9).toUpperCase(); }

  function _validateInput(data, isUpdate) {
    const schema = {};
    const fields = isUpdate ? Object.keys(data) : Object.keys(StockMovementSchema.VALIDATION);
    fields.forEach(function(f) { if (StockMovementSchema.VALIDATION[f]) schema[f] = StockMovementSchema.VALIDATION[f]; });
    if (!isUpdate) {
      const defaults = StockMovementSchema.getDefaultMovement();
      Object.keys(defaults).forEach(function(k) {
        if (data[k] === undefined || data[k] === null || data[k] === '') data[k] = defaults[k];
      });
    }
    return Validator.validate(data, schema, 'StockMovementService');
  }

  function recordMovement(data) {
    if (!data) throw ErrorHandler.validation('Movement data required', {}, 'StockMovementService');
    const movement = Utils.clone(data);
    if (!movement.inventoryId) throw ErrorHandler.validation('inventoryId required', {}, 'StockMovementService');
    if (!movement.sku) throw ErrorHandler.validation('sku required', {}, 'StockMovementService');
    if (!movement.movementType) throw ErrorHandler.validation('movementType required', {}, 'StockMovementService');
    if (!MT[movement.movementType]) throw ErrorHandler.validation('Invalid movement type: ' + movement.movementType, {}, 'StockMovementService');
    if (movement.quantity === undefined || movement.quantity === null) throw ErrorHandler.validation('quantity required', {}, 'StockMovementService');
    if (_toNumber(movement.quantity) <= 0) throw ErrorHandler.validation('quantity must be positive', { quantity: movement.quantity }, 'StockMovementService');
    if (movement.quantityBefore === undefined) throw ErrorHandler.validation('quantityBefore required', {}, 'StockMovementService');
    if (movement.quantityAfter === undefined) throw ErrorHandler.validation('quantityAfter required', {}, 'StockMovementService');

    movement.id = movement.id || _generateMovementId();
    movement.reason = movement.reason || '';
    movement.referenceType = movement.referenceType || '';
    movement.referenceId = movement.referenceId || '';
    movement.notes = movement.notes || '';
    movement.createdAt = _now().toISOString();
    try { movement.createdBy = Session.getActiveUser().getEmail(); } catch (e) { movement.createdBy = 'System'; }

    return StockMovementRepository.create(movement);
  }

  function getMovementsByInventoryId(inventoryId, options) {
    if (!inventoryId) throw ErrorHandler.validation('inventoryId required', {}, 'StockMovementService');
    return StockMovementRepository.findByInventoryId(inventoryId);
  }

  function getMovementsBySku(sku, options) {
    if (!sku) throw ErrorHandler.validation('sku required', {}, 'StockMovementService');
    return StockMovementRepository.findBySku(String(sku).trim().toUpperCase());
  }

  function getAllMovements(options) {
    return StockMovementRepository.findAll(options || { limit: CONFIG.PAGINATION.MAX_LIMIT });
  }

  function reconcileMovements() {
    const report = { status: 'CLEAN', count: 0, items: [], lastCheckedAt: _now().toISOString() };
    if (typeof getActivityByAction !== 'function') {
      Logger.warn('StockMovementService', 'getActivityByAction not available, cannot reconcile');
      return report;
    }
    let auditEntries;
    try { auditEntries = getActivityByAction('STOCK_RECONCILE_REQUIRED'); }
    catch (e) { Logger.error('StockMovementService', 'Failed to query audit log', { error: e.message }); return report; }
    if (!auditEntries || auditEntries.length === 0) return report;

    let movements;
    try { movements = StockMovementRepository.findAll({ limit: CONFIG.PAGINATION.MAX_LIMIT }); }
    catch (e) { Logger.error('StockMovementService', 'Failed to query movements', { error: e.message }); return report; }

    const movementMap = {};
    movements.data.forEach(function(m) {
      const key = m.inventoryId + ':' + m.movementType;
      if (!movementMap[key]) movementMap[key] = [];
      movementMap[key].push(m);
    });

    auditEntries.forEach(function(entry) {
      const recordId = entry[5] || '';
      const parts = recordId.split(':');
      if (parts.length < 2) return;
      const intendedType = parts[0], inventoryId = parts[1];
      const sku = entry[6] || '', errorDetail = entry[7] || '';
      const key = inventoryId + ':' + intendedType;
      const matchingMovements = movementMap[key] || [];
      const auditDate = new Date(entry[1]);
      let found = false;
      for (let i = 0; i < matchingMovements.length; i++) {
        const mDate = new Date(matchingMovements[i].createdAt);
        if (Math.abs(mDate.getTime() - auditDate.getTime()) < 5 * 60 * 1000) { found = true; break; }
      }
      if (!found) {
        report.status = 'RECONCILE_REQUIRED'; report.count++;
        let qtyBefore = null, qtyAfter = null, qty = null;
        const beforeMatch = errorDetail.match(/qtyBefore=([-\\d.]+)/);
        const afterMatch = errorDetail.match(/qtyAfter=([-\\d.]+)/);
        if (beforeMatch) qtyBefore = Number(beforeMatch[1]);
        if (afterMatch) qtyAfter = Number(afterMatch[1]);
        if (qtyBefore !== null && qtyAfter !== null) qty = Math.abs(qtyAfter - qtyBefore);
        report.items.push({ inventoryId, sku, movementType: intendedType, quantity: qty,
          quantityBefore: qtyBefore, quantityAfter: qtyAfter, referenceType: '', referenceId: '', error: errorDetail });
      }
    });
    return report;
  }

  return {
    recordMovement, getMovementsByInventoryId, getMovementsBySku,
    getAllMovements, reconcileMovements
  };
})();
