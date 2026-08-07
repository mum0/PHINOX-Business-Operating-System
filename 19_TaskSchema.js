/**
 * Task Schema
 * Single source of truth for Tasks column mapping, enums, validation, and defaults.
 * Extracted from legacy Tasks.js and aligned with v5 architecture.
 */

const TaskSchema = (function() {
  'use strict';

  // ─── COLUMN MAPPING (21 fields) ───
  const SCHEMA = Object.freeze({
    id: 1,
    title: 2,
    category: 3,
    assignedTo: 4,
    priority: 5,
    difficulty: 6,
    status: 7,
    startDate: 8,
    dueDate: 9,
    completion: 10,
    quality: 11,
    impact: 12,
    evidence: 13,
    reviewer: 14,
    notes: 15,
    score: 16,
    weight: 17,
    weightedScore: 18,
    daysLate: 19,
    createdAt: 20,
    updatedAt: 21
  });

  // ─── ENUMS ───
  const STATUS = Object.freeze({
    NOT_STARTED: 'Not Started',
    IN_PROGRESS: 'In Progress',
    WAITING_REVIEW: 'Waiting Review',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled'
  });

  const PRIORITY = Object.freeze({
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: 'High',
    URGENT: 'Urgent'
  });

  const DIFFICULTY = Object.freeze({
    EASY: 'Easy',
    MEDIUM: 'Medium',
    HARD: 'Hard',
    CRITICAL: 'Critical'
  });

  // ─── WEIGHT MAPS ───
  const WEIGHT = Object.freeze({
    PRIORITY: {
      'Low': 0.8,
      'Medium': 1.0,
      'High': 1.2,
      'Urgent': 1.5
    },
    DIFFICULTY: {
      'Easy': 0.8,
      'Medium': 1.0,
      'Hard': 1.3,
      'Critical': 1.6
    }
  });

  // ─── STATUS TRANSITIONS ───
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

  // ─── VALIDATION SCHEMA ───
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
    dueDate: { type: 'date' }
  });

  // ─── DEFAULTS ───
  function getDefaultTask() {
    return {
      status: STATUS.NOT_STARTED,
      completion: 0,
      quality: 0,
      impact: 0,
      evidence: 0,
      score: 0,
      weight: 0,
      weightedScore: 0,
      daysLate: 0,
      category: '',
      reviewer: '',
      notes: '',
      startDate: '',
      dueDate: ''
    };
  }

  return {
    SCHEMA: SCHEMA,
    STATUS: STATUS,
    PRIORITY: PRIORITY,
    DIFFICULTY: DIFFICULTY,
    WEIGHT: WEIGHT,
    ALLOWED_TRANSITIONS: ALLOWED_TRANSITIONS,
    isValidStatusTransition: isValidStatusTransition,
    VALIDATION: VALIDATION,
    getDefaultTask: getDefaultTask
  };
})();