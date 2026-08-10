/**
 * NPS Schema
 * Net Promoter Score tracking (0-10 scale)
 * Phase 8E — PHINOX BOS v5
 */

const NPSSchema = (function() {
 'use strict';

 const SCHEMA = Object.freeze({
 id: 1, customerEmail: 2, orderId: 3, score: 4,
 notes: 5, createdAt: 6, updatedAt: 7
 });

 const CLASSIFICATION = Object.freeze({
 DETRACTOR: 'Detractor',    // 0-6
 PASSIVE: 'Passive',        // 7-8
 PROMOTER: 'Promoter'       // 9-10
 });

 const VALIDATION = Object.freeze({
 customerEmail: { required: true, type: 'email' },
 orderId: { type: 'string', maxLength: 50 },
 score: { required: true, type: 'number', min: 0, max: 10 },
 notes: { type: 'string', maxLength: 2000 }
 });

 function getClassification(score) {
 var s = Number(score);
 if (s >= 0 && s <= 6) return CLASSIFICATION.DETRACTOR;
 if (s >= 7 && s <= 8) return CLASSIFICATION.PASSIVE;
 if (s >= 9 && s <= 10) return CLASSIFICATION.PROMOTER;
 return null;
 }

 function getDefaultNPS() {
 return {
 score: 0,
 notes: ''
 };
 }

 return {
 SCHEMA: SCHEMA,
 CLASSIFICATION: CLASSIFICATION,
 VALIDATION: VALIDATION,
 getClassification: getClassification,
 getDefaultNPS: getDefaultNPS
 };
})();