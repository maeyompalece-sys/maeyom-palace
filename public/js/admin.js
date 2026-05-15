// ============================================================
// 👨‍🍳 Admin JS - หน้าแอดมิน/ครัว (Polling แทน Realtime)
// ============================================================

const adminState = {
    orders: [],
    tables: [],
    filterStatus: 'active',
    filterType: 'all',
    searchQuery: '',
    soundEnabled: true,
    autoPrint: false,
    lastSeenOrderIds: new Set(),
    poller: null,
    lastUpdate: null,
};

// ============================================================
// 🚀 Init
// ============================================================
document.addEventListener('DOMContentLoaded', init);

async function init() {
    if (!checkConfig()) return;

    // โหลด settings จาก localStorage
    adminState.soundEnabled = localStorage.getItem('admin_sound') !== 'false';
    adminState.autoPrint = localStorage.getItem('admin_autoprint') === 'true';

    const soundToggle = document.getElementById('sound-toggle');
    const autoPrintToggle = document.getElementById('auto-print');
    if (soundToggle) soundToggle.checked = adminState.soundEnabled;
    if (autoPrintToggle) autoPrintToggle.checked = adminState.autoPrint;

    // ผูก event listeners (ทำก่อน load data เพื่อไม่ให้พลาด)
    bindEvents();

    // ขออนุญาต Notification
    if ('Notification' in window && Notification.permission === 'default') {
        try { Notification.requestPermission(); } catch(e) {}
    }

    // โหลดข้อมูลครั้งแรก
    await loadInitial();

    // เริ่ม polling
    startPolling();
}

// ============================================================
// 🎯 Event Bindings (ทุกปุ่มที่นี่ — ใช้ event delegation สำหรับ dynamic content)
// ============================================================
function bindEvents() {
    // === Top toggles ===
    const soundToggle = document.getElementById('sound-toggle');
    if (soundToggle) {
        soundToggle.addEventListener('change', (e) => {
            adminState.soundEnabled = e.target.checked;
            localStorage.setItem('admin_sound', adminState.soundEnabled);
            notifier.showToast(adminState.soundEnabled ? '🔔 เปิดเสียง' : '🔕 ปิดเสียง', 'info', 1500);
            // ปลดล็อค audio
            if (adminState.soundEnabled) notifier.playSuccessSound();
        });
    }

    const autoPrintToggle = document.getElementById('auto-print');
    if (autoPrintToggle) {
        autoPrintToggle.addEventListener('change', (e) => {
            adminState.autoPrint = e.target.checked;
            localStorage.setItem('admin_autoprint', adminState.autoPrint);
            notifier.showToast(adminState.autoPrint ? '🖨️ เปิดปริ้นอัตโนมัติ' : 'ปิดปริ้นอัตโนมัติ', 'info', 1500);
        });
    }

    // === Status filter tabs ===
    document.querySelectorAll('[data-status-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            adminState.filterStatus = btn.dataset.statusFilter;
            updateFilterButtons();
            renderOrders();
        });
    });

    // === Type filter ===
    document.querySelectorAll('[data-type-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            adminState.filterType = btn.dataset.typeFilter;
            updateFilterButtons();
            renderOrders();
        });
    });

    // === Refresh button ===
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', async () => {
        refreshBtn.disabled = true;
        try {
            await loadInitial();
            notifier.showToast('✓ รีเฟรชแล้ว', 'success', 1200);
        } catch (e) {
            notifier.showToast('รีเฟรชล้มเหลว', 'error');
        } finally {
            refreshBtn.disabled = false;
        }
    });

    // === Search ===
    const searchInput = document.getElementById('searchCustomer');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            adminState.searchQuery = e.target.value.trim().toLowerCase();
            renderOrders();
        });
    }
    const clearSearch = document.getElementById('btnClearSearch');
    if (clearSearch) {
        clearSearch.addEventListener('click', () => {
            adminState.searchQuery = '';
            if (searchInput) searchInput.value = '';
            renderOrders();
        });
    }

    // === Event delegation สำหรับปุ่มในการ์ดออเดอร์ (dynamic) ===
    const ordersContainer = document.getElementById('orders-container');
    if (ordersContainer) {
        ordersContainer.addEventListener('click', handleOrderAction);
    }
}

function handleOrderAction(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    e.stopPropagation();
    const action = btn.dataset.action;
    const orderId = btn.dataset.orderId;
    if (!orderId && action !== 'noop') return;

    switch (action) {
        case 'next-status':   advanceStatus(orderId, btn.dataset.next); break;
        case 'complete-now':  completeNow(orderId); break;
        case 'cancel':        cancelOrder(orderId); break;
        case 'print':         printOrder(orderId); break;
        case 'delete-order':  deleteOrder(orderId); break;
        case 'call-customer':
            const phone = btn.dataset.phone;
            if (phone) window.location.href = 'tel:' + phone;
            break;
    }
}

// ============================================================
// 📥 Load Initial Data
// ============================================================
async function loadInitial() {
    try {
        const [orders, tables] = await Promise.all([
            API.getOrders({ status: 'all', date: 'today', limit: 200 }),
            API.getTables()
        ]);
        adminState.orders = orders || [];
        adminState.tables = tables || [];
        // เก็บ id ที่เห็นไว้ (ไม่ให้แจ้งซ้ำในครั้งแรก)
        adminState.orders.forEach(o => adminState.lastSeenOrderIds.add(o.id));
        adminState.lastUpdate = new Date().toISOString();

        updateSummary();
        renderOrders();
    } catch (err) {
        console.error(err);
        notifier.showToast('โหลดข้อมูลล้มเหลว: ' + err.message, 'error', 5000);
    }
}

// ============================================================
// 🔁 Polling
// ============================================================
function startPolling() {
    if (adminState.poller) adminState.poller.stop();
    adminState.poller = new Poller(pollUpdates, CONFIG.ADMIN_POLL_INTERVAL);
    adminState.poller.start();

    // หยุด polling เมื่อแท็บไม่ active เพื่อประหยัด quota
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            adminState.poller && adminState.poller.stop();
        } else {
            adminState.poller && adminState.poller.start();
            pollUpdates();  // เรียกทันที 1 ครั้ง
        }
    });
}

async function pollUpdates() {
    try {
        const result = await API.getOrdersSince(adminState.lastUpdate || new Date(Date.now() - 86400000).toISOString());
        adminState.lastUpdate = result.serverTime;

        const newOrders = result.orders || [];
        if (newOrders.length === 0) return;

        let hasNewOrder = false;

        newOrders.forEach(order => {
            const existingIdx = adminState.orders.findIndex(o => o.id === order.id);
            if (existingIdx >= 0) {
                // อัปเดตออเดอร์เดิม
                adminState.orders[existingIdx] = order;
            } else {
                // ออเดอร์ใหม่
                adminState.orders.unshift(order);
                if (!adminState.lastSeenOrderIds.has(order.id)) {
                    adminState.lastSeenOrderIds.add(order.id);
                    hasNewOrder = true;

                    // เสียงดัง + Notification
                    if (adminState.soundEnabled) {
                        notifier.playLoudNewOrder();
                    }
                    notifier.showToast(
                        '🔔 ออเดอร์ใหม่! ' +
                        (order.table_number ? 'โต๊ะ ' + order.table_number : 'กลับบ้าน') +
                        ' - ' + order.customer_name,
                        'order',
                        6000
                    );
                    notifier.notifyBrowser('🔔 ออเดอร์ใหม่!', {
                        body: (order.table_number ? 'โต๊ะ ' + order.table_number : 'กลับบ้าน') + ' • ' + order.customer_name,
                        tag: 'new-order-' + order.id,
                        requireInteraction: true
                    });

                    // ปริ้นอัตโนมัติ
                    if (adminState.autoPrint) {
                        setTimeout(() => {
                            autoPrintOrder(order.id);
                        }, 800);
                    }
                }
            }
        });

        updateSummary();
        renderOrders();
    } catch (err) {
        console.warn('Poll error:', err.message);
    }
}

// ============================================================
// 📊 Summary
// ============================================================
function updateSummary() {
    const all = adminState.orders;
    const counts = {
        pending: all.filter(o => o.status === 'pending').length,
        cooking: all.filter(o => o.status === 'cooking').length,
        ready: all.filter(o => o.status === 'ready').length,
    };
    const today = all.filter(o => !['cancelled'].includes(o.status));
    const todayCount = today.length;
    const todayRevenue = today.reduce((s, o) => s + (parseFloat(o.total_amount) || 0), 0);

    setText('count-pending', counts.pending);
    setText('count-cooking', counts.cooking);
    setText('count-ready', counts.ready);
    setText('count-today', todayCount);
    setText('revenue-today', '฿' + formatPrice(todayRevenue));
}

function updateFilterButtons() {
    document.querySelectorAll('[data-status-filter]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.statusFilter === adminState.filterStatus);
    });
    document.querySelectorAll('[data-type-filter]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.typeFilter === adminState.filterType);
    });
}

// ============================================================
// 🎨 Render Orders
// ============================================================
function renderOrders() {
    const c = document.getElementById('orders-container');
    if (!c) return;

    let orders = adminState.orders.slice();

    // Filter status
    if (adminState.filterStatus === 'active') {
        orders = orders.filter(o => !['completed','cancelled'].includes(o.status));
    } else if (adminState.filterStatus !== 'all') {
        orders = orders.filter(o => o.status === adminState.filterStatus);
    }

    // Filter type
    if (adminState.filterType !== 'all') {
        orders = orders.filter(o => o.order_type === adminState.filterType);
    }

    // Filter by search query
    if (adminState.searchQuery) {
        const q = adminState.searchQuery;
        orders = orders.filter(o =>
            (o.customer_name || '').toLowerCase().includes(q) ||
            (o.customer_phone || '').includes(q) ||
            (o.order_number || '').toLowerCase().includes(q) ||
            (o.table_number !== undefined && String(o.table_number).includes(q))
        );
    }

    // Sort: ที่ยังไม่จบขึ้นก่อน (เรียงเก่าก่อน), ที่จบแล้วลงล่าง
    orders.sort((a, b) => {
        const aDone = ['completed','cancelled'].includes(a.status);
        const bDone = ['completed','cancelled'].includes(b.status);
        if (aDone !== bDone) return aDone ? 1 : -1;
        if (!aDone) return String(a.created_at).localeCompare(String(b.created_at));
        return String(b.created_at).localeCompare(String(a.created_at));
    });

    if (orders.length === 0) {
        c.innerHTML = '<div class="empty-state" style="text-align:center;padding:60px 20px;color:#888;"><div style="font-size:64px;">📭</div><h3 style="font-family:\'Cormorant Garamond\',serif;color:#651713;">ยังไม่มีออเดอร์</h3></div>';
        return;
    }

    c.innerHTML = orders.map(renderOrderCard).join('');
}

function renderOrderCard(order) {
    const status = ORDER_STATUS[order.status] || ORDER_STATUS.pending;
    const type = ORDER_TYPE[order.order_type] || ORDER_TYPE.dine_in;
    const isDone = ['completed','cancelled'].includes(order.status);

    const items = (order.items || []).map(it =>
        '<div class="order-item-row"><span>' + (it.quantity || 1) + '× ' + escapeHtml(it.name || '-') + '</span>' +
        '<span>฿' + formatPrice((it.price || 0) * (it.quantity || 1)) + '</span></div>' +
        (it.note ? '<div class="order-item-note">📝 ' + escapeHtml(it.note) + '</div>' : '')
    ).join('');

    const time = new Date(order.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    let actions = '';
    if (status.next) {
        actions += '<button class="btn btn-emerald" data-action="next-status" data-order-id="' + order.id + '" data-next="' + status.next + '">' +
                   '➡️ ' + (ORDER_STATUS[status.next] ? ORDER_STATUS[status.next].label : status.next) + '</button>';
    }
    if (!isDone) {
        // ปุ่มลัด "เสร็จสิ้น" — ข้ามขั้นตอนกลางทั้งหมด
        actions += ' <button class="btn btn-complete" data-action="complete-now" data-order-id="' + order.id + '" title="จบออเดอร์นี้ทันที">✅ เสร็จสิ้น</button>';
        actions += ' <button class="btn btn-ghost" data-action="cancel" data-order-id="' + order.id + '">❌ ยกเลิก</button>';
    }
    actions += ' <button class="btn btn-gold" data-action="print" data-order-id="' + order.id + '">🖨️ ปริ้น</button>';
    actions += ' <button class="btn btn-ghost" data-action="delete-order" data-order-id="' + order.id + '" style="color:#c33;border-color:#fca5a5;min-width:42px;" title="ลบออเดอร์">🗑️ ลบ</button>';

    return `
        <div class="order-card ${isDone ? 'done' : ''}" data-order-id="${order.id}">
            <div class="order-card-head">
                <div class="order-num">#${escapeHtml(order.order_number || '')}</div>
                <div class="order-time">⏰ ${time}</div>
            </div>
            <div class="order-tags">
                <span class="status-badge" style="background:${status.color}22;color:${status.color};border-color:${status.color}55;">
                    ${status.icon} ${status.label}
                </span>
                <span class="type-pill" style="background:${type.color}22;color:${type.color};">${type.icon} ${type.label}</span>
                ${order.table_number ? `<span class="table-pill">🪑 โต๊ะ ${order.table_number}</span>` : ''}
            </div>
            <div class="order-customer">
                👤 <strong>${escapeHtml(order.customer_name)}</strong>
                <button class="customer-phone" data-action="call-customer" data-phone="${escapeHtml(order.customer_phone)}">
                    📞 ${escapeHtml(order.customer_phone)}
                </button>
            </div>
            <div class="order-items-list">${items || '<em>(ไม่มีรายการ)</em>'}</div>
            ${order.notes ? '<div class="order-notes">📝 ' + escapeHtml(order.notes) + '</div>' : ''}
            <div class="order-total"><span>รวม</span><strong>฿${formatPrice(order.total_amount)}</strong></div>
            <div class="order-actions">${actions}</div>
        </div>
    `;
}

// ============================================================
// 🔄 Order Actions
// ============================================================
async function completeNow(orderId) {
    if (!confirm('ยืนยันจบออเดอร์นี้เลย?\n(จะเปลี่ยนสถานะเป็น "จัดส่งเสร็จสิ้น" ทันที)')) return;
    try {
        await API.updateOrderStatus(orderId, 'completed');
        const idx = adminState.orders.findIndex(o => o.id === orderId);
        if (idx !== -1) adminState.orders[idx].status = 'completed';
        renderOrders();
        notifier.showToast('✅ จบออเดอร์เรียบร้อย', 'success', 2000);
    } catch (err) {
        notifier.showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    }
}

async function advanceStatus(orderId, nextStatus) {
    if (!orderId || !nextStatus) return;
    try {
        await API.updateOrderStatus(orderId, nextStatus);
        // อัปเดต local state ทันทีก่อน poll จะจับได้
        const idx = adminState.orders.findIndex(o => o.id === orderId);
        if (idx >= 0) {
            adminState.orders[idx].status = nextStatus;
            updateSummary();
            renderOrders();
        }
        notifier.showToast('✓ อัปเดตเป็น "' + (ORDER_STATUS[nextStatus] ? ORDER_STATUS[nextStatus].label : nextStatus) + '"', 'success', 1500);
        notifier.playStatusChangeSound();
    } catch (err) {
        console.error(err);
        notifier.showToast('อัปเดตล้มเหลว: ' + err.message, 'error');
    }
}

async function cancelOrder(orderId) {
    if (!confirm('ยืนยันยกเลิกออเดอร์นี้?')) return;
    try {
        await API.updateOrderStatus(orderId, 'cancelled');
        const idx = adminState.orders.findIndex(o => o.id === orderId);
        if (idx >= 0) {
            adminState.orders[idx].status = 'cancelled';
            updateSummary();
            renderOrders();
        }
        notifier.showToast('ยกเลิกออเดอร์แล้ว', 'info');
    } catch (err) {
        notifier.showToast('ยกเลิกล้มเหลว: ' + err.message, 'error');
    }
}

async function deleteOrder(orderId) {
    const order = adminState.orders.find(o => o.id === orderId);
    const num = order ? order.order_number : orderId;
    if (!confirm('🗑️ ลบออเดอร์ #' + num + ' ออกจากระบบถาวร?\n(ใช้สำหรับลบข้อมูลทดสอบ)')) return;
    try {
        await API.deleteOrder({ id: orderId });
        adminState.orders = adminState.orders.filter(o => o.id !== orderId);
        adminState.lastSeenOrderIds.delete(orderId);
        updateSummary();
        renderOrders();
        notifier.showToast('✓ ลบออเดอร์แล้ว', 'success');
    } catch (err) {
        notifier.showToast('ลบล้มเหลว: ' + err.message, 'error');
    }
}

function printOrder(orderId) {
    window.open('print.html?id=' + orderId, '_blank', 'width=420,height=720');
}

function autoPrintOrder(orderId) {
    // ใช้ iframe แทน window.open เพื่อหลีกเลี่ยง popup block
    let iframe = document.getElementById('auto-print-frame');
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'auto-print-frame';
        iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:420px;height:720px;border:none;';
        document.body.appendChild(iframe);
    }
    iframe.src = 'print.html?id=' + orderId + '&auto=1';
    iframe.onload = function() {
        try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        } catch(e) {
            window.open('print.html?id=' + orderId + '&auto=1', '_blank', 'width=420,height=720');
        }
    };
}

// ============================================================
// 🔧 Helpers
// ============================================================
function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}
function formatPrice(n) { return Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

window.addEventListener('beforeunload', () => {
    if (adminState.poller) adminState.poller.stop();
});
