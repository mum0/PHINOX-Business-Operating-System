/**
 * Customer Schema
 * Single source of truth for Customer column mapping, enums, validation, and defaults.
 * Phase 8B — PHINOX BOS v5
 */

const CustomerSchema = (function() {
 'use strict';

 const SCHEMA = Object.freeze({
 id: 1, name: 2, email: 3, phone: 4, status: 5,
 segment: 6, joinDate: 7, lastOrderDate: 8,
 totalOrders: 9, totalAmount: 10, averageOrderValue: 11,
 notes: 12, createdAt: 13, updatedAt: 14
 });

 const STATUS = Object.freeze({
 ACTIVE: 'Active',
 INACTIVE: 'Inactive',
 CHURNED: 'Churned'
 });

 const SEGMENT = Object.freeze({
 NEW: 'New',
 RETURNING: 'Returning',
 REGULAR: 'Regular',
 VIP: 'VIP'
 });

 const VALIDATION = Object.freeze({
 name: { required: true, type: 'string', minLength: 1, maxLength: 200 },
 email: { required: true, type: 'email' },
 phone: { type: 'string', maxLength: 50 },
 status: { allowed: Object.values(STATUS) },
 segment: { allowed: Object.values(SEGMENT) },
 notes: { type: 'string', maxLength: 2000 }
 });

 function getDefaultCustomer() {
 return {
 status: STATUS.ACTIVE,
 segment: SEGMENT.NEW,
 totalOrders: 0,
 totalAmount: 0,
 averageOrderValue: 0,
 notes: ''
 };
 }

 return {
 SCHEMA: SCHEMA,
 STATUS: STATUS,
 SEGMENT: SEGMENT,
 VALIDATION: VALIDATION,
 getDefaultCustomer: getDefaultCustomer
 };
})();