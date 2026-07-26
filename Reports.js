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
 * Reports.gs
 * Reporting Engine
 * ============================================================
 */

/**
 * إنشاء تقرير يومي
 */
function generateDailyReport(){

    return generateReport("Daily");

}

/**
 * إنشاء تقرير أسبوعي
 */
function generateWeeklyReport(){

    return generateReport("Weekly");

}

/**
 * إنشاء تقرير شهري
 */
function generateMonthlyReport(){

    return generateReport("Monthly");

}

/**
 * إنشاء التقرير
 */
function generateReport(period){

       const best = bestMember();
    const report = [
        reportId,
        period,
        Utilities.formatDate(new Date(), APP.INFO.TIMEZONE, APP.INFO.DATE_FORMAT),
        totalMembers(),
        totalTasks(),
        completedTasks(),
        getLateTasks().length,
        averageTaskScore(),
        teamAverageKPI(),
        averageProductivity(),
        averageQuality(),
        averageWorkload(),
        best ? best[1] : "",
        now()
    ];

    sheet.appendRow(report);

    return reportId;

}

/**
 * جميع التقارير
 */
function getReports(){

    const sheet = getSheet(APP.SHEETS.REPORTS);

    const data = sheet.getDataRange().getValues();

    data.shift();

    return data;

}

/**
 * آخر تقرير
 */
function latestReport(){

    const reports = getReports();

    if(reports.length===0)
        return null;

    return reports[reports.length-1];

}

/**
 * ============================================================
 * PHINOX Business Operating System
 * Reports.gs - Part 2
 * Report Export & Analytics
 * ============================================================
 */

/**
 * تقرير عضو
 * يستخدم محرك الأداء المركزي لمنع التكرار
 */
function generateMemberReport(member){

    return getMemberPerformance(member);

}

/**
 * تقرير جميع الأعضاء
 * يستخدم محرك الأداء المركزي لمنع التكرار
 */
function generateTeamReport(){

    return getPerformanceData();

}

/**
 * تقرير المهام
 */
function generateTaskReport(){

    return {

        total: totalTasks(),

        completed: completedTasks(),

        active: activeTasks(),

        pending: pendingReviewCount(),

        late: getLateTasks().length,

        averageScore: averageTaskScore()

    };

}

/**
 * Executive Summary
 */
function executiveSummary(){

      const best = bestMember();
    return {
        members: totalMembers(),
        tasks: totalTasks(),
        completed: completedTasks(),
        averageKPI: teamAverageKPI(),
        productivity: averageProductivity(),
        quality: averageQuality(),
        workload: averageWorkload(),
        bestMember: best ? best[1] : ""
    };
}

/**
 * تصدير JSON
 */
function exportJSON(){

    return JSON.stringify({

        summary: executiveSummary(),

        team: generateTeamReport(),

        tasks: generateTaskReport()

    },null,2);

}

/**
 * تصدير CSV
 */
function exportCSV(){

    const rows=[];

    rows.push([

        "Member",

        "KPI",

        "Completed",

        "Late",

        "Quality",

        "Productivity"

    ]);

    getMembers().forEach(member=>{

        rows.push([

            member[1],

            calculateMemberKPI(member[1]),

            memberCompletedTasks(member[1]),

            memberLateTasks(member[1]),

            memberQuality(member[1]),

            productivity(member[1])

        ]);

    });

    return rows
        .map(r=>r.join(","))

        .join("\n");

}

/**
 * إنشاء تقرير كامل
 */
function generateFullReport(){

    generateMonthlyReport();

    return {

        executive:

            executiveSummary(),

        team:

            generateTeamReport(),

        tasks:

            generateTaskReport()

    };

}