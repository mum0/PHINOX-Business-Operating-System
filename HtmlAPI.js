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
    const html = HtmlService.createHtmlOutputFromFile('Dashboard')
      .setTitle('PHINOX Dashboard')
      .setWidth(1450)
      .setHeight(950);
    SpreadsheetApp.getUi().showModalDialog(html, 'PHINOX Business Operating System');
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
  function getDashboardData(){
    const best = bestMember();
    return {
      cards: {
        members: totalMembers(),
        tasks: totalTasks(),
        completed: completedTasks(),
        late: getLateTasks().length,
        kpi: teamAverageKPI(),
        productivity: averageProductivity()
      },
      topMembers: topPerformers(5).map(m => ({
        name: m.member, kpi: m.kpi, productivity: m.productivity, grade: m.grade
      })),
      tasksSummary: {
        pending: pendingReviewCount(),
        active: activeTasks(),
        completed: completedTasks(),
        late: getLateTasks().length,
        avgScore: averageTaskScore()
      },
      inventory: getInventorySummary(),
      finance: getFinancialKPIs(),
      orders: getOrderKPIs(),
      lang: getCurrentLanguage(),
      dir: getDirection()
    };
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