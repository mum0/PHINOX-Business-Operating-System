/**
 * Input Validator
 * Schema-based validation with sanitization.
 */

const Validator = (function() {
    'use strict';
    
    const RULES = {
       array: function(value) { return Array.isArray(value); },  // ADD THIS LINE

      required: function(value) {
        return value !== undefined && value !== null && value !== '';
      },
      
      string: function(value) {
        return typeof value === 'string';
      },
      
      number: function(value) {
        return typeof value === 'number' && !isNaN(value);
      },
      
      integer: function(value) {
        return Number.isInteger(value);
      },
      
      positive: function(value) {
        return typeof value === 'number' && value > 0;
      },
      
      email: function(value) {
        return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      },
      
      date: function(value) {
        return value instanceof Date && !isNaN(value.getTime());
      },
      
      enum: function(value, allowed) {
        return allowed.includes(value);
      },
      
      minLength: function(value, min) {
        return String(value).length >= min;
      },
      
      maxLength: function(value, max) {
        return String(value).length <= max;
      },
      
      range: function(value, min, max) {
        return typeof value === 'number' && value >= min && value <= max;
      }
    };
    
    function validateField(fieldName, value, constraints) {
      const errors = [];
      
      if (constraints.required && !RULES.required(value)) {
        errors.push(`${fieldName} is required`);
        return errors;
      }
      
      if (value === undefined || value === null || value === '') {
        return errors;
      }
      
      if (constraints.type && !RULES[constraints.type](value)) {
        errors.push(`${fieldName} must be ${constraints.type}`);
      }
      
      if (constraints.min !== undefined && !RULES.range(value, constraints.min, Infinity)) {
        errors.push(`${fieldName} must be at least ${constraints.min}`);
      }
      
      if (constraints.max !== undefined && !RULES.range(value, -Infinity, constraints.max)) {
        errors.push(`${fieldName} must be at most ${constraints.max}`);
      }
      
      if (constraints.minLength && !RULES.minLength(value, constraints.minLength)) {
        errors.push(`${fieldName} must be at least ${constraints.minLength} characters`);
      }
      
      if (constraints.maxLength && !RULES.maxLength(value, constraints.maxLength)) {
        errors.push(`${fieldName} must be at most ${constraints.maxLength} characters`);
      }
      
      if (constraints.allowed && !RULES.enum(value, constraints.allowed)) {
        errors.push(`${fieldName} must be one of: ${constraints.allowed.join(', ')}`);
      }
      
      if (constraints.pattern && !constraints.pattern.test(String(value))) {
        errors.push(`${fieldName} format is invalid`);
      }
      
      if (constraints.custom && typeof constraints.custom === 'function') {
        const result = constraints.custom(value);
        if (result !== true) {
          errors.push(result || `${fieldName} is invalid`);
        }
      }
      
      return errors;
    }
    
    return {
      validate: function(data, schema, module) {
        const errors = [];
        const sanitized = {};
        
        Object.keys(schema).forEach(function(field) {
          const constraints = schema[field];
          const value = data[field];
          
          if (value !== undefined && value !== null) {
            if (constraints.type === 'string') sanitized[field] = String(value).trim();
            else if (constraints.type === 'number') sanitized[field] = Number(value);
            else if (constraints.type === 'integer') sanitized[field] = parseInt(value, 10);
            else if (constraints.type === 'date' && !(value instanceof Date)) {
              sanitized[field] = new Date(value);
            } else {
              sanitized[field] = value;
            }
          }
          
          const fieldErrors = validateField(field, sanitized[field] !== undefined ? sanitized[field] : value, constraints);
          errors.push.apply(errors, fieldErrors);
        });
        
        if (errors.length > 0) {
          throw ErrorHandler.validation('Validation failed', { fields: errors }, module);
        }
        
        return { isValid: true, errors: [], data: sanitized };
      },
      
      isValid: function(data, schema) {
        try {
          this.validate(data, schema, 'validator');
          return true;
        } catch (e) {
          return false;
        }
      }
    };
  })();