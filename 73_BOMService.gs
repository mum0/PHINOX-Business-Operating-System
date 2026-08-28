/**
 * BOM Service
 * Business logic layer for Bill of Materials.
 * PHASE 3C
 * NO SpreadsheetApp. NO direct sheet access.
 */

const BOMService = (function() {
    'use strict';
  
    const INV_TYPE = InventorySchema.TYPE;
  
    function _now() { return new Date(); }
    function _toNumber(value, def) { const n = Number(value); return isNaN(n) ? (def !== undefined ? def : 0) : n; }
    function _round(num, d) { d = d || 2; return Math.round(num * Math.pow(10, d)) / Math.pow(10, d); }
    function _generateBOMId() { return 'BOM-' + Math.random().toString(36).substr(2, 9).toUpperCase(); }
    function _generateItemId() { return 'BMI-' + Math.random().toString(36).substr(2, 9).toUpperCase(); }
  
    function _getCurrentUser() {
      try { return Session.getActiveUser().getEmail(); } catch (e) { return 'System'; }
    }
  
    function _requireBOMRead() {
      var member = getCurrentMember();
      if (!member) throw ErrorHandler.permission('read', 'BOM', 'BOMService');
      requirePermission(member, PERMISSIONS.INVENTORY_BOM_READ);
      return member;
    }
  
    function _requireBOMManage() {
      var member = getCurrentMember();
      if (!member) throw ErrorHandler.permission('manage', 'BOM', 'BOMService');
      requirePermission(member, PERMISSIONS.INVENTORY_BOM_MANAGE);
      return member;
    }
  
    function _validateBOMInput(data, isUpdate) {
      const schema = {};
      const fields = isUpdate ? Object.keys(data) : Object.keys(BOMSchema.VALIDATION);
      fields.forEach(function(f) { if (BOMSchema.VALIDATION[f]) schema[f] = BOMSchema.VALIDATION[f]; });
      if (!isUpdate) {
        const defaults = BOMSchema.getDefaultBOM();
        Object.keys(defaults).forEach(function(k) {
          if (data[k] === undefined || data[k] === null || data[k] === '') data[k] = defaults[k];
        });
      }
      return Validator.validate(data, schema, 'BOMService');
    }
  
    function _validateItemInput(data, isUpdate) {
      const schema = {};
      const fields = isUpdate ? Object.keys(data) : Object.keys(BOMAItemSchema.VALIDATION);
      fields.forEach(function(f) { if (BOMAItemSchema.VALIDATION[f]) schema[f] = BOMAItemSchema.VALIDATION[f]; });
      if (!isUpdate) {
        const defaults = BOMAItemSchema.getDefaultItem();
        Object.keys(defaults).forEach(function(k) {
          if (data[k] === undefined || data[k] === null || data[k] === '') data[k] = defaults[k];
        });
      }
      return Validator.validate(data, schema, 'BOMService');
    }
  
    function _checkFinishedProduct(sku) {
      const item = InventoryService.getItemBySku(sku);
      if (!item) throw ErrorHandler.notFound('Inventory SKU', sku, 'BOMService');
      var type = item.type || '';
      if (type !== INV_TYPE.FINISHED_GOOD && type !== '') {
        throw ErrorHandler.validation('BOM can only be created for FINISHED_GOOD. SKU ' + sku + ' is type: ' + type, { sku: sku, type: type }, 'BOMService');
      }
      return item;
    }
  
    function _checkComponent(sku) {
      const item = InventoryService.getItemBySku(sku);
      if (!item) throw ErrorHandler.notFound('Component SKU', sku, 'BOMService');
      var type = item.type || '';
      if (type === INV_TYPE.FINISHED_GOOD) {
        throw ErrorHandler.validation('Component cannot be a FINISHED_GOOD: ' + sku, { sku: sku, type: type }, 'BOMService');
      }
      return item;
    }
  
    function _checkNoActiveBOM(sku) {
      const existing = BOMRepository.findByFinishedProductSku(sku);
      if (existing) throw ErrorHandler.conflict('Active BOM already exists for SKU: ' + sku, { sku: sku, bomId: existing.id }, 'BOMService');
    }
  
    function _checkCircularBOM(finishedSku, componentSku, visited) {
      visited = visited || {};
      if (visited[componentSku]) return;
      visited[componentSku] = true;
      if (finishedSku === componentSku) {
        throw ErrorHandler.validation('Circular BOM detected: ' + finishedSku + ' cannot be its own component (directly or indirectly)', { sku: finishedSku }, 'BOMService');
      }
      var componentBOM = BOMRepository.findByFinishedProductSku(componentSku);
      if (componentBOM) {
        var items = BOMAItemRepository.findActiveByBomId(componentBOM.id);
        items.data.forEach(function(item) {
          _checkCircularBOM(finishedSku, item.componentSku, visited);
        });
      }
    }
  
    // ============ BOM CRUD ============
  
    function createBOM(data) {
      _requireBOMManage();
      const bom = Utils.clone(data);
      if (!bom.id) bom.id = _generateBOMId();
      const defaults = BOMSchema.getDefaultBOM();
      Object.keys(defaults).forEach(function(k) {
        if (bom[k] === undefined || bom[k] === null || bom[k] === '') bom[k] = defaults[k];
      });
  
      if (bom.finishedProductSku) {
        bom.finishedProductSku = String(bom.finishedProductSku).trim().toUpperCase();
        _checkFinishedProduct(bom.finishedProductSku);
        _checkNoActiveBOM(bom.finishedProductSku);
      }
      if (bom.name) bom.name = Utils.safeStr(bom.name).trim();
      if (bom.description) bom.description = Utils.safeStr(bom.description).trim();
      if (bom.active !== undefined) bom.active = bom.active === true || bom.active === 'true';
  
      _validateBOMInput(bom, false);
      const created = BOMRepository.create(bom);
      Logger.info('BOMService', 'BOM created', { id: created.id, sku: created.finishedProductSku });
      return created.id;
    }
  
    function getBOM(id) {
      _requireBOMRead();
      if (!id) return null;
      return BOMRepository.findById(id);
    }
  
    function getBOMByFinishedProductSku(sku) {
      _requireBOMRead();
      if (!sku) return null;
      return BOMRepository.findByFinishedProductSku(String(sku).trim().toUpperCase());
    }
  
    function updateBOM(id, updates) {
      _requireBOMManage();
      if (!id) throw ErrorHandler.validation('ID required', {}, 'BOMService');
      const existing = BOMRepository.findById(id);
      if (!existing) throw ErrorHandler.notFound('BOM', id, 'BOMService');
  
      const data = Utils.clone(updates);
      delete data.id; delete data.createdAt; delete data.createdBy;
  
      if (data.finishedProductSku !== undefined) {
        data.finishedProductSku = String(data.finishedProductSku).trim().toUpperCase();
        if (data.finishedProductSku !== existing.finishedProductSku) {
          _checkFinishedProduct(data.finishedProductSku);
          _checkNoActiveBOM(data.finishedProductSku);
        }
      }
      if (data.name !== undefined) data.name = Utils.safeStr(data.name).trim();
      if (data.description !== undefined) data.description = Utils.safeStr(data.description).trim();
      if (data.active !== undefined) data.active = data.active === true || data.active === 'true';
  
      if (Object.keys(data).length > 0) _validateBOMInput(data, true);
      const updated = BOMRepository.update(id, data);
      Logger.info('BOMService', 'BOM updated', { id: id });
      return updated;
    }
  
    function deleteBOM(id) {
      _requireBOMManage();
      if (!id) throw ErrorHandler.validation('ID required', {}, 'BOMService');
      const existing = BOMRepository.findById(id);
      if (!existing) throw ErrorHandler.notFound('BOM', id, 'BOMService');
      BOMRepository.update(id, { active: false, updatedAt: _now().toISOString() });
      Logger.info('BOMService', 'BOM deactivated', { id: id });
      return true;
    }
  
    // ============ BOM ITEM CRUD ============
  
    function addBOMItem(bomId, data) {
      _requireBOMManage();
      if (!bomId) throw ErrorHandler.validation('bomId required', {}, 'BOMService');
  
      const bom = BOMRepository.findById(bomId);
      if (!bom) throw ErrorHandler.notFound('BOM', bomId, 'BOMService');
  
      const item = Utils.clone(data);
      if (!item.id) item.id = _generateItemId();
      item.bomId = bomId;
  
      const defaults = BOMAItemSchema.getDefaultItem();
      Object.keys(defaults).forEach(function(k) {
        if (item[k] === undefined || item[k] === null || item[k] === '') item[k] = defaults[k];
      });
  
      if (item.componentSku) {
        item.componentSku = String(item.componentSku).trim().toUpperCase();
        if (item.componentSku === bom.finishedProductSku) {
          throw ErrorHandler.validation('Component cannot be the finished product itself: ' + item.componentSku, { sku: item.componentSku }, 'BOMService');
        }
        _checkComponent(item.componentSku);
        _checkCircularBOM(bom.finishedProductSku, item.componentSku, {});
      }
  
      item.quantityRequired = _toNumber(item.quantityRequired);
      if (item.quantityRequired <= 0) {
        throw ErrorHandler.validation('quantityRequired must be greater than 0', { quantityRequired: item.quantityRequired }, 'BOMService');
      }
      item.wastagePercent = _toNumber(item.wastagePercent);
      if (item.wastagePercent < 0 || item.wastagePercent > 100) {
        throw ErrorHandler.validation('Wastage must be between 0 and 100', { wastagePercent: item.wastagePercent }, 'BOMService');
      }
      if (item.notes) item.notes = Utils.safeStr(item.notes).trim();
  
      // Check duplicate active component
      var existingItems = BOMAItemRepository.findActiveByBomId(bomId);
      var duplicate = existingItems.data.find(function(i) { return i.componentSku === item.componentSku; });
      if (duplicate) {
        throw ErrorHandler.conflict('Duplicate active component in BOM: ' + item.componentSku, { componentSku: item.componentSku }, 'BOMService');
      }
  
      _validateItemInput(item, false);
      const created = BOMAItemRepository.create(item);
      Logger.info('BOMService', 'BOM item created', { id: created.id, bomId: bomId, component: created.componentSku });
      return created.id;
    }
  
    function getBOMItems(bomId) {
      _requireBOMRead();
      if (!bomId) throw ErrorHandler.validation('bomId required', {}, 'BOMService');
      return BOMAItemRepository.findActiveByBomId(bomId);
    }
  
    function updateBOMItem(id, updates) {
      _requireBOMManage();
      if (!id) throw ErrorHandler.validation('ID required', {}, 'BOMService');
      const existing = BOMAItemRepository.findById(id);
      if (!existing) throw ErrorHandler.notFound('BOM Item', id, 'BOMService');
  
      const data = Utils.clone(updates);
      delete data.id; delete data.bomId; delete data.createdAt; delete data.createdBy;
  
      if (data.componentSku !== undefined) {
        data.componentSku = String(data.componentSku).trim().toUpperCase();
        var bom = BOMRepository.findById(existing.bomId);
        if (bom && data.componentSku === bom.finishedProductSku) {
          throw ErrorHandler.validation('Component cannot be the finished product itself', { sku: data.componentSku }, 'BOMService');
        }
        _checkComponent(data.componentSku);
      }
      if (data.quantityRequired !== undefined) data.quantityRequired = _toNumber(data.quantityRequired);
      if (data.quantityRequired <= 0) {
        throw ErrorHandler.validation('quantityRequired must be greater than 0', { quantityRequired: data.quantityRequired }, 'BOMService');
      }
      if (data.wastagePercent !== undefined) {
        data.wastagePercent = _toNumber(data.wastagePercent);
        if (data.wastagePercent < 0 || data.wastagePercent > 100) {
          throw ErrorHandler.validation('Wastage must be between 0 and 100', { wastagePercent: data.wastagePercent }, 'BOMService');
        }
      }
      if (data.notes !== undefined) data.notes = Utils.safeStr(data.notes).trim();
      if (data.active !== undefined) data.active = data.active === true || data.active === 'true';
  
      if (Object.keys(data).length > 0) _validateItemInput(data, true);
      const updated = BOMAItemRepository.update(id, data);
      Logger.info('BOMService', 'BOM item updated', { id: id });
      return updated;
    }
  
    function removeBOMItem(id) {
      _requireBOMManage();
      if (!id) throw ErrorHandler.validation('ID required', {}, 'BOMService');
      const existing = BOMAItemRepository.findById(id);
      if (!existing) throw ErrorHandler.notFound('BOM Item', id, 'BOMService');
      BOMAItemRepository.update(id, { active: false, updatedAt: _now().toISOString() });
      Logger.info('BOMService', 'BOM item deactivated', { id: id });
      return true;
    }
  
    // ============ COST CALCULATION ============
  
    function calculateBOMCost(bomId) {
      _requireBOMRead();
      if (!bomId) throw ErrorHandler.validation('bomId required', {}, 'BOMService');
  
      const bom = BOMRepository.findById(bomId);
      if (!bom) throw ErrorHandler.notFound('BOM', bomId, 'BOMService');
  
      const items = BOMAItemRepository.findActiveByBomId(bomId);
      let totalMaterialCost = 0;
  
      items.data.forEach(function(item) {
        const invItem = InventoryService.getItemBySku(item.componentSku);
        const componentCost = invItem ? _toNumber(invItem.cost) : 0;
        const qty = _toNumber(item.quantityRequired);
        const wastage = _toNumber(item.wastagePercent);
        const effectiveQty = qty * (1 + wastage / 100);
        totalMaterialCost += effectiveQty * componentCost;
      });
  
      return {
        totalMaterialCost: _round(totalMaterialCost, 2),
        totalCost: _round(totalMaterialCost, 2)
      };
    }
  
    function calculateUnitCost(productId) {
      _requireBOMRead();
      if (!productId) throw ErrorHandler.validation('productId required', {}, 'BOMService');
  
      const invItem = InventoryService.getItem(productId);
      if (!invItem) throw ErrorHandler.notFound('Inventory Item', productId, 'BOMService');
  
      const bom = BOMRepository.findByFinishedProductSku(invItem.sku);
      if (!bom) {
        return { unitCost: _toNumber(invItem.cost), source: 'INVENTORY' };
      }
  
      const cost = calculateBOMCost(bom.id);
      return { unitCost: cost.totalCost, source: 'BOM', bomId: bom.id };
    }
  
    function updateCostFromBOM(productId) {
      _requireBOMManage();
      if (!productId) throw ErrorHandler.validation('productId required', {}, 'BOMService');
  
      const result = calculateUnitCost(productId);
      if (result.source === 'BOM') {
        InventoryService.updateItem(productId, { cost: result.unitCost });
        Logger.info('BOMService', 'Inventory cost updated from BOM', { productId: productId, newCost: result.unitCost, bomId: result.bomId });
      }
      return result;
    }
  
    // ============ GROSS MARGIN ============
  
    function calculateGrossMargin(productId) {
      _requireBOMRead();
      if (!productId) throw ErrorHandler.validation('productId required', {}, 'BOMService');
  
      const invItem = InventoryService.getItem(productId);
      if (!invItem) throw ErrorHandler.notFound('Inventory Item', productId, 'BOMService');
  
      const sellingPrice = _toNumber(invItem.price);
      const costResult = calculateUnitCost(productId);
      const currentCost = costResult.unitCost;
  
      if (sellingPrice === 0) {
        return {
          sellingPrice: 0,
          currentCost: currentCost,
          grossProfit: -currentCost,
          grossMarginPercent: 0,
          source: costResult.source
        };
      }
  
      const grossProfit = sellingPrice - currentCost;
      const grossMarginPercent = _round((grossProfit / sellingPrice) * 100, 2);
  
      return {
        sellingPrice: sellingPrice,
        currentCost: currentCost,
        grossProfit: _round(grossProfit, 2),
        grossMarginPercent: grossMarginPercent,
        source: costResult.source,
        bomId: costResult.bomId || null
      };
    }
  
    return {
      // BOM CRUD
      createBOM: createBOM,
      getBOM: getBOM,
      getBOMByFinishedProductSku: getBOMByFinishedProductSku,
      updateBOM: updateBOM,
      deleteBOM: deleteBOM,
  
      // BOM Item CRUD
      addBOMItem: addBOMItem,
      getBOMItems: getBOMItems,
      updateBOMItem: updateBOMItem,
      removeBOMItem: removeBOMItem,
  
      // Cost
      calculateBOMCost: calculateBOMCost,
      calculateUnitCost: calculateUnitCost,
      updateCostFromBOM: updateCostFromBOM,
  
      // Margin
      calculateGrossMargin: calculateGrossMargin
    };
  })();