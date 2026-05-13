// ============================================================
// 🔧 การตั้งค่าระบบ - แก้ไขก่อนใช้งาน
// ============================================================

const CONFIG = {
    // ⭐ Apps Script Web App URL — สำคัญที่สุด!
    // วิธีหา: Google Sheet → Extensions → Apps Script → Deploy → Web app
    // คัดลอก URL ที่ขึ้นต้นด้วย https://script.google.com/macros/s/...
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxCP7SxWBSGfcdM-W34uOCDNpNznn0LpNATIDTcTPFduDxTdVynDJKIotvHLzLm7vKDFw/exec',

    // ข้อมูลโรงแรม
    HOTEL_NAME: 'โรงแรม แม่ยมพาเลส',
    HOTEL_NAME_EN: 'Maeyom Palace Hotel',
    HOTEL_PHONE: '054-521-028',

    // URL สำหรับสร้าง QR Code (ปล่อยค่า default ก็ได้)
    BASE_URL: 'https://maeyompalece-sys.github.io/maeyom-palace',

    // การตั้งค่าเสียง
    NOTIFICATION_SOUND_VOLUME: 1,
    NOTIFICATION_SOUND_REPEAT: 2,

    // ปริ้นออเดอร์
    AUTO_PRINT: false,
    PRINT_PAPER_WIDTH: 80,

    // Polling intervals (มิลลิวินาที)
    ADMIN_POLL_INTERVAL: 2000,    // หน้าแอดมิน — ทุก 3 วิ
    CUSTOMER_POLL_INTERVAL: 4000, // หน้าลูกค้า — ทุก 5 วิ

    // === Admin PIN ===
    // รหัสผ่าน 6 หลักสำหรับเข้าหน้าแอดมิน
    ADMIN_PIN: '123456',

    // === พร้อมเพย์ (สำหรับ QR จ่ายเงินบนสลิป) ===
    // ใส่เบอร์โทรหรือเลขบัตรประชาชน 13 หลัก
    // เช่น '0812345678' หรือ '1234567890123'
    // ถ้าไม่ต้องการ QR ปล่อยว่างไว้ได้
    PROMPTPAY_ID: '',

    // === Web Push (OneSignal) ===
    // สมัครฟรีที่ https://onesignal.com → สร้าง App → Copy App ID
    ONESIGNAL_APP_ID: '769c7801-3261-4adc-b1a1-4671a205c465',
};

// สถานะออเดอร์
const ORDER_STATUS = {
    pending:    { label: 'รอ',                color: '#FCD34D', icon: '⏳', next: 'accepted' },
    accepted:   { label: 'รับออเดอร์',         color: '#60A5FA', icon: '✅', next: 'cooking' },
    cooking:    { label: 'กำลังทำ',           color: '#FB923C', icon: '👨‍🍳', next: 'ready' },
    ready:      { label: 'ทำเสร็จ',           color: '#34D399', icon: '🍽️', next: 'delivering' },
    delivering: { label: 'กำลังจัดส่ง',        color: '#A78BFA', icon: '🚚', next: 'completed' },
    completed:  { label: 'จัดส่งเสร็จสิ้น',    color: '#10B981', icon: '✨', next: null },
    cancelled:  { label: 'ยกเลิก',           color: '#EF4444', icon: '❌', next: null }
};

const ORDER_TYPE = {
    dine_in:   { label: 'กินที่นี่', icon: '🍽️', color: '#10B981' },
    takeaway:  { label: 'กลับบ้าน',  icon: '🥡', color: '#F59E0B' }
};

// ตรวจสอบว่าตั้งค่าแล้วหรือยัง
function isConfigured() {
    return CONFIG.APPS_SCRIPT_URL &&
           CONFIG.APPS_SCRIPT_URL !== 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE' &&
           CONFIG.APPS_SCRIPT_URL.startsWith('https://script.google.com/');
}

// แสดงข้อความเตือนถ้ายังไม่ตั้งค่า
function checkConfig() {
    if (!isConfigured()) {
        const msg = '⚠️ ยังไม่ได้ตั้งค่า APPS_SCRIPT_URL\n\nกรุณาแก้ไขไฟล์ public/js/config.js\nและใส่ URL ของ Apps Script Web App';
        document.body.innerHTML = `
            <div style="padding:40px 20px;max-width:600px;margin:40px auto;background:#fff3cd;border:2px solid #f59e0b;border-radius:12px;font-family:sans-serif;">
                <h2 style="color:#92400e;margin-top:0;">⚙️ ระบบยังไม่พร้อมใช้งาน</h2>
                <p style="white-space:pre-line;color:#451a03;">${msg}</p>
                <p style="color:#92400e;margin-top:20px;font-size:14px;">📖 อ่านวิธีตั้งค่าใน <strong>docs/SETUP.md</strong></p>
            </div>`;
        return false;
    }
    return true;
}
