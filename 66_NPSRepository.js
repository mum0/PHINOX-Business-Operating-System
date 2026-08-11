/**
 * NPS Repository
 * Data access layer for NPS records.
 * Phase 8E — PHINOX BOS v5
 */

const NPSRepository = (function() {
 'use strict';

 if (typeof NPSSchema === 'undefined') {
 throw new Error('NPSSchema must be loaded before NPSRepository');
 }

 const repo = BaseRepository.create(
 'NPS',
 NPSSchema.SCHEMA,
 { eventName: 'nps' }
 );

 return {
 findById: function(id) { return repo.findById(id); },
 findByCustomerEmail: function(email) {
 return repo.findAll({
 limit: CONFIG.PAGINATION.MAX_LIMIT,
 where: function(n) {
 return n.customerEmail === String(email).trim().toLowerCase();
 }
 });
 },
 findByOrderId: function(orderId) {
 return repo.findAll({
 limit: CONFIG.PAGINATION.MAX_LIMIT,
 where: function(n) { return n.orderId === orderId; }
 });
 },
 findAll: function(options) { return repo.findAll(options); },
 findOne: function(predicate) { return repo.findOne(predicate); },
 create: function(data) { return repo.create(data); },
 update: function(id, updates) { return repo.update(id, updates); },
 delete: function(id) { return repo.delete(id); },
 count: function() { return repo.count(); }
 };
})();