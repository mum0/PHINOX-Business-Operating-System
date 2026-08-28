/**
 * Customer Service
 * Business logic layer for Customers.
 * Integrates with Orders and Sales for customer metrics.
 * NO SpreadsheetApp. NO direct sheet access.
 * Phase 8B — PHINOX BOS v5
 */

var CustomerService = (function() {
 'use strict';

 const S = CustomerSchema.STATUS;
 const G = CustomerSchema.SEGMENT;

 function _now() { return new Date(); }
 function _toNumber(value, def) { const n = Number(value); return isNaN(n) ? (def !== undefined ? def : 0) : n; }
 function _round(num, d) { d = d || 2; return Math.round(num * Math.pow(10, d)) / Math.pow(10, d); }
 function _daysBetween(d1, d2) { return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)); }
 function _generateCustomerId() { return 'CUST-' + Math.random().toString(36).substr(2, 9).toUpperCase(); }

 function _validateInput(data, isUpdate) {
 const schema = {};
 const fields = isUpdate ? Object.keys(data) : Object.keys(CustomerSchema.VALIDATION);
 fields.forEach(function(f) { if (CustomerSchema.VALIDATION[f]) schema[f] = CustomerSchema.VALIDATION[f]; });
 if (!isUpdate) {
 const defaults = CustomerSchema.getDefaultCustomer();
 Object.keys(defaults).forEach(function(k) {
 if (data[k] === undefined || data[k] === null || data[k] === '') data[k] = defaults[k];
 });
 }
 return Validator.validate(data, schema, 'CustomerService');
 }

 function _calculateSegment(totalOrders, totalAmount) {
 if (totalOrders >= 10 && totalAmount >= 5000) return G.VIP;
 if (totalOrders >= 3) return G.REGULAR;
 if (totalOrders >= 2) return G.RETURNING;
 return G.NEW;
 }

 function _calculateAOV(totalAmount, totalOrders) {
 return totalOrders > 0 ? _round(totalAmount / totalOrders, 2) : 0;
 }

 // ============ CRUD ============

 function createCustomer(data) {
 const customer = Utils.clone(data);
 if (!customer.id) customer.id = _generateCustomerId();
 const defaults = CustomerSchema.getDefaultCustomer();
 Object.keys(defaults).forEach(function(k) {
 if (customer[k] === undefined || customer[k] === null || customer[k] === '') customer[k] = defaults[k];
 });
 _validateInput(customer, false);
 if (customer.email) customer.email = String(customer.email).trim().toLowerCase();
 if (customer.name) customer.name = Utils.safeStr(customer.name).trim();
 if (customer.phone) customer.phone = Utils.safeStr(customer.phone).trim();
 if (customer.notes) customer.notes = Utils.safeStr(customer.notes).trim();

 // Prevent duplicate emails
 const existing = CustomerRepository.findByEmail(customer.email);
 if (existing) throw ErrorHandler.conflict('Customer with email already exists: ' + customer.email, { email: customer.email, existingId: existing.id }, 'CustomerService');

 const created = CustomerRepository.create(customer);
 Logger.info('CustomerService', 'Customer created', { id: created.id, email: created.email, name: created.name });
 return created.id;
 }

 function getCustomer(id) { return id ? CustomerRepository.findById(id) : null; }
 function getCustomerByEmail(email) { return email ? CustomerRepository.findByEmail(email) : null; }
 function getCustomers(options) { return CustomerRepository.findAll(options); }

 function updateCustomer(id, updates) {
 if (!id) throw ErrorHandler.validation('Customer ID required', {}, 'CustomerService');
 const existing = CustomerRepository.findById(id);
 if (!existing) throw ErrorHandler.notFound('Customer', id, 'CustomerService');

 const data = Utils.clone(updates);
 delete data.id; delete data.createdAt; delete data.createdBy;
 if (data.email !== undefined) {
 data.email = String(data.email).trim().toLowerCase();
 const dup = CustomerRepository.findByEmail(data.email);
 if (dup && dup.id !== id) throw ErrorHandler.conflict('Email already in use: ' + data.email, { email: data.email }, 'CustomerService');
 }
 if (data.name !== undefined) data.name = Utils.safeStr(data.name).trim();
 if (data.phone !== undefined) data.phone = Utils.safeStr(data.phone).trim();
 if (data.notes !== undefined) data.notes = Utils.safeStr(data.notes).trim();

 // Auto-recalculate derived fields
 const merged = Object.assign({}, existing, data);
 if (data.totalOrders !== undefined || data.totalAmount !== undefined) {
 data.segment = _calculateSegment(_toNumber(merged.totalOrders), _toNumber(merged.totalAmount));
 data.averageOrderValue = _calculateAOV(_toNumber(merged.totalAmount), _toNumber(merged.totalOrders));
 }

 if (Object.keys(data).length > 0) _validateInput(data, true);
 const updated = CustomerRepository.update(id, data);
 Logger.info('CustomerService', 'Customer updated', { id: id });
 return updated;
 }

 function deleteCustomer(id) {
 if (!id) throw ErrorHandler.validation('Customer ID required', {}, 'CustomerService');
 CustomerRepository.delete(id);
 Logger.info('CustomerService', 'Customer deleted', { id: id });
 return true;
 }

 // ============ SYNC FROM ORDERS ============

 function syncFromOrder(orderData) {
 if (!orderData || !orderData.customerEmail) return null;
 const email = String(orderData.customerEmail).trim().toLowerCase();
 const orderDate = orderData.createdAt || _now().toISOString();
 const orderAmount = _toNumber(orderData.totalAmount);

 let customer = CustomerRepository.findByEmail(email);

 if (!customer) {
 // Create new customer from order
 const newCustomer = {
 name: orderData.customerName || email.split('@')[0],
 email: email,
 phone: '',
 status: S.ACTIVE,
 segment: G.NEW,
 joinDate: orderDate,
 lastOrderDate: orderDate,
 totalOrders: 1,
 totalAmount: orderAmount,
 averageOrderValue: orderAmount,
 notes: 'Auto-created from order'
 };
 const created = CustomerRepository.create(newCustomer);
 Logger.info('CustomerService', 'Customer auto-created from order', { id: created.id, email: email });
 return created;
 }

 // Update existing customer
 const totalOrders = _toNumber(customer.totalOrders) + 1;
 const totalAmount = _toNumber(customer.totalAmount) + orderAmount;
 const updates = {
 lastOrderDate: orderDate,
 totalOrders: totalOrders,
 totalAmount: _round(totalAmount, 2),
 averageOrderValue: _calculateAOV(totalAmount, totalOrders),
 segment: _calculateSegment(totalOrders, totalAmount),
 status: S.ACTIVE
 };
 const updated = CustomerRepository.update(customer.id, updates);
 Logger.info('CustomerService', 'Customer updated from order', { id: customer.id, email: email, totalOrders: totalOrders });
 return updated;
 }

 function syncFromOrders() {
 const result = OrderService.getOrders({ limit: CONFIG.PAGINATION.MAX_LIMIT });
 const orders = result && result.data ? result.data : [];
 let created = 0, updated = 0;

 orders.forEach(function(order) {
 try {
 const customer = syncFromOrder(order);
 if (customer) {
 const existing = CustomerRepository.findByEmail(order.customerEmail);
 if (existing && existing.totalOrders === 1) created++;
 else updated++;
 }
 } catch (e) {
 Logger.warn('CustomerService', 'syncFromOrder failed', { email: order.customerEmail, error: e.message });
 }
 });

 Logger.info('CustomerService', 'syncFromOrders complete', { processed: orders.length, created: created, updated: updated });
 return { processed: orders.length, created: created, updated: updated };
 }

 // ============ METRICS & QUERIES ============

 function getTotalCustomers() { return CustomerRepository.count(); }

 function getActiveCustomers() {
 return CustomerRepository.findAll({
 limit: CONFIG.PAGINATION.MAX_LIMIT,
 where: function(c) { return c.status === S.ACTIVE; }
 });
 }

 function getChurnedCustomers() {
 return CustomerRepository.findAll({
 limit: CONFIG.PAGINATION.MAX_LIMIT,
 where: function(c) { return c.status === S.CHURNED; }
 });
 }

 function getCustomersByDateRange(startDate, endDate) {
 var s = startDate ? new Date(startDate) : null;
 var e = endDate ? new Date(endDate) : null;
 return CustomerRepository.findAll({
 limit: CONFIG.PAGINATION.MAX_LIMIT,
 where: function(c) {
 var join = new Date(c.joinDate);
 if (s && join < s) return false;
 if (e && join > e) return false;
 return true;
 }
 });
 }

 function getNewCustomers(startDate, endDate) {
 var result = getCustomersByDateRange(startDate, endDate);
 var customers = result && result.data ? result.data : [];
 return customers.filter(function(c) { return _toNumber(c.totalOrders) === 1; });
 }

 function getReturningCustomers(startDate, endDate) {
 var result = getCustomersByDateRange(startDate, endDate);
 var customers = result && result.data ? result.data : [];
 return customers.filter(function(c) { return _toNumber(c.totalOrders) > 1; });
 }

 function getRetentionRate(startDate, endDate) {
 var result = getCustomersByDateRange(startDate, endDate);
 var customers = result && result.data ? result.data : [];
 if (customers.length === 0) return 0;
 var returning = customers.filter(function(c) { return _toNumber(c.totalOrders) > 1; }).length;
 return _round((returning / customers.length) * 100, 2);
 }

 function getChurnRate(startDate, endDate) {
 var result = getCustomersByDateRange(startDate, endDate);
 var customers = result && result.data ? result.data : [];
 if (customers.length === 0) return 0;
 var churned = customers.filter(function(c) { return c.status === S.CHURNED; }).length;
 return _round((churned / customers.length) * 100, 2);
 }

 function getAverageLTV(startDate, endDate) {
 var result = getCustomersByDateRange(startDate, endDate);
 var customers = result && result.data ? result.data : [];
 if (customers.length === 0) return 0;
 var total = customers.reduce(function(acc, c) { return acc + _toNumber(c.totalAmount); }, 0);
 return _round(total / customers.length, 2);
 }

 function getAverageOrderFrequency(startDate, endDate) {
 var result = getCustomersByDateRange(startDate, endDate);
 var customers = result && result.data ? result.data : [];
 if (customers.length === 0) return 0;
 var totalOrders = customers.reduce(function(acc, c) { return acc + _toNumber(c.totalOrders); }, 0);
 return _round(totalOrders / customers.length, 2);
 }

 function getCustomerLTV(email) {
 var customer = getCustomerByEmail(email);
 return customer ? _toNumber(customer.totalAmount) : 0;
 }

 function getCustomerOrderFrequency(email) {
 var customer = getCustomerByEmail(email);
 return customer ? _toNumber(customer.totalOrders) : 0;
 }

 function markChurned(thresholdDays) {
 thresholdDays = thresholdDays || 90;
 var threshold = new Date(_now().getTime() - thresholdDays * 24 * 60 * 60 * 1000);
 var result = CustomerRepository.findAll({ limit: CONFIG.PAGINATION.MAX_LIMIT });
 var customers = result && result.data ? result.data : [];
 var marked = 0;
 customers.forEach(function(c) {
 if (c.status !== S.ACTIVE) return;
 var lastOrder = Utils.safeDate(c.lastOrderDate);
 if (lastOrder && lastOrder < threshold) {
 try {
 CustomerRepository.update(c.id, { status: S.CHURNED });
 marked++;
 } catch (e) {}
 }
 });
 Logger.info('CustomerService', 'markChurned complete', { thresholdDays: thresholdDays, marked: marked });
 return marked;
 }



 // ============ STATS DASHBOARD ============

 function getCustomerStats() {
 var result = CustomerRepository.findAll({ limit: CONFIG.PAGINATION.MAX_LIMIT });
 var customers = result && result.data ? result.data : [];
 var active = 0, churned = 0, returning = 0, newThisMonth = 0;
 var now = new Date();
 customers.forEach(function(c) {
 if (c.status === S.ACTIVE) active++;
 if (c.status === S.CHURNED) churned++;
 if (_toNumber(c.totalOrders) > 1) returning++;
 var join = c.joinDate ? new Date(c.joinDate) : null;
 if (join && join.getMonth() === now.getMonth() && join.getFullYear() === now.getFullYear()) newThisMonth++;
 });
 return { total: customers.length, active: active, churned: churned, returning: returning, newThisMonth: newThisMonth };
 }

 return {
 // CRUD
 createCustomer: createCustomer,
 getCustomer: getCustomer,
 getCustomerByEmail: getCustomerByEmail,
 getCustomers: getCustomers,
 updateCustomer: updateCustomer,
 deleteCustomer: deleteCustomer,

 // Sync
 syncFromOrder: syncFromOrder,
 syncFromOrders: syncFromOrders,

 // Metrics
 getTotalCustomers: getTotalCustomers,
 getActiveCustomers: getActiveCustomers,
 getChurnedCustomers: getChurnedCustomers,
 getCustomersByDateRange: getCustomersByDateRange,
 getNewCustomers: getNewCustomers,
 getReturningCustomers: getReturningCustomers,
 getRetentionRate: getRetentionRate,
 getChurnRate: getChurnRate,
 getAverageLTV: getAverageLTV,
 getAverageOrderFrequency: getAverageOrderFrequency,
 getCustomerLTV: getCustomerLTV,
 getCustomerOrderFrequency: getCustomerOrderFrequency,
 markChurned: markChurned,
 getCustomerStats: getCustomerStats
 };
})();