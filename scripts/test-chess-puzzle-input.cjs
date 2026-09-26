const http=require('http'),fs=require('fs'),path=require('path'),os=require('os'),{spawn}=require('child_process'),assert=require('assert/strict');
const root=process.env.CHESS_TEST_ROOT||path.resolve(__dirname,'../public-site');
const server=http.createServer((req,res)=>{let p=path.join(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(fs.existsSync(p)&&fs.statSync(p).isDirectory())p=path.join(p,'index.html');if(!fs.existsSync(p)){res.writeHead(404);return res.end('Not found')}res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(p)]||'text/plain');res.end(fs.readFileSync(p))});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const dir=fs.mkdtempSync(path.join(os.tmpdir(),'chess-smoke-'));const chrome=spawn(process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--remote-debugging-port=0','--user-data-dir='+dir,'--no-first-run','about:blank'],{stdio:['ignore','ignore','pipe']});let ws;try{const endpoint=await new Promise((r,j)=>{let s='';chrome.stderr.on('data',b=>{s+=b;const m=s.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m)r(m[1])});setTimeout(()=>j(Error('Chrome startup timeout')),15000).unref()});ws=new WebSocket(endpoint);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let id=0;const waiting=new Map(),errors=[];ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=waiting.get(m.id);if(p){waiting.delete(m.id);m.error?p[1](Error(m.error.message)):p[0](m.result)}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text)});const send=(method,params={},sessionId)=>new Promise((r,j)=>{const n=++id;waiting.set(n,[r,j]);ws.send(JSON.stringify({id:n,method,params,sessionId}))});const {targetId}=await send('Target.createTarget',{url:'about:blank'});const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});await send('Runtime.enable',{},sessionId);const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sessionId);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value};await send('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/games/chess-academy/`},sessionId);for(let i=0;i<100;i++){if(await ev('!!document.querySelector("#access-guest")'))break;await new Promise(r=>setTimeout(r,100))}await ev('document.querySelector("#access-guest").click()');for(let i=0;i<100;i++){if(await ev(`!!document.querySelector('#board [aria-label^="e2 "]')`))break;await new Promise(r=>setTimeout(r,100))}assert.match(await ev('document.title'),/Rookavelle/);await ev(`document.querySelector('#board [aria-label^="e2 "]').click();document.querySelector('#board [aria-label^="e4 "]').click()`);assert.equal(await ev('past.length'),1);assert.equal(await ev('typeof StudyCore'),'object');
async function until(expression){for(let n=0;n<100;n++){if(await ev(expression))return;await new Promise(r=>setTimeout(r,50))}throw Error('Timed out: '+expression)}


await send('Emulation.setDeviceMetricsOverride',{width:1100,height:1000,deviceScaleFactor:1,mobile:false},sessionId);
await ev(`document.querySelector('[data-view=puzzles]').click()`);await ev('document.fonts.ready');
async function point(square){return ev(`(()=>{const el=document.querySelector('#puzzle-board [aria-label^="${square} "]');el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`)}
async function mouse(type,p){await send('Input.dispatchMouseEvent',{type,...p,button:'left',buttons:type==='mouseReleased'?0:1,clickCount:1},sessionId)}
async function click(square){const p=await point(square);await mouse('mousePressed',p);await mouse('mouseReleased',p)}
async function move(uci,drag,touch=false){
 await ev(`document.querySelector('#puzzle-board').scrollIntoView({block:'center'})`);await new Promise(r=>setTimeout(r,100));
 const coords=await ev(`['${uci.slice(0,2)}','${uci.slice(2,4)}'].map(s=>{const r=document.querySelector('#puzzle-board [aria-label^="'+s+' "]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})`);
 if(touch&&drag){await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[coords[0]]},sessionId);await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[coords[1]]},sessionId);await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]},sessionId)}
 else if(drag){await mouse('mousePressed',coords[0]);await mouse('mouseMoved',coords[1]);await mouse('mouseReleased',coords[1])}
 else if(touch){for(const square of [uci.slice(0,2),uci.slice(2,4)]){const p=await point(square);await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]},sessionId);await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]},sessionId)}}else{await click(uci.slice(0,2));await click(uci.slice(2,4))}
}
for(const touch of [false,true])for(const level of ['medium','hard','expert']){
 if(touch)await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true},sessionId);
 await ev(`{const d=document.querySelector('#puzzle-difficulty');d.value='${level}';d.dispatchEvent(new Event('change'))}`);
 await until('!!trainingSession && !trainingSession.busy');assert.equal(await ev('document.querySelectorAll("#puzzle-attempt-list li").length'),0,'A new puzzle starts with empty history');
 {
 // Any legal attempt must visibly move and stay visible until Retry is pressed.
 const wrong=await ev(`(()=>{const t=trainingSession;const m=core.allMoves(t.state).find(m=>{const uci=core.square(m.from)+core.square(m.to)+(m.promotion||'');const n=core.apply(t.state,m);return !(core.check(n,n.turn)&&!core.allMoves(n).length)&&!(t.item.expert?t.item.plans[uci]:t.item.line[0]===uci)});return core.square(m.from)+core.square(m.to)})()`);
 for(let attempt=0;attempt<1;attempt++){
 const before=await ev('JSON.stringify(trainingSession.state)');const score=await ev('JSON.stringify(expertSolved)');
 await ev(`document.querySelector('#puzzle-board [aria-label^="${wrong.slice(0,2)} "]').click()`);
 assert.ok(await ev(`document.querySelectorAll('#puzzle-board .legal').length`)>0,level+' shows legal destinations');
 await ev(`document.querySelector('#puzzle-board [aria-label^="${wrong.slice(2,4)} "]').click()`);
 assert.notEqual(await ev('JSON.stringify(trainingSession.state)'),before,'Wrong legal move must visibly play');
 assert.equal(await ev(`trainingSession.state.board[core.indexOfSquare('${wrong.slice(0,2)}')]`),null);
 assert.equal(await ev('trainingSession.previewingMistake'),true);assert.match(await ev(`document.querySelector('#puzzle-attempt-list').textContent`),/Incorrect/);
 assert.match(await ev(`document.querySelector('#puzzle-board-feedback').textContent`),/^Incorrect/);
 await new Promise(r=>setTimeout(r,1400));
 assert.notEqual(await ev('JSON.stringify(trainingSession.state)'),before,'Wrong move must not automatically return');
 assert.equal(await ev('JSON.stringify(expertSolved)'),score,'Wrong moves never earn completion credit');
 assert.equal(await ev('document.querySelector("#puzzle-retry-move").hidden'),false);
 await ev('document.querySelector("#puzzle-retry-move").click()');
 assert.equal(await ev('trainingSession.busy'),false);
 assert.equal(await ev('document.querySelector("#puzzle-retry-move").hidden'),true);assert.equal(await ev('document.querySelectorAll("#puzzle-attempt-list li").length'),1,'Retry retains the previous attempt');assert.match(await ev('document.querySelector("#puzzle-attempts-summary").textContent'),/Attempt 2/);
 assert.equal(await ev('JSON.stringify(trainingSession.state)'),before,'Retry must restore the original puzzle');
 assert.equal(await ev('trainingSession.done'),false,level+' must remain playable after a mistake');
 assert.equal(await ev('trainingSession.step'),0,'Incorrect moves do not advance the puzzle');
 assert.equal(await ev('!!trainingSession.previewingMistake'),false);
 }
 if(level!=='medium')assert.equal(await ev('!!trainingSession.assisted'),false);
 }
 let turn=0;
 while(!(await ev('trainingSession.done'))){
 const uci=await ev(`(()=>{const t=trainingSession;if(!t.item.expert)return t.item.line[t.step];if(t.item.deep)return Object.keys(t.solutionPlans||t.item.plans)[0];if(t.step===0)return Object.keys(t.item.plans)[0];const m=core.allMoves(t.state).find(m=>{const n=core.apply(t.state,m);return core.check(n,n.turn)&&!core.allMoves(n).length});return core.square(m.from)+core.square(m.to)+(m.promotion||'')})()`);
 const old=await ev('trainingSession.step');await move(uci,turn===0,touch);
 assert.ok(await ev('trainingSession.step')>old,`${level} ${touch?'touch':'mouse'} turn ${turn} must move`);
 await until('!trainingSession.busy');assert.ok(++turn<10);
 }
 assert.equal(await ev('trainingSession.revealed'),false);if(level!=='medium')assert.equal(await ev('expertSolved.includes(trainingSession.item.id)'),true,'A clean retry can earn completion');
 assert.match(await ev(`document.querySelector('#puzzle-attempt-list li').textContent`),/Attempt 2.*Correct/);console.log('PASS',level,touch?'touch drag + taps':'mouse drag + clicks','completed');
}
await ev(`document.querySelector('#puzzle-attempts').scrollIntoView({block:'center'})`);const shot=await send('Page.captureScreenshot',{format:'png'},sessionId);fs.writeFileSync('/private/tmp/puzzle-attempt-history.png',Buffer.from(shot.data,'base64'));
// A genuine mate is correct even when absent from the stored solution map.
await ev(`showPuzzle({id:'alternative-mate-test',expert:true,deep:true,theme:'Checkmate',title:'Mate',level:'Hardest',fen:'7k/8/5KQ1/8/8/8/8/8 w - - 0 1',plans:{},line:['g6g7'],explain:'Checkmate.'},'Test');trainingSession.mistakes=0;document.querySelector('#puzzle-board [aria-label^="g6 "]').click();document.querySelector('#puzzle-board [aria-label^="g7 "]').click()`);
assert.equal(await ev('trainingSession.done'),true);assert.match(await ev(`document.querySelector('#puzzle-board-feedback').textContent`),/^Correct!/);
await ev(`document.querySelector('#puzzle-retry').click()`);assert.equal(await ev('trainingSession.done'),false);assert.equal(await ev('!!trainingSession.assisted'),false);assert.equal(await ev('trainingSession.mistakes'),0);assert.deepEqual(errors,[]);assert.equal(await ev('past.length'),1);
}finally{ws?.close();chrome.kill();server.close()}})().catch(e=>{console.error(e);process.exitCode=1});
