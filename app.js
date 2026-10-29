(()=>{'use strict';
const byId=id=>document.getElementById(id),tg=window.Telegram?.WebApp,conf=window.ASTRA_PUBLIC_CONFIG||{},api=String(conf.apiBase||'');
const allowedApi=(()=>{try{const u=new URL(api);return u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash&&!u.port&&(u.pathname==='/'||u.pathname==='')}catch{return false}})();
const cols='ABCDEFGHIJKLMNOPQRST',body=byId('sheet-body'),state={status:null,positions:null,signals:null,loading:false,busy:false,checked:null,error:null,select:'A1',sheet:'trades'};
function value(id,v){const t=byId(id);if(t)t.textContent=String(v??'—')}
function money(v,c='USD'){return Number.isFinite(v)?(v>=0?'+':'')+v.toFixed(2)+' '+c:'#N/A'}
function dec(v,n=5){if(!Number.isFinite(v))return '#N/A';return Number(v).toFixed(n).replace(/0+$/,'').replace(/\.$/,'')}
function text(v){return v==null?'':String(v)}
function button(name,action,ticket,enabled,kind){
 const b=document.createElement('button');b.type='button';b.className='cellbutton'+(kind?' '+kind:'');b.textContent=name;b.dataset.action=action;if(ticket)b.dataset.ticket=ticket;b.disabled=!enabled;return b;
}
function row(cells=[],klass=''){
 const tr=document.createElement('tr');tr.className=klass;const num=document.createElement('th');num.className='rownum';num.scope='row';num.textContent=String(body.childElementCount+1);tr.append(num);
 let index=0;for(const item of cells){if(index>=cols.length)break;const obj=item&&typeof item==='object'&&!(item instanceof Node)?item:{v:item};const span=Math.max(1,Math.min(cols.length-index,Number(obj.span)||1));const cell=document.createElement('td');cell.colSpan=span;cell.dataset.col=cols[index];cell.dataset.row=String(body.childElementCount+1);if(obj.cls)cell.className=obj.cls;
 const content=obj.v;if(content instanceof Node)cell.append(content);else cell.textContent=text(content);if(obj.title)cell.title=obj.title;
 cell.addEventListener('click',e=>{if(e.target.closest('button'))return;const prev=body.querySelector('.active-cell');if(prev)prev.classList.remove('active-cell');cell.classList.add('active-cell');state.select=cell.dataset.col+cell.dataset.row;value('selected-address',state.select);value('formula-value',cell.textContent)});
 tr.append(cell);index+=span}
 while(index++<cols.length){const blank=document.createElement('td');tr.append(blank)}
 body.append(tr);return tr;
}
function blank(){row([{v:'',span:11}],'blank-row')}
function section(label){row([{v:label,span:11}],'section-row')}
function isDemo(d){return d&&d.read_only===true&&d.mode==='DEMO'&&d.stale===false}
function goodBroker(p){return p&&p.read_only===true&&p.source==='MT5_DEMO_POSITIONS_GET'&&Array.isArray(p.rows)&&p.rows.length===p.count&&Date.now()-new Date(p.observed_utc).getTime()<15000}
function signalChart(items){
 const list=items.filter(p=>['BUY','SELL','NONE'].includes(p.side));const counts=['BUY','SELL','NONE'].map(x=>list.filter(p=>p.side===x).length),total=Math.max(1,list.length);
 const w=600,h=98,svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.setAttribute('role','img');svg.setAttribute('aria-label','Oxirgi skan holatlari: BUY '+counts[0]+', SELL '+counts[1]+', signalsiz '+counts[2]);
 const add=(tag,attrs,s)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,String(v)));if(s!==undefined)n.textContent=s;svg.append(n)};
 ['BUY','SELL','SIGNAL YO‘Q'].forEach((label,i)=>{const y=i*30+12;const fill=['#7a8882','#9aa39f','#c3c9c6'][i];add('text',{x:5,y:y+12,fill:'#454f4c','font-size':12},label);add('rect',{x:108,y:y,width:356,height:18,fill:'#eff2ef'});if(counts[i])add('rect',{x:108,y:y,width:356*counts[i]/total,height:18,fill});add('text',{x:482,y:y+13,fill:'#333','font-size':12},String(counts[i]))});
 return svg
}
function visual(side){const wrap=document.createElement('div');wrap.className='sparkwrap';const label=document.createElement('small');label.textContent=side==='BUY'?'BUY':side==='SELL'?'SELL':'—';const spark=document.createElement('div');spark.className='spark';const color=document.createElement('span');color.className='spark-fill none';color.style.width=side==='NONE'?'12%':'76%';spark.append(color);spark.style.flex='1';wrap.append(spark,label);return wrap}

function renderTrades(status,positions,safe,snapshot,items,currency,canAction){
 const count=snapshot?String(positions.count):'#N/A',sum=snapshot?money(positions.floating_profit,currency):'#N/A';
 const win=snapshot?String(positions.winner_count):'#N/A',lose=snapshot?String(positions.loser_count):'#N/A';
 row([{v:'OCHIQ BITIMLAR / POZITSIYALAR',span:11,cls:'sheet-title'}]);
 row(['Ochiq bitimlar',count,'Suzuvchi P/L',sum,'Foydada',win,'Zararda',lose,'Valyuta',currency,'']);
 row(['Oxirgi yangilanish',state.checked||'—','Hisob','DEMO','Manba','MT5','', '', '', '', '']);
 blank();
 row(['Ticket','Instrument','Yo‘nalish','Lot','Kirish','Joriy','SL','TP','Foyda / zarar','Swap','Yopish'],'header-row');
 if(snapshot&&items.length){
  for(const p of items){
   const x=Number(p.profit);
   row([{v:p.ticket,cls:'numeric'}, {v:p.symbol},{v:p.side},
    {v:dec(p.volume,3),cls:'numeric'},{v:dec(p.entry,6),cls:'numeric'},{v:dec(p.current,6),cls:'numeric'},
    {v:p.sl?dec(p.sl,6):'—',cls:'numeric'},{v:p.tp?dec(p.tp,6):'—',cls:'numeric'},
    {v:money(x,currency),cls:'numeric '+(x>=0?'profit':'loss')},
    {v:money(p.swap,currency),cls:'numeric'},
    {v:button('Yopish','one',String(p.ticket),canAction)}],'sheet-data-row')
  }
 }else row([{v:snapshot?'Ochiq bitimlar yo‘q':'#N/A — MT5 pozitsiyalar tasdiqlanmadi',span:11,cls:'note-cell'}],'alert-row');
 row([{v:'JAMI',span:8},{v:sum,cls:'numeric'},
  {v:snapshot?money(positions.floating_swap,currency):'#N/A',cls:'numeric'},{v:''}],'totals-row');
 blank();
 row([{v:button('Foydadagilarni yopish','profit','',canAction&&items.some(p=>p.profit>0)),span:3},
 {v:button('Zarardagilarni yopish','loss','',canAction&&items.some(p=>p.profit<0)),span:3},
 {v:button('Hammasini yopish','all','',canAction&&items.length>0),span:3},{v:'',span:2}]);
 row([{v:'Yopish so‘rovi Telegramga yuboriladi; botning yakuniy tasdig‘i hali talab qilinadi.',span:11,cls:'note-cell'}]);
 blank();row([{v:'DEMO · broker P/L joriy narx bilan o‘zgaradi · faqat shaxsiy Telegram sessiyasi',span:11,cls:'note-cell'}]);
}
function renderSignals(signals){
 const signalOK=signals&&signals.read_only===true&&signals.chart_kind==='REAL_LAST_SCAN_BY_INSTRUMENT'&&Array.isArray(signals.rows);
 row([{v:'SIGNALLAR / OXIRGI HAQIQIY SKAN',span:11,cls:'sheet-title'}]);
 row(['Ma’lumot manbai','Bot skaneri','Yangilangan',signalOK?signals.observed_utc||'—':'#N/A',{v:'',span:7}]);
 blank();row(['Instrument','TF','BUY / SELL','Skan sababi','UTC vaqti','Grafik holat',{v:'',span:5}],'header-row');
 if(signalOK&&signals.rows.length){
  for(const p of signals.rows.slice(0,80)){
   const side=p.side==='BUY'?'BUY':p.side==='SELL'?'SELL':'NONE';
   row([{v:p.symbol},{v:p.timeframe},{v:side==='NONE'?'—':side},
    {v:p.reason,title:p.reason},{v:p.observed_utc||'—'},{v:visual(side),span:6}],'sheet-data-row');
  }
 }else row([{v:signalOK?'Skan ma’lumotlari yo‘q':'#N/A — skan holati tasdiqlanmadi',span:11,cls:'note-cell'}]);
 blank();row([{v:'SIGNAL HOLATI TAQSIMOTI',span:11}],'header-row');
 if(signalOK)row([{v:signalChart(signals.rows),span:11,cls:'chart-cell'}]);
 else row([{v:'#N/A',span:11,cls:'note-cell'}]);
 row([{v:'Grafik botning real skan holatlarini ko‘rsatadi. Shamlar yoki taxminiy narxlar qo‘shilmagan.',span:11,cls:'note-cell'}]);
}
function renderStatus(status,safe){
 row([{v:'BOT HOLATI / STRATEGIYALAR',span:11,cls:'sheet-title'}]);
 row(['Hisob','DEMO','Yangilangan',state.checked||'—','Ma’lumot manbai','Bot statusi',{v:'',span:5}]);
 blank();
 const par=status?.parallel||{},settings=[
  ['Bot salomatligi',status?.health??'#N/A','Yangi kirish',safe&&status.global_entry_allowed===true?'RUXSAT':'BLOK','PAUSED',Array.isArray(status?.blocks)&&status.blocks.includes('PAUSED')?'HA':'YO‘Q'],
  ['H1 + M30',status?.h1_mode==='DEMO_TRADING'?'ON':'OFF','Klassik M15',par.legacy_m15?'ON':'OFF','Klassik M30',par.legacy_m30?'ON':'OFF'],
  ['Crypto M5',par.crypto_m5?'ON':'OFF','GOLD M5',par.gold_m5?'ON':'OFF','Broker vaqti',status?.clock_ready?'TAYYOR':'TEKSHIRUV']
 ];
 row(['Ko‘rsatkich','Qiymat',{v:'',span:1},'Ko‘rsatkich','Qiymat',{v:'',span:1},'Ko‘rsatkich','Qiymat',{v:'',span:3}],'header-row');
 for(const x of settings){
  row([x[0],{v:x[1],span:2},x[2],{v:x[3],span:2},x[4],{v:x[5],span:2},{v:'',span:2}]);
 }
 row(['Holat yoshi',Number.isFinite(status?.status_age_seconds)?status.status_age_seconds+' s':'#N/A','Hisob tekshiruvi',safe?'OK':'#N/A',
  'Pozitsiyalar',Number.isInteger(status?.positions)?status.positions:'#N/A',{v:'',span:5}]);
 blank();section('RISK / BLOKLAR');
 row([{v:'Faol bloklar',span:2},
  {v:Array.isArray(status?.blocks)?status.blocks.join(' · ')||'Blok yo‘q':'#N/A',span:9}]);
 blank();row([{v:'ON faqat strategiya konfiguratsiyasini bildiradi, buyruq yoki bitim ochish ruxsati emas.',span:11,cls:'note-cell'}]);
}
function render(){
 body.replaceChildren();
 const status=state.status,positions=state.positions,safe=isDemo(status);
 const snapshot=goodBroker(positions),items=snapshot?positions.rows:[],currency=positions?.currency||'USD';
 const canAction=!!(safe&&snapshot&&!state.busy);
 if(state.sheet==='signals')renderSignals(state.signals);
 else if(state.sheet==='status')renderStatus(status,safe);
 else renderTrades(status,positions,safe,snapshot,items,currency,canAction);
 // Extend the visible grid into blank worksheet rows, as in a regular spreadsheet.
 while(body.childElementCount<34)row([],'blank-row');
 value('live',safe&&(state.sheet!=='trades'||snapshot)?'Tayyor':state.error?'Xatolik':'Tekshirilmoqda');
 value('updated',state.checked||'—');
 if(state.error)value('notice',state.error);
}
function switchSheet(sheet){
 if(!['trades','signals','status'].includes(sheet)||sheet===state.sheet)return;
 state.sheet=sheet;state.select='A1';value('selected-address','A1');value('formula-value','');
 document.querySelectorAll('button[data-sheet]').forEach(b=>{
  const active=b.dataset.sheet===sheet;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;
 });
 document.querySelector('.sheet-scroller').scrollTop=0;
 document.querySelector('.sheet-scroller').scrollLeft=0;
 render();
}
function choose(path){const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),8000);return fetch(new URL(path,api).href,{method:'GET',headers:{'X-Telegram-Init-Data':tg.initData},credentials:'omit',redirect:'error',cache:'no-store',signal:abort.signal}).then(async r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).finally(()=>clearTimeout(timer))}
async function refresh(){
 if(state.loading||state.busy)return;state.loading=true;
 try{
  const result=await Promise.allSettled([choose('api/status'),choose('api/positions'),choose('api/signals')]);
  state.status=result[0].status==='fulfilled'?result[0].value:null;
  state.positions=result[1].status==='fulfilled'?result[1].value:null;
  state.signals=result[2].status==='fulfilled'?result[2].value:null;
  state.checked=new Date().toLocaleTimeString('uz-UZ');
  state.error=(!state.status?'Telegram sessiyasi yoki bot statusi tasdiqlanmadi. ':(!goodBroker(state.positions)?'MT5 pozitsiyalari tasdiqlanmadi. ':''))||null;
  if(!state.error)value('notice','Jadval broker ma’lumotlaridan yangilandi. Yopish so‘rovlari Telegram botda tasdiqlanadi.');
 }catch{state.error='Ulanish tekshirilmadi';state.status=null;state.positions=null;state.signals=null}
 finally{state.loading=false;render()}
}
async function requestClose(action,ticket){
 if(state.busy||!isDemo(state.status)||!goodBroker(state.positions))return;
 if(action==='one'&&!state.positions.rows.some(p=>String(p.ticket)===String(ticket)))return;
 state.busy=true;render();const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),12000);
 try{
  // One tap in the worksheet, no extra browser modal. Server still uses the
  // existing broker-owner Telegram two-step close confirmation; do NOT claim execution.
  const res=await fetch(new URL('api/close-request',api).href,{method:'POST',headers:{'Content-Type':'application/json','X-Telegram-Init-Data':tg.initData},credentials:'omit',redirect:'error',cache:'no-store',signal:abort.signal,body:JSON.stringify({action,ticket:ticket||''})});
  if(res.status===429)throw Error('10 soniya kuting');
  if(!res.ok)throw Error('Yopish so‘rovi rad etildi ('+res.status+')');
  const out=await res.json();
  if(out.trade_executed!==false||out.queued_for_owner!==true)throw Error('Broker yopilganini tasdiqlamagan');
  state.error='So‘rov Telegram botga yuborildi. Bitim HOZIRCHA yopilmadi: Telegramdagi yakuniy tasdiq zarur.';
 }catch(e){state.error='Yopish bajarilmadi: '+String(e.message||'aloqa xatosi')}
 finally{clearTimeout(timer);state.busy=false;render();setTimeout(refresh,700)}
}
body.addEventListener('click',event=>{const b=event.target.closest('button[data-action]');if(b&&!b.disabled)requestClose(b.dataset.action,b.dataset.ticket||'')});
// Zoom is presentation-only and never changes broker values or trade requests.
const workbook=document.querySelector('.workbook');
const worksheet=byId('worksheet'),scroller=byId('sheet-scroller');
const zoomControl={level:100,fit:false};
function setZoom(raw,{keepFit=false}={}){
 const num=Number(raw);const level=Number.isFinite(num)?Math.min(125,Math.max(55,Math.round(num/5)*5)):100;
 zoomControl.level=level;
 worksheet.style.zoom=level+'%';
 byId('zoom-slider').value=String(level);
 byId('zoom-slider').setAttribute('aria-valuetext',level+' foiz');
 value('zoom-label',level+'%');
 if(!keepFit){zoomControl.fit=false;workbook.classList.remove('compact-mode');byId('fit-toggle').setAttribute('aria-pressed','false')}
}
function fitWorksheet(){
 // Fit only populated A–K columns, not the empty right-hand spreadsheet canvas.
 const headings=worksheet.querySelectorAll('thead th');
 const left=headings[0],right=headings[11];
 if(!left||!right)return;
 const ratio=zoomControl.level/100;
 const measured=(right.getBoundingClientRect().right-left.getBoundingClientRect().left)/ratio;
 const viewport=Math.max(180,scroller.clientWidth-8);
 const fitted=measured>0?Math.floor(viewport/measured*100/5)*5:100;
 zoomControl.fit=true;
 workbook.classList.add('compact-mode');
 byId('fit-toggle').setAttribute('aria-pressed','true');
 setZoom(Math.max(55,Math.min(100,fitted)),{keepFit:true});
 scroller.scrollLeft=0;
}
byId('fit-toggle').addEventListener('click',()=>{
 if(zoomControl.fit){setZoom(100);return}
 fitWorksheet()
});
byId('zoom-out').addEventListener('click',()=>setZoom(zoomControl.level-5));
byId('zoom-in').addEventListener('click',()=>setZoom(zoomControl.level+5));
byId('zoom-label').addEventListener('click',()=>setZoom(100));
byId('zoom-slider').addEventListener('input',e=>setZoom(Number(e.target.value)));
window.addEventListener('resize',()=>{if(zoomControl.fit)fitWorksheet()});

document.querySelectorAll('button[data-sheet]').forEach(b=>{b.tabIndex=b.dataset.sheet==='trades'?0:-1;b.addEventListener('click',()=>switchSheet(b.dataset.sheet));b.addEventListener('keydown',e=>{if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;const tabs=[...document.querySelectorAll('button[data-sheet]')];const next=tabs[(tabs.indexOf(b)+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length];switchSheet(next.dataset.sheet);next.focus();e.preventDefault()})});
if(tg){tg.ready();tg.expand()}
if(!allowedApi){state.error='HTTPS API manzili noto‘g‘ri';render();return}
if(!tg?.initData){state.error='Hisobotni Telegramdagi shaxsiy tugmadan oching. Brauzerda broker ma’lumotlari yashiriladi.';render();return}
render();refresh();setInterval(()=>{if(document.visibilityState==='visible')refresh()},4000);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh()});
})();