// ============================================================
// 🪑 Tables JS - จัดการโต๊ะ + สร้าง QR
// ============================================================

const tablesState = {
    tables: [],
    editingId: null,
    qrTable: null
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
    if (!checkConfig()) return;
    bindEvents();
    await loadTables();
}

// ============================================================
// 🎯 Events (ทำก่อน load data)
// ============================================================
function bindEvents() {
    const addBtn = document.getElementById('btnAdd');
    if (addBtn) addBtn.addEventListener('click', openAddModal);

    const printAllBtn = document.getElementById('btnPrintAll');
    if (printAllBtn) printAllBtn.addEventListener('click', () => window.print());

    // Modal: save / cancel
    const saveBtn = document.getElementById('btnSave');
    if (saveBtn) saveBtn.addEventListener('click', saveTable);

    const cancelBtn = document.getElementById('btnCancel');
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    // QR modal
    const qrCloseBtn = document.getElementById('btnQrClose');
    if (qrCloseBtn) qrCloseBtn.addEventListener('click', closeQrModal);

    const qrDlBtn = document.getElementById('btnQrDownload');
    if (qrDlBtn) qrDlBtn.addEventListener('click', openQrPrintPage);

    // Event delegation สำหรับการ์ดโต๊ะ (dynamic content)
    const container = document.getElementById('tablesContainer');
    if (container) {
        container.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            e.stopPropagation();
            const id = btn.dataset.tableId;
            const num = btn.dataset.tableNum;
            switch (btn.dataset.action) {
                case 'view-qr':  openQrModal(id); break;
                case 'edit':     openEditModal(id); break;
                case 'delete':   deleteTable(id, num); break;
            }
        });
    }
}

// ============================================================
// 📥 Load
// ============================================================
async function loadTables() {
    try {
        tablesState.tables = await API.getTables();
        renderTables();
        renderPrintView();
    } catch (err) {
        console.error(err);
        notifier.showToast('โหลดข้อมูลโต๊ะล้มเหลว: ' + err.message, 'error', 5000);
    }
}

function renderTables() {
    const c = document.getElementById('tablesContainer');
    if (!c) return;

    if (tablesState.tables.length === 0) {
        c.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1;">
                <div class="ico">🪑</div>
                <h3 style="font-family:'Cormorant Garamond',serif;color:var(--color-emerald);">ยังไม่มีโต๊ะ</h3>
                <p>คลิก "+ เพิ่มโต๊ะ" เพื่อเริ่มต้น</p>
            </div>`;
        return;
    }

    c.innerHTML = tablesState.tables.map(t => {
        const off = !t.is_active;
        return `
            <div class="table-card ${off ? 'inactive' : ''}">
                ${off ? '<span class="badge-off">ปิดใช้งาน</span>' : ''}
                <div class="num">${t.table_number}</div>
                ${t.table_name ? `<div class="name">${escapeHtml(t.table_name)}</div>` : '<div class="name">&nbsp;</div>'}
                <div class="seats">${t.seats || 4} ที่นั่ง</div>
                <div class="qr-box" id="qrbox-${t.id}"></div>
                <div class="row-btns">
                    <button class="btn btn-ghost" data-action="view-qr" data-table-id="${t.id}">ดู QR</button>
                    <button class="btn btn-ghost" data-action="edit" data-table-id="${t.id}">แก้ไข</button>
                    <button class="btn btn-ghost" data-action="delete" data-table-id="${t.id}" data-table-num="${t.table_number}" style="color:#c33;">ลบ</button>
                </div>
            </div>`;
    }).join('');

    // วาด QR
    tablesState.tables.forEach(t => {
        drawQR('qrbox-' + t.id, buildTableUrl(t.table_number), 140, '#0F3B2E');
    });
}

function renderPrintView() {
    const v = document.getElementById('printAllView');
    if (!v) return;
    v.innerHTML = `
        <div style="text-align:center;margin-bottom:8mm;">
            <h1 style="font-family:'Cormorant Garamond',serif;color:#0F3B2E;margin:0;">${escapeHtml(CONFIG.HOTEL_NAME)}</h1>
            <p style="color:#888;margin:4px 0 0;">QR Code สำหรับสั่งอาหารประจำโต๊ะ</p>
        </div>
        <div class="print-grid">
            ${tablesState.tables.filter(t => t.is_active).map(t => `
                <div class="print-card">
                    <h3>${escapeHtml(CONFIG.HOTEL_NAME)}</h3>
                    <div style="font-size:12px;color:#666;">โต๊ะหมายเลข</div>
                    <div class="pn">${t.table_number}</div>
                    ${t.table_name ? `<div style="color:#C9A861;font-weight:600;">${escapeHtml(t.table_name)}</div>` : ''}
                    <div id="pqr-${t.id}" style="display:flex;justify-content:center;margin:8px 0;"></div>
                    <div class="scan">📱 สแกนเพื่อสั่งอาหาร</div>
                </div>
            `).join('')}
        </div>`;

    tablesState.tables.filter(t => t.is_active).forEach(t => {
        drawQR('pqr-' + t.id, buildTableUrl(t.table_number), 200, '#000');
    });
}

function drawQR(elementId, url, size, color) {
    const box = document.getElementById(elementId);
    if (!box) return;
    const c = (color || '#0F3B2E').replace('#', '');
    const encoded = encodeURIComponent(url);
    box.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&color=${c}&bgcolor=ffffff&margin=4" width="${size}" height="${size}" style="border-radius:6px;display:block;" alt="QR">`;
}

function buildTableUrl(tableNumber) {
    return CONFIG.BASE_URL + '/menu.html?table=' + tableNumber;
}

// ============================================================
// ➕ Modal: Add/Edit
// ============================================================
function openAddModal() {
    tablesState.editingId = null;
    document.getElementById('modalTitle').textContent = 'เพิ่มโต๊ะใหม่';
    document.getElementById('inpTableNumber').value = nextTableNumber();
    document.getElementById('inpTableName').value = '';
    document.getElementById('inpSeats').value = 4;
    document.getElementById('inpActive').checked = true;
    document.getElementById('inpTableNumber').disabled = false;
    document.getElementById('tableModal').style.display = 'flex';
}

function openEditModal(id) {
    const t = tablesState.tables.find(x => x.id === id);
    if (!t) return;
    tablesState.editingId = id;
    document.getElementById('modalTitle').textContent = 'แก้ไขโต๊ะ ' + t.table_number;
    document.getElementById('inpTableNumber').value = t.table_number;
    document.getElementById('inpTableName').value = t.table_name || '';
    document.getElementById('inpSeats').value = t.seats || 4;
    document.getElementById('inpActive').checked = !!t.is_active;
    document.getElementById('inpTableNumber').disabled = true;
    document.getElementById('tableModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('tableModal').style.display = 'none';
    tablesState.editingId = null;
}

function nextTableNumber() {
    if (tablesState.tables.length === 0) return 1;
    return Math.max.apply(null, tablesState.tables.map(t => parseInt(t.table_number) || 0)) + 1;
}

async function saveTable() {
    const num = parseInt(document.getElementById('inpTableNumber').value);
    const name = document.getElementById('inpTableName').value.trim();
    const seats = parseInt(document.getElementById('inpSeats').value) || 4;
    const active = document.getElementById('inpActive').checked;

    if (!num || num < 1) {
        notifier.showToast('กรุณาใส่หมายเลขโต๊ะ', 'error');
        return;
    }

    const btn = document.getElementById('btnSave');
    btn.disabled = true;
    const oldText = btn.textContent;
    btn.textContent = 'กำลังบันทึก...';

    try {
        if (tablesState.editingId) {
            await API.updateTable({
                id: tablesState.editingId,
                table_name: name,
                seats: seats,
                is_active: active
            });
            notifier.showToast('✓ แก้ไขโต๊ะสำเร็จ', 'success');
        } else {
            await API.addTable({
                table_number: num,
                table_name: name,
                seats: seats,
                is_active: active
            });
            notifier.showToast('✓ เพิ่มโต๊ะสำเร็จ', 'success');
        }
        notifier.playSuccessSound();
        closeModal();
        await loadTables();
    } catch (err) {
        console.error(err);
        notifier.showToast('บันทึกล้มเหลว: ' + err.message, 'error', 5000);
    } finally {
        btn.disabled = false;
        btn.textContent = oldText;
    }
}

async function deleteTable(id, num) {
    if (!confirm('ยืนยันการลบโต๊ะหมายเลข ' + num + '?\nออเดอร์เก่าของโต๊ะนี้จะยังอยู่ในระบบ')) return;
    try {
        await API.deleteTable(id);
        notifier.showToast('✓ ลบโต๊ะสำเร็จ', 'success');
        await loadTables();
    } catch (err) {
        notifier.showToast('ลบล้มเหลว: ' + err.message, 'error');
    }
}

// ============================================================
// 🔲 QR Modal
// ============================================================
function openQrModal(id) {
    const t = tablesState.tables.find(x => String(x.id) === String(id));
    if (!t) { console.error('ไม่พบโต๊ะ id:', id); return; }
    tablesState.qrTable = t;
    const url = buildTableUrl(t.table_number);
    document.getElementById('qrModalTitle').textContent = 'โต๊ะหมายเลข ' + t.table_number;
    document.getElementById('qrModalSub').textContent = t.table_name || ((t.seats || 4) + ' ที่นั่ง');
    document.getElementById('qrModalUrl').textContent = url;
    const box = document.getElementById('qrModalCanvas');
    const encoded = encodeURIComponent(url);
    box.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encoded}&color=0F3B2E&bgcolor=ffffff&margin=6" width="280" height="280" style="border-radius:8px;display:block;" alt="QR Code">`;
    document.getElementById('qrModal').style.display = 'flex';
}

function closeQrModal() {
    document.getElementById('qrModal').style.display = 'none';
    tablesState.qrTable = null;
}

function openQrPrintPage() {
    if (!tablesState.qrTable) return;
    const t = tablesState.qrTable;
    const url = buildTableUrl(t.table_number);
    const printUrl = 'qr-print.html?table=' + t.table_number +
        '&name=' + encodeURIComponent(t.table_name || '') +
        '&url=' + encodeURIComponent(url);
    window.open(printUrl, '_blank');
}

async function downloadQr() {
    if (!tablesState.qrTable) return;
    const url = buildTableUrl(tablesState.qrTable.table_number);
    const encoded = encodeURIComponent(url);
    const imgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encoded}&color=0F3B2E&bgcolor=ffffff&margin=10`;
    try {
        const res = await fetch(imgUrl);
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'maeyom-table-' + tablesState.qrTable.table_number + '.png';
        a.click();
    } catch(e) {
        // fallback: เปิดในแท็บใหม่
        window.open(imgUrl, '_blank');
    }
}

function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
