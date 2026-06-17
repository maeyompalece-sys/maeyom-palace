// ============================================================
// 📊 Status JS - หน้าสถานะออเดอร์ของลูกค้า
// ============================================================

const statusState = {
    orderId:   null,
    order:     null,
    lastStatus: null,
    poller:    null,
    source:    null,
    isPartner: false,   // ✅ เป็น partner order ไหม
    partnerId: null,    // ✅ partnerId สำหรับดึงสถานะ
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
    if (!checkConfig()) return;

    const params = new URLSearchParams(window.location.search);
    statusState.orderId   = params.get('id');
    statusState.source    = params.get('source') || null;
    statusState.isPartner = params.get('type') === 'partner';
    statusState.partnerId = params.get('partnerId') || null;

    if (!statusState.orderId) {
        showError('ไม่พบ Order ID');
        return;
    }

    bindEvents();

    // ขออนุญาต notification
    if ('Notification' in window && Notification.permission === 'default') {
        try { Notification.requestPermission(); } catch(e) {}
    }

    // โหลดครั้งแรก
    await loadOrder();

    // เริ่ม polling
    statusState.poller = new Poller(loadOrder, CONFIG.CUSTOMER_POLL_INTERVAL);
    statusState.poller.start();

    // หยุด polling เมื่อแท็บไม่ active
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
        if (statusState.source === 'walkin') {
            homeBtn.textContent = '🚶 กลับหน้า Walk-in';
        }
        homeBtn.addEventListener('click', () => {
            window.location.href = statusState.source === 'walkin' ? 'walkin.html' : 'index.html';
        });
    }
}

async function loadOrder() {
    try {
        let order;
        if (statusState.isPartner && statusState.partnerId) {
            // ✅ ดึง partner order สถานะ
            const data = await API.call('getPartnerOrders', { partnerId: statusState.partnerId, token: '' });
            const found = (data.orders || []).find(function(o) { return o.id === statusState.orderId; });
            if (!found) throw new Error('ไม่พบออเดอร์');
            // แปลง partner order ให้เหมือน hotel order
            order = {
                id:            found.id,
                order_number:  found.order_number,
                status:        found.status,
                customer_name: found.customer_name,
                customer_phone: found.customer_phone,
                order_type:    found.order_type,
                table_number:  found.table_number,
                total_amount:  found.total_amount,
                notes:         found.notes,
                items:         found.items || [],
                created_at:    found.created_at,
            };
        } else {
            order = await API.getOrder(statusState.orderId);
        }
        const prevStatus = statusState.lastStatus;
        statusState.order = order;
        statusState.lastStatus = order.status;
        renderOrder();
        updateStickyBar(order); // อัปเดต sticky bar

        // แจ้งเตือนเมื่อสถานะเปลี่ยน
        if (prevStatus && prevStatus !== order.status) {
            const status = ORDER_STATUS[order.status];
            if (status) {
                notifier.playStatusChangeSound();
                notifier.showToast(status.icon + ' สถานะ: ' + status.label, 'info', 3000);
                notifier.notifyBrowser('แม่ยม พาเลส', {
                    body: 'ออเดอร์ของคุณ: ' + status.label,
                    tag: 'status-' + order.id
                });
            }
        }
    } catch (err) {
        console.error(err);
        showError('โหลดออเดอร์ล้มเหลว: ' + err.message);
    }
}

function renderOrder() {
    const o = statusState.order;
    if (!o) return;

    const c = document.getElementById('statusContent');
    if (!c) return;

    const status = ORDER_STATUS[o.status] || ORDER_STATUS.pending;
    const type = ORDER_TYPE[o.order_type] || ORDER_TYPE.dine_in;

    // Status timeline
    const steps = ['pending','accepted','cooking','ready','delivering','completed'];
    const currentIdx = steps.indexOf(o.status);
    const isCancelled = o.status === 'cancelled';

    let timelineHtml = '';
    if (isCancelled) {
        timelineHtml = '<div class="status-cancelled">❌ ออเดอร์ถูกยกเลิก</div>';
    } else {
        timelineHtml = '<div class="status-timeline">';
        steps.forEach((s, i) => {
            const sObj = ORDER_STATUS[s];
            const done = i < currentIdx;
            const active = i === currentIdx;
            timelineHtml += `
                <div class="timeline-step ${done ? 'done' : ''} ${active ? 'active' : ''}">
                    <div class="step-icon">${sObj.icon}</div>
                    <div class="step-label">${sObj.label}</div>
                </div>`;
        });
        timelineHtml += '</div>';
    }

    const items = (o.items || []).map(it => `
        <div class="order-item-row">
            <span>${it.quantity}× ${escapeHtml(it.name)}</span>
            <span>฿${formatPrice(it.price * it.quantity)}</span>
        </div>
        ${it.note ? '<div class="order-item-note">📝 ' + escapeHtml(it.note) + '</div>' : ''}
    `).join('');

    c.innerHTML = `
        <div class="status-header">
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

    // ซ่อน loading
    const loading = document.getElementById('statusLoading');
    if (loading) loading.style.display = 'none';
    c.style.display = '';
}

function showError(msg) {
    const c = document.getElementById('statusContent');
    if (!c) return;
    c.innerHTML = '<div style="text-align:center;padding:40px;color:#c33;"><div style="font-size:64px;">⚠️</div><h3>' + escapeHtml(msg) + '</h3><a href="' + (statusState.source === 'walkin' ? 'walkin.html' : 'index.html') + '" class="btn btn-primary" style="margin-top:20px;display:inline-block;">กลับหน้าแรก</a></div>';
    c.style.display = '';
    const loading = document.getElementById('statusLoading');
    if (loading) loading.style.display = 'none';
}

function formatPrice(n) { return Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

window.addEventListener('beforeunload', () => {
    if (statusState.poller) statusState.poller.stop();
});

// ============================================================
// 📌 Sticky Status Bar
// ============================================================
const STATUS_BAR_CONFIG = {
    pending:    { bg: 'linear-gradient(135deg,#6b7280,#4b5563)', progress: 5,   icon: '⏳' },
    accepted:   { bg: 'linear-gradient(135deg,#10b981,#059669)', progress: 25,  icon: '✅' },
    cooking:    { bg: 'linear-gradient(135deg,#f59e0b,#d97706)', progress: 50,  icon: '👨‍🍳' },
    ready:      { bg: 'linear-gradient(135deg,#C9A861,#a07840)', progress: 75,  icon: '🍽️' },
    delivering: { bg: 'linear-gradient(135deg,#6366f1,#4f46e5)', progress: 88,  icon: '🚶' },
    completed:  { bg: 'linear-gradient(135deg,#651713,#4A0E0E)', progress: 100, icon: '✨' },
    cancelled:  { bg: 'linear-gradient(135deg,#ef4444,#dc2626)', progress: 100, icon: '❌' },
};

function updateStickyBar(order) {
    const bar = document.getElementById('stickyStatusBar');
    if (!bar || !order) return;

    const cfg = STATUS_BAR_CONFIG[order.status] || STATUS_BAR_CONFIG.pending;
    const st  = ORDER_STATUS[order.status] || ORDER_STATUS.pending;

    document.getElementById('stickyBarIcon').textContent    = cfg.icon;
    document.getElementById('stickyBarTitle').textContent   = st.label + ' — #' + (order.order_number || '');
    document.getElementById('stickyBarSub').textContent     = 'โต๊ะ ' + (order.table_number || '-') + ' | ' + (order.customer_name || '');
    document.getElementById('stickyBarProgress').style.width = cfg.progress + '%';

    bar.style.background = cfg.bg;

    // แสดง bar ครั้งแรก
    if (bar.style.display === 'none') {
        bar.style.display = 'block';
        document.body.classList.add('has-sticky-bar');
        bar.classList.add('sticky-bar-enter');
        setTimeout(() => bar.classList.remove('sticky-bar-enter'), 400);

        // ผูก scroll listener แค่ครั้งเดียว
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
    // แสดงตลอดถ้า scroll ไม่มาก
    if (window.scrollY < 60) {
        bar.style.transform = 'translateY(0)';
        bar.style.opacity = '1';
    }
}
