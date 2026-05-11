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
    initWalkinQR();
}

// ============================================================
// 🚶 Walk-in QR
// ============================================================
function initWalkinQR() {
    const walkinUrl = (CONFIG.BASE_URL || '') + '/walkin.html';
    const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=140x140&data='
        + encodeURIComponent(walkinUrl) + '&color=651713&bgcolor=ffffff&margin=4';
    const img = document.getElementById('walkinQrImg');
    const urlEl = document.getElementById('walkinUrl');
    if (img) img.src = qrUrl;
    if (urlEl) urlEl.textContent = walkinUrl;
}

function printWalkinQR() {
    const walkinUrl = (CONFIG.BASE_URL || '') + '/walkin.html';
    const url = 'qr-print.html?table=Walk-in&name=ลูกค้าทั่วไป&url=' + encodeURIComponent(walkinUrl);
    window.open(url, '_blank');
}

async function saveWalkinQR() {
    const walkinUrl = (CONFIG.BASE_URL || '') + '/walkin.html';
    const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=600x600&data='
        + encodeURIComponent(walkinUrl) + '&color=651713&bgcolor=ffffff&margin=6';
    // Download directly
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = 'QR_Walk-in_Maeyom.png';
    a.target = '_blank';
    a.click();
}

// ============================================================
// 🎯 Events (ทำก่อน load data)
// ============================================================
function bindEvents() {
    const addBtn = document.getElementById('btnAdd');
    if (addBtn) addBtn.addEventListener('click', openAddModal);

    const printAllBtn = document.getElementById('btnPrintAll');
    if (printAllBtn) printAllBtn.addEventListener('click', () => {
        renderPrintView();
        setTimeout(() => window.print(), 400);
    });

    const saveAllBtn = document.getElementById('btnSaveAll');
    if (saveAllBtn) saveAllBtn.addEventListener('click', () => {
        renderPrintView();
        setTimeout(() => saveAllImages(), 400);
    });

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
        drawQR('qrbox-' + t.id, buildTableUrl(t.table_number), 140, '#651713');
    });
}

let currentPaperSize = 'a4';
let currentOrient    = 'portrait';

function setPaperSize(size) {
    currentPaperSize = size;
    ['a4','a5','a6'].forEach(s => {
        const btn = document.getElementById('size'+s.toUpperCase());
        if (btn) btn.classList.toggle('active', s===size);
    });
    applyPrintGrid();
}

function setOrient(o) {
    currentOrient = o;
    document.getElementById('orPort')?.classList.toggle('active', o==='portrait');
    document.getElementById('orLand')?.classList.toggle('active', o==='landscape');
    applyPrintGrid();
}

function applyPrintGrid() {
    const grid = document.getElementById('printGrid');
    if (!grid) return;
    grid.className = 'print-grid size-' + currentPaperSize + ' ' + currentOrient;

    // Update @page
    const sz = currentPaperSize==='a4'?'A4':currentPaperSize==='a5'?'A5':'A6';
    let st = document.getElementById('dynPageStyle');
    if (!st) { st=document.createElement('style'); st.id='dynPageStyle'; document.head.appendChild(st); }
    st.textContent = `@media print { @page { size: ${sz} ${currentOrient}; margin:8mm; } }`;

    // Resize QR images based on size+orientation
    const qrPx = getQrPx();
    document.querySelectorAll('.pc-qr img').forEach(img => {
        const base = img.src.split('?')[1] || '';
        const data = base.match(/data=([^&]*)/)?.[1] || '';
        if (data) {
            img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${qrPx}x${qrPx}&data=${data}&color=651713&bgcolor=ffffff&margin=4`;
            img.width = qrPx; img.height = qrPx;
        }
    });
}

function getQrPx() {
    if (currentPaperSize==='a6') return currentOrient==='landscape'?80:88;
    if (currentPaperSize==='a5') return currentOrient==='landscape'?140:180;
    return currentOrient==='landscape'?110:130;
}

function renderPrintView() {
    const v = document.getElementById('printAllView');
    if (!v) return;

    const steps = [
        { th:'สแกน QR Code ด้วยมือถือ', en:'Scan the QR Code with your phone' },
        { th:'เลือกประเภท: กินที่นี่ หรือ กลับบ้าน', en:'Choose: Dine In or Takeaway' },
        { th:'กรอกชื่อและเบอร์โทร', en:'Enter your name & phone number' },
        { th:'เลือกเมนูที่ต้องการและกด "สั่งเลย"', en:'Select dishes and tap "Place Order"' },
    ];
    const stepsHtml = steps.map((s,i) => `
        <div class="pc-step">
            <div class="pc-num">${i+1}</div>
            <div><strong>${escapeHtml(s.th)}</strong><br><span style="color:#888;">${s.en}</span></div>
        </div>`).join('');

    const activeTables = tablesState.tables.filter(t => t.is_active);
    const qrPx = getQrPx();

    v.innerHTML = `
        <div class="print-grid size-${currentPaperSize} ${currentOrient}" id="printGrid">
            ${activeTables.map(t => {
                const url = encodeURIComponent(buildTableUrl(t.table_number));
                return `<div class="print-card" id="pc-${t.id}">
                    <div class="pc-header">
                        <img src="images/logo-white.png" alt="Logo">
                        <div class="pc-hotel">${escapeHtml(CONFIG.HOTEL_NAME_EN || 'Maeyom Palace Hotel')}</div>
                        <div class="pc-sub">${escapeHtml(CONFIG.HOTEL_NAME || 'โรงแรม แม่ยมพาเลส')}</div>
                        <div class="pc-badge">🪑 โต๊ะ ${t.table_number}${t.table_name?' · '+escapeHtml(t.table_name):''}</div>
                    </div>
                    <div class="pc-qr">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=${qrPx}x${qrPx}&data=${url}&color=651713&bgcolor=ffffff&margin=4"
                            width="${qrPx}" height="${qrPx}" alt="QR" style="border-radius:8px;">
                        <div class="pc-scan">📱 สแกน QR เพื่อสั่งอาหาร<br><strong>Scan to order</strong></div>
                    </div>
                    <div class="pc-steps">
                        <div style="font-size:10px;font-weight:700;color:#651713;text-align:center;margin-bottom:5px;">📋 วิธีสั่งอาหาร · How to Order</div>
                        ${stepsHtml}
                    </div>
                    <div class="pc-footer">
                        🌐 ${escapeHtml((CONFIG.BASE_URL||'').replace('https://',''))} &nbsp;|&nbsp; 📞 ${escapeHtml(CONFIG.HOTEL_PHONE||'')}
                    </div>
                </div>`;
            }).join('')}
        </div>`;
}

// ===== บันทึกรูปทุกโต๊ะ =====
async function saveAllImages() {
    const btn = document.getElementById('btnSaveAll');
    const activeTables = tablesState.tables.filter(t => t.is_active);
    if (!activeTables.length) { notifier.showToast('ไม่มีโต๊ะที่เปิดใช้งาน','error'); return; }

    btn.disabled = true; btn.textContent = '⏳ กำลังสร้างรูป...';

    // Show print view temporarily
    const printView = document.getElementById('printAllView');
    const tablesCont = document.getElementById('tablesContainer');
    printView.style.display = 'block';
    tablesCont.style.display = 'none';

    // Render if empty
    if (!document.getElementById('printGrid')) renderPrintView();

    // Wait for all QR images to load
    const imgs = printView.querySelectorAll('img');
    await Promise.all([...imgs].map(img => img.complete ? Promise.resolve() : new Promise(r => { img.onload=r; img.onerror=r; })));
    await new Promise(r => setTimeout(r, 600)); // buffer

    try {
        const zip = new JSZip();
        const cards = printView.querySelectorAll('.print-card');

        for (let i=0; i<cards.length; i++) {
            const card = cards[i];
            const t = activeTables[i];
            if (!t) continue;
            btn.textContent = `⏳ กำลังสร้าง ${i+1}/${cards.length}...`;

            const canvas = await html2canvas(card, {
                scale: 2, useCORS: true, backgroundColor:'#ffffff', logging:false
            });
            const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
            zip.file(`QR_โต๊ะ${t.table_number}${t.table_name?'_'+t.table_name:''}.png`, blob);
        }

        const zipBlob = await zip.generateAsync({ type:'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = `QR_โต๊ะทั้งหมด_${currentPaperSize.toUpperCase()}.zip`;
        link.click();
        URL.revokeObjectURL(link.href);
        notifier.showToast('✓ บันทึกรูป QR ทั้งหมดแล้ว ('+ activeTables.length +' โต๊ะ)','success');
    } catch(e) {
        notifier.showToast('บันทึกรูปล้มเหลว: '+e.message,'error');
    }

    // Restore view
    printView.style.display = 'none';
    tablesCont.style.display = '';
    btn.disabled = false; btn.textContent = '💾 บันทึกรูปทุกโต๊ะ';
}

function drawQR(elementId, url, size, color) {
    const box = document.getElementById(elementId);
    if (!box) return;
    const c = (color || '#651713').replace('#', '');
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
