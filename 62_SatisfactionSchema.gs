/**
 * Satisfaction Schema
 * Customer satisfaction score tracking (1-10 scale)
 * Phase 8E — PHINOX BOS v5
 */

const SatisfactionSchema = (function() {
 'use strict';

 const SCHEMA = Object.freeze({
 id: 1, customerEmail: 2, orderId: 3, score: 4,
 category: 5, notes: 6, createdAt: 7, updatedAt: 8
 });

 const CATEGORY = Object.freeze({
 OVERALL: 'Overall',
 PRODUCT: 'Product',
 SERVICE: 'Service',
 DELIVERY: 'Delivery',
 SUPPORT: 'Support'
 });

 const VALIDATION = Object.freeze({
 customerEmail: { required: true, type: 'email' },
 orderId: { type: 'string', maxLength: 50 },
 score: { required: true, type: 'number', min: 1, max: 10 },
 category: { allowed: Object.values(CATEGORY) },
 notes: { type: 'string', maxLength: 2000 }
 });

 function getDefaultSatisfaction() {
 return {
 category: CATEGORY.OVERALL,
 score: 0,
 notes: ''
 };
 }

 return {
 SCHEMA: SCHEMA,
 CATEGORY: CATEGORY,
 VALIDATION: VALIDATION,
 getDefaultSatisfaction: getDefaultSatisfaction
 };
})();