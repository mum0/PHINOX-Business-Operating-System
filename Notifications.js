/**
 * ============================================================
 * PHINOX Business Operating System
 * Notifications.gs
 * Notification Engine
 * ============================================================
 */

const NOTIF_COL = {
    NOTIF_ID: 0, TYPE: 1, MEMBER: 2, TITLE: 3, MESSAGE: 4,
    STATUS: 5, CREATED_AT: 6, SENT_AT: 7
  };
  
  function createNotification(type, member, title, message){
      const sheet = getSheet(APP.SHEETS.NOTIFICATIONS);
      const id = generateId("NOT");
      sheet.appendRow([id, type, member, title, message, "Pending", now(), ""]);
      return id;
  }
  
  function getNotifications(){
      const sheet = getSheet(APP.SHEETS.NOTIFICATIONS);
      const data = sheet.getDataRange().getValues();
      data.shift();
      return data;
  }
  
  function getMemberNotifications(member){
      return getNotifications().filter(n => n[NOTIF_COL.MEMBER] === member);
  }
  
  function notifyTaskAssigned(taskId, member){
      const task = getTask(taskId);
      createNotification(t("notif_type_task"), member, t("task_new_assigned"), t("task_new_assigned") + ": " + task[1]);
  }
  
  function notifyTaskApproved(taskId){
      const task = getTask(taskId);
      createNotification(t("notif_type_review"), task[3], t("task_approved"), task[1]);
  }
  
  function notifyTaskRejected(taskId){
      const task = getTask(taskId);
      createNotification(t("notif_type_review"), task[3], t("task_rejected"), task[1]);
  }
  
  function notifyDeadline(taskId){
      const task = getTask(taskId);
      createNotification(t("notif_type_deadline"), task[3], t("task_deadline"), task[1]);
  }
  
  function updateNotification(id, updates){
      const sheet = getSheet(APP.SHEETS.NOTIFICATIONS);
      const data = sheet.getDataRange().getValues();
      for(let i = 1; i < data.length; i++){
          if(data[i][NOTIF_COL.NOTIF_ID] === id){
              const row = data[i];
              const map = {type:1, member:2, title:3, message:4, status:5, sentAt:7};
              Object.keys(updates).forEach(key => {
                  if(map[key] !== undefined) row[map[key]] = updates[key];
              });
              sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
              return true;
          }
      }
      return false;
  }
  
  function sendEmailNotification(notificationId){
      const notification = getNotification(notificationId);
      if(!notification) return false;
      const member = getMember(notification[NOTIF_COL.MEMBER]);
      if(!member || !member[3]) return false;
      GmailApp.sendEmail(member[3], notification[NOTIF_COL.TITLE], notification[NOTIF_COL.MESSAGE]);
      markNotificationSent(notificationId);
      return true;
  }
  
  function sendPendingNotifications(){
      getNotifications().filter(n => n[NOTIF_COL.STATUS] === "Pending").forEach(n => {
          sendEmailNotification(n[NOTIF_COL.NOTIF_ID]);
      });
  }
  
  function getNotification(id){
      return getNotifications().find(n => n[NOTIF_COL.NOTIF_ID] === id);
  }
  
  function markNotificationSent(id){
      updateNotification(id, {status:"Sent", sentAt:now()});
  }
  
  function markNotificationRead(id){
      updateNotification(id, {status:"Read"});
  }
  
  function broadcastNotification(title, message){
      activeMembers().forEach(member => {
          createNotification(t("notif_type_broadcast"), member[1], title, message);
      });
  }
  
  function notifyLowPerformance(member){
      createNotification(t("notif_type_performance"), member, t("notif_low_performance"), t("notif_low_performance_msg"));
  }
  
  function checkPerformanceAlerts(){
      activeMembers().forEach(member => {
          if(calculateMemberKPI(member[1]) < 70){
              notifyLowPerformance(member[1]);
          }
      });
  }
  
  function refreshNotifications(){
      sendPendingNotifications();
      checkPerformanceAlerts();
  }