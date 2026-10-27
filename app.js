(()=>{'use strict';
const byId=id=>document.getElementById(id),tg=window.Telegram?.WebApp,notice=byId('notice');
const conf=window.ASTRA_PUBLIC_CONFIG||{},apiBase=typeof conf.apiBase==='string'?conf.apiBase:'';
const validApi=(()=>{try{const u=new URL(apiBase);return u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash&&(u.pathname==='/'||u.pathname==='')&&u.port==='';}catch{return false;}})();
function set(id,v,kind){const el=byId(id);el.textContent=v==null?'—':String(v);el.classList.remove('good','warn','bad');if(kind)el.classList.add(kind);}
function strategy(id,v){set(id,v===true?'ON':v===false?'OFF':'—',v===true?'good':v===false?'warn':null);}
function error(message){notice.textContent=message;set('live','Ulanmagan','bad');set('health','Noma’lum','bad');set('entry','BLOKLANGAN','warn');}
if(tg){tg.ready();tg.expand();}
if(!validApi){error('Backend HTTPS manzili hali sozlanmagan. Hisob ma’lumotlari ko‘rsatilmaydi.');return;}
if(!tg?.initData){error('Panelni Telegramdagi «Hisobot» tugmasidan oching. Oddiy brauzerda hisob ma’lumotlari yashiriladi.');return;}
let inflight=false;
async function refresh(){if(inflight)return;inflight=true;const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),6500);
try{const response=await fetch(new URL('api/status',apiBase).href,{method:'GET',headers:{'X-Telegram-Init-Data':tg.initData},cache:'no-store',credentials:'omit',redirect:'error',signal:controller.signal});
if(response.status===401){error('Telegram sessiyasi tugagan yoki ruxsat yo‘q. Panelni Telegramdan qayta oching.');return;}
if(!response.ok)throw Error('Backend '+response.status);const d=await response.json();if(d?.read_only!==true)throw Error('API read-only tekshiruvi o‘tmadi');
const stale=d.stale!==false||d.health!=='PASS';set('health',stale?'TEKSHIRUV KERAK':'PASS',stale?'warn':'good');set('live',stale?'ESKIRGAN':'JONLI',stale?'warn':'good');
notice.textContent=stale?'⚠️ Bot ma’lumotlari eskirgan yoki to‘liq tekshirilmagan.':'✅ Telegram foydalanuvchisi tasdiqlangan. Bot holati yangilangan.';
set('freshness',typeof d.status_age_seconds==='number'&&d.status_age_seconds>=0?`${d.status_age_seconds} soniya avval`:'Vaqti noma’lum');
const allowed=!stale&&d.global_entry_allowed===true;set('entry',allowed?'RUXSAT BOR':'BLOKLANGAN',allowed?'good':'warn');
set('entry-hint',allowed?'Barcha tekshiruvlardan o‘tgan':'Risk, pauza yoki tekshiruv to‘sig‘i');set('positions',Number.isInteger(d.positions)&&d.positions>=0?d.positions:'—');
set('clock',!stale&&d.clock_ready===true?'TAYYOR':'TEKSHIRUV',!stale&&d.clock_ready===true?'good':'warn');
set('capacity',`Quvvat/limit: ${d.capacity_ready===true?'tayyor':'bloklangan yoki noma’lum'}`);
strategy('h1',d.h1_mode==='DEMO_TRADING');const f=d.parallel||{};strategy('m15',f.legacy_m15===true);strategy('m30',f.legacy_m30===true);strategy('crypto',f.crypto_m5===true);strategy('gold',f.gold_m5===true);
const blocks=Array.isArray(d.blocks)?d.blocks.filter(x=>typeof x==='string'&&x.length<100):[];set('blocks',blocks.length?blocks.join(' · '):(stale?'Holat tasdiqlanmagan':'Blok yo‘q'));set('updated',`Yangilandi: ${new Date().toLocaleTimeString('uz-UZ')}`);
}catch{error('Backend bilan himoyalangan aloqa yo‘q. Savdoga ruxsat holati tasdiqlanmagan.');}finally{clearTimeout(timeout);inflight=false;}}
refresh();setInterval(()=>{if(document.visibilityState!=='hidden')refresh();},3000);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh();});
})();