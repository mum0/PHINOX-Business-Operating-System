/**
 * Order Service
 * Business logic layer for Orders.
 * Replaces: Tasks.js logic (gradually, with backward compatibility wrappers).
 * NO SpreadsheetApp. NO direct sheet access.
 * UPDATED: items now include unitCost for COGS tracking in Sales.
 */

const OrderService = (function() {
  'use strict';

  const S = OrderSchema.STATUS;

  function _now() { return new Date(); }
  function _clamp(num, min, max) { return Math.min(Math.max(num, min), max); }
  function _toNumber(value, def) { const n = Number(value); return isNaN(n) ? (def !== undefined ? def : 0) : n; }
  function _round(num, d) { d = d || 2; return Math.round(num * Math.pow(10, d)) / Math.pow(10, d); }
  function _daysBetween(d1, d2) { return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)); }
  function _generateOrderId() { return 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase(); }

  function _validateInput(data, isUpdate) {
    const schema = {};
    const fields = isUpdate ? Object.keys(data) : Object.keys(OrderSchema.VALIDATION);
    fields.forEach(function(f) { if (OrderSchema.VALIDATION[f]) schema[f] = OrderSchema.VALIDATION[f]; });
    if (!isUpdate) {
      const defaults = OrderSchema.getDefaultOrder();
      Object.keys(defaults).forEach(function(k) {
        if (data[k] === undefined || data[k] === null || data[k] === '') data[k] = defaults[k];
      });
    }
    return Validator.validate(data, schema, 'OrderService');
  }

  function _validateStatusTransition(cur, nxt) {
    if (!OrderSchema.isValidStatusTransition(cur, nxt)) {
      throw ErrorHandler.validation('Invalid transition ' + cur + ' → ' + nxt, { current: cur, requested: nxt }, 'OrderService');
    }
  }

  function _parseItems(itemsJson) {
    if (typeof itemsJson === 'string') { try { return JSON.parse(itemsJson); } catch (e) { return []; } }
    return Array.isArray(itemsJson) ? itemsJson : [];
  }
  function _stringifyItems(items) { return JSON.stringify(items); }
  function _calculateTotals(items, shippingCost) {
    const itemsTotal = items.reduce(function(acc, item) { return acc + _toNumber(item.totalPrice); }, 0);
    return { itemsTotal: _round(itemsTotal, 2), totalAmount: _round(itemsTotal + _toNumber(shippingCost), 2) };
  }

  // ============ CRUD ============

  function createOrder(data) {
    const order = Utils.clone(data);
    if (!order.id) order.id = _generateOrderId();
    const defaults = OrderSchema.getDefaultOrder();
    Object.keys(defaults).forEach(function(k) {
      if (order[k] === undefined || order[k] === null || order[k] === '') order[k] = defaults[k];
    });
    _validateInput(order, false);
    if (order.customerEmail) order.customerEmail = String(order.customerEmail).trim().toLowerCase();
    if (order.shippingAddress) order.shippingAddress = Utils.safeStr(order.shippingAddress).trim();
    if (order.notes) order.notes = Utils.safeStr(order.notes).trim();
    order.shippingCost = _toNumber(order.shippingCost, 0);

    const rawItems = Array.isArray(order.items) ? order.items : [];
    if (rawItems.length === 0) throw ErrorHandler.validation('Order must contain at least one item', {}, 'OrderService');

    const enrichedItems = [];
    rawItems.forEach(function(item) {
      if (!item.sku || item.qty === undefined) throw ErrorHandler.validation('Each item needs sku and qty', {}, 'OrderService');
      const sku = String(item.sku).trim().toUpperCase();
      const qty = _toNumber(item.qty);
      if (qty <= 0) throw ErrorHandler.validation('Quantity must be positive', { sku: sku, qty: qty }, 'OrderService');
      const invItem = InventoryService.getItemBySku(sku);
      if (!invItem) throw ErrorHandler.notFound('SKU', sku, 'OrderService');
      if (invItem.status === InventorySchema.STATUS.DISCONTINUED) throw ErrorHandler.validation('Item discontinued: ' + sku, {}, 'OrderService');
      const unitPrice = _toNumber(invItem.price);
      const unitCost = _toNumber(invItem.cost);  // ← ADDED for COGS tracking
      enrichedItems.push({
        sku: sku,
        name: invItem.name,
        qty: qty,
        unitPrice: unitPrice,
        unitCost: unitCost,  // ← ADDED
        totalPrice: _round(qty * unitPrice, 2)
      });
    });

    enrichedItems.forEach(function(item) {
      const invItem = InventoryService.getItemBySku(item.sku);
      if (_toNumber(invItem.available) < item.qty) {
        throw ErrorHandler.validation('Insufficient stock for ' + item.sku + '. Available: ' + invItem.available + ', Requested: ' + item.qty, { sku: item.sku, available: invItem.available, requested: item.qty }, 'OrderService');
      }
    });

    const reserved = [];
    try {
      enrichedItems.forEach(function(item) {
        InventoryService.reserveStock(item.sku, item.qty);
        reserved.push(item.sku);
      });
    } catch (e) {
      reserved.forEach(function(sku) {
        const item = enrichedItems.find(function(i) { return i.sku === sku; });
        try { InventoryService.releaseStock(sku, item.qty); } catch (e2) {}
      });
      throw ErrorHandler.validation('Reservation failed: ' + e.message, { rolledBack: reserved }, 'OrderService');
    }

    const totals = _calculateTotals(enrichedItems, order.shippingCost);
    order.items = _stringifyItems(enrichedItems);
    order.itemsTotal = totals.itemsTotal;
    order.totalAmount = totals.totalAmount;

    const created = OrderRepository.create(order);
    Logger.info('OrderService', 'Order created', { id: created.id, customer: created.customerEmail, items: enrichedItems.length, total: created.totalAmount });
    EventBus.emit('order:created', { orderId: created.id, customerEmail: created.customerEmail, totalAmount: created.totalAmount });
    return created.id;
  }

  function getOrder(id) { return id ? OrderRepository.findById(id) : null; }
  function getOrders(opts) { return OrderRepository.findAll(opts); }

  function updateOrder(id, updates) {
    if (!id) throw ErrorHandler.validation('ID required', {}, 'OrderService');
    const existing = OrderRepository.findById(id);
    if (!existing) throw ErrorHandler.notFound('Order', id, 'OrderService');
    if (existing.status !== S.PENDING) throw ErrorHandler.validation('Can only update Pending orders', { status: existing.status }, 'OrderService');

    const data = Utils.clone(updates);
    delete data.id; delete data.createdAt; delete data.createdBy;
    delete data.itemsTotal; delete data.totalAmount;
    if (data.customerEmail !== undefined) data.customerEmail = String(data.customerEmail).trim().toLowerCase();
    if (data.shippingAddress !== undefined) data.shippingAddress = Utils.safeStr(data.shippingAddress).trim();
    if (data.notes !== undefined) data.notes = Utils.safeStr(data.notes).trim();
    if (data.shippingCost !== undefined) data.shippingCost = _toNumber(data.shippingCost);

    if (data.items !== undefined) {
      const rawItems = Array.isArray(data.items) ? data.items : [];
      const enrichedItems = [];
      rawItems.forEach(function(item) {
        const sku = String(item.sku).trim().toUpperCase();
        const qty = _toNumber(item.qty);
        const invItem = InventoryService.getItemBySku(sku);
        if (!invItem) throw ErrorHandler.notFound('SKU', sku, 'OrderService');
        enrichedItems.push({
          sku: sku, name: invItem.name, qty: qty,
          unitPrice: _toNumber(invItem.price),
          unitCost: _toNumber(invItem.cost),  // ← ADDED
          totalPrice: _round(qty * _toNumber(invItem.price), 2)
        });
      });
      data.items = _stringifyItems(enrichedItems);
      const totals = _calculateTotals(enrichedItems, data.shippingCost !== undefined ? data.shippingCost : existing.shippingCost);
      data.itemsTotal = totals.itemsTotal;
      data.totalAmount = totals.totalAmount;
    } else if (data.shippingCost !== undefined) {
      const items = _parseItems(existing.items);
      const totals = _calculateTotals(items, data.shippingCost);
      data.itemsTotal = totals.itemsTotal;
      data.totalAmount = totals.totalAmount;
    }

    if (Object.keys(data).length > 0) _validateInput(data, true);
    const updated = OrderRepository.update(id, data);
    Logger.info('OrderService', 'Order updated', { id: id });
    return updated;
  }

  function deleteOrder(id) {
    if (!id) throw ErrorHandler.validation('ID required', {}, 'OrderService');
    const existing = OrderRepository.findById(id);
    if (!existing) throw ErrorHandler.notFound('Order', id, 'OrderService');
    if (existing.status !== S.PENDING && existing.status !== S.CANCELLED) {
      throw ErrorHandler.validation('Can only delete Pending or Cancelled orders', { status: existing.status }, 'OrderService');
    }
    if (existing.status === S.PENDING) {
      const items = _parseItems(existing.items);
      items.forEach(function(item) {
        try { InventoryService.releaseStock(item.sku, item.qty); } catch (e) {}
      });
    }
    OrderRepository.delete(id);
    Logger.info('OrderService', 'Order deleted', { id: id });
    return true;
  }

  // ============ WORKFLOW ============

  function confirmOrder(id) {
    const order = getOrder(id);
    if (!order) throw ErrorHandler.notFound('Order', id, 'OrderService');
    _validateStatusTransition(order.status, S.CONFIRMED);
    const updated = OrderRepository.update(id, { status: S.CONFIRMED });
    Logger.info('OrderService', 'Order confirmed', { id: id });
    EventBus.emit('order:confirmed', { orderId: id, totalAmount: order.totalAmount });
    return updated;
  }

  function cancelOrder(id) {
    const order = getOrder(id);
    if (!order) throw ErrorHandler.notFound('Order', id, 'OrderService');
    if (order.status === S.CANCELLED) return order;
    if (order.status === S.DELIVERED) throw ErrorHandler.validation('Cannot cancel delivered order', {}, 'OrderService');
    if (order.status === S.SHIPPED) throw ErrorHandler.validation('Cannot cancel shipped order', {}, 'OrderService');
    const items = _parseItems(order.items);
    if (order.status === S.PENDING || order.status === S.CONFIRMED) {
      items.forEach(function(item) {
        try { InventoryService.releaseStock(item.sku, item.qty); } catch (e) {
          Logger.warn('OrderService', 'Release failed during cancel', { sku: item.sku, error: e.message });
        }
      });
    }
    const updated = OrderRepository.update(id, { status: S.CANCELLED });
    Logger.info('OrderService', 'Order cancelled', { id: id });
    EventBus.emit('order:cancelled', { orderId: id });
    return updated;
  }

  function shipOrder(id) {
    const order = getOrder(id);
    if (!order) throw ErrorHandler.notFound('Order', id, 'OrderService');
    _validateStatusTransition(order.status, S.SHIPPED);
    const items = _parseItems(order.items);
    const committed = [];
    try {
      items.forEach(function(item) {
        InventoryService.commitStock(item.sku, item.qty);
        committed.push(item.sku);
      });
    } catch (e) {
      committed.forEach(function(sku) {
        const item = items.find(function(i) { return i.sku === sku; });
        try { InventoryService.restock(sku, item.qty); InventoryService.reserveStock(sku, item.qty); } catch (e2) {}
      });
      throw ErrorHandler.validation('Commit failed: ' + e.message, { rolledBack: committed }, 'OrderService');
    }
    const updated = OrderRepository.update(id, { status: S.SHIPPED });
    Logger.info('OrderService', 'Order shipped', { id: id });
    EventBus.emit('order:shipped', { orderId: id });
    return updated;
  }

  function deliverOrder(id) {
    const order = getOrder(id);
    if (!order) throw ErrorHandler.notFound('Order', id, 'OrderService');
    _validateStatusTransition(order.status, S.DELIVERED);
    const updated = OrderRepository.update(id, { status: S.DELIVERED });
    Logger.info('OrderService', 'Order delivered', { id: id });
    EventBus.emit('order:delivered', { orderId: id });
    return updated;
  }

  // ============ QUERIES ============

  function getOrdersByCustomer(email) {
    return OrderRepository.findAll({
      limit: CONFIG.PAGINATION.MAX_LIMIT,
      where: function(o) { return o.customerEmail === String(email).trim().toLowerCase(); }
    });
  }
  function getOrdersByStatus(status) {
    return OrderRepository.findAll({ limit: CONFIG.PAGINATION.MAX_LIMIT, where: function(o) { return o.status === status; } });
  }
  function getPendingOrders() { return getOrdersByStatus(S.PENDING); }
  function getTotalSales() {
    const result = OrderRepository.findAll({ limit: CONFIG.PAGINATION.MAX_LIMIT });
    return _round(result.data.reduce(function(acc, o) { return acc + (o.status === S.DELIVERED ? _toNumber(o.totalAmount) : 0); }, 0), 2);
  }
  function totalOrders() { return OrderRepository.count(); }

  return {
    createOrder: createOrder, getOrder: getOrder, getOrders: getOrders, updateOrder: updateOrder, deleteOrder: deleteOrder,
    confirmOrder: confirmOrder, cancelOrder: cancelOrder, shipOrder: shipOrder, deliverOrder: deliverOrder,
    getOrdersByCustomer: getOrdersByCustomer, getOrdersByStatus: getOrdersByStatus, getPendingOrders: getPendingOrders,
    getTotalSales: getTotalSales, totalOrders: totalOrders
  };
})();