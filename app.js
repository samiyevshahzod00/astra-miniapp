(()=>{'use strict';
const el=id=>document.getElementById(id),tg=window.Telegram?.WebApp,conf=window.ASTRA_PUBLIC_CONFIG||{},api=String(conf.apiBase||'');
const trusted=(()=>{try{const u=new URL(api);return u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash&&(u.pathname==='/'||u.pathname==='')&&!u.port}catch{return false}})();
let lastPositions=null,fetching=false,tab='trades';
const svgNS='http://www.w3.org/2000/svg';
function set(id,val,klass){const e=el(id);if(!e)return;e.textContent=val==null?'—':String(val);e.classList.remove('good','bad','warn');if(klass)e.classList.add(klass)}
function money(v,currency='USD'){return Number.isFinite(v)?(v>=0?'+':'')+v.toFixed(2)+' '+currency:'—'}
function decimal(n,nDigits=4){return Number.isFinite(n)?Number(n).toFixed(nDigits).replace(/0+$/,'').replace(/\.$/,''):'—'}
function tag(text,kind){const node=document.createElement('span');node.className='tag '+(kind||'');node.textContent=text;return node}
function cell(tr,value,klass){const td=document.createElement('td');if(value instanceof Node)td.append(value);else td.textContent=value==null?'—':String(value);if(klass)td.className=klass;tr.append(td);return td}
function empty(id,span,label){const t=el(id);t.replaceChildren();const row=document.createElement('tr');const c=cell(row,label,'empty');c.colSpan=span;t.append(row)}
function textError(msg){set('live','Tekshiruv kerak','warn');el('notice').textContent=msg}
async function get(path){const c=new AbortController(),tm=setTimeout(()=>c.abort(),6500);try{const res=await fetch(new URL(path,api).href,{method:'GET',headers:{'X-Telegram-Init-Data':tg.initData},credentials:'omit',redirect:'error',cache:'no-store',signal:c.signal});if(!res.ok)throw Error('HTTP '+res.status);return await res.json()}finally{clearTimeout(tm)}}
function renderPositions(data){
  if(data?.source!=='MT5_DEMO_POSITIONS_GET'||data.read_only!==true||!Array.isArray(data.rows))throw Error('POSITIONS_SOURCE_UNVERIFIED');
  const a=data.rows,ccy=data.currency||'USD';lastPositions={rows:a,observed_utc:data.observed_utc};
  set('count',String(a.length));set('floating',money(data.floating_profit,ccy),data.floating_profit>=0?'good':'bad');
  set('wins',String(data.winner_count));set('losses',String(data.loser_count));set('total-pnl',money(data.floating_profit,ccy),data.floating_profit>=0?'good':'bad');
  set('total-swap',money(data.floating_swap,ccy));
  set('trades-source','MT5 DEMO · '+new Date(data.observed_utc).toLocaleTimeString('uz-UZ'));
  el('close-profit').disabled=!a.some(p=>Number(p.profit)>0);
  el('close-loss').disabled=!a.some(p=>Number(p.profit)<0);
  el('close-all').disabled=a.length===0;
  const dest=el('trade-rows');dest.replaceChildren();
  if(!a.length){empty('trade-rows',11,'Ochiq pozitsiya yo‘q');return}
  for(const p of a){
    const tr=document.createElement('tr');
    cell(tr,p.ticket,'ticket');cell(tr,p.symbol);
    cell(tr,tag(p.side,p.side==='BUY'?'buy':'sell'));
    cell(tr,decimal(p.volume,3),'num');cell(tr,decimal(p.entry,6),'num');cell(tr,decimal(p.current,6),'num');
    cell(tr,p.sl?decimal(p.sl,6):'—','num');cell(tr,p.tp?decimal(p.tp,6):'—','num');
    cell(tr,money(p.profit,ccy),'num '+(p.profit>=0?'good':'bad'));
    cell(tr,money(p.swap,ccy),'num');
    const button=document.createElement('button');button.type='button';button.className='rowclose';button.textContent='Yopish';button.dataset.action='one';button.dataset.ticket=p.ticket;
    cell(tr,button);dest.append(tr);
  }
}
function signalSvg(rows){
  const box=el('signal-chart');box.replaceChildren();if(!rows.length){box.textContent='Haqiqiy signal skanlari hali mavjud emas';return}
  const view=rows.slice(0,32),height=view.length*30+36;
  const svg=document.createElementNS(svgNS,'svg');svg.setAttribute('viewBox','0 0 540 '+height);svg.setAttribute('aria-label','Instrumentlar bo‘yicha BUY, SELL va oxirgi skan holatlari');
  const add=(name,attrs,text)=>{const n=document.createElementNS(svgNS,name);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,String(v)));if(text!==undefined)n.textContent=text;svg.append(n);return n};
  add('text',{x:150,y:17,fill:'#9fb7d1','font-size':11},'BUY');
  add('text',{x:300,y:17,fill:'#9fb7d1','font-size':11},'SELL');
  add('text',{x:435,y:17,fill:'#9fb7d1','font-size':11},'BLOK / YO‘Q');
  view.forEach((p,i)=>{const y=28+i*30;add('text',{x:4,y:y+16,fill:'#dbe8f5','font-size':12},String(p.symbol).slice(0,21));
    for(const [name,x,color] of [['BUY',145,'#66d89b'],['SELL',290,'#f69ba1'],['NONE',425,'#7e97af']]){
      add('rect',{x,y,width:96,height:23,rx:4,fill:p.side===name?color:'#203953',opacity:p.side===name?1:.36});
      add('text',{x:x+48,y:y+15,'font-size':11,'text-anchor':'middle',fill:p.side===name?'#061824':'#9db3c8','font-weight':p.side===name?'bold':'normal'},p.side===name?'● '+(name==='NONE'?'—':name):'·');
    }
  });box.append(svg);
}
function renderSignals(data){
  if(!data||data.read_only!==true||data.chart_kind!=='REAL_LAST_SCAN_BY_INSTRUMENT'||!Array.isArray(data.rows))throw Error('SIGNAL_SOURCE_UNVERIFIED');
  const rows=data.rows;
  set('signal-updated',new Date(data.observed_utc).toLocaleTimeString('uz-UZ')+' UTC skan holati');
  signalSvg(rows);const body=el('signal-rows');body.replaceChildren();
  if(!rows.length){empty('signal-rows',5,'Yangi skan ma’lumotlari topilmadi');return}
  rows.forEach(p=>{const tr=document.createElement('tr');cell(tr,p.symbol);cell(tr,p.timeframe);
    cell(tr,tag(p.side==='NONE'?'Signal yo‘q':p.side,p.side==='BUY'?'buy':p.side==='SELL'?'sell':''));
    cell(tr,p.reason);cell(tr,p.observed_utc||'—');body.append(tr)});
}
function renderStatus(d){
  if(d?.read_only!==true)throw Error('STATUS_UNVERIFIED');
  const stale=d.stale!==false||d.health!=='PASS';
  set('live',stale?'Eskirgan':'Jonli',stale?'warn':'good');
  set('health',stale?'Tekshiruv kerak':'PASS',stale?'warn':'good');
  set('entry',!stale&&d.global_entry_allowed===true?'RUXSAT BOR':'BLOKLANGAN',!stale&&d.global_entry_allowed===true?'good':'warn');
  set('clock',!stale&&d.clock_ready===true?'TAYYOR':'TEKSHIRUV',!stale&&d.clock_ready===true?'good':'warn');
  set('freshness',Number.isFinite(d.status_age_seconds)?d.status_age_seconds+' s':'—');
  const strategy=(name,on)=>set(name,on===true?'ON':'OFF',on===true?'good':'warn');
  strategy('h1',d.h1_mode==='DEMO_TRADING');const f=d.parallel||{};
  [['m15','legacy_m15'],['m30','legacy_m30'],['crypto','crypto_m5'],['gold','gold_m5']].forEach(([id,k])=>strategy(id,f[k]));
  const reasons=Array.isArray(d.blocks)?d.blocks.filter(x=>typeof x==='string').slice(0,12):[];
  set('blocks',reasons.length?reasons.join(' · '):stale?'Holat aniqlanmagan':'Blok yo‘q');
  el('notice').textContent=stale?'⚠️ Bot statusi tasdiqlanmagan. Yopish buyrug‘i Telegram orqali alohida tasdiqlanadi.':'✅ Telegram egasi tasdiqlangan. Jadval broker ma’lumotlaridan to‘ldiriladi.';
  set('updated','Yangilandi: '+new Date().toLocaleTimeString('uz-UZ'));
}
async function refresh(){
  if(fetching)return;fetching=true;
  try{
    const d=await get('api/status');renderStatus(d);
    if(tab==='trades'){
      try{renderPositions(await get('api/positions'))}
      catch{lastPositions=null;empty('trade-rows',11,'Broker pozitsiyalari tasdiqlanmadi — 0 deb hisoblanmaydi');['count','floating','total-pnl','total-swap','wins','losses'].forEach(id=>set(id,'—'));['close-profit','close-loss','close-all'].forEach(id=>el(id).disabled=true);set('trades-source','MT5 ma’lumoti mavjud emas')}
    }
    if(tab==='signals'){try{renderSignals(await get('api/signals'))}catch{empty('signal-rows',5,'Signal ma’lumotlari hozir tasdiqlanmagan');el('signal-chart').textContent='Real signal skani mavjud emas'}}
  }catch{lastPositions=null;textError('Telegram sessiyasi yoki HTTPS API ishlamayapti. Bitim yopish amalga oshirilmaydi.');['close-profit','close-loss','close-all'].forEach(id=>el(id).disabled=true)}
  finally{fetching=false}
}
async function requestClose(action,ticket){
  if(!lastPositions||!Array.isArray(lastPositions.rows))return;
  if(Date.now()-new Date(lastPositions.observed_utc).getTime()>15000){el('notice').textContent='Broker ma’lumoti eskirgan, avval yangilang.';await refresh();return}
  if(action==='one'&&!lastPositions.rows.some(p=>p.ticket===ticket))return;
  const label={one:'bitta tanlangan bitim',profit:'foydadagi barcha bitimlar',loss:'zarardagi barcha bitimlar',all:'BARCHA bitimlar'}[action];
  if(!label)return;
  const message=label+' uchun yopish tasdig‘ini Telegram botga yuborasizmi? MT5 narxi tasdiqlash vaqtida o‘zgarishi mumkin.';
  const ask=()=>new Promise(resolve=>{if(typeof tg.showConfirm==='function')tg.showConfirm(message,resolve);else resolve(window.confirm(message))});
  if(!await ask())return;
  const c=new AbortController(),to=setTimeout(()=>c.abort(),9500);
  try{
    const res=await fetch(new URL('api/close-request',api).href,{method:'POST',headers:{'Content-Type':'application/json','X-Telegram-Init-Data':tg.initData},
      body:JSON.stringify({action,ticket:ticket||''}),credentials:'omit',redirect:'error',cache:'no-store',signal:c.signal});
    if(res.status===429)throw Error('Tez-tez yubormang: 10 soniya kuting');
    if(res.status===401||res.status===400)throw Error('Sessiya eskirgan — Telegramdan panelni qayta oching');
    if(!res.ok)throw Error('Yopish tasdig‘i yuborilmadi ('+res.status+')');
    const result=await res.json();if(result?.queued_for_owner!==true||result.trade_executed!==false)throw Error('Server javobi tasdiqlanmadi');
    el('notice').textContent='✅ Telegram botga tasdiqlash xabari yuborildi. Telegram chatida avval «Yopishni tasdiqlashni boshlash», keyin 60 soniyalik tasdiq tugmasini bosing. Hali bitim yopilgani yo‘q.';
    if(typeof tg.HapticFeedback?.notificationOccurred==='function')tg.HapticFeedback.notificationOccurred('success');
  }catch(e){el('notice').textContent='⚠️ '+String(e.message||'Yopish so‘rovi muvaffaqiyatsiz')}finally{clearTimeout(to)}
}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.tab;document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.pane').forEach(x=>x.classList.toggle('hidden',x.id!=='tab-'+tab));refresh()}));
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b&&!b.disabled)requestClose(b.dataset.action,b.dataset.ticket||'')});
if(tg){tg.ready();tg.expand();}
if(!trusted){textError('HTTPS server manzili tekshirilmagan');return}
if(!tg?.initData){textError('Hisobotni Telegramdagi «Hisobot» tugmasidan oching. Oddiy brauzerda broker ma’lumotlari yashiriladi.');return}
refresh();setInterval(()=>{if(document.visibilityState==='visible')refresh()},3000);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh()});
})();