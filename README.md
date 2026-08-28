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