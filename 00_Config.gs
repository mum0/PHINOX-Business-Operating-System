/**
 * Core Configuration
 * Single source of truth. Environment-aware. Immutable.
 */

var CONFIG = (function() {
    'use strict';
    
    const ENV = PropertiesService.getScriptProperties().getProperty('BOS_ENV') || 'production';
    
    const BASE = {
      APP: {
        NAME: 'PHINOX BOS',
        VERSION: '5.0.0-enterprise',
        ENV: ENV
      },
      
      SPREADSHEET: {
        // ضع ID هنا للـ Web App، أو اتركه null يستخدم Active Spreadsheet
        ID: PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || null
      },
      
      SHEETS: {
        TASKS: 'Tasks',
        MEMBERS: 'Members',
        INVENTORY: 'Inventory',
        FINANCE: 'Finance',
        SALES: 'Sales',
        SETTINGS: 'Settings',
        KPI: 'KPI',
        KPI_RESULTS: 'KPI Results',
        FINANCE_LEDGER: 'Finance Ledger',
        FINANCE_EXPENSES: 'Finance Expenses',
        SUPPLIERS: 'Suppliers',
        ORDERS: 'Orders',
        REPORTS: 'Reports',
        CUSTOMERS: 'Customers',
        MARKETING: 'Marketing',
        SOCIAL: 'Social',
        SATISFACTION: 'Satisfaction',
        NPS: 'NPS',
        BOM: 'BOM',
        BOM_ITEM: 'BOM_ITEM',
        EXPENSES: 'Expenses',
        AUDIT: 'Audit Log',
        APPROVALS: 'Approval Requests',
        ARCHIVE: 'Archive'
      },
      
      COLUMNS: {
        ID: 1,
        CREATED_AT: 2,
        UPDATED_AT: 3,
        CREATED_BY: 4,
        STATUS: 5
      },
      
      PAGINATION: {
        DEFAULT_LIMIT: 100,
        MAX_LIMIT: 1000
      },
      
      SECURITY: {
        MAX_LOGIN_ATTEMPTS: 5,
        LOCKOUT_MINUTES: 30,
        SESSION_HOURS: 8
      },
      
      PERFORMANCE: {
        BATCH_SIZE: 500,
        CACHE_TTL_SECONDS: 300,
        MAX_EXECUTION_TIME_MS: 280000
      },

      EXPENSE_APPROVAL_THRESHOLDS: {
        manager: 100,
        finance: 500,
        ceo: 2000
      }

    };
    
    const OVERRIDES = {
      development: {
        PERFORMANCE: {
          BATCH_SIZE: 50,
          CACHE_TTL_SECONDS: 60
        }
      }
    };
    
    
    const config = JSON.parse(JSON.stringify(BASE));
    if (OVERRIDES[ENV]) {
      Object.keys(OVERRIDES[ENV]).forEach(key => {
        config[key] = Object.assign({}, config[key], OVERRIDES[ENV][key]);
      });
    }
    
    Object.freeze(config.APP);
    Object.freeze(config.SHEETS);
    Object.freeze(config.COLUMNS);
    Object.freeze(config.PAGINATION);
    Object.freeze(config.SECURITY);
    Object.freeze(config.PERFORMANCE);
    Object.freeze(config);
    
    return config;
  })();

