/**
 * Satisfaction Repository
 * Data access layer for Satisfaction records.
 * Phase 8E — PHINOX BOS v5
 */

const SatisfactionRepository = (function() {
 'use strict';

 if (typeof SatisfactionSchema === 'undefined') {
 throw new Error('SatisfactionSchema must be loaded before SatisfactionRepository');
 }

 const repo = BaseRepository.create(
 'Satisfaction',
 SatisfactionSchema.SCHEMA,
 { eventName: 'satisfaction' }
 );

 return {
 findById: function(id) { return repo.findById(id); },
 findByCustomerEmail: function(email) {
 return repo.findAll({
 limit: CONFIG.PAGINATION.MAX_LIMIT,
 where: function(s) {
 return s.customerEmail === String(email).trim().toLowerCase();
 }
 });
 },
 findByOrderId: function(orderId) {
 return repo.findAll({
 limit: CONFIG.PAGINATION.MAX_LIMIT,
 where: function(s) { return s.orderId === orderId; }
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