// ============================================================
// ⭐ เมนูพิเศษ - หน้าลูกค้า
// ============================================================

const FlashSale = {
    items: [],
    refreshTimer: null,
    countdownInterval: null,   // interval นับถอยหลัง (ทุก 1 วินาที)
    COUNTDOWN_THRESHOLD: 60,   // เริ่มแสดง countdown เมื่อเหลือ ≤ 60 นาที

    async load() {
        try {
            const all = await API.getFlashSales();
            FlashSale.items = all;
            FlashSale.render();
            if (FlashSale.refreshTimer) clearInterval(FlashSale.refreshTimer);
            FlashSale.refreshTimer = setInterval(() => FlashSale.render(), 60000);
        } catch(e) {
            console.warn('Flash sale load error:', e);
        }
    },

    render() {
        FlashSale.stopCountdowns();

        const section = document.getElementById('specialMenuSection');
        if (!section) return;

        const openItems = FlashSale.items.filter(item => {
            if (!item.is_active) return false;
            const sch = getScheduleFromDesc(item.description);
            if (!sch) {
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

        // inject CSS animation ถ้ายังไม่มี
        if (!document.getElementById('cdt-style')) {
            const st = document.createElement('style');
            st.id = 'cdt-style';
            st.textContent =
                '@keyframes cdtPulse{0%,100%{opacity:1}50%{opacity:.45}}' +
                '.countdown-tick{display:inline-block;font-variant-numeric:tabular-nums;}';
            document.head.appendChild(st);
        }

        const grid = document.getElementById('specialGrid');
        if (grid) {
            grid.addEventListener('click', e => {
                const btn = e.target.closest('[data-flash-add]');
                if (btn) FlashSale.addToCart(btn.dataset.flashAdd);
            });
        }

        FlashSale.startCountdowns();
    },

    cardHtml(item) {
        const sch = getScheduleFromDesc(item.description);
        const cleanDesc = getCleanDesc(item.description);
        const discount = item.original_price > 0
            ? Math.round((1 - item.flash_price / item.original_price) * 100) : 0;
        const imgStyle = item.image_url ? "background-image:url('" + item.image_url + "');" : '';

        let timeInfo;
        if (sch) {
            const secsLeft = getSecondsUntilClose(sch);
            const minsLeft = Math.ceil(secsLeft / 60);
            if (secsLeft > 0 && minsLeft <= FlashSale.COUNTDOWN_THRESHOLD) {
                const closeAt = Math.floor(Date.now() / 1000) + secsLeft;
                const formatted = fmtSecs(secsLeft);
                timeInfo =
                    '<div class="special-timer-row">' +
                        '<span class="special-timer-label">⏰ ปิดใน</span>' +
                        '<span class="special-timer countdown-tick" ' +
                              'id="cdt-' + item.id + '" ' +
                              'data-close-at="' + closeAt + '" ' +
                              'style="color:#dc2626;font-weight:700;">' +
                            formatted +
                        '</span>' +
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

    startCountdowns() {
        FlashSale.countdownInterval = setInterval(() => {
            const tickers = document.querySelectorAll('.countdown-tick');
            if (!tickers.length) { FlashSale.stopCountdowns(); return; }

            const nowSec = Math.floor(Date.now() / 1000);
            let anyExpired = false;

            tickers.forEach(el => {
                const closeAt = parseInt(el.dataset.closeAt, 10);
                const left = closeAt - nowSec;

                if (left <= 0) {
                    anyExpired = true;
                    el.textContent = 'หมดเวลา!';
                    el.style.animation = '';
                    const card = el.closest('.special-card');
                    if (card) {
                        const btn = card.querySelector('.btn-special-add');
                        if (btn) {
                            btn.disabled = true;
                            btn.textContent = '⏰ หมดเวลาแล้ว';
                            btn.style.opacity = '0.5';
                            btn.style.cursor = 'not-allowed';
                        }
                    }
                    return;
                }

                el.textContent = fmtSecs(left);

                // กระพริบเมื่อเหลือ ≤ 60 วินาที
                if (left <= 60) {
                    el.style.color = '#b91c1c';
                    el.style.animation = 'cdtPulse 1s infinite';
                }
            });

            if (anyExpired) {
                FlashSale.stopCountdowns();
                setTimeout(() => location.reload(), 2000);
            }
        }, 1000);
    },

    stopCountdowns() {
        if (FlashSale.countdownInterval) {
            clearInterval(FlashSale.countdownInterval);
            FlashSale.countdownInterval = null;
        }
    },

    addToCart(itemId) {
        const item = FlashSale.items.find(x => x.id === itemId);
        if (!item) return;
        const sch = getScheduleFromDesc(item.description);
        if (sch && !isOpenNow(sch)) {
            notifier.showToast('⭐ เมนูพิเศษนี้นอกเวลาขายแล้ว', 'error');
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

function getSecondsUntilClose(sch) {
    if (!sch) return 0;
    const now = new Date();
    const nowSecs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const closeSecs = parseTimeMinsFS(sch.close) * 60;
    return Math.max(closeSecs - nowSecs, 0);
}

function getMinutesUntilClose(sch) {
    return Math.ceil(getSecondsUntilClose(sch) / 60);
}

function parseTimeMinsFS(str) {
    if (!str) return 0;
    const parts = String(str).split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
}

function fmtSecs(s) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
        ? pad2(h) + ':' + pad2(m) + ':' + pad2(sec)
        : pad2(m) + ':' + pad2(sec);
}

function pad2(n) { return String(n).padStart(2, '0'); }

function escapeHtmlFS(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
