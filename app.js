(()=>{'use strict';
const byId=id=>document.getElementById(id),tg=window.Telegram?.WebApp,conf=window.ASTRA_PUBLIC_CONFIG||{},api=String(conf.apiBase||'');
const allowedApi=(()=>{try{const u=new URL(api);return u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash&&!u.port&&(u.pathname==='/'||u.pathname==='')}catch{return false}})();
const cols='ABCDEFGHIJK',body=byId('sheet-body'),state={status:null,positions:null,signals:null,loading:false,busy:false,checked:null,error:null,select:'A1'};
function value(id,v){const t=byId(id);if(t)t.textContent=String(v??'—')}
function money(v,c='USD'){return Number.isFinite(v)?(v>=0?'+':'')+v.toFixed(2)+' '+c:'#N/A'}
function dec(v,n=5){if(!Number.isFinite(v))return '#N/A';return Number(v).toFixed(n).replace(/0+$/,'').replace(/\.$/,'')}
function text(v){return v==null?'':String(v)}
function button(name,action,ticket,enabled,kind){
 const b=document.createElement('button');b.type='button';b.className='cellbutton'+(kind?' '+kind:'');b.textContent=name;b.dataset.action=action;if(ticket)b.dataset.ticket=ticket;b.disabled=!enabled;return b;
}
function row(cells=[],klass=''){
 const tr=document.createElement('tr');tr.className=klass;const num=document.createElement('th');num.className='rownum';num.scope='row';num.textContent=String(body.childElementCount+1);tr.append(num);
 let index=0;for(const item of cells){if(index>=11)break;const obj=item&&typeof item==='object'&&!(item instanceof Node)?item:{v:item};const span=Math.max(1,Math.min(11-index,Number(obj.span)||1));const cell=document.createElement('td');cell.colSpan=span;cell.dataset.col=cols[index];cell.dataset.row=String(body.childElementCount+1);if(obj.cls)cell.className=obj.cls;
 const content=obj.v;if(content instanceof Node)cell.append(content);else cell.textContent=text(content);if(obj.title)cell.title=obj.title;
 cell.addEventListener('click',e=>{if(e.target.closest('button'))return;const prev=body.querySelector('.active-cell');if(prev)prev.classList.remove('active-cell');cell.classList.add('active-cell');state.select=cell.dataset.col+cell.dataset.row;value('selected-address',state.select);value('formula-value',cell.textContent)});
 tr.append(cell);index+=span}
 while(index++<11){const blank=document.createElement('td');tr.append(blank)}
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
 ['BUY','SELL','SIGNAL YO‘Q'].forEach((label,i)=>{const y=i*30+12;const fill=['#228653','#c5535b','#a4b2aa'][i];add('text',{x:5,y:y+12,fill:'#454f4c','font-size':12},label);add('rect',{x:108,y:y,width:356,height:18,fill:'#eff2ef'});if(counts[i])add('rect',{x:108,y:y,width:356*counts[i]/total,height:18,fill});add('text',{x:482,y:y+13,fill:'#333','font-size':12},String(counts[i]))});
 return svg
}
function visual(side){const wrap=document.createElement('div');wrap.className='sparkwrap';const label=document.createElement('small');label.textContent=side==='BUY'?'BUY':side==='SELL'?'SELL':'—';const spark=document.createElement('div');spark.className='spark';const color=document.createElement('span');color.className='spark-fill '+(side==='BUY'?'buy':side==='SELL'?'sell':'none');color.style.width=side==='NONE'?'12%':'76%';spark.append(color);spark.style.flex='1';wrap.append(spark,label);return wrap}
function render(){
 body.replaceChildren();
 const status=state.status,positions=state.positions,signals=state.signals;
 const safe=isDemo(status),snapshot=goodBroker(positions),items=snapshot?positions.rows:[],currency=positions?.currency||'USD';
 const count=snapshot?String(positions.count):'#N/A',sum=snapshot?money(positions.floating_profit,currency):'#N/A';
 const win=snapshot?String(positions.winner_count):'#N/A',lose=snapshot?String(positions.loser_count):'#N/A';
 const signalOK=signals&&signals.read_only===true&&signals.chart_kind==='REAL_LAST_SCAN_BY_INSTRUMENT'&&Array.isArray(signals.rows);
 const canAction=!!(safe&&snapshot&&!state.busy);
 row([{v:'DEMO / BROKER POZITSIYALARI',span:5,cls:'sheet-title'},{v:'Hisobot rejimi',span:2},{v:'Faqat DEMO',span:2},{v:'Holat',span:1},{v:safe?'ON':'#N/A'}]);
 row(['Ochiq bitimlar',count,'Suzuvchi P/L',sum,'Foydada',win,'Zararda',lose,'Valyuta',currency,'']);
 row(['Oxirgi yangilanish',state.checked||'—','Bot holati',status?(status.blocks||[]).includes('PAUSED')?'PAUSED':status.health||'#N/A':'#N/A','Vaqt tayyor',status?.clock_ready===true?'HA':'YO‘Q','Holat yoshi',Number.isFinite(status?.status_age_seconds)?status.status_age_seconds+'s':'#N/A','Manba','MT5 DEMO','']);
 blank();
 section('OCHIQ BITIMLAR / POZITSIYALAR');
 row(['Ticket','Instrument','Yo‘nalish','Lot','Kirish','Joriy','SL','TP','Foyda / zarar','Swap','Yopish'],'header-row');
 if(snapshot&&items.length){
  for(const p of items){const x=Number(p.profit);row([
   {v:p.ticket,cls:'numeric'},{v:p.symbol},{v:p.side,cls:p.side==='BUY'?'signal-positive':'signal-negative'},
   {v:dec(p.volume,3),cls:'numeric'},{v:dec(p.entry,6),cls:'numeric'},{v:dec(p.current,6),cls:'numeric'},
   {v:p.sl?dec(p.sl,6):'—',cls:'numeric'},{v:p.tp?dec(p.tp,6):'—',cls:'numeric'},
   {v:money(x,currency),cls:'numeric '+(x>=0?'profit':'loss')},{v:money(p.swap,currency),cls:'numeric'},
   {v:button('Yopish','one',String(p.ticket),canAction)}],'sheet-data-row');
  }
 }else row([{v:snapshot?'Ochiq bitimlar yo‘q':'#N/A — MT5 pozitsiyalar tasdiqlanmadi',span:11,cls:snapshot?'note-cell':'loss'}],'alert-row');
 row([{v:'JAMI',span:8},{v:sum,cls:'numeric '+(snapshot?(positions.floating_profit>=0?'profit':'loss'):'')},
  {v:snapshot?money(positions.floating_swap,currency):'#N/A',cls:'numeric'},{v:''}],'totals-row');
 row([{v:button('Foydadagilarni yopish','profit','',canAction&&items.some(p=>p.profit>0)),span:3},
 {v:button('Zarardagilarni yopish','loss','',canAction&&items.some(p=>p.profit<0),'danger'),span:3},
 {v:button('Hammasini yopish','all','',canAction&&items.length>0,'danger'),span:3},{v:'',span:2}]);
 row([{v:'Yopish: Mini App bitta so‘rov yuboradi; amaldagi serverda Telegram botning yakuniy tasdig‘i hali talab qilinadi.',span:11,cls:'note-cell'}]);
 blank();
 section('SIGNALLAR / HAQIQIY OXIRGI SKAN');
 row(['Instrument','TF','BUY / SELL','Skan sababi','UTC vaqti','Grafik holat', {v:'',span:5}],'header-row');
 if(signalOK&&signals.rows.length){
  for(const p of signals.rows.slice(0,80)){const side=p.side==='BUY'?'BUY':p.side==='SELL'?'SELL':'NONE';row([
   {v:p.symbol},{v:p.timeframe},{v:side==='NONE'?'—':side,cls:side==='BUY'?'signal-positive':side==='SELL'?'signal-negative':'signal-muted'},
   {v:p.reason,title:p.reason},{v:p.observed_utc||'—'},
   {v:visual(side),span:6}
  ],'sheet-data-row')}
 }else row([{v:signalOK?'Skan ma’lumotlari yo‘q':'#N/A — skan holati tasdiqlanmadi',span:11,cls:'note-cell'}]);
 if(signalOK){row([{v:'SIGNAL HOLATI TAQSIMOTI',span:11}],'header-row');row([{v:signalChart(signals.rows),span:11,cls:'chart-cell'}])}
 row([{v:'Bu real oxirgi skan natijalarining grafigi. OHLC shamlar yoki narxlar to‘qib chiqarilmaydi.',span:11,cls:'note-cell'}]);
 blank();
 section('BOT HOLATI / STRATEGIYALAR');
 const par=status?.parallel||{},settings=[
  ['Bot salomatligi',status?.health??'#N/A','Yangi kirish',safe&&status.global_entry_allowed===true?'RUXSAT':'BLOK','PAUSED',Array.isArray(status?.blocks)&&status.blocks.includes('PAUSED')?'HA':'YO‘Q'],
  ['H1 + M30',status?.h1_mode==='DEMO_TRADING'?'ON':'OFF','Klassik M15',par.legacy_m15?'ON':'OFF','Klassik M30',par.legacy_m30?'ON':'OFF'],
  ['Crypto M5',par.crypto_m5?'ON':'OFF','GOLD M5',par.gold_m5?'ON':'OFF','Broker vaqti',status?.clock_ready?'TAYYOR':'TEKSHIRUV']];
 for(const x of settings){row([x[0],{v:x[1],span:2},x[2],{v:x[3],span:2},x[4],{v:x[5],span:2},{v:'',span:2}])}
 row([{v:'Risk / bloklar',span:2},{v:Array.isArray(status?.blocks)?status.blocks.join(' · ')||'Blok yo‘q':'#N/A',span:9}]);
 blank();row([{v:'DEMO · Telegram egasiga ko‘rinadi · joriy P/L narx bilan o‘zgaradi · buyurtma holati brokerda tekshiriladi',span:11,cls:'note-cell'}]);
 value('live',safe&&snapshot?'Tayyor':state.error?'Xatolik':'Tekshirilmoqda');
 value('updated',state.checked||'—');
 // Do not pretend stale or missing account data is an empty position book.
 if(state.error)value('notice',state.error);
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
if(tg){tg.ready();tg.expand()}
if(!allowedApi){state.error='HTTPS API manzili noto‘g‘ri';render();return}
if(!tg?.initData){state.error='Hisobotni Telegramdagi shaxsiy tugmadan oching. Brauzerda broker ma’lumotlari yashiriladi.';render();return}
render();refresh();setInterval(()=>{if(document.visibilityState==='visible')refresh()},4000);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh()});
})();