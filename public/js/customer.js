// ============================================================
// 🍽️ Customer JS - หน้าเมนูสำหรับลูกค้า
// ============================================================

const state = {
    step: 'type',           // type → info → menu
    orderType: null,        // dine_in | takeaway
    customerName: '',
    customerPhone: '',
    tableNumber: null,
    cart: [],               // [{ menu_item_id, name, price, quantity, note }]
    menu: [],
    categories: [],
    activeCategory: 'all',
    searchQuery: '',
    addToOrderId: null,     // ถ้าเป็นการสั่งเพิ่มในออเดอร์เดิม
    activePartner: null,    // ถ้าเปิดจาก banner ร้านพาร์ทเนอร์
};

// ============================================================
// 🚀 Init
// ============================================================
document.addEventListener('DOMContentLoaded', init);

async function init() {
    if (!checkConfig()) return;
    Push.init();

    // 🌐 เริ่ม i18n
    const hero = document.getElementById('langSwitcherHero');
    if (hero && typeof I18N !== 'undefined') {
        hero.appendChild(I18N.createSwitcher());
        I18N.apply();
    }

    // อ่าน parameters จาก URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('table')) state.tableNumber = parseInt(params.get('table'));
    if (params.get('type')) state.orderType = params.get('type');
    if (params.get('addToOrder')) state.addToOrderId = params.get('addToOrder');
    if (params.get('source')) state.source = params.get('source');
    if (params.get('location')) state.locationNote = params.get('location'); // walk-in location
    if (params.get('note')) state.preNote = params.get('note'); // walk-in pre-note
    if (params.get('partner')) state.activePartner = params.get('partner'); // filter เมนูพาร์ทเนอร์

    // ดึงข้อมูลลูกค้าเก่าจาก localStorage
    try {
        const saved = JSON.parse(localStorage.getItem('maeyom_customer') || '{}');
        if (saved.name) state.customerName = saved.name;
        if (saved.phone) state.customerPhone = saved.phone;
    } catch (e) {}

    // ผูก event listeners
    bindEvents();

    // โหลดเมนู (Bootstrap)
    await loadMenu();

    // ตัดสินใจว่าจะแสดง step ไหน
    if (state.activePartner) {
        // ✅ มาจาก banner ร้านพาร์ทเนอร์ → ข้ามไป menu เลย
        state.step = 'menu';
    } else if (state.addToOrderId) {
        state.step = 'menu';
    } else if (!state.orderType) {
        state.step = 'type';
        // ถ้ามีออเดอร์เก่า → แสดง welcome back banner
        showReturningCustomer();
    } else if (state.orderType === 'takeaway') {
        // มาจาก index.html เลือก takeaway แล้ว → ข้ามไป info หรือ menu เลย
        if (!state.customerName || !state.customerPhone) {
            state.step = 'info';
        } else {
            state.step = 'menu';
        }
    } else if (!state.customerName || !state.customerPhone) {
        state.step = 'info';
    } else {
        state.step = 'menu';
    }
    showReturningCustomer();
    showStep(state.step);
    // ✅ เรียก renderPartnerBanner หลัง showStep เพื่อให้ element แสดงอยู่แล้ว
    if (state.step === 'menu') {
        renderPartnerBanner();
    }
}

// ============================================================
// 🎯 Event Bindings (ทุกปุ่มผ่านที่นี่)
// ============================================================
function bindEvents() {
    // === Step 1: Order type ===
    document.querySelectorAll('[data-action="select-type"]').forEach(el => {
        el.addEventListener('click', () => selectOrderType(el.dataset.type));
    });

    // === Step 2: Customer info ===
    const infoForm = document.getElementById('customerInfoForm');
    if (infoForm) {
        infoForm.addEventListener('submit', (e) => {
            e.preventDefault();
            submitCustomerInfo();
        });
    }
    const backFromInfo = document.getElementById('backFromInfo');
    if (backFromInfo) backFromInfo.addEventListener('click', () => showStep('type'));

    // === Step 3: Menu ===
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            state.searchQuery = e.target.value.trim().toLowerCase();
            renderMenu();
        });
    }

    const submitBtn = document.getElementById('submitOrderBtn');
    if (submitBtn) submitBtn.addEventListener('click', submitOrder);

    const cartBar = document.getElementById('cartBar');
    if (cartBar) cartBar.addEventListener('click', openCartReview);

    // Modal close
    document.querySelectorAll('[data-close-modal]').forEach(el => {
        el.addEventListener('click', closeAllModals);
    });

    // ปุ่มโทรหาแอดมิน
    document.querySelectorAll('[data-action="call-admin"]').forEach(el => {
        el.addEventListener('click', () => {
            window.location.href = 'tel:' + (CONFIG.HOTEL_PHONE || '');
        });
    });
}

// ============================================================
// 📥 Load Data
// ============================================================
async function loadMenu() {
    showLoading(true);
    try {
        const data = await API.getBootstrap();
        state.menu = data.menu || [];
        state.categories = data.categories || [];
        renderCategories();
        renderMenu();
        // โหลด เมนูพิเศษ
        FlashSale.load();
        // ✅ โหลด partner banner หลังจาก step menu แสดงแล้ว
        renderPartnerBanner();

        // ถ้ามี table_number ลองหาชื่อโต๊ะ
        if (state.tableNumber) {
            const tables = data.tables || [];
            const t = tables.find(x => parseInt(x.table_number) === state.tableNumber);
            const display = document.getElementById('tableDisplay');
            if (display) {
                display.innerHTML = '🪑 ' + (t && t.table_name ? t.table_name : 'โต๊ะ ' + state.tableNumber);
                display.style.display = 'inline-block';
            }
        }
    } catch (err) {
        console.error(err);
        notifier.showToast('โหลดเมนูล้มเหลว: ' + err.message, 'error', 5000);
    } finally {
        showLoading(false);
    }
}

// ============================================================
// 🎬 Step Navigation
// ============================================================
function showStep(step) {
    state.step = step;
    document.querySelectorAll('[data-step]').forEach(el => {
        el.style.display = el.dataset.step === step ? '' : 'none';
    });
    if (step === 'info') {
        const nameInp = document.getElementById('customerName');
        const phoneInp = document.getElementById('customerPhone');
        if (nameInp) nameInp.value = state.customerName || '';
        if (phoneInp) phoneInp.value = state.customerPhone || '';
        if (nameInp) setTimeout(() => nameInp.focus(), 100);
    }
    if (step === 'menu') {
        updateCartBar();
        startMenuPolling(); // เริ่ม auto-refresh เมื่อเข้าหน้าเมนู
        // ✅ เรียก renderPartnerBanner หลัง step menu แสดงแล้ว
        renderPartnerBanner();
    }
    window.scrollTo(0, 0);
}

function selectOrderType(type) {
    state.orderType = type;
    // ถ้าเลือก takeaway และไม่มีโต๊ะ → ถามจุดรับอาหาร
    if (type === 'takeaway' && !state.tableNumber) {
        showLocationModal();
        return;
    }
    if (state.customerName && state.customerPhone) {
        showStep('menu');
    } else {
        showStep('info');
    }
}

function showLocationModal() {
    const modal = document.getElementById('locationModal');
    if (!modal) {
        // ไม่มี modal → ข้ามไปเลย
        if (state.customerName && state.customerPhone) showStep('menu');
        else showStep('info');
        return;
    }
    document.getElementById('locTableNum').value = '';
    document.getElementById('locLocation').value = '';
    document.getElementById('locNote').value = '';
    document.querySelectorAll('.loc-chip').forEach(c => c.classList.remove('active'));
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeLocationModal() {
    const modal = document.getElementById('locationModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
}

function setLocChip(btn, text) {
    document.querySelectorAll('.loc-chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('locLocation').value = text;
}

function confirmTakeawayLocation() {
    const tableNum = document.getElementById('locTableNum')?.value.trim();
    const location = document.getElementById('locLocation')?.value.trim();
    const note     = document.getElementById('locNote')?.value.trim();

    if (!tableNum && !location) {
        document.getElementById('locTableNum').style.borderColor = '#ef4444';
        document.getElementById('locLocation').style.borderColor = '#ef4444';
        document.getElementById('locLocation').placeholder = '⚠️ กรุณาระบุโต๊ะ หรือ จุดที่อยู่';
        return;
    }

    if (tableNum) state.tableNumber = parseInt(tableNum);
    if (location) state.locationNote = location;
    if (note)     state.preNote = note;

    closeLocationModal();
    if (state.customerName && state.customerPhone) showStep('menu');
    else showStep('info');
}

// expose globals
window.closeLocationModal   = closeLocationModal;
window.setLocChip           = setLocChip;
window.confirmTakeawayLocation = confirmTakeawayLocation;

function submitCustomerInfo() {
    const nameInp = document.getElementById('customerName');
    const phoneInp = document.getElementById('customerPhone');
    const name = nameInp ? nameInp.value.trim() : '';
    const phone = phoneInp ? phoneInp.value.trim() : '';

    if (!name) { notifier.showToast('กรุณาใส่ชื่อ', 'error'); return; }
    if (!phone || phone.length < 9) { notifier.showToast('กรุณาใส่เบอร์โทรให้ถูกต้อง', 'error'); return; }

    state.customerName = name;
    state.customerPhone = phone;
    localStorage.setItem('maeyom_customer', JSON.stringify({ name: name, phone: phone }));
    showStep('menu');
}

// ============================================================
// 🍽️ Menu Rendering
// ============================================================
function renderCategories() {
    const c = document.getElementById('categoriesBar');
    if (!c) return;
    let html = '<button class="cat-chip ' + (state.activeCategory === 'all' ? 'active' : '') + '" data-cat-id="all">📋 ทั้งหมด</button>';
    html += state.categories.map(cat =>
        '<button class="cat-chip ' + (state.activeCategory === cat.id ? 'active' : '') + '" data-cat-id="' + cat.id + '">' +
        (cat.icon || '') + ' ' + escapeHtml(cat.name) + '</button>'
    ).join('');
    c.innerHTML = html;

    // Bind chip clicks
    c.querySelectorAll('.cat-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            state.activeCategory = chip.dataset.catId;
            renderCategories();
            renderMenu();
        });
    });
}

function renderMenu() {
    const grid = document.getElementById('menuGrid');
    if (!grid) return;

    let items = state.menu;
    if (state.activePartner) {
        // ✅ โหมดร้านพาร์ทเนอร์ → แสดงเฉพาะเมนูร้านนั้น
        items = items.filter(function(i) { return i.partnerId && String(i.partnerId).toUpperCase() === String(state.activePartner).toUpperCase(); });

        // แสดง header ร้านพาร์ทเนอร์
        var partnerInfo = items[0] || null;
        var specialEl = document.getElementById('specialMenuSection');
        if (specialEl && partnerInfo) {
            var logoHtml = partnerInfo.partnerLogoUrl
                ? '<img src="' + partnerInfo.partnerLogoUrl + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
                : '🏪';
            specialEl.innerHTML = '<div style="display:flex;align-items:center;gap:14px;padding:14px 16px;background:#fff;border-radius:14px;box-shadow:0 2px 10px rgba(0,0,0,.06);margin-bottom:16px;border:1px solid #EDE5D3;">'
                + '<div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#4A0E0E,#651713);display:flex;align-items:center;justify-content:center;font-size:24px;overflow:hidden;flex-shrink:0;">'
                + logoHtml + '</div>'
                + '<div>'
                + '<div style="font-family:Cormorant Garamond,serif;font-size:20px;font-weight:600;color:#651713;">' + esc(partnerInfo.partnerName || '') + '</div>'
                + '<div style="font-size:12px;color:#6B6B6B;margin-top:2px;">' + esc(partnerInfo.category || '') + '</div>'
                + '</div></div>';
            specialEl.style.display = 'block';
        }
    } else {
        // ✅ โหมดเมนูหลัก → ซ่อนเมนูพาร์ทเนอร์ออกจากกริด (แสดงแค่ใน banner)
        items = items.filter(function(i) { return !i.is_partner; });
    }
    if (state.activeCategory !== 'all') {
        items = items.filter(i => i.category_id === state.activeCategory);
    }
    if (state.searchQuery) {
        const q = state.searchQuery;
        items = items.filter(i =>
            (i.name || '').toLowerCase().includes(q) ||
            (i.description || '').toLowerCase().includes(q)
        );
    }

    if (items.length === 0) {
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;text-align:center;padding:40px;color:#888;"><div style="font-size:48px;">🔍</div>ไม่พบเมนู</div>';
        return;
    }

    grid.innerHTML = items.map(item => {
        const unavailable = item.is_available === false;
        return `
        <div class="menu-item${unavailable ? ' menu-item--unavailable' : ''}" data-item-id="${item.id}">
            <div class="menu-item-img" ${item.image_url ? `style="background-image:url('${item.image_url}')"` : ''}>
                ${item.image_url ? '' : '🍽️'}
                <div class="menu-item-badges">
                    ${item.is_recommended && !unavailable ? '<span class="badge-rec">⭐</span>' : ''}
                    ${item.is_spicy ? '<span class="badge-spicy">🌶️</span>' : ''}
                </div>
                ${unavailable ? `
                <div class="menu-unavailable-overlay">
                    <div class="menu-unavailable-inner">
                        <span class="menu-unavailable-icon">🌙</span>
                        <span class="menu-unavailable-title">หยุดพักชั่วคราว</span>
                        <span class="menu-unavailable-sub">จะกลับมาให้บริการเร็วๆ นี้</span>
                    </div>
                </div>` : ''}
            </div>
            <div class="menu-item-body">
                <div class="menu-item-name">${escapeHtml(item.name)}</div>
                <div class="menu-item-desc">${escapeHtml(item.description || '\u00A0')}</div>
                <div class="menu-item-row">
                    <span class="menu-item-price${unavailable ? ' menu-item-price--unavailable' : ''}">฿${formatPrice(item.price)}</span>
                    ${unavailable
                        ? '<span class="btn-add btn-add--unavailable">–</span>'
                        : `<button class="btn-add" data-item-id="${item.id}">+</button>`}
                </div>
            </div>
        </div>`;
    }).join('');

    // Bind add buttons (only available items)
    grid.querySelectorAll('.btn-add:not(.btn-add--unavailable), .menu-item:not(.menu-item--unavailable)').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = el.dataset.itemId;
            openItemModal(id);
        });
    });
}

// ============================================================
// 🛒 Item Modal (เลือกจำนวน + หมายเหตุ)
// ============================================================
function openItemModal(itemId) {
    const item = state.menu.find(i => i.id === itemId);
    if (!item) return;
    if (item.is_available === false) return; // ปิดรับออเดอร์ชั่วคราว

    let modal = document.getElementById('itemModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'itemModal';
        modal.className = 'modal-bg';
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div class="modal-card">
            ${item.image_url ? `<div class="modal-img" style="background-image:url('${item.image_url}')"></div>` : ''}
            <h3 class="modal-title">${escapeHtml(item.name)}</h3>
            <p class="modal-desc">${escapeHtml(item.description || '')}</p>
            <div class="modal-price">฿${formatPrice(item.price)}</div>

            <div class="form-row">
                <label>หมายเหตุ (ถ้ามี)</label>
                <textarea id="itemNote" rows="2" placeholder="เช่น ไม่ใส่ผัก, เผ็ดน้อย"></textarea>
            </div>

            <div class="qty-row">
                <button class="qty-btn" id="qtyMinus">−</button>
                <span class="qty-val" id="qtyVal">1</span>
                <button class="qty-btn" id="qtyPlus">+</button>
            </div>

            <div class="modal-btns">
                <button class="btn btn-ghost" id="modalCancel">ยกเลิก</button>
                <button class="btn btn-primary" id="modalAdd">เพิ่มลงตะกร้า</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';

    let qty = 1;
    const qtyVal = modal.querySelector('#qtyVal');
    modal.querySelector('#qtyMinus').addEventListener('click', () => {
        if (qty > 1) { qty--; qtyVal.textContent = qty; }
    });
    modal.querySelector('#qtyPlus').addEventListener('click', () => {
        qty++; qtyVal.textContent = qty;
    });
    modal.querySelector('#modalCancel').addEventListener('click', closeAllModals);
    modal.querySelector('#modalAdd').addEventListener('click', () => {
        const note = modal.querySelector('#itemNote').value.trim();
        addToCart(item, qty, note);
        closeAllModals();
    });
}

function addToCart(item, qty, note) {
    state.cart.push({
        menu_item_id: item.id,
        name: item.name,
        price: parseFloat(item.price),
        quantity: qty,
        note: note || '',
        // ✅ ส่ง partnerId ไปด้วยเพื่อให้ GAS แยก PartnerOrder
        partnerId: item.partnerId || null,
    });
    updateCartBar();
    notifier.showToast('เพิ่ม "' + item.name + '" ลงตะกร้าแล้ว', 'success', 1500);
    notifier.playSuccessSound();
}

function updateCartBar() {
    const bar = document.getElementById('cartBar');
    if (!bar) return;
    if (state.cart.length === 0) {
        bar.style.display = 'none';
        return;
    }
    bar.style.display = 'flex';
    const totalQty = state.cart.reduce((s, i) => s + i.quantity, 0);
    const totalAmt = state.cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const countEl = document.getElementById('cartCount');
    const amtEl = document.getElementById('cartAmount');
    if (countEl) countEl.textContent = totalQty + ' รายการ';
    if (amtEl) amtEl.textContent = '฿' + formatPrice(totalAmt);
}

// ============================================================
// 🛒 Cart Review Modal
// ============================================================
function openCartReview() {
    if (state.cart.length === 0) return;

    let modal = document.getElementById('cartModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'cartModal';
        modal.className = 'modal-bg';
        document.body.appendChild(modal);
    }

    const total = state.cart.reduce((s, i) => s + i.price * i.quantity, 0);

    modal.innerHTML = `
        <div class="modal-card">
            <h3 class="modal-title">🛒 ตะกร้าของคุณ</h3>
            <div class="cart-list">
                ${state.cart.map((it, idx) => `
                    <div class="cart-item">
                        <div class="cart-item-info">
                            <strong>${it.quantity}× ${escapeHtml(it.name)}</strong>
                            ${it.note ? '<div class="cart-item-note">📝 ' + escapeHtml(it.note) + '</div>' : ''}
                        </div>
                        <div class="cart-item-right">
                            <span>฿${formatPrice(it.price * it.quantity)}</span>
                            <button class="cart-item-remove" data-idx="${idx}">×</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="cart-total">
                <span>รวม</span>
                <strong>฿${formatPrice(total)}</strong>
            </div>
            <div class="form-row">
                <label>หมายเหตุรวมทั้งออเดอร์ (ถ้ามี)</label>
                <textarea id="orderNotes" rows="2" placeholder="เช่น โต๊ะมีคนแพ้กุ้ง"></textarea>
            </div>
            <div class="modal-btns">
                <button class="btn btn-ghost" id="cartContinue">เพิ่มเมนูอีก</button>
                <button class="btn btn-primary" id="cartSubmit">${state.addToOrderId ? 'ส่งสั่งเพิ่ม' : 'สั่งเลย'} 🚀</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';

    modal.querySelectorAll('.cart-item-remove').forEach(b => {
        b.addEventListener('click', () => {
            const idx = parseInt(b.dataset.idx);
            state.cart.splice(idx, 1);
            updateCartBar();
            if (state.cart.length === 0) closeAllModals();
            else openCartReview(); // re-render
        });
    });
    modal.querySelector('#cartContinue').addEventListener('click', closeAllModals);
    modal.querySelector('#cartSubmit').addEventListener('click', submitOrder);
}

// ============================================================
// 🚀 Submit Order
// ============================================================
async function submitOrder() {
    if (state.cart.length === 0) {
        notifier.showToast('กรุณาเลือกเมนูก่อน', 'error');
        return;
    }

    const orderNotesEl = document.getElementById('orderNotes');
    let notes = orderNotesEl ? orderNotesEl.value.trim() : '';
    // เพิ่ม location/note จาก walk-in
    if (state.locationNote) notes = `📍 ${state.locationNote}${notes ? ' · ' + notes : ''}`;
    if (state.preNote && !notes.includes(state.preNote)) notes = notes ? notes + ' · ' + state.preNote : state.preNote;

    showLoading(true);
    try {
        let result;
        if (state.addToOrderId) {
            // สั่งเพิ่ม → สร้างเป็นออเดอร์ใหม่แยกออกไปเลย
            const newOrder = await API.createOrder({
                customer_name: state.customerName,
                customer_phone: state.customerPhone,
                table_number: state.tableNumber,
                order_type: state.orderType,
                items: state.cart,
                notes: notes
            });

            // เก็บ id ออเดอร์ใหม่ใน localStorage
            try {
                const my = JSON.parse(localStorage.getItem('maeyom_my_orders') || '[]');
                my.unshift({ id: newOrder.id, order_number: newOrder.order_number, created_at: newOrder.created_at });
                localStorage.setItem('maeyom_my_orders', JSON.stringify(my.slice(0, 20)));
            } catch (e) {}

            // 🔔 ผูก push กับออเดอร์ใหม่
            try {
                await Push.askPermission();
                await Push.linkOrder(newOrder.id);
            } catch(e) {}

            notifier.showToast('✓ ส่งออเดอร์เพิ่มเรียบร้อย', 'success', 2000);
            notifier.playSuccessSound();
            setTimeout(() => {
                window.location.href = 'status.html?id=' + newOrder.id;
            }, 800);
        } else {
            // สร้างออเดอร์ใหม่
            const order = await API.createOrder({
                customer_name: state.customerName,
                customer_phone: state.customerPhone,
                table_number: state.tableNumber,
                order_type: state.orderType,
                items: state.cart,
                notes: notes
            });

            // เก็บ id ออเดอร์ใน localStorage
            try {
                const my = JSON.parse(localStorage.getItem('maeyom_my_orders') || '[]');
                my.unshift({ id: order.id, order_number: order.order_number, created_at: order.created_at });
                localStorage.setItem('maeyom_my_orders', JSON.stringify(my.slice(0, 20)));
            } catch (e) {}

            notifier.showToast('✓ ส่งออเดอร์เรียบร้อย', 'success', 2000);
            notifier.playSuccessSound();

            // 🔔 ขอ permission แล้วผูก push กับ order นี้
            try {
                await Push.askPermission();
                await Push.linkOrder(order.id);
            } catch(e) {}

            // บันทึก order ID สำหรับ walkin
            if (state.source === 'walkin') {
                try {
                    const saved = JSON.parse(localStorage.getItem('my_orders_walkin') || '[]');
                    if (!saved.includes(order.id)) { saved.push(order.id); }
                    localStorage.setItem('my_orders_walkin', JSON.stringify(saved.slice(-10)));
                } catch(e) {}
            }

            const sourceParam = state.source ? '&source=' + state.source : '';
            setTimeout(() => {
                window.location.href = 'status.html?id=' + order.id + sourceParam;
            }, 800);
        }
    } catch (err) {
        console.error(err);
        notifier.showToast('สั่งล้มเหลว: ' + err.message, 'error', 5000);
    } finally {
        showLoading(false);
    }
}

// ============================================================
// 🔧 Helpers
// ============================================================
function closeAllModals() {
    document.querySelectorAll('.modal-bg').forEach(m => m.style.display = 'none');
}

function showLoading(show) {
    let l = document.getElementById('globalLoading');
    if (!l) {
        l = document.createElement('div');
        l.id = 'globalLoading';
        l.innerHTML = '<div class="spinner"></div><p>กำลังโหลด...</p>';
        l.style.cssText = 'position:fixed;inset:0;background:rgba(255,255,255,.85);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(4px);';
        document.body.appendChild(l);
    }
    l.style.display = show ? 'flex' : 'none';
}

function formatPrice(n) { return Number(n).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// expose for inline onclick fallbacks
window.selectOrderType = selectOrderType;
window.submitOrder = submitOrder;

// ============================================================
// ⭐ เมนูพิเศษ Modal (แยกจาก openItemModal เพราะ item ไม่อยู่ใน state.menu)
// ============================================================
function openFlashSaleModal(flashItem) {
    let modal = document.getElementById('itemModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'itemModal';
        modal.className = 'modal-bg';
        document.body.appendChild(modal);
    }
    let qty = 1;
    modal.innerHTML = `
        <div class="modal-card">
            ${flashItem.image_url ? `<div class="modal-img" style="background-image:url('${flashItem.image_url}')"></div>` : ''}
            <h3 class="modal-title">⭐ ${escapeHtml(flashItem.name)}</h3>
            <p class="modal-desc">${escapeHtml(flashItem.description || '')}</p>
            <div class="modal-price" style="color:#dc2626;">฿${formatPrice(flashItem.flash_price)}</div>
            <div class="form-row">
                <label>หมายเหตุ (ถ้ามี)</label>
                <textarea id="itemNote" rows="2" placeholder="เช่น ไม่ใส่ผัก, เผ็ดน้อย"></textarea>
            </div>
            <div class="qty-row">
                <button class="qty-btn" id="qtyMinus">−</button>
                <span class="qty-val" id="qtyVal">1</span>
                <button class="qty-btn" id="qtyPlus">+</button>
            </div>
            <div class="modal-btns">
                <button class="btn btn-ghost" id="modalCancel">ยกเลิก</button>
                <button class="btn btn-primary" id="modalAdd" style="background:#dc2626;">⭐ เพิ่มลงตะกร้า</button>
            </div>
        </div>`;
    modal.style.display = 'flex';
    modal.querySelector('#qtyMinus').addEventListener('click', () => {
        if (qty > 1) { qty--; modal.querySelector('#qtyVal').textContent = qty; }
    });
    modal.querySelector('#qtyPlus').addEventListener('click', () => {
        qty++; modal.querySelector('#qtyVal').textContent = qty;
    });
    modal.querySelector('#modalCancel').addEventListener('click', () => { modal.style.display = 'none'; });
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
    modal.querySelector('#modalAdd').addEventListener('click', () => {
        const note = (modal.querySelector('#itemNote') || {}).value || '';
        // addToCart(item, qty, note) — ส่ง 3 argument แยก ไม่ใช่ object เดียว
        addToCart(
            { id: 'special_' + flashItem.id, name: '⭐ ' + flashItem.name, price: Number(flashItem.flash_price) },
            qty,
            note.trim()
        );
        modal.style.display = 'none';
    });
}
window.openFlashSaleModal = openFlashSaleModal;

// ============================================================
// 👤 Returning Customer + Order History
// ============================================================
function showReturningCustomer() {
    const myOrders = getMyOrders();
    const name = state.customerName;
    if (!name && !myOrders.length) return;

    const banner = document.getElementById('returningBanner');
    if (!banner) return;

    if (name) {
        banner.innerHTML = `
            <div class="returning-card">
                <div class="returning-left">
                    <div class="returning-avatar">${name.replace(/[\u{1F300}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,'').trim().charAt(0).toUpperCase() || '👤'}</div>
                    <div>
                        <div class="returning-name">ยินดีต้อนรับ <strong>${escHtml(name)}</strong>!</div>
                        <div class="returning-sub">ข้อมูลของคุณถูกจำไว้แล้ว</div>
                    </div>
                </div>
                <div class="returning-actions">
                    ${myOrders.length ? `<button class="btn-order-history" id="btnMyOrders">📋 ออเดอร์ของฉัน (${myOrders.length})</button>` : ''}
                    <button class="btn-clear-profile" id="btnClearProfile">เปลี่ยนชื่อ</button>
                </div>
            </div>`;
        banner.style.display = 'block';

        const histBtn = document.getElementById('btnMyOrders');
        if (histBtn) histBtn.addEventListener('click', openOrderHistory);
        const clearBtn = document.getElementById('btnClearProfile');
        if (clearBtn) clearBtn.addEventListener('click', clearProfile);
    }
}

function getMyOrders() {
    try {
        return JSON.parse(localStorage.getItem('maeyom_my_orders') || '[]');
    } catch(e) { return []; }
}

function clearProfile() {
    if (!confirm('ล้างข้อมูลชื่อและออเดอร์เก่า?')) return;
    localStorage.removeItem('maeyom_customer');
    localStorage.removeItem('maeyom_my_orders');
    state.customerName = '';
    state.customerPhone = '';
    const banner = document.getElementById('returningBanner');
    if (banner) banner.style.display = 'none';
    notifier.showToast('ล้างข้อมูลแล้ว', 'info');
}

async function openOrderHistory() {
    const myOrders = getMyOrders();
    if (!myOrders.length) { notifier.showToast('ยังไม่มีออเดอร์', 'info'); return; }

    // สร้าง modal
    let modal = document.getElementById('orderHistoryModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'orderHistoryModal';
        modal.className = 'modal-bg';
        document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-card" style="max-width:520px;max-height:80vh;overflow-y:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h2 style="font-family:'Cormorant Garamond',serif;color:var(--color-emerald);margin:0;font-size:24px;">📋 ออเดอร์ของฉัน</h2>
                <button id="closeHistoryModal" style="background:none;border:none;font-size:22px;cursor:pointer;color:#999;">✕</button>
            </div>
            <div id="historyList">
                <div style="text-align:center;padding:20px;"><div class="spinner" style="width:32px;height:32px;border-width:3px;margin:0 auto;"></div></div>
            </div>
        </div>`;

    document.getElementById('closeHistoryModal').addEventListener('click', () => {
        modal.style.display = 'none';
    });
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

    // โหลดสถานะ orders
    const list = document.getElementById('historyList');
    try {
        // ใช้ getOrders แทน getOrder — เพราะ getOrders ทำงานได้แน่นอน (admin ใช้ path เดียวกัน)
        // ดึงออเดอร์ทั้งหมดแล้ว filter client-side ด้วย order_number หรือ id
        const savedIds = new Set(myOrders.map(o => String(o.id)));
        const savedNums = new Set(myOrders.map(o => String(o.order_number || '')).filter(Boolean));

        let allOrders = [];
        try {
            allOrders = await API.getOrders({ status: 'all', limit: 200 });
        } catch(e) {
            allOrders = [];
        }

        // match ด้วย id หรือ order_number (fallback)
        const foundOrders = allOrders.filter(o =>
            savedIds.has(String(o.id)) || savedNums.has(String(o.order_number))
        );

        // สร้าง map: order_number → order data
        const orderMap = {};
        // เติม found orders ก่อน
        foundOrders.forEach(o => {
            orderMap[String(o.order_number)] = { data: o, error: null };
        });
        // เติม not-found (แสดง grayed out)
        myOrders.forEach(saved => {
            const key = String(saved.order_number);
            if (!orderMap[key]) {
                orderMap[key] = { data: null, saved, error: 'ไม่พบออเดอร์' };
            } else {
                orderMap[key].saved = saved;
            }
        });

        if (Object.keys(orderMap).length === 0) {
            list.innerHTML = `<div style="text-align:center;padding:30px 20px;"><div style="font-size:48px;">📭</div><p style="color:var(--color-muted);">ยังไม่มีออเดอร์</p></div>`;
            return;
        }

        // เรนเดอร์ทุกออเดอร์ (รวมที่โหลดไม่ได้)
        list.innerHTML = myOrders.slice(0,10).map(saved => {
            const entry = orderMap[String(saved.order_number)] || orderMap[String(saved.id)];
            if (!entry) return '';
            if (entry.error) {
                // โหลดไม่ได้ — แสดง grayed out พร้อมเลขออเดอร์จาก localStorage
                return `
                    <div class="history-card" style="opacity:.55;cursor:default;">
                        <div class="history-head">
                            <span class="history-num">#${escHtml(saved.order_number || '?')}</span>
                            <span class="history-date">${saved.created_at ? new Date(saved.created_at).toLocaleDateString('th-TH',{day:'numeric',month:'short'}) : ''}</span>
                            <span class="history-badge" style="background:#fee2e2;color:#ef4444;">⚠️ โหลดไม่ได้</span>
                        </div>
                        <div class="history-items" style="color:#ef4444;font-size:12px;">${escHtml(entry.error)}</div>
                    </div>`;
            }
            const o = entry.data;
            const st = ORDER_STATUS[o.status] || { label: o.status, icon: '?', color: '#999' };
            const dt = new Date(o.created_at);
            const dateStr = dt.toLocaleDateString('th-TH', { day:'numeric', month:'short' }) +
                            ' ' + dt.toLocaleTimeString('th-TH', { hour:'2-digit', minute:'2-digit' });
            const items = (o.items || []).slice(0, 3).map(i => `${i.quantity}× ${i.name}`).join(', ');
            const moreItems = (o.items || []).length > 3 ? ` +${o.items.length - 3} รายการ` : '';
            const tableInfo = o.table_number ? `🪑 โต๊ะ ${o.table_number}` : (o.order_type === 'takeaway' ? '🥡 กลับบ้าน' : '');
            return `
                <div class="history-card" data-order-id="${o.id}" style="cursor:pointer;">
                    <div class="history-head">
                        <span class="history-num" style="white-space:nowrap;">#${escHtml(o.order_number || '')}</span>
                        <span class="history-date">${dateStr}</span>
                        <span class="history-badge" style="background:${st.color}22;color:${st.color};white-space:nowrap;">${st.icon} ${st.label}</span>
                    </div>
                    ${tableInfo ? `<div style="font-size:12px;color:var(--color-muted);margin-bottom:4px;font-weight:600;">${tableInfo}</div>` : ''}
                    <div class="history-items">${escHtml(items + moreItems)}</div>
                    <div class="history-total">฿${Number(o.total_amount || 0).toFixed(0)} → <span style="color:var(--color-gold);font-weight:600;">ดูสถานะ →</span></div>
                </div>`;
        }).join('');

        // คลิกไปหน้าสถานะ (เฉพาะที่โหลดได้)
        list.querySelectorAll('.history-card[data-order-id]').forEach(card => {
            card.addEventListener('click', () => {
                window.location.href = 'status.html?id=' + card.dataset.orderId;
            });
        });
    } catch(e) {
        list.innerHTML = '<p style="text-align:center;color:#c33;">โหลดล้มเหลว: ' + e.message + '</p>';
    }
}

function escHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
window.openOrderHistory = openOrderHistory;

// ============================================================
// 🔄 Silent Menu Polling — อัปเดตสถานะเมนูเงียบๆ
// ============================================================
let _menuPollTimer = null;

function startMenuPolling() {
    // ป้องกัน duplicate interval
    if (_menuPollTimer) return;
    const interval = (typeof CONFIG !== 'undefined' && CONFIG.CUSTOMER_POLL_INTERVAL)
        ? CONFIG.CUSTOMER_POLL_INTERVAL
        : 5000;
    _menuPollTimer = setInterval(pollMenuAvailability, interval);
}

function stopMenuPolling() {
    if (_menuPollTimer) {
        clearInterval(_menuPollTimer);
        _menuPollTimer = null;
    }
}

async function pollMenuAvailability() {
    // poll เฉพาะตอนอยู่หน้าเมนู
    if (state.step !== 'menu') return;
    try {
        const data = await API.getBootstrap();
        const newMenu = data.menu || [];

        // เช็คว่ามีการเปลี่ยน is_available หรือไม่
        let changed = newMenu.length !== state.menu.length;
        if (!changed) {
            for (const newItem of newMenu) {
                const old = state.menu.find(i => i.id === newItem.id);
                if (!old || !!old.is_available !== !!newItem.is_available) {
                    changed = true;
                    break;
                }
            }
        }

        if (!changed) return; // ไม่มีอะไรเปลี่ยน → ไม่ต้อง render ใหม่

        // อัปเดต state แล้ว re-render เงียบๆ (ไม่มี loading spinner)
        state.menu       = newMenu;
        state.categories = data.categories || [];
        renderCategories();
        renderMenu();
        // ✅ re-render partner banner ด้วยเพื่อไม่ให้หายหลัง poll
        renderPartnerBanner();

    } catch (e) {
        // เงียบๆ ถ้า poll ไม่สำเร็จ (network ชั่วคราว)
        console.warn('[MenuPoll]', e.message);
    }
}

// ============================================================
// 🏪 Partner Banner — แสดงร้านพาร์ทเนอร์ในหน้าเมนู
// ============================================================
async function renderPartnerBanner() {
    const el = document.getElementById('specialMenuSection');
    if (!el) return;

    try {
        const data = await API.call('getPartners', {});
        const partners = (data.partners || []).filter(function(p) { return p.isActive && p.isApproved; });
        if (!partners.length) { el.innerHTML = ''; el.style.display = 'none'; return; }

        const orderType = new URLSearchParams(location.search).get('type') || 'dine_in';

        const cards = partners.map(function(p) {
            const bannerStyle = p.bannerUrl
                ? 'background-image:url(\'' + p.bannerUrl + '\');background-size:cover;background-position:center;'
                : '';
            const logoHtml = p.logoUrl
                ? '<img src="' + p.logoUrl + '" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">'
                : (p.icon || '🏪');
            return '<a href="menu.html?partner=' + encodeURIComponent(p.partnerId) + '&amp;type=' + encodeURIComponent(orderType) + '"'
                + ' style="flex-shrink:0;width:140px;background:#fff;border-radius:14px;box-shadow:0 2px 10px rgba(0,0,0,.07);overflow:hidden;text-decoration:none;border:1px solid #EDE5D3;display:block;">'
                + '<div style="height:72px;background:linear-gradient(135deg,#4A0E0E,#651713);' + bannerStyle + 'display:flex;align-items:center;justify-content:center;font-size:28px;position:relative;">'
                + (p.bannerUrl ? '' : (p.icon || '🏪'))
                + '<div style="position:absolute;bottom:-14px;left:10px;width:32px;height:32px;border-radius:8px;background:#fff;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.15);display:flex;align-items:center;justify-content:center;font-size:16px;overflow:hidden;">'
                + logoHtml
                + '</div></div>'
                + '<div style="padding:20px 10px 10px;">'
                + '<div style="font-weight:700;color:#651713;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(p.partnerName) + '</div>'
                + '<div style="font-size:11px;color:#6B6B6B;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(p.category || '') + '</div>'
                + '</div></a>';
        }).join('');

        el.innerHTML = '<div style="margin-bottom:20px;">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">'
            + '<div style="font-family:\'Cormorant Garamond\',serif;font-size:20px;font-weight:600;color:#651713;">🏪 ร้านพาร์ทเนอร์</div>'
            + '<a href="partner-store.html" style="font-size:13px;color:#C9A861;font-weight:600;text-decoration:none;">ดูทั้งหมด →</a>'
            + '</div>'
            + '<div style="display:flex;gap:12px;overflow-x:auto;padding-bottom:8px;scrollbar-width:none;">'
            + cards
            + '</div>'
            + '<div style="height:1px;background:#EDE5D3;margin-top:8px;"></div>'
            + '</div>';

        // ✅ แสดง element (CSS ซ่อนไว้ด้วย display:none)
        el.style.display = 'block';

    } catch(e) {
        console.warn('[PartnerBanner]', e.message);
        el.innerHTML = '';
        el.style.display = 'none';
    }
}

function esc(s) {
    return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
