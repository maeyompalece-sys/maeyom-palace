// ============================================================
// 🔔 Web Push Notification (OneSignal)
// ============================================================
//
// ใช้งาน: เรียก Push.init() หลัง DOM ready
//         เรียก Push.linkOrder(orderId) หลังสั่งออเดอร์
//         Apps Script จะส่ง push มาเองเมื่อสถานะเปลี่ยน
// ============================================================

const Push = {
    ready: false,

    // ============================================================
    // init — โหลด OneSignal SDK แล้ว init
    // ============================================================
    async init() {
        const appId = CONFIG.ONESIGNAL_APP_ID;
        if (!appId || appId === 'PASTE_YOUR_ONESIGNAL_APP_ID_HERE') return;

        // โหลด SDK แบบ dynamic ถ้ายังไม่มี
        if (!window.OneSignalDeferred) {
            await new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
                s.defer = true;
                s.onload = resolve;
                s.onerror = reject;
                document.head.appendChild(s);
            });
        }

        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push(async (OneSignal) => {
            try {
                await OneSignal.init({
                    appId: appId,
                    serviceWorkerPath: '/sw.js',
                    promptOptions: {
                        slidedown: {
                            prompts: [{
                                type: 'push',
                                autoPrompt: false, // เราจะ prompt เองหลังสั่งอาหาร
                                text: {
                                    actionMessage: '📱 รับแจ้งเตือนเมื่ออาหารพร้อม แม้ปิดหน้าเว็บแล้ว',
                                    acceptButton: 'อนุญาต',
                                    cancelButton: 'ไม่ขอบคุณ'
                                }
                            }]
                        }
                    },
                    allowLocalhostAsSecureOrigin: true,
                });
                Push.ready = true;
                console.log('OneSignal ready');
            } catch (e) {
                console.warn('OneSignal init error:', e);
            }
        });
    },

    // ============================================================
    // askPermission — แสดง prompt ขอ permission
    // เรียกหลังลูกค้าสั่งอาหารแล้ว (conversion rate ดีกว่า)
    // ============================================================
    async askPermission() {
        if (!Push.ready || !window.OneSignal) return;
        try {
            const permission = await OneSignal.Notifications.permission;
            if (!permission) {
                await OneSignal.Slidedown.promptPush();
            }
        } catch (e) {
            console.warn('Push permission error:', e);
        }
    },

    // ============================================================
    // linkOrder — ผูก OneSignal subscription กับ order ID
    // ทำให้ Apps Script ส่ง push มาหาลูกค้าคนนี้ได้ตรงๆ
    // ============================================================
    async linkOrder(orderId) {
        if (!Push.ready || !window.OneSignal) return;
        try {
            // login ด้วย orderId เป็น external user ID
            await OneSignal.login(orderId);
            console.log('Push linked to order:', orderId);
        } catch (e) {
            console.warn('Push link error:', e);
        }
    },

    // ============================================================
    // unlinkOrder — ถอด link เมื่อออเดอร์เสร็จ/ยกเลิก
    // ============================================================
    async unlinkOrder() {
        if (!window.OneSignal) return;
        try {
            await OneSignal.logout();
        } catch (e) {}
    }
};
