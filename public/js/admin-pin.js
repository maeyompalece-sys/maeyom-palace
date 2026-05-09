// ============================================================
// 🔐 Admin PIN Lock - แม่ยม พาเลส
// PIN เก็บใน Google Sheet แท็บ Settings → key: admin_pin
// วิธีเปลี่ยน PIN: เปิด Google Sheet → Settings → แก้ value ของ admin_pin
// Default PIN: 123456
// ============================================================

(function() {
    const SESSION_KEY = 'maeyom_admin_ok';

    function isVerified() {
        return sessionStorage.getItem(SESSION_KEY) === 'yes';
    }

    function showPinScreen() {
        document.body.style.visibility = 'hidden';

        const overlay = document.createElement('div');
        overlay.id = 'pinOverlay';
        overlay.innerHTML = `
<style>
#pinOverlay{position:fixed;inset:0;z-index:99999;background:linear-gradient(160deg,#0F3B2E 0%,#0a2820 60%,#061a14 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Sarabun',-apple-system,sans-serif;}
.pin-logo{text-align:center;margin-bottom:32px;}
.pin-logo .mark{width:72px;height:72px;border-radius:50%;background:rgba(201,168,97,.15);border:2px solid rgba(201,168,97,.4);display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:36px;font-weight:700;color:#C9A861;margin:0 auto 12px;}
.pin-logo h1{font-family:'Cormorant Garamond',serif;color:#C9A861;font-size:26px;margin:0;}
.pin-logo p{color:rgba(255,255,255,.5);font-size:13px;margin:4px 0 0;}
.pin-label{color:rgba(255,255,255,.7);font-size:14px;margin-bottom:16px;letter-spacing:.5px;}
.pin-dots{display:flex;gap:14px;margin-bottom:28px;}
.pin-dot{width:16px;height:16px;border-radius:50%;border:2px solid rgba(201,168,97,.5);background:transparent;transition:all .2s;}
.pin-dot.filled{background:#C9A861;border-color:#C9A861;}
.pin-dot.error{background:#ef4444;border-color:#ef4444;}
.pin-pad{display:grid;grid-template-columns:repeat(3,72px);grid-template-rows:repeat(4,72px);gap:10px;}
.pin-btn{border-radius:50%;background:rgba(255,255,255,.07);border:1.5px solid rgba(255,255,255,.12);color:#fff;font-size:22px;font-weight:600;cursor:pointer;transition:all .15s;display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;}
.pin-btn:hover{background:rgba(201,168,97,.2);border-color:rgba(201,168,97,.5);}
.pin-btn:active{transform:scale(.92);background:rgba(201,168,97,.35);}
.pin-btn.del{font-size:18px;color:rgba(255,255,255,.6);}
.pin-btn.empty{background:transparent;border:none;cursor:default;}
.pin-msg{font-size:13px;margin-top:14px;height:18px;text-align:center;}
@keyframes pinShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}
.pin-shake{animation:pinShake .4s ease;}
</style>
<div class="pin-logo">
  <div class="mark">M</div>
  <h1>แม่ยม พาเลส</h1>
  <p>Mae Yom Palace Hotel</p>
</div>
<div class="pin-label">🔐 กรอก PIN 6 หลัก</div>
<div class="pin-dots" id="pinDots">
  <div class="pin-dot" id="pd0"></div><div class="pin-dot" id="pd1"></div>
  <div class="pin-dot" id="pd2"></div><div class="pin-dot" id="pd3"></div>
  <div class="pin-dot" id="pd4"></div><div class="pin-dot" id="pd5"></div>
</div>
<div class="pin-pad" id="pinPad">
  <button class="pin-btn" data-n="1">1</button><button class="pin-btn" data-n="2">2</button><button class="pin-btn" data-n="3">3</button>
  <button class="pin-btn" data-n="4">4</button><button class="pin-btn" data-n="5">5</button><button class="pin-btn" data-n="6">6</button>
  <button class="pin-btn" data-n="7">7</button><button class="pin-btn" data-n="8">8</button><button class="pin-btn" data-n="9">9</button>
  <div class="pin-btn empty"></div><button class="pin-btn" data-n="0">0</button><button class="pin-btn del" id="pinDel">⌫</button>
</div>
<div class="pin-msg" id="pinMsg" style="color:#ef4444;"></div>`;

        document.body.appendChild(overlay);
        document.body.style.visibility = 'visible';

        let entered = '', busy = false;

        function dots() {
            for (let i=0;i<6;i++) {
                const d=document.getElementById('pd'+i);
                d.classList.toggle('filled',i<entered.length);
                d.classList.remove('error');
            }
        }

        function shake(msg) {
            msg && (document.getElementById('pinMsg').textContent=msg);
            const el=document.getElementById('pinDots');
            el.classList.remove('pin-shake'); void el.offsetWidth; el.classList.add('pin-shake');
            for(let i=0;i<6;i++) document.getElementById('pd'+i).classList.add('error');
            setTimeout(()=>{ entered=''; dots(); busy=false; },700);
        }

        function unlock() {
            sessionStorage.setItem(SESSION_KEY,'yes');
            overlay.style.transition='opacity .3s'; overlay.style.opacity='0';
            setTimeout(()=>overlay.remove(),300);
        }

        async function verify() {
            busy=true;
            document.getElementById('pinMsg').style.color='rgba(255,255,255,.5)';
            document.getElementById('pinMsg').textContent='กำลังตรวจสอบ...';
            try {
                const url=(typeof CONFIG!=='undefined')?CONFIG.APPS_SCRIPT_URL:'';
                if(url && !url.includes('PASTE_YOUR')) {
                    const r=await fetch(url,{method:'POST',redirect:'follow',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'verifyAdminPin',pin:entered})});
                    const d=await r.json();
                    if(d.ok && d.data && d.data.ok) { unlock(); return; }
                    document.getElementById('pinMsg').style.color='#ef4444';
                    shake('PIN ไม่ถูกต้อง กรุณาลองใหม่'); return;
                }
            } catch(e) {}
            // fallback local
            const local=(typeof CONFIG!=='undefined'&&CONFIG.ADMIN_PIN)?String(CONFIG.ADMIN_PIN):'123456';
            if(entered===local) { unlock(); } else { document.getElementById('pinMsg').style.color='#ef4444'; shake('PIN ไม่ถูกต้อง'); }
        }

        document.getElementById('pinPad').addEventListener('click',e=>{
            if(busy) return;
            const btn=e.target.closest('[data-n]');
            if(btn&&entered.length<6){ entered+=btn.dataset.n; dots(); document.getElementById('pinMsg').textContent=''; if(entered.length===6) setTimeout(verify,150); }
        });
        document.getElementById('pinDel').addEventListener('click',()=>{ if(!busy){entered=entered.slice(0,-1);dots();document.getElementById('pinMsg').textContent='';} });
        document.addEventListener('keydown',function h(e){
            if(!document.getElementById('pinOverlay')){document.removeEventListener('keydown',h);return;}
            if(busy) return;
            if(e.key>='0'&&e.key<='9'&&entered.length<6){entered+=e.key;dots();document.getElementById('pinMsg').textContent='';if(entered.length===6)setTimeout(verify,150);}
            else if(e.key==='Backspace'){entered=entered.slice(0,-1);dots();}
        });
    }

    if(document.readyState==='loading'){
        document.addEventListener('DOMContentLoaded',()=>{ if(!isVerified()) showPinScreen(); });
    } else {
        if(!isVerified()) showPinScreen();
    }
})();
