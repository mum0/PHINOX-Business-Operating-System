/**
 * ============================================================
 * PHINOX Business Operating System (PBOS)
 * Config.gs — Global Configuration
 * ============================================================
 */

const APP = {

  INFO: {
    NAME: "PHINOX Business Operating System",
    SHORT_NAME: "PBOS",
    VERSION: "1.0.0",
    BRAND: "PHINOX",
    TIMEZONE: "Africa/Cairo",
    DATE_FORMAT: "yyyy-MM-dd",
    CURRENCY: "EGP"
  },

  SHEETS: {
    DASHBOARD: "Dashboard",
    TASKS: "Tasks",
    MEMBERS: "Members",
    KPI: "KPI",
    REVIEWS: "Reviews",
    REPORTS: "Reports",
    SETTINGS: "Settings",
    AUDIT: "Audit Log",
    INVENTORY: "Inventory",
    SUPPLIERS: "Suppliers",
    ORDERS: "Orders",
    FINANCE: "Finance",
    NOTIFICATIONS: "Notifications",
    SALES: "Sales",
    EXPENSES: "Expenses",
    SHAREHOLDERS: "Shareholders"
  },

  ROLES: {
    CEO: "CEO",
    PARTNER: "Partner",
    DESIGNER: "Designer",
    MARKETING: "Marketing",
    OPERATIONS: "Operations",
    CUSTOMER_SERVICE: "Customer Service",
    FINANCE: "Finance"
  },

  TASK_STATUS: {
    NOT_STARTED: "Not Started",
    IN_PROGRESS: "In Progress",
    WAITING_REVIEW: "Waiting Review",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    BLOCKED: "Blocked",
    CANCELLED: "Cancelled"
  },

  PRIORITY: {
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
    URGENT: "Urgent"
  },

  DIFFICULTY: {
    EASY: "Easy",
    MEDIUM: "Medium",
    HARD: "Hard",
    CRITICAL: "Critical"
  },

  KPI_CATEGORY: {
    DESIGN: "Design",
    MARKETING: "Marketing",
    OPERATIONS: "Operations",
    SUPPLY: "Supply",
    FINANCE: "Finance",
    SALES: "Sales",
    CEO: "CEO"
  },

  KPI_WEIGHT: {
    QUALITY: 40,
    COMPLETION: 20,
    ON_TIME: 15,
    IMPACT: 15,
    EVIDENCE: 10
  },

  SCORE: {
    MAX: 100,
    PASS: 70,
    EXCELLENT: 95,
    VERY_GOOD: 85,
    GOOD: 70,
    NEEDS_IMPROVEMENT: 50
  },

  COLORS: {
    PRIMARY: "#111111",
    SECONDARY: "#FFFFFF",
    SUCCESS: "#34A853",
    WARNING: "#FBBC05",
    DANGER: "#EA4335",
    INFO: "#4285F4",
    HEADER: "#202124",
    BORDER: "#DADCE0",
    PRIMARY_DARK: "#283593",
    PRIMARY_LIGHT: "#e8eaf6",
    PURPLE: "#4a148c",
    PURPLE_LIGHT: "#7B1FA2",
    GRAY_BG: "#f5f5f5",
    GRAY_LIGHT: "#f8f9fa",
    GRAY_BORDER: "#e0e0e0",
    TEXT_MUTED: "#757575",
    DARK_HEADER: "#37474f"
  },

  TASK_WEIGHT: {
    PRIORITY: {
      Low: 0.8,
      Medium: 1,
      High: 1.2,
      Urgent: 1.5
    },
    DIFFICULTY: {
      Easy: 0.8,
      Medium: 1,
      Hard: 1.3,
      Critical: 1.6
    }
  },

  REVIEW: {
    AUTO_APPROVE: false,
    MAX_DAYS_LATE: 30,
    PENALTY_PER_DAY: 5
  },

  KPI_PROFILE: {
    Design: {
      QUALITY: 40,
      COMPLETION: 20,
      ON_TIME: 15,
      IMPACT: 15,
      EVIDENCE: 10
    },
    Marketing: {
      QUALITY: 20,
      COMPLETION: 20,
      ON_TIME: 15,
      IMPACT: 35,
      EVIDENCE: 10
    },
    Operations: {
      QUALITY: 15,
      COMPLETION: 30,
      ON_TIME: 30,
      IMPACT: 15,
      EVIDENCE: 10
    },
    Supply: {
      QUALITY: 30,
      COMPLETION: 20,
      ON_TIME: 25,
      IMPACT: 15,
      EVIDENCE: 10
    },
    Finance: {
      QUALITY: 35,
      COMPLETION: 25,
      ON_TIME: 20,
      IMPACT: 10,
      EVIDENCE: 10
    },
    Sales: {
      QUALITY: 20,
      COMPLETION: 20,
      ON_TIME: 20,
      IMPACT: 30,
      EVIDENCE: 10
    },
    CEO: {
      QUALITY: 25,
      COMPLETION: 10,
      ON_TIME: 20,
      IMPACT: 35,
      EVIDENCE: 10
    }
  }

};

/**
 * ============================================================
 * Mini ERP Integration
 * ============================================================
 */

const MINI_ERP = {
  SHEETS: {
    SALES: 'Sales',
    EXPENSES: 'Expenses',
    SHAREHOLDERS: 'Shareholders'
  },
  COLS: {
    SALES: { INVOICE: 0, DATE: 1, CUSTOMER: 2, DESCRIPTION: 3, AMOUNT: 4, PAYMENT: 5, NOTES: 6 },
    EXPENSES: { DATE: 0, TYPE: 1, SUPPLIER: 2, DESCRIPTION: 3, AMOUNT: 4, NOTES: 5 },
    SHAREHOLDERS: { NAME: 0, EMAIL: 1, SHARES: 2, OWNERSHIP: 3, INV_VALUE: 4, CURRENT_VALUE: 5, PROFIT: 6, LOSS: 7 }
  },
  SETTINGS_ROWS: {
    COMPANY_NAME: 2,
    CURRENCY: 3,
    SHARE_PRICE: 4,
    INITIAL_CAPITAL: 5
  },
  PAYMENT_METHODS: ['نقداً', 'بنك', 'تحويل', 'بطاقة', 'أخرى'],
  EXPENSE_TYPES: ['مشتريات', 'مصروف'],
  CURRENCIES: ['SAR', 'USD', 'EUR', 'AED', 'EGP'],
  SYMBOLS: {
    SAR: 'ر.س', USD: '$', EUR: '€', AED: 'د.إ', EGP: 'ج.م'
  }
};