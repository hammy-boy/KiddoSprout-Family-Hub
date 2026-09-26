(function(){
  const pieces={k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'},names={k:'king',q:'queen',r:'rook',b:'bishop',n:'knight',p:'pawn'};
  function reduceTV(current,message){
    const d=message?.d;
    if(message?.t==='featured'&&d&&/^[a-zA-Z0-9]{8}$/.test(d.id)&&typeof d.fen==='string'&&Array.isArray(d.players))return {id:d.id,fen:d.fen,orientation:d.orientation==='black'?'black':'white',players:d.players,clocks:null,lastMove:null};
    if(message?.t==='fen'&&current&&d&&typeof d.fen==='string')return {...current,fen:d.fen,lastMove:/^[a-h][1-8][a-h][1-8]$/.test(d.lm)?d.lm:null,clocks:Number.isFinite(d.wc)&&Number.isFinite(d.bc)?{white:Math.max(0,d.wc),black:Math.max(0,d.bc)}:current.clocks};
    return current;
  }
  if(typeof module!=='undefined'){module.exports={reduceTV};return}
  function startLiveBoard(container,status,sourceLink){
    let stopped=false,controller,timer,clockTimer,lastData=0,game=null,position=null,retry=5000,clockAt=0;
    const top=document.createElement('div'),board=document.createElement('div'),bottom=document.createElement('div');
    top.className=bottom.className='tv-player';board.className='board tv-board';board.setAttribute('role','img');board.setAttribute('aria-label','Waiting for the live Lichess position');
    container.innerHTML='';const loading=document.createElement('div');loading.className='player-placeholder';loading.textContent='Connecting to the live Lichess game…';container.append(loading);
    function render(){
      try{position=ChessCore.fromFEN(game.fen)}catch{status.textContent='The live feed sent a position this board cannot display. Open the original game to watch.';return}
      if(!board.isConnected){container.innerHTML='';container.append(top,board,bottom)}
      board.innerHTML='';const reverse=game.orientation==='black';
      for(let visual=0;visual<64;visual++){const i=reverse?63-visual:visual,p=position.board[i],r=Math.floor(i/8),c=i%8,cell=document.createElement('div');const square=ChessCore.square(i);cell.className='square'+((r+c)%2?' dark':'')+(game.lastMove&&(game.lastMove.slice(0,2)===square||game.lastMove.slice(2)===square)?' last':'');cell.setAttribute('aria-label',square+(p?' '+(ChessCore.color(p)==='w'?'White ':'Black ')+names[p.toLowerCase()]:' empty'));if(p){const piece=document.createElement('span');piece.className='piece '+(ChessCore.color(p)==='w'?'white':'black');piece.textContent=pieces[p.toLowerCase()];cell.append(piece)}if(visual%8===0){const label=document.createElement('span');label.className='coord rank';label.textContent=8-r;cell.append(label)}if(visual>=56){const label=document.createElement('span');label.className='coord file';label.textContent='abcdefgh'[c];cell.append(label)}board.append(cell)}
      board.setAttribute('aria-label','Live Lichess board. '+(position.turn==='w'?'White':'Black')+' to move.');
      for(const [row,color]of [[top,reverse?'white':'black'],[bottom,reverse?'black':'white']]){row.innerHTML='';const player=game.players.find(p=>p.color===color),name=document.createElement('strong'),clock=document.createElement('span');name.textContent=[player?.user?.title,player?.user?.name||'Anonymous',Number.isFinite(player?.rating)?player.rating:''].filter(Boolean).join(' ');clock.className='tv-clock';clock.dataset.color=color;row.append(name,clock)}
      sourceLink.href='https://lichess.org/'+game.id;sourceLink.textContent='Open this game ↗';drawClocks();
    }
    function drawClocks(){for(const el of container.querySelectorAll('.tv-clock')){if(!game?.clocks){el.textContent='—';continue}const color=el.dataset.color,turn=position?.turn==='w'?'white':'black';const seconds=Math.ceil(Math.max(0,game.clocks[color]-(color===turn?(performance.now()-clockAt)/1000:0)));el.textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');el.classList.toggle('active',color===turn)}}
    async function connect(){if(stopped||document.hidden)return;const session=controller=new AbortController();lastData=Date.now();status.textContent=game?'Reconnecting to the live feed…':'Connecting to Lichess TV…';const watchdog=setInterval(()=>{if(Date.now()-lastData>60000)session.abort()},5000);try{
      const response=await fetch('https://lichess.org/api/tv/feed',{headers:{Accept:'application/x-ndjson'},signal:session.signal});if(!response.ok||!response.body){if(response.status===429)retry=60000;throw Error('Live feed unavailable')}
      const reader=response.body.getReader(),decoder=new TextDecoder();let pending='';
      while(!stopped){const {value,done}=await reader.read();if(done)break;lastData=Date.now();pending+=decoder.decode(value,{stream:true});if(pending.length>100000)throw Error('Unexpected live feed response');let end;while((end=pending.indexOf('\n'))>=0){const text=pending.slice(0,end).trim();pending=pending.slice(end+1);if(!text)continue;let message;try{message=JSON.parse(text)}catch{continue}const next=reduceTV(game,message);if(next!==game){game=next;if(message.t==='fen')clockAt=performance.now();retry=5000;render();status.textContent='Connected to Lichess TV · positions update automatically. Clocks are synchronized with move updates.'}}}
    }catch{}finally{clearInterval(watchdog);if(!stopped&&!document.hidden&&controller===session){status.textContent=game?'Live feed interrupted. Last position shown; reconnecting…':'Live feed unavailable. Retrying shortly; you can also open Lichess directly.';clearInterval(clockTimer);timer=setTimeout(()=>{clockTimer=setInterval(drawClocks,250);connect()},retry);retry=Math.min(60000,retry*2)}}}
    function visibility(){if(document.hidden){controller?.abort();controller=null;clearTimeout(timer);clearInterval(clockTimer);status.textContent='Live board paused while this tab is in the background.'}else if(!stopped){clockTimer=setInterval(drawClocks,250);connect()}}
    document.addEventListener('visibilitychange',visibility);clockTimer=setInterval(drawClocks,250);connect();
    return ()=>{stopped=true;controller?.abort();clearTimeout(timer);clearInterval(clockTimer);document.removeEventListener('visibilitychange',visibility)};
  }
  globalThis.startLiveBoard=startLiveBoard;
})();
