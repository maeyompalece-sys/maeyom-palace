// ============================================================
// 🔌 API Client - คุยกับ Apps Script
// ============================================================
//
// หลักการ: ใช้ POST + Content-Type: text/plain เพื่อหลีกเลี่ยง CORS preflight
// (Apps Script ไม่ตอบ OPTIONS request — ถ้าใช้ application/json จะ error)

const API = {
    /**
     * เรียก Apps Script
     * @param {string} action - ชื่อ action ใน router (เช่น 'getMenu', 'createOrder')
     * @param {object} data - ข้อมูลส่งไป
     * @returns {Promise<any>} - data ที่ Apps Script คืนมา
     */
    async call(action, data) {
        if (!isConfigured()) {
            throw new Error('ยังไม่ได้ตั้งค่า APPS_SCRIPT_URL');
        }

        const payload = Object.assign({ action: action }, data || {});

        try {
            const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
                method: 'POST',
                redirect: 'follow',
                // ⚠️ สำคัญ: ใช้ text/plain เพื่อไม่ให้ browser ส่ง preflight OPTIONS
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                throw new Error('HTTP ' + res.status + ': ' + res.statusText);
            }

            const text = await res.text();
            let json;
            try { json = JSON.parse(text); }
            catch (e) {
                console.error('Response is not JSON:', text);
                throw new Error('Apps Script ส่งข้อมูลกลับไม่ถูกต้อง — อาจ deploy ผิด');
            }

            if (!json.ok) {
                throw new Error(json.error || 'Unknown error');
            }
            return json.data;
        } catch (err) {
            console.error('API.' + action + ' failed:', err);
            throw err;
        }
    },

    // ===== Bootstrap =====
    getBootstrap()        { return this.call('getBootstrap'); },

    // ===== Tables =====
    getTables()           { return this.call('getTables'); },
    addTable(d)           { return this.call('addTable', d); },
    updateTable(d)        { return this.call('updateTable', d); },
    deleteTable(id)       { return this.call('deleteTable', { id: id }); },

    // ===== Categories =====
    getCategories()       { return this.call('getCategories'); },
    addCategory(d)        { return this.call('addCategory', d); },
    deleteCategory(id)    { return this.call('deleteCategory', { id: id }); },

    // ===== Menu =====
    getMenu()             { return this.call('getMenu'); },
    addMenuItem(d)        { return this.call('addMenuItem', d); },
    updateMenuItem(d)     { return this.call('updateMenuItem', d); },
    deleteMenuItem(id)    { return this.call('deleteMenuItem', { id: id }); },
    toggleAvailable(id, v){ return this.call('toggleAvailable', { id: id, is_available: v }); },

    // ===== Orders =====
    getOrders(filter)     { return this.call('getOrders', filter || {}); },
    getOrder(id)          { return this.call('getOrder', { id: id }); },
    getOrdersSince(since) { return this.call('getOrdersSince', { since: since }); },
    createOrder(d)        { return this.call('createOrder', d); },
    updateOrderStatus(id, status) { return this.call('updateOrderStatus', { id: id, status: status }); },
    addItemsToOrder(d)    { return this.call('addItemsToOrder', d); },

    // ===== Image Upload =====
    // เมนูพิเศษ
    getFlashSales()       { return this.call('getFlashSales'); },
    getAllFlashSales()     { return this.call('getAllFlashSales'); },
    addFlashSale(d)       { return this.call('addFlashSale', d); },
    updateFlashSale(d)    { return this.call('updateFlashSale', d); },
    deleteFlashSale(d)    { return this.call('deleteFlashSale', d); },

    // Delete Order
    deleteOrder(d)        { return this.call('deleteOrder', d); },

    async uploadImage(file) {
        const base64 = await fileToBase64(file);
        return this.call('uploadImage', {
            base64: base64,
            mime: file.type || 'image/jpeg',
            filename: file.name || ('image-' + Date.now() + '.jpg')
        });
    },

    // ===== LINE =====
    lineNotify(message)   { return this.call('lineNotify', { message: message }); },

    // ===== Kitchen Schedule (GAS Time Trigger) =====
    saveKitchenSchedule(s)  { return this.call('saveKitchenSchedule',   { schedule: s }); },
    getKitchenSchedule()    { return this.call('getKitchenSchedule'); },
    deleteKitchenSchedule() { return this.call('deleteKitchenSchedule'); },
};

// แปลงไฟล์เป็น base64 (ตัด prefix `data:image/...;base64,` ออก)
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            const idx = result.indexOf(',');
            resolve(idx >= 0 ? result.slice(idx + 1) : result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

window.API = API;

// ============================================================
// 🔁 Poller - polling helper สำหรับ realtime แบบเลียนแบบ
// ============================================================
class Poller {
    constructor(fn, interval) {
        this.fn = fn;
        this.interval = interval || 3000;
        this.running = false;
        this.timer = null;
        this.consecutive_errors = 0;
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.tick();
    }

    stop() {
        this.running = false;
        if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    }

    async tick() {
        if (!this.running) return;
        try {
            await this.fn();
            this.consecutive_errors = 0;
        } catch (err) {
            this.consecutive_errors++;
            console.warn('Poll error (' + this.consecutive_errors + '):', err.message);
            // ถ้า error 5 ครั้งติด ให้ delay นานขึ้น
        }
        if (!this.running) return;
        const delay = this.consecutive_errors >= 5 ? this.interval * 4 : this.interval;
        this.timer = setTimeout(() => this.tick(), delay);
    }
}

window.Poller = Poller;
