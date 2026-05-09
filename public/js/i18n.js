// ============================================================
// 🌐 i18n - Language Switcher
// รองรับ: ไทย (th), English (en), 中文 (zh)
// ============================================================

const I18N = {
    current: localStorage.getItem('maeyom_lang') || 'th',

    data: {
        th: {
            // Hero
            hotel_name: 'โรงแรม แม่ยม พาเลส',
            hotel_sub: 'Mae Yom Palace Hotel',
            // Step 1
            order_type_q: 'คุณต้องการสั่งแบบไหน?',
            dine_in: 'กินที่นี่',
            dine_in_desc: 'รับประทานที่โต๊ะ',
            takeaway: 'กลับบ้าน',
            takeaway_desc: 'รับกลับ Takeaway',
            // Step 2
            your_info: 'ข้อมูลของคุณ',
            your_name: 'ชื่อ *',
            your_phone: 'เบอร์โทรศัพท์ *',
            name_placeholder: 'ชื่อของคุณ',
            phone_placeholder: '0XX-XXX-XXXX',
            next: 'ถัดไป →',
            // Step 3
            select_menu: 'เลือกเมนูอาหาร',
            search_placeholder: 'ค้นหาเมนู...',
            all: 'ทั้งหมด',
            recommended: 'แนะนำ',
            spicy: 'เผ็ด',
            add: '+',
            // Cart
            view_cart: 'ดูตะกร้า',
            items: 'รายการ',
            cart_title: '🛒 ตะกร้าของคุณ',
            note_placeholder: 'เช่น ไม่ใส่ผัก, เผ็ดน้อย',
            order_note: 'หมายเหตุรวมทั้งออเดอร์ (ถ้ามี)',
            order_note_placeholder: 'เช่น โต๊ะมีคนแพ้กุ้ง',
            add_more: 'เพิ่มเมนูอีก',
            order_btn: 'สั่งเลย 🚀',
            total: 'รวม',
            // Returning
            welcome_back: 'ยินดีต้อนรับ',
            info_saved: 'ข้อมูลของคุณถูกจำไว้แล้ว',
            my_orders: 'ออเดอร์ของฉัน',
            change_name: 'เปลี่ยนชื่อ',
            // Status
            status_title: 'ติดตามสถานะออเดอร์ของคุณ',
            order_items: '🗒️ รายการอาหาร',
            grand_total: 'รวมทั้งสิ้น',
            add_more_btn: '+ สั่งเพิ่ม',
            call_admin: '📞 โทรหาแอดมิน',
            back_home: '🏠 กลับหน้าแรก',
            // Language
            lang_th: 'ภาษาไทย',
            lang_en: 'English',
            lang_zh: '中文',
        },
        en: {
            hotel_name: 'Mae Yom Palace Hotel',
            hotel_sub: 'โรงแรม แม่ยม พาเลส',
            order_type_q: 'How would you like to order?',
            dine_in: 'Dine In',
            dine_in_desc: 'Eat at the table',
            takeaway: 'Takeaway',
            takeaway_desc: 'Take away order',
            your_info: 'Your Information',
            your_name: 'Name *',
            your_phone: 'Phone Number *',
            name_placeholder: 'Your name',
            phone_placeholder: '0XX-XXX-XXXX',
            next: 'Next →',
            select_menu: 'Select Menu',
            search_placeholder: 'Search menu...',
            all: 'All',
            recommended: 'Recommended',
            spicy: 'Spicy',
            add: '+',
            view_cart: 'View Cart',
            items: 'items',
            cart_title: '🛒 Your Cart',
            note_placeholder: 'e.g. No vegetables, less spicy',
            order_note: 'Order notes (optional)',
            order_note_placeholder: 'e.g. Allergy to shrimp',
            add_more: 'Add More',
            order_btn: 'Place Order 🚀',
            total: 'Total',
            welcome_back: 'Welcome back',
            info_saved: 'Your info has been saved',
            my_orders: 'My Orders',
            change_name: 'Change Name',
            status_title: 'Track Your Order',
            order_items: '🗒️ Order Items',
            grand_total: 'Grand Total',
            add_more_btn: '+ Add More',
            call_admin: '📞 Call Staff',
            back_home: '🏠 Home',
            lang_th: 'ภาษาไทย',
            lang_en: 'English',
            lang_zh: '中文',
        },
        zh: {
            hotel_name: '湄扬宫殿酒店',
            hotel_sub: 'Mae Yom Palace Hotel',
            order_type_q: '您想如何点餐？',
            dine_in: '堂食',
            dine_in_desc: '在餐桌用餐',
            takeaway: '外带',
            takeaway_desc: '打包带走',
            your_info: '您的信息',
            your_name: '姓名 *',
            your_phone: '电话号码 *',
            name_placeholder: '您的姓名',
            phone_placeholder: '0XX-XXX-XXXX',
            next: '下一步 →',
            select_menu: '选择菜单',
            search_placeholder: '搜索菜单...',
            all: '全部',
            recommended: '推荐',
            spicy: '辣',
            add: '+',
            view_cart: '查看购物车',
            items: '项',
            cart_title: '🛒 您的购物车',
            note_placeholder: '例如：不要蔬菜，少辣',
            order_note: '订单备注（可选）',
            order_note_placeholder: '例如：对虾过敏',
            add_more: '继续点餐',
            order_btn: '立即下单 🚀',
            total: '合计',
            welcome_back: '欢迎回来',
            info_saved: '您的信息已保存',
            my_orders: '我的订单',
            change_name: '更改姓名',
            status_title: '追踪您的订单',
            order_items: '🗒️ 点餐明细',
            grand_total: '总计',
            add_more_btn: '+ 继续加点',
            call_admin: '📞 呼叫服务员',
            back_home: '🏠 返回首页',
            lang_th: 'ภาษาไทย',
            lang_en: 'English',
            lang_zh: '中文',
        }
    },

    t(key) {
        return (this.data[this.current] || this.data.th)[key] || this.data.th[key] || key;
    },

    set(lang) {
        if (!this.data[lang]) return;
        this.current = lang;
        localStorage.setItem('maeyom_lang', lang);
        this.apply();
    },

    apply() {
        // อัปเดต elements ที่มี data-i18n
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            const val = this.t(key);
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                if (el.placeholder !== undefined) el.placeholder = val;
            } else {
                el.textContent = val;
            }
        });
        // อัปเดต placeholder
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            el.placeholder = this.t(el.dataset.i18nPlaceholder);
        });
        // อัปเดต active state ใน switcher
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === this.current);
        });
        // อัปเดต html lang
        document.documentElement.lang = this.current;
    },

    // สร้าง language switcher widget
    createSwitcher() {
        const wrap = document.createElement('div');
        wrap.className = 'lang-switcher';
        wrap.innerHTML = `
            <span class="lang-icon">🌐</span>
            <button class="lang-btn ${this.current==='th'?'active':''}" data-lang="th">TH</button>
            <button class="lang-btn ${this.current==='en'?'active':''}" data-lang="en">EN</button>
            <button class="lang-btn ${this.current==='zh'?'active':''}" data-lang="zh">中文</button>`;
        wrap.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', () => I18N.set(btn.dataset.lang));
        });
        return wrap;
    }
};
