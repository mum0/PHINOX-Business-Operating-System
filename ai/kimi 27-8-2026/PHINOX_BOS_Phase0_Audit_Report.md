# 📋 تقرير المرحلة 0 — التحضير والتدقيق
## PHINOX BOS v5 Enterprise
**التاريخ:** 2026-08-27  
**الفرع:** `v5-enterprise`  
**المستودع:** https://github.com/mum0/PHINOX-Business-Operating-System

---

## ⚠️ ملاحظة تقنية
> **لم يتم تنفيذ ما يلي لعدم توفر الوصول المباشر:**
> - `clasp pull` (يتطلب مصادقة Google)
> - التصدير إلى Google Drive
> - إنشاء نسخة `.zip` محلية
> 
> **تم إنجاز كل ما يلي عبر تحليل الكود مباشرة من GitHub.**

---

## 1. قائمة المخاطر المُرقَّمة (1–10)

| # | المخاطر | التأثير | الاحتمالية | الخطورة | التفاصيل |
|---|---------|---------|------------|---------|----------|
| 1 | **تكرار doGet** — `doGet` معرّفة في `UI_Server.js` و`doGet.js` | 🔴 عالٍ | مؤكد | **حرج** | تكرار تعريف دالة `doGet` يسبب تعارضاً في Web App entry point |
| 2 | **تغيير الدور الذاتي** — `menuSetRole()` في `11_Menu.js` يسمح لأي مستخدم بتغيير دوره | 🔴 عالٍ | عالٍ | **حرج** | أي مستخدم يمكنه ترقية نفسه إلى CEO/Admin من القائمة |
| 3 | **نظامان RBAC متعارضان** — `09_Security.js` (UserProperties) و`13_Permissions.js` (Members Sheet) | 🟠 متوسط | مؤكد | **عالٍ** | تناقض في مصدر الحقيقة للأدوار |
| 4 | **غياب التحقق من الصلاحيات** — دوال `doGet` في `UI_Server.js` لا تتحقق من `requirePermission` | 🟠 متوسط | عالٍ | **عالٍ** | الدوال المُعرَّضة للعميل لا تتحقق من الصلاحيات بشكل كامل |
| 5 | **أرقام ملفات متضاربة** — `27_`, `29_`, `30_`, `32_` مكررة | 🟡 منخفض | مؤكد | **متوسط** | يؤدي إلى ترتيب غير صحيح في Apps Script IDE |
| 6 | **حجم UI_Index.html كبير** — 110 KB في ملف واحد | 🟡 منخفض | مؤكد | **متوسط** | يتجاوز حد Google Apps Script للملفات الكبيرة ويؤثر على الأداء |
| 7 | **عدم وجود rate limiting** — `google.script.run` لا يحتوي على حد للاستدعاءات | 🟠 متوسط | عالٍ | **متوسط** | 40 استدعاء ممكنة في جلسة واحدة |
| 8 | **غياب التحقق من المدخلات** — `callServer` يرسل بيانات المستخدم مباشرة بدون تطهير | 🟠 متوسط | عالٍ | **متوسط** | XSS وInjection ممكنة |
| 9 | **عمليات KPI طويلة** — `uiCalculateAll` و`uiGetKPIs` تحسب كل شيء في الوقت الفعلي | 🟡 منخفض | متوسط | **متوسط** | قد تتجاوز 280 ثانية مع بيانات كثيرة |
| 10 | **غياب التحقق من تكرار Admin/CEO** — فقط في الواجهة (client-side) | 🟠 متوسط | منخفض | **متوسط** | التحقق في `submitAddMember` client-side فقط، يمكن تجاوزه |

---

## 2. جدول دوال `doGet` المُعرَّضة

### A. من `UI_Server.js` (الدوال المُعرَّضة للعميل)

| # | الدالة | النوع | كتابة إلى Sheets | حساسة | ملاحظات |
|---|--------|-------|-------------------|-------|---------|
| 1 | `uiGetCurrentUser` | قراءة | ❌ | نعم | يستدعي `getCurrentMember()` |
| 2 | `uiGetDashboardKpis` | قراءة/حساب | ❌ | نعم | يحسب إجماليات |
| 3 | `uiGetKpiHistory` | قراءة | ❌ | لا | تاريخ KPI |
| 4 | `uiCalculateCategory` | قراءة/حساب | ❌ | لا | حسابات فئة |
| 5 | `uiCalculateAll` | قراءة/حساب | ❌ | نعم | **قد تكون طويلة** |
| 6 | `uiGetCustomers` | قراءة | ❌ | لا | قائمة العملاء |
| 7 | `uiGetCustomer` | قراءة | ❌ | لا | عميل واحد |
| 8 | `uiGetCustomerStats` | قراءة/حساب | ❌ | لا | إحصائيات |
| 9 | `uiCreateCustomer` | كتابة | ✅ | نعم | إنشاء عميل |
| 10 | `uiUpdateCustomer` | كتابة | ✅ | نعم | تعديل عميل |
| 11 | `uiDeleteCustomer` | كتابة/حذف | ✅ | **نعم** | حذف ناعم |
| 12 | `uiSyncCustomers` | كتابة | ✅ | نعم | مزامنة من Orders |
| 13 | `uiGetSatisfactionRecords` | قراءة | ❌ | لا | رضا العملاء |
| 14 | `uiGetSatisfactionStats` | قراءة/حساب | ❌ | لا | إحصائيات |
| 15 | `uiCreateSatisfaction` | كتابة | ✅ | لا | إضافة تقييم |
| 16 | `uiGetNPSRecords` | قراءة | ❌ | لا | سجلات NPS |
| 17 | `uiGetNPSStats` | قراءة/حساب | ❌ | لا | إحصائيات NPS |
| 18 | `uiCreateNPS` | كتابة | ✅ | لا | إضافة NPS |
| 19 | `uiGetTasks` | قراءة | ❌ | لا | المهام |
| 20 | `uiGetTasksByDateRange` | قراءة | ❌ | لا | المهام حسب التاريخ |
| 21 | `uiGetTaskStats` | قراءة/حساب | ❌ | لا | إحصائيات |
| 22 | `uiCreateTask` | كتابة | ✅ | نعم | إنشاء مهمة |
| 23 | `uiUpdateTask` | كتابة | ✅ | نعم | تعديل مهمة |
| 24 | `uiDeleteTask` | كتابة/حذف | ✅ | **نعم** | حذف مهمة |
| 25 | `uiApproveTask` | كتابة | ✅ | **نعم** | اعتماد مهمة |
| 26 | `uiRejectTask` | كتابة | ✅ | **نعم** | رفض مهمة |
| 27 | `uiGetMembers` | قراءة | ❌ | نعم | قائمة الأعضاء |
| 28 | `uiGetMemberStats` | قراءة/حساب | ❌ | لا | إحصائيات |
| 29 | `uiAddMember` | كتابة | ✅ | **نعم** | إضافة عضو |
| 30 | `uiUpdateMember` | كتابة | ✅ | **نعم** | تعديل عضو |
| 31 | `uiDeleteMember` | كتابة/حذف | ✅ | **نعم** | حذف عضو |
| 32 | `uiGetSales` | قراءة | ❌ | لا | المبيعات |
| 33 | `uiGetSalesByDateRange` | قراءة | ❌ | لا | حسب التاريخ |
| 34 | `uiCreateSale` | كتابة | ✅ | نعم | تسجيل بيع |
| 35 | `uiGetOrders` | قراءة | ❌ | لا | الطلبات |
| 36 | `uiGetOrdersByDateRange` | قراءة | ❌ | لا | حسب التاريخ |
| 37 | `uiCreateOrder` | كتابة | ✅ | نعم | إنشاء طلب |
| 38 | `uiUpdateOrderStatus` | كتابة | ✅ | نعم | تعديل حالة |
| 39 | `uiGetFinanceStats` | قراءة/حساب | ❌ | نعم | إحصائيات مالية |
| 40 | `uiGetLedger` | قراءة | ❌ | نعم | دفتر الأستاذ |
| 41 | `uiGetInventory` | قراءة | ❌ | لا | المخزون |
| 42 | `uiGetInventoryStats` | قراءة/حساب | ❌ | لا | إحصائيات |
| 43 | `uiCreateInventoryItem` | كتابة | ✅ | نعم | إضافة صنف |
| 44 | `uiCreateInventory` | كتابة | ✅ | نعم | alias لـ 43 |
| 45 | `uiGetStockMovements` | قراءة | ❌ | لا | حركات المخزون |
| 46 | `uiAdjustStock` | كتابة | ✅ | **نعم** | تعديل كمية |
| 47 | `uiRestockStock` | كتابة | ✅ | **نعم** | إعادة تخزين |
| 48 | `uiGetBOM` | قراءة | ❌ | لا | BOM |
| 49 | `uiGetBOMItems` | قراءة | ❌ | لا | مكونات BOM |
| 50 | `uiCreateBOM` | كتابة | ✅ | نعم | إنشاء BOM |
| 51 | `uiUpdateBOM` | كتابة | ✅ | نعم | تعديل BOM |
| 52 | `uiDeleteBOM` | كتابة/حذف | ✅ | **نعم** | حذف BOM |
| 53 | `uiAddBOMItem` | كتابة | ✅ | نعم | إضافة مكون |
| 54 | `uiUpdateBOMItem` | كتابة | ✅ | نعم | تعديل مكون |
| 55 | `uiRemoveBOMItem` | كتابة/حذف | ✅ | نعم | إزالة مكون |
| 56 | `uiCalculateCost` | قراءة/حساب | ❌ | لا | حساب التكلفة |
| 57 | `uiCalculateMargin` | قراءة/حساب | ❌ | لا | حساب الهامش |
| 58 | `uiGetLowStock` | قراءة | ❌ | لا | منخفض المخزون |
| 59 | `uiGetOutOfStock` | قراءة | ❌ | لا | نفاد المخزون |
| 60 | `uiGetExpenses` | قراءة | ❌ | لا | المصروفات |
| 61 | `uiGetExpense` | قراءة | ❌ | لا | مصروف واحد |
| 62 | `uiCreateExpense` | كتابة | ✅ | نعم | إنشاء مصروف |
| 63 | `uiSubmitExpense` | كتابة | ✅ | نعم | تقديم مصروف |
| 64 | `uiApproveExpense` | كتابة | ✅ | **نعم** | اعتماد مصروف |
| 65 | `uiRejectExpense` | كتابة | ✅ | **نعم** | رفض مصروف |
| 66 | `uiPostExpense` | كتابة | ✅ | **نعم** | ترحيل للأستاذ |
| 67 | `uiDeleteExpense` | كتابة/حذف | ✅ | **نعم** | حذف مصروف |
| 68 | `uiGetMarketingRecords` | قراءة | ❌ | لا | تسويق |
| 69 | `uiGetMarketingStats` | قراءة/حساب | ❌ | لا | إحصائيات |
| 70 | `uiCreateMarketingRecord` | كتابة | ✅ | لا | إضافة تسويق |
| 71 | `uiGetSocialRecords` | قراءة | ❌ | لا | سوشيال |
| 72 | `uiGetSocialStats` | قراءة/حساب | ❌ | لا | إحصائيات |
| 73 | `uiCreateSocialRecord` | كتابة | ✅ | لا | إضافة سوشيال |
| 74 | `uiGetKPIs` | قراءة/حساب | ❌ | نعم | **قد تكون طويلة** |
| 75 | `showPhinoxDashboard` | UI | ❌ | لا | عرض Dashboard |
| 76 | `showPhinoxDashboardSidebar` | UI | ❌ | لا | Sidebar UI |
| 77 | `doGet` | Web App | ❌ | نعم | **Entry Point** |

### B. من `doGet.js` (تكرار!)

| # | الدالة | النوع | ملاحظات |
|---|--------|-------|---------|
| 78 | `doGet` | Web App | **تكرار** — يتعارض مع `UI_Server.js` |

**الخلاصة:**
- **إجمالي الدوال المُعرَّضة:** 78 دالة (77 فريدة + 1 مكررة)
- **دوال القراءة فقط:** 38 دالة
- **دوال الكتابة:** 30 دالة
- **دوال الحذف:** 9 دوال
- **الدوال الحساسة (كتابة/حذف):** 21 دالة

---

## 3. تقرير RBAC (نموذج الأدوار)

### 3.1 سلسلة الاستدعاء لـ `getUserRole`

```
┌─────────────────────────────────────────────────────────────────┐
│                    مصادران متعارضان للدور                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  المصدر 1: 09_Security.js (UserProperties)                     │
│  ─────────────────────────────────────────────                  │
│  Security.getUserRole()                                         │
│    → PropertiesService.getUserProperties()                      │
│    → getProperty('BOS_ROLE_' + email)                          │
│    → يُستخدم في: 11_Menu.js (menuSetRole)                     │
│                                                                 │
│  المصدر 2: 13_Permissions.js (Members Sheet)                   │
│  ─────────────────────────────────────────────                  │
│  getCurrentMember()                                             │
│    → Session.getActiveUser().getEmail()                        │
│    → قراءة مباشرة من Members Sheet                            │
│    → يُستخدم في: UI_Server.js (uiGetCurrentUser)              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 سلسلة الاستدعاء لـ `setUserRole`

```
┌─────────────────────────────────────────────────────────────────┐
│              من يستطيع تغيير الدور؟                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 09_Security.js → Security.setUserRole(email, role)        │
│     → تكتب إلى UserProperties                                  │
│     → لا تحتاج صلاحية admin!                                   │
│                                                                 │
│  2. 11_Menu.js → menuSetRole()                                 │
│     → يستدعي Security.setUserRole(Security.currentUser(), role)│
│     → أي مستخدم يستطيع تغيير دوره بنفسه!                     │
│     → ⚠️ خطر أمني حرج                                          │
│                                                                 │
│  3. 13_Permissions.js → assignRole(memberId, newRole, admin)  │
│     → تتحقق: requirePermission(admin, PERMISSIONS.ADMIN)      │
│     → يستدعي updateMember(memberId, {role: newRole})          │
│     → تكتب إلى Members Sheet                                   │
│     → ✅ آمنة — تحتاج صلاحية ADMIN                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 هل يستطيع أي مستخدم تغيير دوره بنفسه؟

| الطريقة | يمكنه تغيير دوره؟ | الآلية | الخطورة |
|---------|-------------------|--------|---------|
| من القائمة (`11_Menu.js`) | **نعم** | `menuSetRole()` → `Security.setUserRole()` | 🔴 حرج |
| من الواجهة (`UI_Index.html`) | **لا** | لا توجد دالة `uiSetUserRole` | ✅ آمن |
| من الكود (`13_Permissions.js`) | **لا** | `assignRole()` يتطلب `PERMISSIONS.ADMIN` | ✅ آمن |

**الخلاصة:**
- **القائمة (`11_Menu.js`)** تحتوي على ثغرة تسمح لأي مستخدم بتغيير دوره إلى أي دور (CEO/Admin/Partner)
- **الواجهة (`UI_Index.html`)** لا تحتوي على وظيفة تغيير الدور
- **نظام `13_Permissions.js`** آمن ويتطلب صلاحية ADMIN
- **التوصية:** إزالة `menuSetRole()` أو إضافة `requirePermission` عليها

---

## 4. جدول الأرقام المتضاربة

| الرقم | الملفات المتضاربة | الترتيب الفعلي في Apps Script | الاقتراح |
|-------|-------------------|-------------------------------|----------|
| **27** | `27_InventoryController.js` | 27 | ✅ احتفظ |
| **27** | `27_StockMovementSchema.js` | 28 | ⬆️ أعد تسمية إلى `28_` |
| **29** | `29_OrderSchema.js` | 29 | ✅ احتفظ |
| **29** | `29_StockMovementRepository.js` | 30 | ⬆️ أعد تسمية إلى `30_` |
| **30** | `30_OrderRepository.js` | 31 | ⬆️ أعد تسمية إلى `31_` |
| **30** | `30_StockMovementService.js` | 32 | ⬆️ أعد تسمية إلى `33_` |
| **32** | `32_OrderController.js` | 33 | ⬆️ أعد تسمية إلى `34_` |
| **32** | `32_StockMovementTest.js` | 34 | ⬆️ أعد تسمية إلى `35_` |

### الترتيب المقترح الجديد:

```
27_InventoryController.js
28_StockMovementSchema.js
29_OrderSchema.js
30_StockMovementRepository.js
31_OrderRepository.js
33_StockMovementService.js
34_OrderController.js
35_StockMovementTest.js
```

**ملاحظة:** الرقم `32` يُستخدم مرتين، والرقم `33` غير مستخدم حالياً.

---

## 5. ملخص الأداء

### 5.1 حجم الواجهة

| الملف | الحجم | التقييم |
|-------|-------|---------|
| `UI_Index.html` | **110,457 بايت (~108 KB)** | 🔴 كبير جداً |

> **حد Google Apps Script:** 50,000 بايت لكل ملف HTML.  
> **الحالة:** يتجاوز الحد بأكثر من الضعف.  
> **التأثير:** قد يسبب:
> - بطء في التحميل الأولي
> - تجاوز حدود الحصة (quota)
> - صعوبة في التخزين المؤقت

### 5.2 عدد استدعاءات `google.script.run` (عبر `callServer`)

| الفئة | العدد | أمثلة |
|-------|-------|-------|
| **إجمالي الاستدعاءات** | **40** | — |
| **دوال فريدة** | **39** | — |
| استدعاءات القراءة | 24 | `uiGetDashboardKpis`, `uiGetCustomers`, ... |
| استدعاءات الكتابة | 14 | `uiCreateExpense`, `uiRestockStock`, ... |
| استدعاءات الحذف | 2 | `uiDeleteExpense`, `uiDeleteTask` |

### 5.3 العمليات التي قد تتجاوز 280 ثانية

| # | العملية | الدالة | السبب | الخطورة |
|---|---------|--------|-------|---------|
| 1 | **حساب جميع KPIs** | `uiCalculateAll` | تكرار حسابات عبر كل الفئات | 🔴 عالٍ |
| 2 | **حساب KPI حسب الفترة** | `uiGetKPIs` | حسابات معقدة حسب monthly/quarterly/yearly | 🟠 متوسط |
| 3 | **مزامنة العملاء** | `uiSyncCustomers` | تكرار عبر كل الطلبات | 🟠 متوسط |
| 4 | **حفظ BOM** | `saveBOM` | سلسلة: `uiCreateBOM` + N × `uiAddBOMItem` | 🟠 متوسط |
| 5 | **تحميل Dashboard** | `loadDashboard` + `loadKPIs` | استدعاءان متزامنان | 🟡 منخفض |
| 6 | **تحميل Finance** | `uiGetFinanceStats` + `uiGetLedger` | استدعاءان متزامنان | 🟡 منخفض |

### 5.4 توصيات الأداء

1. **تقسيم `UI_Index.html`** إلى ملفات أصغر (مثلاً: `UI_Core.html`, `UI_Inventory.html`, `UI_Finance.html`)
2. **تجميع الاستدعاءات** — استخدام `Promise.all()` لتحميل البيانات المتوازية
3. **تخزين مؤقت للـ KPIs** — حسابها مرة واحدة يومياً وتخزينها في Properties
4. **تقسيم `saveBOM`** — استخدام دالة واحدة تقبل مصفوفة المكونات بدلاً من N استدعاء
5. **إضافة pagination** — `limit: 1000` قد يكون كبيراً مع بيانات كثيرة

---

## 6. ملخص تنفيذي

| البند | الحالة | الأولوية |
|-------|--------|----------|
| نسخة احتياطية | ⚠️ يدوية (غير ممكنة عبر clasp) | — |
| تدقيق أمني | ✅ مكتمل | — |
| تدقيق RBAC | ✅ مكتمل — **عثر على ثغرة حرجة** | 🔴 فوري |
| تدقيق الأرقام | ✅ مكتمل | 🟡 منخفض |
| تقييم الأداء | ✅ مكتمل | 🟠 متوسط |

### الإجراءات الفورية المقترحة:

1. **🔴 إصلاح `menuSetRole()`** — أضف `requirePermission` أو احذفها
2. **🔴 حل تكرار `doGet`** — احذف `doGet.js` أو ادمجه في `UI_Server.js`
3. **🟠 توحيد RBAC** — استخدم `getCurrentMember()` فقط ولا تعتمد على `UserProperties`
4. **🟠 إعادة تسمية الملفات المتضاربة**
5. **🟡 تقسيم `UI_Index.html`**

---

*نهاية التقرير — المرحلة 0*
