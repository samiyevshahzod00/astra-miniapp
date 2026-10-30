'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('style.css','utf8');
assert.match(html,/id="close-feedback".*role="alert"/);
assert.match(css,/\.close-feedback\[hidden\]\{display:none\}/);
assert.match(src,/canAction=!!\(safe&&snapshot&&closeSessionReady\(\)/);
assert.match(src,/async function requestClose\(action,ticket\)\{\s*if\(!closeSessionReady\(\)\)/);
assert.match(src,/state\.closePendingNonce/);
assert.match(src,/payload\.trade_executed!==false/);
assert.match(src,/broker_confirmed_full_close===true/);
assert.ok(!src.includes('innerHTML'),'no unsafe HTML injection');
const begin=src.indexOf('function closeSessionAgeSeconds(){');
const end=src.indexOf('function value(',begin);
const actionBegin=src.indexOf('async function requestClose(action,ticket){');
const actionEnd=src.indexOf("body.addEventListener('click'",actionBegin);
assert.ok(begin>0&&end>begin&&actionBegin>end&&actionEnd>actionBegin);
const moduleText=src.slice(begin,end)+'\n'+src.slice(actionBegin,actionEnd)+
 '\nthis.testReady=closeSessionReady;this.testClose=requestClose;';
async function scenario(age,mode='accepted'){
 const authDate=Math.floor(Date.now()/1000)-age;
 let fetchCalls=[],watches=[],stored=[],renderCount=0;
 const state={
  status:{read_only:true,mode:'DEMO',stale:false},
  positions:{read_only:true,source:'MT5_DEMO_POSITIONS_GET',
    observed_utc:new Date().toISOString(),rows:[{ticket:'123',profit:-1}],count:1},
  busy:false,closePendingNonce:null,actionNotice:null,actionNoticeUntil:0
 };
 const tg={initData:'auth_date='+authDate+'&user=%7B%22id%22%3A1%7D&hash=dummy'};
 const sandbox={
  tg,state,URL,URLSearchParams,Date,Math,Number,String,Error,AbortController,
  api:'https://example.invalid',
  isDemo:d=>d?.mode==='DEMO'&&d?.stale===false,
  goodBroker:p=>p?.rows?.length===p?.count,
  render(){renderCount++},
  refresh(){},
  rememberNativeNonce(nonce){stored.push(nonce);state.closePendingNonce=nonce},
  watchNativeResult(nonce){watches.push(nonce)},
  fetch(url,options){
   fetchCalls.push({url,options});
   if(mode==='rejected')return Promise.resolve({
    ok:false,status:401,json:async()=>({error:'TELEGRAM_SESSION_EXPIRED_REOPEN'})
   });
   return Promise.resolve({ok:true,status:202,json:async()=>({
    trade_executed:false,queued_for_bot:true,
    nonce:'0123456789abcdef0123456789abcdef'
   })});
  },
  setTimeout(){return 1},clearTimeout(){},
  console
 };
 vm.runInNewContext(moduleText,sandbox,{timeout:1500});
 assert.equal(sandbox.testReady(),age>=0&&age<=270);
 await sandbox.testClose('one','123');
 return {fetchCalls,watches,stored,state,renderCount};
}
(async()=>{
 const fresh=await scenario(12);
 assert.equal(fresh.fetchCalls.length,1,'fresh signed Telegram session should attempt one POST');
 assert.equal(fresh.fetchCalls[0].options.method,'POST');
 assert.equal(fresh.fetchCalls[0].options.headers['X-Telegram-Init-Data'].includes('auth_date='),true);
 assert.deepEqual(JSON.parse(fresh.fetchCalls[0].options.body),{action:'one',ticket:'123'});
 assert.equal(fresh.stored.length,1,'nonce is saved after a queue response');
 assert.equal(fresh.watches.length,1,'signed bot receipt polling started');
 const expired=await scenario(420);
 assert.equal(expired.fetchCalls.length,0,'old Telegram session must not submit trades');
 assert.match(expired.state.actionNotice,/5 daqiqadan eski/);
 const gray=await scenario(280);
 assert.equal(gray.fetchCalls.length,0,'30-second safety headroom before 300s server cutoff');
 const reject=await scenario(30,'rejected');
 assert.equal(reject.fetchCalls.length,1);
 assert.match(reject.state.actionNotice,/qayta oching/);
 assert.equal(reject.stored.length,0,'do not save nonce for a rejected request');
 console.log('ASTRA_REAL_OWNER_CLOSE_UI_FRESH_AUTH_POST_MOCK_PASS');
 console.log('ASTRA_STALE_TELEGRAM_SESSION_NO_POST_EXPLAINS_REOPEN_PASS');
 console.log('ASTRA_POST_401_VISIBLE_ERROR_AND_NONCE_SAFETY_PASS');
 console.log('ALL_NETWORK_REQUESTS_MOCKED_NO_BROKER_ORDER_SENT');
})().catch(err=>{console.error(err);process.exitCode=1});
