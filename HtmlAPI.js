/**
 * ============================================================
 * PHINOX Business Operating System v2.0
 * HtmlAPI.gs — Server Bridge for HTML UI
 * ============================================================
 */

/**
 * فتح الـ Dashboard الرئيسي
 */
function showDashboardUI(){
  const html = HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('PHINOX Dashboard')
    .setWidth(1450)
    .setHeight(950);
  SpreadsheetApp.getUi().showModalDialog(html, 'PHINOX Business Operating System');
}
  function doGet(e) {
    return HtmlService.createHtmlOutputFromFile('WebApp')
      .setTitle('PHINOX Business Operating System')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  /**
   * تضمين ملف HTML فرعي
   */
  function include(filename){
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  }
  
  /**
   * جلب كل بيانات Dashboard دفعة واحدة (للأداء)
   */
 /**
 * جلب بيانات Dashboard دفعة واحدة (محسّنة للأداء)
 * تقرأ كل Sheet مرة واحدة فقط
 */
function getDashboardData(){
  const startTime = Date.now();
  
  // 1. قراءة دفعة واحدة لكل Sheet
  const membersData = getSheet(APP.SHEETS.MEMBERS).getDataRange().getValues();
  const tasksData = getSheet(APP.SHEETS.TASKS).getDataRange().getValues();
  const invData = getSheet(APP.SHEETS.INVENTORY).getDataRange().getValues();
  const finData = getSheet(APP.SHEETS.FINANCE).getDataRange().getValues();
  const ordersData = getSheet(APP.SHEETS.ORDERS).getDataRange().getValues();
  
  membersData.shift(); // إزالة الهيدر
  tasksData.shift();
  invData.shift();
  finData.shift();
  ordersData.shift();
  
  // 2. حساب المهام في الذاكرة
  let completed = 0, active = 0, pending = 0, late = 0, totalScore = 0, scoreCount = 0;
  const nowTime = new Date().getTime();
  
  tasksData.forEach(function(row){
    const status = row[6];
    const score = Number(row[15]) || 0;
    const due = row[8] ? new Date(row[8]).getTime() : 0;
    
    if(status === 'Completed') completed++;
    else if(status === 'In Progress') active++;
    else if(status === 'Waiting Review') pending++;
    
    if(due && due < nowTime && status !== 'Completed' && status !== 'Approved') late++;
    if(score > 0){ totalScore += score; scoreCount++; }
  });
  
  // 3. حساب KPI الأعضاء في الذاكرة
  const memberKPIs = [];
  membersData.forEach(function(m){
    if(!m[1]) return;
    let mCompleted = 0, mLate = 0, mScore = 0, mCount = 0;
    tasksData.forEach(function(t){
      if(t[3] === m[1]){
        if(t[6] === 'Completed') mCompleted++;
        const due = t[8] ? new Date(t[8]).getTime() : 0;
        if(due && due < nowTime && t[6] !== 'Completed') mLate++;
        const score = Number(t[15]) || 0;
        if(score > 0){ mScore += score; mCount++; }
      }
    });
    const kpi = mCount > 0 ? Math.round(mScore / mCount) : 0;
    const productivity = mCompleted > 0 ? Math.round((mCompleted / (mCompleted + mLate || 1)) * 100) : 0;
    let grade = 'D';
    if(kpi >= 90) grade = 'A+';
    else if(kpi >= 80) grade = 'A';
    else if(kpi >= 70) grade = 'B';
    else if(kpi >= 60) grade = 'C';
    
    memberKPIs.push({name: m[1], kpi: kpi, productivity: productivity, grade: grade});
  });
  
  memberKPIs.sort(function(a,b){ return b.kpi - a.kpi; });
  const top5 = memberKPIs.slice(0, 5);
  const teamKPI = memberKPIs.length > 0 ? Math.round(memberKPIs.reduce(function(s,m){return s+m.kpi;},0) / memberKPIs.length) : 0;
  const teamProd = memberKPIs.length > 0 ? Math.round(memberKPIs.reduce(function(s,m){return s+m.productivity;},0) / memberKPIs.length) : 0;
  
  // 4. حساب المخزون في الذاكرة
  let totalQty = 0, totalVal = 0, lowStock = 0, outStock = 0;
  invData.forEach(function(p){
    const qty = Number(p[7]) || 0;
    const cost = Number(p[12]) || 0;
    const minStock = Number(p[9]) || 0;
    totalQty += qty;
    totalVal += qty * cost;
    if(minStock > 0 && qty <= minStock) lowStock++;
    if(qty === 0) outStock++;
  });
  
  // 5. حساب المالية في الذاكرة
  let balance = 0, monthIncome = 0, monthExpense = 0;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  
  finData.forEach(function(t){
    const type = t[2];
    const amt = Number(t[5]) || 0;
    const date = t[1] ? new Date(t[1]).getTime() : 0;
    if(type === 'Income'){
      balance += amt;
      if(date >= monthStart) monthIncome += amt;
    } else {
      balance -= amt;
      if(date >= monthStart) monthExpense += amt;
    }
  });
  
  // 6. حساب الطلبات في الذاكرة
  let delivered = 0, returned = 0, cancelled = 0, totalRev = 0, totalAmt = 0, countAmt = 0;
  ordersData.forEach(function(o){
    const status = o[5];
    const amt = Number(o[7]) || 0;
    if(status === 'Delivered'){
      delivered++;
      totalRev += amt;
    }
    if(status === 'Returned') returned++;
    if(status === 'Cancelled') cancelled++;
    if(status !== 'Cancelled'){ totalAmt += amt; countAmt++; }
  });
  const totalOrders = ordersData.length;
  const conversion = totalOrders > 0 ? Math.round(delivered / totalOrders * 100) : 0;
  const returnRate = totalOrders > 0 ? Math.round(returned / totalOrders * 100) : 0;
  const avgValue = countAmt > 0 ? Math.round(totalAmt / countAmt) : 0;
  
  // 7. تجميع النتيجة
  const result = {
    cards: {
      members: membersData.length,
      tasks: tasksData.length,
      completed: completed,
      late: late,
      kpi: teamKPI,
      productivity: teamProd
    },
    topMembers: top5,
    tasksSummary: {
      pending: pending,
      active: active,
      completed: completed,
      late: late,
      avgScore: scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0
    },
    inventory: {
      totalProducts: invData.length,
      totalQuantity: totalQty,
      totalValue: Math.round(totalVal),
      lowStock: lowStock,
      outOfStock: outStock
    },
    finance: {
      currentBalance: Math.round(balance),
      monthlyIncome: Math.round(monthIncome),
      monthlyExpense: Math.round(monthExpense),
      monthlyProfit: Math.round(monthIncome - monthExpense)
    },
    orders: {
      totalOrders: totalOrders,
      revenue: Math.round(totalRev),
      averageValue: avgValue,
      conversionRate: conversion,
      returnRate: returnRate
    }
  };
  
  Logger.log("Dashboard loaded in " + (Date.now() - startTime) + "ms");
    // Mini ERP
    const salesData = getSheet(APP.SHEETS.SALES).getDataRange().getValues();
    salesData.shift();
    const expData = getSheet(APP.SHEETS.EXPENSES).getDataRange().getValues();
    expData.shift();
    const shData = getSheet(APP.SHEETS.SHAREHOLDERS).getDataRange().getValues();
    shData.shift();
    
    result.sales = salesData.slice(-10); // آخر 10 فواتير
    result.expenses = expData.slice(-10); // آخر 10 مصروفات
    result.shareholders = shData;
  return result;
}
  
  /**
   * جلب قائمة الأعضاء للـ Dropdowns
   */
  function getMembersList(){
    return getMembers().map(m => ({id: m[0], name: m[1], role: m[2]}));
  }
  
  /**
   * جلب قائمة المنتجات للـ Dropdowns
   */
  function getProductsList(){
    return getProducts().map(p => ({
      id: p[INV_COL.ITEM_ID],
      name: p[INV_COL.ITEM_NAME] + ' (' + p[INV_COL.VARIANT] + ')',
      stock: p[INV_COL.QUANTITY],
      price: p[INV_COL.PRICE]
    }));
  }
  
  /**
   * إنشاء مهمة من الـ Dialog
   */
  function createTaskFromDialog(data){
    try{
      validateTaskInput(data);
      const taskId = createTask({
        title: data.title,
        category: data.category,
        assignedTo: data.assignedTo,
        priority: data.priority,
        difficulty: data.difficulty,
        startDate: data.startDate ? new Date(data.startDate) : now(),
        dueDate: data.dueDate ? new Date(data.dueDate) : null
      });
      notifyTaskAssigned(taskId, data.assignedTo);
      return {success: true, id: taskId, message: t("task_new_assigned")};
    }catch(e){
      return {success: false, error: e.message};
    }
  }
  
  /**
   * إضافة عضو من الـ Dialog
   */
  function addMemberFromDialog(data){
    try{
      if(!isValidEmail(data.email)) throw new Error(t("val_invalid_email"));
      addMember({
        name: data.name,
        role: data.role,
        email: data.email,
        phone: data.phone || ""
      });
      return {success: true, message: "تم إضافة العضو: " + data.name};
    }catch(e){
      return {success: false, error: e.message};
    }
  }
  
  /**
   * إضافة منتج من الـ Dialog
   */
  function addProductFromDialog(data){
    try{
      const id = addProduct({
        name: data.name,
        category: data.category,
        variant: data.variant || "",
        color: data.color || "",
        size: data.size || "",
        quantity: Number(data.quantity) || 0,
        minStock: Number(data.minStock) || 0,
        cost: Number(data.cost) || 0,
        price: Number(data.price) || 0,
        warehouse: data.warehouse || "Main",
        supplier: data.supplier || ""
      });
      return {success: true, id: id, message: "تم إضافة المنتج: " + data.name};
    }catch(e){
      return {success: false, error: e.message};
    }
  }
  
  /**
   * إنشاء طلب من الـ Dialog
   */
  function addOrderFromDialog(data){
    try{
      const orderId = addOrder({
        customer: data.customer,
        phone: data.phone || "",
        email: data.email || "",
        items: data.items || [],
        amount: 0,
        shippingAddress: data.shippingAddress || ""
      });
      return {success: true, id: orderId, message: "تم إنشاء الطلب: " + orderId};
    }catch(e){
      return {success: false, error: e.message};
    }
  }
  
  /**
   * تحديث النظام من الـ Dashboard
   */
  function refreshSystemFromUI(){
    try{
      safeRefresh();
      return {success: true, message: "تم التحديث بنجاح"};
    }catch(e){
      return {success: false, error: e.message};
    }
  }
  
  /**
   * تسجيل معاملة مالية من الـ Dialog
   */
  function addTransactionFromDialog(data){
    try{
      const id = addTransaction({
        type: data.type,
        category: data.category,
        description: data.description,
        amount: Number(data.amount),
        date: data.date ? new Date(data.date) : now()
      });
      return {success: true, id: id, message: "تم تسجيل المعاملة"};
    }catch(e){
      return {success: false, error: e.message};
    }
  }
  /**
 * توليد HTML للـ Dialogs (يتم استدعاؤها من Dashboard)
 */
/**
 * فتح Dialog إضافة مهمة (من السيرفر)
 */
function openTaskDialogServer(){
    const html = HtmlService.createHtmlOutputFromFile('TaskDialog')
      .setWidth(500).setHeight(650);
    SpreadsheetApp.getUi().showModalDialog(html, 'إضافة مهمة جديدة');
  }
  
  /**
   * فتح Dialog إضافة عضو
   */
  function openMemberDialogServer(){
    const html = HtmlService.createHtmlOutputFromFile('MemberDialog')
      .setWidth(450).setHeight(550);
    SpreadsheetApp.getUi().showModalDialog(html, 'إضافة عضو جديد');
  }
  
  /**
   * فتح Dialog إضافة منتج
   */
  function openProductDialogServer(){
    const html = HtmlService.createHtmlOutputFromFile('InventoryDialog')
      .setWidth(500).setHeight(650);
    SpreadsheetApp.getUi().showModalDialog(html, 'إضافة منتج جديد');
  }
  
  /**
   * فتح Dialog طلب جديد
   */
  function openOrderDialogServer(){
    const html = HtmlService.createHtmlOutputFromFile('OrderDialog')
      .setWidth(600).setHeight(700);
    SpreadsheetApp.getUi().showModalDialog(html, 'طلب جديد');
  }
  /**
 * ============================================================
 * Mini ERP Dialog Bridge
 * ============================================================
 */

function addSaleFromDialog(data){
  try{
    var id = addSale({
      invoice: data.invoice,
      date: data.date ? new Date(data.date) : now(),
      customer: data.customer,
      description: data.description,
      amount: Number(data.amount),
      payment: data.payment,
      notes: data.notes
    });
    return {success: true, id: id, message: "تم حفظ الفاتورة: " + id};
  }catch(e){
    return {success: false, error: e.message};
  }
}

function addExpenseFromDialog(data){
  try{
    addExpense({
      date: data.date ? new Date(data.date) : now(),
      type: data.type,
      supplier: data.supplier,
      description: data.description,
      amount: Number(data.amount),
      notes: data.notes
    });
    return {success: true, message: "تم تسجيل المصروف"};
  }catch(e){
    return {success: false, error: e.message};
  }
}

function addShareholderFromDialog(data){
  try{
    addShareholder({
      name: data.name,
      email: data.email,
      shares: Number(data.shares)
    });
    return {success: true, message: "تم إضافة المساهم: " + data.name};
  }catch(e){
    return {success: false, error: e.message};
  }
}
/**
 * ============================================================
 * Universal Delete Engine
 * ============================================================
 */

function deleteRecordFromUI(data){
  try{
    const sheetName = data.sheet;
    const id = data.id;
    const sheet = getSheet(sheetName);
    const allData = sheet.getDataRange().getValues();
    
    for(let i = 1; i < allData.length; i++){
      if(String(allData[i][0]).trim() === String(id).trim()){
        sheet.deleteRow(i + 1);
        logActivity(getCurrentMember(), "حذف سجل", sheetName, id, "", "");
        return {success: true, message: "تم الحذف من " + sheetName};
      }
    }
    throw new Error("السجل غير موجود أو تم حذفه مسبقاً");
  }catch(e){
    return {success: false, error: e.message};
  }
}

/**
 * جلب بيانات أي ورقة للعرض في Dashboard
 */
function getSheetPreview(sheetName, limit){
  try{
    const sheet = getSheet(sheetName);
    const data = sheet.getDataRange().getValues();
    if(data.length <= 1) return {headers: [], rows: []};
    const headers = data[0];
    const rows = data.slice(1, (limit || 10) + 1);
    return {headers: headers, rows: rows, total: data.length - 1};
  }catch(e){
    return {headers: [], rows: [], total: 0, error: e.message};
  }
}