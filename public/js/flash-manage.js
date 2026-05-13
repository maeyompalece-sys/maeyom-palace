// ============================================================
// ⭐ เมนูพิเศษ Management — ระบบกำหนดการขายรายสัปดาห์
// ============================================================

const DAY_LABELS  = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']; // index = getDay()
const DAY_FULL    = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'];

const flashState = {
    sales: [],
    editingId: null,
    selectedDays: new Set()
};

document.addEventListener('DOMContentLoaded', initFlash);

async function initFlash() {
    if (!checkConfig()) return;
    bindFlashEvents();
    await loadFlashSales();
}

// ============================================================
// Events
// ============================================================
function bindFlashEvents() {
    document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    bindId('btnAddFlash',    openAddFlashModal);
    bindId('btnSaveFlash',   saveFlashSale);
    bindId('btnCancelFlash', closeFlashModal);
    bindId('inpFlashImage',  onFlashImageChange, 'change');
    setupImageDropzone('flashImgPreview', 'inpFlashImage', onFlashImageChange);

    // Day picker buttons
    const picker = document.getElementById('flashDayPicker');
    if (picker) {
        picker.addEventListener('click', e => {
            const btn = e.target.closest('.day-btn');
            if (!btn) return;
            const day = parseInt(btn.dataset.day);
            if (flashState.selectedDays.has(day)) {
                flashState.selectedDays.delete(day);
                btn.classList.remove('selected');
            } else {
                flashState.selectedDays.add(day);
                btn.classList.add('selected');
            }
            updateScheduleSummary();
        });
    }

    bindId('qdWeekday', () => setDays([1,2,3,4,5]));
    bindId('qdWeekend', () => setDays([6,0]));
    bindId('qdAllWeek', () => setDays([0,1,2,3,4,5,6]));
    bindId('qdClear',   () => setDays([]));
    bindId('inpFlashOpenTime',  updateScheduleSummary, 'input');
    bindId('inpFlashCloseTime', updateScheduleSummary, 'input');

    const grid = document.getElementById('specialGrid');
    if (grid) {
        grid.addEventListener('click', e => {
            const btn = e.target.closest('[data-flash-action]');
            if (!btn) return;
            const id = btn.dataset.flashId;
            switch (btn.dataset.flashAction) {
                case 'edit':   openEditFlashModal(id); break;
                case 'delete': deleteFlashSale(id);    break;
                case 'toggle': toggleFlashSale(id, btn.dataset.active !== 'true'); break;
            }
        });
    }
}

function bindId(id, fn, event = 'click') {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, fn);
}

// ============================================================
// Tab switching
// ============================================================
function switchTab(tab) {
    document.querySelectorAll('[data-tab]').forEach(b =>
        b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('[data-tab-content]').forEach(c =>
        c.style.display = c.dataset.tabContent === tab ? '' : 'none');
    const menuActions  = document.getElementById('menuActions');
    const flashActions = document.getElementById('flashActions');
    if (menuActions)  menuActions.style.display  = tab === 'menu'  ? '' : 'none';
    if (flashActions) flashActions.style.display = tab === 'flash' ? '' : 'none';
}

// ============================================================
// Load & Render
// ============================================================
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
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><div class="ico">⚡</div><p>ยังไม่มี เมนูพิเศษ</p></div>';
        return;
    }

    grid.innerHTML = flashState.sales.map(f => {
        const { label: statusLabel, color: statusColor } = getFlashStatus(f);

        const days = parseScheduleDays(f.schedule_days);
        const dayChipsHtml = DAY_LABELS.map((lbl, i) => {
            const active = days.includes(i);
            return '<span class="day-chip ' + (active ? '' : 'off') + '">' + lbl + '</span>';
        }).join('');

        const openTime  = f.schedule_open  || '—';
        const closeTime = f.schedule_close || '—';

        const discount = f.original_price > 0
            ? Math.round((1 - f.flash_price / f.original_price) * 100) : 0;

        return '<div class="menu-card ' + (!f.is_active ? 'unavailable' : '') + '">' +
            '<div class="img ' + (f.image_url ? '' : 'empty') + '" style="' + (f.image_url ? 'background-image:url(\'' + f.image_url + '\')' : '') + '">' +
                (!f.image_url ? '⚡' : '') +
                '<div class="badges">' +
                    '<span class="badge-chip" style="background:' + statusColor + ';">' + statusLabel + '</span>' +
                    (discount > 0 ? '<span class="badge-chip spicy">-' + discount + '%</span>' : '') +
                '</div>' +
            '</div>' +
            '<div class="body">' +
                '<div class="name">⚡ ' + esc(f.name) + '</div>' +
                '<div class="desc">' + esc(f.description || '') + '</div>' +
                '<div style="display:flex;gap:8px;align-items:baseline;margin-bottom:8px;">' +
                    (f.original_price > 0 ? '<span style="font-size:12px;color:#9ca3af;text-decoration:line-through;">฿' + Number(f.original_price).toFixed(0) + '</span>' : '') +
                    '<span class="price" style="color:#dc2626;">฿' + Number(f.flash_price).toFixed(0) + '</span>' +
                '</div>' +
                '<div class="day-chips">' + dayChipsHtml + '</div>' +
                '<div style="font-size:11px;color:var(--color-muted);margin-bottom:8px;">🕐 ' + openTime + ' – ' + closeTime + ' น.</div>' +
                '<div class="row-btns">' +
                    '<button class="btn btn-ghost" style="font-size:11px;" data-flash-action="toggle" data-flash-id="' + f.id + '" data-active="' + f.is_active + '">' +
                        (f.is_active ? '⛔ หยุดชั่วคราว' : '✅ เปิดขาย') +
                    '</button>' +
                    '<button class="btn btn-ghost" style="font-size:11px;" data-flash-action="edit" data-flash-id="' + f.id + '">✏️ แก้ไข</button>' +
                    '<button class="btn btn-ghost" style="font-size:11px;color:#c33;" data-flash-action="delete" data-flash-id="' + f.id + '">🗑️ ลบ</button>' +
                '</div>' +
            '</div>' +
        '</div>';
    }).join('');
}

// ============================================================
// Status Logic
// ============================================================
function getFlashStatus(f) {
    if (!f.is_active) {
        return { label: '⛔ หยุดชั่วคราว', color: '#9ca3af' };
    }
    const now       = new Date();
    const todayDay  = now.getDay();
    const nowMins   = now.getHours() * 60 + now.getMinutes();
    const days      = parseScheduleDays(f.schedule_days);
    const openMins  = parseTimeMins(f.schedule_open  || '00:00');
    const closeMins = parseTimeMins(f.schedule_close || '23:59');

    if (days.length > 0 && !days.includes(todayDay)) {
        const nextDay = getNextSaleDay(days, todayDay);
        return { label: 'เปิดวัน' + DAY_FULL[nextDay], color: '#6b7280' };
    }
    if (nowMins < openMins) {
        return { label: '⏰ เปิด ' + (f.schedule_open || '') + ' น.', color: '#f59e0b' };
    }
    if (nowMins > closeMins) {
        return { label: '✅ หมดเวลาวันนี้', color: '#9ca3af' };
    }
    return { label: '🔥 กำลังเปิดขาย!', color: '#dc2626' };
}

function getNextSaleDay(days, today) {
    for (let i = 1; i <= 7; i++) {
        const d = (today + i) % 7;
        if (days.includes(d)) return d;
    }
    return days[0];
}

// ============================================================
// Modal
// ============================================================
function openAddFlashModal() {
    flashState.editingId = null;
    document.getElementById('flashModalTitle').textContent = 'เพิ่ม เมนูพิเศษใหม่';
    document.getElementById('inpFlashName').value       = '';
    document.getElementById('inpFlashDesc').value       = '';
    document.getElementById('inpFlashOrigPrice').value  = '';
    document.getElementById('inpFlashPrice').value      = '';
    document.getElementById('inpFlashImageUrl').value   = '';
    const prev = document.getElementById('flashImgPreview');
    prev.style.backgroundImage = '';
    prev.innerHTML = '📷 ยังไม่มีรูป<span class="drop-hint">🖱️ คลิกเพื่อเลือก หรือลากไฟล์มาวางได้เลย</span>';
    setDays([1,2,3,4,5,6,0]);
    document.getElementById('inpFlashOpenTime').value  = '09:00';
    document.getElementById('inpFlashCloseTime').value = '21:00';
    document.getElementById('inpFlashActive').checked  = true;
    updateScheduleSummary();
    document.getElementById('flashModal').style.display = 'flex';
}

function openEditFlashModal(id) {
    const f = flashState.sales.find(x => x.id === id);
    if (!f) return;
    flashState.editingId = id;
    document.getElementById('flashModalTitle').textContent = 'แก้ไข เมนูพิเศษ';
    document.getElementById('inpFlashName').value       = f.name || '';
    document.getElementById('inpFlashDesc').value       = f.description || '';
    document.getElementById('inpFlashOrigPrice').value  = f.original_price || '';
    document.getElementById('inpFlashPrice').value      = f.flash_price || '';
    document.getElementById('inpFlashImageUrl').value   = f.image_url || '';
    if (f.image_url) {
        const prev = document.getElementById('flashImgPreview');
        prev.style.backgroundImage = 'url(\'' + f.image_url + '\')';
        prev.innerHTML = '<span class="drop-hint">🖱️ คลิกหรือลากมาเพื่อเปลี่ยนรูป</span>';
    }
    setDays(parseScheduleDays(f.schedule_days));
    document.getElementById('inpFlashOpenTime').value  = f.schedule_open  || '09:00';
    document.getElementById('inpFlashCloseTime').value = f.schedule_close || '21:00';
    document.getElementById('inpFlashActive').checked  = !!f.is_active;
    updateScheduleSummary();
    document.getElementById('flashModal').style.display = 'flex';
}

function closeFlashModal() {
    document.getElementById('flashModal').style.display = 'none';
    flashState.editingId = null;
}

async function saveFlashSale() {
    const name       = document.getElementById('inpFlashName').value.trim();
    const flashPrice = parseFloat(document.getElementById('inpFlashPrice').value);
    const origPrice  = parseFloat(document.getElementById('inpFlashOrigPrice').value) || 0;
    const openTime   = document.getElementById('inpFlashOpenTime').value;
    const closeTime  = document.getElementById('inpFlashCloseTime').value;
    const days       = Array.from(flashState.selectedDays).sort((a,b) => a - b);

    if (!name)                      { notifier.showToast('กรุณาใส่ชื่อเมนู', 'error');       return; }
    if (!flashPrice || flashPrice <= 0) { notifier.showToast('กรุณาใส่ราคา', 'error');       return; }
    if (days.length === 0)          { notifier.showToast('กรุณาเลือกอย่างน้อย 1 วัน', 'error'); return; }
    if (!openTime || !closeTime)    { notifier.showToast('กรุณาตั้งเวลาเปิด-ปิด', 'error');  return; }
    if (openTime >= closeTime)      { notifier.showToast('เวลาปิดต้องมากกว่าเวลาเปิด', 'error'); return; }

    const btn = document.getElementById('btnSaveFlash');
    btn.disabled = true; btn.textContent = 'กำลังบันทึก...';

    const payload = {
        name,
        description:    document.getElementById('inpFlashDesc').value.trim(),
        original_price: origPrice,
        flash_price:    flashPrice,
        image_url:      document.getElementById('inpFlashImageUrl').value.trim(),
        schedule_days:  days.join(','),
        schedule_open:  openTime,
        schedule_close: closeTime,
        start_time:     new Date().toISOString(),
        end_time:       new Date(Date.now() + 365 * 24 * 3600000).toISOString(),
        is_active:      document.getElementById('inpFlashActive').checked
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
        btn.disabled = false; btn.textContent = '⭐ บันทึกเมนูพิเศษ';
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
        notifier.showToast(newActive ? '✅ เปิดขายแล้ว' : '⛔ หยุดชั่วคราวแล้ว', 'success');
    } catch(e) {
        notifier.showToast('เปลี่ยนสถานะล้มเหลว: ' + e.message, 'error');
    }
}

// ============================================================
// Day Picker Helpers
// ============================================================
function setDays(dayArr) {
    flashState.selectedDays = new Set(dayArr);
    document.querySelectorAll('#flashDayPicker .day-btn').forEach(btn => {
        const d = parseInt(btn.dataset.day);
        btn.classList.toggle('selected', flashState.selectedDays.has(d));
    });
    updateScheduleSummary();
}

function updateScheduleSummary() {
    const el = document.getElementById('scheduleSummary');
    if (!el) return;
    const days      = Array.from(flashState.selectedDays).sort((a,b) => a - b);
    const openTime  = document.getElementById('inpFlashOpenTime')  ? document.getElementById('inpFlashOpenTime').value  : '—';
    const closeTime = document.getElementById('inpFlashCloseTime') ? document.getElementById('inpFlashCloseTime').value : '—';
    if (days.length === 0) {
        el.textContent = '⚠️ ยังไม่ได้เลือกวันขาย';
        el.style.color = '#dc2626';
        return;
    }
    const dayNames = days.map(d => DAY_LABELS[d]).join('  ');
    el.innerHTML = '📅 <strong>' + dayNames + '</strong> &nbsp;🕐 <strong>' + openTime + ' – ' + closeTime + ' น.</strong>';
    el.style.color = '';
}

// ============================================================
// Image Upload
// ============================================================
async function onFlashImageChange(e) {
    const file = (e.target.files || [])[0];
    if (file) uploadFlashImage(file);
}

function setupImageDropzone(previewId, inputId) {
    const preview = document.getElementById(previewId);
    const input   = document.getElementById(inputId);
    if (!preview || !input) return;

    preview.addEventListener('click', () => input.click());
    ['dragenter','dragover'].forEach(ev => {
        preview.addEventListener(ev, e => { e.preventDefault(); preview.classList.add('dragover'); });
    });
    ['dragleave','dragend'].forEach(ev => {
        preview.addEventListener(ev, () => preview.classList.remove('dragover'));
    });
    preview.addEventListener('drop', e => {
        e.preventDefault();
        preview.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) uploadFlashImage(file);
        else if (file) notifier.showToast('กรุณาเลือกไฟล์รูปภาพ', 'error');
    });
    document.addEventListener('paste', e => {
        const modal = document.getElementById('flashModal');
        if (!modal || modal.style.display === 'none') return;
        for (const item of (e.clipboardData ? e.clipboardData.items : [])) {
            if (item.type.startsWith('image/')) { uploadFlashImage(item.getAsFile()); break; }
        }
    });
}

async function uploadFlashImage(file) {
    if (!file || file.size > 5 * 1024 * 1024) {
        notifier.showToast('ไฟล์ใหญ่เกิน 5MB', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
        const prev = document.getElementById('flashImgPreview');
        if (prev) {
            prev.style.backgroundImage = 'url(\'' + ev.target.result + '\')';
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

// ============================================================
// Utility
// ============================================================
function parseScheduleDays(str) {
    if (!str) return [];
    return String(str).split(',').map(Number).filter(n => !isNaN(n) && n >= 0 && n <= 6);
}

function parseTimeMins(str) {
    if (!str) return 0;
    var parts = String(str).split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
}

function esc(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, function(c) {
        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
}
