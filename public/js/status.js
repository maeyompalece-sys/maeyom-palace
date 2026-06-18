// ============================================================
// 📊 Status JS - หน้าสถานะออเดอร์ของลูกค้า
// ============================================================

const ORDER_STATUS = {
    pending:    { label: 'รอยืนยัน',      icon: '⏳', color: '#6b7280' },
    accepted:   { label: 'รับออเดอร์แล้ว', icon: '✅', color: '#10b981' },
    cooking:    { label: 'กำลังทำ',        icon: '👨‍🍳', color: '#f59e0b' },
    ready:      { label: 'พร้อมแล้ว',      icon: '🍽️', color: '#C9A861' },
    delivering: { label: 'กำลังส่ง',       icon: '🚶', color: '#6366f1' },
    completed:  { label: 'เสร็จสิ้น',      icon: '✨', color: '#651713' },
    cancelled:  { label: 'ยกเลิก',         icon: '❌', color: '#ef4444' },
};

const ORDER_TYPE = {
    dine_in:  { label: 'กินที่นี่',  icon: '🍽️' },
    takeaway: { label: 'กลับบ้าน',  icon: '🥡' },
};

const statusState = {
    orderId:    null,
    order:      null,
    lastStatus: null,
    poller:     null,
    source:     null,
    isPartner:  false,
    partnerId:  null,
    isRefreshing: false,
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
    if (!checkConfig()) return;

    const params = new URLSearchParams(window.location.search);
    statusState.orderId   = params.get('id');
    statusState.source    = params.get('source') || null;
    statusState.isPartner = params.get('type') === 'partner';
    statusState.partnerId = params.get('partnerId') || null;

    if (!statusState.orderId) { showError('ไม่พบ Order ID'); return; }

    bindEvents();

    if ('Notification' in window && Notification.permission === 'default') {
        try { Notification.requestPermission(); } catch(e) {}
    }

    await loadOrder();

    statusState.poller = new Poller(loadOrder, CONFIG.CUSTOMER_POLL_INTERVAL || 5000);
    statusState.poller.start();

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) statusState.poller.stop();
        else { statusState.poller.start(); loadOrder(); }
    });
}

function bindEvents() {
    const addMoreBtn = document.getElementById('btnAddMore');
    if (addMoreBtn) addMoreBtn.addEventListener('click', () => {
        if (!statusState.order) return;
        const params = new URLSearchParams();
        if (statusState.order.table_number) params.set('table', statusState.order.table_number);
        params.set('addToOrder', statusState.orderId);
        window.location.href = 'menu.html?' + params.toString();
    });

    const callBtn = document.getElementById('btnCall');
    if (callBtn) callBtn.addEventListener('click', () => {
        window.location.href = 'tel:' + (CONFIG.HOTEL_PHONE || '');
    });

    const homeBtn = document.getElementById('btnHome');
    if (homeBtn) {
        if (statusState.source === 'walkin') homeBtn.textContent = '🚶 กลับหน้า Walk-in';
        homeBtn.addEventListener('click', () => {
            window.location.href = statusState.source === 'walkin' ? 'walkin.html' : 'index.html';
        });
    }
}

// ============================================================
// 📥 Load Order
// ============================================================
async function loadOrder() {
    try {
        let order;
        if (statusState.isPartner && statusState.partnerId) {
            // ✅ ดึง partner order status
            const found = await API.call('getPartnerOrderStatus', {
                orderId:   statusState.orderId,
                partnerId: statusState.partnerId,
            });
            if (!found) throw new Error('ไม่พบออเดอร์');
            order = {
                id:             found.id,
                order_number:   found.order_number,
                status:         found.status,
                customer_name:  found.customer_name,
                customer_phone: found.customer_phone,
                order_type:     found.order_type || 'dine_in',
                table_number:   found.table_number,
                total_amount:   found.total_amount,
                notes:          found.notes,
                items:          found.items || [],
                created_at:     found.created_at,
                isPartnerOrder: true,
            };
        } else {
            order = await API.getOrder(statusState.orderId);
        }

        const prevStatus = statusState.lastStatus;
        statusState.order      = order;
        statusState.lastStatus = order.status;
        renderOrder();
        updateStickyBar(order);

        if (prevStatus && prevStatus !== order.status) {
            const st = ORDER_STATUS[order.status];
            if (st && typeof notifier !== 'undefined') {
                notifier.playStatusChangeSound();
                notifier.showToast(st.icon + ' สถานะ: ' + st.label, 'info', 3000);
                notifier.notifyBrowser('แม่ยม พาเลส', {
                    body: 'ออเดอร์ของคุณ: ' + st.label,
                    tag:  'status-' + order.id,
                });
            }
        }
    } catch (err) {
        console.error(err);
        showError('โหลดออเดอร์ล้มเหลว: ' + err.message);
    }
}

// ============================================================
// 🎨 Render Order
// ============================================================
function renderOrder() {
    const o = statusState.order;
    if (!o) return;

    const c = document.getElementById('statusContent');
    if (!c) return;

    const status  = ORDER_STATUS[o.status]    || ORDER_STATUS.pending;
    const type    = ORDER_TYPE[o.order_type]  || ORDER_TYPE.dine_in;
    const steps   = ['pending','accepted','cooking','ready','delivering','completed'];
    const currIdx = steps.indexOf(o.status);
    const isCancelled = o.status === 'cancelled';

    // Timeline
    let timelineHtml = '';
    if (isCancelled) {
        timelineHtml = '<div class="status-cancelled">❌ ออเดอร์ถูกยกเลิก</div>';
    } else {
        timelineHtml = '<div class="status-timeline">';
        steps.forEach((s, i) => {
            const sObj = ORDER_STATUS[s];
            const done   = i < currIdx;
            const active = i === currIdx;
            timelineHtml += `<div class="timeline-step ${done?'done':''} ${active?'active':''}">
                <div class="step-icon">${sObj.icon}</div>
                <div class="step-label">${sObj.label}</div>
            </div>`;
        });
        timelineHtml += '</div>';
    }

    // Items
    const items = (o.items || []).map(it => `
        <div class="order-item-row">
            <span>${it.quantity}× ${escapeHtml(it.name)}</span>
            <span>฿${formatPrice(it.price * it.quantity)}</span>
        </div>
        ${it.note ? '<div class="order-item-note">📝 ' + escapeHtml(it.note) + '</div>' : ''}
    `).join('');

    // Partner badge
    const partnerBadge = o.isPartnerOrder
        ? '<div style="display:inline-block;padding:4px 12px;background:#FEF3C7;color:#92400E;border-radius:20px;font-size:12px;font-weight:700;margin-bottom:8px;">🏪 ออเดอร์ร้านพาร์ทเนอร์</div>'
        : '';

    // ปุ่มรีเฟรช
    const refreshBtn = `
        <div style="text-align:center;margin-bottom:12px;">
            <button onclick="manualRefresh()" id="btnRefresh"
                style="padding:8px 20px;background:#fff;border:1.5px solid #C9A861;border-radius:20px;
                font-family:'Sarabun',sans-serif;font-size:13px;font-weight:600;color:#651713;
                cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
                🔄 รีเฟรชสถานะ
            </button>
            <div id="lastUpdated" style="font-size:11px;color:#aaa;margin-top:4px;">
                อัปเดตล่าสุด: ${new Date().toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
            </div>
        </div>`;

    c.innerHTML = `
        <div class="status-header">
            ${partnerBadge}
            <div class="status-current" style="background:${status.color}22;color:${status.color};border-color:${status.color}">
                <div class="status-icon-lg">${status.icon}</div>
                <div class="status-label-lg">${status.label}</div>
            </div>
            <div class="order-meta">
                <div>📋 ${escapeHtml(o.order_number || '')}</div>
                <div>${type.icon} ${type.label}${o.table_number ? ' • โต๊ะ ' + o.table_number : ''}</div>
            </div>
        </div>

        ${timelineHtml}
        ${refreshBtn}

        <div class="customer-info">
            <div>👤 <strong>${escapeHtml(o.customer_name)}</strong></div>
            <div>📞 ${escapeHtml(o.customer_phone)}</div>
        </div>

        <div class="items-section">
            <h3>📝 รายการอาหาร</h3>
            ${items || '<em>ไม่มีรายการ</em>'}
            ${o.notes ? '<div class="order-notes-display">📌 ' + escapeHtml(o.notes) + '</div>' : ''}
            <div class="total-row">
                <span>รวมทั้งสิ้น</span>
                <strong>฿${formatPrice(o.total_amount)}</strong>
            </div>
        </div>
    `;

    const loading = document.getElementById('statusLoading');
    if (loading) loading.style.display = 'none';
    c.style.display = '';
}

// ============================================================
// 🔄 Manual Refresh
// ============================================================
async function manualRefresh() {
    if (statusState.isRefreshing) return;
    statusState.isRefreshing = true;

    const btn = document.getElementById('btnRefresh');
    if (btn) { btn.innerHTML = '⏳ กำลังอัปเดต...'; btn.disabled = true; }

    await loadOrder();

    statusState.isRefreshing = false;
    const updEl = document.getElementById('lastUpdated');
    if (updEl) updEl.textContent = 'อัปเดตล่าสุด: ' + new Date().toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    if (btn) { btn.innerHTML = '🔄 รีเฟรชสถานะ'; btn.disabled = false; }
}
window.manualRefresh = manualRefresh;

// ============================================================
// ❌ Show Error
// ============================================================
function showError(msg) {
    const c = document.getElementById('statusContent');
    if (!c) return;
    c.innerHTML = `
        <div style="text-align:center;padding:40px;">
            <div style="font-size:64px;">⚠️</div>
            <h3 style="color:#c33;">${escapeHtml(msg)}</h3>
            <button onclick="manualRefresh()" style="margin:12px auto 0;display:block;padding:10px 24px;background:#C9A861;color:#fff;border:none;border-radius:10px;font-family:'Sarabun',sans-serif;font-size:14px;font-weight:700;cursor:pointer;">
                🔄 ลองใหม่
            </button>
            <a href="${statusState.source === 'walkin' ? 'walkin.html' : 'index.html'}"
               class="btn btn-primary" style="margin-top:12px;display:inline-block;">กลับหน้าแรก</a>
        </div>`;
    c.style.display = '';
    const loading = document.getElementById('statusLoading');
    if (loading) loading.style.display = 'none';
}

// ============================================================
// 🛠 Helpers
// ============================================================
function formatPrice(n) { return Number(n||0).toLocaleString('th-TH',{minimumFractionDigits:0,maximumFractionDigits:2}); }
function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

window.addEventListener('beforeunload', () => {
    if (statusState.poller) statusState.poller.stop();
});

// ============================================================
// 📌 Sticky Status Bar
// ============================================================
const STATUS_BAR_CONFIG = {
    pending:    { bg: 'linear-gradient(135deg,#6b7280,#4b5563)', progress: 5   },
    accepted:   { bg: 'linear-gradient(135deg,#10b981,#059669)', progress: 25  },
    cooking:    { bg: 'linear-gradient(135deg,#f59e0b,#d97706)', progress: 50  },
    ready:      { bg: 'linear-gradient(135deg,#C9A861,#a07840)', progress: 75  },
    delivering: { bg: 'linear-gradient(135deg,#6366f1,#4f46e5)', progress: 88  },
    completed:  { bg: 'linear-gradient(135deg,#651713,#4A0E0E)', progress: 100 },
    cancelled:  { bg: 'linear-gradient(135deg,#ef4444,#dc2626)', progress: 100 },
};

function updateStickyBar(order) {
    const bar = document.getElementById('stickyStatusBar');
    if (!bar || !order) return;

    const cfg = STATUS_BAR_CONFIG[order.status] || STATUS_BAR_CONFIG.pending;
    const st  = ORDER_STATUS[order.status] || ORDER_STATUS.pending;

    document.getElementById('stickyBarIcon').textContent     = st.icon;
    document.getElementById('stickyBarTitle').textContent    = st.label + ' — #' + (order.order_number || '');
    document.getElementById('stickyBarSub').textContent      = (order.table_number ? 'โต๊ะ ' + order.table_number + ' | ' : '') + (order.customer_name || '');
    document.getElementById('stickyBarProgress').style.width = cfg.progress + '%';
    bar.style.background = cfg.bg;

    if (bar.style.display === 'none') {
        bar.style.display = 'block';
        document.body.classList.add('has-sticky-bar');
        bar.classList.add('sticky-bar-enter');
        setTimeout(() => bar.classList.remove('sticky-bar-enter'), 400);

        window.addEventListener('scroll', () => {
            if (window.scrollY < 60) {
                bar.style.transform = 'translateY(-100%)';
                bar.style.opacity = '0';
            } else {
                bar.style.transform = 'translateY(0)';
                bar.style.opacity = '1';
            }
        }, { passive: true });
    }
    if (window.scrollY < 60) {
        bar.style.transform = 'translateY(0)';
        bar.style.opacity = '1';
    }
}
