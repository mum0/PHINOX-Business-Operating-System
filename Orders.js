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
 * PHINOX Business Operating System
 * Orders.gs - Part 1
 * إدارة طلبات العملاء والبيانات الأساسية
 * ============================================================
 */

/**
 * خريطة أعمدة الطلبات
 */
const ORD_COL = {
  ORDER_ID: 0,
  CUSTOMER: 1,
  PHONE: 2,
  EMAIL: 3,
  DATE: 4,
  STATUS: 5,
  ITEMS_COUNT: 6,
  AMOUNT: 7,
  PAYMENT_STATUS: 8,
  PAYMENT_METHOD: 9,
  SHIPPING_ADDRESS: 10,
  TRACKING: 11,
  SHIPPING_DATE: 12,
  DELIVERY_DATE: 13,
  NOTES: 14,
  RETURN_STATUS: 15,
  RETURN_REASON: 16,
  RETURN_DATE: 17,
  CREATED_AT: 18,
  UPDATED_AT: 19
};

/**
 * حالات الطلب
 */
const ORDER_STATUS = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURNED: "Returned"
};

/**
 * حالات الدفع
 */
const PAYMENT_STATUS = {
  PENDING: "Pending",
  PAID: "Paid",
  PARTIAL: "Partial",
  REFUNDED: "Refunded",
  FAILED: "Failed"
};

/**
 * حالات الإرجاع
 */
const RETURN_STATUS = {
  NONE: "None",
  REQUESTED: "Requested",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  COMPLETED: "Completed"
};

/**
 * أسماء الـ Sheets المساعدة
 */
const ORDER_ITEMS_SHEET = "Order Items";
const ORDER_TIMELINE_SHEET = "Order Timeline";

/**
 * ضمان وجود أعمدة الطلبات
 */
function ensureOrdersColumns(){
  const sheet = getSheet(APP.SHEETS.ORDERS);
  const required = [
    "Order ID", "Customer", "Phone", "Email", "Date", "Status", "Items Count",
    "Amount", "Payment Status", "Payment Method", "Shipping Address", "Tracking Number",
    "Shipping Date", "Delivery Date", "Notes", "Return Status", "Return Reason",
    "Return Date", "Created At", "Updated At"
  ];
  const current = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] || [];
  if(current.length < required.length || current[0] !== "Order ID"){
    if(sheet.getLastRow() <= 1){
      sheet.clear();
      const header = sheet.getRange(1, 1, 1, required.length);
      header.setValues([required]);
      header.setBackground(APP.COLORS.HEADER)
            .setFontColor("#FFFFFF")
            .setFontWeight("bold");
      for(let i = 1; i <= required.length; i++){
        sheet.setColumnWidth(i, 140);
      }
    } else {
      for(let i = current.length; i < required.length; i++){
        sheet.getRange(1, i + 1).setValue(required[i]);
      }
      const newHeader = sheet.getRange(1, current.length + 1, 1, required.length - current.length);
      newHeader.setBackground(APP.COLORS.HEADER)
               .setFontColor("#FFFFFF")
               .setFontWeight("bold");
    }
  }
}

/**
 * إنشاء طلب جديد
 */
function addOrder(order){
  ensureOrdersColumns();
  const sheet = getSheet(APP.SHEETS.ORDERS);
  const orderId = generateId("ORD");
  const items = order.items || [];
  const itemsCount = items.length;
  const amount = toNumber(order.amount) || 0;
  const row = [
    orderId,
    order.customer || "",
    order.phone || "",
    order.email || "",
    order.date || now(),
    order.status || ORDER_STATUS.PENDING,
    itemsCount,
    amount,
    order.paymentStatus || PAYMENT_STATUS.PENDING,
    order.paymentMethod || "",
    order.shippingAddress || "",
    order.tracking || "",
    order.shippingDate || "",
    order.deliveryDate || "",
    order.notes || "",
    RETURN_STATUS.NONE,
    "",
    "",
    now(),
    now()
  ];
  sheet.appendRow(row);
  if(itemsCount > 0){
    items.forEach(item => addOrderItem(orderId, item));
    const calculatedTotal = calculateOrderTotal(orderId);
    updateOrder(orderId, {amount: calculatedTotal});
  }
  logOrderTimeline(orderId, row[ORD_COL.STATUS], "Order created");
  logActivity(getCurrentMember(), "إنشاء طلب", APP.SHEETS.ORDERS, orderId, "", row[ORD_COL.CUSTOMER]);
  return orderId;
}

/**
 * جميع الطلبات
 */
function getOrders(){
  ensureOrdersColumns();
  const sheet = getSheet(APP.SHEETS.ORDERS);
  const data = sheet.getDataRange().getValues();
  data.shift();
  return data;
}

/**
 * طلب بواسطة المعرف
 */
function getOrder(orderId){
  const orders = getOrders();
  for(const o of orders){
    if(o[ORD_COL.ORDER_ID] === orderId){
      return o;
    }
  }
  return null;
}

/**
 * تحديث طلب
 */
function updateOrder(orderId, updates){
  const sheet = getSheet(APP.SHEETS.ORDERS);
  const data = sheet.getDataRange().getValues();
  for(let i = 1; i < data.length; i++){
    if(data[i][ORD_COL.ORDER_ID] === orderId){
      const row = data[i];
      const map = {
        customer: ORD_COL.CUSTOMER,
        phone: ORD_COL.PHONE,
        email: ORD_COL.EMAIL,
        date: ORD_COL.DATE,
        status: ORD_COL.STATUS,
        itemsCount: ORD_COL.ITEMS_COUNT,
        amount: ORD_COL.AMOUNT,
        paymentStatus: ORD_COL.PAYMENT_STATUS,
        paymentMethod: ORD_COL.PAYMENT_METHOD,
        shippingAddress: ORD_COL.SHIPPING_ADDRESS,
        tracking: ORD_COL.TRACKING,
        shippingDate: ORD_COL.SHIPPING_DATE,
        deliveryDate: ORD_COL.DELIVERY_DATE,
        notes: ORD_COL.NOTES,
        returnStatus: ORD_COL.RETURN_STATUS,
        returnReason: ORD_COL.RETURN_REASON,
        returnDate: ORD_COL.RETURN_DATE
      };
      Object.keys(updates).forEach(key => {
        if(map[key] !== undefined){
          row[map[key]] = updates[key];
        }
      });
      row[ORD_COL.UPDATED_AT] = now();
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      if(updates.status){
        logOrderTimeline(orderId, updates.status, updates.notes || "");
      }
      logActivity(getCurrentMember(), "تحديث طلب", APP.SHEETS.ORDERS, orderId, "", "");
      return true;
    }
  }
  return false;
}

/**
 * حذف طلب
 */
function deleteOrder(orderId){
  const sheet = getSheet(APP.SHEETS.ORDERS);
  const data = sheet.getDataRange().getValues();
  for(let i = 1; i < data.length; i++){
    if(data[i][ORD_COL.ORDER_ID] === orderId){
      deleteOrderItems(orderId);
      deleteOrderTimeline(orderId);
      sheet.deleteRow(i + 1);
      logActivity(getCurrentMember(), "حذف طلب", APP.SHEETS.ORDERS, orderId, "", "");
      return true;
    }
  }
  return false;
}

/**
 * الطلبات حسب الحالة
 */
function getOrdersByStatus(status){
  return getOrders().filter(o => o[ORD_COL.STATUS] === status);
}

/**
 * الطلبات حسب العميل
 */
function getOrdersByCustomer(customer){
  return getOrders().filter(o => o[ORD_COL.CUSTOMER] === customer);
}

/**
 * الطلبات ضمن فترة
 */
function getOrdersByDateRange(start, end){
  const s = new Date(start);
  const e = new Date(end);
  return getOrders().filter(o => {
    const d = new Date(o[ORD_COL.DATE]);
    return d >= s && d <= e;
  });
}

/**
 * طلبات معلقة
 */
function getPendingOrders(){
  return getOrdersByStatus(ORDER_STATUS.PENDING);
}

/**
 * طلبات قيد المعالجة
 */
function getProcessingOrders(){
  return getOrdersByStatus(ORDER_STATUS.PROCESSING);
}

/**
 * طلبات تم شحنها
 */
function getShippedOrders(){
  return getOrdersByStatus(ORDER_STATUS.SHIPPED);
}

/**
 * طلبات تم توصيلها
 */
function getDeliveredOrders(){
  return getOrdersByStatus(ORDER_STATUS.DELIVERED);
}

/**
 * طلبات ملغاة
 */
function getCancelledOrders(){
  return getOrdersByStatus(ORDER_STATUS.CANCELLED);
}

/**
 * طلبات مرتجعة
 */
function getReturnedOrders(){
  return getOrdersByStatus(ORDER_STATUS.RETURNED);
}

/**
 * إجمالي الطلبات
 */
function totalOrders(){
  return getOrders().length;
}

/**
 * ============================================================
 * Orders.gs - Part 2
 * بنود الطلب والمخزون
 * ============================================================
 */

/**
 * خريطة أعمدة بنود الطلب
 */
const ORD_ITM_COL = {
  ENTRY_ID: 0,
  ORDER_ID: 1,
  PRODUCT_ID: 2,
  PRODUCT_NAME: 3,
  VARIANT: 4,
  COLOR: 5,
  SIZE: 6,
  QUANTITY: 7,
  UNIT_PRICE: 8,
  TOTAL_PRICE: 9,
  NOTES: 10
};

/**
 * ضمان وجود sheet بنود الطلب
 */
function ensureOrderItemsSheet(){
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(ORDER_ITEMS_SHEET);
  if(!sheet){
    sheet = ss.insertSheet(ORDER_ITEMS_SHEET);
    const headers = [
      "Entry ID", "Order ID", "Product ID", "Product Name", "Variant",
      "Color", "Size", "Quantity", "Unit Price", "Total Price", "Notes"
    ];
    const header = sheet.getRange(1, 1, 1, headers.length);
    header.setValues([headers]);
    header.setBackground(APP.COLORS.HEADER)
          .setFontColor("#FFFFFF")
          .setFontWeight("bold");
    for(let i = 1; i <= headers.length; i++){
      sheet.setColumnWidth(i, 140);
    }
  }
  return sheet;
}

/**
 * إضافة بند للطلب
 */
function addOrderItem(orderId, item){
  ensureOrderItemsSheet();
  const sheet = getSpreadsheet().getSheetByName(ORDER_ITEMS_SHEET);
  const qty = toNumber(item.quantity);
  const price = toNumber(item.unitPrice);
  const row = [
    generateId("ITM"),
    orderId,
    item.productId || "",
    item.productName || "",
    item.variant || "",
    item.color || "",
    item.size || "",
    qty,
    price,
    round(qty * price, 2),
    item.notes || ""
  ];
  sheet.appendRow(row);
  return row[ORD_ITM_COL.ENTRY_ID];
}

/**
 * بنود الطلب
 */
function getOrderItems(orderId){
  ensureOrderItemsSheet();
  const sheet = getSpreadsheet().getSheetByName(ORDER_ITEMS_SHEET);
  const data = sheet.getDataRange().getValues();
  data.shift();
  return data.filter(r => r[ORD_ITM_COL.ORDER_ID] === orderId);
}

/**
 * حذف بنود الطلب
 */
function deleteOrderItems(orderId){
  const sheet = getSpreadsheet().getSheetByName(ORDER_ITEMS_SHEET);
  if(!sheet) return;
  const data = sheet.getDataRange().getValues();
  const rowsToDelete = [];
  for(let i = 1; i < data.length; i++){
    if(data[i][ORD_ITM_COL.ORDER_ID] === orderId){
      rowsToDelete.push(i + 1);
    }
  }
  rowsToDelete.sort((a, b) => b - a).forEach(row => sheet.deleteRow(row));
}

/**
 * إجمالي الطلب
 */
function calculateOrderTotal(orderId){
  const items = getOrderItems(orderId);
  let total = 0;
  items.forEach(itm => {
    total += toNumber(itm[ORD_ITM_COL.TOTAL_PRICE]);
  });
  return round(total, 2);
}

/**
 * عدد البنود
 */
function countOrderItems(orderId){
  return getOrderItems(orderId).length;
}

/**
 * تأكيد الطلب وخصم المخزون
 */
function confirmOrder(orderId){
  const order = getOrder(orderId);
  if(!order) throw new Error("الطلب غير موجود");
  if(order[ORD_COL.STATUS] !== ORDER_STATUS.PENDING){
    throw new Error("لا يمكن تأكيد طلب ليس معلقاً");
  }
  const items = getOrderItems(orderId);
  items.forEach(itm => {
    const pid = itm[ORD_ITM_COL.PRODUCT_ID];
    const qty = toNumber(itm[ORD_ITM_COL.QUANTITY]);
    if(pid){
      removeStock(pid, qty, "طلب: "+orderId);
    }
  });
  updateOrder(orderId, {
    status: ORDER_STATUS.CONFIRMED,
    itemsCount: items.length,
    amount: calculateOrderTotal(orderId)
  });
  return true;
}

/**
 * شحن الطلب
 */
function shipOrder(orderId, tracking, shippingDate){
  const order = getOrder(orderId);
  if(!order) throw new Error("الطلب غير موجود");
  updateOrder(orderId, {
    status: ORDER_STATUS.SHIPPED,
    tracking: tracking || "",
    shippingDate: shippingDate || now()
  });
  return true;
}

/**
 * توصيل الطلب
 */
function deliverOrder(orderId, deliveryDate){
  const order = getOrder(orderId);
  if(!order) throw new Error("الطلب غير موجود");
  updateOrder(orderId, {
    status: ORDER_STATUS.DELIVERED,
    deliveryDate: deliveryDate || now(),
    paymentStatus: PAYMENT_STATUS.PAID
  });
  return true;
}

/**
 * إلغاء الطلب وإرجاع المخزون
 */
function cancelOrder(orderId, reason){
  const order = getOrder(orderId);
  if(!order) throw new Error("الطلب غير موجود");
  if(order[ORD_COL.STATUS] === ORDER_STATUS.CANCELLED){
    throw new Error("الطلب ملغى مسبقاً");
  }
  const items = getOrderItems(orderId);
  items.forEach(itm => {
    const pid = itm[ORD_ITM_COL.PRODUCT_ID];
    const qty = toNumber(itm[ORD_ITM_COL.QUANTITY]);
    if(pid){
      addStock(pid, qty, "إلغاء طلب: "+orderId);
    }
  });
  updateOrder(orderId, {
    status: ORDER_STATUS.CANCELLED,
    notes: reason || "Cancelled"
  });
  return true;
}

/**
 * ============================================================
 * Orders.gs - Part 3
 * الإرجاع والخط الزمني والمؤشرات
 * ============================================================
 */

/**
 * خريطة أعمدة الخط الزمني
 */
const ORD_TLN_COL = {
  ENTRY_ID: 0,
  ORDER_ID: 1,
  STATUS: 2,
  DATE: 3,
  USER: 4,
  NOTES: 5
};

/**
 * ضمان وجود sheet الخط الزمني
 */
function ensureOrderTimelineSheet(){
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(ORDER_TIMELINE_SHEET);
  if(!sheet){
    sheet = ss.insertSheet(ORDER_TIMELINE_SHEET);
    const headers = ["Entry ID", "Order ID", "Status", "Date", "User", "Notes"];
    const header = sheet.getRange(1, 1, 1, headers.length);
    header.setValues([headers]);
    header.setBackground(APP.COLORS.HEADER)
          .setFontColor("#FFFFFF")
          .setFontWeight("bold");
    for(let i = 1; i <= headers.length; i++){
      sheet.setColumnWidth(i, 140);
    }
  }
  return sheet;
}

/**
 * تسجيل حدث في الخط الزمني
 */
function logOrderTimeline(orderId, status, notes){
  ensureOrderTimelineSheet();
  const sheet = getSpreadsheet().getSheetByName(ORDER_TIMELINE_SHEET);
  const user = getCurrentMember();
  const userName = user ? user[MEMBER_COL.FULL_NAME] : "System";
  sheet.appendRow([
    generateId("TLN"),
    orderId,
    status,
    now(),
    userName,
    notes || ""
  ]);
}

/**
 * الخط الزمني للطلب
 */
function getOrderTimeline(orderId){
  ensureOrderTimelineSheet();
  const sheet = getSpreadsheet().getSheetByName(ORDER_TIMELINE_SHEET);
  const data = sheet.getDataRange().getValues();
  data.shift();
  return data.filter(r => r[ORD_TLN_COL.ORDER_ID] === orderId);
}

/**
 * حذف سجل الخط الزمني
 */
function deleteOrderTimeline(orderId){
  const sheet = getSpreadsheet().getSheetByName(ORDER_TIMELINE_SHEET);
  if(!sheet) return;
  const data = sheet.getDataRange().getValues();
  const rowsToDelete = [];
  for(let i = 1; i < data.length; i++){
    if(data[i][ORD_TLN_COL.ORDER_ID] === orderId){
      rowsToDelete.push(i + 1);
    }
  }
  rowsToDelete.sort((a, b) => b - a).forEach(row => sheet.deleteRow(row));
}

/**
 * طلب إرجاع
 */
function requestReturn(orderId, reason){
  const order = getOrder(orderId);
  if(!order) throw new Error("الطلب غير موجود");
  if(order[ORD_COL.STATUS] !== ORDER_STATUS.DELIVERED){
    throw new Error("لا يمكن إرجاع طلب لم يتم توصيله");
  }
  updateOrder(orderId, {
    returnStatus: RETURN_STATUS.REQUESTED,
    returnReason: reason || "",
    returnDate: now()
  });
  logOrderTimeline(orderId, "Return Requested", reason);
  return true;
}

/**
 * اعتماد الإرجاع
 */
function approveReturn(orderId){
  const order = getOrder(orderId);
  if(!order) throw new Error("الطلب غير موجود");
  if(order[ORD_COL.RETURN_STATUS] !== RETURN_STATUS.REQUESTED){
    throw new Error("لا يوجد طلب إرجاع معلق");
  }
  updateOrder(orderId, {returnStatus: RETURN_STATUS.APPROVED});
  logOrderTimeline(orderId, "Return Approved", "");
  return true;
}

/**
 * رفض الإرجاع
 */
function rejectReturn(orderId){
  const order = getOrder(orderId);
  if(!order) throw new Error("الطلب غير موجود");
  if(order[ORD_COL.RETURN_STATUS] !== RETURN_STATUS.REQUESTED){
    throw new Error("لا يوجد طلب إرجاع معلق");
  }
  updateOrder(orderId, {returnStatus: RETURN_STATUS.REJECTED});
  logOrderTimeline(orderId, "Return Rejected", "");
  return true;
}

/**
 * إتمام الإرجاع وإرجاع المخزون
 */
function completeReturn(orderId){
  const order = getOrder(orderId);
  if(!order) throw new Error("الطلب غير موجود");
  if(order[ORD_COL.RETURN_STATUS] !== RETURN_STATUS.APPROVED){
    throw new Error("الإرجاع لم يتم اعتماده");
  }
  const items = getOrderItems(orderId);
  items.forEach(itm => {
    const pid = itm[ORD_ITM_COL.PRODUCT_ID];
    const qty = toNumber(itm[ORD_ITM_COL.QUANTITY]);
    if(pid){
      addStock(pid, qty, "إرجاع طلب: "+orderId);
    }
  });
  updateOrder(orderId, {
    status: ORDER_STATUS.RETURNED,
    returnStatus: RETURN_STATUS.COMPLETED,
    paymentStatus: PAYMENT_STATUS.REFUNDED
  });
  logOrderTimeline(orderId, "Return Completed", "Stock restored");
  return true;
}

/**
 * إجمالي الإيرادات
 */
function totalRevenue(){
  const orders = getOrders().filter(o => 
    o[ORD_COL.STATUS] === ORDER_STATUS.DELIVERED &&
    o[ORD_COL.PAYMENT_STATUS] === PAYMENT_STATUS.PAID
  );
  let total = 0;
  orders.forEach(o => {
    total += toNumber(o[ORD_COL.AMOUNT]);
  });
  return round(total, 2);
}

/**
 * المبالغ المعلقة
 */
function totalPendingAmount(){
  const orders = getOrders().filter(o => 
    o[ORD_COL.PAYMENT_STATUS] === PAYMENT_STATUS.PENDING
  );
  let total = 0;
  orders.forEach(o => {
    total += toNumber(o[ORD_COL.AMOUNT]);
  });
  return round(total, 2);
}

/**
 * متوسط قيمة الطلب
 */
function averageOrderValue(){
  const orders = getOrders().filter(o => 
    o[ORD_COL.STATUS] !== ORDER_STATUS.CANCELLED
  );
  if(orders.length === 0) return 0;
  let total = 0;
  orders.forEach(o => {
    total += toNumber(o[ORD_COL.AMOUNT]);
  });
  return round(total / orders.length, 2);
}

/**
 * مؤشرات أداء الطلبات
 */
function getOrderKPIs(){
  const all = getOrders();
  const total = all.length;
  if(total === 0){
    return {
      totalOrders: 0,
      revenue: 0,
      averageValue: 0,
      conversionRate: 0,
      returnRate: 0,
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      returned: 0
    };
  }
  const delivered = all.filter(o => o[ORD_COL.STATUS] === ORDER_STATUS.DELIVERED).length;
  const returned = all.filter(o => o[ORD_COL.STATUS] === ORDER_STATUS.RETURNED).length;
  const cancelled = all.filter(o => o[ORD_COL.STATUS] === ORDER_STATUS.CANCELLED).length;
  return {
    totalOrders: total,
    revenue: totalRevenue(),
    averageValue: averageOrderValue(),
    conversionRate: round(delivered / total * 100),
    returnRate: round(returned / total * 100),
    cancellationRate: round(cancelled / total * 100),
    pending: all.filter(o => o[ORD_COL.STATUS] === ORDER_STATUS.PENDING).length,
    processing: all.filter(o => o[ORD_COL.STATUS] === ORDER_STATUS.PROCESSING).length,
    shipped: all.filter(o => o[ORD_COL.STATUS] === ORDER_STATUS.SHIPPED).length,
    delivered: delivered,
    cancelled: cancelled,
    returned: returned
  };
}

/**
 * بناء لوحة تحكم الطلبات
 */
function buildOrdersDashboard(){
  const dashboard = getSheet(APP.SHEETS.DASHBOARD);
  const kpis = getOrderKPIs();
  dashboard.appendRow([]);
  dashboard.appendRow(["مؤشرات الطلبات"]);
  dashboard.appendRow(["إجمالي الطلبات", kpis.totalOrders]);
  dashboard.appendRow(["الإيرادات", kpis.revenue]);
  dashboard.appendRow(["متوسط قيمة الطلب", kpis.averageValue]);
  dashboard.appendRow(["نسبة التحويل", kpis.conversionRate + "%"]);
  dashboard.appendRow(["نسبة الإرجاع", kpis.returnRate + "%"]);
  dashboard.appendRow(["نسبة الإلغاء", kpis.cancellationRate + "%"]);
  dashboard.appendRow([]);
  dashboard.appendRow(["توزيع الحالات"]);
  dashboard.appendRow(["معلق", kpis.pending]);
  dashboard.appendRow(["قيد المعالجة", kpis.processing]);
  dashboard.appendRow(["تم الشحن", kpis.shipped]);
  dashboard.appendRow(["تم التوصيل", kpis.delivered]);
  dashboard.appendRow(["ملغى", kpis.cancelled]);
  dashboard.appendRow(["مرتجع", kpis.returned]);
}

/**
 * تحديث كامل
 */
function refreshOrders(){
  ensureOrdersColumns();
  const orders = getOrders();
  orders.forEach(o => {
    const oid = o[ORD_COL.ORDER_ID];
    const count = countOrderItems(oid);
    const total = calculateOrderTotal(oid);
    if(count !== toNumber(o[ORD_COL.ITEMS_COUNT]) || total !== toNumber(o[ORD_COL.AMOUNT])){
      updateOrder(oid, {itemsCount: count, amount: total});
    }
  });
  buildOrdersDashboard();
}