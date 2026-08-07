/**
 * Global triggers: onEdit, time-based, event-based.
 */

function onEdit(e) {
    if (!e || !e.range) return;
    
    const sheet = e.range.getSheet();
    const sheetName = sheet.getName();
    
    Logger.info('Triggers', 'Edit detected', { 
      sheet: sheetName, 
      row: e.range.getRow(), 
      col: e.range.getColumn(),
      user: Security.currentUser()
    });
    
    // Route to module-specific handlers via EventBus
    EventBus.emit('sheet:edited', {
      sheet: sheetName,
      range: e.range,
      value: e.value,
      oldValue: e.oldValue,
      user: Security.currentUser()
    });
  }
  
  function dailyTrigger() {
    Logger.info('Triggers', 'Daily workflow started');
    
    // Flush any pending logs
    Logger.flush();
    
    // Clear stale cache
    CacheService.getScriptCache().removeAll();
    
    // Emit daily event
    EventBus.emit('workflow:daily', { date: new Date().toISOString() });
    
    Logger.info('Triggers', 'Daily workflow complete');
  }
  
  function weeklyTrigger() {
    Logger.info('Triggers', 'Weekly workflow started');
    EventBus.emit('workflow:weekly', { date: new Date().toISOString() });
    Logger.info('Triggers', 'Weekly workflow complete');
  }
  
  function monthlyTrigger() {
    Logger.info('Triggers', 'Monthly workflow started');
    EventBus.emit('workflow:monthly', { date: new Date().toISOString() });
    Logger.info('Triggers', 'Monthly workflow complete');
  }