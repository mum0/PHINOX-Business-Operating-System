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
 * Members.gs - Part 1
 * Team Management Engine
 * ============================================================
 */

/**
 * إضافة عضو
 */
function addMember(member){

    if(!isValidEmail(member.email))
        throw new Error("Invalid Email");

    const sheet = getSheet(APP.SHEETS.MEMBERS);

    sheet.appendRow([

        generateId("MEM"),

        member.name,

        member.role,

        member.email,

        member.phone,

        "Active",

        now(),

        0,

        0,

        0,

        0,

        ""

    ]);

}

/**
 * جميع الأعضاء
 */
function getMembers(){

    const sheet = getSheet(APP.SHEETS.MEMBERS);

    const data = sheet.getDataRange().getValues();

    data.shift();

    return data;

}

/**
 * البحث بالاسم
 */
function getMember(name){

    const members = getMembers();

    for(const member of members){

        if(member[1] === name){

            return member;

        }

    }

    return null;

}

/**
 * البحث بواسطة ID
 */
function getMemberById(id){

    const members = getMembers();

    for(const member of members){

        if(member[0] === id){

            return member;

        }

    }

    return null;

}

/**
 * تحديث عضو
 */
function updateMember(id,data){

    const sheet = getSheet(APP.SHEETS.MEMBERS);

    const values = sheet.getDataRange().getValues();

    for(let i=1;i<values.length;i++){

        if(values[i][0]===id){

            if(data.name!==undefined)
                values[i][1]=data.name;

            if(data.role!==undefined)
                values[i][2]=data.role;

            if(data.email!==undefined)
                values[i][3]=data.email;

            if(data.phone!==undefined)
                values[i][4]=data.phone;

            if(data.status!==undefined)
                values[i][5]=data.status;

            if(data.notes!==undefined)
                values[i][11]=data.notes;

            sheet.getRange(i+1,1,1,values[i].length)
                 .setValues([values[i]]);

            return true;

        }

    }

    return false;

}

/**
 * حذف عضو
 */
function deleteMember(id){

    const sheet = getSheet(APP.SHEETS.MEMBERS);

    const values = sheet.getDataRange().getValues();

    for(let i=1;i<values.length;i++){

        if(values[i][0]===id){

            sheet.deleteRow(i+1);

            return true;

        }

    }

    return false;

}

/**
 * أعضاء نشطون
 */
function activeMembers(){

    return getMembers().filter(

        m=>m[5]==="Active"

    );

}

/**
 * أعضاء غير نشطين
 */
function inactiveMembers(){

    return getMembers().filter(

        m=>m[5]!=="Active"

    );

}

/**
 * عدد الأعضاء
 */
function totalMembers(){

    return getMembers().length;

}
/**
 * ============================================================
 * PHINOX Business Operating System
 * Members.gs - Part 2
 * Workload & Performance
 * ============================================================
 */

/**
 * عدد المهام المسندة للعضو
 */
function memberTaskCount(member){

    return getMemberTasks(member).length;

}

/**
 * المهام النشطة
 */
function memberActiveTasks(member){

    return getMemberTasks(member).filter(task=>

        task[6]===APP.TASK_STATUS.IN_PROGRESS ||

        task[6]===APP.TASK_STATUS.WAITING_REVIEW ||

        task[6]===APP.TASK_STATUS.NOT_STARTED

    ).length;

}

/**
 * نسبة إشغال العضو
 */
function memberWorkload(member){

    const active = memberActiveTasks(member);

    const capacity = 10;

    return round(

        (active/capacity)*100

    );

}

/**
 * هل العضو متاح؟
 */
function isMemberAvailable(member){

    return memberWorkload(member) < 100;

}

/**
 * أفضل عضو متاح
 */
function getAvailableMember(){

    const members = activeMembers();

    let selected = null;

    let workload = 999;

    members.forEach(member=>{

        const current = memberWorkload(member[1]);

        if(current < workload){

            workload = current;

            selected = member;

        }

    });

    return selected;

}

/**
 * توزيع المهمة تلقائياً
 */
function autoAssignTask(taskId){

    const member = getAvailableMember();

    if(member===null)
        return false;

    assignTask(taskId,member[1]);

    return true;

}

/**
 * أعلى إنتاجية
 */
function topProductiveMembers(limit=5){

    const members = getMembers();

    members.sort((a,b)=>{

        return b[7]-a[7];

    });

    return members.slice(0,limit);

}

/**
 * الأكثر تأخيراً
 */
function mostLateMembers(limit=5){

    const members = getMembers();

    members.sort((a,b)=>{

        return b[9]-a[9];

    });

    return members.slice(0,limit);

}

/**
 * أقل جودة
 */
function lowestQualityMembers(limit=5){

    const members = getMembers();

    members.sort((a,b)=>{

        return a[10]-b[10];

    });

    return members.slice(0,limit);

}

/**
 * تحديث إحصائيات الفريق
 * يُرجع البيانات ليتم عرضها في Dashboard.gs
 */
function refreshMembersDashboard(){

    return [

        ["Members", totalMembers()],

        ["Active Members", activeMembers().length],

        ["Average Team KPI", teamAverageKPI()]

    ];

}

/**
 * تحديث كامل للأعضاء
 */
function refreshMembers(){

    // KPI يتم تحديثه عبر refreshKPI() لمنع التكرار
    refreshMembersDashboard();

}