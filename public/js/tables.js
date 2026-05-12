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

    const bulkAddBtn = document.getElementById('btnBulkAdd');
    if (bulkAddBtn) bulkAddBtn.addEventListener('click', openBulkAddModal);

    const printAllBtn = document.getElementById('btnPrintAll');
    if (printAllBtn) printAllBtn.addEventListener('click', () => {
        const modal = document.getElementById('printTypeModal');
        if (modal) modal.style.display = 'flex';
    });

    // Print type popup handlers
    const printTypeModal  = document.getElementById('printTypeModal');
    const printTypeQR     = document.getElementById('printTypeQR');
    const printTypeCard   = document.getElementById('printTypeCard');
    const printTypeCancel = document.getElementById('printTypeCancel');

    if (printTypeQR) printTypeQR.addEventListener('click', () => {
        if (printTypeModal) printTypeModal.style.display = 'none';
        renderPrintView();
        setTimeout(() => window.print(), 400);
    });
    if (printTypeCard) printTypeCard.addEventListener('click', () => {
        if (printTypeModal) printTypeModal.style.display = 'none';
        printAllCards();
    });
    if (printTypeCancel) printTypeCancel.addEventListener('click', () => {
        if (printTypeModal) printTypeModal.style.display = 'none';
    });
    if (printTypeModal) printTypeModal.addEventListener('click', (e) => {
        if (e.target === printTypeModal) printTypeModal.style.display = 'none';
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
                case 'toggle-select': toggleCardSelect(id); break;
                case 'view-qr':    openQrModal(id); break;
                case 'edit':       openEditModal(id); break;
                case 'save-card':  saveTableCard(id); break;
                case 'print-card': printTableCard(id); break;
                case 'delete':     deleteTable(id, num); break;
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
        const off      = !t.is_active;
        const isSel    = selectedIds.has(t.id);
        const selClass = selectMode ? 'selectable' + (isSel ? ' selected' : '') : '';
        return `
            <div class="table-card ${off ? 'inactive' : ''} ${selClass}"
                 ${selectMode ? `data-action="toggle-select" data-table-id="${t.id}"` : ''}>
                ${off ? '<span class="badge-off">ปิดใช้งาน</span>' : ''}
                ${selectMode ? `<div class="select-check">${isSel ? '✓' : ''}</div>` : ''}
                <div class="num">${t.table_number}</div>
                ${t.table_name ? `<div class="name">${escapeHtml(t.table_name)}</div>` : '<div class="name">&nbsp;</div>'}
                <div class="seats">${t.seats || 4} ที่นั่ง</div>
                <div class="qr-box" id="qrbox-${t.id}"></div>
                ${selectMode ? '' : `
                <div class="row-btns">
                    <button class="btn btn-ghost" data-action="view-qr" data-table-id="${t.id}">ดู QR</button>
                    <button class="btn btn-ghost" data-action="edit" data-table-id="${t.id}">แก้ไข</button>
                    <button class="btn btn-ghost" data-action="delete" data-table-id="${t.id}" data-table-num="${t.table_number}" style="color:#c33;">ลบ</button>
                </div>`}
            </div>`;
    }).join('');

    // วาด QR
    tablesState.tables.forEach(t => {
        drawQR('qrbox-' + t.id, buildTableUrl(t.table_number), 140, '#651713');
    });
}

let currentPaperSize = 'a4';
let currentOrient    = 'portrait';
let selectMode       = false;
let selectedIds      = new Set();

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

async function saveAllCards() {
    const tables = tablesState.tables.filter(t => t.is_active);
    if (tables.length === 0) { alert('ไม่มีโต๊ะที่เปิดใช้งาน'); return; }
    const notif = showNotif('⏳ กำลังสร้างการ์ด 0/' + tables.length + '...');
    let done = 0;
    for (const t of tables) {
        await saveTableCard(t.id, true);
        done++;
        notif.textContent = `⏳ กำลังสร้าง ${done}/${tables.length}...`;
    }
    notif.textContent = `✅ บันทึกครบ ${done} ใบแล้ว!`;
    setTimeout(() => notif.remove(), 2500);
}

function printAllCards() {
    const tables = tablesState.tables.filter(t => t.is_active);
    if (tables.length === 0) { alert('ไม่มีโต๊ะที่เปิดใช้งาน'); return; }
    const nums = tables.map(t => t.table_number).join(',');
    window.open(`qr-print.html?tables=${encodeURIComponent(nums)}`, '_blank');
}

// ===== Multi-select mode =====
function toggleSelectMode() {
    selectMode = !selectMode;
    selectedIds.clear();
    const btn = document.getElementById('btnSelectMode');
    const bar = document.getElementById('selectBar');
    if (btn) btn.classList.toggle('active', selectMode);
    if (bar) bar.classList.toggle('show', selectMode);
    updateSelCount();
    renderTables();
}

function toggleCardSelect(id) {
    if (selectedIds.has(id)) selectedIds.delete(id);
    else selectedIds.add(id);
    updateSelCount();
    renderTables();
}

function selectAll() {
    tablesState.tables.forEach(t => selectedIds.add(t.id));
    updateSelCount();
    renderTables();
}

function updateSelCount() {
    const el = document.getElementById('selCount');
    if (el) el.textContent = selectedIds.size + ' โต๊ะที่เลือก';
}

async function saveSelectedCards() {
    if (selectedIds.size === 0) { alert('กรุณาเลือกโต๊ะก่อน'); return; }
    const ids = [...selectedIds];
    const notif = showNotif('⏳ กำลังสร้างการ์ด ' + ids.length + ' ใบ...');
    let done = 0;
    for (const id of ids) {
        await saveTableCard(id, true);
        done++;
        notif.textContent = `⏳ กำลังสร้าง ${done}/${ids.length}...`;
    }
    notif.textContent = `✅ บันทึกครบ ${done} ใบแล้ว!`;
    setTimeout(() => notif.remove(), 2500);
}

function printSelectedCards() {
    if (selectedIds.size === 0) { alert('กรุณาเลือกโต๊ะก่อน'); return; }
    const tables = tablesState.tables.filter(t => selectedIds.has(t.id));
    const nums   = tables.map(t => t.table_number).join(',');
    // ส่ง table numbers ผ่าน URL ให้ qr-print.html แสดงทีเดียว
    window.open(`qr-print.html?tables=${encodeURIComponent(nums)}`, '_blank');
}

function showNotif(msg) {
    const el = document.createElement('div');
    el.textContent = msg;
    Object.assign(el.style, {
        position:'fixed', bottom:'90px', left:'50%', transform:'translateX(-50%)',
        background:'#651713', color:'#fff', padding:'10px 22px', borderRadius:'20px',
        fontSize:'14px', fontWeight:'600', zIndex:'9999', boxShadow:'0 4px 16px rgba(0,0,0,.25)',
        whiteSpace:'nowrap'
    });
    document.body.appendChild(el);
    return el;
}

// ===== บันทึกการ์ด QR เป็นรูป (ต่อโต๊ะ) — แนวนอน 10×3.5cm =====
async function saveTableCard(id, silent = false) {
    const t = tablesState.tables.find(x => x.id === id);
    if (!t) return;

    let notif = null;
    if (!silent) {
        notif = showNotif('⏳ กำลังสร้างการ์ด...');
    }

    try {
        const url   = buildTableUrl(t.table_number);
        const qrPx  = 110;
        const enc   = encodeURIComponent(url);
        const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=${qrPx}x${qrPx}&data=${enc}&color=651713&bgcolor=ffffff&margin=4`;

        // สร้าง mini card แนวนอน 10×3.5cm
        const W = Math.round(100 * 3.78); // ~378px
        const H = Math.round(35  * 3.78); // ~132px
        const QR_SIDE = H;

        const wrap = document.createElement('div');
        wrap.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;';
        wrap.innerHTML = `
          <div id="_save_card_tmp" style="
            width:${W}px; height:${H}px;
            display:flex; flex-direction:row;
            font-family:'Sarabun',sans-serif;
            border:2px solid #651713; border-radius:6px;
            overflow:hidden; background:#fff;">
            <div style="
              width:${QR_SIDE}px; height:${H}px; flex-shrink:0;
              background:#651713;
              display:flex; align-items:center; justify-content:center;
              padding:8px;">
              <img src="${qrSrc}" width="${qrPx}" height="${qrPx}"
                style="width:${H-20}px;height:${H-20}px;border-radius:4px;display:block;" crossorigin="anonymous">
            </div>
            <div style="
              flex:1; height:${H}px;
              display:flex; flex-direction:column;
              justify-content:space-between;
              padding:10px 15px 7px;
              background:#fff;
              border-left:2px solid #651713;">
              <div style="display:flex; align-items:center; gap:8px;">
                <img src="images/logo.png" style="height:34px;width:auto;" crossorigin="anonymous">
                <div>
                  <div style="font-family:'Playfair Display','Cormorant Garamond',serif;
                    font-size:10px;font-weight:700;color:#651713;line-height:1.3;">
                    Maeyom Palace Hotel
                  </div>
                  <div style="font-size:8px;color:#888;line-height:1.2;">โรงแรม แม่ยมพาเลส</div>
                </div>
              </div>
              <div style="display:flex;align-items:flex-end;justify-content:space-between;">
                <div>
                  <div style="font-size:8px;color:#651713;letter-spacing:2px;text-transform:uppercase;font-weight:700;line-height:1;margin-bottom:2px;">🪑 TABLE</div>
                  <div style="font-family:'Playfair Display','Cormorant Garamond',serif;
                    font-size:32px;font-weight:900;color:#651713;line-height:1;">${escapeHtml(String(t.table_number))}</div>
                </div>
                <div style="text-align:right;font-size:8px;color:#651713;font-weight:700;line-height:1.8;padding-bottom:2px;">
                  📱 สแกนเพื่อสั่งอาหาร<br>Scan to order
                </div>
              </div>
            </div>
          </div>`;
        document.body.appendChild(wrap);

        await new Promise(r => setTimeout(r, 1400));

        const canvas = await html2canvas(wrap.firstElementChild, {
            scale: 4, useCORS: true, backgroundColor: '#fff', logging: false, allowTaint: true
        });
        document.body.removeChild(wrap);

        const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `การ์ดนามบัตรแนวนอน_โต๊ะ${t.table_number}_Maeyom.png`;
        a.click();

        if (notif) { notif.textContent = '✅ บันทึกการ์ดแล้ว!'; setTimeout(() => notif.remove(), 2000); }
    } catch(e) {
        if (notif) { notif.textContent = '❌ เกิดข้อผิดพลาด: ' + e.message; setTimeout(() => notif.remove(), 3000); }
    }
}

// ===== ปริ้นการ์ด QR (ต่อโต๊ะ) =====
function printTableCard(id) {
    const t = tablesState.tables.find(x => x.id === id);
    if (!t) return;
    const url  = buildTableUrl(t.table_number);
    const enc  = encodeURIComponent(url);
    const name = encodeURIComponent(t.table_name || '');
    window.open(`qr-print.html?table=${t.table_number}&name=${name}&url=${enc}`, '_blank');
}


// ============================================================
// ⚡ Bulk Add Tables — เพิ่มโต๊ะอัตโนมัติ
// ============================================================
let _bulkMode = 'count';

function openBulkAddModal() {
    const next = nextTableNumber();
    document.getElementById('bulkStartNum').value  = next;
    document.getElementById('bulkCount').value     = 5;
    document.getElementById('bulkRangeFrom').value = next;
    document.getElementById('bulkRangeTo').value   = next + 4;
    document.getElementById('bulkSeats').value     = 4;
    document.getElementById('bulkProgress').style.display = 'none';
    document.getElementById('btnBulkSave').disabled   = false;
    document.getElementById('btnBulkSave').textContent = '🚀 สร้างโต๊ะทั้งหมด';
    document.getElementById('btnBulkCancel').textContent = 'ยกเลิก';
    setBulkMode('count');
    updateBulkPreview();
    document.getElementById('bulkAddModal').style.display = 'flex';
}

function closeBulkModal() {
    document.getElementById('bulkAddModal').style.display = 'none';
}

function setBulkMode(mode) {
    _bulkMode = mode;
    const isCount = mode === 'count';
    document.getElementById('bulkCountMode').style.display = isCount ? '' : 'none';
    document.getElementById('bulkRangeMode').style.display = isCount ? 'none' : '';

    const activeStyle  = 'flex:1;padding:9px 0;border-radius:10px;border:2px solid var(--color-emerald);background:var(--color-emerald);color:#C9A861;font-weight:700;font-size:13px;cursor:pointer;transition:all .15s;';
    const inactiveStyle = 'flex:1;padding:9px 0;border-radius:10px;border:2px solid var(--color-emerald);background:#fff;color:var(--color-emerald);font-weight:700;font-size:13px;cursor:pointer;transition:all .15s;';
    document.getElementById('modeCountBtn').style.cssText = isCount ? activeStyle : inactiveStyle;
    document.getElementById('modeRangeBtn').style.cssText = isCount ? inactiveStyle : activeStyle;
    updateBulkPreview();
}

function getBulkTableNumbers() {
    const existing = new Set(tablesState.tables.map(t => parseInt(t.table_number)));

    if (_bulkMode === 'count') {
        const start = parseInt(document.getElementById('bulkStartNum').value) || 1;
        const count = Math.min(Math.max(parseInt(document.getElementById('bulkCount').value) || 1, 1), 50);
        const nums = [], skipped = [];
        let n = start;
        while (nums.length < count && n <= start + count + 200) {
            if (existing.has(n)) { skipped.push(n); }
            else { nums.push(n); }
            n++;
        }
        return { nums, skipped, existing };
    } else {
        const from = parseInt(document.getElementById('bulkRangeFrom').value) || 1;
        const to   = parseInt(document.getElementById('bulkRangeTo').value)   || from;
        const lo = Math.min(from, to), hi = Math.min(Math.max(from, to), lo + 49);
        const nums = [], skipped = [];
        for (let i = lo; i <= hi; i++) {
            if (existing.has(i)) skipped.push(i);
            else nums.push(i);
        }
        return { nums, skipped, existing };
    }
}

function updateBulkPreview() {
    const el = document.getElementById('bulkPreview');
    if (!el) return;
    const { nums, skipped } = getBulkTableNumbers();

    if (!nums.length) {
        el.innerHTML = '<span style="color:#ef4444;">⚠️ ไม่มีโต๊ะที่จะสร้าง — โต๊ะในช่วงนี้มีอยู่แล้วทั้งหมด</span>';
        return;
    }

    const preview = nums.slice(0, 20).map(n =>
        `<span style="display:inline-block;background:var(--color-emerald);color:#C9A861;
          border-radius:6px;padding:1px 8px;font-size:12px;font-weight:700;margin:2px;">${n}</span>`
    ).join('');
    const more = nums.length > 20 ? `<span style="color:var(--color-muted);font-size:12px;"> +${nums.length - 20} โต๊ะ</span>` : '';
    const skipNote = skipped.length
        ? `<div style="margin-top:6px;font-size:11px;color:#f59e0b;">⚠️ ข้ามโต๊ะที่มีอยู่แล้ว: ${skipped.slice(0,10).join(', ')}${skipped.length>10?'...':''} (${skipped.length} โต๊ะ)</div>`
        : '';

    el.innerHTML = `<div style="font-weight:700;margin-bottom:6px;">สร้าง <span style="color:var(--color-gold);font-size:16px;">${nums.length}</span> โต๊ะ:</div>`
        + preview + more + skipNote;
}

async function saveBulkTables() {
    const { nums } = getBulkTableNumbers();
    const seats = Math.max(parseInt(document.getElementById('bulkSeats').value) || 4, 1);

    if (!nums.length) {
        notifier.showToast('ไม่มีโต๊ะที่จะสร้าง', 'error');
        return;
    }

    const saveBtn   = document.getElementById('btnBulkSave');
    const cancelBtn = document.getElementById('btnBulkCancel');
    const progWrap  = document.getElementById('bulkProgress');
    const progBar   = document.getElementById('bulkProgressBar');
    const progText  = document.getElementById('bulkProgressText');
    const progPct   = document.getElementById('bulkProgressPct');

    saveBtn.disabled  = true;
    cancelBtn.disabled = true;
    cancelBtn.textContent = '⏳ กำลังสร้าง...';
    progWrap.style.display = 'block';

    let success = 0, failed = 0;

    for (let i = 0; i < nums.length; i++) {
        const pct = Math.round(((i) / nums.length) * 100);
        progBar.style.width  = pct + '%';
        progText.textContent = `กำลังสร้างโต๊ะ ${nums[i]} (${i + 1}/${nums.length})`;
        progPct.textContent  = pct + '%';
        saveBtn.textContent  = `⏳ ${i + 1}/${nums.length}`;

        try {
            await API.addTable({ table_number: nums[i], seats, is_active: true });
            success++;
        } catch (e) {
            console.warn('เพิ่มโต๊ะ', nums[i], 'ล้มเหลว:', e.message);
            failed++;
        }
    }

    // 100%
    progBar.style.width  = '100%';
    progText.textContent = `✅ เสร็จแล้ว!`;
    progPct.textContent  = '100%';

    const msg = failed
        ? `✓ สร้างสำเร็จ ${success} โต๊ะ (ล้มเหลว ${failed} โต๊ะ)`
        : `✓ สร้างโต๊ะสำเร็จทั้งหมด ${success} โต๊ะ 🎉`;
    notifier.showToast(msg, 'success', 4000);
    notifier.playSuccessSound?.();

    await loadTables();
    closeBulkModal();

    // Reset
    saveBtn.disabled   = false;
    cancelBtn.disabled = false;
    saveBtn.textContent  = '🚀 สร้างโต๊ะทั้งหมด';
    cancelBtn.textContent = 'ยกเลิก';
}
