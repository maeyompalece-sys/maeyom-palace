// ============================================================
// 🌐 i18n - Language Switcher
// รองรับ: ไทย (th), English (en), 中文 (zh)
// ============================================================

const I18N = {
    current: localStorage.getItem('maeyom_lang') || 'th',

    data: {
        th: {
            // Hero (menu.html)
            hotel_name: 'โรงแรม แม่ยมพาเลส',
            hotel_sub: 'Maeyom Palace Hotel',
            order_type_q: 'คุณต้องการสั่งแบบไหน?',
            dine_in: 'กินที่นี่', dine_in_desc: 'รับประทานที่โต๊ะ',
            takeaway: 'กลับบ้าน', takeaway_desc: 'รับกลับ Takeaway',
            your_info: 'ข้อมูลของคุณ',
            your_name: 'ชื่อ *', your_phone: 'เบอร์โทรศัพท์ *',
            name_placeholder: 'ชื่อของคุณ', phone_placeholder: '0XX-XXX-XXXX',
            next: 'ถัดไป →',
            select_menu: 'เลือกเมนูอาหาร',
            search_placeholder: 'ค้นหาเมนู...',
            all: 'ทั้งหมด', recommended: 'แนะนำ', spicy: 'เผ็ด', add: '+',
            view_cart: 'ดูตะกร้า', items: 'รายการ',
            cart_title: '🛒 ตะกร้าของคุณ',
            note_placeholder: 'เช่น ไม่ใส่ผัก, เผ็ดน้อย',
            order_note: 'หมายเหตุรวมทั้งออเดอร์ (ถ้ามี)',
            order_note_placeholder: 'เช่น โต๊ะมีคนแพ้กุ้ง',
            add_more: 'เพิ่มเมนูอีก', order_btn: 'สั่งเลย 🚀', total: 'รวม',
            welcome_back: 'ยินดีต้อนรับ', info_saved: 'ข้อมูลของคุณถูกจำไว้แล้ว',
            my_orders: 'ออเดอร์ของฉัน', change_name: 'เปลี่ยนชื่อ',
            status_title: 'ติดตามสถานะออเดอร์ของคุณ',
            order_items: '🗒️ รายการอาหาร', grand_total: 'รวมทั้งสิ้น',
            add_more_btn: '+ สั่งเพิ่ม', call_admin: '📞 โทรหาแอดมิน',
            back_home: '🏠 กลับหน้าแรก',
            lang_th: 'ภาษาไทย', lang_en: 'English', lang_zh: '中文',

            // ── index.html ──
            idx_eyebrow: 'ยินดีต้อนรับสู่ | WELCOME TO',
            idx_desc_1: 'ระบบสั่งอาหารโรงครัว/โรงอาหาร',
            idx_desc_2: 'สแกน QR Code ที่โต๊ะของคุณเพื่อเริ่มต้น',
            idx_btn_track: '📋 ติดตามออเดอร์ของฉัน',
            idx_btn_order: 'สั่งอาหาร',
            idx_btn_admin: 'แอดมิน',
            idx_btn_menu: 'เมนูอาหาร',
            idx_btn_admin_page: 'หน้าแอดมิน',
            feat_qr: 'สแกน QR Code',
            feat_easy: 'เลือกเมนูง่าย',
            feat_fast: 'เสิร์ฟรวดเร็ว',
            // order-type modal (index)
            idx_modal_order_title: 'สั่งอาหารแบบไหน?',
            idx_modal_dine_label: 'กินที่นี่',
            idx_modal_dine_sub: 'Dine In · รับประทานที่โต๊ะ',
            idx_modal_take_label: 'กลับบ้าน',
            idx_modal_take_sub: 'Takeaway · รับกลับ',
            idx_modal_cancel: 'ยกเลิก',
            // table modal (index)
            idx_table_title: 'กรอกเลขโต๊ะ',
            idx_table_sub: 'Enter your table number',
            idx_table_confirm: '✓ ยืนยันโต๊ะ',
            idx_table_back: '← กลับ',
            // track modal (index)
            idx_track_title: '📋 ออเดอร์ของฉัน',
            idx_loading: 'กำลังโหลด...',
            idx_no_orders: '📭 ยังไม่มีออเดอร์',
            idx_today: '📅 วันนี้',
            idx_yesterday: '📅 เมื่อวาน',
            idx_unknown_date: '📅 ไม่ทราบวันที่',
            idx_see_status: 'ดูสถานะ →',
            // status labels (index)
            st_pending: '⏳ รอ', st_accepted: '✅ รับแล้ว',
            st_cooking: '👨‍🍳 กำลังทำ', st_ready: '🍽️ พร้อมเสิร์ฟ',
            st_delivering: '🚶 กำลังส่ง', st_completed: '✨ เสร็จสิ้น',
            st_cancelled: '❌ ยกเลิก',

            // ── walkin.html ──
            wk_eyebrow: 'ยินดีต้อนรับ · WELCOME',
            wk_desc_1: 'สั่งอาหารกับเราได้เลย',
            wk_desc_2: 'ไม่ต้องดาวน์โหลดแอป',
            wk_badge: '🚶 Walk-in · ลูกค้าทั่วไป',
            wk_btn_track: '📋 ติดตามออเดอร์ของฉัน',
            wk_btn_menu: '🍽️ ดูเมนูและสั่งอาหาร',
            feat_variety: 'เมนูหลากหลาย',
            feat_quick: 'สั่งได้รวดเร็ว',
            feat_track_status: 'ติดตามสถานะ',
            // step 1
            wk_step1_title: 'สั่งอาหารแบบไหน?',
            wk_dine_label: 'กินที่นี่',
            wk_dine_sub: 'Dine In · รับประทานที่โต๊ะ',
            wk_take_label: 'กลับบ้าน',
            wk_take_sub: 'Takeaway · รับกลับ',
            wk_cancel: 'ยกเลิก',
            // step 2
            wk_step2_dine_title: 'คุณนั่งที่ไหน?',
            wk_step2_dine_sub: 'ระบุโต๊ะ หรือ จุดที่อยู่ของคุณ',
            wk_step2_take_title: 'รับอาหารที่ไหน?',
            wk_step2_take_sub: 'ระบุจุดรับของ หรือ แลนด์มาร์ค',
            wk_table_label: '🔢 หมายเลขโต๊ะ (ถ้ามี)',
            wk_or: 'หรือ',
            wk_location_label: '📍 จุดที่อยู่ / แลนด์มาร์ค',
            wk_note_label: '💬 หมายเหตุเพิ่มเติม (ไม่บังคับ)',
            wk_back: '← ย้อนกลับ',
            wk_confirm: '✅ ยืนยันและดูเมนู',
            // track modal (walkin)
            wk_track_title: '📋 ออเดอร์ของฉัน',
            wk_close: 'ปิด',
            wk_loading: '⏳ กำลังโหลด...',
            wk_no_orders: '📭 ยังไม่มีออเดอร์',
            wk_not_found: '📭 ไม่พบออเดอร์',
            wk_error: '❌ โหลดไม่ได้ ลองใหม่อีกครั้ง',
            wk_see_status: '→ ดูสถานะ',
            wk_st_pending: '⏳ รอ', wk_st_accepted: '✅ รับแล้ว',
            wk_st_cooking: '👨‍🍳 กำลังทำ', wk_st_ready: '🍽️ พร้อมเสิร์ฟ',
            wk_st_delivering: '🚶 กำลังส่ง', wk_st_completed: '✨ เสร็จสิ้น',
            wk_st_cancelled: '❌ ยกเลิก',
        },

        en: {
            hotel_name: 'Maeyom Palace Hotel', hotel_sub: 'โรงแรม แม่ยมพาเลส',
            order_type_q: 'How would you like to order?',
            dine_in: 'Dine In', dine_in_desc: 'Eat at the table',
            takeaway: 'Takeaway', takeaway_desc: 'Take away order',
            your_info: 'Your Information',
            your_name: 'Name *', your_phone: 'Phone Number *',
            name_placeholder: 'Your name', phone_placeholder: '0XX-XXX-XXXX',
            next: 'Next →',
            select_menu: 'Select Menu',
            search_placeholder: 'Search menu...',
            all: 'All', recommended: 'Recommended', spicy: 'Spicy', add: '+',
            view_cart: 'View Cart', items: 'items',
            cart_title: '🛒 Your Cart',
            note_placeholder: 'e.g. No vegetables, less spicy',
            order_note: 'Order notes (optional)',
            order_note_placeholder: 'e.g. Allergy to shrimp',
            add_more: 'Add More', order_btn: 'Place Order 🚀', total: 'Total',
            welcome_back: 'Welcome back', info_saved: 'Your info has been saved',
            my_orders: 'My Orders', change_name: 'Change Name',
            status_title: 'Track Your Order',
            order_items: '🗒️ Order Items', grand_total: 'Grand Total',
            add_more_btn: '+ Add More', call_admin: '📞 Call Staff',
            back_home: '🏠 Home',
            lang_th: 'ภาษาไทย', lang_en: 'English', lang_zh: '中文',

            idx_eyebrow: 'WELCOME TO | ยินดีต้อนรับสู่',
            idx_desc_1: 'Kitchen & Restaurant Ordering System',
            idx_desc_2: 'Scan the QR Code at your table to begin',
            idx_btn_track: '📋 My Orders',
            idx_btn_order: 'Order Food',
            idx_btn_admin: 'Admin',
            idx_btn_menu: 'Food Menu',
            idx_btn_admin_page: 'Admin',
            feat_qr: 'Scan QR Code',
            feat_easy: 'Easy Menu',
            feat_fast: 'Fast Service',
            idx_modal_order_title: 'How would you like to order?',
            idx_modal_dine_label: 'Dine In',
            idx_modal_dine_sub: 'Eat at your table',
            idx_modal_take_label: 'Takeaway',
            idx_modal_take_sub: 'Take your order home',
            idx_modal_cancel: 'Cancel',
            idx_table_title: 'Enter Table Number',
            idx_table_sub: 'กรอกเลขโต๊ะ',
            idx_table_confirm: '✓ Confirm Table',
            idx_table_back: '← Back',
            idx_track_title: '📋 My Orders',
            idx_loading: 'Loading...',
            idx_no_orders: '📭 No orders yet',
            idx_today: '📅 Today',
            idx_yesterday: '📅 Yesterday',
            idx_unknown_date: '📅 Unknown date',
            idx_see_status: 'View Status →',
            st_pending: '⏳ Waiting', st_accepted: '✅ Accepted',
            st_cooking: '👨‍🍳 Cooking', st_ready: '🍽️ Ready',
            st_delivering: '🚶 On the way', st_completed: '✨ Completed',
            st_cancelled: '❌ Cancelled',

            wk_eyebrow: 'WELCOME',
            wk_desc_1: 'Order food with us today',
            wk_desc_2: 'No app download needed',
            wk_badge: '🚶 Walk-in · All Guests',
            wk_btn_track: '📋 Track My Orders',
            wk_btn_menu: '🍽️ View Menu & Order',
            feat_variety: 'Variety Menu',
            feat_quick: 'Quick Order',
            feat_track_status: 'Track Status',
            wk_step1_title: 'How would you like to order?',
            wk_dine_label: 'Dine In',
            wk_dine_sub: 'Eat at the table',
            wk_take_label: 'Takeaway',
            wk_take_sub: 'Take your order home',
            wk_cancel: 'Cancel',
            wk_step2_dine_title: 'Where are you sitting?',
            wk_step2_dine_sub: 'Enter table number or your location',
            wk_step2_take_title: 'Where to collect?',
            wk_step2_take_sub: 'Enter pickup point or landmark',
            wk_table_label: '🔢 Table Number (optional)',
            wk_or: 'or',
            wk_location_label: '📍 Location / Landmark',
            wk_note_label: '💬 Additional Note (optional)',
            wk_back: '← Back',
            wk_confirm: '✅ Confirm & View Menu',
            wk_track_title: '📋 My Orders',
            wk_close: 'Close',
            wk_loading: '⏳ Loading...',
            wk_no_orders: '📭 No orders yet',
            wk_not_found: '📭 Orders not found',
            wk_error: '❌ Failed to load. Please try again.',
            wk_see_status: '→ View Status',
            wk_st_pending: '⏳ Waiting', wk_st_accepted: '✅ Accepted',
            wk_st_cooking: '👨‍🍳 Cooking', wk_st_ready: '🍽️ Ready',
            wk_st_delivering: '🚶 On the way', wk_st_completed: '✨ Completed',
            wk_st_cancelled: '❌ Cancelled',
        },

        zh: {
            hotel_name: '湄扬宫殿酒店', hotel_sub: 'Maeyom Palace Hotel',
            order_type_q: '您想如何点餐？',
            dine_in: '堂食', dine_in_desc: '在餐桌用餐',
            takeaway: '外带', takeaway_desc: '打包带走',
            your_info: '您的信息',
            your_name: '姓名 *', your_phone: '电话号码 *',
            name_placeholder: '您的姓名', phone_placeholder: '0XX-XXX-XXXX',
            next: '下一步 →',
            select_menu: '选择菜单',
            search_placeholder: '搜索菜单...',
            all: '全部', recommended: '推荐', spicy: '辣', add: '+',
            view_cart: '查看购物车', items: '项',
            cart_title: '🛒 您的购物车',
            note_placeholder: '例如：不要蔬菜，少辣',
            order_note: '订单备注（可选）',
            order_note_placeholder: '例如：对虾过敏',
            add_more: '继续点餐', order_btn: '立即下单 🚀', total: '合计',
            welcome_back: '欢迎回来', info_saved: '您的信息已保存',
            my_orders: '我的订单', change_name: '更改姓名',
            status_title: '追踪您的订单',
            order_items: '🗒️ 点餐明细', grand_total: '总计',
            add_more_btn: '+ 继续加点', call_admin: '📞 呼叫服务员',
            back_home: '🏠 返回首页',
            lang_th: 'ภาษาไทย', lang_en: 'English', lang_zh: '中文',

            idx_eyebrow: '欢迎光临',
            idx_desc_1: '餐厅点餐系统',
            idx_desc_2: '请扫描桌上的二维码开始点餐',
            idx_btn_track: '📋 我的订单',
            idx_btn_order: '点餐',
            idx_btn_admin: '管理员',
            idx_btn_menu: '菜单',
            idx_btn_admin_page: '管理员',
            feat_qr: '扫码点餐',
            feat_easy: '轻松选菜',
            feat_fast: '快速上菜',
            idx_modal_order_title: '您想如何点餐？',
            idx_modal_dine_label: '堂食',
            idx_modal_dine_sub: '在餐桌用餐',
            idx_modal_take_label: '外带',
            idx_modal_take_sub: '打包带走',
            idx_modal_cancel: '取消',
            idx_table_title: '输入桌号',
            idx_table_sub: 'กรอกเลขโต๊ะ',
            idx_table_confirm: '✓ 确认桌号',
            idx_table_back: '← 返回',
            idx_track_title: '📋 我的订单',
            idx_loading: '加载中...',
            idx_no_orders: '📭 暂无订单',
            idx_today: '📅 今天',
            idx_yesterday: '📅 昨天',
            idx_unknown_date: '📅 未知日期',
            idx_see_status: '查看状态 →',
            st_pending: '⏳ 等待中', st_accepted: '✅ 已接单',
            st_cooking: '👨‍🍳 制作中', st_ready: '🍽️ 已准备好',
            st_delivering: '🚶 送餐中', st_completed: '✨ 已完成',
            st_cancelled: '❌ 已取消',

            wk_eyebrow: '欢迎光临',
            wk_desc_1: '现在可以向我们点餐',
            wk_desc_2: '无需下载应用程序',
            wk_badge: '🚶 Walk-in · 散客',
            wk_btn_track: '📋 查看我的订单',
            wk_btn_menu: '🍽️ 查看菜单并点餐',
            feat_variety: '丰富菜单',
            feat_quick: '快速点餐',
            feat_track_status: '追踪状态',
            wk_step1_title: '您想如何点餐？',
            wk_dine_label: '堂食',
            wk_dine_sub: '在餐桌用餐',
            wk_take_label: '外带',
            wk_take_sub: '打包带走',
            wk_cancel: '取消',
            wk_step2_dine_title: '您坐在哪里？',
            wk_step2_dine_sub: '请输入桌号或您的位置',
            wk_step2_take_title: '在哪里取餐？',
            wk_step2_take_sub: '请输入取餐地点或地标',
            wk_table_label: '🔢 桌号（可选）',
            wk_or: '或者',
            wk_location_label: '📍 位置/地标',
            wk_note_label: '💬 附加备注（可选）',
            wk_back: '← 返回',
            wk_confirm: '✅ 确认并查看菜单',
            wk_track_title: '📋 我的订单',
            wk_close: '关闭',
            wk_loading: '⏳ 加载中...',
            wk_no_orders: '📭 暂无订单',
            wk_not_found: '📭 未找到订单',
            wk_error: '❌ 加载失败，请重试',
            wk_see_status: '→ 查看状态',
            wk_st_pending: '⏳ 等待中', wk_st_accepted: '✅ 已接单',
            wk_st_cooking: '👨‍🍳 制作中', wk_st_ready: '🍽️ 已准备好',
            wk_st_delivering: '🚶 送餐中', wk_st_completed: '✨ 已完成',
            wk_st_cancelled: '❌ 已取消',
        }
    },

    t(key) {
        return (this.data[this.current] || this.data.th)[key] || this.data.th[key] || key;
    },

    set(lang) {
        if (!this.data[lang]) return;
        this.current = lang;
        localStorage.setItem('maeyom_lang', lang);
        document.documentElement.lang = lang;
        this.apply();
    },

    apply() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const val = this.t(el.dataset.i18n);
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                if (el.placeholder !== undefined) el.placeholder = val;
            } else {
                el.textContent = val;
            }
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            el.placeholder = this.t(el.dataset.i18nPlaceholder);
        });
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === this.current);
        });
        document.documentElement.lang = this.current;
        // callback for pages that need to re-render dynamic content
        if (typeof onI18NChange === 'function') onI18NChange();
    },

    createSwitcher() {
        const wrap = document.createElement('div');
        wrap.className = 'lang-switcher';
        wrap.innerHTML =
            '<span class="lang-icon">🌐</span>' +
            '<button class="lang-btn ' + (this.current==='th'?'active':'') + '" data-lang="th">TH</button>' +
            '<button class="lang-btn ' + (this.current==='en'?'active':'') + '" data-lang="en">EN</button>' +
            '<button class="lang-btn ' + (this.current==='zh'?'active':'') + '" data-lang="zh">中文</button>';
        wrap.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', () => I18N.set(btn.dataset.lang));
        });
        return wrap;
    }
};

// ============================================================
// 🚀 Auto-init: ฉีด switcher เข้า topbar ทุกหน้าอัตโนมัติ
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('langSwitcherHero')) {
        I18N.apply(); return;
    }
    var topbarInner = document.querySelector('.topbar-inner');
    if (topbarInner) {
        topbarInner.appendChild(I18N.createSwitcher());
    } else {
        var sw = I18N.createSwitcher();
        sw.className = 'lang-switcher-float';
        document.body.appendChild(sw);
    }
    I18N.apply();
});
