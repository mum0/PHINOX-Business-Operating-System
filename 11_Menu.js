/**
 * Google Sheets custom menu.
 */

function onOpen(e) {
    SpreadsheetApp.getUi()
      .createMenu('🚀 PHINOX BOS')
      .addItem('▶️ Initialize System', 'menuInitialize')
      .addItem('🧪 Run Core Tests', 'menuRunTests')
      .addSeparator()
      .addSubMenu(
        SpreadsheetApp.getUi()
          .createMenu('⚙️ Admin')
          .addItem('👤 Set My Role', 'menuSetRole')
          .addItem('📊 View Logs', 'menuViewLogs')
          .addItem('🔄 Flush Logger', 'menuFlushLogger')
      )
      .addSubMenu(
        SpreadsheetApp.getUi()
          .createMenu('🛠️ Tools')
          .addItem('🗑️ Clear Cache', 'menuClearCache')
          .addItem('📈 Build Index', 'menuBuildIndex')
      )
      .addToUi();
    
    Logger.info('Menu', 'Menu loaded for ' + Security.currentUser());
  }
  
  function menuInitialize() {
    try {
      const result = Setup.run();
      SpreadsheetApp.getUi().alert(result);
    } catch (e) {
      SpreadsheetApp.getUi().alert('Error: ' + e.message);
    }
  }
  
  function menuRunTests() {
    try {
      testCoreLayer();
      SpreadsheetApp.getUi().alert('Tests passed. Check console logs.');
    } catch (e) {
      SpreadsheetApp.getUi().alert('Test failed: ' + e.message);
    }
  }
  
  function menuSetRole() {
    const ui = SpreadsheetApp.getUi();
    const response = ui.prompt('Enter role (admin/ceo/manager/finance/marketing/warehouse/sales/viewer):');
    if (response.getSelectedButton() === ui.Button.OK) {
      const role = response.getResponseText().trim();
      try {
        Security.setUserRole(Security.currentUser(), role);
        ui.alert('Role set to: ' + role);
      } catch (e) {
        ui.alert('Error: ' + e.message);
      }
    }
  }
  
  function menuViewLogs() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Logs');
    if (sheet) ss.setActiveSheet(sheet);
  }
  
  function menuFlushLogger() {
    Logger.flush();
    SpreadsheetApp.getUi().alert('Logger flushed.');
  }
  
  function menuClearCache() {
    CacheService.getScriptCache().removeAll();
    SpreadsheetApp.getUi().alert('Cache cleared.');
  }
  
  function menuBuildIndex() {
    // Builds index for all known repositories
    const schemas = {
      'Tasks': { id: 1 },
      'Members': { id: 1 },
      'Inventory': { id: 1 },
      'Sales': { id: 1 },
      'Finance': { id: 1 }
    };
    
    Object.keys(schemas).forEach(function(sheetName) {
      try {
        const repo = BaseRepository.create(sheetName, schemas[sheetName]);
        repo.buildIndex();
      } catch (e) {
        Logger.warn('Menu', 'Index build skipped for ' + sheetName, { error: e.message });
      }
    });
    
    SpreadsheetApp.getUi().alert('Index built for available sheets.');
  }