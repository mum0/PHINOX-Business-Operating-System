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