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
        menuState.items = data.menu || [];
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
