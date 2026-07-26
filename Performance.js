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
 * Performance.gs - Part 1
 * Performance Analysis Engine
 * ============================================================
 */

/**
 * أداء عضو
 */
function getMemberPerformance(member){

    return {

        member: member,

        kpi: calculateMemberKPI(member),

        completed: memberCompletedTasks(member),

        late: memberLateTasks(member),

        quality: memberQuality(member),

        productivity: productivity(member),

        workload: memberWorkload(member),

        trend: performanceTrend(member),

        grade: memberGrade(
            calculateMemberKPI(member)
        )

    };

}

/**
 * جميع بيانات الأداء
 */
function getPerformanceData(){

    const members = getMembers();

    const result = [];

    members.forEach(member=>{

        result.push(

            getMemberPerformance(
                member[1]
            )

        );

    });

    return result;

}

/**
 * أفضل أداء
 */
function topPerformers(limit=5){

    const list = getPerformanceData();

    list.sort((a,b)=>b.kpi-a.kpi);

    return list.slice(0,limit);

}

/**
 * أقل أداء
 */
function lowPerformers(limit=5){

    const list = getPerformanceData();

    list.sort((a,b)=>a.kpi-b.kpi);

    return list.slice(0,limit);

}

/**
 * متوسط جودة الفريق
 */
function averageQuality(){

    const data=getPerformanceData();

    if(data.length===0)
        return 0;

    let total=0;

    data.forEach(item=>{

        total+=item.quality;

    });

    return round(total/data.length);

}

/**
 * متوسط الإنتاجية
 */
function averageProductivity(){

    const data=getPerformanceData();

    if(data.length===0)
        return 0;

    let total=0;

    data.forEach(item=>{

        total+=item.productivity;

    });

    return round(total/data.length);

}

/**
 * متوسط عبء العمل
 */
function averageWorkload(){

    const data=getPerformanceData();

    if(data.length===0)
        return 0;

    let total=0;

    data.forEach(item=>{

        total+=item.workload;

    });

    return round(total/data.length);

}
/**
 * ============================================================
 * PHINOX Business Operating System
 * Performance.gs - Part 2
 * Analytics / Rewards / Recommendations
 * ============================================================
 */

/**
 * مقارنة أسبوعية
 */
function weeklyPerformance(member){

    return {

        kpi: weeklyKPI(member),

        productivity: productivity(member),

        trend: performanceTrend(member)

    };

}

/**
 * مقارنة شهرية
 */
function monthlyPerformance(member){

    return {

        kpi: monthlyKPI(member),

        productivity: productivity(member),

        trend: performanceTrend(member)

    };

}

/**
 * هل الأداء منخفض؟
 */
function isPerformanceDeclining(member){

    return weeklyKPI(member) < monthlyKPI(member);

}

/**
 * توصية تحسين
 */
function performanceRecommendation(member){

    const data = getMemberPerformance(member);

    if(data.kpi >= 90)
        return "Excellent Performance";

    if(data.late > 3)
        return "Reduce Delayed Tasks";

    if(data.quality < 75)
        return "Improve Quality";

    if(data.productivity < 60)
        return "Increase Productivity";

    return "Maintain Current Performance";

}

/**
 * نقاط المكافأة
 */
function rewardPoints(member){

    const score = calculateMemberKPI(member);

    if(score >= 95) return 100;

    if(score >= 90) return 75;

    if(score >= 85) return 50;

    return 0;

}

/**
 * نقاط العقوبة
 */
function penaltyPoints(member){

    return memberLateTasks(member) * 10;

}

/**
 * النقاط النهائية
 */
function finalPoints(member){

    return rewardPoints(member) - penaltyPoints(member);

}

/**
 * تحديث Dashboard
 */
function updatePerformanceDashboard(){

    const dashboard =
        getSheet(APP.SHEETS.DASHBOARD);

    dashboard.appendRow([]);

    dashboard.appendRow([
        "Average Productivity",
        averageProductivity()
    ]);

    dashboard.appendRow([
        "Average Quality",
        averageQuality()
    ]);

    dashboard.appendRow([
        "Average Workload",
        averageWorkload()
    ]);

}

/**
 * تحديث كامل
 */
function refreshPerformance(){

    updatePerformanceDashboard();

}

/**
 * تحديث النظام بالكامل
 */
function refreshAnalytics(){

    refreshPerformance();

    refreshKPI();

    refreshMembers();

    refreshReviews();

}