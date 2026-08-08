/**
 * Sale Service
 * Business logic layer for Sales.
 * Financial record: Revenue, COGS, Payments, Refunds.
 * Integrates with Orders (linked sales) and Inventory (direct sales).
 * NO SpreadsheetApp. NO direct sheet access.
 */

const SaleService = (function() {
  'use strict';

  const PS = SaleSchema.PAYMENT_STATUS;
  const PM = SaleSchema.PAYMENT_METHOD;

  function _now() { return new Date(); }
  function _toNumber(value, def) { const n = Number(value); return isNaN(n) ? (def !== undefined ? def : 0) : n; }
  function _round(num, d) { d = d || 2; return Math.round(num * Math.pow(10, d)) / Math.pow(10, d); }
  function _generateSaleId() { return 'SAL-' + Math.random().toString(36).substr(2, 9).toUpperCase(); }

  function _validateInput(data, isUpdate) {
    const schema = {};
    const fields = isUpdate ? Object.keys(data) : Object.keys(SaleSchema.VALIDATION);
    fields.forEach(function(f) { if (SaleSchema.VALIDATION[f]) schema[f] = SaleSchema.VALIDATION[f]; });
    if (!isUpdate) {
      const defaults = SaleSchema.getDefaultSale();
      Object.keys(defaults).forEach(function(k) {
        if (data[k] === undefined || data[k] === null || data[k] === '') data[k] = defaults[k];
      });
    }
    return Validator.validate(data, schema, 'SaleService');
  }

  function _parseItems(itemsJson) {
    if (typeof itemsJson === 'string') { try { return JSON.parse(itemsJson); } catch (e) { return []; } }
    return Array.isArray(itemsJson) ? itemsJson : [];
  }
  function _stringifyItems(items) { return JSON.stringify(items); }

  function _calculateFinancials(items, shippingCost) {
    const itemsTotal = items.reduce(function(acc, item) { return acc + _toNumber(item.totalPrice); }, 0);
    const cogs = items.reduce(function(acc, item) { return acc + (_toNumber(item.qty) * _toNumber(item.unitCost)); }, 0);
    return {
      itemsTotal: _round(itemsTotal, 2),
      totalAmount: _round(itemsTotal + _toNumber(shippingCost), 2),
      cogs: _round(cogs, 2)
    };
  }

  function _checkOrderNotSold(orderId) {
    if (!orderId) return;
    const existing = SaleRepository.findByOrderId(orderId);
    if (existing) throw ErrorHandler.conflict('Sale already exists for order: ' + orderId, { orderId: orderId, saleId: existing.id }, 'SaleService');
  }

  function _checkOrderDelivered(orderId) {
    const order = OrderService.getOrder(orderId);
    if (!order) throw ErrorHandler.notFound('Order', orderId, 'SaleService');
    if (order.status !== OrderSchema.STATUS.DELIVERED) {
      throw ErrorHandler.validation('Order must be Delivered before creating sale. Current status: ' + order.status, { orderId: orderId, status: order.status }, 'SaleService');
    }
    return order;
  }

  // ============ CRUD ============

  function createSale(data) {
    const sale = Utils.clone(data);
    if (!sale.id) sale.id = _generateSaleId();
    const defaults = SaleSchema.getDefaultSale();
    Object.keys(defaults).forEach(function(k) {
      if (sale[k] === undefined || sale[k] === null || sale[k] === '') sale[k] = defaults[k];
    });

    // Sanitize
    if (sale.customerEmail) sale.customerEmail = String(sale.customerEmail).trim().toLowerCase();
    if (sale.notes) sale.notes = Utils.safeStr(sale.notes).trim();
    sale.shippingCost = _toNumber(sale.shippingCost, 0);
    sale.paidAmount = _toNumber(sale.paidAmount, 0);
    sale.refundedAmount = _toNumber(sale.refundedAmount, 0);

    let items = [];

    // LINKED SALE (from Order)
    if (sale.orderId) {
      const order = _checkOrderDelivered(sale.orderId);
      _checkOrderNotSold(sale.orderId);
      sale.customerEmail = order.customerEmail;
      items = _parseItems(order.items);
      // Ensure unitCost exists (backward compat for old orders without unitCost)
      items.forEach(function(item) {
        if (item.unitCost === undefined) {
          const invItem = InventoryService.getItemBySku(item.sku);
          item.unitCost = invItem ? _toNumber(invItem.cost) : 0;
        }
      });
      // Do NOT touch inventory — stock already committed by shipOrder()
    }
    // DIRECT SALE (no order)
    else {
      const rawItems = Array.isArray(sale.items) ? sale.items : [];
      if (rawItems.length === 0) throw ErrorHandler.validation('Direct sale must contain items', {}, 'SaleService');
      rawItems.forEach(function(item) {
        if (!item.sku || item.qty === undefined) throw ErrorHandler.validation('Each item needs sku and qty', {}, 'SaleService');
        const sku = String(item.sku).trim().toUpperCase();
        const qty = _toNumber(item.qty);
        if (qty <= 0) throw ErrorHandler.validation('Quantity must be positive', { sku: sku, qty: qty }, 'SaleService');
        const invItem = InventoryService.getItemBySku(sku);
        if (!invItem) throw ErrorHandler.notFound('SKU', sku, 'SaleService');
        const unitPrice = _toNumber(invItem.price);
        const unitCost = _toNumber(invItem.cost);
        items.push({
          sku: sku, name: invItem.name, qty: qty,
          unitPrice: unitPrice, unitCost: unitCost,
          totalPrice: _round(qty * unitPrice, 2)
        });
      });
      // Check stock and commit
      items.forEach(function(item) {
        const invItem = InventoryService.getItemBySku(item.sku);
        if (_toNumber(invItem.available) < item.qty) {
          throw ErrorHandler.validation('Insufficient stock for ' + item.sku + '. Available: ' + invItem.available + ', Requested: ' + item.qty, { sku: item.sku, available: invItem.available, requested: item.qty }, 'SaleService');
        }
      });
      const committed = [];
      try {
        items.forEach(function(item) {
          InventoryService.commitStock(item.sku, item.qty);
          committed.push(item.sku);
        });
      } catch (e) {
        committed.forEach(function(sku) {
          const item = items.find(function(i) { return i.sku === sku; });
          try { InventoryService.restock(sku, item.qty); } catch (e2) {}
        });
        throw ErrorHandler.validation('Stock commit failed: ' + e.message, { rolledBack: committed }, 'SaleService');
      }
    }

    // Calculate financials
    const fin = _calculateFinancials(items, sale.shippingCost);
    sale.items = _stringifyItems(items);
    sale.itemsTotal = fin.itemsTotal;
    sale.totalAmount = fin.totalAmount;
    sale.cogs = fin.cogs;

    // Validate
    _validateInput(sale, false);

    const created = SaleRepository.create(sale);
    Logger.info('SaleService', 'Sale created', { id: created.id, orderId: created.orderId, total: created.totalAmount, cogs: created.cogs });
    EventBus.emit('sale:created', { saleId: created.id, orderId: created.orderId, totalAmount: created.totalAmount, cogs: created.cogs });
    return created.id;
  }

  function getSale(id) { return id ? SaleRepository.findById(id) : null; }
  function getSales(options) { return SaleRepository.findAll(options); }

  function updateSale(id, updates) {
    if (!id) throw ErrorHandler.validation('ID required', {}, 'SaleService');
    const existing = SaleRepository.findById(id);
    if (!existing) throw ErrorHandler.notFound('Sale', id, 'SaleService');
    if (existing.paymentStatus !== PS.PENDING) {
      throw ErrorHandler.validation('Can only update Pending sales', { status: existing.paymentStatus }, 'SaleService');
    }

    const data = Utils.clone(updates);
    delete data.id; delete data.createdAt; delete data.createdBy;
    delete data.itemsTotal; delete data.totalAmount; delete data.cogs;

    if (data.customerEmail !== undefined) data.customerEmail = String(data.customerEmail).trim().toLowerCase();
    if (data.notes !== undefined) data.notes = Utils.safeStr(data.notes).trim();
    if (data.shippingCost !== undefined) data.shippingCost = _toNumber(data.shippingCost);

    if (Object.keys(data).length > 0) _validateInput(data, true);
    const updated = SaleRepository.update(id, data);
    Logger.info('SaleService', 'Sale updated', { id: id });
    return updated;
  }

  function deleteSale(id) {
    if (!id) throw ErrorHandler.validation('ID required', {}, 'SaleService');
    const existing = SaleRepository.findById(id);
    if (!existing) throw ErrorHandler.notFound('Sale', id, 'SaleService');
    if (existing.paymentStatus === PS.PAID || existing.paymentStatus === PS.REFUNDED) {
      throw ErrorHandler.validation('Cannot delete paid or refunded sale', { status: existing.paymentStatus }, 'SaleService');
    }
    // For direct sales, restock if not linked to order
    if (!existing.orderId && existing.paymentStatus === PS.PENDING) {
      const items = _parseItems(existing.items);
      items.forEach(function(item) {
        try { InventoryService.restock(item.sku, item.qty); } catch (e) {}
      });
    }
    SaleRepository.delete(id);
    Logger.info('SaleService', 'Sale deleted', { id: id });
    return true;
  }

  // ============ PAYMENTS ============

  function recordPayment(id, amount, method) {
    if (!id || amount === undefined) throw ErrorHandler.validation('ID and amount required', {}, 'SaleService');
    amount = _toNumber(amount);
    if (amount <= 0) throw ErrorHandler.validation('Payment amount must be positive', { amount: amount }, 'SaleService');

    const sale = getSale(id);
    if (!sale) throw ErrorHandler.notFound('Sale', id, 'SaleService');
    if (sale.paymentStatus === PS.REFUNDED) throw ErrorHandler.validation('Cannot record payment on refunded sale', {}, 'SaleService');

    const newPaid = _toNumber(sale.paidAmount) + amount;
    if (newPaid > _toNumber(sale.totalAmount)) {
      throw ErrorHandler.validation('Payment exceeds total amount. Total: ' + sale.totalAmount + ', New paid: ' + newPaid, { total: sale.totalAmount, newPaid: newPaid }, 'SaleService');
    }

    let newStatus = PS.PARTIAL;
    if (newPaid >= _toNumber(sale.totalAmount)) newStatus = PS.PAID;

    const updated = SaleRepository.update(id, {
      paidAmount: newPaid,
      paymentStatus: newStatus,
      paymentMethod: method || sale.paymentMethod
    });
    Logger.info('SaleService', 'Payment recorded', { id: id, amount: amount, paidTotal: newPaid, status: newStatus });
    EventBus.emit('sale:paid', { saleId: id, amount: amount, paidTotal: newPaid, status: newStatus });
    return updated;
  }

  function processRefund(id, amount) {
    if (!id || amount === undefined) throw ErrorHandler.validation('ID and amount required', {}, 'SaleService');
    amount = _toNumber(amount);
    if (amount <= 0) throw ErrorHandler.validation('Refund amount must be positive', { amount: amount }, 'SaleService');

    const sale = getSale(id);
    if (!sale) throw ErrorHandler.notFound('Sale', id, 'SaleService');
    if (sale.paymentStatus === PS.PENDING) throw ErrorHandler.validation('Cannot refund unpaid sale', {}, 'SaleService');

    const newRefunded = _toNumber(sale.refundedAmount) + amount;
    if (newRefunded > _toNumber(sale.totalAmount)) {
      throw ErrorHandler.validation('Refund exceeds total amount. Total: ' + sale.totalAmount + ', New refunded: ' + newRefunded, { total: sale.totalAmount, newRefunded: newRefunded }, 'SaleService');
    }

    let newStatus = PS.PARTIAL;
    if (newRefunded >= _toNumber(sale.totalAmount)) newStatus = PS.REFUNDED;
    else if (_toNumber(sale.paidAmount) > newRefunded) newStatus = PS.PARTIAL;
    else if (newRefunded === 0) newStatus = sale.paidAmount >= sale.totalAmount ? PS.PAID : PS.PARTIAL;

    const updated = SaleRepository.update(id, {
      refundedAmount: newRefunded,
      paymentStatus: newStatus
    });
    Logger.info('SaleService', 'Refund processed', { id: id, amount: amount, refundedTotal: newRefunded, status: newStatus });
    EventBus.emit('sale:refunded', { saleId: id, amount: amount, refundedTotal: newRefunded, status: newStatus });
    return updated;
  }

  // ============ QUERIES & FINANCE ============

  function getSalesByCustomer(email) {
    return SaleRepository.findAll({
      limit: CONFIG.PAGINATION.MAX_LIMIT,
      where: function(s) { return s.customerEmail === String(email).trim().toLowerCase(); }
    });
  }

  function getSalesByOrder(orderId) {
    return SaleRepository.findAll({
      limit: CONFIG.PAGINATION.MAX_LIMIT,
      where: function(s) { return s.orderId === orderId; }
    });
  }

  function getSalesByPaymentStatus(status) {
    return SaleRepository.findAll({
      limit: CONFIG.PAGINATION.MAX_LIMIT,
      where: function(s) { return s.paymentStatus === status; }
    });
  }

  function getTotalRevenue() {
    const result = SaleRepository.findAll({ limit: CONFIG.PAGINATION.MAX_LIMIT });
    return _round(result.data.reduce(function(acc, s) {
      return acc + _toNumber(s.totalAmount);
    }, 0), 2);
  }

  function getTotalCollected() {
    const result = SaleRepository.findAll({ limit: CONFIG.PAGINATION.MAX_LIMIT });
    return _round(result.data.reduce(function(acc, s) {
      return acc + _toNumber(s.paidAmount);
    }, 0), 2);
  }

  function getTotalRefunded() {
    const result = SaleRepository.findAll({ limit: CONFIG.PAGINATION.MAX_LIMIT });
    return _round(result.data.reduce(function(acc, s) {
      return acc + _toNumber(s.refundedAmount);
    }, 0), 2);
  }

  function getNetRevenue() {
    return _round(getTotalRevenue() - getTotalRefunded(), 2);
  }

  function getTotalCOGS() {
    const result = SaleRepository.findAll({ limit: CONFIG.PAGINATION.MAX_LIMIT });
    return _round(result.data.reduce(function(acc, s) {
      return acc + _toNumber(s.cogs);
    }, 0), 2);
  }

  function getGrossProfit() {
    return _round(getTotalRevenue() - getTotalCOGS(), 2);
  }

  function totalSales() {
    return SaleRepository.count();
  }

  return {
    // CRUD
    createSale: createSale,
    getSale: getSale,
    getSales: getSales,
    updateSale: updateSale,
    deleteSale: deleteSale,

    // Payments
    recordPayment: recordPayment,
    processRefund: processRefund,

    // Queries
    getSalesByCustomer: getSalesByCustomer,
    getSalesByOrder: getSalesByOrder,
    getSalesByPaymentStatus: getSalesByPaymentStatus,

    // Finance
    getTotalRevenue: getTotalRevenue,
    getTotalCollected: getTotalCollected,
    getTotalRefunded: getTotalRefunded,
    getNetRevenue: getNetRevenue,
    getTotalCOGS: getTotalCOGS,
    getGrossProfit: getGrossProfit,
    totalSales: totalSales
  };
})();
