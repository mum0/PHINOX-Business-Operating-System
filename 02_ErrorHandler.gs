var ErrorHandler = (function() {
    'use strict';
    
    var CATEGORIES = {
      VALIDATION: 'VALIDATION_ERROR',
      NOT_FOUND: 'NOT_FOUND',
      PERMISSION: 'PERMISSION_DENIED',
      CONFLICT: 'CONFLICT',
      SYSTEM: 'SYSTEM_ERROR',
      TIMEOUT: 'TIMEOUT'
    };
    
    function BusinessError(category, message, details, sourceModule) {
      this.name = 'BusinessError';
      this.category = category;
      this.message = message;
      this.details = details || {};
      this.sourceModule = sourceModule || 'unknown';
      this.timestamp = new Date().toISOString();
      
      try {
        if (typeof Logger !== 'undefined' && Logger.error) {
          Logger.error(sourceModule, message, { category: category, details: details });
        }
      } catch(e) {}
    }
    
    BusinessError.prototype = Object.create(Error.prototype);
    BusinessError.prototype.constructor = BusinessError;
    
    return {
      CATEGORIES: CATEGORIES,
      
      validation: function(message, details, module) {
        return new BusinessError(CATEGORIES.VALIDATION, message, details, module);
      },
      
      notFound: function(resource, id, module) {
        return new BusinessError(
          CATEGORIES.NOT_FOUND,
          resource + ' with id "' + id + '" not found',
          { resource: resource, id: id },
          module
        );
      },
      
      permission: function(action, resource, module) {
        return new BusinessError(
          CATEGORIES.PERMISSION,
          'Permission denied: cannot ' + action + ' ' + resource,
          { action: action, resource: resource },
          module
        );
      },
      
      conflict: function(message, details, module) {
        return new BusinessError(CATEGORIES.CONFLICT, message, details, module);
      },
      
      system: function(message, details, module) {
        return new BusinessError(CATEGORIES.SYSTEM, message, details, module);
      },
      
      wrap: function(error, module) {
        if (error instanceof BusinessError) return error;
        return new BusinessError(
          CATEGORIES.SYSTEM,
          error.message || 'Unknown error',
          { originalError: String(error) },
          module
        );
      },
      
      toJSON: function(error) {
        return {
          success: false,
          error: {
            category: error.category || CATEGORIES.SYSTEM,
            message: error.message,
            details: error.details,
            timestamp: error.timestamp || new Date().toISOString()
          }
        };
      }
    };
  })();