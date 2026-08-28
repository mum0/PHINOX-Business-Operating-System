# PHINOX BOS — Business Operating System

&gt; **Version:** v5-enterprise  
&gt; **Platform:** Google Apps Script (GAS) + Google Workspace  
&gt; **License:** MIT

---

## 🎯 نظرة عامة

**PHINOX BOS** هو نظام تشغيل أعمال مدمج بالكامل داخل Google Workspace، مصمم لإدارة:

- 📦 **المخزون** (Inventory + BOM + Stock Movements)
- 📋 **المهام** (Tasks + Approvals)
- 👥 **الأعضاء والصلاحيات** (Members + RBAC)
- 📊 **المالية** (Finance + P&L + Expenses)
- 🛒 **المبيعات والطلبات** (Sales + Orders)
- 📈 **التسويق ووسائل التواصل** (Marketing + Social Media)
- 🎯 **مؤشرات الأداء** (KPIs)
- 😊 **رضا العملاء** (Satisfaction + NPS)

### لمن هذا النظام؟
الشركات الصغيرة والمتوسطة التي تعتمد على Google Workspace وتريد نظام ERP مخصصًا قابلًا للتطوير.

---

## 📋 المتطلبات

| المتطلب | الإصدار/الملاحظة |
|---------|------------------|
| Google Workspace | حساب Google Workspace (Business/Enterprise) |
| Node.js | v18+ (لتشغيل clasp) |
| clasp | `npm install -g @google/clasp` |
| Google Sheets | جدول بيانات نشط كقاعدة البيانات |

---

## 🚀 خطوات التثبيت

### 1. نسخ المستودع
```bash
git clone https://github.com/mum0/PHINOX-Business-Operating-System.git
cd PHINOX-Business-Operating-System
2. إنشاء مشروع Apps Script جديد
bash
clasp login
clasp create --title "PHINOX BOS" --type sheets
3. نسخ إعدادات clasp
bash
cp .clasp.json.example .clasp.json
# عدّل scriptId في .clasp.json بالقيمة من مشروعك
4. رفع الملفات
bash
clasp push
5. تشغيل الإعداد
في محرر Apps Script، شغّل دالة Setup.init() لإنشاء الأوراق والبيانات الافتراضية.
🗂️ بنية المجلدات
plain
PHINOX-Business-Operating-System/
├── 00_*.gs              # الطبقة الأساسية (Core)
├── 01_–09_*.gs          # البنية التحتية (Utils, ErrorHandler, Logger, Validator, EventBus, Cache, Security)
├── 10_–12_*.gs          # الإعداد والقوائم والمحفزات
├── 13_–15_*.gs          # الصلاحيات والأعضاء
├── 17_–67_*.gs          # الوحدات الوظيفية (Tasks, Inventory, Sales, Finance, Marketing, Customers)
├── 68_*.gs              # اختبارات الوحدة (TestRunner)
├── 69_–73_*.gs          # قائمة المواد (BOM)
├── UI_Index.html        # الواجهة الأمامية
├── UI_Server.gs         # واجهة الخادم (APIs)
├── doGet.gs             # نقطة دخول Web App
└── appsscript.json      # إعدادات المشروع
الطبقات المعمارية
Table
الطبقة	البادئة	الوصف
Core	00_	البنية التحتية المشتركة
Infrastructure	01_–09_	الأدوات، الأخطاء، السجل، التحقق
Setup	10_–12_	الإعداد والقوائم والمحفزات
Security	13_–15_	الصلاحيات والأعضاء
Domain Modules	17_–67_	الوحدات الوظيفية
BOM	69_–73_	قائمة المواد
Testing	68_	اختبارات الوحدة
UI	UI_*	الواجهة الأمامية
🧪 كيفية تشغيل الاختبارات
افتح Google Sheets المرتبط بالمشروع.
اذهب إلى Extensions → Apps Script.
شغّل دالة TestRunner.runAll() من محرر Apps Script.
أو من القائمة المخصصة: PHINOX → Run Tests.
🔗 روابط مفيدة
Google Apps Script Documentation
clasp CLI Reference
Apps Script Best Practices
🤝 المساهمة
نرحب بالمساهمات! يرجى:
عمل Fork للمستودع
إنشاء فرع جديد: git checkout -b feature/your-feature
إرسال Pull Request
© 2026 PHINOX. جميع الحقوق محفوظة.
plain


##  `.clasp.json.example`

```json
{
  "scriptId": "YOUR_SCRIPT_ID_HERE",
  "rootDir": "."
}
📝 JSDoc لـ UI_Server.js
ملاحظة: UI_Server.js يحتوي على 75 دالة عامة مقسمة إلى 12 مجموعة. فيما يلي نموذج JSDoc كامل للدوال العامة (يمكن نسخ النمط لبقية الدوال):
JavaScript
// ═══════════════════════════════════════════════════════════════════════
// PHINOX BOS v5 — UI Server (Google Apps Script)
// ═══════════════════════════════════════════════════════════════════════
// @file        UI_Server.gs
// @version     5.0
// @description واجهة خادم الويب لـ PHINOX BOS. تتضمن APIs للواجهة الأمامية.
// @author      PHINOX Team
// @date        2026-08-27
// ═══════════════════════════════════════════════════════════════════════

// ─── PERMISSIONS ───
if (typeof PERMISSIONS === "undefined" || !PERMISSIONS) var PERMISSIONS = {};
(function() {
  var extras = {
    DASHBOARD_READ: "dashboard:read",
    INVENTORY_BOM_READ: "inventory:bom_read",
    INVENTORY_BOM_MANAGE: "inventory:bom_manage",
    CUSTOMERS_READ: "customers:read",
    CUSTOMERS_WRITE: "customers:write",
    ORDERS_READ: "orders:read",
    ORDERS_WRITE: "orders:write",
    SALES_READ: "sales:read",
    SALES_WRITE: "sales:write",
    MARKETING_READ: "marketing:read",
    MARKETING_WRITE: "marketing:write",
    SOCIAL_READ: "social:read",
    SOCIAL_WRITE: "social:write",
    SATISFACTION_READ: "satisfaction:read",
    SATISFACTION_WRITE: "satisfaction:write",
    NPS_READ: "nps:read",
    NPS_WRITE: "nps:write",
    PERFORMANCE_READ: "performance:read",
    TASKS_APPROVE: "tasks:approve",
    EXPENSE_POST: "expenses:post"
  };
  for (var k in extras) { if (!PERMISSIONS[k]) PERMISSIONS[k] = extras[k]; }
})();

// ─── AUTH HELPERS ───

/**
 * يتحقق من صلاحية المستخدم للوصول إلى مورد محمي.
 * @param {string} permission - اسم الصلاحية المطلوبة (مثلاً: PERMISSIONS.KPI_READ)
 * @returns {Array|Object} بيانات العضو الحالي
 * @throws {Error} إذا لم يكن المستخدم مسجلاً أو ليست لديه الصلاحية
 * @private
 */
function _requireAuth(permission) { ... }

/**
 * يعقم المدخلات النصية لمنع هجمات XSS و CSV Injection.
 * @param {*} value - القيمة المراد تعقيمها
 * @returns {string} النص المعقم
 * @private
 */
function _sanitizeInput(value) { ... }

/**
 * يتحقق من صحة المعرّف (ID) ويعقمه.
 * @param {*} value - المعرّف المراد فحصه
 * @returns {string|null} المعرّف الصالح أو null
 * @private
 */
function _sanitizeId(value) { ... }

/**
 * يتحقق من صحة البريد الإلكتروني ويعقمه.
 * @param {*} value - البريد المراد فحصه
 * @returns {string|null} البريد الصالح بأحرف صغيرة أو null
 * @private
 */
function _sanitizeEmail(value) { ... }

/**
 * يتحقق من معدل الطلبات (Rate Limiting).
 * @param {string} [action="ui_api"] - اسم الإجراء
 * @throws {Error} إذا تم تجاوز الحد المسموح
 * @private
 */
function _checkRateLimit(action) { ... }

/**
 * يسجل حدثاً في سجل التدقيق.
 * @param {string} action - اسم الإجراء
 * @param {string} target - الهدف
 * @param {Object} details - التفاصيل
 * @param {string} [status="SUCCESS"] - الحالة
 * @private
 */
function _auditLog(action, target, details, status) { ... }

// ============================================================
// USER AUTH API
// ============================================================

/**
 * يحصل على بيانات المستخدم الحالي من الجلسة.
 * @returns {Object} {email, role, member, ts}
 * @returns {Object.email} {string} بريد المستخدم
 * @returns {Object.role} {string} الدور (GUEST, Admin, CEO, إلخ)
 * @returns {Object.member} {Object|null} بيانات العضو
 * @returns {Object.ts} {string} الطابع الزمني ISO
 */
function uiGetCurrentUser() { ... }

// ============================================================
// KPI APIs
// ============================================================

/**
 * يحصل على مؤشرات لوحة التحكم.
 * @returns {Object} {success: boolean, data: Object} أو {success: false, error: string}
 * @throws {Error} يتم التقاطه داخلياً وإرجاعه كـ {success: false}
 */
function uiGetDashboardKpis() { ... }

/**
 * يحصل على تاريخ مؤشر KPI محدد.
 * @param {string} kpiId - معرّف المؤشر
 * @param {number} [limit=12] - عدد السجلات
 * @returns {Object} {success: boolean, data: Array}
 */
function uiGetKpiHistory(kpiId, limit) { ... }

/**
 * يحسب مؤشرات فئة محددة.
 * @param {string} category - اسم الفئة
 * @param {string} periodType - نوع الفترة (MONTHLY, QUARTERLY, YEARLY)
 * @param {string} refDate - التاريخ المرجعي
 * @returns {Object} {success: boolean, data: Object}
 */
function uiCalculateCategory(category, periodType, refDate) { ... }

/**
 * يحسب جميع المؤشرات.
 * @param {string} periodType - نوع الفترة
 * @param {string} refDate - التاريخ المرجعي
 * @returns {Object} {success: boolean, data: Object}
 */
function uiCalculateAll(periodType, refDate) { ... }

// ============================================================
// CUSTOMER APIs
// ============================================================

/**
 * يحصل على قائمة العملاء.
 * @param {Object} [options] - خيارات الاستعلام
 * @param {number} [options.limit=1000] - الحد الأقصى
 * @returns {Object} {success: boolean, data: Array}
 */
function uiGetCustomers(options) { ... }

/**
 * يحصل على عميل محدد.
 * @param {string} id - معرّف العميل
 * @returns {Object} {success: boolean, data: Object}
 * @throws {Error} إذا كان المعرّف غير صالح
 */
function uiGetCustomer(id) { ... }

/**
 * يحصل إحصائيات العملاء.
 * @returns {Object} {success: boolean, data: Object}
 */
function uiGetCustomerStats() { ... }

/**
 * ينشئ عميلاً جديداً.
 * @param {Object} data - بيانات العميل {name, email, phone, notes}
 * @returns {Object} {success: boolean, id: string}
 * @throws {Error} إذا فشلت الصلاحيات أو التحقق
 */
function uiCreateCustomer(data) { ... }

/**
 * يحدّث بيانات عميل.
 * @param {string} id - معرّف العميل
 * @param {Object} data - البيانات الجديدة
 * @returns {Object} {success: boolean, data: Object}
 */
function uiUpdateCustomer(id, data) { ... }

/**
 * يحذف عميلاً.
 * @param {string} id - معرّف العميل
 * @returns {Object} {success: boolean}
 */
function uiDeleteCustomer(id) { ... }

/**
 * يزامن العملاء من الطلبات.
 * @returns {Object} {success: boolean, data: Array}
 */
function uiSyncCustomers() { ... }

// ... (نفس النمط لبقية الدوال: Satisfaction, NPS, Tasks, Members, Sales, Orders, Finance, Inventory, BOM, Expenses, Marketing, Social, KPI Extended)

// ============================================================
// LAUNCH UI
// ============================================================

/**
 * يعرض لوحة تحكم PHINOX كنافذة منبثقة (Modal).
 * @returns {HtmlOutput} كائن HtmlService
 */
function showPhinoxDashboard() { ... }

/**
 * يعرض لوحة تحكم PHINOX في الشريط الجانبي.
 * @returns {HtmlOutput} كائن HtmlService
 */
function showPhinoxDashboardSidebar() { ... }

/**
 * معالج داخلي لطلبات GET.
 * @param {Object} e - كائن الحدث من Apps Script
 * @returns {HtmlOutput} صفحة HTML
 * @private
 */
function _handleDoGetInternal(e) { ... }
