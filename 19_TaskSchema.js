/**
 * Task Schema
 * Single source of truth for Tasks data structure.
 * Replaces: APP.TASK_STATUS, APP.PRIORITY, APP.DIFFICULTY, APP.TASK_WEIGHT, TASK_COL
 */

const TaskSchema = (function() {
    'use strict';
    
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
      updatedAt: 21,
      createdBy: 22
    });
    
    const STATUS = Object.freeze({
      NOT_STARTED: 'Not Started',
      IN_PROGRESS: 'In Progress',
      WAITING_REVIEW: 'Waiting Review',
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
      BLOCKED: 'Blocked',
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
    
    const WEIGHT = Object.freeze({
      PRIORITY: Object.freeze({
        'Low': 0.8,
        'Medium': 1.0,
        'High': 1.2,
        'Urgent': 1.5
      }),
      DIFFICULTY: Object.freeze({
        'Easy': 0.8,
        'Medium': 1.0,
        'Hard': 1.3,
        'Critical': 1.6
      })
    });
    
    const VALIDATION = Object.freeze({
      title: { required: true, type: 'string', minLength: 1, maxLength: 200 },
      category: { type: 'string', maxLength: 100 },
      assignedTo: { required: true, type: 'string', minLength: 1, maxLength: 100 },
      priority: { required: true, type: 'string', allowed: ['Low', 'Medium', 'High', 'Urgent'] },
      difficulty: { required: true, type: 'string', allowed: ['Easy', 'Medium', 'Hard', 'Critical'] },
      status: { type: 'string', allowed: Object.values(STATUS) },
      startDate: { type: 'date' },
      dueDate: { type: 'date' },
      completion: { type: 'number', min: 0, max: 100 },
      quality: { type: 'number', min: 0, max: 100 },
      impact: { type: 'number', min: 0, max: 100 },
      evidence: { type: 'number', min: 0, max: 100 },
      reviewer: { type: 'string', maxLength: 100 },
      notes: { type: 'string', maxLength: 2000 }
    });
    
    const STATUS_TRANSITIONS = Object.freeze({
      [STATUS.NOT_STARTED]: [STATUS.IN_PROGRESS, STATUS.CANCELLED],
      [STATUS.IN_PROGRESS]: [STATUS.WAITING_REVIEW, STATUS.CANCELLED, STATUS.BLOCKED],
      [STATUS.WAITING_REVIEW]: [STATUS.APPROVED, STATUS.REJECTED],
      [STATUS.REJECTED]: [STATUS.IN_PROGRESS, STATUS.CANCELLED],
      [STATUS.BLOCKED]: [STATUS.IN_PROGRESS, STATUS.CANCELLED],
      [STATUS.APPROVED]: [],
      [STATUS.CANCELLED]: []
    });
    
    function isValidStatusTransition(fromStatus, toStatus) {
      if (fromStatus === toStatus) return true;
      const allowed = STATUS_TRANSITIONS[fromStatus];
      if (!allowed) return false;
      return allowed.includes(toStatus);
    }
    
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
        daysLate: 0
      };
    }
    
    return {
      SCHEMA: SCHEMA,
      STATUS: STATUS,
      PRIORITY: PRIORITY,
      DIFFICULTY: DIFFICULTY,
      WEIGHT: WEIGHT,
      VALIDATION: VALIDATION,
      STATUS_TRANSITIONS: STATUS_TRANSITIONS,
      isValidStatusTransition: isValidStatusTransition,
      getDefaultTask: getDefaultTask,
      SHEET_NAME: CONFIG.SHEETS.TASKS
    };
  })();