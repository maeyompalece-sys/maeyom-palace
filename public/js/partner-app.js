// ============================================================
// 📱 Partner App JS
// ระบบรับออเดอร์สำหรับร้านพาร์ทเนอร์ (เหมือน GrabFood ฝั่งร้าน)
// ============================================================

const PARTNER = {
    id: null,
    name: null,
    token: null,
};

const PSTATE = {
    activeTab: 'new',
    orders: [],         // orders ทั้งหมดของร้านนี้
    lastOrderIds: null, // สำหรับตรวจ order ใหม่
    historyFilter: 'today',
    polling: null,
};

const STATUS_META = {
    pending:    { label: 'รอยืนยัน',     icon: '⏳', badgeClass: 'badge-pending' },
    accepted:   { label: 'รับออเดอร์แล้ว', icon: '✅', badgeClass: 'badge-accepted' },
    cooking:    { label: 'กำลังทำ',       icon: '👨‍🍳', badgeClass: 'badge-cooking' },
    ready:      { label: 'พร้อมส่ง',       icon: '🍽️', badgeClass: 'badge-ready' },
    completed:  { label: 'เสร็จสิ้น',      icon: '✨', badgeClass: 'badge-completed' },
    cancelled:  { label: 'ยกเลิก',         icon: '❌', badgeClass: 'badge-cancelled' },
};

// ============================================================
// 🚀 Init
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    // ลองโหลด session ที่บันทึกไว้
    tryRestoreSession();

    // Login button
    document.getElementById('btn-login').addEventListener('click', handleLogin);
    document.getElementById('inp-partner-pass').addEventListener('keydown', e => {
        if (e.key === 'Enter') handleLogin();
    });

    // Logout
    document.getElementById('btn-logout').addEventListener('click', handleLogout);

    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // History filter chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            PSTATE.historyFilter = chip.dataset.filter;
            renderHistory();
        });
    });

    // New order alert click
    document.getElementById('new-order-alert').addEventListener('click', () => {
        document.getElementById('new-order-alert').classList.remove('show');
        switchTab('new');
    });
});

// ============================================================
// 🔐 Auth
// ============================================================
async function handleLogin() {
    const partnerId = document.getElementById('inp-partner-id').value.trim().toUpperCase();
    const password  = document.getElementById('inp-partner-pass').value.trim();
    const errEl     = document.getElementById('login-err');
    const btn       = document.getElementById('btn-login');

    errEl.style.display = 'none';

    if (!partnerId || !password) {
        errEl.textContent = 'กรุณากรอกรหัสร้านค้าและรหัสผ่าน';
        errEl.style.display = 'block';
        return;
    }

    btn.disabled = true;
    btn.textContent = 'กำลังเข้าสู่ระบบ...';
    showLoading(true);

    try {
        const result = await API.call('partnerLogin', { partnerId, password });
        // result: { partnerId, partnerName, token }
        PARTNER.id    = result.partnerId;
        PARTNER.name  = result.partnerName;
        PARTNER.token = result.token;

        // บันทึก session
        localStorage.setItem('partner_session', JSON.stringify({
            id: PARTNER.id,
            name: PARTNER.name,
            token: PARTNER.token,
            savedAt: Date.now(),
        }));

        startApp();
    } catch (err) {
        errEl.textContent = err.message || 'รหัสร้านค้าหรือรหัสผ่านไม่ถูกต้อง';
        errEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'เข้าสู่ระบบ';
        showLoading(false);
    }
}

function handleLogout() {
    if (!confirm('ออกจากระบบ?')) return;
    localStorage.removeItem('partner_session');
    PARTNER.id = PARTNER.name = PARTNER.token = null;
    stopPolling();
    showScreen('login');
    document.getElementById('inp-partner-id').value = '';
    document.getElementById('inp-partner-pass').value = '';
}

function tryRestoreSession() {
    try {
        const saved = JSON.parse(localStorage.getItem('partner_session') || 'null');
        if (!saved) return;
        // หมด session หลัง 24 ชม.
        if (Date.now() - saved.savedAt > 86400000) {
            localStorage.removeItem('partner_session');
            return;
        }
        PARTNER.id    = saved.id;
        PARTNER.name  = saved.name;
        PARTNER.token = saved.token;
        startApp();
    } catch (e) {}
}

// ============================================================
// 🏠 App Start
// ============================================================
function startApp() {
    showScreen('app');
    document.getElementById('hdr-shop-name').textContent = PARTNER.name || PARTNER.id;
    setOnlineStatus(true);

    // โหลด orders ครั้งแรก
    fetchOrders(true);

    // เริ่ม polling ทุก 5 วินาที
    startPolling();
}

function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + name).classList.add('active');
}

// ============================================================
// 📡 Data Fetching
// ============================================================
async function fetchOrders(initial = false) {
    if (initial) showLoading(true);
    try {
        const data = await API.call('getPartnerOrders', {
            partnerId: PARTNER.id,
            token: PARTNER.token,
        });

        const newOrders = data.orders || [];
        checkNewOrders(newOrders);
        PSTATE.orders = newOrders;
        renderAll();
        setOnlineStatus(true);
    } catch (err) {
        setOnlineStatus(false);
        if (initial) showToast('โหลดออเดอร์ล้มเหลว: ' + err.message, 'error');
    } finally {
        if (initial) showLoading(false);
    }
}

function checkNewOrders(newOrders) {
    if (PSTATE.lastOrderIds === null) {
        // ครั้งแรก — แค่บันทึก ids ไว้
        PSTATE.lastOrderIds = new Set(newOrders.map(o => o.id));
        return;
    }
    const incoming = newOrders.filter(o => !PSTATE.lastOrderIds.has(o.id) && o.status === 'pending');
    if (incoming.length > 0) {
        playNotificationSound();
        showNewOrderAlert();
    }
    PSTATE.lastOrderIds = new Set(newOrders.map(o => o.id));
}

function startPolling() {
    stopPolling();
    PSTATE.polling = setInterval(() => fetchOrders(false), 5000);
}

function stopPolling() {
    if (PSTATE.polling) { clearInterval(PSTATE.polling); PSTATE.polling = null; }
}

// ============================================================
// 🎨 Rendering
// ============================================================
function renderAll() {
    renderNew();
    renderActive();
    renderHistory();
    updateBadges();
}

function renderNew() {
    const pending = PSTATE.orders.filter(o => o.status === 'pending');
    const el = document.getElementById('list-new');
    if (pending.length === 0) {
        el.innerHTML = emptyState('📭', 'ยังไม่มีออเดอร์ใหม่', 'ออเดอร์ที่ลูกค้าสั่งจะปรากฏที่นี่');
        return;
    }
    el.innerHTML = pending.map(o => orderCard(o, ['accept', 'cancel'])).join('');
    bindCardButtons(el);
}

function renderActive() {
    const active = PSTATE.orders.filter(o => ['accepted','cooking','ready'].includes(o.status));
    const el = document.getElementById('list-active');
    if (active.length === 0) {
        el.innerHTML = emptyState('👨‍🍳', 'ไม่มีออเดอร์กำลังทำ', 'ออเดอร์ที่รับแล้วจะปรากฏที่นี่');
        return;
    }
    el.innerHTML = active.map(o => {
        const actions = nextActions(o.status);
        return orderCard(o, actions);
    }).join('');
    bindCardButtons(el);
}

function renderHistory() {
    const done = PSTATE.orders.filter(o => ['completed','cancelled'].includes(o.status));
    const now = Date.now();
    const filtered = done.filter(o => {
        const t = new Date(o.created_at).getTime();
        if (PSTATE.historyFilter === 'today') {
            const start = new Date(); start.setHours(0,0,0,0);
            return t >= start.getTime();
        }
        if (PSTATE.historyFilter === 'week') return now - t < 7 * 86400000;
        return true;
    });

    const el = document.getElementById('list-history');
    if (filtered.length === 0) {
        el.innerHTML = emptyState('📋', 'ยังไม่มีประวัติออเดอร์', 'ออเดอร์ที่เสร็จหรือยกเลิกจะปรากฏที่นี่');
        return;
    }
    el.innerHTML = filtered.map(o => orderCard(o, [])).join('');
}

function nextActions(status) {
    return {
        accepted: ['cook', 'cancel'],
        cooking:  ['ready'],
        ready:    ['complete'],
    }[status] || [];
}

function updateBadges() {
    const pending = PSTATE.orders.filter(o => o.status === 'pending').length;
    const active  = PSTATE.orders.filter(o => ['accepted','cooking','ready'].includes(o.status)).length;

    const bNew = document.getElementById('badge-new');
    const bAct = document.getElementById('badge-active');

    bNew.textContent = pending;
    bNew.style.display = pending > 0 ? 'inline-flex' : 'none';
    bAct.textContent = active;
    bAct.style.display = active > 0 ? 'inline-flex' : 'none';
}

// ============================================================
// 🃏 Order Card HTML
// ============================================================
function orderCard(o, actions) {
    const meta = STATUS_META[o.status] || { label: o.status, icon: '?', badgeClass: '' };
    const dt = new Date(o.created_at);
    const timeStr = dt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const dateStr = dt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    const items = (o.items || []);
    const total = items.reduce((s, i) => s + (parseFloat(i.price) * parseInt(i.quantity)), 0);

    const itemsHtml = items.map(i => `
        <div class="order-item-row">
            <span class="order-item-name">${i.quantity}× ${esc(i.name)}${i.note ? `<span class="order-item-note">📝 ${esc(i.note)}</span>` : ''}</span>
            <span class="order-item-price">฿${fmt(parseFloat(i.price) * parseInt(i.quantity))}</span>
        </div>
    `).join('');

    const notesHtml = o.notes
        ? `<div class="order-notes">📝 ${esc(o.notes)}</div>`
        : '';

    const actionsHtml = actions.length > 0 ? `
        <div class="order-actions">
            ${actions.map(a => actionBtn(a, o.id)).join('')}
        </div>
    ` : '';

    const tableInfo = o.table_number
        ? `🪑 โต๊ะ ${o.table_number}`
        : (o.order_type === 'takeaway' ? '🥡 กลับบ้าน' : '');

    return `
    <div class="order-card status-${o.status}" data-order-id="${o.id}">
        <div class="order-card-head">
            <div>
                <div class="order-num">#${esc(o.order_number || o.id)}</div>
                <div class="order-time">${dateStr} · ${timeStr}${tableInfo ? ' · ' + tableInfo : ''}</div>
            </div>
            <span class="order-badge ${meta.badgeClass}">${meta.icon} ${meta.label}</span>
        </div>
        <div class="order-customer">👤 ${esc(o.customer_name || 'ลูกค้า')}${o.customer_phone ? ' · 📞 ' + esc(o.customer_phone) : ''}</div>
        <div class="order-items">
            ${itemsHtml}
            <div class="order-total-row">
                <span>รวม</span>
                <span>฿${fmt(total)}</span>
            </div>
        </div>
        ${notesHtml}
        ${actionsHtml}
    </div>`;
}

function actionBtn(action, orderId) {
    const MAP = {
        accept:   { label: '✅ รับออเดอร์',    cls: 'btn-accept'  },
        cook:     { label: '👨‍🍳 เริ่มทำ',       cls: 'btn-cook'    },
        ready:    { label: '🍽️ พร้อมส่ง',       cls: 'btn-ready'   },
        complete: { label: '✨ เสร็จสิ้น',      cls: 'btn-done'    },
        cancel:   { label: '❌ ยกเลิก',         cls: 'btn-cancel'  },
    };
    const m = MAP[action];
    if (!m) return '';
    return `<button class="btn-action ${m.cls}" data-action="${action}" data-order-id="${orderId}">${m.label}</button>`;
}

function bindCardButtons(container) {
    container.querySelectorAll('.btn-action').forEach(btn => {
        btn.addEventListener('click', () => {
            const action  = btn.dataset.action;
            const orderId = btn.dataset.orderId;
            handleOrderAction(action, orderId, btn);
        });
    });
}

// ============================================================
// ⚡ Order Actions
// ============================================================
async function handleOrderAction(action, orderId, btn) {
    const STATUS_MAP = {
        accept:   'accepted',
        cook:     'cooking',
        ready:    'ready',
        complete: 'completed',
        cancel:   'cancelled',
    };

    const newStatus = STATUS_MAP[action];
    if (!newStatus) return;

    if (action === 'cancel') {
        if (!confirm('ยืนยันการยกเลิกออเดอร์นี้?')) return;
    }

    btn.disabled = true;
    const origText = btn.innerHTML;
    btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;margin:0 auto;"></div>';

    try {
        await API.call('updatePartnerOrderStatus', {
            partnerId: PARTNER.id,
            token: PARTNER.token,
            orderId,
            status: newStatus,
        });

        // อัปเดต local state ทันที
        const order = PSTATE.orders.find(o => o.id === orderId);
        if (order) order.status = newStatus;
        renderAll();

        const labels = { accepted:'รับออเดอร์แล้ว', cooking:'เริ่มทำแล้ว', ready:'พร้อมส่งแล้ว', completed:'เสร็จสิ้น', cancelled:'ยกเลิกแล้ว' };
        showToast(labels[newStatus] || 'อัปเดตแล้ว', 'success');

    } catch (err) {
        btn.disabled = false;
        btn.innerHTML = origText;
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    }
}

// ============================================================
// 🔔 Notifications & Alerts
// ============================================================
function showNewOrderAlert() {
    const el = document.getElementById('new-order-alert');
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 6000);
}

function playNotificationSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        [0, 150, 300].forEach((delay, i) => {
            setTimeout(() => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 880;
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
                osc.start();
                osc.stop(ctx.currentTime + 0.2);
            }, delay);
        });
    } catch (e) {}
}

// ============================================================
// 🌐 Connectivity
// ============================================================
function setOnlineStatus(online) {
    const dot = document.getElementById('status-dot');
    dot.className = 'status-dot' + (online ? ' online' : '');
    dot.title = online ? 'เชื่อมต่อแล้ว' : 'ไม่มีการเชื่อมต่อ';
}

// ============================================================
// 🎛 Tab Switching
// ============================================================
function switchTab(tab) {
    PSTATE.activeTab = tab;
    document.querySelectorAll('.tab').forEach(t =>
        t.classList.toggle('active', t.dataset.tab === tab)
    );
    document.querySelectorAll('.orders-pane').forEach(p =>
        p.classList.toggle('active', p.id === 'pane-' + tab)
    );
}

// ============================================================
// 🛠 Helpers
// ============================================================
function showLoading(show) {
    document.getElementById('global-loading').classList.toggle('show', show);
}

function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 2600);
}

function emptyState(icon, title, sub) {
    return `<div class="empty-state">
        <div class="empty-state-icon">${icon}</div>
        <div class="empty-state-title">${title}</div>
        <div class="empty-state-sub">${sub}</div>
    </div>`;
}

function esc(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
}

function fmt(n) {
    return Number(n).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
