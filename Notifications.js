
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
 * Notifications.gs
 * Notification Engine
 * ============================================================
 */

/**
 * خريطة أعمدة الإشعارات
 */
const NOTIF_COL = {
  NOTIF_ID: 0,
  TYPE: 1,
  MEMBER: 2,
  TITLE: 3,
  MESSAGE: 4,
  STATUS: 5,
  CREATED_AT: 6,
  SENT_AT: 7
};

/**
 * إنشاء إشعار
 */
function createNotification(type, member, title, message){

    const sheet = getSheet(APP.SHEETS.NOTIFICATIONS);

    const id = generateId("NOT");

    sheet.appendRow([

        id,

        type,

        member,

        title,

        message,

        "Pending",

        now(),

        ""

    ]);

    return id;

}

/**
 * جميع الإشعارات
 */
function getNotifications(){

    const sheet = getSheet(APP.SHEETS.NOTIFICATIONS);

    const data = sheet.getDataRange().getValues();

    data.shift();

    return data;

}

/**
 * إشعارات عضو
 */
function getMemberNotifications(member){

    return getNotifications().filter(n=>

        n[NOTIF_COL.MEMBER]===member

    );

}

/**
 * إشعار جديد للمهمة
 */
function notifyTaskAssigned(taskId, member){

    const task = getTask(taskId);

    createNotification(

        "Task",

        member,

        "New Task Assigned",

        "Task: "+task[1]

    );

}

/**
 * إشعار اعتماد
 */
function notifyTaskApproved(taskId){

    const task = getTask(taskId);

    createNotification(

        "Review",

        task[3],

        "Task Approved",

        task[1]

    );

}

/**
 * إشعار رفض
 */
function notifyTaskRejected(taskId){

    const task = getTask(taskId);

    createNotification(

        "Review",

        task[3],

        "Task Rejected",

        task[1]

    );

}

/**
 * إشعار انتهاء موعد
 */
function notifyDeadline(taskId){

    const task = getTask(taskId);

    createNotification(

        "Deadline",

        task[3],

        "Deadline Reminder",

        task[1]

    );

}

/**
 * ============================================================
 * Notifications.gs - Part 2
 * Delivery & Notification Management
 * ============================================================
 */

/**
 * تحديث إشعار
 */
function updateNotification(id, updates){

    const sheet = getSheet(APP.SHEETS.NOTIFICATIONS);

    const data = sheet.getDataRange().getValues();

    for(let i=1; i<data.length; i++){

        if(data[i][NOTIF_COL.NOTIF_ID] === id){

            const row = data[i];

            const map = {
                type: NOTIF_COL.TYPE,
                member: NOTIF_COL.MEMBER,
                title: NOTIF_COL.TITLE,
                message: NOTIF_COL.MESSAGE,
                status: NOTIF_COL.STATUS,
                sentAt: NOTIF_COL.SENT_AT
            };

            Object.keys(updates).forEach(key=>{

                if(map[key]!==undefined){

                    row[map[key]] = updates[key];

                }

            });

            sheet.getRange(i+1, 1, 1, row.length).setValues([row]);

            return true;

        }

    }

    return false;

}

/**
 * إرسال بريد إلكتروني
 */
function sendEmailNotification(notificationId){

    const notification = getNotification(notificationId);

    if(!notification)
        return false;

    const member = getMember(notification[NOTIF_COL.MEMBER]);

    if(!member || !member[3])
        return false;

    GmailApp.sendEmail(

        member[3],

        notification[NOTIF_COL.TITLE],

        notification[NOTIF_COL.MESSAGE]

    );

    markNotificationSent(notificationId);

    return true;

}

/**
 * إرسال جميع الإشعارات المعلقة
 */
function sendPendingNotifications(){

    getNotifications()

    .filter(n=>n[NOTIF_COL.STATUS]==="Pending")

    .forEach(n=>{

        sendEmailNotification(n[NOTIF_COL.NOTIF_ID]);

    });

}

/**
 * الحصول على إشعار
 */
function getNotification(id){

    return getNotifications()

        .find(n=>n[NOTIF_COL.NOTIF_ID]===id);

}

/**
 * تعليم الإشعار كمرسل
 */
function markNotificationSent(id){

    updateNotification(id,{

        status:"Sent",

        sentAt:now()

    });

}

/**
 * تعليم كمقروء
 */
function markNotificationRead(id){

    updateNotification(id,{

        status:"Read"

    });

}

/**
 * إشعار جماعي
 */
function broadcastNotification(title,message){

    activeMembers()

    .forEach(member=>{

        createNotification(

            "Broadcast",

            member[1],

            title,

            message

        );

    });

}

/**
 * إشعار KPI منخفض
 */
function notifyLowPerformance(member){

    createNotification(

        "Performance",

        member,

        "Performance Alert",

        "Your KPI is below the acceptable threshold."

    );

}

/**
 * فحص الأداء
 */
function checkPerformanceAlerts(){

    activeMembers()

    .forEach(member=>{

        if(calculateMemberKPI(member[1])<70){

            notifyLowPerformance(member[1]);

        }

    });

}

/**
 * تحديث لوحة الإشعارات
 */
function refreshNotifications(){

    sendPendingNotifications();

    checkPerformanceAlerts();

}