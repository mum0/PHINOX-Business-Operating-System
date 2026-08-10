/**
 * NPS Service
 * Business logic for Net Promoter Score tracking.
 * Standard NPS scale: 0-6 Detractor, 7-8 Passive, 9-10 Promoter
 * Phase 8E — PHINOX BOS v5
 */

const NPSService = (function() {
 'use strict';

 const CL = NPSSchema.CLASSIFICATION;

 function _now() { return new Date(); }
 function _toNumber(value, def) { const n = Number(value); return isNaN(n) ? (def !== undefined ? def : 0) : n; }
 function _round(num, d) { d = d || 2; return Math.round(num * Math.pow(10, d)) / Math.pow(10, d); }
 function _generateId() { return 'NPS-' + Math.random().toString(36).substr(2, 9).toUpperCase(); }

 function _validateInput(data, isUpdate) {
 const schema = {};
 const fields = isUpdate ? Object.keys(data) : Object.keys(NPSSchema.VALIDATION);
 fields.forEach(function(f) { if (NPSSchema.VALIDATION[f]) schema[f] = NPSSchema.VALIDATION[f]; });
 if (!isUpdate) {
 const defaults = NPSSchema.getDefaultNPS();
 Object.keys(defaults).forEach(function(k) {
 if (data[k] === undefined || data[k] === null || data[k] === '') data[k] = defaults[k];
 });
 }
 return Validator.validate(data, schema, 'NPSService');
 }

 // ============ CRUD ============

 function createRecord(data) {
 const record = Utils.clone(data);
 if (!record.id) record.id = _generateId();
 const defaults = NPSSchema.getDefaultNPS();
 Object.keys(defaults).forEach(function(k) {
 if (record[k] === undefined || record[k] === null || record[k] === '') record[k] = defaults[k];
 });
 _validateInput(record, false);
 if (record.customerEmail) record.customerEmail = String(record.customerEmail).trim().toLowerCase();
 if (record.notes) record.notes = Utils.safeStr(record.notes).trim();
 record.score = _toNumber(record.score);
 if (record.score < 0 || record.score > 10) {
 throw ErrorHandler.validation('NPS score must be between 0 and 10', { score: record.score }, 'NPSService');
 }
 const created = NPSRepository.create(record);
 Logger.info('NPSService', 'Record created', { id: created.id, email: created.customerEmail, score: created.score });
 return created.id;
 }

 function getRecord(id) { return id ? NPSRepository.findById(id) : null; }
 function getRecords(options) { return NPSRepository.findAll(options); }

 function updateRecord(id, updates) {
 if (!id) throw ErrorHandler.validation('ID required', {}, 'NPSService');
 const data = Utils.clone(updates);
 delete data.id; delete data.createdAt; delete data.createdBy;
 if (data.customerEmail !== undefined) data.customerEmail = String(data.customerEmail).trim().toLowerCase();
 if (data.notes !== undefined) data.notes = Utils.safeStr(data.notes).trim();
 if (data.score !== undefined) {
 data.score = _toNumber(data.score);
 if (data.score < 0 || data.score > 10) {
 throw ErrorHandler.validation('NPS score must be between 0 and 10', { score: data.score }, 'NPSService');
 }
 }
 if (Object.keys(data).length > 0) _validateInput(data, true);
 const updated = NPSRepository.update(id, data);
 Logger.info('NPSService', 'Record updated', { id: id });
 return updated;
 }

 function deleteRecord(id) {
 if (!id) throw ErrorHandler.validation('ID required', {}, 'NPSService');
 NPSRepository.delete(id);
 Logger.info('NPSService', 'Record deleted', { id: id });
 return true;
 }

 // ============ QUERIES ============

 function getByCustomerEmail(email) {
 return NPSRepository.findByCustomerEmail(email);
 }

 function getByOrderId(orderId) {
 return NPSRepository.findByOrderId(orderId);
 }

 function getByDateRange(startDate, endDate) {
 var s = startDate ? new Date(startDate) : null;
 var e = endDate ? new Date(endDate) : null;
 return NPSRepository.findAll({
 limit: CONFIG.PAGINATION.MAX_LIMIT,
 where: function(n) {
 var created = new Date(n.createdAt);
 if (s && created < s) return false;
 if (e && created > e) return false;
 return true;
 }
 });
 }

 function getNPS(startDate, endDate) {
 var result = getByDateRange(startDate, endDate);
 var records = result && result.data ? result.data : [];
 if (records.length === 0) return 0;

 var promoters = 0, passives = 0, detractors = 0;
 records.forEach(function(r) {
 var score = _toNumber(r.score);
 if (score >= 9 && score <= 10) promoters++;
 else if (score >= 7 && score <= 8) passives++;
 else if (score >= 0 && score <= 6) detractors++;
 });

 var total = promoters + passives + detractors;
 if (total === 0) return 0;

 var pctPromoters = (promoters / total) * 100;
 var pctDetractors = (detractors / total) * 100;
 return _round(pctPromoters - pctDetractors, 2);
 }

 function getBreakdown(startDate, endDate) {
 var result = getByDateRange(startDate, endDate);
 var records = result && result.data ? result.data : [];
 var promoters = 0, passives = 0, detractors = 0;
 records.forEach(function(r) {
 var score = _toNumber(r.score);
 if (score >= 9 && score <= 10) promoters++;
 else if (score >= 7 && score <= 8) passives++;
 else if (score >= 0 && score <= 6) detractors++;
 });
 var total = promoters + passives + detractors;
 return {
 total: total,
 promoters: promoters,
 passives: passives,
 detractors: detractors,
 pctPromoters: total > 0 ? _round((promoters / total) * 100, 2) : 0,
 pctPassives: total > 0 ? _round((passives / total) * 100, 2) : 0,
 pctDetractors: total > 0 ? _round((detractors / total) * 100, 2) : 0,
 nps: total > 0 ? _round(((promoters / total) * 100) - ((detractors / total) * 100), 2) : 0
 };
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
 getNPS: getNPS,
 getBreakdown: getBreakdown,
 getCount: getCount
 };
})();