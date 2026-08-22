/**
 * ============================================================
 * PHINOX HTML Interface
 * Code.gs - API Layer for Web App
 * ============================================================
 */

/** فتح الواجهة */
function showInterface(){
  const html = HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('PHINOX Dashboard')
    .setWidth(1200)
    .setHeight(800);
  SpreadsheetApp.getUi().showModalDialog(html, 'PHINOX Business Operating System');
}

/** إضافة للقائمة */
function onOpen(){
  SpreadsheetApp.getUi()
    .createMenu('PHINOX')
    .addItem('🚀 Initialize System', 'initializeSystem')
    .addItem('🖥️ Open Dashboard', 'showInterface')
    .addItem('🔄 Refresh System', 'refreshSystem')
    .addSeparator()
    .addItem('⚡ Daily Trigger', 'createDailyTrigger')
    .addToUi();
}

/** بيانات لوحة التحكم */
function getDashboardData(){
  const orders = getOrders();
  const delivered = orders.filter(o => o[5] === 'Delivered');
  const revenue = delivered.reduce((sum,o)=>sum+(Number(o[7])||0),0);
  const expenses = getTransactions().filter(t=>t[2]==='Expense').reduce((sum,t)=>sum+(Number(t[5])||0),0);
  const pending = getTasks().filter(t=>t[6]==='Not Started').length;
  const active = getTasks().filter(t=>t[6]==='In Progress').length;
  const waiting = getTasks().filter(t=>t[6]==='Waiting Review').length;
  const cancelled = getTasks().filter(t=>t[6]==='Cancelled').length;
  const top = topPerformers(5);
  return {
    members: totalMembers(),
    completed: completedTasks(),
    late: getLateTasks().length,
    kpi: teamAverageKPI(),
    revenue: round(revenue,2),
    expense: round(expenses,2),
    pending: pending,
    active: active,
    waiting: waiting,
    cancelled: cancelled,
    topMembers: top
  };
}

/** بيانات المالية */
function getFinanceData(){
  const txns = getTransactions();
  const balance = txns.length > 0 ? Number(txns[txns.length-1][6])||0 : 0;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth()+1, 0);
  const income = totalIncome(monthStart, monthEnd);
  const expense = totalExpenses(monthStart, monthEnd);
  return {
    balance: balance,
    income: income,
    expense: expense,
    profit: round(income-expense,2),
    transactions: txns.slice(-50)
  };
}

/**
 * ============================================================
 * PHINOX Business Operating System (PBOS)
 * Config.gs
 * Global Configuration
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

    NOTIFICATIONS: "Notifications"

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

    BORDER: "#DADCE0"

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

// دمج الألوان الإضافية
APP.COLORS.PRIMARY_DARK = '#283593';
APP.COLORS.PRIMARY_LIGHT = '#e8eaf6';
APP.COLORS.PURPLE = '#4a148c';
APP.COLORS.PURPLE_LIGHT = '#7B1FA2';
APP.COLORS.GRAY_BG = '#f5f5f5';
APP.COLORS.GRAY_LIGHT = '#f8f9fa';
APP.COLORS.GRAY_BORDER = '#e0e0e0';
APP.COLORS.TEXT_MUTED = '#757575';
APP.COLORS.DARK_HEADER = '#37474f';

// إضافة الأوراق الجديدة إلى APP
APP.SHEETS.SALES = "Sales";
APP.SHEETS.EXPENSES = "Expenses";
APP.SHEETS.SHAREHOLDERS = "Shareholders";
