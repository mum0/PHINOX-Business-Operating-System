/**
 * Customer Repository
 * Data access layer for Customers. Extends BaseRepository.
 * NO business logic. NO SpreadsheetApp outside BaseRepository.
 * Phase 8B — PHINOX BOS v5
 */

const CustomerRepository = (function() {
 'use strict';

 if (typeof CustomerSchema === 'undefined') {
 throw new Error('CustomerSchema must be loaded before CustomerRepository');
 }

 const repo = BaseRepository.create(
 'Customers',
 CustomerSchema.SCHEMA,
 { eventName: 'customer' }
 );

 return {
 findById: function(id) { return repo.findById(id); },
 findByEmail: function(email) {
 return repo.findOne(function(c) {
 return c.email === String(email).trim().toLowerCase();
 });
 },
 findAll: function(options) { return repo.findAll(options); },
 findOne: function(predicate) { return repo.findOne(predicate); },
 create: function(data) { return repo.create(data); },
 update: function(id, updates) { return repo.update(id, updates); },
 delete: function(id) { return repo.delete(id); },
 count: function() { return repo.count(); },
 buildIndex: function() { return repo.buildIndex(); }
 };
})();