/**
 * Satisfaction Service
 * Business logic for customer satisfaction tracking.
 * Phase 8E — PHINOX BOS v5
 */

const SatisfactionService = (function() {
 'use strict';

 const C = SatisfactionSchema.CATEGORY;

 function _now() { return new Date(); }
 function _toNumber(value, def) { const n = Number(value); return isNaN(n) ? (def !== undefined ? def : 0) : n; }
 function _round(num, d) { d = d || 2; return Math.round(num * Math.pow(10, d)) / Math.pow(10, d); }
 function _generateId() { return 'SAT-' + Math.random().toString(36).substr(2, 9).toUpperCase(); }

 function _validateInput(data, isUpdate) {
 const schema = {};
 const fields = isUpdate ? Object.keys(data) : Object.keys(SatisfactionSchema.VALIDATION);
 fields.forEach(function(f) { if (SatisfactionSchema.VALIDATION[f]) schema[f] = SatisfactionSchema.VALIDATION[f]; });
 if (!isUpdate) {
 const defaults = SatisfactionSchema.getDefaultSatisfaction();
 Object.keys(defaults).forEach(function(k) {
 if (data[k] === undefined || data[k] === null || data[k] === '') data[k] = defaults[k];
 });
 }
 return Validator.validate(data, schema, 'SatisfactionService');
 }

 // ============ CRUD ============

 function createRecord(data) {
 const record = Utils.clone(data);
 if (!record.id) record.id = _generateId();
 const defaults = SatisfactionSchema.getDefaultSatisfaction();
 Object.keys(defaults).forEach(function(k) {
 if (record[k] === undefined || record[k] === null || record[k] === '') record[k] = defaults[k];
 });
 _validateInput(record, false);
 if (record.customerEmail) record.customerEmail = String(record.customerEmail).trim().toLowerCase();
 if (record.notes) record.notes = Utils.safeStr(record.notes).trim();
 record.score = _toNumber(record.score);
 if (record.score < 1 || record.score > 10) {
 throw ErrorHandler.validation('Score must be between 1 and 10', { score: record.score }, 'SatisfactionService');
 }
 const created = SatisfactionRepository.create(record);
 Logger.info('SatisfactionService', 'Record created', { id: created.id, email: created.customerEmail, score: created.score });
 return created.id;
 }

 function getRecord(id) { return id ? SatisfactionRepository.findById(id) : null; }
 function getRecords(options) { return SatisfactionRepository.findAll(options); }

 function updateRecord(id, updates) {
 if (!id) throw ErrorHandler.validation('ID required', {}, 'SatisfactionService');
 const data = Utils.clone(updates);
 delete data.id; delete data.createdAt; delete data.createdBy;
 if (data.customerEmail !== undefined) data.customerEmail = String(data.customerEmail).trim().toLowerCase();
 if (data.notes !== undefined) data.notes = Utils.safeStr(data.notes).trim();
 if (data.score !== undefined) {
 data.score = _toNumber(data.score);
 if (data.score < 1 || data.score > 10) {
 throw ErrorHandler.validation('Score must be between 1 and 10', { score: data.score }, 'SatisfactionService');
 }
 }
 if (Object.keys(data).length > 0) _validateInput(data, true);
 const updated = SatisfactionRepository.update(id, data);
 Logger.info('SatisfactionService', 'Record updated', { id: id });
 return updated;
 }

 function deleteRecord(id) {
 if (!id) throw ErrorHandler.validation('ID required', {}, 'SatisfactionService');
 SatisfactionRepository.delete(id);
 Logger.info('SatisfactionService', 'Record deleted', { id: id });
 return true;
 }

 // ============ QUERIES ============

 function getByCustomerEmail(email) {
 return SatisfactionRepository.findByCustomerEmail(email);
 }

 function getByOrderId(orderId) {
 return SatisfactionRepository.findByOrderId(orderId);
 }

 function getByDateRange(startDate, endDate) {
 var s = startDate ? new Date(startDate) : null;
 var e = endDate ? new Date(endDate) : null;
 return SatisfactionRepository.findAll({
 limit: CONFIG.PAGINATION.MAX_LIMIT,
 where: function(r) {
 var created = new Date(r.createdAt);
 if (s && created < s) return false;
 if (e && created > e) return false;
 return true;
 }
 });
 }

 function getAverageScore(startDate, endDate) {
 var result = getByDateRange(startDate, endDate);
 var records = result && result.data ? result.data : [];
 if (records.length === 0) return 0;
 return _round(records.reduce(function(acc, r) { return acc + _toNumber(r.score); }, 0) / records.length, 2);
 }

 function getAverageScoreByCategory(startDate, endDate, category) {
 var result = getByDateRange(startDate, endDate);
 var records = result && result.data ? result.data : [];
 var filtered = records.filter(function(r) { return r.category === category; });
 if (filtered.length === 0) return 0;
 return _round(filtered.reduce(function(acc, r) { return acc + _toNumber(r.score); }, 0) / filtered.length, 2);
 }

 function getCount(startDate, endDate) {
 var result = getByDateRange(startDate, endDate);
 return result && result.data ? result.data.length : 0;
 }

 return {
 createRecord: createRecord,
 getRecord: getRecord,
 getRecords: getRecords,
 updateRecord: updateRecord,
 deleteRecord: deleteRecord,
 getByCustomerEmail: getByCustomerEmail,
 getByOrderId: getByOrderId,
 getByDateRange: getByDateRange,
 getAverageScore: getAverageScore,
 getAverageScoreByCategory: getAverageScoreByCategory,
 getCount: getCount
 };
})();