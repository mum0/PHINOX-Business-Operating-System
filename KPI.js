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
 * KPI.gs - Part 1
 * KPI Calculation Engine
 * ============================================================
 */

/**
 * حساب الجودة
 */
function calculateQualityScore(task){

    const quality = toNumber(task[10]);

    return clamp(quality,0,100);

}

/**
 * حساب الالتزام بالمواعيد
 */
function calculateOnTimeScore(task){

    const daysLate = calculateLateDays(task);

    if(daysLate===0)
        return 100;

    const penalty =
        APP.REVIEW.PENALTY_PER_DAY * daysLate;

    return clamp(
        100-penalty,
        0,
        100
    );

}

/**
 * حساب التأثير
 */
function calculateImpactScore(task){

    return clamp(
        toNumber(task[11]),
        0,
        100
    );

}

/**
 * حساب الأدلة
 */
function calculateEvidenceScore(task){

    return clamp(
        toNumber(task[12]),
        0,
        100
    );

}

/**
 * حساب الإنجاز
 */
function calculateCompletionScore(task){

    return clamp(
        toNumber(task[9]),
        0,
        100
    );

}

/**
 * حساب KPI النهائي للمهمة
 */
function calculateTaskKPI(task){

    const profile =
        APP.KPI_PROFILE[
            task[2]
        ] || APP.KPI_PROFILE.CEO;

    const score =

        calculateQualityScore(task) *
        profile.QUALITY /100 +

        calculateCompletionScore(task) *
        profile.COMPLETION /100 +

        calculateOnTimeScore(task) *
        profile.ON_TIME /100 +

        calculateImpactScore(task) *
        profile.IMPACT /100 +

        calculateEvidenceScore(task) *
        profile.EVIDENCE /100;

    return round(score);

}

/**
 * حساب Bonus
 */
function calculateBonus(task){

    const score =
        calculateTaskKPI(task);

    if(score>=95)
        return 10;

    if(score>=90)
        return 5;

    return 0;

}

/**
 * خصومات التأخير
 */
function calculatePenalty(task){

    return calculateLateDays(task)
        *APP.REVIEW.PENALTY_PER_DAY;

}

/**
 * ============================================================
 * KPI.gs - Part 2
 * Member KPI Engine
 * ============================================================
 */

/**
 * جميع مهام العضو
 */
function getMemberTasks(member){

    return getTasks().filter(task =>
        task[3] === member
    );

}

/**
 * KPI العضو
 */
function calculateMemberKPI(member){

    const tasks = getMemberTasks(member);

    if(tasks.length === 0)
        return 0;

    let total = 0;

    tasks.forEach(task => {

        total += calculateTaskKPI(task);

    });

    return round(total / tasks.length);

}

/**
 * عدد المهام المكتملة
 */
function memberCompletedTasks(member){

    return getMemberTasks(member).filter(task =>
        task[6] === APP.TASK_STATUS.APPROVED
    ).length;

}

/**
 * عدد المهام المتأخرة
 */
function memberLateTasks(member){

    return getMemberTasks(member).filter(task =>
        calculateLateDays(task) > 0
    ).length;

}

/**
 * متوسط الجودة
 */
function memberQuality(member){

    const tasks = getMemberTasks(member);

    if(tasks.length === 0)
        return 0;

    let total = 0;

    tasks.forEach(task => {

        total += calculateQualityScore(task);

    });

    return round(total / tasks.length);

}

/**
 * تصنيف الأداء
 */
function memberGrade(score){

    if(score >= 97) return "A+";

    if(score >= APP.SCORE.EXCELLENT) return "A";

    if(score >= 90) return "A-";

    if(score >= APP.SCORE.VERY_GOOD) return "B+";

    if(score >= 80) return "B";

    if(score >= 75) return "B-";

    if(score >= APP.SCORE.GOOD) return "C+";

    if(score >= APP.SCORE.NEEDS_IMPROVEMENT) return "C";

    return "D";

}

/**
 * تحديث بيانات عضو
 */
function updateMemberKPI(member){

    const sheet = getSheet(APP.SHEETS.MEMBERS);

    const data = sheet.getDataRange().getValues();

    for(let i = 1; i < data.length; i++){

        if(data[i][1] === member){

            data[i][7] = calculateMemberKPI(member);

            data[i][8] = memberCompletedTasks(member);

            data[i][9] = memberLateTasks(member);

            data[i][10] = memberQuality(member);

            sheet.getRange(i + 1,1,1,data[i].length)
                 .setValues([data[i]]);

            return;

        }

    }

}

/**
 * تحديث جميع الأعضاء
 */
function refreshMembersKPI(){

    const sheet = getSheet(APP.SHEETS.MEMBERS);

    const data = sheet.getDataRange().getValues();

    for(let i = 1; i < data.length; i++){

        updateMemberKPI(data[i][1]);

    }

}

/**
 * ترتيب الأعضاء حسب KPI
 */
function getLeaderboard(){

    const sheet = getSheet(APP.SHEETS.MEMBERS);

    const data = sheet.getDataRange().getValues();

    data.shift();

    return data.sort((a,b)=>b[7]-a[7]);

}

/**
 * أفضل عضو
 */
function bestMember(){

    const board = getLeaderboard();

    if(board.length === 0)
        return null;

    return board[0];

}

/**
 * متوسط KPI الفريق
 */
function teamAverageKPI(){

    const board = getLeaderboard();

    if(board.length === 0)
        return 0;

    let total = 0;

    board.forEach(member=>{

        total += toNumber(member[7]);

    });

    return round(total / board.length);

}

/**
 * ============================================================
 * KPI.gs - Part 3
 * Analytics & Dashboard Integration
 * ============================================================
 */

/**
 * KPI أسبوعي
 */
function weeklyKPI(member){

    const tasks = getMemberTasks(member);

    const today = new Date();

    const weekAgo = new Date();

    weekAgo.setDate(today.getDate()-7);

    const filtered = tasks.filter(task=>{

        const date = new Date(task[20]);

        return date >= weekAgo;

    });

    if(filtered.length===0)
        return 0;

    let total = 0;

    filtered.forEach(task=>{

        total += calculateTaskKPI(task);

    });

    return round(total/filtered.length);

}

/**
 * KPI شهري
 */
function monthlyKPI(member){

    const tasks = getMemberTasks(member);

    const today = new Date();

    const month = today.getMonth();

    const year = today.getFullYear();

    const filtered = tasks.filter(task=>{

        const d = new Date(task[20]);

        return d.getMonth()===month &&
               d.getFullYear()===year;

    });

    if(filtered.length===0)
        return 0;

    let total=0;

    filtered.forEach(task=>{

        total+=calculateTaskKPI(task);

    });

    return round(total/filtered.length);

}

/**
 * اتجاه الأداء
 */
function performanceTrend(member){
    const week = weeklyKPI(member);
    const month = monthlyKPI(member);
    if(week > month) return t("perf_trend_up");
    if(week < month) return t("perf_trend_down");
    return t("perf_trend_stable");
}
/**
 * إنتاجية العضو
 */
function productivity(member){

    const completed =
        memberCompletedTasks(member);

    const total =
        getMemberTasks(member).length;

    if(total===0)
        return 0;

    return round(
        completed/total*100
    );

}

/**
 * تحديث Dashboard KPI
 * يُرجع البيانات ليتم عرضها في Dashboard.gs
 */
function updateKPIDashboard(){
    const best = bestMember();
    return [
        ["Team KPI", teamAverageKPI()],
        ["Best Member", best ? best[1] : "-"]
    ];
}

/**
 * تحديث كامل
 */
function refreshKPI(){

    refreshMembersKPI();

    updateKPIDashboard();

}

/**
 * تشغيل كامل للنظام
 */
function systemRefresh(){

    recalculateAllTasks();

    refreshMembersKPI();

    updateDashboard();

    updateKPIDashboard();

}

/**
 * تشغيل مجدول
 */
function dailyRefresh(){

    systemRefresh();

}

/**
 * إنشاء Trigger يومي
 */
function createDailyTrigger(){

    ScriptApp.newTrigger("dailyRefresh")
        .timeBased()
        .everyDays(1)
        .atHour(1)
        .create();

}
/**
 * ============================================================
 * Enterprise KPI Library v3.3
 * Department-Level Performance Metrics
 * ============================================================
 */

const KPI_LIBRARY = {
    CEO: [
      {id: 'rev_growth', name: 'نمو الإيرادات', nameEn: 'Revenue Growth', formula: 'growth', source: 'sales', field: 'amount', weight: 25, target: 15, unit: '%', freq: 'monthly'},
      {id: 'net_margin', name: 'هامش الربح الصافي', nameEn: 'Net Margin', formula: 'margin', source: 'finance', field: 'net', weight: 25, target: 20, unit: '%', freq: 'monthly'},
      {id: 'roi', name: 'العائد على الاستثمار', nameEn: 'ROI', formula: 'roi', source: 'shareholders', weight: 20, target: 25, unit: '%', freq: 'quarterly'},
      {id: 'cash_runway', name: 'مدى النقدية', nameEn: 'Cash Runway', formula: 'runway', source: 'finance', weight: 15, target: 12, unit: 'شهر', freq: 'monthly'},
      {id: 'task_velocity', name: 'سرعة إنجاز المهام', nameEn: 'Task Velocity', formula: 'velocity', source: 'tasks', weight: 15, target: 90, unit: '%', freq: 'weekly'}
    ],
    Finance: [
      {id: 'cash_flow', name: 'التدفق النقدي', nameEn: 'Cash Flow', formula: 'cashflow', source: 'finance', weight: 25, target: 0, unit: 'ج.م', freq: 'monthly'},
      {id: 'burn_rate', name: 'معدل الاستهلاك', nameEn: 'Burn Rate', formula: 'burn', source: 'finance', weight: 20, target: 50000, unit: 'ج.م', freq: 'monthly'},
      {id: 'budget_variance', name: 'انحراف الميزانية', nameEn: 'Budget Variance', formula: 'variance', source: 'budget', weight: 20, target: 5, unit: '%', freq: 'monthly'},
      {id: 'collection_days', name: 'أيام التحصيل', nameEn: 'Collection Period', formula: 'days', source: 'sales', weight: 20, target: 30, unit: 'يوم', freq: 'monthly'},
      {id: 'expense_ratio', name: 'نسبة المصروفات', nameEn: 'Expense Ratio', formula: 'ratio', source: 'finance', weight: 15, target: 60, unit: '%', freq: 'monthly'}
    ],
    Inventory: [
      {id: 'turnover', name: 'معدل الدوران', nameEn: 'Turnover Rate', formula: 'turnover', source: 'inventory', weight: 25, target: 6, unit: 'مرة/سنة', freq: 'monthly'},
      {id: 'stock_accuracy', name: 'دقة المخزون', nameEn: 'Stock Accuracy', formula: 'accuracy', source: 'inventory', weight: 25, target: 98, unit: '%', freq: 'monthly'},
      {id: 'fill_rate', name: 'معدل التلبية', nameEn: 'Fill Rate', formula: 'fillrate', source: 'orders', weight: 20, target: 95, unit: '%', freq: 'weekly'},
      {id: 'shrinkage', name: 'نسبة الفاقد', nameEn: 'Shrinkage', formula: 'shrinkage', source: 'inventory', weight: 15, target: 1, unit: '%', freq: 'monthly'},
      {id: 'carrying_cost', name: 'تكلفة التخزين', nameEn: 'Carrying Cost', formula: 'carrying', source: 'inventory', weight: 15, target: 20, unit: '%', freq: 'monthly'}
    ],
    Orders: [
      {id: 'conversion', name: 'معدل التحويل', nameEn: 'Conversion Rate', formula: 'conversion', source: 'orders', weight: 25, target: 70, unit: '%', freq: 'weekly'},
      {id: 'aov', name: 'متوسط قيمة الطلب', nameEn: 'AOV', formula: 'aov', source: 'orders', weight: 20, target: 500, unit: 'ج.م', freq: 'weekly'},
      {id: 'return_rate', name: 'نسبة الإرجاع', nameEn: 'Return Rate', formula: 'returnrate', source: 'orders', weight: 20, target: 5, unit: '%', freq: 'monthly'},
      {id: 'fulfillment_time', name: 'وقت التنفيذ', nameEn: 'Fulfillment Time', formula: 'hours', source: 'orders', weight: 20, target: 48, unit: 'ساعة', freq: 'weekly'},
      {id: 'nps', name: 'مؤشر التوصية', nameEn: 'NPS', formula: 'nps', source: 'reviews', weight: 15, target: 50, unit: 'نقطة', freq: 'monthly'}
    ],
    Marketing: [
      {id: 'cac', name: 'تكلفة اكتساب العميل', nameEn: 'CAC', formula: 'cac', source: 'finance', weight: 25, target: 100, unit: 'ج.م', freq: 'monthly'},
      {id: 'ltv', name: 'قيمة العميل الدائمة', nameEn: 'LTV', formula: 'ltv', source: 'orders', weight: 25, target: 1000, unit: 'ج.م', freq: 'quarterly'},
      {id: 'roas', name: 'العائد على الإنفاق', nameEn: 'ROAS', formula: 'roas', source: 'finance', weight: 25, target: 4, unit: 'x', freq: 'monthly'},
      {id: 'engagement', name: 'معدل التفاعل', nameEn: 'Engagement', formula: 'engagement', source: 'tasks', weight: 15, target: 5, unit: '%', freq: 'weekly'},
      {id: 'lead_conversion', name: 'تحويل العملاء المحتملين', nameEn: 'Lead Conversion', formula: 'leadconv', source: 'orders', weight: 10, target: 10, unit: '%', freq: 'monthly'}
    ],
    HR: [
      {id: 'retention', name: 'معدل الاستبقاء', nameEn: 'Retention Rate', formula: 'retention', source: 'members', weight: 30, target: 90, unit: '%', freq: 'quarterly'},
      {id: 'time_to_hire', name: 'وقت التوظيف', nameEn: 'Time to Hire', formula: 'hiretime', source: 'members', weight: 20, target: 21, unit: 'يوم', freq: 'monthly'},
      {id: 'satisfaction', name: 'رضا الموظفين', nameEn: 'Satisfaction', formula: 'satisfaction', source: 'reviews', weight: 25, target: 80, unit: '%', freq: 'quarterly'},
      {id: 'training_hours', name: 'ساعات التدريب', nameEn: 'Training Hours', formula: 'training', source: 'tasks', weight: 15, target: 10, unit: 'ساعة', freq: 'monthly'},
      {id: 'absenteeism', name: 'نسبة الغياب', nameEn: 'Absenteeism', formula: 'absent', source: 'members', weight: 10, target: 3, unit: '%', freq: 'monthly'}
    ],
    Operations: [
      {id: 'efficiency', name: 'كفاءة التشغيل', nameEn: 'Efficiency', formula: 'efficiency', source: 'tasks', weight: 25, target: 85, unit: '%', freq: 'weekly'},
      {id: 'throughput', name: 'الإنتاجية', nameEn: 'Throughput', formula: 'throughput', source: 'tasks', weight: 25, target: 100, unit: 'مهمة/يوم', freq: 'weekly'},
      {id: 'error_rate', name: 'معدل الخطأ', nameEn: 'Error Rate', formula: 'errorrate', source: 'tasks', weight: 20, target: 2, unit: '%', freq: 'weekly'},
      {id: 'oee', name: 'الكفاءة الشاملة', nameEn: 'OEE', formula: 'oee', source: 'inventory', weight: 20, target: 85, unit: '%', freq: 'monthly'},
      {id: 'bottleneck', name: ' bottleneck الوقت', nameEn: 'Bottleneck Time', formula: 'bottleneck', source: 'tasks', weight: 10, target: 24, unit: 'ساعة', freq: 'weekly'}
    ],
    Sales: [
      {id: 'sales_growth', name: 'نمو المبيعات', nameEn: 'Sales Growth', formula: 'growth', source: 'sales', weight: 30, target: 20, unit: '%', freq: 'monthly'},
      {id: 'invoice_count', name: 'عدد الفواتير', nameEn: 'Invoice Count', formula: 'count', source: 'sales', weight: 15, target: 50, unit: 'فاتورة', freq: 'weekly'},
      {id: 'avg_invoice', name: 'متوسط الفاتورة', nameEn: 'Avg Invoice', formula: 'avg', source: 'sales', weight: 20, target: 1000, unit: 'ج.م', freq: 'weekly'},
      {id: 'customer_acquisition', name: 'عملاء جدد', nameEn: 'New Customers', formula: 'unique', source: 'sales', weight: 20, target: 10, unit: 'عميل', freq: 'monthly'},
      {id: 'payment_collection', name: 'تحصيل المدفوعات', nameEn: 'Collection Rate', formula: 'collection', source: 'sales', weight: 15, target: 95, unit: '%', freq: 'monthly'}
    ],
    'Customer Service': [
      {id: 'response_time', name: 'وقت الاستجابة', nameEn: 'Response Time', formula: 'responsetime', source: 'tasks', weight: 25, target: 2, unit: 'ساعة', freq: 'daily'},
      {id: 'resolution_rate', name: 'معدل الحل', nameEn: 'Resolution Rate', formula: 'resolution', source: 'tasks', weight: 25, target: 90, unit: '%', freq: 'weekly'},
      {id: 'csat', name: 'رضا العملاء', nameEn: 'CSAT', formula: 'csat', source: 'reviews', weight: 25, target: 85, unit: '%', freq: 'weekly'},
      {id: 'ticket_volume', name: 'حجم التذاكر', nameEn: 'Ticket Volume', formula: 'volume', source: 'tasks', weight: 15, target: 100, unit: 'تذكرة', freq: 'weekly'},
      {id: 'escalation_rate', name: 'معدل التصعيد', nameEn: 'Escalation', formula: 'escalation', source: 'tasks', weight: 10, target: 5, unit: '%', freq: 'weekly'}
    ],
    Design: [
      {id: 'creative_output', name: 'الإنتاج الإبداعي', nameEn: 'Creative Output', formula: 'output', source: 'tasks', weight: 30, target: 15, unit: 'تصميم', freq: 'weekly'},
      {id: 'revision_rate', name: 'معدل المراجعة', nameEn: 'Revision Rate', formula: 'revision', source: 'tasks', weight: 25, target: 20, unit: '%', freq: 'weekly'},
      {id: 'brand_consistency', name: 'اتساق الهوية', nameEn: 'Brand Consistency', formula: 'consistency', source: 'reviews', weight: 25, target: 95, unit: '%', freq: 'monthly'},
      {id: 'deadline_adherence', name: 'الالتزام بالمواعيد', nameEn: 'Deadline Adherence', formula: 'ontime', source: 'tasks', weight: 20, target: 90, unit: '%', freq: 'weekly'}
    ],
    IT: [
      {id: 'uptime', name: 'وقت التشغيل', nameEn: 'Uptime', formula: 'uptime', source: 'inventory', weight: 30, target: 99.9, unit: '%', freq: 'daily'},
      {id: 'incident_response', name: 'استجابة الحوادث', nameEn: 'Incident Response', formula: 'response', source: 'tasks', weight: 25, target: 30, unit: 'دقيقة', freq: 'daily'},
      {id: 'ticket_resolution', name: 'حل التذاكر', nameEn: 'Ticket Resolution', formula: 'resolution', source: 'tasks', weight: 25, target: 95, unit: '%', freq: 'weekly'},
      {id: 'security_score', name: 'درجة الأمان', nameEn: 'Security Score', formula: 'security', source: 'audit', weight: 20, target: 95, unit: '%', freq: 'monthly'}
    ],
    Procurement: [
      {id: 'cost_savings', name: 'توفير التكاليف', nameEn: 'Cost Savings', formula: 'savings', source: 'suppliers', weight: 30, target: 10, unit: '%', freq: 'quarterly'},
      {id: 'supplier_performance', name: 'أداء الموردين', nameEn: 'Supplier Performance', formula: 'supplier_kpi', source: 'suppliers', weight: 25, target: 85, unit: '%', freq: 'monthly'},
      {id: 'lead_time', name: 'وقت التوريد', nameEn: 'Lead Time', formula: 'leadtime', source: 'suppliers', weight: 25, target: 7, unit: 'يوم', freq: 'weekly'},
      {id: 'po_accuracy', name: 'دقة أوامر الشراء', nameEn: 'PO Accuracy', formula: 'accuracy', source: 'suppliers', weight: 20, target: 98, unit: '%', freq: 'monthly'}
    ],
    Production: [
      {id: 'production_volume', name: 'حجم الإنتاج', nameEn: 'Production Volume', formula: 'volume', source: 'inventory', weight: 25, target: 1000, unit: 'وحدة', freq: 'weekly'},
      {id: 'defect_rate', name: 'معدل العيوب', nameEn: 'Defect Rate', formula: 'defect', source: 'inventory', weight: 25, target: 1, unit: '%', freq: 'weekly'},
      {id: 'capacity_utilization', name: 'استغلال الطاقة', nameEn: 'Capacity Utilization', formula: 'capacity', source: 'tasks', weight: 25, target: 85, unit: '%', freq: 'weekly'},
      {id: 'downtime', name: 'وقت التوقف', nameEn: 'Downtime', formula: 'downtime', source: 'tasks', weight: 15, target: 5, unit: '%', freq: 'weekly'},
      {id: 'yield_rate', name: 'معدل العائد', nameEn: 'Yield Rate', formula: 'yield', source: 'inventory', weight: 10, target: 95, unit: '%', freq: 'weekly'}
    ],
    Quality: [
      {id: 'qa_pass_rate', name: 'معدل النجاح', nameEn: 'QA Pass Rate', formula: 'passrate', source: 'tasks', weight: 30, target: 98, unit: '%', freq: 'weekly'},
      {id: 'defects_per_unit', name: 'عيوب لكل وحدة', nameEn: 'Defects Per Unit', formula: 'dpu', source: 'inventory', weight: 25, target: 0.5, unit: 'عيب', freq: 'weekly'},
      {id: 'customer_complaints', name: 'شكاوى العملاء', nameEn: 'Complaints', formula: 'complaints', source: 'orders', weight: 25, target: 2, unit: 'شكوى', freq: 'weekly'},
      {id: 'audit_score', name: 'درجة التدقيق', nameEn: 'Audit Score', formula: 'audit', source: 'reviews', weight: 20, target: 95, unit: '%', freq: 'monthly'}
    ],
    Logistics: [
      {id: 'delivery_accuracy', name: 'دقة التوصيل', nameEn: 'Delivery Accuracy', formula: 'accuracy', source: 'orders', weight: 30, target: 99, unit: '%', freq: 'weekly'},
      {id: 'shipping_cost', name: 'تكلفة الشحن', nameEn: 'Shipping Cost', formula: 'cost_ratio', source: 'finance', weight: 25, target: 10, unit: '%', freq: 'monthly'},
      {id: 'damage_rate', name: 'معدل التلف', nameEn: 'Damage Rate', formula: 'damage', source: 'orders', weight: 25, target: 0.5, unit: '%', freq: 'weekly'},
      {id: 'otd', name: 'التوصيل في الموعد', nameEn: 'On-Time Delivery', formula: 'otd', source: 'orders', weight: 20, target: 95, unit: '%', freq: 'weekly'}
    ],
    Admin: [
      {id: 'doc_processing', name: 'سرعة معالجة المستندات', nameEn: 'Doc Processing', formula: 'speed', source: 'tasks', weight: 30, target: 24, unit: 'ساعة', freq: 'daily'},
      {id: 'cost_per_employee', name: 'التكلفة لكل موظف', nameEn: 'Cost Per Employee', formula: 'cpe', source: 'finance', weight: 25, target: 5000, unit: 'ج.م', freq: 'monthly'},
      {id: 'office_efficiency', name: 'كفاءة المكتب', nameEn: 'Office Efficiency', formula: 'efficiency', source: 'tasks', weight: 25, target: 90, unit: '%', freq: 'weekly'},
      {id: 'compliance_adherence', name: 'الالتزام بالأنظمة', nameEn: 'Compliance', formula: 'compliance', source: 'audit', weight: 20, target: 100, unit: '%', freq: 'monthly'}
    ],
    Security: [
      {id: 'incident_count', name: 'عدد الحوادث', nameEn: 'Incident Count', formula: 'count', source: 'audit', weight: 30, target: 0, unit: 'حادث', freq: 'monthly'},
      {id: 'response_time', name: 'وقت الاستجابة', nameEn: 'Response Time', formula: 'responsetime', source: 'tasks', weight: 25, target: 5, unit: 'دقيقة', freq: 'daily'},
      {id: 'training_completion', name: 'إكمال التدريب', nameEn: 'Training', formula: 'training', source: 'members', weight: 25, target: 100, unit: '%', freq: 'quarterly'},
      {id: 'audit_score', name: 'درجة التدقيق', nameEn: 'Audit Score', formula: 'audit', source: 'reviews', weight: 20, target: 95, unit: '%', freq: 'monthly'}
    ],
    Compliance: [
      {id: 'regulatory_adherence', name: 'الالتزام التنظيمي', nameEn: 'Regulatory', formula: 'adherence', source: 'audit', weight: 35, target: 100, unit: '%', freq: 'monthly'},
      {id: 'audit_findings', name: 'نتائج التدقيق', nameEn: 'Audit Findings', formula: 'findings', source: 'reviews', weight: 25, target: 0, unit: 'ملاحظة', freq: 'quarterly'},
      {id: 'policy_updates', name: 'تحديثات السياسات', nameEn: 'Policy Updates', formula: 'updates', source: 'tasks', weight: 20, target: 4, unit: 'تحديث', freq: 'quarterly'},
      {id: 'risk_score', name: 'درجة المخاطر', nameEn: 'Risk Score', formula: 'risk', source: 'audit', weight: 20, target: 10, unit: '%', freq: 'monthly'}
    ],
    R_D: [
      {id: 'innovation_rate', name: 'معدل الابتكار', nameEn: 'Innovation Rate', formula: 'innovation', source: 'tasks', weight: 30, target: 2, unit: 'مشروع', freq: 'quarterly'},
      {id: 'prototype_time', name: 'وقت النموذج', nameEn: 'Prototype Time', formula: 'prototype', source: 'tasks', weight: 25, target: 30, unit: 'يوم', freq: 'monthly'},
      {id: 'rd_spend', name: 'إنفاق البحث', nameEn: 'R&D Spend', formula: 'spend_ratio', source: 'finance', weight: 25, target: 10, unit: '%', freq: 'quarterly'},
      {id: 'patent_progress', name: 'التقدم في براءات الاختراع', nameEn: 'Patents', formula: 'patents', source: 'tasks', weight: 20, target: 1, unit: 'براءة', freq: 'yearly'}
    ],
    Legal: [
      {id: 'contract_turnaround', name: 'سرعة العقود', nameEn: 'Contract Speed', formula: 'turnaround', source: 'tasks', weight: 30, target: 3, unit: 'يوم', freq: 'weekly'},
      {id: 'litigation_risk', name: 'مخاطر التقاضي', nameEn: 'Litigation Risk', formula: 'risk', source: 'audit', weight: 25, target: 0, unit: 'قضية', freq: 'monthly'},
      {id: 'compliance_rate', name: 'معدل الالتزام', nameEn: 'Compliance Rate', formula: 'compliance', source: 'tasks', weight: 25, target: 100, unit: '%', freq: 'monthly'},
      {id: 'cost_per_case', name: 'تكلفة القضية', nameEn: 'Cost Per Case', formula: 'cost', source: 'finance', weight: 20, target: 5000, unit: 'ج.م', freq: 'monthly'}
    ]
  };
  
  /**
   * حساب قيمة KPI بناءً على نوعه
   */
  function calculateKPIValue(kpiDef){
    try{
      var formula = kpiDef.formula;
      var source = kpiDef.source;
      
      switch(formula){
        case 'growth': {
          var sales = getSales();
          var now = new Date();
          var curMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
          var prevMonth = now.getFullYear() + '-' + String(now.getMonth()).padStart(2, '0');
          if(now.getMonth() === 0) prevMonth = (now.getFullYear() - 1) + '-12';
          
          var cur = 0, prev = 0;
          sales.forEach(function(s){
            var mk = toMonthKey(new Date(s[SALE_COL.DATE]));
            if(mk === curMonth) cur += toNumber(s[SALE_COL.AMOUNT]);
            if(mk === prevMonth) prev += toNumber(s[SALE_COL.AMOUNT]);
          });
          return prev > 0 ? Math.round(((cur - prev) / prev) * 100) : 0;
        }
        case 'margin': {
          var fin = getSheet(APP.SHEETS.FINANCE).getDataRange().getValues();
          var inc = 0, exp = 0;
          for(var i = 1; i < fin.length; i++){
            var t = String(fin[i][2]).trim();
            var a = toNumber(fin[i][5]);
            if(t === 'Income' || t === 'إيراد') inc += a;
            else exp += a;
          }
          return inc > 0 ? Math.round(((inc - exp) / inc) * 100) : 0;
        }
        case 'count': {
          if(source === 'sales') return getSales().length;
          if(source === 'orders') return getSheet(APP.SHEETS.ORDERS).getLastRow() - 1;
          return 0;
        }
        case 'avg': {
          if(source === 'sales'){
            var s = getSales();
            var total = s.reduce(function(sum, r){ return sum + toNumber(r[SALE_COL.AMOUNT]); }, 0);
            return s.length > 0 ? Math.round(total / s.length) : 0;
          }
          return 0;
        }
        case 'conversion': {
          var oData = getSheet(APP.SHEETS.ORDERS).getDataRange().getValues();
          var del = 0, total = 0;
          for(var j = 1; j < oData.length; j++){
            total++;
            if(String(oData[j][5]).trim() === 'Delivered') del++;
          }
          return total > 0 ? Math.round((del / total) * 100) : 0;
        }
        case 'returnrate': {
          var oD = getSheet(APP.SHEETS.ORDERS).getDataRange().getValues();
          var ret = 0, tot = 0;
          for(var k = 1; k < oD.length; k++){
            tot++;
            if(String(oD[k][5]).trim() === 'Returned') ret++;
          }
          return tot > 0 ? Math.round((ret / tot) * 100) : 0;
        }
        case 'aov': {
          var oData2 = getSheet(APP.SHEETS.ORDERS).getDataRange().getValues();
          var rev = 0, cnt = 0;
          for(var m = 1; m < oData2.length; m++){
            if(String(oData2[m][5]).trim() !== 'Cancelled'){
              rev += toNumber(oData2[m][7]);
              cnt++;
            }
          }
          return cnt > 0 ? Math.round(rev / cnt) : 0;
        }
        case 'cashflow': {
          var fData = getSheet(APP.SHEETS.FINANCE).getDataRange().getValues();
          var bal = 0;
          for(var n = 1; n < fData.length; n++) bal += toNumber(fData[n][6]);
          return Math.round(bal);
        }
        case 'turnover': {
          var inv = getSheet(APP.SHEETS.INVENTORY).getDataRange().getValues();
          var avgVal = 0, sold = totalSales();
          for(var p = 1; p < inv.length; p++) avgVal += toNumber(inv[p][7]) * toNumber(inv[p][12]);
          avgVal = avgVal / Math.max(1, inv.length - 1);
          return avgVal > 0 ? Math.round((sold / avgVal) * 100) / 100 : 0;
        }
        case 'accuracy':
        case 'passrate':
        case 'efficiency':
        case 'ontime': {
          var tData = getSheet(APP.SHEETS.TASKS).getDataRange().getValues();
          var completed = 0, scored = 0;
          for(var q = 1; q < tData.length; q++){
            if(String(tData[q][6]).trim() === 'Completed' || String(tData[q][6]).trim() === 'Approved'){
              completed++;
              scored += toNumber(tData[q][15]);
            }
          }
          if(formula === 'efficiency') return completed > 0 ? Math.round((scored / completed)) : 0;
          return completed > 0 ? Math.round((scored / (completed * 100)) * 100) : 0;
        }
        case 'retention': {
          var mData = getSheet(APP.SHEETS.MEMBERS).getDataRange().getValues();
          var active = 0, total = 0;
          for(var r = 1; r < mData.length; r++){
            total++;
            if(String(mData[r][5]).toLowerCase() === 'active') active++;
          }
          return total > 0 ? Math.round((active / total) * 100) : 0;
        }
  /**
 * حساب قيمة KPI بناءً على البيانات الحقيقية فقط
 */
function calculateKPIValue(kpiDef){
    try{
      var formula = kpiDef.formula;
      var source = kpiDef.source;
      
      // ── صيغ منفذة بالكامل ──
      switch(formula){
        case 'growth': {
          var sales = getSales();
          var now = new Date();
          var curMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
          var prevMonth = now.getFullYear() + '-' + String(now.getMonth()).padStart(2, '0');
          if(now.getMonth() === 0) prevMonth = (now.getFullYear() - 1) + '-12';
          var cur = 0, prev = 0;
          sales.forEach(function(s){
            var mk = toMonthKey(new Date(s[SALE_COL.DATE]));
            if(mk === curMonth) cur += toNumber(s[SALE_COL.AMOUNT]);
            if(mk === prevMonth) prev += toNumber(s[SALE_COL.AMOUNT]);
          });
          return prev > 0 ? Math.round(((cur - prev) / prev) * 100) : 0;
        }
        case 'margin': {
          var fin = getSheet(APP.SHEETS.FINANCE).getDataRange().getValues();
          var inc = 0, exp = 0;
          for(var i = 1; i < fin.length; i++){
            var t = String(fin[i][2]).trim();
            var a = toNumber(fin[i][5]);
            if(t === 'Income' || t === 'إيراد') inc += a; else exp += a;
          }
          return inc > 0 ? Math.round(((inc - exp) / inc) * 100) : 0;
        }
        case 'count': {
          if(source === 'sales') return getSales().length;
          if(source === 'orders') return Math.max(0, getSheet(APP.SHEETS.ORDERS).getLastRow() - 1);
          if(source === 'members') return Math.max(0, getSheet(APP.SHEETS.MEMBERS).getLastRow() - 1);
          return 0;
        }
        case 'avg': {
          if(source === 'sales'){
            var s = getSales();
            var total = s.reduce(function(sum, r){ return sum + toNumber(r[SALE_COL.AMOUNT]); }, 0);
            return s.length > 0 ? Math.round(total / s.length) : 0;
          }
          return 0;
        }
        case 'conversion': {
          var oData = getSheet(APP.SHEETS.ORDERS).getDataRange().getValues();
          var del = 0, total = 0;
          for(var j = 1; j < oData.length; j++){
            total++;
            if(String(oData[j][5]).trim() === 'Delivered') del++;
          }
          return total > 0 ? Math.round((del / total) * 100) : 0;
        }
        case 'returnrate': {
          var oD = getSheet(APP.SHEETS.ORDERS).getDataRange().getValues();
          var ret = 0, tot = 0;
          for(var k = 1; k < oD.length; k++){
            tot++;
            if(String(oD[k][5]).trim() === 'Returned') ret++;
          }
          return tot > 0 ? Math.round((ret / tot) * 100) : 0;
        }
        case 'aov': {
          var oData2 = getSheet(APP.SHEETS.ORDERS).getDataRange().getValues();
          var rev = 0, cnt = 0;
          for(var m = 1; m < oData2.length; m++){
            if(String(oData2[m][5]).trim() !== 'Cancelled'){
              rev += toNumber(oData2[m][7]); cnt++;
            }
          }
          return cnt > 0 ? Math.round(rev / cnt) : 0;
        }
        case 'cashflow': {
          var fData = getSheet(APP.SHEETS.FINANCE).getDataRange().getValues();
          var bal = 0;
          for(var n = 1; n < fData.length; n++) bal += toNumber(fData[n][6]);
          return Math.round(bal);
        }
        case 'turnover': {
          var inv = getSheet(APP.SHEETS.INVENTORY).getDataRange().getValues();
          var avgVal = 0, sold = totalSales();
          for(var p = 1; p < inv.length; p++) avgVal += toNumber(inv[p][7]) * toNumber(inv[p][12]);
          avgVal = avgVal / Math.max(1, inv.length - 1);
          return avgVal > 0 ? Math.round((sold / avgVal) * 100) / 100 : 0;
        }
        case 'accuracy':
        case 'passrate':
        case 'efficiency':
        case 'ontime': {
          var tData = getSheet(APP.SHEETS.TASKS).getDataRange().getValues();
          var completed = 0, scored = 0;
          for(var q = 1; q < tData.length; q++){
            if(String(tData[q][6]).trim() === 'Completed' || String(tData[q][6]).trim() === 'Approved'){
              completed++; scored += toNumber(tData[q][15]);
            }
          }
          if(formula === 'efficiency') return completed > 0 ? Math.round((scored / completed)) : 0;
          return completed > 0 ? Math.round((scored / (completed * 100)) * 100) : 0;
        }
        case 'retention': {
          var mData = getSheet(APP.SHEETS.MEMBERS).getDataRange().getValues();
          var active = 0, total = 0;
          for(var r = 1; r < mData.length; r++){
            total++;
            if(String(mData[r][5]).toLowerCase() === 'active') active++;
          }
          return total > 0 ? Math.round((active / total) * 100) : 0;
        }
        case 'invoice_count': {
          return getSales().length;
        }
        case 'avg_invoice': {
          var s = getSales();
          var t = s.reduce(function(sum, r){ return sum + toNumber(r[SALE_COL.AMOUNT]); }, 0);
          return s.length > 0 ? Math.round(t / s.length) : 0;
        }
        case 'customer_acquisition': {
          var sales = getSales();
          var customers = {};
          sales.forEach(function(s){ customers[s[SALE_COL.CUSTOMER]] = true; });
          return Object.keys(customers).length;
        }
        case 'collection': {
          var sales = getSales();
          var collected = 0, total = 0;
          sales.forEach(function(s){
            total += toNumber(s[SALE_COL.AMOUNT]);
            if(s[SALE_COL.PAYMENT] !== 'آجل' && s[SALE_COL.PAYMENT] !== 'Deferred') collected += toNumber(s[SALE_COL.AMOUNT]);
          });
          return total > 0 ? Math.round((collected / total) * 100) : 0;
        }
        case 'expense_ratio': {
          var fin = getSheet(APP.SHEETS.FINANCE).getDataRange().getValues();
          var inc = 0, exp = 0;
          for(var i = 1; i < fin.length; i++){
            var t = String(fin[i][2]).trim();
            var a = toNumber(fin[i][5]);
            if(t === 'Income' || t === 'إيراد') inc += a; else exp += a;
          }
          return inc > 0 ? Math.round((exp / inc) * 100) : 0;
        }
        case 'fillrate': {
          var o = getSheet(APP.SHEETS.ORDERS).getDataRange().getValues();
          var filled = 0, total = 0;
          for(var i = 1; i < o.length; i++){
            total++;
            if(String(o[i][5]).trim() !== 'Cancelled') filled++;
          }
          return total > 0 ? Math.round((filled / total) * 100) : 0;
        }
        case 'shrinkage': {
          // يحتاج بيانات فعلية للفاقد - مؤقتاً 0 حتى يتم إدخالها يدوياً
          return getManualKPIValue(kpiDef.id) || 0;
        }
        case 'carrying': {
          var inv = getSheet(APP.SHEETS.INVENTORY).getDataRange().getValues();
          var val = 0;
          for(var i = 1; i < inv.length; i++) val += toNumber(inv[i][7]) * toNumber(inv[i][12]);
          // تكلفة التخزين تقديرية 20% من قيمة المخزون سنوياً
          return Math.round((val * 0.2) / 12); // شهرياً
        }
        case 'fulfillment_time': {
          var o = getSheet(APP.SHEETS.ORDERS).getDataRange().getValues();
          var hours = 0, count = 0;
          for(var i = 1; i < o.length; i++){
            var ship = o[i][13] ? new Date(o[i][13]) : null;
            var order = o[i][4] ? new Date(o[i][4]) : null;
            if(ship && order && !isNaN(ship.getTime()) && !isNaN(order.getTime())){
              hours += (ship - order) / (1000 * 60 * 60); count++;
            }
          }
          return count > 0 ? Math.round(hours / count) : 0;
        }
        case 'hiretime': {
          var m = getSheet(APP.SHEETS.MEMBERS).getDataRange().getValues();
          var days = 0, count = 0;
          for(var i = 1; i < m.length; i++){
            var join = m[i][6] ? new Date(m[i][6]) : null;
            if(join && !isNaN(join.getTime())){
              days += (new Date() - join) / (1000 * 60 * 60 * 24); count++;
            }
          }
          return count > 0 ? Math.round(days / count) : 0;
        }
        case 'training': {
          var t = getSheet(APP.SHEETS.TASKS).getDataRange().getValues();
          var hours = 0;
          for(var i = 1; i < t.length; i++){
            if(String(t[i][3]).toLowerCase().indexOf('training') > -1 || String(t[i][3]).toLowerCase().indexOf('تدريب') > -1){
              hours += toNumber(t[i][15]); // استخدام الدرجة كمؤقت
            }
          }
          return hours;
        }
        case 'absent': {
          // يحتاج تتبع الحضور - يُرجع القيمة اليدوية إن وجدت
          return getManualKPIValue(kpiDef.id) || 0;
        }
        case 'satisfaction':
        case 'csat':
        case 'nps': {
          // استطلاعات الرأي - يُرجع القيمة اليدوية
          return getManualKPIValue(kpiDef.id) || 0;
        }
        case 'downtime': {
          // نسبة التوقف - يدوي أو من بيانات المهام
          return getManualKPIValue(kpiDef.id) || 0;
        }
        case 'defect': {
          var inv = getSheet(APP.SHEETS.INVENTORY).getDataRange().getValues();
          var defect = 0, total = 0;
          for(var i = 1; i < inv.length; i++){
            total += toNumber(inv[i][7]);
            // افتراض: العيوب في ملاحظات المنتج
            if(String(inv[i][16] || '').toLowerCase().indexOf('defect') > -1) defect += toNumber(inv[i][7]);
          }
          return total > 0 ? Math.round((defect / total) * 100) : 0;
        }
        case 'capacity': {
          var inv = getSheet(APP.SHEETS.INVENTORY).getDataRange().getValues();
          var totalQty = 0;
          for(var i = 1; i < inv.length; i++) totalQty += toNumber(inv[i][7]);
          // افتراض طاقة تخزين قصوى 10000 وحدة
          return Math.min(100, Math.round((totalQty / 10000) * 100));
        }
        case 'yield': {
          var inv = getSheet(APP.SHEETS.INVENTORY).getDataRange().getValues();
          var good = 0, total = 0;
          for(var i = 1; i < inv.length; i++){
            var q = toNumber(inv[i][7]);
            total += q;
            if(q > 0) good += q; // مبسط - يمكن ربطه بجودة المنتج
          }
          return total > 0 ? Math.round((good / total) * 100) : 0;
        }
        case 'otd': {
          var o = getSheet(APP.SHEETS.ORDERS).getDataRange().getValues();
          var onTime = 0, total = 0;
          for(var i = 1; i < o.length; i++){
            if(String(o[i][5]).trim() === 'Delivered'){
              total++;
              var due = o[i][9] ? new Date(o[i][9]) : null;
              var actual = o[i][14] ? new Date(o[i][14]) : null;
              if(due && actual && actual <= due) onTime++;
            }
          }
          return total > 0 ? Math.round((onTime / total) * 100) : 0;
        }
        case 'damage': {
          var o = getSheet(APP.SHEETS.ORDERS).getDataRange().getValues();
          var damaged = 0, total = 0;
          for(var i = 1; i < o.length; i++){
            if(String(o[i][16]).toLowerCase().indexOf('damage') > -1 || String(o[i][16]).toLowerCase().indexOf('تلف') > -1) damaged++;
            total++;
          }
          return total > 0 ? Math.round((damaged / total) * 100) : 0;
        }
        case 'cost_ratio': {
          var o = getSheet(APP.SHEETS.ORDERS).getDataRange().getValues();
          var shipCost = 0, rev = 0;
          for(var i = 1; i < o.length; i++){
            rev += toNumber(o[i][7]);
            shipCost += toNumber(o[i][12]); // افتراض تكلفة الشحن في عمود المورد
          }
          return rev > 0 ? Math.round((shipCost / rev) * 100) : 0;
        }
        case 'runway': {
          var fin = getSheet(APP.SHEETS.FINANCE).getDataRange().getValues();
          var bal = 0, exp = 0;
          for(var i = 1; i < fin.length; i++){
            bal += toNumber(fin[i][6]);
            var t = String(fin[i][2]).trim();
            if(t !== 'Income' && t !== 'إيراد') exp += toNumber(fin[i][5]);
          }
          var monthlyExp = exp / Math.max(1, fin.length - 1);
          return monthlyExp > 0 ? Math.round(bal / monthlyExp) : 0;
        }
        case 'roi': {
          var sh = getSheet(APP.SHEETS.SHAREHOLDERS).getDataRange().getValues();
          var totalProfit = 0, totalInv = 0;
          for(var i = 1; i < sh.length; i++){
            totalProfit += toNumber(sh[i][6]);
            totalInv += toNumber(sh[i][4]);
          }
          return totalInv > 0 ? Math.round((totalProfit / totalInv) * 100) : 0;
        }
        case 'velocity': {
          var t = getSheet(APP.SHEETS.TASKS).getDataRange().getValues();
          var completed = 0, onTime = 0;
          for(var i = 1; i < t.length; i++){
            if(String(t[i][6]).trim() === 'Completed'){
              completed++;
              if(toNumber(t[i][18]) <= 0) onTime++; // Days Late <= 0
            }
          }
          return completed > 0 ? Math.round((onTime / completed) * 100) : 0;
        }
        case 'burn': {
          var fin = getSheet(APP.SHEETS.FINANCE).getDataRange().getValues();
          var exp = 0;
          for(var i = 1; i < fin.length; i++){
            var t = String(fin[i][2]).trim();
            if(t !== 'Income' && t !== 'إيراد') exp += toNumber(fin[i][5]);
          }
          return Math.round(exp / Math.max(1, fin.length - 1));
        }
        case 'variance': {
          var b = getSheet("Budget");
          if(!b) return 0;
          var d = b.getDataRange().getValues();
          var totalVar = 0;
          for(var i = 1; i < d.length; i++){
            var bud = toNumber(d[i][1]);
            var act = toNumber(d[i][2]);
            if(bud > 0) totalVar += Math.abs((act - bud) / bud);
          }
          return d.length > 1 ? Math.round((totalVar / (d.length - 1)) * 100) : 0;
        }
        case 'days': {
          // أيام التحصيل - متوسط أيام انتظار الدفع
          var s = getSales();
          var days = 0, count = 0;
          var now = new Date();
          s.forEach(function(sale){
            if(sale[SALE_COL.PAYMENT] === 'آجل' || sale[SALE_COL.PAYMENT] === 'Deferred'){
              var d = new Date(sale[SALE_COL.DATE]);
              days += (now - d) / (1000 * 60 * 60 * 24); count++;
            }
          });
          return count > 0 ? Math.round(days / count) : 0;
        }
        default: {
          // ❌ لا عشوائية! إما قيمة يدوية أو 0
          return getManualKPIValue(kpiDef.id) || 0;
        }
      }
    }catch(e){
      Logger.log("KPI calculation error for " + kpiDef.id + ": " + e);
      return getManualKPIValue(kpiDef.id) || 0;
    }
  }
  
  /**
   * قراءة قيمة KPI يدوية من ورقة KPI_Input (إن وجدت)
   */
  function getManualKPIValue(kpiId){
    try{
      var sheet = getSheet("KPI_Input");
      if(!sheet) return null;
      var data = sheet.getDataRange().getValues();
      for(var i = 1; i < data.length; i++){
        if(String(data[i][0]).trim() === kpiId){
          return toNumber(data[i][1]);
        }
      }
    }catch(e){}
    return null;
  }
      }
    }catch(e){
      Logger.log("KPI calculation error for " + kpiDef.id + ": " + e);
      return 0;
    }
  }
  
  /**
   * جلب KPIs لقسم معين
   */
  function getDepartmentKPIs(deptName){
    var dept = KPI_LIBRARY[deptName];
    if(!dept) return {department: deptName, kpis: [], score: 0};
    
    var result = [];
    var totalWeight = 0;
    var weightedScore = 0;
    
    dept.forEach(function(kpi){
      var actual = calculateKPIValue(kpi);
      var achievement = kpi.target > 0 ? (actual / kpi.target) * 100 : 0;
      if(['returnrate','burn_rate','shrinkage','expense_ratio','defect_rate','error_rate','downtime','bottleneck','absenteeism','damage_rate','complaints','incident_count','litigation_risk','findings','risk_score'].indexOf(kpi.id) > -1){
        // Lower is better - invert achievement
        achievement = achievement > 0 ? Math.min(200, (kpi.target / actual) * 100) : 100;
      }
      achievement = Math.min(achievement, 200); // Cap at 200%
      
      var grade = 'F';
      var color = '#C62828';
      if(achievement >= 120){ grade = 'A+'; color = '#1B5E20'; }
      else if(achievement >= 100){ grade = 'A'; color = '#2E7D32'; }
      else if(achievement >= 80){ grade = 'B'; color = '#7B1FA2'; }
      else if(achievement >= 60){ grade = 'C'; color = '#F9A825'; }
      else if(achievement >= 40){ grade = 'D'; color = '#E65100'; }
      
      var trend = 'stable'; // يمكن ربطه لاحقاً بالمقارنة مع الشهر السابق
      
      result.push({
        id: kpi.id,
        name: kpi.name,
        nameEn: kpi.nameEn,
        actual: actual,
        target: kpi.target,
        unit: kpi.unit,
        achievement: Math.round(achievement),
        grade: grade,
        color: color,
        weight: kpi.weight,
        trend: trend,
        freq: kpi.freq
      });
      
      totalWeight += kpi.weight;
      weightedScore += (achievement * kpi.weight);
    });
    
    var deptScore = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
    
    return {
      department: deptName,
      kpis: result,
      score: deptScore,
      grade: deptScore >= 100 ? 'A' : (deptScore >= 80 ? 'B' : (deptScore >= 60 ? 'C' : (deptScore >= 40 ? 'D' : 'F'))),
      color: deptScore >= 100 ? '#2E7D32' : (deptScore >= 80 ? '#7B1FA2' : (deptScore >= 60 ? '#F9A825' : '#C62828'))
    };
  }
  
  /**
   * ملخص جميع الأقسام
   */
  function getAllDepartmentsSummary(){
    var depts = Object.keys(KPI_LIBRARY);
    var result = [];
    depts.forEach(function(d){
      var k = getDepartmentKPIs(d);
      result.push({
        name: d,
        score: k.score,
        grade: k.grade,
        color: k.color,
        kpisCount: k.kpis.length
      });
    });
    return result.sort(function(a,b){ return b.score - a.score; });
  }