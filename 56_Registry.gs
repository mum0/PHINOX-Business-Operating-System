/**
 * PHINOX BOS v5.1 — Central Registry System
 * File: 56_Registry.js
 * v5.1 ADDED
 *
 * Centralized reference-data / dropdown registry.
 * Uses existing BaseRepository, ErrorHandler, Logger, Utils.
 * Does NOT modify any existing file.
 */

var Registry = (function() {
  'use strict';

  // v5.1 ADDED — Sheet and schema constants
  var SHEET_NAME = 'Registry';

  var SCHEMA = {
    id: 1,
    category: 2,
    value: 3,
    labelEn: 4,
    labelAr: 5,
    active: 6,
    order: 7,
    parent: 8,
    createdAt: 9,
    updatedAt: 10
  };

  // v5.1 ADDED — Supported registry categories
  var CATEGORIES = {
    DEPARTMENT: 'department',
    JOB_TITLE: 'jobTitle',
    EXPENSE_CATEGORY: 'expenseCategory',
    EXPENSE_SUBCATEGORY: 'expenseSubcategory',
    CURRENCY: 'currency',
    PAYMENT_METHOD: 'paymentMethod'
  };

  var repo = null;

  // v5.1 ADDED — Lazy repository initializer
  function getRepo() {
    if (!repo) {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(SHEET_NAME);
      if (!sheet) {
        throw new Error('Registry sheet not found. Call Registry.init() first.');
      }
      repo = BaseRepository.create(SHEET_NAME, SCHEMA, { timestamps: true, audit: true });
    }
    return repo;
  }

  // v5.1 ADDED — Create sheet with headers if missing
  function initSheet() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);
    var created = false;
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      var headers = ['ID', 'Category', 'Value', 'Label (EN)', 'Label (AR)', 'Active', 'Order', 'Parent', 'Created At', 'Updated At'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
      created = true;
    }
    return created;
  }

  // v5.1 ADDED — Seed default reference data (idempotent per sheet creation)
  function seedDefaultData() {
    var r = getRepo();
    var now = new Date();

    var defaults = [
      // Departments
      { category: CATEGORIES.DEPARTMENT, value: 'operations', labelEn: 'Operations', labelAr: 'العمليات', order: 1 },
      { category: CATEGORIES.DEPARTMENT, value: 'finance', labelEn: 'Finance', labelAr: 'المالية', order: 2 },
      { category: CATEGORIES.DEPARTMENT, value: 'marketing', labelEn: 'Marketing', labelAr: 'التسويق', order: 3 },
      { category: CATEGORIES.DEPARTMENT, value: 'sales', labelEn: 'Sales', labelAr: 'المبيعات', order: 4 },
      { category: CATEGORIES.DEPARTMENT, value: 'design', labelEn: 'Design', labelAr: 'التصميم', order: 5 },
      { category: CATEGORIES.DEPARTMENT, value: 'customer_service', labelEn: 'Customer Service', labelAr: 'خدمة العملاء', order: 6 },

      // Job Titles
      { category: CATEGORIES.JOB_TITLE, value: 'ceo', labelEn: 'CEO', labelAr: 'المدير التنفيذي', order: 1 },
      { category: CATEGORIES.JOB_TITLE, value: 'partner', labelEn: 'Partner', labelAr: 'شريك', order: 2 },
      { category: CATEGORIES.JOB_TITLE, value: 'manager', labelEn: 'Manager', labelAr: 'مدير', order: 3 },
      { category: CATEGORIES.JOB_TITLE, value: 'finance_manager', labelEn: 'Finance Manager', labelAr: 'مدير مالي', order: 4 },
      { category: CATEGORIES.JOB_TITLE, value: 'operations_manager', labelEn: 'Operations Manager', labelAr: 'مدير عمليات', order: 5 },
      { category: CATEGORIES.JOB_TITLE, value: 'marketing_manager', labelEn: 'Marketing Manager', labelAr: 'مدير تسويق', order: 6 },
      { category: CATEGORIES.JOB_TITLE, value: 'designer', labelEn: 'Designer', labelAr: 'مصمم', order: 7 },
      { category: CATEGORIES.JOB_TITLE, value: 'customer_service_rep', labelEn: 'Customer Service Rep', labelAr: 'ممثل خدمة العملاء', order: 8 },
      { category: CATEGORIES.JOB_TITLE, value: 'staff', labelEn: 'Staff', labelAr: 'موظف', order: 9 },

      // Expense Categories
      { category: CATEGORIES.EXPENSE_CATEGORY, value: 'rent', labelEn: 'Rent', labelAr: 'إيجار', order: 1 },
      { category: CATEGORIES.EXPENSE_CATEGORY, value: 'salaries', labelEn: 'Salaries', labelAr: 'رواتب', order: 2 },
      { category: CATEGORIES.EXPENSE_CATEGORY, value: 'utilities', labelEn: 'Utilities', labelAr: 'خدمات', order: 3 },
      { category: CATEGORIES.EXPENSE_CATEGORY, value: 'marketing', labelEn: 'Marketing', labelAr: 'تسويق', order: 4 },
      { category: CATEGORIES.EXPENSE_CATEGORY, value: 'shipping', labelEn: 'Shipping', labelAr: 'شحن', order: 5 },
      { category: CATEGORIES.EXPENSE_CATEGORY, value: 'supplies', labelEn: 'Supplies', labelAr: 'مستلزمات', order: 6 },
      { category: CATEGORIES.EXPENSE_CATEGORY, value: 'other', labelEn: 'Other', labelAr: 'أخرى', order: 7 },

      // Expense Subcategories
      { category: CATEGORIES.EXPENSE_SUBCATEGORY, value: 'office_rent', labelEn: 'Office Rent', labelAr: 'إيجار مكتب', order: 1, parent: 'rent' },
      { category: CATEGORIES.EXPENSE_SUBCATEGORY, value: 'warehouse_rent', labelEn: 'Warehouse Rent', labelAr: 'إيجار مستودع', order: 2, parent: 'rent' },
      { category: CATEGORIES.EXPENSE_SUBCATEGORY, value: 'base_salary', labelEn: 'Base Salary', labelAr: 'راتب أساسي', order: 3, parent: 'salaries' },
      { category: CATEGORIES.EXPENSE_SUBCATEGORY, value: 'bonus', labelEn: 'Bonus', labelAr: 'مكافأة', order: 4, parent: 'salaries' },
      { category: CATEGORIES.EXPENSE_SUBCATEGORY, value: 'electricity', labelEn: 'Electricity', labelAr: 'كهرباء', order: 5, parent: 'utilities' },
      { category: CATEGORIES.EXPENSE_SUBCATEGORY, value: 'internet', labelEn: 'Internet', labelAr: 'إنترنت', order: 6, parent: 'utilities' },
      { category: CATEGORIES.EXPENSE_SUBCATEGORY, value: 'digital_ads', labelEn: 'Digital Ads', labelAr: 'إعلانات رقمية', order: 7, parent: 'marketing' },
      { category: CATEGORIES.EXPENSE_SUBCATEGORY, value: 'print_materials', labelEn: 'Print Materials', labelAr: 'مواد مطبوعة', order: 8, parent: 'marketing' },
      { category: CATEGORIES.EXPENSE_SUBCATEGORY, value: 'local_shipping', labelEn: 'Local Shipping', labelAr: 'شحن محلي', order: 9, parent: 'shipping' },
      { category: CATEGORIES.EXPENSE_SUBCATEGORY, value: 'international_shipping', labelEn: 'International Shipping', labelAr: 'شحن دولي', order: 10, parent: 'shipping' },
      { category: CATEGORIES.EXPENSE_SUBCATEGORY, value: 'office_supplies', labelEn: 'Office Supplies', labelAr: 'مستلزمات مكتبية', order: 11, parent: 'supplies' },
      { category: CATEGORIES.EXPENSE_SUBCATEGORY, value: 'production_supplies', labelEn: 'Production Supplies', labelAr: 'مستلزمات إنتاج', order: 12, parent: 'supplies' },

      // Currencies
      { category: CATEGORIES.CURRENCY, value: 'SAR', labelEn: 'Saudi Riyal', labelAr: 'ريال سعودي', order: 1 },
      { category: CATEGORIES.CURRENCY, value: 'USD', labelEn: 'US Dollar', labelAr: 'دولار أمريكي', order: 2 },
      { category: CATEGORIES.CURRENCY, value: 'EUR', labelEn: 'Euro', labelAr: 'يورو', order: 3 },
      { category: CATEGORIES.CURRENCY, value: 'AED', labelEn: 'UAE Dirham', labelAr: 'درهم إماراتي', order: 4 },
      { category: CATEGORIES.CURRENCY, value: 'EGP', labelEn: 'Egyptian Pound', labelAr: 'جنيه مصري', order: 5 },

      // Payment Methods
      { category: CATEGORIES.PAYMENT_METHOD, value: 'cash', labelEn: 'Cash', labelAr: 'نقدي', order: 1 },
      { category: CATEGORIES.PAYMENT_METHOD, value: 'credit_card', labelEn: 'Credit Card', labelAr: 'بطاقة ائتمان', order: 2 },
      { category: CATEGORIES.PAYMENT_METHOD, value: 'bank_transfer', labelEn: 'Bank Transfer', labelAr: 'تحويل بنكي', order: 3 },
      { category: CATEGORIES.PAYMENT_METHOD, value: 'check', labelEn: 'Check', labelAr: 'شيك', order: 4 },
      { category: CATEGORIES.PAYMENT_METHOD, value: 'digital_wallet', labelEn: 'Digital Wallet', labelAr: 'محفظة رقمية', order: 5 }
    ];

    defaults.forEach(function(item) {
      r.create({
        category: item.category,
        value: item.value,
        labelEn: item.labelEn,
        labelAr: item.labelAr,
        active: true,
        order: item.order,
        parent: item.parent || ''
      });
    });
  }

  // v5.1 ADDED — Validation helper
  function validateEntry(data) {
    if (!data.category) {
      throw ErrorHandler.validation('Category is required', {}, 'Registry');
    }
    if (!data.value) {
      throw ErrorHandler.validation('Value is required', {}, 'Registry');
    }

    var validCats = Object.keys(CATEGORIES).map(function(k) { return CATEGORIES[k]; });
    if (validCats.indexOf(data.category) === -1) {
      throw ErrorHandler.validation('Invalid category: ' + data.category, {}, 'Registry');
    }
  }

  // v5.1 ADDED — Public API
  return {

    // v5.1 ADDED — Category constants
    CATEGORIES: CATEGORIES,

    // v5.1 ADDED — Initialize sheet and seed defaults
    init: function() {
      var wasCreated = initSheet();
      if (!repo) {
        repo = BaseRepository.create(SHEET_NAME, SCHEMA, { timestamps: true, audit: true });
      }
      if (wasCreated) {
        seedDefaultData();
        Logger.info('Registry', 'Initialized Registry with default data');
      }
      return { success: true, message: 'Registry initialized' };
    },

    // v5.1 ADDED — Read: all entries by category
    getByCategory: function(category, options) {
      options = options || {};
      var r = getRepo();
      var result = r.findAll({
        limit: 1000,
        where: function(row) {
          return row.category === category;
        }
      });

      var items = result.data;

      if (options.activeOnly !== false) {
        items = items.filter(function(item) {
          return item.active === true || item.active === 'true' || item.active === 'TRUE';
        });
      }

      items.sort(function(a, b) {
        return (Number(a.order) || 0) - (Number(b.order) || 0);
      });

      return items;
    },

    // v5.1 ADDED — Read: single entry by ID
    getById: function(id) {
      return getRepo().findById(id);
    },

    // v5.1 ADDED — Read: single entry by category + value
    getByValue: function(category, value) {
      var items = this.getByCategory(category, { activeOnly: false });
      for (var i = 0; i < items.length; i++) {
        if (items[i].value === value) return items[i];
      }
      return null;
    },

    // v5.1 ADDED — Read: localized label for a value
    getLabel: function(category, value, lang) {
      lang = lang || 'en';
      var item = this.getByValue(category, value);
      if (!item) return value;
      return lang === 'ar' ? (item.labelAr || item.labelEn || value) : (item.labelEn || item.labelAr || value);
    },

    // v5.1 ADDED — Read: subcategories filtered by parent category value
    getSubcategories: function(parentCategory) {
      var items = this.getByCategory(CATEGORIES.EXPENSE_SUBCATEGORY, { activeOnly: true });
      return items.filter(function(item) {
        return item.parent === parentCategory;
      });
    },

    // v5.1 ADDED — Write: add new entry
    add: function(data) {
      validateEntry(data);

      var existing = this.getByValue(data.category, data.value);
      if (existing) {
        throw ErrorHandler.conflict(
          'Entry already exists: ' + data.value + ' in ' + data.category,
          { category: data.category, value: data.value },
          'Registry'
        );
      }

      var r = getRepo();
      var created = r.create({
        category: data.category,
        value: data.value,
        labelEn: data.labelEn || '',
        labelAr: data.labelAr || '',
        active: data.active !== false,
        order: data.order || 0,
        parent: data.parent || ''
      });

      Logger.info('Registry', 'Added ' + data.category + ' entry: ' + data.value);
      return created;
    },

    // v5.1 ADDED — Write: update entry
    update: function(id, data) {
      var r = getRepo();
      var existing = r.findById(id);
      if (!existing) {
        throw ErrorHandler.notFound('Registry entry', id, 'Registry');
      }

      var updates = {};
      if (data.value !== undefined) updates.value = data.value;
      if (data.labelEn !== undefined) updates.labelEn = data.labelEn;
      if (data.labelAr !== undefined) updates.labelAr = data.labelAr;
      if (data.active !== undefined) updates.active = data.active;
      if (data.order !== undefined) updates.order = data.order;
      if (data.parent !== undefined) updates.parent = data.parent;

      var updated = r.update(id, updates);
      Logger.info('Registry', 'Updated registry entry: ' + id);
      return updated;
    },

    // v5.1 ADDED — Write: soft-disable entry
    deactivate: function(id) {
      return this.update(id, { active: false });
    },

    // v5.1 ADDED — Write: re-enable entry
    activate: function(id) {
      return this.update(id, { active: true });
    },

    // v5.1 ADDED — Read: category metadata
    getCategories: function() {
      return Object.keys(CATEGORIES).map(function(key) {
        return {
          key: key,
          value: CATEGORIES[key],
          label: key.replace(/_/g, ' ').toLowerCase()
        };
      });
    }

  };
})();
