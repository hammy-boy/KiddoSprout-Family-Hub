/* Shared rules, independent training boards, and server-authoritative online play. */
const core = ChessCore;
const original = { outcome, render, commit, choose, reset, save, tick, hint: $('#hint').onclick, undo: $('#undo').onclick, resign: $('#confirm-resign').onclick };
let online = null, localBackup = null, activeView = 'play', trainingSession = null, trainingTimer = null;
let progress = { puzzles: [], lessons: [], attempts: 0, streak: 0, lastDay: '' };
try { const p = JSON.parse(localStorage.getItem('chess-club-progress')); if (p && Array.isArray(p.puzzles) && Array.isArray(p.lessons)) progress = { ...progress, ...p }; } catch {}
function rememberProgress() { try { localStorage.setItem('chess-club-progress', JSON.stringify(progress)); } catch {} updateStats(); }
function escapeHTML(s) { return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }
const nav = document.createElement('nav'); nav.className = 'main-nav'; nav.setAttribute('aria-label', 'Main navigation');
nav.innerHTML = ['play','online','puzzles','learn','review'].map(v => `<button class="nav-button" data-view="${v}">${v[0].toUpperCase()+v.slice(1)}</button>`).join('');
$('header .tag').remove(); $('header').append(nav);
const studyLink=document.createElement('a');studyLink.href='chess-extras/index.html';studyLink.className='nav-button';studyLink.textContent='Study';nav.append(studyLink);
const watchLink=document.createElement('a');watchLink.href='chess-extras/watch.html';watchLink.className='nav-button';watchLink.textContent='Watch';nav.append(watchLink);
const communityLink=document.createElement('a');communityLink.href='chess-extras/community.html';communityLink.className='nav-button';communityLink.textContent='Community';nav.append(communityLink);
const playSection = document.createElement('section'); playSection.id = 'view-play'; playSection.className = 'section-view';
$('main').insertBefore(playSection, $('.intro')); playSection.append($('.intro'), $('.layout'));
$('.intro').insertAdjacentHTML('afterend', `<div class="hub-cards"><button class="hub-card" data-view="online"><span class="hub-icon">◎</span><span><strong>Play online</strong><small>A friend or a new opponent</small></span></button><button class="hub-card" id="computer-card"><span class="hub-icon">♞</span><span><strong>Challenge the computer</strong><small>Three levels. Your pace.</small></span></button><button class="hub-card" data-view="puzzles"><span class="hub-icon">✧</span><span><strong>Train your eye</strong><small>Tactics worth finding</small></span></button><button class="hub-card" data-view="learn"><span class="hub-icon">▤</span><span><strong>Learn by doing</strong><small>Small lessons. Real moves.</small></span></button></div>`);
const views = document.createElement('div');
views.innerHTML = `
<section id="view-online" class="section-view" hidden><div class="section-heading"><div><div class="eyebrow">Better together</div><h1>Meet at the board.</h1><p>Invite a friend or find another player. No account needed.</p></div><span class="pill">Casual games</span></div><div class="feature-grid"><div class="content-card"><h2>Your next opponent awaits.</h2><label class="form-field">Your display name<input id="online-name" maxlength="24" placeholder="Guest" autocomplete="nickname"></label><label class="form-field">Game rules<select id="online-variant"><option value="standard">Standard chess</option><option value="three">Three-check</option><option value="hill">King of the Hill</option><option value="960">Chess960</option><option value="blind">Blindfold</option></select></label><label class="form-field" id="online-960-label" hidden>Chess960 starting number<input id="online-960-number" type="number" min="0" max="959" step="1" value="518"></label><label class="form-field">Time per player<select id="online-time"><option value="180">3 minutes · Blitz</option><option value="300">5 minutes · Blitz</option><option value="600" selected>10 minutes · Rapid</option><option value="900">15 minutes · Rapid</option></select></label><div class="button-stack"><button class="primary" id="quick-match">◎ &nbsp; Find an opponent</button><button class="secondary" id="create-room">＋ &nbsp; Create a private game</button></div><p id="connection-status" role="status">Checking the game server…</p><div id="reconnect-area"></div></div><div class="content-card"><h2>Got an invitation?</h2><p>Paste your friend’s game code or invitation link.</p><form id="join-form"><label class="form-field">Game code or link<input id="room-code" required placeholder="e.g. a1b2c3d4e5f6" autocomplete="off"></label><button class="primary wide" id="join-room">Join game</button></form><div class="notice">Private invitations work for anyone with the link. Quick pairing needs another player on this same site with the same rules, time control and Chess960 starting number.</div><p>Games include live clocks, chat, draw offers, and reconnect support. Your opponent’s moves are checked by the server.</p><p class="muted">Guest games are unrated. Keep this tab open to retain your player session and reconnect.</p></div></div></section>
<section id="view-puzzles" class="section-view" hidden><div class="section-heading"><div><div class="eyebrow">A little practice, every day</div><h1>Find the beautiful move.</h1><p>Checkmates, forks, and chances hiding in plain sight.</p></div><button class="secondary" id="daily-puzzle">Today’s puzzle ↗</button></div><div class="stats-grid"><div class="stat-card"><span>PUZZLES SOLVED</span><strong id="puzzle-stat">0 / 12</strong><span>Find the idea. Make it stick.</span></div><div class="stat-card"><span>PRACTICE STREAK</span><strong id="streak-stat">0 days</strong><span>One solved puzzle counts.</span></div><div class="stat-card"><span>LESSONS COMPLETE</span><strong id="lesson-stat">0 / 10</strong><span>Build your foundations.</span></div></div><div class="filter-row" id="puzzle-filters"></div><div class="training-layout"><div><div class="training-topline"><span id="puzzle-turn"></span><span id="puzzle-position"></span></div><div class="board-frame"><div class="board training-board" id="puzzle-board" role="group" aria-label="Puzzle board"></div></div></div><div class="content-card training-card"><div class="eyebrow" id="puzzle-level"></div><h2 id="puzzle-title"></h2><p id="puzzle-objective"></p><div class="feedback" id="puzzle-feedback" role="status"></div><div class="button-stack"><button class="primary" id="next-puzzle">Next puzzle →</button><div class="control-row"><button class="secondary" id="puzzle-hint">Get a hint</button><button class="secondary" id="puzzle-retry">Try again</button></div><button class="secondary" id="puzzle-reveal">Show the solution</button></div><p class="profile-note">Progress stays in this browser. Revealed solutions don’t count as solved.</p></div></div></section>
<section id="view-learn" class="section-view" hidden><div class="section-heading"><div><div class="eyebrow">Start here. Go anywhere.</div><h1>Every master was a beginner.</h1><p>Learn one idea, then try it on the board.</p></div><span class="pill" id="learn-progress"></span></div><div id="lesson-catalog"><div class="lesson-grid" id="lesson-grid"></div></div><div id="lesson-study" hidden><button class="secondary study-back" id="back-lessons">← All lessons</button><div class="training-layout"><div><div class="training-topline"><span>White to move</span><span>Guided practice</span></div><div class="board-frame"><div class="board training-board" id="lesson-board" role="group" aria-label="Lesson board"></div></div></div><div class="content-card training-card"><div class="eyebrow" id="lesson-number"></div><h2 id="lesson-title"></h2><p id="lesson-instructions"></p><div class="feedback" id="lesson-feedback" role="status">Select a piece to begin.</div><div class="button-stack"><button class="primary" id="next-lesson">Next lesson →</button><button class="secondary" id="retry-lesson">Practice again</button></div></div></div></div></section>
<section id="view-review" class="section-view" hidden><div class="section-heading"><div><div class="eyebrow">Look a little closer</div><h1>Every move has a story.</h1><p>Replay your current game, one decision at a time.</p></div><button class="secondary" id="refresh-review">Load latest position</button></div><div id="review-empty" class="content-card empty-review"><h2>Your first move is the beginning.</h2><p>Play a game, then return here to replay it.</p><button class="primary" data-view="play">Go to the board</button></div><div id="review-content" class="training-layout" hidden><div><div class="training-topline"><span id="review-turn"></span><span id="review-position"></span></div><div class="board-frame"><div class="board review-board" id="review-board" role="group" aria-label="Game replay board"></div></div><div class="review-controls"><button class="secondary" id="review-first" aria-label="Starting position">⇤</button><button class="secondary" id="review-prev" aria-label="Previous move">←</button><button class="secondary" id="review-next" aria-label="Next move">→</button><button class="secondary" id="review-last" aria-label="Latest position">⇥</button></div></div><div class="content-card"><h2 id="review-title">Game replay</h2><p id="review-material"></p><div class="review-moves" id="review-moves"></div><div class="notice">Replay preserves your active game. This view shows material balance, not a computer evaluation.</div><button class="secondary wide" id="review-export">Download game PGN</button></div></div></section>`;
$('main').insertBefore(views, $('footer'));
$('.layout > section').insertAdjacentHTML('afterbegin', '<div id="online-summary" class="online-summary" hidden></div>');
$('aside').insertAdjacentHTML('beforeend', '<section class="panel content-card online-extras" id="online-chat" hidden><h3>At the board</h3><div class="chat-list" id="chat-list" aria-live="polite"></div><form id="chat-form" class="chat-form"><input id="chat-input" aria-label="Message to opponent" placeholder="Say good luck…" maxlength="200" required><button class="secondary">Send</button></form></section>');
function switchView(view) {
  if (!['play','online','puzzles','learn','review','history','tournaments','train','tools','glossary','mates','openings','endgames','rush','coaches','profile','plan','clinic','lab','workshop','repertoire'].includes(view)) return;
  activeView = view;
  if(view!=='learn')++lessonGeneration;
  if(view!=='puzzles')++puzzleGeneration;
  document.querySelectorAll('.section-view').forEach(el => el.hidden = el.id !== 'view-'+view);
  document.querySelectorAll('.nav-button').forEach(el => { el.classList.toggle('active', el.dataset.view === view); el.setAttribute('aria-current',el.dataset.view===view?'page':'false'); });
  if (view === 'puzzles' && trainingSession?.kind !== 'puzzle') { if($('#puzzle-source').value==='endless')nextGeneratedPuzzle();else if($('#puzzle-source').value==='expert')startExpertPuzzle();else startPuzzle(puzzleIndex); }
  if (view === 'learn') { if($('#lesson-source').value==='endless')nextGeneratedLesson();else{$('#lesson-study').hidden=true;$('#lesson-catalog').hidden=false;renderLessons();} }
  if (view === 'review') loadReview();
  if (view === 'online') showReconnect();
  window.scrollTo({ top: 0, behavior: 'instant' });
}
document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => switchView(b.dataset.view));
$('#computer-card').onclick = () => { if (online) return toast('Leave the online game before starting a computer game.'); $('#opponent').value='computer'; $('#new-game').click(); };
function updateStats() {
  $('#puzzle-stat').textContent = `${progress.puzzles.length} / ${TRAINING.puzzles.length}`;
  const today = new Date().toDateString(), yesterday = new Date(Date.now()-86400000).toDateString();
  const streak = [today,yesterday].includes(progress.lastDay) ? progress.streak : 0;
  $('#streak-stat').textContent = `${streak} ${streak===1?'day':'days'}`;
  $('#lesson-stat').textContent = `${progress.lessons.length} / ${TRAINING.lessons.length}`;
  $('#learn-progress').textContent = `${progress.lessons.length} of ${TRAINING.lessons.length} complete`;
}
function drawStudyBoard(target, position, selectedSquare, onSquare, reverse=false, highlighted=[]) {
  const board = $(target), focusedIndex=Array.from(board.children).indexOf(document.activeElement);
  const baseReverse=reverse;board.academyFlip=()=>{board.dataset.manualFlip=board.dataset.manualFlip==='yes'?'no':'yes';drawStudyBoard(target,position,selectedSquare,onSquare,baseReverse,highlighted)};
  reverse=reverse!==(board.dataset.manualFlip==='yes');board.innerHTML = '';
  const moves = selectedSquare===null || (target==='#puzzle-board'&&trainingSession?.item.expert) ? [] : core.legal(position,selectedSquare);
  for(let pos=0;pos<64;pos++) {
    const i=reverse?63-pos:pos, p=position.board[i], r=Math.floor(i/8), c=i%8;
    const el=document.createElement('button'); el.type='button'; el.className='square'+((r+c)%2?' dark':'')+(selectedSquare===i?' selected':'')+(moves.some(m=>m.to===i)?' legal'+(p?' capture':''):'')+(highlighted.includes(i)?' last':'');
    el.setAttribute('aria-label',core.square(i)+(p?' '+(core.color(p)==='w'?'White ':'Black ')+names[p.toLowerCase()]:' empty'));
    el.innerHTML=(p?`<span class="piece ${core.color(p)==='w'?'white':'black'}">${glyph[p]}</span>`:'')+(pos%8===0?`<span class="coord rank">${8-r}</span>`:'')+(pos>=56?`<span class="coord file">${'abcdefgh'[c]}</span>`:'');
    el.onclick=()=>onSquare?.(i); el.onkeydown=e=>{const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-8,ArrowDown:8}[e.key];if(delta){e.preventDefault();board.children[(e.key==='ArrowLeft'&&pos%8===0)||(e.key==='ArrowRight'&&pos%8===7)?pos:Math.max(0,Math.min(63,pos+delta))].focus()}};
    board.append(el);
  }
  if(focusedIndex>=0)board.children[focusedIndex]?.focus({preventScroll:true});
}
let puzzleIndex=0, puzzleFilter='All', lessonIndex=0;
let puzzleGeneration=0,generatedNumber=0,recentGenerated=[],endlessSolved=0,endlessSolvedIds=[];
try{const saved=JSON.parse(localStorage.getItem('chess-club-endless'));if(Number.isSafeInteger(saved?.solved)&&saved.solved>=0)endlessSolved=saved.solved;if(Array.isArray(saved?.recent))endlessSolvedIds=saved.recent.filter(x=>typeof x==='string').slice(-200)}catch{}
$('#puzzle-filters').insertAdjacentHTML('beforebegin','<div class="feature-toolbar" id="puzzle-options"><label>Puzzle collection<select id="puzzle-source"><option value="endless">Endless puzzles</option><option value="library">Guided collection</option><option value="expert" selected>Expert · deep calculation</option></select></label><label>Difficulty<select id="puzzle-difficulty"><option value="easiest">Easiest (-600)</option><option value="easy">Easier (-300)</option><option value="medium">Normal</option><option value="hard">Harder (+300)</option><option value="expert" selected>Hardest (+600)</option></select></label></div><p id="endless-description">Unlimited generated mate-in-one practice. Difficulty describes board complexity, not a rating. Positions may eventually repeat.</p><p id="endless-score" role="status"></p>');
let expertIndex=0,expertSolved=[],lastGeneratedDifficulty='easy';
try{const ids=JSON.parse(localStorage.getItem('chess-club-expert'));if(Array.isArray(ids))expertSolved=[...new Set(ids.filter(id=>TRAINING.expert.some(p=>p.id===id)))]}catch{}
$('#puzzle-options').insertAdjacentHTML('afterend','<p id="expert-score" role="status" hidden></p>');
function startExpertPuzzle(index=TRAINING.expert.findIndex(p=>p.deep)){++puzzleGeneration;expertIndex=index;$('#puzzle-source').value='expert';$('#puzzle-difficulty').value=TRAINING.expert[index].deep?'expert':'hard';puzzleOptions();showPuzzle({...TRAINING.expert[index],level:TRAINING.expert[index].deep?'Hardest (+600)':'Harder (+300)'},`Challenge ${TRAINING.expert.filter((p,i)=>i<=index&&!!p.deep===!!TRAINING.expert[index].deep).length} / ${TRAINING.expert.filter(p=>!!p.deep===!!TRAINING.expert[index].deep).length}`);trainingSession.mistakes=0;trainingFeedback('No move markers. Calculate the full mate in '+(TRAINING.expert[index].mateMoves||2)+'.')}
function solutionDepth(tree){return tree===true?0:1+Math.max(...Object.values(tree).map(branches=>branches===true?0:Math.max(...Object.values(branches).map(solutionDepth))))}
function chooseExpert(i){
 const t=trainingSession;if(!t||t.done||t.busy)return;let m=t.selected===null?null:core.legal(t.state,t.selected).find(m=>m.to===i);
 if(!m){t.selected=core.color(t.state.board[i])===t.state.turn?i:null;return renderTraining()}
 if(t.state.board[m.from].toLowerCase()==='p'&&(m.to<8||m.to>=56))m={...m,promotion:'q'};
 const uci=core.square(m.from)+core.square(m.to)+(m.promotion||''),next=core.apply(t.state,m);progress.attempts++;t.selected=null;
 const plans=t.solutionPlans||t.item.plans;const correct=t.item.deep?!!plans[uci]:t.step===0?!!t.item.plans[uci]:core.check(next,next.turn)&&!core.allMoves(next).length;
 const limit=t.item.deep?1:3;
 if(!correct){t.mistakes++;if(t.mistakes>=limit){t.done=true;t.revealed=true;trainingFeedback('Mistake limit reached. Retry this challenge or reveal the line.','incorrect')}else trainingFeedback(`That move does not force the required mate. ${limit-t.mistakes} mistakes remaining.`,'incorrect');rememberProgress();return renderTraining()}
 t.state=next;t.step++;if(core.check(next,next.turn)&&!core.allMoves(next).length)return finishTraining();
 t.busy=true;trainingFeedback('Your opponent is defending…');renderTraining();
 const branches=plans[uci],replies=Object.keys(branches);const reply=t.item.deep?replies.sort((a,b)=>solutionDepth(branches[b])-solutionDepth(branches[a]))[0]:replies[Math.floor(Math.random()*replies.length)];
 trainingTimer=setTimeout(()=>{if(trainingSession!==t)return;t.state=core.apply(t.state,core.moveFromUCI(t.state,reply));t.step++;if(t.item.deep)t.solutionPlans=branches[reply];t.busy=false;trainingFeedback(t.item.deep?'Keep calculating. Find the next forcing move.':'Find the checkmate.');renderTraining()},650);
}
function puzzleOptions(){const endless=$('#puzzle-source').value==='endless';$('#puzzle-filters').hidden=$('#puzzle-source').value!=='library';$('#expert-score').hidden=$('#puzzle-source').value!=='expert';$('#expert-score').textContent=`Expert challenges completed: ${expertSolved.length} / ${TRAINING.expert.length}`;$('#puzzle-difficulty').disabled=false;$('#puzzle-difficulty').closest('label').hidden=false;$('#endless-description').hidden=!endless;$('#endless-score').hidden=!endless;$('#endless-score').textContent=`Endless puzzles solved: ${endlessSolved}`}
function showPuzzle(item,label){
  clearTimeout(trainingTimer);trainingSession={kind:'puzzle',item,state:core.fromFEN(item.fen),selected:null,step:0,done:false,revealed:false,busy:false};
  $('#puzzle-title').textContent=item.title;$('#puzzle-level').textContent=item.level+' · '+item.theme;$('#puzzle-position').textContent=label;
  $('#puzzle-objective').textContent=item.objective||(item.theme==='Checkmate'||item.id==='promotion'?'Find checkmate in one move.':item.theme==='Fork'?'Find the fork, then collect the queen.':'Find the move that wins material.');
  for(const id of ['puzzle-hint','puzzle-retry','puzzle-reveal'])$('#'+id).disabled=false;
  if(item.difficulty==='easiest'){trainingSession.selected=core.indexOfSquare(item.line[0].slice(0,2));trainingFeedback('Start with the highlighted piece. '+item.hint)}else trainingFeedback('Your move. Select a piece and find the best continuation.');renderTraining();
}
async function nextGeneratedPuzzle(){
  const request=++puzzleGeneration;clearTimeout(trainingTimer);trainingSession=null;$('#puzzle-board').replaceChildren();$('#puzzle-title').textContent='Creating your puzzle…';$('#puzzle-objective').textContent='Checking that the position has a legal checkmate.';$('#puzzle-turn').textContent='';$('#puzzle-position').textContent='';$('#puzzle-level').textContent=$('#puzzle-difficulty').selectedOptions[0].textContent;$('#puzzle-feedback').textContent='Preparing a fresh position…';
  for(const id of ['puzzle-hint','puzzle-retry','puzzle-reveal'])$('#'+id).disabled=true;
  try{const item=await EndlessPuzzles.generate(core,$('#puzzle-difficulty').value,recentGenerated,()=>request!==puzzleGeneration);if(!item||request!==puzzleGeneration)return;recentGenerated.push(item.fen);recentGenerated=recentGenerated.slice(-200);showPuzzle(item,`Endless puzzle ${++generatedNumber}`)}catch(error){if(request===puzzleGeneration){$('#puzzle-title').textContent='Try another puzzle';$('#puzzle-feedback').textContent=error.message}}
}
$('#puzzle-source').onchange=()=>{if($('#puzzle-source').value==='endless'){$('#puzzle-difficulty').value=lastGeneratedDifficulty;puzzleOptions();nextGeneratedPuzzle()}else if($('#puzzle-source').value==='expert')startExpertPuzzle();else startPuzzle(puzzleIndex)};
$('#puzzle-difficulty').onchange=()=>{if($('#puzzle-difficulty').value==='expert')return startExpertPuzzle();if($('#puzzle-difficulty').value==='hard')return startExpertPuzzle(0);lastGeneratedDifficulty=$('#puzzle-difficulty').value;$('#puzzle-source').value='endless';puzzleOptions();nextGeneratedPuzzle()};puzzleOptions();


for(const theme of ['All','Checkmate','Win material','Fork','Promotion']) { const b=document.createElement('button'); b.className='filter-chip'+(theme==='All'?' active':''); b.textContent=theme; b.onclick=()=>{puzzleFilter=theme;$('#puzzle-filters').querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));startPuzzle(TRAINING.puzzles.findIndex(p=>theme==='All'||p.theme===theme))}; $('#puzzle-filters').append(b); }
function trainingFeedback(text, type='') { const el=$('#'+(trainingSession.kind==='puzzle'?'puzzle':'lesson')+'-feedback'); el.textContent=text; el.className='feedback'+(type?' '+type:''); }
function startPuzzle(index) {
  ++puzzleGeneration;puzzleIndex=index;$('#puzzle-source').value='library';$('#puzzle-difficulty').value=TRAINING.puzzles[index].level==='Starter'?'easy':'medium';puzzleOptions();
  showPuzzle(TRAINING.puzzles[index],`Puzzle ${index+1} / ${TRAINING.puzzles.length}`);
}
function renderTraining(highlight=[]) {
  const t=trainingSession;if(!t)return;const prefix=t.kind==='puzzle'?'puzzle':'lesson';
  const reverse=t.item.fen.split(' ')[1]==='b';
  drawStudyBoard('#'+prefix+'-board',t.state,t.selected,trainingChoose,reverse,highlight);
  if(t.kind==='puzzle')$('#puzzle-turn').textContent=t.done?'Position complete':(t.state.turn==='w'?'White':'Black')+' to move';
}
function finishTraining() {
  const t=trainingSession; t.done=true;
  trainingFeedback(t.kind==='puzzle'?t.item.explain:t.item.success,'correct');
  const bucket=t.kind==='puzzle'?'puzzles':'lessons';
  if(t.item.expert){if(!t.revealed&&!t.assisted&&!expertSolved.includes(t.item.id)){expertSolved.push(t.item.id);try{localStorage.setItem('chess-club-expert',JSON.stringify(expertSolved))}catch{}}puzzleOptions();
  }else if(t.item.generated&&t.kind==='lesson'){
    if(!t.revealed&&!endlessLessonIds.includes(t.item.id)){endlessLessonsSolved++;endlessLessonIds.push(t.item.id);endlessLessonIds=endlessLessonIds.slice(-200);try{localStorage.setItem('chess-club-endless-lessons',JSON.stringify({solved:endlessLessonsSolved,recent:endlessLessonIds}))}catch{}}
    lessonOptions();
  }else if(t.item.generated){
    if(!t.revealed&&!endlessSolvedIds.includes(t.item.id)){endlessSolved++;endlessSolvedIds.push(t.item.id);endlessSolvedIds=endlessSolvedIds.slice(-200);try{localStorage.setItem('chess-club-endless',JSON.stringify({solved:endlessSolved,recent:endlessSolvedIds}))}catch{}}
    puzzleOptions();
  }else if(!t.revealed&&!progress[bucket].includes(t.item.id))progress[bucket].push(t.item.id);
  if(t.kind==='puzzle'&&!t.revealed) { const today=new Date().toDateString(), yesterday=new Date(Date.now()-86400000).toDateString(); if(progress.lastDay!==today){progress.streak=progress.lastDay===yesterday?progress.streak+1:1;progress.lastDay=today;} }
  if(!t.revealed&&!t.assisted)window.dispatchEvent(new CustomEvent('academy-practice',{detail:{kind:t.kind,id:t.item.id}}));
  rememberProgress(); renderTraining();
}
function trainingChoose(i) {
  if(trainingSession?.item.expert)return chooseExpert(i);
  const t=trainingSession;if(!t||t.done||t.busy)return;
  const move=t.selected===null?null:core.legal(t.state,t.selected).find(m=>m.to===i);
  if(!move) { t.selected=core.color(t.state.board[i])===t.state.turn?(t.selected===i?null:i):null;return renderTraining(); }
  if(t.state.board[move.from].toLowerCase()==='p'&&(move.to<8||move.to>=56))move.promotion='q';
  const uci=core.square(move.from)+core.square(move.to)+(move.promotion||'');
  const expected=t.kind==='puzzle'?t.item.line[t.step]:t.item.moves[t.step];
  progress.attempts++;
  // Accept equivalent mating moves, while retaining a deterministic teaching line.
  const next=core.apply(t.state,move);
  const alternativeMate=t.kind==='puzzle'&&t.item.theme==='Checkmate'&&core.check(next,next.turn)&&!core.allMoves(next).length;
  if(uci!==expected&&!alternativeMate){t.selected=null;trainingFeedback(t.kind==='puzzle'?'That’s legal, but there’s a stronger move. Look again.':'That move is legal. Try the move described in the lesson.','incorrect');rememberProgress();return renderTraining()}
  t.state=next;t.selected=null;t.step++;
  if(t.step>=(t.item.line||t.item.moves).length||alternativeMate)return finishTraining();
  trainingFeedback('Good start. Your opponent responds…');t.busy=true;renderTraining([move.from,move.to]);
  trainingTimer=setTimeout(()=>{if(trainingSession!==t)return;const reply=core.moveFromUCI(t.state,(t.item.line||t.item.moves)[t.step]);t.state=core.apply(t.state,reply);t.step++;t.busy=false;trainingFeedback(t.item.steps?.[t.step/2]||'Now finish the combination.');renderTraining([reply.from,reply.to]);},650);
}
$('#next-puzzle').onclick=()=>{if($('#puzzle-source').value==='expert'){const pool=TRAINING.expert.map((p,i)=>({p,i})).filter(x=>!!x.p.deep===!!trainingSession.item.deep).map(x=>x.i);return startExpertPuzzle(pool[(pool.indexOf(expertIndex)+1)%pool.length])};if($('#puzzle-source').value==='endless')return nextGeneratedPuzzle();for(let n=1;n<=TRAINING.puzzles.length;n++){const i=(puzzleIndex+n)%TRAINING.puzzles.length;if(puzzleFilter==='All'||TRAINING.puzzles[i].theme===puzzleFilter)return startPuzzle(i)}};
$('#puzzle-retry').onclick=()=>{if(trainingSession?.item.expert)return startExpertPuzzle(expertIndex);if(trainingSession?.item.generated)showPuzzle(trainingSession.item,$('#puzzle-position').textContent);else startPuzzle(puzzleIndex)};
$('#puzzle-hint').onclick=()=>{if(trainingSession?.kind==='puzzle'){if(trainingSession.item.expert){trainingSession.assisted=true;trainingFeedback(trainingSession.item.hint+' This is now a practice attempt; retry to earn completion.')}else trainingFeedback(trainingSession.item.hint)}};
$('#puzzle-reveal').onclick=()=>{const t=trainingSession;if(!t||t.kind!=='puzzle'||(t.done&&!t.item.expert))return;clearTimeout(trainingTimer);t.revealed=true;t.busy=false;let position=core.fromFEN(t.item.fen);const line=[];for(const uci of t.item.line){const m=core.moveFromUCI(position,uci),next=core.apply(position,m);line.push(core.completeNotation(position,m,next));position=next}t.state=position;t.done=true;t.selected=null;renderTraining();trainingFeedback('Solution: '+line.join(' → ')+'. '+t.item.explain);};
$('#daily-puzzle').onclick=()=>{puzzleFilter='All';$('#puzzle-filters').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.textContent==='All'));startPuzzle(Math.floor(Date.now()/86400000)%TRAINING.puzzles.length)};
function guidedLessonIndexes(){const level=$('#guided-difficulty')?.value||'all';return TRAINING.lessons.map((item,i)=>({item,i})).filter(({item})=>level==='all'||item.difficulty===level).map(({i})=>i)}
function renderLessons(){
  $('#lesson-grid').replaceChildren();const indexes=guidedLessonIndexes();
  for(const i of indexes){const l=TRAINING.lessons[i],b=document.createElement('button');b.className='lesson-card';b.dataset.lesson=l.id;b.innerHTML=`<span class="lesson-icon">${l.icon}</span><h3>${i+1}. ${l.title}</h3><p>${l.description}</p><span class="lesson-state">${l.difficulty.toUpperCase()} · ${(l.moves.length+1)/2} practice ${(l.moves.length===1)?'move':'moves'}</span><span class="lesson-state">${progress.lessons.includes(l.id)?'✓ COMPLETED':'START LESSON →'}</span>`;b.onclick=()=>startLesson(i);$('#lesson-grid').append(b)}
  if($('#guided-lesson-count'))$('#guided-lesson-count').textContent=`${indexes.length} of ${TRAINING.lessons.length} guided lessons · Choose a level or explore them all.`;
  updateStats();
}
let lessonGeneration=0,generatedLessonNumber=0,recentLessons=[],endlessLessonsSolved=0,endlessLessonIds=[];
try{const saved=JSON.parse(localStorage.getItem('chess-club-endless-lessons'));if(Number.isSafeInteger(saved?.solved)&&saved.solved>=0)endlessLessonsSolved=saved.solved;if(Array.isArray(saved?.recent))endlessLessonIds=saved.recent.filter(x=>typeof x==='string').slice(-200)}catch{}
$('#lesson-catalog').insertAdjacentHTML('beforebegin','<div class="feature-toolbar" id="lesson-options"><label>Lesson collection<select id="lesson-source"><option value="library">Guided lessons</option><option value="endless">Endless learning</option></select></label><label>Difficulty<select id="lesson-difficulty"><option value="easy">Easy · guided moves</option><option value="medium">Medium · blocked paths</option><option value="hard">Hard · safe captures</option></select></label><label>Practise<select id="lesson-topic"><option value="mixed">All pieces</option><option value="r">Rook</option><option value="b">Bishop</option><option value="n">Knight</option><option value="p">Pawn</option><option value="q">Queen</option><option value="k">King</option></select></label><button class="primary" id="start-endless-lessons">Start endless learning →</button></div><p id="endless-lesson-description">Fresh board exercises with an explanation before every move. Choose a piece or mix them all. Positions may eventually repeat.</p><p id="endless-lesson-score" role="status"></p>');
$('#lesson-topic').closest('label').insertAdjacentHTML('beforebegin','<label id="guided-difficulty-label">Difficulty<select id="guided-difficulty"><option value="all">All levels</option><option value="easy">Easy · first moves</option><option value="medium">Medium · rules and defence</option><option value="hard">Hard · tactical combinations</option></select></label>');
$('#lesson-grid').insertAdjacentHTML('beforebegin','<p id="guided-lesson-count" role="status"></p>');
$('#guided-difficulty').onchange=()=>{++lessonGeneration;clearTimeout(trainingTimer);trainingSession=null;$('#lesson-study').hidden=true;$('#lesson-catalog').hidden=false;renderLessons()};
$('#retry-lesson').insertAdjacentHTML('afterend','<button class="secondary" id="lesson-hint">Get a hint</button><button class="secondary" id="lesson-reveal">Show the move</button>');
function lessonOptions(){const endless=$('#lesson-source').value==='endless';$('#lesson-difficulty').disabled=$('#lesson-topic').disabled=!endless;$('#lesson-difficulty').closest('label').hidden=$('#lesson-topic').closest('label').hidden=!endless;$('#guided-difficulty-label').hidden=endless;$('#endless-lesson-description').hidden=$('#endless-lesson-score').hidden=!endless;$('#start-endless-lessons').hidden=endless;$('#endless-lesson-score').textContent=`Endless lessons completed: ${endlessLessonsSolved}`;$('#back-lessons').textContent=endless?'← Guided lessons':'← All lessons'}
function showLesson(item,label){
  clearTimeout(trainingTimer);trainingSession={kind:'lesson',item,state:core.fromFEN(item.fen),selected:null,step:0,done:false,revealed:false,busy:false};$('#lesson-catalog').hidden=true;$('#lesson-study').hidden=false;$('#lesson-number').textContent=label;$('#lesson-title').textContent=item.title;$('#lesson-instructions').textContent=item.text;
  for(const id of ['retry-lesson','lesson-hint','lesson-reveal'])$('#'+id).disabled=false;
  trainingFeedback('Read the idea, then try it on the board.');renderTraining();
}
function startLesson(index){++puzzleGeneration;++lessonGeneration;lessonIndex=index;$('#lesson-source').value='library';lessonOptions();showLesson(TRAINING.lessons[index],`${TRAINING.lessons[index].difficulty.toUpperCase()} · Lesson ${index+1} of ${TRAINING.lessons.length}`)}
async function nextGeneratedLesson(){
  ++puzzleGeneration;const request=++lessonGeneration;clearTimeout(trainingTimer);trainingSession=null;$('#lesson-catalog').hidden=true;$('#lesson-study').hidden=false;$('#lesson-board').replaceChildren();$('#lesson-title').textContent='Creating your lesson…';$('#lesson-instructions').textContent='Checking your practice move.';$('#lesson-feedback').textContent='Preparing a fresh board…';$('#lesson-number').textContent='Endless learning';
  for(const id of ['retry-lesson','lesson-hint','lesson-reveal'])$('#'+id).disabled=true;
  try{const item=await EndlessLessons.generate(core,$('#lesson-difficulty').value,$('#lesson-topic').value,recentLessons,()=>request!==lessonGeneration);if(!item||request!==lessonGeneration)return;recentLessons.push(item.fen);recentLessons=recentLessons.slice(-200);showLesson(item,`${item.difficulty.toUpperCase()} · Endless lesson ${++generatedLessonNumber}`)}catch(error){if(request===lessonGeneration){$('#lesson-title').textContent='Try another lesson';$('#lesson-feedback').textContent=error.message}}
}
$('#lesson-source').onchange=()=>{++lessonGeneration;lessonOptions();if($('#lesson-source').value==='endless')nextGeneratedLesson();else{trainingSession=null;$('#lesson-study').hidden=true;$('#lesson-catalog').hidden=false;renderLessons()}};
$('#start-endless-lessons').onclick=()=>{$('#lesson-source').value='endless';$('#lesson-source').onchange()};
$('#lesson-difficulty').onchange=$('#lesson-topic').onchange=()=>nextGeneratedLesson();
$('#back-lessons').onclick=()=>{$('#lesson-source').value='library';$('#lesson-source').onchange()};
$('#retry-lesson').onclick=()=>{if(trainingSession?.kind!=='lesson')return;if(trainingSession.item.generated)showLesson(trainingSession.item,$('#lesson-number').textContent);else startLesson(lessonIndex)};
$('#next-lesson').onclick=()=>{if($('#lesson-source').value==='endless')return nextGeneratedLesson();const indexes=guidedLessonIndexes(),next=indexes[indexes.indexOf(lessonIndex)+1];return next!==undefined?startLesson(next):switchView('learn')};
$('#lesson-hint').onclick=()=>{const t=trainingSession;if(t?.kind==='lesson'&&!t.busy)trainingFeedback(t.item.hint||t.item.steps?.[t.step/2]||'Try moving from '+t.item.moves[Math.min(t.step,t.item.moves.length-1)].slice(0,2)+' to '+t.item.moves[Math.min(t.step,t.item.moves.length-1)].slice(2,4)+'.')};
$('#lesson-reveal').onclick=()=>{const t=trainingSession;if(t?.kind!=='lesson'||t.done)return;clearTimeout(trainingTimer);t.busy=false;let position=core.fromFEN(t.item.fen);const notation=[];for(const uci of t.item.moves){const move=core.moveFromUCI(position,uci),next=core.apply(position,move);notation.push(core.completeNotation(position,move,next));position=next}t.state=position;t.revealed=true;t.done=true;t.selected=null;renderTraining();trainingFeedback('Try this line: '+notation.join(' → ')+'. '+t.item.success)};

lessonOptions();
let reviewStates=[], reviewNotation=[], reviewIndex=0, reviewPGN='';
function loadReview(){reviewPGN=pgn();reviewStates=structuredClone([...past,state]);reviewNotation=[...notation];reviewIndex=reviewStates.length-1;$('#review-empty').hidden=!!notation.length;$('#review-content').hidden=!notation.length;if(notation.length)renderReview()}
function renderReview(){const position=reviewStates[reviewIndex];drawStudyBoard('#review-board',position,null,null,flipped);$('#review-turn').textContent=(position.turn==='w'?'White':'Black')+' to move';$('#review-position').textContent=`Ply ${reviewIndex} / ${reviewStates.length-1}`;$('#review-title').textContent=reviewIndex?reviewNotation[reviewIndex-1]:'Starting position';const scores={p:1,n:3,b:3,r:5,q:9,k:0};const balance=position.board.reduce((n,p)=>n+(p?(core.color(p)==='w'?1:-1)*scores[p.toLowerCase()]:0),0);$('#review-material').textContent=balance?(balance>0?'White':'Black')+' has '+Math.abs(balance)+' more material points.':'Material is balanced.';$('#review-moves').innerHTML='';reviewNotation.forEach((m,i)=>{const b=document.createElement('button');b.textContent=(i%2===0?(i/2+1)+'. ':'')+m;b.className=i+1===reviewIndex?'active':'';b.onclick=()=>{reviewIndex=i+1;renderReview()};$('#review-moves').append(b)});$('#review-first').disabled=$('#review-prev').disabled=reviewIndex===0;$('#review-last').disabled=$('#review-next').disabled=reviewIndex===reviewStates.length-1;}
$('#review-first').onclick=()=>{reviewIndex=0;renderReview()};$('#review-prev').onclick=()=>{reviewIndex=Math.max(0,reviewIndex-1);renderReview()};$('#review-next').onclick=()=>{reviewIndex=Math.min(reviewStates.length-1,reviewIndex+1);renderReview()};$('#review-last').onclick=()=>{reviewIndex=reviewStates.length-1;renderReview()};$('#refresh-review').onclick=loadReview;
// Replay shortcuts stay inside Game Review and never edit the active match.
$('#review-prev').setAttribute('aria-keyshortcuts','ArrowLeft');$('#review-next').setAttribute('aria-keyshortcuts','ArrowRight');
$('#review-prev').title='Previous move (←)';$('#review-next').title='Next move (→)';
$('.review-controls').insertAdjacentHTML('afterend','<p class="review-keyboard-help">Use ← and → on your keyboard to replay moves.</p>');
document.addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight'].includes(event.key)||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey||event.isComposing)return;
  if(activeView!=='review'||$('#view-review').hidden||$('#review-content').hidden||document.querySelector('dialog[open]'))return;
  if(event.target.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="slider"]'))return;
  event.preventDefault();event.stopPropagation();
  const button=$(event.key==='ArrowRight'?'#review-next':'#review-prev');if(!button.disabled)button.click();
},true);
$('#review-export').onclick=()=>{const text=reviewPGN;const url=URL.createObjectURL(new Blob([text],{type:'application/x-chess-pgn'}));const a=document.createElement('a');a.href=url;a.download='chess-club-replay.pgn';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
async function api(route,body,token){const response=await fetch(route,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(8000)});let data;try{data=await response.json()}catch{throw Error('The game server is not available at this address.')}if(!response.ok)throw Error(data.error||'Could not complete the request.');return data;}
const localPGN=pgn;pgn=function(){let text=localPGN();if(online&&online.snapshot.variant!=='standard'){const first=structuredClone(online.snapshot.past[0]||online.snapshot.state);if(online.snapshot.variant==='960'){const start=WorkshopCore.setup960(online.snapshot.variantGame.number);first.rights=['w','b'].flatMap(side=>['short','long'].map(wing=>{const file=String.fromCharCode(97+start.castles[side][wing]%8);return side==='w'?file.toUpperCase():file})).join('')}const tags='[Variant "'+onlineVariantNames[online.snapshot.variant]+'"]\n[SetUp "1"]\n[FEN "'+StudyCore.toFEN(first)+'"]\n';text=tags+text}return text};
function onlineName(){return $('#online-name').value.trim()||'Guest'}
function rememberOnline(){try{sessionStorage.setItem('chess-club-online',JSON.stringify({id:online.id,token:online.token}));}catch{toast('Session storage is unavailable. Keep this tab open to stay connected.')}}
function backupLocal(){return {state,past,notation,config,remaining,clockPast,finished,started,flipped}}
function enterOnline(data,token=data.token){if(!online)localBackup=structuredClone(backupLocal());clearTimeout(aiTimer);if(online)clearInterval(online.poll);online={id:data.id,token,side:data.side,snapshot:data,receivedAt:performance.now(),busy:false,polling:false,error:null};selected=null;pending=null;if($('#promotion').open)$('#promotion').close();flipped=data.side==='b';rememberOnline();receiveOnline(data);online.poll=setInterval(pollOnline,1000);switchView('play');}
function receiveOnline(data){if(!online||data.id!==online.id||data.version<online.snapshot.version)return;const first=config.opponent!=='online',moved=data.notation.length>notation.length,changed=data.version!==online.snapshot.version;online.snapshot=data;online.receivedAt=performance.now();online.error=null;state=data.state;past=data.past;notation=data.notation;remaining={...data.remaining};finished=data.result;started=data.started;config={opponent:'online',human:data.side,time:data.time,difficulty:2};if(changed){selected=null;pending=null;if($('#promotion').open)$('#promotion').close()}if(first||changed)render();else{drawClocks();renderOnline()}if(!first&&moved)window.AcademyStyle?.play(data.result?'win':core.check(state,state.turn)?'check':'move')}
async function pollOnline(){const current=online;if(!current||current.busy||current.polling)return;current.polling=true;try{const data=await api('/api/rooms/'+current.id,undefined,current.token);if(online===current)receiveOnline(data)}catch(error){if(online===current){current.error='Connection interrupted. Retrying…';renderOnline();}}finally{current.polling=false}}
async function onlineAction(action,body={}){const current=online;if(!current||current.busy)return;current.busy=true;try{const data=await api('/api/rooms/'+current.id+'/'+action,body,current.token);if(online===current)receiveOnline(data)}catch(error){toast(error.message);if(online===current)current.error=error.message;}finally{current.busy=false;if(online===current){render();pollOnline();}}}
const onlineVariantNames={standard:'Standard chess',three:'Three-check',hill:'King of the Hill','960':'Chess960',blind:'Blindfold'};
function renderOnline(){const box=$('#online-summary');box.hidden=!online;$('#online-chat').hidden=!online;for(const id of ['undo','hint','new-game'])$('#'+id).disabled=!!online||(id==='undo'?!past.length:id==='hint'?!!finished:false);$('.settings').querySelectorAll('select').forEach(s=>s.disabled=!!online);const blind=online?.snapshot.variant==='blind'&&!online.snapshot.result;$('#board').classList.toggle('blindfold-board',blind);if(blind)for(const [pos,el]of [...$('#board').children].entries()){el.setAttribute('aria-label',core.square(flipped?63-pos:pos));el.classList.remove('legal','capture')}if(!online)return;const data=online.snapshot,opponent=data.players[core.other(online.side)],status=online.error||(data.waiting?(data.queue?'Looking for another player…':'Waiting for your friend to join…'):data.result?data.result.title:(state.turn===online.side?'Your move':'Opponent’s move')+(opponent?.connected?'':' · opponent reconnecting'));
box.innerHTML=`<h3><span class="spinner"></span>${data.waiting?'Your board is ready':'Online game'}</h3><div class="online-status" role="status">${escapeHTML(status)}</div><div class="muted">You play ${online.side==='w'?'White':'Black'} · Code ${data.id} · ${data.time/60} min · ${onlineVariantNames[data.variant]||'Standard chess'}</div>${data.variant==='three'?'<p>Checks: White '+data.variantGame.checks.w+' / 3 · Black '+data.variantGame.checks.b+' / 3</p>':''}${data.variant==='hill'?'<p>Reach d4, e4, d5 or e5 safely to win.</p>':''}${data.variant==='960'?'<p>Starting position '+data.variantGame.number+'</p><div class="inline-controls"><button class="secondary" id="online-castle-short">Castle kingside</button><button class="secondary" id="online-castle-long">Castle queenside</button></div>':''}<div class="inline-controls">${data.waiting?'<button class="secondary" id="copy-invite">Copy invitation</button>':'<button class="secondary" id="offer-draw">'+(data.drawOffer===core.other(online.side)?'Accept draw':data.drawOffer===online.side?'Draw offered':'Offer draw')+'</button>'}<button class="secondary" id="leave-online">${data.waiting?'Cancel search / room':'Leave board'}</button></div>${data.drawOffer===core.other(online.side)?'<button class="tiny-link" id="decline-draw">Decline draw offer</button>':''}`;
if(data.variant==='960')for(const wing of ['short','long']){const button=$('#online-castle-'+wing);button.disabled=!!data.result||data.waiting||online.busy||state.turn!==online.side||!WorkshopCore.castleMove(data.variantGame,wing);button.onclick=()=>onlineAction('move',{castle:wing,version:online.snapshot.version})}
if($('#copy-invite'))$('#copy-invite').onclick=async()=>{const url=new URL(location.href);url.hash='room='+data.id;try{await navigator.clipboard.writeText(url.href);toast('Invitation copied. Send it to your friend.')}catch{toast('Copy this game code: '+data.id)}};
if($('#offer-draw')){$('#offer-draw').disabled=!!data.result||data.drawOffer===online.side;$('#offer-draw').onclick=()=>onlineAction('draw',{accept:data.drawOffer===core.other(online.side)})}
if($('#decline-draw'))$('#decline-draw').onclick=()=>onlineAction('draw',{decline:true});
$('#leave-online').onclick=async()=>{if(data.waiting){await onlineAction('cancel');leaveOnline()}else $('#leave-dialog').showModal()};
$('.mode').textContent='Online · '+(onlineVariantNames[data.variant]||'Standard chess');$('#status-detail').textContent=status;
for(const [id,side]of [['top-player',flipped?'w':'b'],['bottom-player',flipped?'b':'w']]){$('#'+id+' strong').textContent=data.players[side]?.name||'Waiting…';$('#'+id+' small').textContent=(side==='w'?'White':'Black')+(side===online.side?' · You':' · Opponent')}
$('#chat-list').innerHTML='';for(const m of data.messages){const row=document.createElement('div');row.className='chat-message';const who=document.createElement('strong');who.textContent=(data.players[m.side]?.name||'Player')+': ';row.append(who,document.createTextNode(m.text));$('#chat-list').append(row)}$('#chat-list').scrollTop=$('#chat-list').scrollHeight;
$('#resign').disabled=!!data.result||data.waiting;
}
$('body').insertAdjacentHTML('beforeend','<dialog id="leave-dialog"><h3>Leave this board?</h3><p>The online game and its clock will continue. You can reconnect from the Online page in this tab, or resign before leaving.</p><div class="dialog-actions"><button class="secondary" id="stay-online">Stay here</button><button class="primary" id="confirm-leave">Leave board</button></div></dialog>');
$('#stay-online').onclick=()=>$('#leave-dialog').close();$('#confirm-leave').onclick=()=>{$('#leave-dialog').close();leaveOnline()};
function leaveOnline(){if(!online)return;clearInterval(online.poll);online=null;({state,past,notation,config,remaining,clockPast,finished,started,flipped}=localBackup);localBackup=null;selected=null;pending=null;lastTick=performance.now();render();scheduleAI();switchView('online');showReconnect();}
outcome=function(){return online?online.snapshot.result:original.outcome()};
render=function(){original.render();renderOnline()};
save=function(){if(!online)original.save()};
tick=function(){if(!online)return original.tick();const data=online.snapshot;remaining={...data.remaining};if(data.started&&!data.result&&!data.waiting)remaining[data.state.turn]=Math.max(0,remaining[data.state.turn]-(performance.now()-online.receivedAt));drawClocks()};
commit=function(m){if(online){if(online.busy||online.snapshot.waiting||state.turn!==online.side||finished)return;return onlineAction('move',{from:m.from,to:m.to,...(m.promotion?{promotion:m.promotion}:{}),version:online.snapshot.version})}return original.commit(m)};
choose=function(i){if(activeView!=='play')return;if(online&&(online.busy||online.snapshot.waiting||state.turn!==online.side||online.error))return;return original.choose(i)};
reset=function(){if(online)return toast('Leave the online game before starting a local game.');return original.reset()};
$('#hint').onclick=()=>{if(!online&&activeView==='play')original.hint()};$('#undo').onclick=()=>{if(!online&&activeView==='play')original.undo()};
$('#confirm-resign').onclick=()=>{if(online){$('#resign-dialog').close();return onlineAction('resign')}return original.resign()};
$('#chat-form').onsubmit=async e=>{e.preventDefault();const text=$('#chat-input').value.trim();if(text){await onlineAction('chat',{text});$('#chat-input').value=''}};
let connecting=false;
async function connectRoom(kind,id){if(connecting)return;if(online){switchView('play');return toast('Leave your current online board before joining another.')}connecting=true;$('#connection-status').textContent='Connecting…';try{const data=await api(kind==='join'?'/api/rooms/'+id+'/join':kind==='queue'?'/api/queue':'/api/rooms',{name:onlineName(),time:Number($('#online-time').value),variant:$('#online-variant').value,number:Number($('#online-960-number').value)});enterOnline(data);$('#connection-status').textContent='Game server connected.';}catch(error){$('#connection-status').textContent=error.message}finally{connecting=false}}
$('#online-variant').onchange=()=>{$('#online-960-label').hidden=$('#online-variant').value!=='960'};
$('#create-room').onclick=()=>connectRoom('create');$('#quick-match').onclick=()=>connectRoom('queue');$('#join-form').onsubmit=e=>{e.preventDefault();const raw=$('#room-code').value.trim(),match=raw.match(/(?:room=)?([a-f0-9]{12})(?:$|[&#])/i);if(!match)return toast('Enter the 12-character game code or invitation link.');connectRoom('join',match[1].toLowerCase())};
function showReconnect(){let session;try{session=JSON.parse(sessionStorage.getItem('chess-club-online'))}catch{}$('#reconnect-area').innerHTML='';if(session?.id&&session?.token){const b=document.createElement('button');b.className='secondary wide';b.textContent=online?'Return to your game':'Reconnect to your last online game';b.onclick=async()=>{if(online)return switchView('play');try{enterOnline(await api('/api/rooms/'+session.id,undefined,session.token),session.token)}catch(error){toast(error.message)}};$('#reconnect-area').append(b)}}
async function checkServer(){if(location.hostname.endsWith('.github.io')){$('#connection-status').textContent='Online multiplayer is not available on this GitHub Pages edition. Play the computer or share one board on this device.';$('#create-room').disabled=$('#quick-match').disabled=$('#join-room').disabled=true;return}if(location.protocol==='file:'){$('#connection-status').textContent='Online play needs the game server. Start it with npm start, then open http://localhost:8001.';$('#create-room').disabled=$('#quick-match').disabled=$('#join-room').disabled=true;return}try{await api('/api/health');$('#connection-status').textContent='Game server connected. Ready when you are.'}catch{$('#connection-status').textContent='Game server unavailable. Local games, lessons, and puzzles still work.'}}
updateStats();renderLessons();showReconnect();render();switchView('play');checkServer();
if(location.hash.startsWith('#room=')){$('#room-code').value=location.hash.slice(6);switchView('online')}

// Private board annotations: drawing never submits a chess move.
(()=>{
  const board=document.querySelector('#board');
  const wrap=document.createElement('div');wrap.className='annotation-board';
  board.before(wrap);wrap.append(board);
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
  svg.classList.add('board-arrows');svg.setAttribute('viewBox','0 0 800 800');svg.setAttribute('aria-hidden','true');wrap.append(svg);
  const controls=document.createElement('div');controls.className='arrow-controls';
  controls.innerHTML='<button type="button" class="secondary" id="arrow-mode" aria-pressed="false" aria-keyshortcuts="A" title="Draw arrows with your trackpad or mouse (A)">↗ Arrow mode</button><label>Shape <select id="drawing-shape"><option value="arrow">Arrow</option><option value="circle">Circle</option></select></label><label>Colour <select id="drawing-colour"><option value="#ef9c20">Gold</option><option value="#e75050">Red</option><option value="#32b878">Green</option><option value="#489aef">Blue</option></select></label><button type="button" class="secondary" id="undo-drawing">Undo drawing</button><button type="button" class="secondary" id="clear-arrows">Clear all arrows</button><span id="arrow-help" role="status">Laptop: turn on Arrow mode (A), then click two squares or click and drag. Right-drag also works.</span>';
  wrap.parentElement.after(controls);
  const quickClear=document.createElement('button');quickClear.type='button';quickClear.id='board-clear-arrows';quickClear.className='secondary';quickClear.textContent='Clear all arrows';quickClear.title='Remove every arrow and circle from the board';
  const drawingActions=document.createElement('div');drawingActions.className='board-drawing-actions';const quickMode=document.createElement('button');quickMode.type='button';quickMode.id='board-draw-mode';quickMode.className='secondary';
  const quickUndo=document.createElement('button');quickUndo.type='button';quickUndo.id='board-undo-drawing';quickUndo.className='secondary';quickUndo.textContent='Undo drawing';
  const drawingCount=document.createElement('span');drawingCount.id='board-drawing-count';
  drawingActions.append(quickMode,drawingCount,quickUndo,quickClear);wrap.parentElement.before(drawingActions);
  const modeButton=controls.querySelector('#arrow-mode'),help=controls.querySelector('#arrow-help');
  let arrows=[],history=[],mode=false,start=null,drag=null,position='';
  const colour=()=>controls.querySelector('#drawing-colour').value;
  const circles=()=>controls.querySelector('#drawing-shape').value==='circle';
  function remember(){history.push(arrows.map(a=>[...a]));if(history.length>64)history.shift()}
  function ringAt(i,tint){const [x,y]=point(i),ring=document.createElementNS(ns,'circle');ring.setAttribute('cx',x);ring.setAttribute('cy',y);ring.setAttribute('r','38');ring.style.stroke=tint;svg.append(ring);return ring}
  const point=i=>{const n=flipped?63-i:i;return [n%8*100+50,Math.floor(n/8)*100+50]};
  function paint(preview){
    svg.replaceChildren();
    for(const [from,to,tint=colour()] of [...arrows,...(preview?[preview]:[])]){
      if(from===to){const ring=ringAt(from,tint);ring.dataset.square=square(from);continue;}
      const [x,y]=point(from),[tx,ty]=point(to),angle=Math.atan2(ty-y,tx-x),length=Math.hypot(tx-x,ty-y);
      const shape=document.createElementNS(ns,'path');
      shape.setAttribute('d',`M 0 -9 L ${length-32} -9 L ${length-32} -23 L ${length} 0 L ${length-32} 23 L ${length-32} 9 L 0 9 Z`);
      shape.setAttribute('transform',`translate(${x} ${y}) rotate(${angle*180/Math.PI})`);
      shape.style.fill=tint;shape.dataset.colour=tint;shape.dataset.from=square(from);shape.dataset.to=square(to);svg.append(shape);
    }
    if(start!==null)ringAt(start,colour());
    controls.querySelector('#clear-arrows').disabled=!arrows.length&&start===null;
    quickClear.disabled=!arrows.length&&start===null;
    quickUndo.disabled=!history.length;
    quickMode.textContent=mode?'✓ Done drawing':'↗ Draw arrows';quickMode.setAttribute('aria-pressed',String(mode));
    drawingCount.textContent=mode?'Drawing mode · '+arrows.length+' marks':arrows.length?arrows.length+' marks':'';
    controls.querySelector('#undo-drawing').disabled=!history.length;
  }
  function clear(){arrows=[];start=null;drag=null;paint()}
  function toggle(from,to){
    const tint=colour(),index=arrows.findIndex(a=>a[0]===from&&a[1]===to);
    if(index<0&&arrows.length>=64){start=null;paint();help.textContent='Clear or undo a drawing to make room for more.';return}
    remember();
    if(index>=0){if(arrows[index][2]===tint)arrows.splice(index,1);else arrows[index][2]=tint}
    else arrows.push([from,to,tint]);
    start=null;paint();help.textContent=`${arrows.length} drawings. Repeat a drawing in the same colour to remove it.`;
  }
  function tap(i){if(circles())toggle(i,i);else if(start===null){start=i;paint();help.textContent='Choose the destination square (or the same square for a circle).'}else toggle(start,i)}
  function at(e){const r=board.getBoundingClientRect();if(e.clientX<r.left||e.clientX>=r.right||e.clientY<r.top||e.clientY>=r.bottom)return null;const n=Math.floor((e.clientY-r.top)/r.height*8)*8+Math.floor((e.clientX-r.left)/r.width*8);return flipped?63-n:n}
  modeButton.onclick=()=>{mode=!mode;start=null;drag=null;wrap.classList.toggle('drawing-arrows',mode);modeButton.setAttribute('aria-pressed',String(mode));help.textContent=mode?(circles()?'Click or tap a square to circle it. Turn drawing off to move pieces.':'Click or tap two squares, or click and drag. Press A or turn Arrow mode off to move pieces.'):'Laptop: turn on Arrow mode (A), then click two squares or click and drag. Right-drag also works.';paint()};
  document.addEventListener('keydown',e=>{
    if(e.key.toLowerCase()!=='a'||e.ctrlKey||e.metaKey||e.altKey||e.repeat||activeView!=='play'||e.target.closest('input,select,textarea,[contenteditable]')||document.querySelector('dialog[open]'))return;
    e.preventDefault();modeButton.click();
  });
  controls.querySelector('#drawing-shape').onchange=()=>{start=null;if(!mode)modeButton.click();else{help.textContent=circles()?'Click or tap a square to circle it.':'Click two squares or drag to draw an arrow.';paint()}};
  controls.querySelector('#drawing-colour').onchange=()=>paint();
  controls.querySelector('#undo-drawing').onclick=()=>{if(!history.length)return;arrows=history.pop();start=null;drag=null;paint();help.textContent='Last drawing change undone.'};
  quickMode.onclick=()=>modeButton.click();
  quickUndo.onclick=()=>controls.querySelector('#undo-drawing').click();
  quickClear.onclick=()=>controls.querySelector('#clear-arrows').click();
  controls.querySelector('#clear-arrows').onclick=()=>{if(arrows.length)remember();clear();help.textContent='Drawings cleared.'};
  board.addEventListener('contextmenu',e=>e.preventDefault());
  board.addEventListener('pointerdown',e=>{if(e.button!==2&&!(mode&&e.button===0))return;const i=at(e);if(i===null||drag)return;e.preventDefault();drag={id:e.pointerId,from:i,to:i,right:e.button===2};board.setPointerCapture(e.pointerId)});
  board.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;drag.to=at(e);paint(drag.to===null?null:[drag.from,circles()&&!drag.right?drag.from:drag.to])});
  board.addEventListener('pointerup',e=>{if(!drag||e.pointerId!==drag.id)return;const d=drag,to=at(e);drag=null;board.releasePointerCapture(e.pointerId);if(to===null){paint();return}if(circles()&&!d.right)toggle(d.from,d.from);else if(to!==d.from)toggle(d.from,to);else if(!d.right)tap(to);else toggle(to,to)});
  board.addEventListener('pointercancel',()=>{drag=null;paint()});
  board.addEventListener('lostpointercapture',()=>{if(drag){drag=null;paint()}});
  board.addEventListener('click',e=>{if(!mode)return;e.preventDefault();e.stopImmediatePropagation();if(e.detail===0){const cell=e.target.closest('.square');if(cell){const n=Array.from(board.children).indexOf(cell);tap(flipped?63-n:n)}}},true);
  board.addEventListener('keydown',e=>{if(e.key==='Escape'){if(arrows.length)remember();clear();if(mode)modeButton.click();help.textContent='Drawings cleared. Ready to move pieces.'}});
  new MutationObserver(()=>{const next=JSON.stringify([state.board,state.turn,past.length,online?.id]);if(position!==next){position=next;history=[];clear()}else paint()}).observe(board,{childList:true});
  position=JSON.stringify([state.board,state.turn,past.length,online?.id]);paint();
})();
