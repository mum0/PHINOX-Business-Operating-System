/**
 * Event Bus
 * Decoupled pub/sub. Error isolation.
 */

const EventBus = (function() {
    'use strict';
    
    const handlers = {};
    
    const EVENTS = Object.freeze({
      TASK_CREATED: 'task:created',
      TASK_UPDATED: 'task:updated',
      TASK_DELETED: 'task:deleted',
      MEMBER_CREATED: 'member:created',
      INVENTORY_LOW: 'inventory:low',
      ORDER_CREATED: 'order:created',
      ORDER_PAID: 'order:paid',
      BACKUP_COMPLETED: 'system:backup',
      ERROR_OCCURRED: 'system:error'
    });
    
    return {
      EVENTS: EVENTS,
      
      on: function(eventName, handler, context) {
        if (!handlers[eventName]) {
          handlers[eventName] = [];
        }
        handlers[eventName].push({ fn: handler, ctx: context });
      },
      
      off: function(eventName, handler) {
        if (!handlers[eventName]) return;
        handlers[eventName] = handlers[eventName].filter(function(h) {
          return h.fn !== handler;
        });
      },
      
      emit: function(eventName, payload) {
        if (!handlers[eventName]) return;
        
        if (typeof Logger !== 'undefined') {
          Logger.debug('EventBus', 'Emitting ' + eventName);
        }
        
        handlers[eventName].forEach(function(handler) {
          try {
            handler.fn.call(handler.ctx, payload);
          } catch (e) {
            if (typeof Logger !== 'undefined') {
              Logger.error('EventBus', 'Handler failed for ' + eventName, { error: e.message });
            }
          }
        });
      },
      
      getEvents: function() {
        return Object.keys(handlers);
      }
    };
  })();