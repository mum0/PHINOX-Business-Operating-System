/**
 * Task Schema
 * Aligned EXACTLY with legacy 17_Tasks.js
 * UPDATED: Phase 8A — added completedAt (22) and approvedAt (23)
 */

const TaskSchema = (function() {
 'use strict';

 const SCHEMA = Object.freeze({
 id: 1, title: 2, category: 3, assignedTo: 4, priority: 5, difficulty: 6,
 status: 7, startDate: 8, dueDate: 9, completion: 10, quality: 11, impact: 12,
 evidence: 13, reviewer: 14, notes: 15, taskScore: 16, taskWeight: 17,
 weightedScore: 18, daysLate: 19, createdAt: 20, updatedAt: 21,
 completedAt: 22, approvedAt: 23
 });

 const STATUS = Object.freeze({
 NOT_STARTED: 'Not Started', IN_PROGRESS: 'In Progress',
 WAITING_REVIEW: 'Waiting Review', APPROVED: 'Approved',
 REJECTED: 'Rejected', CANCELLED: 'Cancelled'
 });

 const PRIORITY = Object.freeze({
 LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical'
 });

 const DIFFICULTY = Object.freeze({
 EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard', EXPERT: 'Expert'
 });

 const WEIGHT = Object.freeze({
 PRIORITY: { 'Low': 0.8, 'Medium': 1.0, 'High': 1.3, 'Critical': 1.8 },
 DIFFICULTY: { 'Easy': 0.8, 'Medium': 1.0, 'Hard': 1.5, 'Expert': 2.0 }
 });

 const ALLOWED_TRANSITIONS = Object.freeze({
 'Not Started': ['In Progress', 'Cancelled'],
 'In Progress': ['Waiting Review', 'Cancelled', 'Not Started'],
 'Waiting Review': ['Approved', 'Rejected', 'In Progress'],
 'Approved': ['In Progress'],
 'Rejected': ['In Progress', 'Cancelled'],
 'Cancelled': ['Not Started']
 });

 function isValidStatusTransition(current, next) {
 if (!current || !next) return false;
 if (current === next) return true;
 const allowed = ALLOWED_TRANSITIONS[current];
 return allowed ? allowed.indexOf(next) > -1 : false;
 }

 const VALIDATION = Object.freeze({
 title: { required: true, type: 'string', minLength: 1, maxLength: 200 },
 assignedTo: { required: true, type: 'string', minLength: 1, maxLength: 100 },
 priority: { required: true, allowed: Object.values(PRIORITY) },
 difficulty: { required: true, allowed: Object.values(DIFFICULTY) },
 status: { allowed: Object.values(STATUS) },
 completion: { type: 'number', min: 0, max: 100 },
 quality: { type: 'number', min: 0, max: 100 },
 impact: { type: 'number', min: 0, max: 100 },
 evidence: { type: 'number', min: 0, max: 100 },
 category: { type: 'string', maxLength: 100 },
 reviewer: { type: 'string', maxLength: 100 },
 notes: { type: 'string', maxLength: 2000 },
 startDate: { type: 'date' },
 dueDate: { type: 'date' },
 completedAt: { type: 'date' },
 approvedAt: { type: 'date' }
 });

 function getDefaultTask() {
 return {
 status: STATUS.NOT_STARTED, completion: 0, quality: 0, impact: 0,
 evidence: 0, taskScore: 0, taskWeight: 0, weightedScore: 0,
 daysLate: 0, category: '', reviewer: '', notes: '',
 startDate: '', dueDate: '',
 completedAt: '', approvedAt: ''
 };
 }

 return {
 SCHEMA: SCHEMA, STATUS: STATUS, PRIORITY: PRIORITY, DIFFICULTY: DIFFICULTY,
 WEIGHT: WEIGHT, ALLOWED_TRANSITIONS: ALLOWED_TRANSITIONS,
 isValidStatusTransition: isValidStatusTransition,
 VALIDATION: VALIDATION, getDefaultTask: getDefaultTask
 };
})();