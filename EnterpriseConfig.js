/**
 * ============================================================
 * PHINOX Business Operating System v2.0
 * EnterpriseConfig.gs
 * Enterprise Configuration & Feature Registry
 * ============================================================
 * DO NOT MODIFY existing APP constant.
 * This file extends capabilities via ENTERPRISE global.
 */

const ENTERPRISE = {
  
    VERSION: "2.0.0-ENTERPRISE",
    BUILD: "20260727",
    ENV: "production",
    
    /**
     * Feature Flags — Enable modules progressively
     */
    FEATURES: {
      ADVANCED_KPI: true,
      MULTI_DASHBOARD: true,
      PROFIT_CENTER: true,
      FORECASTING: true,
      ANOMALY_DETECTION: true,
      SOFT_DELETE: true,
      VERSION_HISTORY: true,
      FIELD_LEVEL_SECURITY: true,
      RATE_LIMITING: true,
      DARK_MODE: true,
      RTL: true,
      MATERIAL_UI: true,
      PDF_EXPORT: true,
      EXCEL_EXPORT: true,
      EMAIL_REPORTS: true,
      WIZARD_FORMS: true,
      KEYBOARD_SHORTCUTS: true,
      AUTO_SAVE: true,
      LIVE_VALIDATION: true,
      CHART_JS: true
    },
    
    /**
     * Departments Registry — 22 Departments
     */
    DEPARTMENTS: {
      CEO: { code: "CEO", nameAr: "الرئيس التنفيذي", nameEn: "CEO", icon: "account_balance" },
      EXECUTIVE: { code: "EXE", nameAr: "الإدارة التنفيذية", nameEn: "Executive Management", icon: "business" },
      PRODUCT_DEV: { code: "PRD", nameAr: "تطوير المنتجات", nameEn: "Product Development", icon: "design_services" },
      SUPPLY_CHAIN: { code: "SUP", nameAr: "سلسلة الإمداد", nameEn: "Supply Chain", icon: "local_shipping" },
      INVENTORY: { code: "INV", nameAr: "المخزون", nameEn: "Inventory", icon: "warehouse" },
      PRODUCTION: { code: "PRO", nameAr: "الإنتاج", nameEn: "Production", icon: "precision_manufacturing" },
      MARKETING: { code: "MKT", nameAr: "التسويق", nameEn: "Marketing", icon: "campaign" },
      BRANDING: { code: "BRD", nameAr: "العلامة التجارية", nameEn: "Branding", icon: "style" },
      CONTENT: { code: "CNT", nameAr: "إنشاء المحتوى", nameEn: "Content Creation", icon: "edit_note" },
      SOCIAL: { code: "SOC", nameAr: "التواصل الاجتماعي", nameEn: "Social Media", icon: "share" },
      ADVERTISING: { code: "ADV", nameAr: "الإعلانات", nameEn: "Advertising", icon: "ads_click" },
      ECOMMERCE: { code: "ECM", nameAr: "التجارة الإلكترونية", nameEn: "E-Commerce", icon: "shopping_cart" },
      CUSTOMER_SERVICE: { code: "CSR", nameAr: "خدمة العملاء", nameEn: "Customer Service", icon: "support_agent" },
      FINANCE: { code: "FIN", nameAr: "المالية", nameEn: "Finance", icon: "attach_money" },
      HR: { code: "HUM", nameAr: "الموارد البشرية", nameEn: "Human Resources", icon: "people" },
      OPERATIONS: { code: "OPS", nameAr: "العمليات", nameEn: "Operations", icon: "settings" },
      PURCHASING: { code: "PUR", nameAr: "المشتريات", nameEn: "Purchasing", icon: "shopping_bag" },
      QUALITY: { code: "QAC", nameAr: "مراقبة الجودة", nameEn: "Quality Control", icon: "verified" },
      WAREHOUSE: { code: "WAR", nameAr: "المستودعات", nameEn: "Warehouse", icon: "store" },
      LOGISTICS: { code: "LOG", nameAr: "اللوجستيات", nameEn: "Logistics", icon: "route" },
      ANALYTICS: { code: "ANL", nameAr: "التحليلات", nameEn: "Analytics", icon: "analytics" },
      IT: { code: "TEC", nameAr: "تقنية المعلومات", nameEn: "Information Technology", icon: "computer" }
    },
    
    /**
     * Dashboard Registry — 15 Dashboards with permissions
     */
    DASHBOARDS: {
      CEO: { id: "DB_CEO", nameAr: "رئيس التنفيذي", nameEn: "CEO Dashboard", depts: ["CEO"], perms: ["admin"] },
      MANAGEMENT: { id: "DB_MGT", nameAr: "الإدارة", nameEn: "Management", depts: ["CEO","EXE"], perms: ["reports:read","kpi:read"] },
      OPERATIONS: { id: "DB_OPS", nameAr: "العمليات", nameEn: "Operations", depts: ["OPS","PRO","WAR","LOG"], perms: ["tasks:read","inventory:read"] },
      INVENTORY_DB: { id: "DB_INV", nameAr: "المخزون", nameEn: "Inventory", depts: ["INV","WAR","SUP"], perms: ["inventory:read"] },
      FINANCE_DB: { id: "DB_FIN", nameAr: "المالية", nameEn: "Finance", depts: ["FIN"], perms: ["finance:read"] },
      MARKETING_DB: { id: "DB_MKT", nameAr: "التسويق", nameEn: "Marketing", depts: ["MKT","BRD","CNT","SOC","ADV"], perms: ["reports:read","kpi:read"] },
      SALES: { id: "DB_SAL", nameAr: "المبيعات", nameEn: "Sales", depts: ["ECM","CSR"], perms: ["orders:read"] },
      CUSTOMER_SERVICE_DB: { id: "DB_CSR", nameAr: "خدمة العملاء", nameEn: "Customer Service", depts: ["CSR"], perms: ["orders:read","members:read"] },
      ECOMMERCE_DB: { id: "DB_ECM", nameAr: "التجارة الإلكترونية", nameEn: "E-Commerce", depts: ["ECM"], perms: ["orders:read","inventory:read"] },
      PRODUCTION_DB: { id: "DB_PRO", nameAr: "الإنتاج", nameEn: "Production", depts: ["PRO","QAC"], perms: ["inventory:read"] },
      SUPPLY_CHAIN_DB: { id: "DB_SUP", nameAr: "سلسلة الإمداد", nameEn: "Supply Chain", depts: ["SUP","PUR"], perms: ["suppliers:read","inventory:read"] },
      FOUNDER: { id: "DB_FND", nameAr: "المؤسس", nameEn: "Founder", depts: ["CEO"], perms: ["admin","finance:read"] },
      PROFIT: { id: "DB_PRF", nameAr: "توزيع الأرباح", nameEn: "Profit Distribution", depts: ["CEO","FIN"], perms: ["finance:read"] },
      EXECUTIVE_SUMMARY: { id: "DB_EXE", nameAr: "ملخص تنفيذي", nameEn: "Executive Summary", depts: ["CEO","EXE"], perms: ["reports:read"] },
      ANALYTICS_DB: { id: "DB_ANL", nameAr: "التحليلات", nameEn: "Analytics", depts: ["ANL","CEO"], perms: ["reports:read","kpi:read"] }
    },
    
    /**
     * KPI Library Templates — Enterprise KPI Definitions
     */
    KPI_LIBRARY: {
      // CEO & Executive
      REVENUE_GROWTH: { id: "KPI_REV_GROWTH", nameAr: "نمو الإيرادات", nameEn: "Revenue Growth", dept: "CEO", weight: 25, target: 30, min: 0, max: 100, unit: "%", formula: "((current-previous)/previous)*100", priority: "HIGH", benchmark: "industry" },
      NET_PROFIT_MARGIN: { id: "KPI_NPM", nameAr: "هامش الربح الصافي", nameEn: "Net Profit Margin", dept: "CEO", weight: 25, target: 20, min: 5, max: 50, unit: "%", formula: "(net_profit/revenue)*100", priority: "HIGH", benchmark: "industry" },
      ROI: { id: "KPI_ROI", nameAr: "العائد على الاستثمار", nameEn: "ROI", dept: "CEO", weight: 20, target: 25, min: 0, max: 100, unit: "%", formula: "((gain-cost)/cost)*100", priority: "HIGH", benchmark: "industry" },
      CASH_FLOW: { id: "KPI_CASH", nameAr: "التدفق النقدي", nameEn: "Cash Flow", dept: "FIN", weight: 20, target: 100000, min: 0, max: 1000000, unit: "EGP", formula: "inflow-outflow", priority: "CRITICAL", benchmark: "historical" },
      CUSTOMER_SATISFACTION: { id: "KPI_CSAT", nameAr: "رضا العملاء", nameEn: "Customer Satisfaction", dept: "CSR", weight: 15, target: 90, min: 0, max: 100, unit: "%", formula: "satisfied/total*100", priority: "HIGH", benchmark: "industry" },
      
      // Marketing
      CONVERSION_RATE: { id: "KPI_CONV", nameAr: "معدل التحويل", nameEn: "Conversion Rate", dept: "MKT", weight: 30, target: 5, min: 0, max: 20, unit: "%", formula: "conversions/visits*100", priority: "HIGH", benchmark: "industry" },
      CAC: { id: "KPI_CAC", nameAr: "تكلفة اكتساب العميل", nameEn: "Customer Acquisition Cost", dept: "MKT", weight: 25, target: 50, min: 0, max: 500, unit: "EGP", formula: "marketing_spend/new_customers", priority: "HIGH", benchmark: "industry" },
      BRAND_AWARENESS: { id: "KPI_BRAND", nameAr: "الوعي بالعلامة", nameEn: "Brand Awareness", dept: "BRD", weight: 20, target: 70, min: 0, max: 100, unit: "%", formula: "aware/total*100", priority: "MEDIUM", benchmark: "industry" },
      SOCIAL_ENGAGEMENT: { id: "KPI_SOCENG", nameAr: "التفاعل الاجتماعي", nameEn: "Social Engagement", dept: "SOC", weight: 25, target: 8, min: 0, max: 20, unit: "%", formula: "(likes+comments+shares)/reach*100", priority: "MEDIUM", benchmark: "industry" },
      
      // Inventory & Supply
      INVENTORY_TURNOVER: { id: "KPI_TURNOVER", nameAr: "دورة المخزون", nameEn: "Inventory Turnover", dept: "INV", weight: 30, target: 12, min: 0, max: 50, unit: "x", formula: "cogs/average_inventory", priority: "HIGH", benchmark: "industry" },
      STOCKOUT_RATE: { id: "KPI_STOCKOUT", nameAr: "معدل النفاد", nameEn: "Stockout Rate", dept: "INV", weight: 25, target: 2, min: 0, max: 20, unit: "%", formula: "stockouts/total_skus*100", priority: "CRITICAL", benchmark: "industry" },
      LEAD_TIME: { id: "KPI_LEAD", nameAr: "وقت التوريد", nameEn: "Lead Time", dept: "SUP", weight: 25, target: 7, min: 1, max: 60, unit: "days", formula: "delivery_date-order_date", priority: "HIGH", benchmark: "historical" },
      SUPPLIER_QUALITY: { id: "KPI_SUPQ", nameAr: "جودة الموردين", nameEn: "Supplier Quality", dept: "QAC", weight: 20, target: 95, min: 0, max: 100, unit: "%", formula: "accepted_items/total_items*100", priority: "HIGH", benchmark: "industry" },
      
      // Operations
      OEE: { id: "KPI_OEE", nameAr: "الكفاءة الإجمالية", nameEn: "Overall Equipment Effectiveness", dept: "PRO", weight: 30, target: 85, min: 0, max: 100, unit: "%", formula: "availability*performance*quality", priority: "HIGH", benchmark: "industry" },
      THROUGHPUT: { id: "KPI_THROUGHPUT", nameAr: "معدل الإنتاج", nameEn: "Throughput", dept: "PRO", weight: 25, target: 500, min: 0, max: 5000, unit: "units/day", formula: "total_output/operating_hours", priority: "HIGH", benchmark: "historical" },
      ORDER_CYCLE_TIME: { id: "KPI_CYCLE", nameAr: "وقت دورة الطلب", nameEn: "Order Cycle Time", dept: "OPS", weight: 25, target: 3, min: 0, max: 14, unit: "days", formula: "delivery_date-order_date", priority: "HIGH", benchmark: "industry" },
      ON_TIME_DELIVERY: { id: "KPI_OTD", nameAr: "التوصيل في الموعد", nameEn: "On-Time Delivery", dept: "LOG", weight: 20, target: 95, min: 0, max: 100, unit: "%", formula: "on_time_deliveries/total*100", priority: "CRITICAL", benchmark: "industry" },
      
      // E-Commerce
      AOV: { id: "KPI_AOV", nameAr: "متوسط قيمة الطلب", nameEn: "Average Order Value", dept: "ECM", weight: 25, target: 800, min: 0, max: 5000, unit: "EGP", formula: "revenue/orders", priority: "HIGH", benchmark: "historical" },
      CART_ABANDONMENT: { id: "KPI_CART", nameAr: "معدل التخلي", nameEn: "Cart Abandonment Rate", dept: "ECM", weight: 25, target: 60, min: 0, max: 100, unit: "%", formula: "abandoned/initiated*100", priority: "MEDIUM", benchmark: "industry" },
      RETURN_RATE: { id: "KPI_RETURN", nameAr: "معدل الإرجاع", nameEn: "Return Rate", dept: "ECM", weight: 25, target: 5, min: 0, max: 30, unit: "%", formula: "returned/delivered*100", priority: "HIGH", benchmark: "industry" },
      NPS: { id: "KPI_NPS", nameAr: "صافي الترويج", nameEn: "Net Promoter Score", dept: "CSR", weight: 25, target: 50, min: -100, max: 100, unit: "score", formula: "promoters-detractors", priority: "HIGH", benchmark: "industry" },
      
      // HR
      EMPLOYEE_TURNOVER: { id: "KPI_TURNOVER_HR", nameAr: "معدل دوران الموظفين", nameEn: "Employee Turnover", dept: "HUM", weight: 30, target: 10, min: 0, max: 50, unit: "%", formula: "left/total*100", priority: "MEDIUM", benchmark: "industry" },
      TRAINING_HOURS: { id: "KPI_TRAIN", nameAr: "ساعات التدريب", nameEn: "Training Hours", dept: "HUM", weight: 20, target: 40, min: 0, max: 200, unit: "hours/employee", formula: "total_hours/employees", priority: "MEDIUM", benchmark: "industry" },
      PRODUCTIVITY_PER_EMPLOYEE: { id: "KPI_PROD_EMP", nameAr: "إنتاجية الموظف", nameEn: "Productivity per Employee", dept: "HUM", weight: 25, target: 50000, min: 0, max: 200000, unit: "EGP", formula: "revenue/employees", priority: "HIGH", benchmark: "historical" },
      ABSENTEEISM: { id: "KPI_ABSENT", nameAr: "معدل الغياب", nameEn: "Absenteeism Rate", dept: "HUM", weight: 25, target: 3, min: 0, max: 20, unit: "%", formula: "absent_days/total_work_days*100", priority: "MEDIUM", benchmark: "industry" }
    },
    
    /**
     * Security Levels
     */
    SECURITY: {
      LEVELS: { PUBLIC: 0, MEMBER: 1, MANAGER: 2, ADMIN: 3, SUPER: 4 },
      PASSWORD_MIN_LENGTH: 8,
      MAX_LOGIN_ATTEMPTS: 5,
      LOCKOUT_DURATION_MINUTES: 30,
      SESSION_TIMEOUT_HOURS: 12,
      RATE_LIMIT_REQUESTS: 100,
      RATE_LIMIT_WINDOW_MINUTES: 1,
      BACKUP_RETENTION_DAYS: 90,
      AUDIT_RETENTION_MONTHS: 24
    },
    
    /**
     * Profit Distribution
     */
    PROFIT: {
      FOUNDRY_SHARE_DEFAULT: 0.60,
      INVESTOR_SHARE_DEFAULT: 0.30,
      RESERVE_SHARE_DEFAULT: 0.10,
      VESTING_YEARS: 4,
      CLIFF_MONTHS: 12,
      MIN_WITHDRAWAL: 10000,
      DISTRIBUTION_FREQUENCY: "quarterly",
      VALUATION_METHOD: "DCF"
    },
    
    /**
     * Localization
     */
    I18N: {
      DEFAULT_LANG: "ar",
      SUPPORTED_LANGS: ["ar", "en"],
      RTL_LANGS: ["ar"],
      DATE_FORMATS: { ar: "dd/MM/yyyy", en: "MM/dd/yyyy" },
      NUMBER_FORMATS: { ar: "ar-EG", en: "en-US" },
      CURRENCY_POSITION: { ar: "after", en: "before" }
    },
    
    /**
     * Analytics & Forecasting
     */
    ANALYTICS: {
      FORECAST_PERIODS: 12,
      CONFIDENCE_LEVEL: 0.95,
      SEASONALITY_WINDOW: 12,
      ANOMALY_THRESHOLD: 2.5,
      TREND_MIN_POINTS: 6,
      RECOMMENDATION_ENGINE: true
    },
    
    /**
     * Report Templates
     */
    REPORTS: {
      DAILY: { format: "PDF", autoEmail: false, recipients: [] },
      WEEKLY: { format: "PDF", autoEmail: true, recipients: ["management"] },
      MONTHLY: { format: "EXCEL", autoEmail: true, recipients: ["management","finance"] },
      QUARTERLY: { format: "PDF", autoEmail: true, recipients: ["all"] },
      YEARLY: { format: "EXCEL", autoEmail: true, recipients: ["all","founder"] }
    },
    
    /**
     * UI Configuration
     */
    UI: {
      THEME: "material",
      PRIMARY_COLOR: "#111111",
      SECONDARY_COLOR: "#FFFFFF",
      ACCENT_COLOR: "#4285F4",
      SUCCESS_COLOR: "#34A853",
      WARNING_COLOR: "#FBBC05",
      DANGER_COLOR: "#EA4335",
      DARK_BACKGROUND: "#121212",
      DARK_SURFACE: "#1E1E1E",
      DARK_TEXT: "#E0E0E0",
      CARD_RADIUS: 12,
      TABLE_DENSE: false,
      ANIMATIONS: true,
      TOAST_DURATION: 4000
    }
    
  };
  
  /**
   * Quick Access Helpers
   */
  function getEnterprise(){ return ENTERPRISE; }
  function getFeature(flag){ return ENTERPRISE.FEATURES[flag] || false; }
  function getDepartment(code){ return ENTERPRISE.DEPARTMENTS[code] || null; }
  function getDashboardConfig(id){ return Object.values(ENTERPRISE.DASHBOARDS).find(d=>d.id===id) || null; }
  function getKPITemplate(kpiId){ return ENTERPRISE.KPI_LIBRARY[kpiId] || null; }
  function getDeptKPIs(deptCode){ return Object.values(ENTERPRISE.KPI_LIBRARY).filter(k=>k.dept===deptCode); }
  function isRTL(lang){ return ENTERPRISE.I18N.RTL_LANGS.includes(lang || ENTERPRISE.I18N.DEFAULT_LANG); }