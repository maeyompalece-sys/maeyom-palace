// ============================================================
// ⭐ เมนูพิเศษ - หน้าลูกค้า
// ============================================================
// อ่าน schedule จาก description marker [SCHED:days|open|close]
// แล้วแสดงเฉพาะเมนูที่กำลังเปิดขายอยู่ตอนนี้
// ============================================================

const FlashSale = {
    items: [],
    refreshTimer: null,

    async load() {
        try {
            const all = await API.getFlashSales();
            FlashSale.items = all;
            FlashSale.render();
            // refresh ทุก 60 วินาที — เผื่อข้ามช่วงเวลาเปิด/ปิด
            if (FlashSale.refreshTimer) clearInterval(FlashSale.refreshTimer);
            FlashSale.refreshTimer = setInterval(() => FlashSale.render(), 60000);
        } catch(e) {
            console.warn('Flash sale load error:', e);
        }
    },

    render() {
        const section = document.getElementById('specialMenuSection');
        if (!section) return;

        // กรองเฉพาะที่กำลังเปิดขายตอนนี้
        const openItems = FlashSale.items.filter(item => {
            if (!item.is_active) return false;
            const sch = getScheduleFromDesc(item.description);
            if (!sch) {
                // ไม่มี schedule — backward-compat กับข้อมูลเก่า
                // ใช้ end_time แบบเดิม ถ้ายังไม่หมดเวลาก็แสดง
                if (item.end_time) return new Date(item.end_time) > new Date();
                return true;
            }
            return isOpenNow(sch);
        });

        if (!openItems.length) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        section.innerHTML =
            '<div class="special-header">' +
                '<span class="special-icon">⚡</span>' +
                '<span class="special-title">เมนูพิเศษวันนี้!</span>' +
                '<span class="special-icon">⚡</span>' +
            '</div>' +
            '<div class="special-grid" id="specialGrid">' +
                openItems.map(item => FlashSale.cardHtml(item)).join('') +
            '</div>';

        const grid = document.getElementById('specialGrid');
        if (grid) {
            grid.addEventListener('click', e => {
                const btn = e.target.closest('[data-flash-add]');
                if (btn) FlashSale.addToCart(btn.dataset.flashAdd);
            });
        }
    },

    cardHtml(item) {
        const sch = getScheduleFromDesc(item.description);
        const cleanDesc = getCleanDesc(item.description);
        const discount = item.original_price > 0
            ? Math.round((1 - item.flash_price / item.original_price) * 100) : 0;
        const imgStyle = item.image_url ? "background-image:url('" + item.image_url + "');" : '';

        // แสดงข้อมูลตามตารางเวลา
        let timeInfo;
        if (sch) {
            const minsLeft = getMinutesUntilClose(sch);
            if (minsLeft > 0 && minsLeft < 60) {
                timeInfo =
                    '<div class="special-timer-row">' +
                        '<span class="special-timer-label">⏰ ใกล้ปิด</span>' +
                        '<span class="special-timer" style="color:#dc2626;">เหลือ ' + minsLeft + ' นาที</span>' +
                    '</div>';
            } else {
                timeInfo =
                    '<div class="special-timer-row">' +
                        '<span class="special-timer-label">🕐 เปิดถึง</span>' +
                        '<span class="special-timer">' + sch.close + ' น.</span>' +
                    '</div>';
            }
        } else {
            timeInfo =
                '<div class="special-timer-row">' +
                    '<span class="special-timer-label">⚡</span>' +
                    '<span class="special-timer">กำลังเปิดขาย!</span>' +
                '</div>';
        }

        return '<div class="special-card">' +
            '<div class="special-card-img ' + (item.image_url ? '' : 'empty') + '" style="' + imgStyle + '">' +
                (!item.image_url ? '⚡' : '') +
                (discount > 0 ? '<div class="special-discount">-' + discount + '%</div>' : '') +
            '</div>' +
            '<div class="special-card-body">' +
                '<div class="special-name">' + escapeHtmlFS(item.name) + '</div>' +
                (cleanDesc ? '<div class="special-desc">' + escapeHtmlFS(cleanDesc) + '</div>' : '') +
                '<div class="special-prices">' +
                    (item.original_price > 0 ? '<span class="special-orig">฿' + Number(item.original_price).toFixed(0) + '</span>' : '') +
                    '<span class="special-price">฿' + Number(item.flash_price).toFixed(0) + '</span>' +
                '</div>' +
                timeInfo +
                '<button class="btn-special-add" data-flash-add="' + item.id + '">+ เพิ่มลงตะกร้า</button>' +
            '</div>' +
        '</div>';
    },

    addToCart(itemId) {
        const item = FlashSale.items.find(x => x.id === itemId);
        if (!item) return;
        // ตรวจสอบอีกครั้งว่ายังเปิดขายอยู่
        const sch = getScheduleFromDesc(item.description);
        if (sch && !isOpenNow(sch)) {
            notifier.showToast('⭐ เมนูพิเศษ นี้นอกเวลาขายแล้ว', 'error');
            FlashSale.render();
            return;
        }
        if (typeof openFlashSaleModal === 'function') {
            openFlashSaleModal(item);
        }
    }
};

// ============================================================
// Schedule helpers
// ============================================================
function getScheduleFromDesc(desc) {
    if (!desc) return null;
    const m = String(desc).match(/\[SCHED:([0-6,]*)\|(\d{2}:\d{2})\|(\d{2}:\d{2})\]/);
    if (!m) return null;
    return {
        days: m[1] ? m[1].split(',').map(Number).filter(n => !isNaN(n) && n >= 0 && n <= 6) : [],
        open: m[2],
        close: m[3]
    };
}

function getCleanDesc(desc) {
    if (!desc) return '';
    return String(desc).replace(/\s*\[SCHED:[^\]]+\]\s*/g, '').trim();
}

function isOpenNow(sch) {
    if (!sch) return false;
    const now = new Date();
    const todayDay = now.getDay();
    if (sch.days.length > 0 && !sch.days.includes(todayDay)) return false;
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const openMins  = parseTimeMinsFS(sch.open);
    const closeMins = parseTimeMinsFS(sch.close);
    return nowMins >= openMins && nowMins <= closeMins;
}

function getMinutesUntilClose(sch) {
    if (!sch) return 0;
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    return parseTimeMinsFS(sch.close) - nowMins;
}

function parseTimeMinsFS(str) {
    if (!str) return 0;
    const parts = String(str).split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
}

function escapeHtmlFS(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
