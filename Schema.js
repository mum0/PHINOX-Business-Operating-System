/**
 * عرض الواجهة الرسومية
 */
function showDashboardUI(){
  const html = HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('PHINOX Dashboard')
    .setWidth(1400)
    .setHeight(900);
  SpreadsheetApp.getUi().showModalDialog(html, 'PHINOX Business Operating System');
}

/**
 * تضمين ملفات HTML
 */
function include(filename){
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * دوال مساعدة للواجهة
 */
function getDashboardCards(){
  return [
    {label:'الأعضاء', value:totalMembers(), class:''},
    {label:'المهام', value:totalTasks(), class:''},
    {label:'المنجزة', value:completedTasks(), class:'success'},
    {label:'المتأخرة', value:getLateTasks().length, class:'danger'},
    {label:'متوسط KPI', value:teamAverageKPI(), class:''},
    {label:'الإنتاجية', value:averageProductivity()+'%', class:'success'}
  ];
}

function getTasksSummary(){
  return [
    ['قيد الانتظار', pendingReviewCount()],
    ['قيد التنفيذ', activeTasks()],
    ['المنجزة', completedTasks()],
    ['المتأخرة', getLateTasks().length],
    ['متوسط الدرجة', averageTaskScore()]
  ];
}

/**
 * ============================================================
 * PHINOX Business Operating System (PBOS)
 * Schema.gs
 * Sheet Structure Definitions
 * ============================================================
 */

const SCHEMA = {

  Dashboard: [
    "Metric",
    "Value"
  ],

  Members: [
    "Member ID",
    "Full Name",
    "Role",
    "Email",
    "Phone",
    "Status",
    "Join Date",
    "KPI Score",
    "Tasks Completed",
    "Tasks Late",
    "Average Quality",
    "Notes"
  ],

  Tasks: [
    "Task ID",
    "Title",
    "Category",
    "Assigned To",
    "Priority",
    "Difficulty",
    "Status",
    "Start Date",
    "Due Date",
    "Completion %",
    "Quality",
    "Impact",
    "Evidence",
    "Reviewer",
    "Review Notes",
    "Task Score",
    "Task Weight",
    "Weighted Score",
    "Days Late",
    "Created At",
    "Updated At"
  ],

  KPI: [
    "Category",
    "Quality %",
    "Completion %",
    "On Time %",
    "Impact %",
    "Evidence %"
  ],

  Reviews: [
    "Review ID",
    "Task ID",
    "Reviewer",
    "Member",
    "Decision",
    "Score",
    "Comment",
    "Date"
  ],

  Reports: [
    "Report ID",
    "Period",
    "Date",
    "Total Members",
    "Total Tasks",
    "Completed",
    "Late",
    "Average Score",
    "Team KPI",
    "Productivity",
    "Quality",
    "Workload",
    "Best Member",
    "Generated At"
  ],

  Settings: [
    "Key",
    "Value",
    "Description"
  ],

  AuditLog: [
    "Log ID",
    "Date",
    "User",
    "Action",
    "Sheet",
    "Record ID",
    "Old Value",
    "New Value"
  ],
  Inventory: [
    "Item ID", "Item Name", "Category", "Variant", "Color", "Size",
    "Barcode", "Quantity", "Unit", "Minimum Stock", "Warehouse",
    "Supplier", "Cost", "Price", "Updated At"
  ],

  Suppliers: [
    "Supplier ID", "Company", "Contact", "Phone", "Email", "Material",
    "Lead Time", "Rating", "Payment Terms", "Address", "Status",
    "Total Orders", "Total Spent", "Avg Delivery Days", "Notes",
    "Created At", "Updated At"
  ],

  Orders: [
    "Order ID", "Customer", "Phone", "Email", "Date", "Status",
    "Items Count", "Amount", "Payment Status", "Payment Method",
    "Shipping Address", "Tracking Number", "Shipping Date",
    "Delivery Date", "Notes", "Return Status", "Return Reason",
    "Return Date", "Created At", "Updated At"
  ],

  Finance: [
    "Transaction ID",
    "Date",
    "Type",
    "Category",
    "Description",
    "Amount",
    "Balance"
  ],

  Notifications: [
    "Notification ID",
    "Type",
    "Member",
    "Title",
    "Message",
    "Status",
    "Created At",
    "Sent At"
  ],

  Sales: [
    "Invoice", "Date", "Customer", "Description", "Amount", "Payment", "Notes"
  ],
  Expenses: [
    "Date", "Type", "Supplier", "Description", "Amount", "Notes"
  ],
  Shareholders: [
    "Name", "Email", "Shares", "Ownership", "Inv Value", "Current Value", "Profit", "Loss"
  ]

};