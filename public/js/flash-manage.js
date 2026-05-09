// ============================================================
// ⭐ เมนูพิเศษ Management (Admin)
// ============================================================

const flashState = {
    sales: [],
    editingId: null
};

document.addEventListener('DOMContentLoaded', initFlash);

async function initFlash() {
    if (!checkConfig()) return;
    bindFlashEvents();
    await loadFlashSales();
}

function bindFlashEvents() {
    // Tab switching
    document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    // Buttons
    const addBtn = document.getElementById('btnAddFlash');
    if (addBtn) addBtn.addEventListener('click', openAddFlashModal);
    const saveBtn = document.getElementById('btnSaveFlash');
    if (saveBtn) saveBtn.addEventListener('click', saveFlashSale);
    const cancelBtn = document.getElementById('btnCancelFlash');
    if (cancelBtn) cancelBtn.addEventListener('click', closeFlashModal);
    // Image
    const imgInp = document.getElementById('inpFlashImage');
    if (imgInp) imgInp.addEventListener('change', onFlashImageChange);

    // Drag & Drop + คลิกเพื่อเลือก สำหรับเมนูพิเศษ
    setupImageDropzone('flashImgPreview', 'inpFlashImage', onFlashImageChange);
    // Quick duration buttons
    document.querySelectorAll('[data-duration]').forEach(btn => {
        btn.addEventListener('click', () => setQuickDuration(parseInt(btn.dataset.duration)));
    });
    // Grid delegation
    const grid = document.getElementById('specialGrid');
    if (grid) {
        grid.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-flash-action]');
            if (!btn) return;
            const id = btn.dataset.flashId;
            switch (btn.dataset.flashAction) {
                case 'edit':   openEditFlashModal(id); break;
                case 'delete': deleteFlashSale(id); break;
                case 'toggle': toggleFlashSale(id, btn.dataset.active !== 'true'); break;
            }
        });
    }
}

function switchTab(tab) {
    document.querySelectorAll('[data-tab]').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === tab);
    });
    document.querySelectorAll('[data-tab-content]').forEach(c => {
        c.style.display = c.dataset.tabContent === tab ? '' : 'none';
    });
    // Toggle action buttons
    const menuActions = document.getElementById('menuActions');
    const flashActions = document.getElementById('flashActions');
    if (menuActions) menuActions.style.display = tab === 'menu' ? '' : 'none';
    if (flashActions) flashActions.style.display = tab === 'flash' ? '' : 'none';
}

async function loadFlashSales() {
    try {
        flashState.sales = await API.getAllFlashSales();
        renderFlashSales();
    } catch(e) {
        notifier.showToast('โหลด เมนูพิเศษ ล้มเหลว: ' + e.message, 'error');
    }
}

function renderFlashSales() {
    const grid = document.getElementById('specialGrid');
    if (!grid) return;
    if (!flashState.sales.length) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="ico">⚡</div><p>ยังไม่มี เมนูพิเศษ</p></div>`;
        return;
    }
    const now = new Date();
    grid.innerHTML = flashState.sales.map(f => {
        const start = new Date(f.start_time);
        const end   = new Date(f.end_time);
        let statusLabel, statusColor;
        if (!f.is_active) { statusLabel = '⛔ ปิดใช้งาน'; statusColor = '#9ca3af'; }
        else if (now < start) { statusLabel = '⏳ ยังไม่ถึงเวลา'; statusColor = '#f59e0b'; }
        else if (now > end)   { statusLabel = '✅ หมดเวลาแล้ว'; statusColor = '#9ca3af'; }
        else                  { statusLabel = '🔥 กำลังเปิดขาย!'; statusColor = '#dc2626'; }

        const discount = f.original_price > 0
            ? Math.round((1 - f.flash_price / f.original_price) * 100) : 0;

        return `
        <div class="menu-card ${!f.is_active ? 'unavailable' : ''}">
            <div class="img ${f.image_url ? '' : 'empty'}" style="${f.image_url ? `background-image:url('${f.image_url}')` : ''}">
                ${!f.image_url ? '⚡' : ''}
                <div class="badges">
                    <span class="badge-chip" style="background:${statusColor};">${statusLabel}</span>
                    ${discount > 0 ? `<span class="badge-chip spicy">-${discount}%</span>` : ''}
                </div>
            </div>
            <div class="body">
                <div class="name">⚡ ${escFlash(f.name)}</div>
                <div class="desc">${escFlash(f.description || '')}</div>
                <div style="display:flex;gap:8px;align-items:baseline;margin-bottom:6px;">
                    ${f.original_price > 0 ? `<span style="font-size:12px;color:#9ca3af;text-decoration:line-through;">฿${Number(f.original_price).toFixed(0)}</span>` : ''}
                    <span class="price" style="color:#dc2626;">฿${Number(f.flash_price).toFixed(0)}</span>
                </div>
                <div style="font-size:11px;color:var(--color-muted);margin-bottom:8px;">
                    🕐 ${fmtDatetime(f.start_time)} → ${fmtDatetime(f.end_time)}
                </div>
                <div class="row-btns">
                    <button class="btn btn-ghost" style="font-size:11px;" data-flash-action="toggle" data-flash-id="${f.id}" data-active="${f.is_active}">
                        ${f.is_active ? '⛔ ปิด' : '✅ เปิด'}
                    </button>
                    <button class="btn btn-ghost" style="font-size:11px;" data-flash-action="edit" data-flash-id="${f.id}">✏️ แก้ไข</button>
                    <button class="btn btn-ghost" style="font-size:11px;color:#c33;" data-flash-action="delete" data-flash-id="${f.id}">🗑️ ลบ</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ============================================================
// Modal
// ============================================================
function openAddFlashModal() {
    flashState.editingId = null;
    document.getElementById('flashModalTitle').textContent = 'เพิ่ม เมนูพิเศษใหม่';
    document.getElementById('inpFlashName').value = '';
    document.getElementById('inpFlashDesc').value = '';
    document.getElementById('inpFlashOrigPrice').value = '';
    document.getElementById('inpFlashPrice').value = '';
    document.getElementById('inpFlashImageUrl').value = '';
    document.getElementById('flashImgPreview').style.backgroundImage = '';
    document.getElementById('flashImgPreview').textContent = '📷 ยังไม่มีรูป';
    // default: เริ่มตอนนี้ สิ้นสุดใน 2 ชม
    setDefaultTimes(2);
    document.getElementById('inpFlashActive').checked = true;
    document.getElementById('flashModal').style.display = 'flex';
}

function openEditFlashModal(id) {
    const f = flashState.sales.find(x => x.id === id);
    if (!f) return;
    flashState.editingId = id;
    document.getElementById('flashModalTitle').textContent = 'แก้ไข เมนูพิเศษ';
    document.getElementById('inpFlashName').value = f.name || '';
    document.getElementById('inpFlashDesc').value = f.description || '';
    document.getElementById('inpFlashOrigPrice').value = f.original_price || '';
    document.getElementById('inpFlashPrice').value = f.flash_price || '';
    document.getElementById('inpFlashImageUrl').value = f.image_url || '';
    if (f.image_url) {
        document.getElementById('flashImgPreview').style.backgroundImage = `url('${f.image_url}')`;
        document.getElementById('flashImgPreview').textContent = '';
    }
    // แปลง ISO → datetime-local value
    document.getElementById('inpFlashStart').value = isoToLocal(f.start_time);
    document.getElementById('inpFlashEnd').value = isoToLocal(f.end_time);
    document.getElementById('inpFlashActive').checked = !!f.is_active;
    document.getElementById('flashModal').style.display = 'flex';
}

function closeFlashModal() {
    document.getElementById('flashModal').style.display = 'none';
    flashState.editingId = null;
}

function setDefaultTimes(hours) {
    const start = new Date();
    const end   = new Date(start.getTime() + hours * 3600000);
    document.getElementById('inpFlashStart').value = isoToLocal(start.toISOString());
    document.getElementById('inpFlashEnd').value   = isoToLocal(end.toISOString());
}

function setQuickDuration(hours) {
    const startVal = document.getElementById('inpFlashStart').value;
    const start = startVal ? new Date(startVal) : new Date();
    const end = new Date(start.getTime() + hours * 3600000);
    document.getElementById('inpFlashEnd').value = isoToLocal(end.toISOString());
}

async function onFlashImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
        notifier.showToast('ไฟล์ใหญ่เกิน 5MB', 'error');
        return;
    }
    notifier.showToast('กำลังอัปโหลดรูป...', 'info', 3000);
    try {
        const result = await API.uploadImage(file);
        document.getElementById('inpFlashImageUrl').value = result.url;
        document.getElementById('flashImgPreview').style.backgroundImage = `url('${result.url}')`;
        document.getElementById('flashImgPreview').textContent = '';
        notifier.showToast('✓ อัปโหลดรูปแล้ว', 'success');
    } catch(e) {
        notifier.showToast('อัปโหลดรูปล้มเหลว: ' + e.message, 'error');
    }
}

async function saveFlashSale() {
    const name = document.getElementById('inpFlashName').value.trim();
    const flashPrice = parseFloat(document.getElementById('inpFlashPrice').value);
    const origPrice = parseFloat(document.getElementById('inpFlashOrigPrice').value) || 0;
    const startVal = document.getElementById('inpFlashStart').value;
    const endVal   = document.getElementById('inpFlashEnd').value;

    if (!name) { notifier.showToast('กรุณาใส่ชื่อเมนู', 'error'); return; }
    if (!flashPrice || flashPrice <= 0) { notifier.showToast('กรุณาใส่ราคา เมนูพิเศษ', 'error'); return; }
    if (!startVal || !endVal) { notifier.showToast('กรุณาตั้งเวลาเริ่มและสิ้นสุด', 'error'); return; }
    if (new Date(startVal) >= new Date(endVal)) { notifier.showToast('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่ม', 'error'); return; }

    const btn = document.getElementById('btnSaveFlash');
    btn.disabled = true; btn.textContent = 'กำลังบันทึก...';

    const payload = {
        name,
        description: document.getElementById('inpFlashDesc').value.trim(),
        original_price: origPrice,
        flash_price: flashPrice,
        image_url: document.getElementById('inpFlashImageUrl').value.trim(),
        start_time: new Date(startVal).toISOString(),
        end_time:   new Date(endVal).toISOString(),
        is_active: document.getElementById('inpFlashActive').checked
    };

    try {
        if (flashState.editingId) {
            await API.updateFlashSale({ id: flashState.editingId, ...payload });
            notifier.showToast('✓ แก้ไข เมนูพิเศษ แล้ว', 'success');
        } else {
            await API.addFlashSale(payload);
            notifier.showToast('✓ เพิ่ม เมนูพิเศษ แล้ว', 'success');
        }
        closeFlashModal();
        await loadFlashSales();
    } catch(e) {
        notifier.showToast('บันทึกล้มเหลว: ' + e.message, 'error');
    } finally {
        btn.disabled = false; btn.textContent = 'บันทึก';
    }
}

async function deleteFlashSale(id) {
    const f = flashState.sales.find(x => x.id === id);
    if (!confirm('ลบ เมนูพิเศษ "' + (f ? f.name : '') + '"?')) return;
    try {
        await API.deleteFlashSale({ id });
        notifier.showToast('✓ ลบแล้ว', 'success');
        await loadFlashSales();
    } catch(e) {
        notifier.showToast('ลบล้มเหลว: ' + e.message, 'error');
    }
}

async function toggleFlashSale(id, newActive) {
    try {
        await API.updateFlashSale({ id, is_active: newActive });
        await loadFlashSales();
    } catch(e) {
        notifier.showToast('เปลี่ยนสถานะล้มเหลว: ' + e.message, 'error');
    }
}

// Helpers
function isoToLocal(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fmtDatetime(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    const pad = n => String(n).padStart(2,'0');
    return `${pad(d.getDate())}/${pad(d.getMonth()+1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function escFlash(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function fileToBase64(file) {
    return new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(',')[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
    });
}

// ============================================================
// 🖼️ Drag & Drop Image Upload (เมนูพิเศษ)
// ============================================================
function setupImageDropzone(previewId, inputId, onChangeFn) {
    const preview = document.getElementById(previewId);
    const input   = document.getElementById(inputId);
    if (!preview || !input) return;

    preview.style.cursor = 'pointer';
    preview.addEventListener('click', () => input.click());

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
            uploadFlashImage(file);
        } else if (file) {
            notifier.showToast('กรุณาเลือกไฟล์รูปภาพ (jpg, png ฯลฯ)', 'error');
        }
    });

    // paste Ctrl+V
    document.addEventListener('paste', (e) => {
        const modal = document.getElementById('flashModal');
        if (!modal || modal.style.display === 'none') return;
        const items = e.clipboardData && e.clipboardData.items;
        if (!items) return;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                uploadFlashImage(item.getAsFile());
                break;
            }
        }
    });
}

async function uploadFlashImage(file) {
    if (!file || file.size > 5 * 1024 * 1024) {
        notifier.showToast('ไฟล์ใหญ่เกิน 5MB', 'error');
        return;
    }
    // preview ก่อน
    const reader = new FileReader();
    reader.onload = (ev) => {
        const prev = document.getElementById('flashImgPreview');
        if (prev) {
            prev.style.backgroundImage = `url('${ev.target.result}')`;
            prev.innerHTML = '<span class="drop-hint">🖱️ คลิกหรือลากมาเพื่อเปลี่ยนรูป</span>';
        }
    };
    reader.readAsDataURL(file);

    notifier.showToast('กำลังอัปโหลด...', 'info', 3000);
    try {
        const result = await API.uploadImage(file);
        const urlInp = document.getElementById('inpFlashImageUrl');
        if (urlInp) urlInp.value = result.url;
        notifier.showToast('✓ อัปโหลดรูปแล้ว', 'success');
    } catch(e) {
        notifier.showToast('อัปโหลดล้มเหลว: ' + e.message, 'error');
    }
}
