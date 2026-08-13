// ═══════════════════════════════════════════════════════════════
// PHASE 9 — FRONTEND FUNCTIONAL STABILIZATION PATCH KIT
// File: UI_Index.html  |  Branch: v5-enterprise
// ═══════════════════════════════════════════════════════════════
// 
// INSTRUCTION: Append this entire block BEFORE the closing </script> tag
// that appears immediately BEFORE </body></html> at the end of UI_Index.html
//
// If your file ends with:
//   </script>
// </body>
// </html>
//
// Insert this code BEFORE the first </script> (the one closing the main JS block)
// ═══════════════════════════════════════════════════════════════

// ─── CUSTOM DATE RANGE ───
function openCustomDateModal() {
  document.getElementById('customDateModal').style.display = 'flex';
}
function closeCustomDateModal() {
  document.getElementById('customDateModal').style.display = 'none';
}
function applyCustomDateRange() {
  var start = document.getElementById('customDateStart').value;
  var end = document.getElementById('customDateEnd').value;
  if (!start || !end) {
    showToast('Error', 'Please select both start and end dates', 'error');
    return;
  }
  if (new Date(start) > new Date(end)) {
    showToast('Error', 'Start date must be before end date', 'error');
    return;
  }
  AppState.dateRange = 'custom';
  document.querySelectorAll('.date-btn').forEach(function(b) { b.classList.remove('active'); });
  var customBtn = document.querySelector('.date-btn[data-range="custom"]');
  if (customBtn) customBtn.classList.add('active');
  closeCustomDateModal();
  if (AppState.currentPage) loadPageData(AppState.currentPage);
}

// ─── VIEW FUNCTIONS ───
function viewMember(id) {
  var m = (AppState.membersData || []).find(function(x) { return x[0] === id; });
  if (!m) { showToast('Error', 'Member not found', 'error'); return; }
  openModal('Member Details',
    '<div style="padding:16px;"><p><strong>Name:</strong> ' + esc(m[1]) + '</p>' +
    '<p><strong>Role:</strong> ' + esc(m[2]) + '</p>' +
    '<p><strong>Email:</strong> ' + esc(m[3]) + '</p>' +
    '<p><strong>Phone:</strong> ' + esc(m[4] || '-') + '</p>' +
    '<p><strong>Department:</strong> ' + esc(m[12] || 'General') + '</p>' +
    '<p><strong>Status:</strong> ' + esc(m[5]) + '</p>' +
    '<p><strong>KPI Score:</strong> ' + formatNumber(m[7], 1) + '</p>' +
    '<p><strong>Tasks Completed:</strong> ' + (m[8] || 0) + '</p>' +
    '<p><strong>Tasks Late:</strong> ' + (m[9] || 0) + '</p>' +
    '<p><strong>Average Quality:</strong> ' + formatNumber(m[10], 1) + '</p>' +
    '<p><strong>Notes:</strong> ' + esc(m[11] || '-') + '</p></div>',
    '<button class="btn btn-outline" onclick="closeModal()">Close</button>'
  );
}
function viewTask(id) {
  var t = (AppState.tasksData || []).find(function(x) { return x.id === id; });
  if (!t) { showToast('Error', 'Task not found', 'error'); return; }
  openModal('Task Details',
    '<div style="padding:16px;"><p><strong>Title:</strong> ' + esc(t.title) + '</p>' +
    '<p><strong>Assigned To:</strong> ' + esc(t.assignedTo) + '</p>' +
    '<p><strong>Priority:</strong> ' + esc(t.priority) + '</p>' +
    '<p><strong>Status:</strong> ' + esc(t.status) + '</p>' +
    '<p><strong>Due Date:</strong> ' + formatDate(t.dueDate) + '</p>' +
    '<p><strong>Completion:</strong> ' + (t.completion || 0) + '%</p>' +
    '<p><strong>Task Score:</strong> ' + formatNumber(t.taskScore, 1) + '</p>' +
    '<p><strong>Description:</strong> ' + esc(t.description || '-') + '</p></div>',
    '<button class="btn btn-outline" onclick="closeModal()">Close</button>'
  );
}
function viewSale(id) {
  var s = (AppState.salesData || []).find(function(x) { return x.id === id; });
  if (!s) { showToast('Error', 'Sale not found', 'error'); return; }
  openModal('Sale Details',
    '<div style="padding:16px;"><p><strong>ID:</strong> ' + esc(s.id) + '</p>' +
    '<p><strong>Customer:</strong> ' + esc(s.customerEmail) + '</p>' +
    '<p><strong>Total:</strong> ' + formatCurrency(s.totalAmount) + '</p>' +
    '<p><strong>Status:</strong> ' + esc(s.status) + '</p>' +
    '<p><strong>Date:</strong> ' + formatDate(s.createdAt) + '</p></div>',
    '<button class="btn btn-outline" onclick="closeModal()">Close</button>'
  );
}
function viewOrder(id) {
  var o = (AppState.ordersData || []).find(function(x) { return x.id === id; });
  if (!o) { showToast('Error', 'Order not found', 'error'); return; }
  openModal('Order Details',
    '<div style="padding:16px;"><p><strong>ID:</strong> ' + esc(o.id) + '</p>' +
    '<p><strong>Customer:</strong> ' + esc(o.customerEmail) + '</p>' +
    '<p><strong>Total:</strong> ' + formatCurrency(o.totalAmount) + '</p>' +
    '<p><strong>Status:</strong> ' + esc(o.status) + '</p>' +
    '<p><strong>Date:</strong> ' + formatDate(o.createdAt) + '</p></div>',
    '<button class="btn btn-outline" onclick="closeModal()">Close</button>'
  );
}
function viewInventory(id) {
  var items = AppState.inventoryData || [];
  var item = items.find(function(x) { return x.id === id; });
  if (!item) { showToast('Error', 'Item not found', 'error'); return; }
  openModal('Inventory Item',
    '<div style="padding:16px;"><p><strong>SKU:</strong> ' + esc(item.sku) + '</p>' +
    '<p><strong>Name:</strong> ' + esc(item.name) + '</p>' +
    '<p><strong>Category:</strong> ' + esc(item.category) + '</p>' +
    '<p><strong>Quantity:</strong> ' + formatNumber(item.quantity, 0) + '</p>' +
    '<p><strong>Reserved:</strong> ' + formatNumber(item.reserved, 0) + '</p>' +
    '<p><strong>Available:</strong> ' + formatNumber(item.available, 0) + '</p>' +
    '<p><strong>Cost:</strong> ' + formatCurrency(item.cost) + '</p>' +
    '<p><strong>Price:</strong> ' + formatCurrency(item.price) + '</p>' +
    '<p><strong>Status:</strong> ' + esc(item.status) + '</p></div>',
    '<button class="btn btn-outline" onclick="closeModal()">Close</button>'
  );
}
function viewMarketing(id) {
  var recs = AppState.marketingData || [];
  var r = recs.find(function(x) { return x.id === id; });
  if (!r) { showToast('Error', 'Record not found', 'error'); return; }
  openModal('Marketing Record',
    '<div style="padding:16px;"><p><strong>Date:</strong> ' + formatDate(r.date) + '</p>' +
    '<p><strong>Platform:</strong> ' + esc(r.platform) + '</p>' +
    '<p><strong>Campaign:</strong> ' + esc(r.campaignName || '-') + '</p>' +
    '<p><strong>Spend:</strong> ' + formatCurrency(r.spend) + '</p>' +
    '<p><strong>Impressions:</strong> ' + formatNumber(r.impressions, 0) + '</p>' +
    '<p><strong>Clicks:</strong> ' + formatNumber(r.clicks, 0) + '</p>' +
    '<p><strong>Conversions:</strong> ' + formatNumber(r.conversions, 0) + '</p>' +
    '<p><strong>Revenue:</strong> ' + formatCurrency(r.attributedRevenue) + '</p></div>',
    '<button class="btn btn-outline" onclick="closeModal()">Close</button>'
  );
}
function viewSocial(id) {
  var recs = AppState.socialData || [];
  var r = recs.find(function(x) { return x.id === id; });
  if (!r) { showToast('Error', 'Record not found', 'error'); return; }
  openModal('Social Record',
    '<div style="padding:16px;"><p><strong>Date:</strong> ' + formatDate(r.date) + '</p>' +
    '<p><strong>Platform:</strong> ' + esc(r.platform) + '</p>' +
    '<p><strong>Followers:</strong> ' + formatNumber(r.followers, 0) + '</p>' +
    '<p><strong>Reach:</strong> ' + formatNumber(r.reach, 0) + '</p>' +
    '<p><strong>Engagements:</strong> ' + formatNumber(r.engagements, 0) + '</p>' +
    '<p><strong>Likes:</strong> ' + formatNumber(r.likes, 0) + '</p>' +
    '<p><strong>Revenue:</strong> ' + formatCurrency(r.attributedRevenue) + '</p></div>',
    '<button class="btn btn-outline" onclick="closeModal()">Close</button>'
  );
}
function viewSatisfaction(id) {
  var recs = AppState.satisfactionData || [];
  var r = recs.find(function(x) { return x.id === id; });
  if (!r) { showToast('Error', 'Record not found', 'error'); return; }
  openModal('Satisfaction Record',
    '<div style="padding:16px;"><p><strong>Customer:</strong> ' + esc(r.customerEmail) + '</p>' +
    '<p><strong>Order:</strong> ' + esc(r.orderId || '-') + '</p>' +
    '<p><strong>Score:</strong> ' + r.score + '/10</p>' +
    '<p><strong>Category:</strong> ' + esc(r.category || 'Overall') + '</p>' +
    '<p><strong>Notes:</strong> ' + esc(r.notes || '-') + '</p>' +
    '<p><strong>Date:</strong> ' + formatDate(r.createdAt) + '</p></div>',
    '<button class="btn btn-outline" onclick="closeModal()">Close</button>'
  );
}
function viewNPS(id) {
  var recs = AppState.npsData || [];
  var r = recs.find(function(x) { return x.id === id; });
  if (!r) { showToast('Error', 'Record not found', 'error'); return; }
  openModal('NPS Record',
    '<div style="padding:16px;"><p><strong>Customer:</strong> ' + esc(r.customerEmail) + '</p>' +
    '<p><strong>Score:</strong> ' + r.score + '/10</p>' +
    '<p><strong>Category:</strong> ' + esc(r.category || 'Overall') + '</p>' +
    '<p><strong>Notes:</strong> ' + esc(r.notes || '-') + '</p>' +
    '<p><strong>Date:</strong> ' + formatDate(r.createdAt) + '</p></div>',
    '<button class="btn btn-outline" onclick="closeModal()">Close</button>'
  );
}

// ─── EDIT FUNCTIONS ───
function editMember(id) {
  var m = (AppState.membersData || []).find(function(x) { return x[0] === id; });
  if (!m) { showToast('Error', 'Member not found', 'error'); return; }
  openModal('Edit Member',
    '<div class="form-group"><label>Name *</label><input type="text" class="form-input" id="editMemberName" value="' + esc(m[1]) + '"></div>' +
    '<div class="form-group"><label>Role *</label><input type="text" class="form-input" id="editMemberRole" value="' + esc(m[2]) + '"></div>' +
    '<div class="form-group"><label>Email *</label><input type="email" class="form-input" id="editMemberEmail" value="' + esc(m[3]) + '"></div>' +
    '<div class="form-group"><label>Phone</label><input type="text" class="form-input" id="editMemberPhone" value="' + esc(m[4] || '') + '"></div>' +
    '<div class="form-group"><label>Department</label><input type="text" class="form-input" id="editMemberDept" value="' + esc(m[12] || '') + '"></div>' +
    '<div class="form-group"><label>Status</label><select class="form-select" id="editMemberStatus"><option value="Active"' + (m[5] === 'Active' ? ' selected' : '') + '>Active</option><option value="Inactive"' + (m[5] === 'Inactive' ? ' selected' : '') + '>Inactive</option></select></div>',
    '<button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" onclick="submitEditMember(\'' + id + '\')">Save Changes</button>'
  );
}
function submitEditMember(id) {
  var data = {
    name: document.getElementById('editMemberName').value.trim(),
    role: document.getElementById('editMemberRole').value.trim(),
    email: document.getElementById('editMemberEmail').value.trim(),
    phone: document.getElementById('editMemberPhone').value.trim(),
    department: document.getElementById('editMemberDept').value.trim(),
    status: document.getElementById('editMemberStatus').value
  };
  if (!data.name || !data.role || !data.email) {
    showToast('Error', 'Name, Role, and Email are required', 'error'); return;
  }
  callServer('uiUpdateMember', id, data)
    .then(function() { showToast('Success', 'Member updated', 'success'); closeModal(); loadMembers(); })
    .catch(function(err) { showToast('Error', err.message, 'error'); });
}

function editTask(id) {
  var t = (AppState.tasksData || []).find(function(x) { return x.id === id; });
  if (!t) { showToast('Error', 'Task not found', 'error'); return; }
  var dueStr = '';
  if (t.dueDate) {
    try { dueStr = new Date(t.dueDate).toISOString().split('T')[0]; } catch(e) {}
  }
  openModal('Edit Task',
    '<div class="form-group"><label>Title *</label><input type="text" class="form-input" id="editTaskTitle" value="' + esc(t.title) + '"></div>' +
    '<div class="form-group"><label>Assigned To</label><input type="text" class="form-input" id="editTaskAssigned" value="' + esc(t.assignedTo || '') + '"></div>' +
    '<div class="form-group"><label>Priority</label><select class="form-select" id="editTaskPriority"><option value="Low"' + (t.priority === 'Low' ? ' selected' : '') + '>Low</option><option value="Medium"' + (t.priority === 'Medium' ? ' selected' : '') + '>Medium</option><option value="High"' + (t.priority === 'High' ? ' selected' : '') + '>High</option><option value="Critical"' + (t.priority === 'Critical' ? ' selected' : '') + '>Critical</option></select></div>' +
    '<div class="form-group"><label>Status</label><select class="form-select" id="editTaskStatus"><option value="Not Started"' + (t.status === 'Not Started' ? ' selected' : '') + '>Not Started</option><option value="In Progress"' + (t.status === 'In Progress' ? ' selected' : '') + '>In Progress</option><option value="Waiting Review"' + (t.status === 'Waiting Review' ? ' selected' : '') + '>Waiting Review</option><option value="Approved"' + (t.status === 'Approved' ? ' selected' : '') + '>Approved</option></select></div>' +
    '<div class="form-group"><label>Due Date</label><input type="date" class="form-input" id="editTaskDueDate" value="' + dueStr + '"></div>' +
    '<div class="form-group"><label>Completion %</label><input type="number" class="form-input" id="editTaskCompletion" min="0" max="100" value="' + (t.completion || 0) + '"></div>' +
    '<div class="form-group"><label>Description</label><textarea class="form-input" id="editTaskDescription" rows="3">' + esc(t.description || '') + '</textarea></div>',
    '<button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" onclick="submitEditTask(\'' + id + '\')">Save Changes</button>'
  );
}
function submitEditTask(id) {
  var data = {
    title: document.getElementById('editTaskTitle').value.trim(),
    assignedTo: document.getElementById('editTaskAssigned').value.trim(),
    priority: document.getElementById('editTaskPriority').value,
    status: document.getElementById('editTaskStatus').value,
    dueDate: document.getElementById('editTaskDueDate').value,
    completion: parseInt(document.getElementById('editTaskCompletion').value) || 0,
    description: document.getElementById('editTaskDescription').value.trim()
  };
  if (!data.title) { showToast('Error', 'Title is required', 'error'); return; }
  callServer('uiUpdateTask', id, data)
    .then(function() { showToast('Success', 'Task updated', 'success'); closeModal(); loadTasks(getDateRange(AppState.dateRange)); })
    .catch(function(err) { showToast('Error', err.message, 'error'); });
}

function editCustomer(id) {
  var c = (AppState.customersData || []).find(function(x) { return x.id === id; });
  if (!c) { showToast('Error', 'Customer not found', 'error'); return; }
  openModal('Edit Customer',
    '<div class="form-group"><label>Name *</label><input type="text" class="form-input" id="editCustomerName" value="' + esc(c.name) + '"></div>' +
    '<div class="form-group"><label>Email *</label><input type="email" class="form-input" id="editCustomerEmail" value="' + esc(c.email) + '"></div>' +
    '<div class="form-group"><label>Phone</label><input type="text" class="form-input" id="editCustomerPhone" value="' + esc(c.phone || '') + '"></div>' +
    '<div class="form-group"><label>Status</label><select class="form-select" id="editCustomerStatus"><option value="Active"' + (c.status === 'Active' ? ' selected' : '') + '>Active</option><option value="Inactive"' + (c.status === 'Inactive' ? ' selected' : '') + '>Inactive</option><option value="Churned"' + (c.status === 'Churned' ? ' selected' : '') + '>Churned</option></select></div>' +
    '<div class="form-group"><label>Segment</label><input type="text" class="form-input" id="editCustomerSegment" value="' + esc(c.segment || '') + '"></div>',
    '<button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" onclick="submitEditCustomer(\'' + id + '\')">Save Changes</button>'
  );
}
function submitEditCustomer(id) {
  var data = {
    name: document.getElementById('editCustomerName').value.trim(),
    email: document.getElementById('editCustomerEmail').value.trim(),
    phone: document.getElementById('editCustomerPhone').value.trim(),
    status: document.getElementById('editCustomerStatus').value,
    segment: document.getElementById('editCustomerSegment').value.trim()
  };
  if (!data.name || !data.email) { showToast('Error', 'Name and Email are required', 'error'); return; }
  callServer('uiUpdateCustomer', id, data)
    .then(function() { showToast('Success', 'Customer updated', 'success'); closeModal(); loadCustomers(getDateRange(AppState.dateRange)); })
    .catch(function(err) { showToast('Error', err.message, 'error'); });
}

// ─── DELETE FUNCTIONS ───
function confirmDelete(title, message, onConfirm) {
  openModal(title,
    '<div style="padding:16px;text-align:center;"><p style="font-size:16px;margin-bottom:20px;">' + message + '</p></div>',
    '<button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-danger" onclick="closeModal();(' + onConfirm + ')();">Delete</button>'
  );
}
function deleteMember(id) {
  confirmDelete('Delete Member', 'Are you sure you want to delete this member? This action cannot be undone.', function() {
    return function() {
      callServer('uiDeleteMember', id)
        .then(function() { showToast('Success', 'Member deleted', 'success'); loadMembers(); })
        .catch(function(err) { showToast('Error', err.message, 'error'); });
    };
  }());
}
function deleteTask(id) {
  confirmDelete('Delete Task', 'Are you sure you want to delete this task? This action cannot be undone.', function() {
    return function() {
      callServer('uiDeleteTask', id)
        .then(function() { showToast('Success', 'Task deleted', 'success'); loadTasks(getDateRange(AppState.dateRange)); })
        .catch(function(err) { showToast('Error', err.message, 'error'); });
    };
  }());
}
function deleteCustomer(id) {
  confirmDelete('Delete Customer', 'Are you sure you want to delete this customer? This action cannot be undone.', function() {
    return function() {
      callServer('uiDeleteCustomer', id)
        .then(function() { showToast('Success', 'Customer deleted', 'success'); loadCustomers(getDateRange(AppState.dateRange)); })
        .catch(function(err) { showToast('Error', err.message, 'error'); });
    };
  }());
}

// ─── MISSING ADD MODAL FUNCTIONS ───
function openAddCustomerModal() {
  openModal('Add Customer',
    '<div class="form-group"><label>Name *</label><input type="text" class="form-input" id="addCustomerName" placeholder="Customer name"></div>' +
    '<div class="form-group"><label>Email *</label><input type="email" class="form-input" id="addCustomerEmail" placeholder="email@example.com"></div>' +
    '<div class="form-group"><label>Phone</label><input type="text" class="form-input" id="addCustomerPhone" placeholder="+966 50 000 0000"></div>' +
    '<div class="form-group"><label>Status</label><select class="form-select" id="addCustomerStatus"><option value="Active">Active</option><option value="Inactive">Inactive</option></select></div>' +
    '<div class="form-group"><label>Segment</label><input type="text" class="form-input" id="addCustomerSegment" placeholder="e.g. Premium"></div>',
    '<button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" onclick="submitAddCustomer()">Create Customer</button>'
  );
}
function submitAddCustomer() {
  var data = {
    name: document.getElementById('addCustomerName').value.trim(),
    email: document.getElementById('addCustomerEmail').value.trim(),
    phone: document.getElementById('addCustomerPhone').value.trim(),
    status: document.getElementById('addCustomerStatus').value,
    segment: document.getElementById('addCustomerSegment').value.trim()
  };
  if (!data.name || !data.email) { showToast('Error', 'Name and Email are required', 'error'); return; }
  callServer('uiCreateCustomer', data)
    .then(function() { showToast('Success', 'Customer created', 'success'); closeModal(); loadCustomers(getDateRange(AppState.dateRange)); })
    .catch(function(err) { showToast('Error', err.message, 'error'); });
}

function openAddSaleModal() {
  openModal('Add Sale',
    '<div class="form-group"><label>Customer Email *</label><input type="email" class="form-input" id="addSaleCustomer" placeholder="customer@example.com"></div>' +
    '<div class="form-group"><label>Total Amount *</label><input type="number" class="form-input" id="addSaleTotal" placeholder="0.00" step="0.01"></div>' +
    '<div class="form-group"><label>Status</label><select class="form-select" id="addSaleStatus"><option value="Pending">Pending</option><option value="Delivered">Delivered</option><option value="Cancelled">Cancelled</option></select></div>',
    '<button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" onclick="submitAddSale()">Create Sale</button>'
  );
}
function submitAddSale() {
  var data = {
    customerEmail: document.getElementById('addSaleCustomer').value.trim(),
    totalAmount: parseFloat(document.getElementById('addSaleTotal').value) || 0,
    status: document.getElementById('addSaleStatus').value
  };
  if (!data.customerEmail || data.totalAmount <= 0) { showToast('Error', 'Valid customer email and amount are required', 'error'); return; }
  callServer('uiCreateSale', data)
    .then(function() { showToast('Success', 'Sale created', 'success'); closeModal(); loadSales(getDateRange(AppState.dateRange)); })
    .catch(function(err) { showToast('Error', err.message, 'error'); });
}

function openAddOrderModal() {
  openModal('Add Order',
    '<div class="form-group"><label>Customer Email *</label><input type="email" class="form-input" id="addOrderCustomer" placeholder="customer@example.com"></div>' +
    '<div class="form-group"><label>Total Amount *</label><input type="number" class="form-input" id="addOrderTotal" placeholder="0.00" step="0.01"></div>' +
    '<div class="form-group"><label>Status</label><select class="form-select" id="addOrderStatus"><option value="Pending">Pending</option><option value="Processing">Processing</option><option value="Shipped">Shipped</option><option value="Delivered">Delivered</option><option value="Cancelled">Cancelled</option></select></div>',
    '<button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" onclick="submitAddOrder()">Create Order</button>'
  );
}
function submitAddOrder() {
  var data = {
    customerEmail: document.getElementById('addOrderCustomer').value.trim(),
    totalAmount: parseFloat(document.getElementById('addOrderTotal').value) || 0,
    status: document.getElementById('addOrderStatus').value
  };
  if (!data.customerEmail || data.totalAmount <= 0) { showToast('Error', 'Valid customer email and amount are required', 'error'); return; }
  callServer('uiCreateOrder', data)
    .then(function() { showToast('Success', 'Order created', 'success'); closeModal(); loadOrders(getDateRange(AppState.dateRange)); })
    .catch(function(err) { showToast('Error', err.message, 'error'); });
}

function openAddTaskModal() {
  openModal('Add Task',
    '<div class="form-group"><label>Title *</label><input type="text" class="form-input" id="addTaskTitle" placeholder="Task title"></div>' +
    '<div class="form-group"><label>Assigned To</label><input type="text" class="form-input" id="addTaskAssigned" placeholder="Member email"></div>' +
    '<div class="form-group"><label>Priority</label><select class="form-select" id="addTaskPriority"><option value="Low">Low</option><option value="Medium" selected>Medium</option><option value="High">High</option><option value="Critical">Critical</option></select></div>' +
    '<div class="form-group"><label>Due Date</label><input type="date" class="form-input" id="addTaskDueDate"></div>' +
    '<div class="form-group"><label>Description</label><textarea class="form-input" id="addTaskDescription" rows="3" placeholder="Task description..."></textarea></div>',
    '<button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" onclick="submitAddTask()">Create Task</button>'
  );
}
function submitAddTask() {
  var data = {
    title: document.getElementById('addTaskTitle').value.trim(),
    assignedTo: document.getElementById('addTaskAssigned').value.trim(),
    priority: document.getElementById('addTaskPriority').value,
    dueDate: document.getElementById('addTaskDueDate').value,
    description: document.getElementById('addTaskDescription').value.trim()
  };
  if (!data.title) { showToast('Error', 'Title is required', 'error'); return; }
  callServer('uiCreateTask', data)
    .then(function() { showToast('Success', 'Task created', 'success'); closeModal(); loadTasks(getDateRange(AppState.dateRange)); })
    .catch(function(err) { showToast('Error', err.message, 'error'); });
}

function openAddMarketingModal() {
  openModal('Add Marketing Record',
    '<div class="form-group"><label>Date *</label><input type="date" class="form-input" id="addMarketingDate"></div>' +
    '<div class="form-group"><label>Platform *</label><input type="text" class="form-input" id="addMarketingPlatform" placeholder="e.g. Facebook, Google"></div>' +
    '<div class="form-group"><label>Campaign Name</label><input type="text" class="form-input" id="addMarketingCampaign" placeholder="Campaign name"></div>' +
    '<div class="form-group"><label>Spend (SAR)</label><input type="number" class="form-input" id="addMarketingSpend" placeholder="0.00" step="0.01"></div>' +
    '<div class="form-group"><label>Impressions</label><input type="number" class="form-input" id="addMarketingImpressions" placeholder="0"></div>' +
    '<div class="form-group"><label>Clicks</label><input type="number" class="form-input" id="addMarketingClicks" placeholder="0"></div>' +
    '<div class="form-group"><label>Conversions</label><input type="number" class="form-input" id="addMarketingConversions" placeholder="0"></div>' +
    '<div class="form-group"><label>Attributed Revenue (SAR)</label><input type="number" class="form-input" id="addMarketingRevenue" placeholder="0.00" step="0.01"></div>',
    '<button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" onclick="submitAddMarketing()">Create Record</button>'
  );
  var d = document.getElementById('addMarketingDate');
  if (d) d.valueAsDate = new Date();
}
function submitAddMarketing() {
  var data = {
    date: document.getElementById('addMarketingDate').value,
    platform: document.getElementById('addMarketingPlatform').value.trim(),
    campaignName: document.getElementById('addMarketingCampaign').value.trim(),
    spend: parseFloat(document.getElementById('addMarketingSpend').value) || 0,
    impressions: parseInt(document.getElementById('addMarketingImpressions').value) || 0,
    clicks: parseInt(document.getElementById('addMarketingClicks').value) || 0,
    conversions: parseInt(document.getElementById('addMarketingConversions').value) || 0,
    attributedRevenue: parseFloat(document.getElementById('addMarketingRevenue').value) || 0
  };
  if (!data.date || !data.platform) { showToast('Error', 'Date and Platform are required', 'error'); return; }
  callServer('uiCreateMarketingRecord', data)
    .then(function() { showToast('Success', 'Marketing record created', 'success'); closeModal(); loadMarketing(getDateRange(AppState.dateRange)); })
    .catch(function(err) { showToast('Error', err.message, 'error'); });
}

function openAddSocialModal() {
  openModal('Add Social Record',
    '<div class="form-group"><label>Date *</label><input type="date" class="form-input" id="addSocialDate"></div>' +
    '<div class="form-group"><label>Platform *</label><input type="text" class="form-input" id="addSocialPlatform" placeholder="e.g. Instagram, Twitter"></div>' +
    '<div class="form-group"><label>Followers</label><input type="number" class="form-input" id="addSocialFollowers" placeholder="0"></div>' +
    '<div class="form-group"><label>Reach</label><input type="number" class="form-input" id="addSocialReach" placeholder="0"></div>' +
    '<div class="form-group"><label>Engagements</label><input type="number" class="form-input" id="addSocialEngagements" placeholder="0"></div>' +
    '<div class="form-group"><label>Likes</label><input type="number" class="form-input" id="addSocialLikes" placeholder="0"></div>' +
    '<div class="form-group"><label>Attributed Revenue (SAR)</label><input type="number" class="form-input" id="addSocialRevenue" placeholder="0.00" step="0.01"></div>',
    '<button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" onclick="submitAddSocial()">Create Record</button>'
  );
  var d = document.getElementById('addSocialDate');
  if (d) d.valueAsDate = new Date();
}
function submitAddSocial() {
  var data = {
    date: document.getElementById('addSocialDate').value,
    platform: document.getElementById('addSocialPlatform').value.trim(),
    followers: parseInt(document.getElementById('addSocialFollowers').value) || 0,
    reach: parseInt(document.getElementById('addSocialReach').value) || 0,
    engagements: parseInt(document.getElementById('addSocialEngagements').value) || 0,
    likes: parseInt(document.getElementById('addSocialLikes').value) || 0,
    attributedRevenue: parseFloat(document.getElementById('addSocialRevenue').value) || 0
  };
  if (!data.date || !data.platform) { showToast('Error', 'Date and Platform are required', 'error'); return; }
  callServer('uiCreateSocialRecord', data)
    .then(function() { showToast('Success', 'Social record created', 'success'); closeModal(); loadSocial(getDateRange(AppState.dateRange)); })
    .catch(function(err) { showToast('Error', err.message, 'error'); });
}

function openAddSatisfactionModal() {
  openModal('Add Satisfaction Record',
    '<div class="form-group"><label>Customer Email *</label><input type="email" class="form-input" id="addSatCustomer" placeholder="customer@example.com"></div>' +
    '<div class="form-group"><label>Order ID</label><input type="text" class="form-input" id="addSatOrder" placeholder="Order ID"></div>' +
    '<div class="form-group"><label>Score (1-10) *</label><input type="number" class="form-input" id="addSatScore" min="1" max="10" placeholder="8"></div>' +
    '<div class="form-group"><label>Category</label><input type="text" class="form-input" id="addSatCategory" placeholder="e.g. Product Quality"></div>' +
    '<div class="form-group"><label>Notes</label><textarea class="form-input" id="addSatNotes" rows="3" placeholder="Additional feedback..."></textarea></div>',
    '<button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" onclick="submitAddSatisfaction()">Create Record</button>'
  );
}
function submitAddSatisfaction() {
  var data = {
    customerEmail: document.getElementById('addSatCustomer').value.trim(),
    orderId: document.getElementById('addSatOrder').value.trim(),
    score: parseInt(document.getElementById('addSatScore').value) || 0,
    category: document.getElementById('addSatCategory').value.trim(),
    notes: document.getElementById('addSatNotes').value.trim()
  };
  if (!data.customerEmail || data.score < 1 || data.score > 10) { showToast('Error', 'Valid customer email and score (1-10) are required', 'error'); return; }
  callServer('uiCreateSatisfaction', data)
    .then(function() { showToast('Success', 'Satisfaction record created', 'success'); closeModal(); loadSatisfaction(getDateRange(AppState.dateRange)); })
    .catch(function(err) { showToast('Error', err.message, 'error'); });
}

function openAddNpsModal() {
  openModal('Add NPS Record',
    '<div class="form-group"><label>Customer Email *</label><input type="email" class="form-input" id="addNpsCustomer" placeholder="customer@example.com"></div>' +
    '<div class="form-group"><label>Score (0-10) *</label><input type="number" class="form-input" id="addNpsScore" min="0" max="10" placeholder="9"></div>' +
    '<div class="form-group"><label>Category</label><input type="text" class="form-input" id="addNpsCategory" placeholder="e.g. Service"></div>' +
    '<div class="form-group"><label>Notes</label><textarea class="form-input" id="addNpsNotes" rows="3" placeholder="Additional feedback..."></textarea></div>',
    '<button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" onclick="submitAddNPS()">Create Record</button>'
  );
}
function submitAddNPS() {
  var data = {
    customerEmail: document.getElementById('addNpsCustomer').value.trim(),
    score: parseInt(document.getElementById('addNpsScore').value) || 0,
    category: document.getElementById('addNpsCategory').value.trim(),
    notes: document.getElementById('addNpsNotes').value.trim()
  };
  if (!data.customerEmail || data.score < 0 || data.score > 10) { showToast('Error', 'Valid customer email and score (0-10) are required', 'error'); return; }
  callServer('uiCreateNPS', data)
    .then(function() { showToast('Success', 'NPS record created', 'success'); closeModal(); loadNPS(getDateRange(AppState.dateRange)); })
    .catch(function(err) { showToast('Error', err.message, 'error'); });
}

// ═══════════════════════════════════════════════════════════════
// END PHASE 9 PATCH KIT
// ═══════════════════════════════════════════════════════════════
