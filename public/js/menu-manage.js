// ============================================================
// 🍜 Menu Management JS - จัดการเมนู
// ============================================================

const menuState = {
    categories: [],
    items: [],
    currentCatId: 'all',
    editingId: null,
    pendingFile: null,
    currentImageUrl: null,
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
    if (!checkConfig()) return;
    bindEvents();
    await loadAll();
    // เริ่มตรวจสอบตารางเวลาเปิด-ปิดครัว
    initKitchenScheduleChecker();
}

// ============================================================
// 🎯 Events
// ============================================================
function bindEvents() {
    // Top buttons
    const addCatBtn = document.getElementById('btnAddCat');
    if (addCatBtn) addCatBtn.addEventListener('click', openCategoryModal);

    const addMenuBtn = document.getElementById('btnAddMenu');
    if (addMenuBtn) addMenuBtn.addEventListener('click', openMenuModal);

    const kitchenBtn = document.getElementById('btnKitchen');
    if (kitchenBtn) kitchenBtn.addEventListener('click', openKitchenModal);

    // Menu modal
    const saveMenuBtn = document.getElementById('btnSaveMenu');
    if (saveMenuBtn) saveMenuBtn.addEventListener('click', saveMenu);

    const cancelMenuBtn = document.getElementById('btnCancelMenu');
    if (cancelMenuBtn) cancelMenuBtn.addEventListener('click', closeMenuModal);

    const imageInput = document.getElementById('inpImage');
    if (imageInput) imageInput.addEventListener('change', onImagePick);

    // Drag & Drop + คลิกเพื่อเลือก สำหรับเมนูทั่วไป
    setupImageDropzone('imgPreview', 'inpImage', onImagePick);

    // Category modal
    const saveCatBtn = document.getElementById('btnSaveCat');
    if (saveCatBtn) saveCatBtn.addEventListener('click', saveCategory);

    const cancelCatBtn = document.getElementById('btnCancelCat');
    if (cancelCatBtn) cancelCatBtn.addEventListener('click', closeCategoryModal);

    // Event delegation: category bar
    const catBar = document.getElementById('catBar');
    if (catBar) {
        catBar.addEventListener('click', (e) => {
            const xBtn = e.target.closest('.x[data-cat-id]');
            if (xBtn) {
                e.stopPropagation();
                const id = xBtn.dataset.catId;
                const name = xBtn.dataset.catName;
                deleteCategory(id, name);
                return;
            }
            const chip = e.target.closest('.cat-chip[data-cat-id]');
            if (chip) {
                menuState.currentCatId = chip.dataset.catId;
                renderCatBar();
                renderItems();
            }
        });
    }

    // Event delegation: menu grid
    const grid = document.getElementById('menuGrid');
    if (grid) {
        grid.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            e.stopPropagation();
            const id = btn.dataset.itemId;
            const name = btn.dataset.itemName;
            const avail = btn.dataset.avail === '1';
            switch (btn.dataset.action) {
                case 'toggle-available': toggleAvailable(id, !avail); break;
                case 'edit': openEditMenu(id); break;
                case 'delete': deleteItem(id, name); break;
            }
        });
    }
}

// ============================================================
// 📥 Load All
// ============================================================
async function loadAll() {
    try {
        const data = await API.getBootstrap();
        menuState.categories = data.categories || [];
        // ✅ กรองเมนูพาร์ทเนอร์ออก — หน้านี้จัดการเฉพาะเมนูของโรงแรมเท่านั้น
        // (เมนูพาร์ทเนอร์จัดการแยกที่ Partner App ของแต่ละร้าน)
        menuState.items = (data.menu || []).filter(item => !item.is_partner);
        renderCatBar();
        fillCategoryDropdown();
        renderItems();
    } catch (err) {
        console.error(err);
        notifier.showToast('โหลดข้อมูลล้มเหลว: ' + err.message, 'error', 5000);
    }
}

// ============================================================
// 📂 Categories
// ============================================================
function renderCatBar() {
    const bar = document.getElementById('catBar');
    if (!bar) return;
    let html = '<div class="cat-chip ' + (menuState.currentCatId === 'all' ? 'active' : '') + '" data-cat-id="all">📋 ทั้งหมด</div>';
    html += menuState.categories.map(c => `
        <div class="cat-chip ${menuState.currentCatId === c.id ? 'active' : ''}" data-cat-id="${c.id}">
            ${c.icon || ''} ${escapeHtml(c.name)}
            <span class="x" data-cat-id="${c.id}" data-cat-name="${escapeHtml(c.name)}" title="ลบหมวดหมู่">×</span>
        </div>`).join('');
    bar.innerHTML = html;
}

function fillCategoryDropdown() {
    const sel = document.getElementById('inpCategory');
    if (!sel) return;
    sel.innerHTML = menuState.categories.map(c =>
        '<option value="' + c.id + '">' + (c.icon || '') + ' ' + escapeHtml(c.name) + '</option>'
    ).join('');
}

function openCategoryModal() {
    document.getElementById('inpCatName').value = '';
    document.getElementById('inpCatIcon').value = '';
    document.getElementById('inpCatOrder').value = (menuState.categories.length + 1) * 10;
    document.getElementById('categoryModal').style.display = 'flex';
}

function closeCategoryModal() {
    document.getElementById('categoryModal').style.display = 'none';
}

async function saveCategory() {
    const name = document.getElementById('inpCatName').value.trim();
    const icon = document.getElementById('inpCatIcon').value.trim();
    const order = parseInt(document.getElementById('inpCatOrder').value) || 99;
    if (!name) { notifier.showToast('กรุณาใส่ชื่อหมวดหมู่', 'error'); return; }

    const btn = document.getElementById('btnSaveCat');
    btn.disabled = true;
    try {
        await API.addCategory({ name: name, icon: icon, display_order: order });
        notifier.showToast('✓ เพิ่มหมวดหมู่สำเร็จ', 'success');
        closeCategoryModal();
        await loadAll();
    } catch (err) {
        notifier.showToast('บันทึกล้มเหลว: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

async function deleteCategory(id, name) {
    const inUse = menuState.items.filter(i => i.category_id === id).length;
    let msg = 'ลบหมวดหมู่ "' + name + '"?';
    if (inUse > 0) msg += '\n\n⚠️ มีเมนู ' + inUse + ' รายการในหมวดนี้ — เมนูจะไม่ถูกลบ แต่จะไม่อยู่ในหมวดใดๆ';
    if (!confirm(msg)) return;
    try {
        await API.deleteCategory(id);
        if (menuState.currentCatId === id) menuState.currentCatId = 'all';
        notifier.showToast('✓ ลบหมวดหมู่สำเร็จ', 'success');
        await loadAll();
    } catch (err) {
        notifier.showToast('ลบล้มเหลว: ' + err.message, 'error');
    }
}

// ============================================================
// 🍽️ Menu Items
// ============================================================
function renderItems() {
    const grid = document.getElementById('menuGrid');
    if (!grid) return;
    let items = menuState.currentCatId === 'all' ? menuState.items :
                menuState.items.filter(i => i.category_id === menuState.currentCatId);

    if (items.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="ico">🍽️</div>
                <h3 style="font-family:'Cormorant Garamond',serif;color:var(--color-emerald);">ยังไม่มีเมนูในหมวดนี้</h3>
                <p>คลิก "+ เพิ่มเมนู" เพื่อเริ่มต้น</p>
            </div>`;
        return;
    }

    grid.innerHTML = items.map(item => {
        const cat = menuState.categories.find(c => c.id === item.category_id);
        const avail = item.is_available !== false;
        return `
            <div class="menu-card ${avail ? '' : 'unavailable'}">
                <div class="img ${item.image_url ? '' : 'empty'}" ${item.image_url ? `style="background-image:url('${item.image_url}')"` : ''}>
                    ${item.image_url ? '' : '🍽️'}
                    <div class="badges">
                        ${item.is_recommended ? '<span class="badge-chip rec">⭐ แนะนำ</span>' : ''}
                        ${item.is_spicy ? '<span class="badge-chip spicy">🌶️ เผ็ด</span>' : ''}
                        ${!avail ? '<span class="badge-chip off">ปิดขาย</span>' : ''}
                    </div>
                </div>
                <div class="body">
                    <div class="name">${escapeHtml(item.name)}</div>
                    <div class="desc">${escapeHtml(item.description || '')}${cat ? ' • ' + (cat.icon || '') + ' ' + escapeHtml(cat.name) : ''}</div>
                    <div class="price">฿${formatPrice(item.price)}</div>
                    <div class="row-btns">
                        <button class="btn btn-ghost" data-action="toggle-available" data-item-id="${item.id}" data-avail="${avail ? '1' : '0'}">${avail ? 'ปิดขาย' : 'เปิดขาย'}</button>
                        <button class="btn btn-ghost" data-action="edit" data-item-id="${item.id}">แก้ไข</button>
                        <button class="btn btn-ghost" data-action="delete" data-item-id="${item.id}" data-item-name="${escapeHtml(item.name)}" style="color:#c33;">ลบ</button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

function openMenuModal() {
    if (menuState.categories.length === 0) {
        notifier.showToast('กรุณาเพิ่มหมวดหมู่ก่อน', 'error');
        return;
    }
    menuState.editingId = null;
    menuState.pendingFile = null;
    menuState.currentImageUrl = null;
    document.getElementById('menuModalTitle').textContent = 'เพิ่มเมนูใหม่';
    document.getElementById('inpName').value = '';
    document.getElementById('inpDesc').value = '';
    document.getElementById('inpPrice').value = '';
    document.getElementById('inpCategory').value = menuState.currentCatId !== 'all' ? menuState.currentCatId : (menuState.categories[0] ? menuState.categories[0].id : '');
    document.getElementById('inpAvailable').checked = true;
    document.getElementById('inpRecommended').checked = false;
    document.getElementById('inpSpicy').checked = false;
    document.getElementById('inpImage').value = '';
    const prev = document.getElementById('imgPreview');
    prev.style.backgroundImage = '';
    prev.textContent = '📷 ยังไม่มีรูป';
    document.getElementById('menuModal').style.display = 'flex';
}

function openEditMenu(id) {
    const item = menuState.items.find(i => i.id === id);
    if (!item) return;
    menuState.editingId = id;
    menuState.pendingFile = null;
    menuState.currentImageUrl = item.image_url;
    document.getElementById('menuModalTitle').textContent = 'แก้ไขเมนู';
    document.getElementById('inpName').value = item.name;
    document.getElementById('inpDesc').value = item.description || '';
    document.getElementById('inpPrice').value = item.price;
    document.getElementById('inpCategory').value = item.category_id || '';
    document.getElementById('inpAvailable').checked = item.is_available !== false;
    document.getElementById('inpRecommended').checked = !!item.is_recommended;
    document.getElementById('inpSpicy').checked = !!item.is_spicy;
    document.getElementById('inpImage').value = '';
    const prev = document.getElementById('imgPreview');
    if (item.image_url) {
        prev.style.backgroundImage = "url('" + item.image_url + "')";
        prev.textContent = '';
    } else {
        prev.style.backgroundImage = '';
        prev.textContent = '📷 ยังไม่มีรูป';
    }
    document.getElementById('menuModal').style.display = 'flex';
}

function closeMenuModal() {
    document.getElementById('menuModal').style.display = 'none';
    menuState.editingId = null;
    menuState.pendingFile = null;
}

async function onImagePick(e) {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
        notifier.showToast('ไฟล์ใหญ่เกินไป (สูงสุด 5MB)', 'error');
        e.target.value = '';
        return;
    }
    // Resize ก่อนเก็บ — ทำให้รูปพอดีกับการ์ดเมนู
    let resized = f;
    try {
        resized = await resizeImageFile(f);
    } catch(err) {
        console.warn('resize failed, using original', err);
    }
    menuState.pendingFile = resized;
    const url = URL.createObjectURL(resized);
    const prev = document.getElementById('imgPreview');
    prev.style.backgroundImage = "url('" + url + "')";
    prev.textContent = '';
}

async function saveMenu() {
    const name = document.getElementById('inpName').value.trim();
    const desc = document.getElementById('inpDesc').value.trim();
    const price = parseFloat(document.getElementById('inpPrice').value);
    const cat = document.getElementById('inpCategory').value;
    const avail = document.getElementById('inpAvailable').checked;
    const rec = document.getElementById('inpRecommended').checked;
    const spicy = document.getElementById('inpSpicy').checked;

    if (!name || isNaN(price) || price < 0 || !cat) {
        notifier.showToast('กรุณากรอกข้อมูลให้ครบ', 'error');
        return;
    }

    const btn = document.getElementById('btnSaveMenu');
    btn.disabled = true;
    btn.textContent = 'กำลังบันทึก...';

    try {
        let imageUrl = menuState.currentImageUrl || '';
        if (menuState.pendingFile) {
            btn.textContent = 'อัปโหลดรูป...';
            try {
                const result = await API.uploadImage(menuState.pendingFile);
                imageUrl = result.url;
            } catch (e) {
                console.error(e);
                notifier.showToast('อัปโหลดรูปล้มเหลว — บันทึกเมนูโดยไม่มีรูป', 'error', 4000);
            }
        }

        const payload = {
            name: name,
            description: desc,
            price: price,
            category_id: cat,
            is_available: avail,
            is_recommended: rec,
            is_spicy: spicy,
            image_url: imageUrl
        };

        if (menuState.editingId) {
            payload.id = menuState.editingId;
            await API.updateMenuItem(payload);
            notifier.showToast('✓ แก้ไขเมนูสำเร็จ', 'success');
        } else {
            await API.addMenuItem(payload);
            notifier.showToast('✓ เพิ่มเมนูสำเร็จ', 'success');
        }
        notifier.playSuccessSound();
        closeMenuModal();
        await loadAll();
    } catch (err) {
        console.error(err);
        notifier.showToast('บันทึกล้มเหลว: ' + err.message, 'error', 5000);
    } finally {
        btn.disabled = false;
        btn.textContent = 'บันทึก';
    }
}

async function toggleAvailable(id, newVal) {
    try {
        await API.toggleAvailable(id, newVal);
        notifier.showToast(newVal ? '✓ เปิดขายแล้ว' : '✓ ปิดขายแล้ว', 'success', 1500);
        await loadAll();
    } catch (err) {
        notifier.showToast('อัปเดตล้มเหลว: ' + err.message, 'error');
    }
}

async function deleteItem(id, name) {
    if (!confirm('ลบเมนู "' + name + '"?')) return;
    try {
        await API.deleteMenuItem(id);
        notifier.showToast('✓ ลบเมนูสำเร็จ', 'success');
        await loadAll();
    } catch (err) {
        notifier.showToast('ลบล้มเหลว: ' + err.message, 'error');
    }
}

function formatPrice(n) { return Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ============================================================
// 🖼️ Drag & Drop + Click-to-browse Image Upload
// ============================================================
function setupImageDropzone(previewId, inputId, onChangeFn) {
    const preview = document.getElementById(previewId);
    const input   = document.getElementById(inputId);
    if (!preview || !input) return;

    // คลิกที่ preview → เปิด file picker
    preview.addEventListener('click', () => input.click());

    // Drag events
    ['dragenter','dragover'].forEach(ev => {
        preview.addEventListener(ev, (e) => {
            e.preventDefault();
            preview.classList.add('dragover');
        });
    });
    ['dragleave','dragend'].forEach(ev => {
        preview.addEventListener(ev, () => preview.classList.remove('dragover'));
    });
    preview.addEventListener('drop', (e) => {
        e.preventDefault();
        preview.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            // สร้าง synthetic event เพื่อส่งต่อ
            handleImageFile(file, previewId, inputId.replace('inp','inp') === 'inpImage' ? 'menu' : 'flash');
        } else if (file) {
            notifier.showToast('กรุณาเลือกไฟล์รูปภาพ (jpg, png, gif ฯลฯ)', 'error');
        }
    });

    // รับ paste จาก clipboard ด้วย (Ctrl+V)
    document.addEventListener('paste', (e) => {
        const modal = preview.closest('.modal-bg');
        if (!modal || modal.style.display === 'none') return;
        const items = e.clipboardData && e.clipboardData.items;
        if (!items) return;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) handleImageFile(file, previewId, inputId === 'inpImage' ? 'menu' : 'flash');
                break;
            }
        }
    });
}

// ── ย่อ/ขยายรูปภาพให้พอดีกับขนาดการ์ดเมนู (fit แบบ contain — รูปไม่ถูกตัด) ──────────────
function resizeImageFile(file, targetW = 600, targetH = 600) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            const canvas = document.createElement('canvas');
            canvas.width  = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d');

            // พื้นหลังสีขาวนวล เหมือน card background
            ctx.fillStyle = '#fafaf6';
            ctx.fillRect(0, 0, targetW, targetH);

            // Fit แบบ contain — scale ให้พอดีโดยไม่ตัดรูป
            const scale = Math.min(targetW / img.width, targetH / img.height);
            const dw = Math.round(img.width  * scale);
            const dh = Math.round(img.height * scale);
            const dx = Math.round((targetW - dw) / 2);
            const dy = Math.round((targetH - dh) / 2);

            ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, dw, dh);

            canvas.toBlob(blob => {
                if (!blob) { reject(new Error('canvas toBlob failed')); return; }
                const resized = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
                resolve(resized);
            }, 'image/jpeg', 0.88);
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load image failed')); };
        img.src = url;
    });
}

async function handleImageFile(file, previewId, type) {
    if (file.size > 5 * 1024 * 1024) {
        notifier.showToast('ไฟล์ใหญ่เกิน 5MB', 'error');
        return;
    }

    // Resize ก่อน — ทำให้รูปพอดีกับการ์ดเมนูทุกรูป
    let uploadFile = file;
    try {
        uploadFile = await resizeImageFile(file);
    } catch(e) {
        console.warn('resize failed, using original', e);
    }

    // แสดง preview จากไฟล์ที่ resize แล้ว
    const reader = new FileReader();
    reader.onload = (e) => {
        const prev = document.getElementById(previewId);
        if (prev) {
            prev.style.backgroundImage = `url('${e.target.result}')`;
            prev.innerHTML = '<span class="drop-hint">🖱️ คลิกเพื่อเลือก หรือลากไฟล์มาวางได้เลย</span>';
        }
    };
    reader.readAsDataURL(uploadFile);

    // อัปโหลดจริง
    notifier.showToast('กำลังอัปโหลดรูป...', 'info', 3000);
    try {
        const result = await API.uploadImage(uploadFile);
        if (type === 'menu') {
            menuState.editingImageUrl = result.url;
        } else {
            const urlInput = document.getElementById('inpFlashImageUrl');
            if (urlInput) urlInput.value = result.url;
        }
        notifier.showToast('✓ อัปโหลดรูปแล้ว', 'success');
    } catch(e) {
        notifier.showToast('อัปโหลดล้มเหลว: ' + e.message, 'error');
    }
}

// ============================================================
// 🔴 Kitchen Close Manager
// ============================================================
const KITCHEN_KEY   = 'maeyom_kitchen';      // localStorage key
let kitchenState = { action:'close', scope:'all', catIds:[], itemIds:[], timerMins:0, reopenAt:0 };
let kitchenCountdownTimer = null;

// ── เปิด Modal ───────────────────────────────────────────────
function openKitchenModal() {
    // โหลดสถานะปัจจุบันจาก localStorage
    const saved = loadKitchenRecord();
    kitchenState.action   = 'close';
    kitchenState.scope    = 'all';
    kitchenState.catIds   = [];
    kitchenState.itemIds  = [];
    kitchenState.timerMins = 0;
    kitchenState.reopenAt  = 0;

    setKitchenAction('close');
    setKitchenScope('all');
    setKTimer(0);
    renderKCatList();
    renderKItemList();
    updateKSummary();

    // ตั้งค่า date ปัจจุบันใน datepicker
    const today = new Date().toISOString().slice(0,10);
    const el = document.getElementById('kDateUntil');
    if (el) el.value = today;

    document.getElementById('kitchenModal').style.display = 'flex';
}
function closeKitchenModal() {
    document.getElementById('kitchenModal').style.display = 'none';
}

// ── Action / Scope / Timer helpers ───────────────────────────
function setKitchenAction(act) {
    kitchenState.action = act;
    document.getElementById('kActClose').classList.toggle('k-act-active', act==='close');
    document.getElementById('kActOpen').classList.toggle('k-act-active', act==='open');
    const applyBtn = document.getElementById('btnApplyKitchen');
    if (act === 'close') {
        applyBtn.textContent = '🔴 ปิดขาย';
        applyBtn.style.background = '#b91c1c';
        document.getElementById('kTimerSection').style.display = '';
    } else {
        applyBtn.textContent = '🟢 เปิดขาย';
        applyBtn.style.background = '#059669';
        document.getElementById('kTimerSection').style.display = 'none';
    }
    updateKSummary();
}

function setKitchenScope(scope) {
    kitchenState.scope = scope;
    document.querySelectorAll('.k-scope-btn').forEach(b => b.classList.toggle('k-scope-active', b.dataset.scope === scope));
    document.getElementById('kCatPicker').style.display  = scope === 'category' ? '' : 'none';
    document.getElementById('kItemPicker').style.display = scope === 'items'    ? '' : 'none';
    updateKSummary();
}

function setKTimer(mins) {
    kitchenState.timerMins = mins;
    document.querySelectorAll('.k-timer-btn').forEach(b => b.classList.toggle('k-timer-active', parseInt(b.dataset.mins) === mins));
    const wrap = document.getElementById('kTimeUntilWrap');
    wrap.style.display = mins === -1 ? 'flex' : 'none';
    updateKSummary();
}

// ── Category list ─────────────────────────────────────────────
function renderKCatList() {
    const el = document.getElementById('kCatList');
    if (!el) return;
    el.innerHTML = menuState.categories.map(c => {
        const sel = kitchenState.catIds.includes(c.id);
        return `<button class="k-cat-chip ${sel?'selected':''}" data-cid="${c.id}"
            onclick="kToggleCat('${c.id}')">${c.icon||''} ${escapeHtml(c.name)}</button>`;
    }).join('');
}
function kToggleCat(id) {
    const idx = kitchenState.catIds.indexOf(id);
    idx >= 0 ? kitchenState.catIds.splice(idx, 1) : kitchenState.catIds.push(id);
    renderKCatList();
    updateKSummary();
}
function kSelectAllCats() { kitchenState.catIds = menuState.categories.map(c => c.id); renderKCatList(); updateKSummary(); }
function kClearCats()      { kitchenState.catIds = []; renderKCatList(); updateKSummary(); }

// ── Item list ─────────────────────────────────────────────────
function renderKItemList() {
    const el = document.getElementById('kItemList');
    if (!el) return;
    const q = (document.getElementById('kItemSearch')?.value || '').toLowerCase();
    const items = menuState.items.filter(i => !q || i.name.toLowerCase().includes(q));
    el.innerHTML = items.map(i => {
        const sel = kitchenState.itemIds.includes(i.id);
        const cat = menuState.categories.find(c => c.id === i.category_id);
        return `<label class="k-item-row ${sel?'selected':''}">
            <input type="checkbox" ${sel?'checked':''} onchange="kToggleItem('${i.id}',this.checked)">
            <span style="flex:1;font-size:13px;font-weight:600;color:var(--color-emerald);">${escapeHtml(i.name)}</span>
            <span style="font-size:11px;color:var(--color-muted);">${cat?cat.icon+' '+escapeHtml(cat.name):''}</span>
            <span style="font-size:12px;color:var(--color-gold);font-weight:700;">฿${formatPrice(i.price)}</span>
            ${!i.is_available ? '<span style="font-size:10px;background:#e5e7eb;color:#6b7280;padding:1px 6px;border-radius:8px;">ปิดอยู่</span>' : ''}
        </label>`;
    }).join('') || '<div style="padding:12px;text-align:center;color:var(--color-muted);font-size:13px;">ไม่พบเมนู</div>';
}
function kToggleItem(id, checked) {
    const idx = kitchenState.itemIds.indexOf(id);
    if (checked && idx < 0) kitchenState.itemIds.push(id);
    else if (!checked && idx >= 0) kitchenState.itemIds.splice(idx, 1);
    renderKItemList();
    updateKSummary();
}
function kSelectAllItems() { kitchenState.itemIds = menuState.items.map(i => i.id); renderKItemList(); updateKSummary(); }
function kClearItems()      { kitchenState.itemIds = []; renderKItemList(); updateKSummary(); }

// ── คำนวณรายการที่จะถูกกระทบ ─────────────────────────────────
function getTargetItems() {
    if (kitchenState.scope === 'all') return menuState.items.map(i => i.id);
    if (kitchenState.scope === 'category') {
        return menuState.items.filter(i => kitchenState.catIds.includes(i.category_id)).map(i => i.id);
    }
    return [...kitchenState.itemIds];
}

function updateKSummary() {
    const box = document.getElementById('kSummaryBox');
    if (!box) return;
    const ids = getTargetItems();
    if (!ids.length) { box.style.display = 'none'; return; }

    const action = kitchenState.action === 'close' ? 'ปิดขาย' : 'เปิดขาย';
    let timerText = '';
    if (kitchenState.action === 'close') {
        if (kitchenState.timerMins > 0) {
            timerText = ` · เปิดอัตโนมัติใน ${kitchenState.timerMins} นาที`;
        } else if (kitchenState.timerMins === -1) {
            const t = document.getElementById('kTimeUntil')?.value;
            const d = document.getElementById('kDateUntil')?.value;
            timerText = t ? ` · เปิดอัตโนมัติเวลา ${t} น. (${d})` : '';
        }
    }
    box.style.display = '';
    box.innerHTML = `<strong>${action}</strong> ${ids.length} เมนู${timerText}`;
}

// ── Apply ─────────────────────────────────────────────────────
async function applyKitchenAction() {
    const ids = getTargetItems();
    if (!ids.length) { notifier.showToast('กรุณาเลือกเมนูที่ต้องการ', 'error'); return; }

    const isClose = kitchenState.action === 'close';
    const btn = document.getElementById('btnApplyKitchen');
    btn.disabled = true; btn.textContent = '⏳ กำลังดำเนินการ...';

    try {
        // เรียก API ทีละรายการ (batch)
        await Promise.all(ids.map(id => API.toggleAvailable(id, !isClose)));
        notifier.showToast((isClose ? '🔴 ปิดขาย' : '🟢 เปิดขาย') + ' ' + ids.length + ' เมนูแล้ว', 'success');

        if (isClose) {
            // คำนวณเวลาเปิดอัตโนมัติ
            let reopenAt = 0;
            if (kitchenState.timerMins > 0) {
                reopenAt = Date.now() + kitchenState.timerMins * 60 * 1000;
            } else if (kitchenState.timerMins === -1) {
                const t = document.getElementById('kTimeUntil')?.value;
                const d = document.getElementById('kDateUntil')?.value;
                if (t && d) reopenAt = new Date(d + 'T' + t).getTime();
            }
            saveKitchenRecord({ closedIds: ids, reopenAt, scope: kitchenState.scope });
            startKitchenCountdown();
        } else {
            clearKitchenRecord();
            stopKitchenCountdown();
            updateKitchenBanner();
        }

        closeKitchenModal();
        await loadAll();
    } catch(e) {
        notifier.showToast('เกิดข้อผิดพลาด: ' + e.message, 'error');
    } finally {
        btn.disabled = false;
        setKitchenAction(kitchenState.action);
    }
}

// ── ยกเลิก / เปิดทั้งหมด (จากแบนเนอร์) ──────────────────────
async function cancelKitchenClose() {
    const rec = loadKitchenRecord();
    if (!rec) { clearKitchenRecord(); updateKitchenBanner(); return; }
    const ids = rec.closedIds || [];
    if (!ids.length) { clearKitchenRecord(); updateKitchenBanner(); return; }
    if (!confirm('เปิดขายเมนูทั้งหมด ' + ids.length + ' รายการ?')) return;
    try {
        await Promise.all(ids.map(id => API.toggleAvailable(id, true)));
        notifier.showToast('🟢 เปิดขายทุกเมนูแล้ว', 'success');
        clearKitchenRecord();
        stopKitchenCountdown();
        updateKitchenBanner();
        await loadAll();
    } catch(e) {
        notifier.showToast('เกิดข้อผิดพลาด: ' + e.message, 'error');
    }
}

// ── Banner ────────────────────────────────────────────────────
function updateKitchenBanner() {
    const banner = document.getElementById('kitchenBanner');
    if (!banner) return;
    const rec = loadKitchenRecord();
    if (!rec || !rec.closedIds?.length) { banner.style.display = 'none'; return; }

    banner.style.display = 'flex';
    const title = document.getElementById('kitchenBannerTitle');
    const sub   = document.getElementById('kitchenBannerSub');
    const scopeLabel = rec.scope === 'all' ? 'ทั้งหมด' : rec.scope === 'category' ? 'บางหมวดหมู่' : 'เมนูที่เลือก';
    title.textContent = '🔴 ครัวปิดการขายอยู่ — ' + rec.closedIds.length + ' เมนู (' + scopeLabel + ')';
    sub.textContent   = rec.reopenAt > 0
        ? 'จะเปิดอัตโนมัติเวลา ' + new Date(rec.reopenAt).toLocaleTimeString('th-TH', {hour:'2-digit',minute:'2-digit'})
        : 'ไม่ได้ตั้งเวลาเปิดอัตโนมัติ — กด "เปิดทั้งหมด" เมื่อพร้อม';

    // ปรับปุ่ม header
    const hBtn = document.getElementById('btnKitchen');
    if (hBtn) { hBtn.textContent = '🟢 เปิดครัว'; hBtn.style.borderColor = '#059669'; hBtn.style.color = '#059669'; }
}

function resetKitchenBtn() {
    const hBtn = document.getElementById('btnKitchen');
    if (hBtn) { hBtn.textContent = '🔴 ปิดครัว'; hBtn.style.borderColor = '#dc2626'; hBtn.style.color = '#dc2626'; }
}

// ── Countdown ─────────────────────────────────────────────────
function startKitchenCountdown() {
    stopKitchenCountdown();
    updateKitchenBanner();
    kitchenCountdownTimer = setInterval(async () => {
        const rec = loadKitchenRecord();
        if (!rec) { stopKitchenCountdown(); updateKitchenBanner(); return; }

        const el = document.getElementById('kitchenCountdown');
        if (rec.reopenAt > 0) {
            const left = rec.reopenAt - Date.now();
            if (left <= 0) {
                // ถึงเวลาเปิดอัตโนมัติ
                stopKitchenCountdown();
                notifier.showToast('⏰ ถึงเวลาเปิดครัวอัตโนมัติ!', 'info');
                try {
                    await Promise.all((rec.closedIds||[]).map(id => API.toggleAvailable(id, true)));
                    notifier.showToast('🟢 เปิดขายอัตโนมัติแล้ว', 'success');
                } catch(e) { console.error(e); }
                clearKitchenRecord();
                updateKitchenBanner();
                resetKitchenBtn();
                await loadAll();
                return;
            }
            if (el) el.textContent = fmtMs(left);
        } else {
            if (el) el.textContent = '';
        }
    }, 1000);
}

function stopKitchenCountdown() {
    if (kitchenCountdownTimer) { clearInterval(kitchenCountdownTimer); kitchenCountdownTimer = null; }
    const el = document.getElementById('kitchenCountdown');
    if (el) el.textContent = '';
}

function fmtMs(ms) {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600), m = Math.floor((s%3600)/60), sec = s%60;
    return h > 0 ? pad2k(h)+':'+pad2k(m)+':'+pad2k(sec) : pad2k(m)+':'+pad2k(sec);
}
function pad2k(n) { return String(n).padStart(2,'0'); }

// ── localStorage helpers ──────────────────────────────────────
function saveKitchenRecord(rec) { localStorage.setItem(KITCHEN_KEY, JSON.stringify(rec)); }
function loadKitchenRecord()    { try { return JSON.parse(localStorage.getItem(KITCHEN_KEY)||'null'); } catch(e){return null;} }
function clearKitchenRecord()   { localStorage.removeItem(KITCHEN_KEY); }

// ── init hook (เรียกหลัง loadAll) ────────────────────────────
const _origLoadAll = loadAll;
// ขยาย loadAll ให้เช็ค kitchen state ด้วย
async function loadAll() {
    try {
        const data = await API.getBootstrap();
        menuState.categories = data.categories || [];
        // ✅ กรองเมนูพาร์ทเนอร์ออก — หน้านี้จัดการเฉพาะเมนูของโรงแรมเท่านั้น
        // (เมนูพาร์ทเนอร์จัดการแยกที่ Partner App ของแต่ละร้าน)
        menuState.items = (data.menu || []).filter(item => !item.is_partner);
        renderCatBar();
        fillCategoryDropdown();
        renderItems();
        // หลังโหลดเมนู — ตรวจสอบ kitchen timer
        const rec = loadKitchenRecord();
        if (rec && rec.closedIds?.length) {
            updateKitchenBanner();
            startKitchenCountdown();
        } else {
            clearKitchenRecord();
            updateKitchenBanner();
            resetKitchenBtn();
        }
    } catch (err) {
        console.error(err);
        notifier.showToast('โหลดข้อมูลล้มเหลว: ' + err.message, 'error', 5000);
    }
}

// ============================================================
// 📅 Kitchen Schedule Manager (วัน/เวลา เปิด-ปิดครัวอัตโนมัติ)
// ============================================================
const KITCHEN_SCHEDULE_KEY = 'maeyom_kitchen_schedule';
let kitchenScheduleInterval = null;

// state ในหน้าต่าง modal
let kSchedDays = [];       // array ของตัวเลขวัน 0=อา,1=จ,...,6=ส

// ── โหลด / บันทึก schedule จาก localStorage ─────────────────
function loadKitchenSchedule() {
    try { return JSON.parse(localStorage.getItem(KITCHEN_SCHEDULE_KEY)) || null; }
    catch { return null; }
}
function saveKitchenScheduleRecord(rec) {
    localStorage.setItem(KITCHEN_SCHEDULE_KEY, JSON.stringify(rec));
}
function removeKitchenScheduleRecord() {
    localStorage.removeItem(KITCHEN_SCHEDULE_KEY);
}

// ── เมื่อเปิด modal โหลด schedule เดิมมาแสดง ─────────────────
// (เรียกต่อท้าย openKitchenModal เดิม)
const _origOpenKitchenModal = openKitchenModal;
openKitchenModal = function() {
    _origOpenKitchenModal();
    renderKScheduleUI();
};

function renderKScheduleUI() {
    const sched = loadKitchenSchedule();
    const enabled = !!(sched && sched.enabled);
    const days    = sched ? (sched.days || []) : [];
    const openT   = sched ? (sched.openTime  || '09:00') : '09:00';
    const closeT  = sched ? (sched.closeTime || '22:00') : '22:00';

    const chk = document.getElementById('kScheduleEnabled');
    if (chk) chk.checked = enabled;

    kSchedDays = [...days];
    renderKDayBtns();

    const ot = document.getElementById('kOpenTime');
    const ct = document.getElementById('kCloseTime');
    if (ot) ot.value = openT;
    if (ct) ct.value = closeT;

    const body = document.getElementById('kScheduleBody');
    if (body) body.style.display = enabled ? '' : 'none';

    updateKScheduleSummary();
}

// ── Toggle แสดง/ซ่อน schedule body ──────────────────────────
function toggleKSchedule(enabled) {
    const body = document.getElementById('kScheduleBody');
    if (body) body.style.display = enabled ? '' : 'none';
    updateKScheduleSummary();
}

// ── วันในสัปดาห์ ─────────────────────────────────────────────
function kToggleDay(day) {
    const idx = kSchedDays.indexOf(day);
    idx >= 0 ? kSchedDays.splice(idx, 1) : kSchedDays.push(day);
    renderKDayBtns();
    updateKScheduleSummary();
}
function kSetDays(days) {
    kSchedDays = [...days];
    renderKDayBtns();
    updateKScheduleSummary();
}
function renderKDayBtns() {
    document.querySelectorAll('.k-day-btn').forEach(btn => {
        const d = parseInt(btn.dataset.day);
        btn.classList.toggle('k-day-active', kSchedDays.includes(d));
    });
}

// ── Summary preview ───────────────────────────────────────────
const K_DAY_LABEL = { 0:'อา', 1:'จ', 2:'อ', 3:'พ', 4:'พฤ', 5:'ศ', 6:'ส' };
function updateKScheduleSummary() {
    const box = document.getElementById('kScheduleSummaryBox');
    if (!box) return;
    const enabled = document.getElementById('kScheduleEnabled')?.checked;
    if (!enabled || !kSchedDays.length) { box.style.display = 'none'; return; }
    const ot = document.getElementById('kOpenTime')?.value || '';
    const ct = document.getElementById('kCloseTime')?.value || '';
    const orderedDays = [1,2,3,4,5,6,0].filter(d => kSchedDays.includes(d));
    const dayStr = orderedDays.map(d => K_DAY_LABEL[d]).join(', ');
    box.style.display = '';
    box.innerHTML = `📆 <strong>${dayStr}</strong> &nbsp;⏰ <strong>${ot}</strong> – <strong>${ct}</strong> น.<br>
        <span style="color:#065f46;font-size:11px;">ระบบจะเปิดครัวอัตโนมัติเวลา ${ot} น. และปิดเวลา ${ct} น. ในวันที่กำหนด</span>`;
}

// ── บันทึกตารางเวลา ───────────────────────────────────────────
function saveKitchenSchedule() {
    const enabled = document.getElementById('kScheduleEnabled')?.checked;
    const ot = document.getElementById('kOpenTime')?.value;
    const ct = document.getElementById('kCloseTime')?.value;
    if (!ot || !ct) { notifier.showToast('กรุณาระบุเวลาเริ่มและปิดขาย', 'error'); return; }
    if (enabled && !kSchedDays.length) { notifier.showToast('กรุณาเลือกอย่างน้อย 1 วัน', 'error'); return; }
    if (ot >= ct) { notifier.showToast('เวลาเริ่มขายต้องก่อนเวลาปิดขาย', 'error'); return; }
    // บันทึก scope ที่เลือกไว้ใน modal ด้วย (all / category / items)
    const rec = {
        enabled:   !!enabled,
        days:      [...kSchedDays],
        openTime:  ot,
        closeTime: ct,
        scope:     kitchenState.scope   || 'all',
        catIds:    [...(kitchenState.catIds  || [])],
        itemIds:   [...(kitchenState.itemIds || [])]
    };
    saveKitchenScheduleRecord(rec);
    // ── sync ขึ้น GAS เพื่อให้ time trigger ทำงานได้แม้ปิด browser ──
    API.saveKitchenSchedule(rec)
        .then(() => notifier.showToast('⭐ บันทึกตารางเวลาแล้ว (ซิงค์ GAS แล้ว)', 'success'))
        .catch(e => {
            notifier.showToast('⭐ บันทึกในเครื่องแล้ว (GAS sync ล้มเหลว: ' + e.message + ')', 'warning');
        });
    updateKScheduleSummary();
    checkAndApplyKitchenSchedule();
}

// ── ลบตารางเวลา ──────────────────────────────────────────────
function clearKitchenSchedule() {
    if (!confirm('ลบตารางเวลาเปิด-ปิดครัวอัตโนมัติ?')) return;
    removeKitchenScheduleRecord();
    // ── ลบจาก GAS ด้วย ──
    API.deleteKitchenSchedule().catch(e => console.warn('[KitchenSchedule] GAS delete failed:', e.message));
    kSchedDays = [];
    renderKDayBtns();
    const chk = document.getElementById('kScheduleEnabled');
    if (chk) chk.checked = false;
    const body = document.getElementById('kScheduleBody');
    if (body) body.style.display = 'none';
    const box = document.getElementById('kScheduleSummaryBox');
    if (box) box.style.display = 'none';
    notifier.showToast('🗑️ ลบตารางเวลาแล้ว', 'info');
}

// ── ตรวจสอบและ apply ตารางเวลา ───────────────────────────────
async function checkAndApplyKitchenSchedule() {
    const sched = loadKitchenSchedule();
    if (!sched || !sched.enabled || !sched.days?.length) return;

    const now    = new Date();
    const today  = now.getDay();                                   // 0=อา...6=ส
    const nowHHMM = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');

    const shouldBeOpen = sched.days.includes(today)
        && nowHHMM >= sched.openTime
        && nowHHMM <  sched.closeTime;

    // อ่านสถานะเมนูปัจจุบัน (จาก menuState)
    if (!menuState || !menuState.items?.length) return;

    // ─── คำนวณ targetIds ตาม scope ที่บันทึกไว้ ───────────────
    let targetIds;
    if (sched.scope === 'category' && sched.catIds?.length) {
        targetIds = menuState.items
            .filter(i => sched.catIds.includes(i.category_id))
            .map(i => i.id);
    } else if (sched.scope === 'items' && sched.itemIds?.length) {
        targetIds = sched.itemIds.filter(id => menuState.items.find(i => i.id === id));
    } else {
        targetIds = menuState.items.map(i => i.id);
    }

    if (!targetIds.length) return;

    // หลีกเลี่ยง call API ซ้ำถ้าทุกรายการใน scope อยู่ในสถานะถูกต้องแล้ว
    const targetItems = menuState.items.filter(i => targetIds.includes(i.id));
    const alreadyRight = targetItems.every(i => !!i.is_available === shouldBeOpen);
    if (alreadyRight) return;

    try {
        await Promise.all(targetIds.map(id => API.toggleAvailable(id, shouldBeOpen)));
        const scopeLabel = sched.scope === 'category' ? ' (หมวดที่กำหนด)'
                         : sched.scope === 'items'    ? ' (เมนูที่กำหนด)'
                         : '';
        const msg = shouldBeOpen
            ? `🟢 เปิดครัวอัตโนมัติตามตาราง${scopeLabel}`
            : `🔴 ปิดครัวอัตโนมัติตามตาราง${scopeLabel}`;
        notifier.showToast(msg, 'info');
        await loadAll();
    } catch (e) {
        console.error('[KitchenSchedule] error:', e);
    }
}

// ── เริ่ม checker (ทุก 1 นาที) ───────────────────────────────
function initKitchenScheduleChecker() {
    // ตรวจสอบทันทีตอน init
    checkAndApplyKitchenSchedule();
    // ตรวจซ้ำทุก 60 วินาที
    if (kitchenScheduleInterval) clearInterval(kitchenScheduleInterval);
    kitchenScheduleInterval = setInterval(checkAndApplyKitchenSchedule, 60 * 1000);
}
