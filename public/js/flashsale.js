// ============================================================
// ⭐ เมนูพิเศษ - หน้าลูกค้า (countdown + เพิ่มลงตะกร้า)
// ============================================================

const FlashSale = {
    items: [],
    timers: [],

    // โหลด เมนูพิเศษ จาก API
    async load() {
        try {
            FlashSale.items = await API.getFlashSales();
            FlashSale.render();
        } catch(e) {
            console.warn('Flash sale load error:', e);
        }
    },

    // เรนเดอร์ section เมนูพิเศษ
    render() {
        const section = document.getElementById('specialMenuSection');
        if (!section) return;

        // หยุด timers เดิม
        FlashSale.timers.forEach(t => clearInterval(t));
        FlashSale.timers = [];

        if (!FlashSale.items.length) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        section.innerHTML = `
            <div class="special-header">
                <span class="special-icon">⚡</span>
                <span class="special-title">เมนูพิเศษวันนี้!</span>
                <span class="special-icon">⚡</span>
            </div>
            <div class="special-grid" id="specialGrid">
                ${FlashSale.items.map(item => FlashSale.cardHtml(item)).join('')}
            </div>`;

        // ผูกปุ่ม + event delegation
        const grid = document.getElementById('specialGrid');
        if (grid) {
            grid.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-flash-add]');
                if (btn) FlashSale.addToCart(btn.dataset.flashAdd);
            });
        }

        // เริ่ม countdown timer
        FlashSale.items.forEach(item => {
            const timer = setInterval(() => {
                const remaining = FlashSale.formatCountdown(item.end_time);
                const el = document.getElementById('flash-countdown-' + item.id);
                if (!el) { clearInterval(timer); return; }
                if (!remaining) {
                    // หมดเวลา — รีโหลด
                    clearInterval(timer);
                    FlashSale.items = FlashSale.items.filter(x => x.id !== item.id);
                    FlashSale.render();
                    return;
                }
                el.textContent = remaining;
            }, 1000);
            FlashSale.timers.push(timer);
        });
    },

    cardHtml(item) {
        const countdown = FlashSale.formatCountdown(item.end_time) || '00:00:00';
        const discount = item.original_price > 0
            ? Math.round((1 - item.flash_price / item.original_price) * 100)
            : 0;
        const imgStyle = item.image_url
            ? `background-image:url('${item.image_url}');`
            : '';
        return `
            <div class="special-card">
                <div class="special-card-img ${item.image_url ? '' : 'empty'}" style="${imgStyle}">
                    ${!item.image_url ? '⚡' : ''}
                    ${discount > 0 ? `<div class="special-discount">-${discount}%</div>` : ''}
                </div>
                <div class="special-card-body">
                    <div class="special-name">${escapeHtmlFS(item.name)}</div>
                    ${item.description ? `<div class="special-desc">${escapeHtmlFS(item.description)}</div>` : ''}
                    <div class="special-prices">
                        ${item.original_price > 0 ? `<span class="special-orig">฿${Number(item.original_price).toFixed(0)}</span>` : ''}
                        <span class="special-price">฿${Number(item.flash_price).toFixed(0)}</span>
                    </div>
                    <div class="special-timer-row">
                        <span class="special-timer-label">⏱ เหลือ</span>
                        <span class="special-timer" id="flash-countdown-${item.id}">${countdown}</span>
                    </div>
                    <button class="btn-special-add" data-flash-add="${item.id}">+ เพิ่มลงตะกร้า</button>
                </div>
            </div>`;
    },

    // เพิ่มลงตะกร้า (ส่งไปให้ customer.js จัดการ)
    addToCart(itemId) {
        const item = FlashSale.items.find(x => x.id === itemId);
        if (!item) return;
        // ตรวจว่ายังไม่หมดเวลา
        if (!FlashSale.formatCountdown(item.end_time)) {
            notifier.showToast('⭐ เมนูพิเศษ นี้หมดเวลาแล้ว', 'error');
            return;
        }
        // เรียก openItemModal ของ customer.js
        if (typeof openFlashSaleModal === 'function') {
            openFlashSaleModal(item);
        }
    },

    formatCountdown(endTime) {
        const diff = new Date(endTime) - new Date();
        if (diff <= 0) return null;
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }
};

function escapeHtmlFS(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
