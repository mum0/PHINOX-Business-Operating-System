// ═══════════════════════════════════════════════════════════════════════
// PHINOX BOS v5 — Members Module (AUDIT v3 FIXED 2026-08-31)
// ═══════════════════════════════════════════════════════════════════════
// FIX: MEMBER_COL.ID renamed to MEMBER_ID (matches 13_Permissions.js)
// FIX: Removed self-contained claim — now depends on 13_Permissions.js MEMBER_COL
// ═══════════════════════════════════════════════════════════════════════

/* ───────────────────────────────────────────
 0. SCHEMA & COLUMN INDICES
 ─────────────────────────────────────────── */

// ⚠️ UNIFIED MEMBER_COL — MUST match 13_Permissions.js exactly
// If 13_Permissions.js is loaded first (alphabetical order), this re-declares
// the same keys. In GAS V8, the last `var` wins, so keys MUST be identical.
var MEMBER_COL = {
  MEMBER_ID: 0, FULL_NAME: 1, ROLE: 2, EMAIL: 3, PHONE: 4, STATUS: 5,
  JOIN_DATE: 6, KPI_SCORE: 7, TASKS_COMPLETED: 8, TASKS_LATE: 9,
  AVERAGE_QUALITY: 10, NOTES: 11, DEPARTMENT: 12, PASSWORD_HASH: 13
};

var MEMBER_SCHEMA = {
  id: 1, fullName: 2, role: 3, email: 4, phone: 5, status: 6,
  joinDate: 7, kpiScore: 8, tasksCompleted: 9, tasksLate: 10,
  averageQuality: 11, notes: 12, department: 13, passwordHash: 14
};

var _memberRepo = null;

/* ───────────────────────────────────────────
 1. SAFE STRING HELPER (prevents "illegal value in property: 0")
 ─────────────────────────────────────────── */

function _safeString(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Error) return "#ERROR";
  if (value instanceof Date) {
    try {
      return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
    } catch (e) {
      return String(value);
    }
  }
  return String(value).trim();
}

function _safeNumber(value) {
  var n = Number(value);
  return isNaN(n) ? 0 : n;
}

/* ───────────────────────────────────────────
 2. SHEET & REPOSITORY
 ─────────────────────────────────────────── */

function _ensureMemberSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Members');
  if (!sheet) {
    sheet = ss.insertSheet('Members');
    var headers = ['id','fullName','role','email','phone','status','joinDate','kpiScore','tasksCompleted','tasksLate','averageQuality','notes','department','passwordHash'];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#1a237e')
      .setFontColor('#ffffff');
    for (var i = 1; i <= headers.length; i++) sheet.setColumnWidth(i, 20);
    console.log('[Members] Sheet created with 14 columns');
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

/* ───────────────────────────────────────────
 3. ARRAY ↔ OBJECT MAPPING (with sanitization)
 ─────────────────────────────────────────── */

function _memberObjectToArray(obj) {
  var arr = new Array(14).fill('');
  arr[MEMBER_COL.MEMBER_ID] = _safeString(obj.id);
  arr[MEMBER_COL.FULL_NAME] = _safeString(obj.fullName || obj.name);
  arr[MEMBER_COL.ROLE] = _safeString(obj.role);
  arr[MEMBER_COL.EMAIL] = _safeString(obj.email);
  arr[MEMBER_COL.PHONE] = _safeString(obj.phone);
  arr[MEMBER_COL.STATUS] = _safeString(obj.status || 'Active');
  arr[MEMBER_COL.JOIN_DATE] = _safeString(obj.joinDate || new Date().toISOString().split('T')[0]);
  arr[MEMBER_COL.KPI_SCORE] = _safeNumber(obj.kpiScore);
  arr[MEMBER_COL.TASKS_COMPLETED] = _safeNumber(obj.tasksCompleted);
  arr[MEMBER_COL.TASKS_LATE] = _safeNumber(obj.tasksLate);
  arr[MEMBER_COL.AVERAGE_QUALITY] = _safeNumber(obj.averageQuality);
  arr[MEMBER_COL.NOTES] = _safeString(obj.notes);
  arr[MEMBER_COL.DEPARTMENT] = _safeString(obj.department);
  arr[MEMBER_COL.PASSWORD_HASH] = _safeString(obj.passwordHash);
  return arr;
}

function _sanitizeMemberArray(arr) {
  if (!arr || !Array.isArray(arr)) return arr;
  var out = new Array(arr.length);
  for (var i = 0; i < arr.length; i++) {
    out[i] = _safeString(arr[i]);
  }
  return out;
}

/* ───────────────────────────────────────────
 4. CRUD OPERATIONS
 ─────────────────────────────────────────── */

function addMember(member) {
  if (!member || !member.name) {
    throw new Error("Member name is required");
  }
  if (!member.email) {
    throw new Error("Member email is required");
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
  console.log('[Members] Member created: ' + created.id + ' / ' + created.name);
  return created.id;
}

function getMembers() {
  var all = [];
  var offset = 0;
  var page;
  do {
    page = _getMemberRepo().findAll({ limit: 1000, offset: offset });
    all = all.concat(page.data.map(_memberObjectToArray).map(_sanitizeMemberArray));
    offset += 1000;
  } while (page.hasMore);
  return all;
}

function getMember(name) {
  var found = _getMemberRepo().findOne(function(m) { return m.name === name; });
  return found ? _sanitizeMemberArray(_memberObjectToArray(found)) : null;
}

function getMemberById(id) {
  var found = _getMemberRepo().findById(id);
  return found ? _sanitizeMemberArray(_memberObjectToArray(found)) : null;
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
  console.log('[Members] Member updated: ' + id);
  return true;
}

function deleteMember(id) {
  _getMemberRepo().delete(id);
  console.log('[Members] Member deleted: ' + id);
  return true;
}

/* ───────────────────────────────────────────
 5. QUERIES & FILTERS
 ─────────────────────────────────────────── */

function activeMembers() {
  return getMembers().filter(function(m) {
    return _safeString(m[MEMBER_COL.STATUS]).toLowerCase() === 'active';
  });
}

function inactiveMembers() {
  return getMembers().filter(function(m) {
    return _safeString(m[MEMBER_COL.STATUS]).toLowerCase() !== 'active';
  });
}

function totalMembers() {
  return _getMemberRepo().count();
}

function getMemberByEmail(email) {
  if (!email) return null;
  var search = _safeString(email).toLowerCase();
  var found = _getMemberRepo().findOne(function(m) {
    return _safeString(m.email).toLowerCase() === search;
  });
  return found ? _sanitizeMemberArray(_memberObjectToArray(found)) : null;
}

/* ───────────────────────────────────────────
 6. WORKLOAD & PERFORMANCE
 ─────────────────────────────────────────── */

function memberTaskCount(member) {
  var name = Array.isArray(member) ? _safeString(member[MEMBER_COL.FULL_NAME]) : member;
  if (typeof getMemberTasks === 'function') {
    try { return getMemberTasks(name).length; } catch(e) {}
  }
  if (Array.isArray(member)) return _safeNumber(member[MEMBER_COL.TASKS_COMPLETED]);
  return 0;
}

function memberActiveTasks(member) {
  var name = Array.isArray(member) ? _safeString(member[MEMBER_COL.FULL_NAME]) : member;
  if (typeof getMemberTasks === 'function') {
    try {
      return getMemberTasks(name).filter(function(task) {
        var status = _safeString(task[6]);
        return status === 'In Progress' || status === 'Waiting Review' || status === 'Not Started';
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
      assignTask(taskId, _safeString(member[MEMBER_COL.FULL_NAME]));
      return true;
    } catch(e) {
      console.log('[Members] autoAssignTask failed: ' + e.message);
    }
  }
  return false;
}

function getMemberTaskStats(memberName, startDate, endDate) {
  var result;
  if (startDate || endDate) {
    result = TaskService.getTasksByAssigneeAndDateRange(memberName, startDate, endDate);
  } else {
    result = TaskService.getTasksByMember(memberName);
  }
  var tasks = result && result.data ? result.data : [];
  var total = tasks.length;
  var approved = 0, active = 0, totalWeightedScore = 0, totalQuality = 0;
  tasks.forEach(function(t) {
    if (t.status === 'Approved') approved++;
    if (t.status === 'In Progress') active++;
    totalWeightedScore += _safeNumber(t.weightedScore);
    totalQuality += _safeNumber(t.quality);
  });
  return {
    name: memberName,
    totalTasks: total,
    approvedTasks: approved,
    activeTasks: active,
    averageWeightedScore: total > 0 ? Math.round((totalWeightedScore / total) * 100) / 100 : 0,
    averageQuality: total > 0 ? Math.round((totalQuality / total) * 100) / 100 : 0
  };
}

/* ───────────────────────────────────────────
 7. RANKINGS (fixed: no mutation of original arrays)
 ─────────────────────────────────────────── */

function topProductiveMembers(limit) {
  limit = limit || 5;
  var members = getMembers().slice();
  members.sort(function(a, b) {
    return _safeNumber(b[MEMBER_COL.KPI_SCORE]) - _safeNumber(a[MEMBER_COL.KPI_SCORE]);
  });
  return members.slice(0, limit).map(_sanitizeMemberArray);
}

function mostLateMembers(limit) {
  limit = limit || 5;
  var members = getMembers().slice();
  members.sort(function(a, b) {
    return _safeNumber(b[MEMBER_COL.TASKS_LATE]) - _safeNumber(a[MEMBER_COL.TASKS_LATE]);
  });
  return members.slice(0, limit).map(_sanitizeMemberArray);
}

function lowestQualityMembers(limit) {
  limit = limit || 5;
  var members = getMembers().slice();
  members.sort(function(a, b) {
    return _safeNumber(a[MEMBER_COL.AVERAGE_QUALITY]) - _safeNumber(b[MEMBER_COL.AVERAGE_QUALITY]);
  });
  return members.slice(0, limit).map(_sanitizeMemberArray);
}

/* ───────────────────────────────────────────
 8. DASHBOARD & REFRESH
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

/* ───────────────────────────────────────────
 9. GLOBAL EXPORT
 ─────────────────────────────────────────── */

var Members = {
  addMember: addMember,
  getMembers: getMembers,
  getMember: getMember,
  getMemberById: getMemberById,
  getMemberByEmail: getMemberByEmail,
  updateMember: updateMember,
  deleteMember: deleteMember,
  activeMembers: activeMembers,
  inactiveMembers: inactiveMembers,
  totalMembers: totalMembers,
  getMemberTaskStats: getMemberTaskStats,
  topProductiveMembers: topProductiveMembers,
  mostLateMembers: mostLateMembers,
  lowestQualityMembers: lowestQualityMembers,
  getAvailableMember: getAvailableMember,
  memberWorkload: memberWorkload,
  isMemberAvailable: isMemberAvailable,
  autoAssignTask: autoAssignTask,
  refreshMembers: refreshMembers,
  refreshMembersDashboard: refreshMembersDashboard,
  memberTaskCount: memberTaskCount,
  memberActiveTasks: memberActiveTasks,
  SCHEMA: MEMBER_SCHEMA,
  COL: MEMBER_COL
};
