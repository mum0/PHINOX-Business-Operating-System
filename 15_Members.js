/**
 * ============================================================
 * PHINOX BOS — Members Module (Migrated v5.0)
 * Old File: Members.gs
 * Replaces: Direct sheet access → BaseRepository
 * Benefits: O(1) lookup, no array mutation, standardized errors
 * Breaking: None. All public APIs preserved.
 * Depends: Core Layer (Phase 1), Permissions (Phase 2 Unit 1)
 * ============================================================
 */

/* ───────────────────────────────────────────
   0. SCHEMA & REPOSITORY
   ─────────────────────────────────────────── */

   var MEMBER_SCHEMA = {
    id: 1, name: 2, role: 3, email: 4, phone: 5, status: 6,
    joinDate: 7, kpiScore: 8, tasksCompleted: 9, tasksLate: 10,
    averageQuality: 11, notes: 12
  };
  
  var _memberRepo = null;
  
  function _ensureMemberSheet() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Members');
    if (!sheet) {
      sheet = ss.insertSheet('Members');
      var headers = ['id','name','role','email','phone','status','joinDate','kpiScore','tasksCompleted','tasksLate','averageQuality','notes'];
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#1a237e')
        .setFontColor('#ffffff');
      for (var i = 1; i <= headers.length; i++) sheet.setColumnWidth(i, 20);
      Logger.info('Members', 'Members sheet created with 12 columns');
    }
    return sheet;
  }
  
  function _getMemberRepo() {
    if (!_memberRepo) {
      _ensureMemberSheet();
      _memberRepo = BaseRepository.create('Members', MEMBER_SCHEMA, { eventName: 'member' });
    }
    return _memberRepo;
  }
  
  function _memberObjectToArray(obj) {
    var arr = new Array(12).fill('');
    arr[0] = obj.id || '';
    arr[1] = obj.name || '';
    arr[2] = obj.role || '';
    arr[3] = obj.email || '';
    arr[4] = obj.phone || '';
    arr[5] = obj.status || '';
    arr[6] = obj.joinDate || '';
    arr[7] = obj.kpiScore !== undefined ? obj.kpiScore : 0;
    arr[8] = obj.tasksCompleted !== undefined ? obj.tasksCompleted : 0;
    arr[9] = obj.tasksLate !== undefined ? obj.tasksLate : 0;
    arr[10] = obj.averageQuality !== undefined ? obj.averageQuality : 0;
    arr[11] = obj.notes || '';
    return arr;
  }
  
  /* ───────────────────────────────────────────
     1. CRUD OPERATIONS
     ─────────────────────────────────────────── */
  
  function addMember(member) {
    if (!member || !member.name) {
      throw ErrorHandler.validation('Member name is required', {}, 'Members');
    }
    if (!member.email) {
      throw ErrorHandler.validation('Member email is required', {}, 'Members');
    }
    
    var data = {
      name: member.name,
      role: member.role || 'viewer',
      email: member.email,
      phone: member.phone || '',
      status: 'Active',
      joinDate: new Date().toISOString(),
      kpiScore: 0,
      tasksCompleted: 0,
      tasksLate: 0,
      averageQuality: 0,
      notes: member.notes || ''
    };
    
    var created = _getMemberRepo().create(data);
    Logger.info('Members', 'Member created', { id: created.id, name: created.name });
    return created.id;
  }
  
  function getMembers() {
    var all = [];
    var offset = 0;
    var page;
    do {
      page = _getMemberRepo().findAll({ limit: 1000, offset: offset });
      all = all.concat(page.data.map(_memberObjectToArray));
      offset += 1000;
    } while (page.hasMore);
    return all;
  }
  
  function getMember(name) {
    var found = _getMemberRepo().findOne(function(m) { return m.name === name; });
    return found ? _memberObjectToArray(found) : null;
  }
  
  function getMemberById(id) {
    var found = _getMemberRepo().findById(id);
    return found ? _memberObjectToArray(found) : null;
  }
  
  function updateMember(id, data) {
    var updates = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.role !== undefined) updates.role = data.role;
    if (data.email !== undefined) updates.email = data.email;
    if (data.phone !== undefined) updates.phone = data.phone;
    if (data.status !== undefined) updates.status = data.status;
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.kpiScore !== undefined) updates.kpiScore = data.kpiScore;
    if (data.tasksCompleted !== undefined) updates.tasksCompleted = data.tasksCompleted;
    if (data.tasksLate !== undefined) updates.tasksLate = data.tasksLate;
    if (data.averageQuality !== undefined) updates.averageQuality = data.averageQuality;
    
    _getMemberRepo().update(id, updates);
    Logger.info('Members', 'Member updated', { id: id });
    return true;
  }
  
  function deleteMember(id) {
    _getMemberRepo().delete(id);
    Logger.info('Members', 'Member deleted', { id: id });
    return true;
  }
  
  /* ───────────────────────────────────────────
     2. QUERIES & FILTERS
     ─────────────────────────────────────────── */
  
  function activeMembers() {
    return getMembers().filter(function(m) { return m[MEMBER_COL.STATUS] === 'Active'; });
  }
  
  function inactiveMembers() {
    return getMembers().filter(function(m) { return m[MEMBER_COL.STATUS] !== 'Active'; });
  }
  
  function totalMembers() {
    return _getMemberRepo().count();
  }
  
  /* ───────────────────────────────────────────
     3. WORKLOAD & PERFORMANCE
     ─────────────────────────────────────────── */
  
  function memberTaskCount(member) {
    var name = Array.isArray(member) ? member[MEMBER_COL.FULL_NAME] : member;
    if (typeof getMemberTasks === 'function') {
      try { return getMemberTasks(name).length; } catch(e) {}
    }
    if (Array.isArray(member)) return member[MEMBER_COL.TASKS_COMPLETED] || 0;
    return 0;
  }
  
  function memberActiveTasks(member) {
    var name = Array.isArray(member) ? member[MEMBER_COL.FULL_NAME] : member;
    if (typeof getMemberTasks === 'function') {
      try {
        return getMemberTasks(name).filter(function(task) {
          return task[6] === 'In Progress' || task[6] === 'Waiting Review' || task[6] === 'Not Started';
        }).length;
      } catch(e) {}
    }
    return 0;
  }
  
  function memberWorkload(member) {
    var active = memberActiveTasks(member);
    var capacity = 10;
    return Math.round((active / capacity) * 100);
  }
  
  function isMemberAvailable(member) {
    return memberWorkload(member) < 100;
  }
  
  function getAvailableMember() {
    var members = activeMembers();
    var selected = null;
    var minWorkload = 999;
    
    members.forEach(function(m) {
      var wl = memberWorkload(m);
      if (wl < minWorkload) {
        minWorkload = wl;
        selected = m;
      }
    });
    
    return selected;
  }
  
  function autoAssignTask(taskId) {
    var member = getAvailableMember();
    if (!member) return false;
    if (typeof assignTask === 'function') {
      try {
        assignTask(taskId, member[MEMBER_COL.FULL_NAME]);
        return true;
      } catch(e) {
        Logger.warn('Members', 'autoAssignTask failed', { error: e.message, taskId: taskId });
      }
    }
    return false;
  }
  
  /* ───────────────────────────────────────────
     4. RANKINGS (fixed: no mutation of original arrays)
     ─────────────────────────────────────────── */
  
  function topProductiveMembers(limit) {
    limit = limit || 5;
    var members = getMembers().slice();
    members.sort(function(a, b) { return b[MEMBER_COL.KPI_SCORE] - a[MEMBER_COL.KPI_SCORE]; });
    return members.slice(0, limit);
  }
  
  function mostLateMembers(limit) {
    limit = limit || 5;
    var members = getMembers().slice();
    members.sort(function(a, b) { return b[MEMBER_COL.TASKS_LATE] - a[MEMBER_COL.TASKS_LATE]; });
    return members.slice(0, limit);
  }
  
  function lowestQualityMembers(limit) {
    limit = limit || 5;
    var members = getMembers().slice();
    members.sort(function(a, b) { return a[MEMBER_COL.AVERAGE_QUALITY] - b[MEMBER_COL.AVERAGE_QUALITY]; });
    return members.slice(0, limit);
  }
  
  /* ───────────────────────────────────────────
     5. DASHBOARD & REFRESH
     ─────────────────────────────────────────── */
  
  function refreshMembersDashboard() {
    return [
      ["Members", totalMembers()],
      ["Active Members", activeMembers().length],
      ["Average Team KPI", typeof teamAverageKPI === 'function' ? teamAverageKPI() : 0]
    ];
  }
  
  function refreshMembers() {
    refreshMembersDashboard();
  }