(function () {
  const C = typeof module !== 'undefined' ? require('../lib/chess-core') : ChessCore;
  function parseFEN(text) {
    const fields = text.trim().split(/\s+/);
    if (fields.length !== 6) throw Error('A FEN needs six fields: board, turn, castling, en passant, halfmove count, and move number.');
    const [board, turn, rights, ep, half, full] = fields;
    if (!/^(?:-|K?Q?k?q?)$/.test(rights) || !rights) throw Error('Castling rights must be KQkq, a subset in that order, or -.');
    if (!/^\d+$/.test(half) || !/^[1-9]\d*$/.test(full) || Number(full)>100000 || Number(half)>100000) throw Error('Invalid move counters.');
    if (!/^(?:-|[a-h][36])$/.test(ep)) throw Error('Invalid en passant square.');
    const state = C.fromFEN(fields.join(' '));
    if (state.board.slice(0,8).concat(state.board.slice(56)).some(p=>p?.toLowerCase()==='p')) throw Error('Pawns cannot remain on the first or eighth rank.');
    for (const side of ['w','b']) {
      const pieces = state.board.filter(p=>C.color(p)===side);
      if (pieces.length>16 || pieces.filter(p=>p.toLowerCase()==='p').length>8) throw Error('Too many pieces for one side.');
    }
    if (C.check(state,C.other(turn))) throw Error('The side that just moved cannot leave its own king in check.');
    for (const [right,king,rook,k,r] of [['K',60,63,'K','R'],['Q',60,56,'K','R'],['k',4,7,'k','r'],['q',4,0,'k','r']]) {
      if (rights.includes(right)&&(state.board[king]!==k||state.board[rook]!==r)) throw Error('Castling rights do not match the king and rook positions.');
    }
    if (ep!=='-') {
      const rank=turn==='w'?'6':'3', pawn=turn==='w'?'p':'P', behind=state.ep+(turn==='w'?8:-8), origin=state.ep+(turn==='w'?-8:8);
      if(ep[1]!==rank||state.board[state.ep]||state.board[behind]!==pawn||state.board[origin])throw Error('The en passant square does not match a two-square pawn move.');
    }
    return {state,fullmove:Number(full)};
  }
  function toFEN(state, fullmove=1) {
    const rows=[];
    for(let r=0;r<8;r++){let row='',empty=0;for(let c=0;c<8;c++){const p=state.board[r*8+c];if(p){if(empty)row+=empty;empty=0;row+=p}else empty++}if(empty)row+=empty;rows.push(row)}
    return `${rows.join('/')} ${state.turn} ${state.rights||'-'} ${state.ep===null?'-':C.square(state.ep)} ${state.half} ${fullmove}`;
  }
  function moves(state){return C.allMoves(state).flatMap(m=>state.board[m.from].toLowerCase()==='p'&&(m.to<8||m.to>=56)?['q','r','b','n'].map(promotion=>({...m,promotion})):[m])}
  function canonicalSAN(text){return text.replace(/0/g,'O').replace(/[+#?!]+$/g,'')}
  function parsePGN(text) {
    if(text.length>100000)throw Error('Please import a PGN smaller than 100 KB.');
    const tags={};
    let body=text.replace(/^\s*\[(\w+)\s+"((?:\\.|[^"\\])*)"\]\s*$/gm,(_,key,val)=>{tags[key]=val.replace(/\\(["\\])/g,'$1');return ''});
    body=body.replace(/\{[^}]*\}/g,' ').replace(/;[^\n]*/g,' ');
    if(/[{}]/.test(body))throw Error('The PGN has an unfinished comment.');
    // Read the main line and skip balanced recursive annotation variations.
    let depth=0,main='';for(const char of body){if(char==='(')depth++;else if(char===')'){if(!depth)throw Error('Unbalanced PGN variation.');depth--;}else if(!depth)main+=char}if(depth)throw Error('Unbalanced PGN variation.');
    main=main.replace(/\$\d+/g,' ').replace(/\d+\.(?:\.\.)?/g,' ');
    const root=tags.FEN?parseFEN(tags.FEN):{state:C.initial(),fullmove:1};
    const states=[root.state], notation=[], uci=[];let result='*',ended=false;
    const tokens=main.trim().split(/\s+/).filter(Boolean);
    if(tokens.length>1000)throw Error('Please import a game with at most 1,000 plies.');
    for(const token of tokens){if(/^(1-0|0-1|1\/2-1\/2|\*)$/.test(token)){if(ended)throw Error('Import one game at a time.');result=token;ended=true;continue}if(ended)throw Error('Import one game at a time.');if(token==='e.p.')continue;
      const state=states.at(-1),match=moves(state).filter(m=>canonicalSAN(C.notationFor(state,m))===canonicalSAN(token));
      if(match.length!==1)throw Error(`Cannot read move ${notation.length+1}: ${token}. It must be a legal SAN move.`);
      const m=match[0],next=C.apply(state,m);notation.push(C.completeNotation(state,m,next));uci.push(C.square(m.from)+C.square(m.to)+(m.promotion||''));states.push(next);
    }
    return {states,notation,uci,fullmove:root.fullmove,result,title:tags.Event||'Imported game'};
  }
  function exportPGN(line,title='Rookavelle Chess Academy ♛ study') {
    const escape=s=>String(s).replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/[\r\n]/g,' ');
    const fen=toFEN(line.states[0],line.fullmove), standard=toFEN(C.initial(),1);
    let number=line.fullmove,turn=line.states[0].turn;
    const moves=line.notation.map((san,i)=>{const prefix=turn==='w'?number+'. ':i===0?number+'... ':'';if(turn==='b')number++;turn=C.other(turn);return prefix+san});
    const result=line.result||'*';
    return `[Event "${escape(title)}"]\n[Result "${result}"]\n`+(fen!==standard?`[SetUp "1"]\n[FEN "${fen}"]\n`:'')+'\n'+moves.join(' ')+' '+result+'\n';
  }
  const values={p:100,n:320,b:335,r:500,q:900,k:0};
  function evaluate(s){return s.board.reduce((total,p,i)=>{if(!p)return total;const t=p.toLowerCase(),side=C.color(p),r=Math.floor(i/8),c=i%8;let score=values[t];if(t==='n'||t==='b')score+=(7-Math.abs(3.5-r)-Math.abs(3.5-c))*8;if(t==='p')score+=(side==='w'?6-r:r-1)*7;return total+(side==='w'?score:-score)},0)}
  function suggestions(state){
    const side=state.turn;
    return moves(state).map(m=>{const next=C.apply(state,m),responses=moves(next);let score;
      if(!responses.length)score=C.check(next,next.turn)?(side==='w'?100000:-100000):0;
      else {const scores=responses.map(reply=>{const replyState=C.apply(next,reply);if(C.check(replyState,replyState.turn)&&!C.allMoves(replyState).length)return side==='w'?-100000:100000;return evaluate(replyState)});score=side==='w'?Math.min(...scores):Math.max(...scores)}
      return {move:m,san:C.completeNotation(state,m,next),score};
    }).sort((a,b)=>side==='w'?b.score-a.score:a.score-b.score).slice(0,3);
  }
  // Bounded analysis for the club's own review, independent of third-party ratings.
  const MATE=30000;
  function classifyMove(loss,bestScore,playedScore,forced=false,{book=false,depth=0,secondScore=bestScore,sacrifice=false,terminal=false,positionScore=Infinity}={}){
    if(book)return 'Book';
    if(forced)return 'Best';
    if(bestScore>MATE-100&&playedScore<MATE-100)return 'Miss';
    if(loss<=25&&depth>=2&&playedScore>=200&&sacrifice)return 'Brilliant';
    if(loss<=1&&depth>=2&&!terminal&&positionScore<=150&&bestScore-secondScore>=150&&((playedScore>=-50&&secondScore<-50)||(playedScore>=200&&secondScore<200)))return 'Great';
    if(loss<=1)return 'Best';if(loss<=25)return 'Excellent';if(loss<=60)return 'Good';
    if(loss<=120)return 'Inaccuracy';if(loss<=250)return 'Mistake';return 'Blunder';
  }
  // A real material offer must remain a loss after an immediate recapture.
  // This catches pawns, exchanges and pieces captured by equally valuable pieces.
  function sacrificeEvidence(before,after){
    const side=before.turn,material=s=>s.board.reduce((sum,p)=>sum+(p?(C.color(p)===side?1:-1)*(values[p.toLowerCase()]||0):0),0),baseline=material(before);
    for(const capture of moves(after)){
      const target=capture.ep?capture.to+(after.turn==='w'?8:-8):capture.to;
      if(C.color(after.board[target])!==side)continue;
      const accepted=C.apply(after,capture);let recovered=material(accepted);
      for(const recapture of moves(accepted))if(recapture.to===capture.to)recovered=Math.max(recovered,material(C.apply(accepted,recapture)));
      const cost=baseline-recovered;if(cost>=100)return {square:C.square(target),value:cost,acceptance:C.square(capture.from)+C.square(capture.to)+(capture.promotion||'')};
    }
    return null;
  }
  // Prove short forcing mates after a material offer. Every legal defence is checked;
  // attacker moves are restricted to checks, so failure means unknown, not no mate.
  function sacrificeMate(state,attacker,maxPly=6,nodeLimit=12000){
    let nodes=0;const exhausted=Symbol('mate-budget');
    function visit(position,left){
      if(++nodes>nodeLimit)throw exhausted;
      const legal=moves(position),checked=C.check(position,position.turn);
      if(!legal.length)return checked&&position.turn!==attacker?0:null;
      if(!left||position.half>=100)return null;
      if(position.turn===attacker){
        for(const move of legal){const next=C.apply(position,move);if(!C.check(next,next.turn))continue;const distance=visit(next,left-1);if(distance!==null)return distance+1}
        return null;
      }
      let longest=0;for(const move of legal){const distance=visit(C.apply(position,move),left-1);if(distance===null)return null;longest=Math.max(longest,distance+1)}return longest;
    }
    try{const plies=visit(state,maxPly);return plies===null?null:{plies,nodes}}catch(error){if(error===exhausted)return null;throw error}
  }
  function openingFor(before,actual){
    const library=typeof module!=='undefined'?require('./openings.js'):(typeof OPENINGS!=='undefined'?OPENINGS:[]);
    const key=s=>toFEN(s).split(' ').slice(0,4).join(' '),wanted=key(before),played=C.square(actual.from)+C.square(actual.to)+(actual.promotion||'');
    for(const opening of library){let state=C.initial();for(const uci of opening.line){if(key(state)===wanted&&uci===played)return opening.name;const move=C.moveFromUCI(state,uci);if(!move)break;state=C.apply(state,move)}}
    return null;
  }
  function analyseMove(before,after,{depth=3,nodeLimit=16000}={}){
    depth=Math.max(1,Math.min(4,Math.floor(depth)));nodeLimit=Math.max(1000,Math.min(100000,Math.floor(nodeLimit)));
    const root=moves(before),key=s=>toFEN(s),actual=root.find(m=>key(C.apply(before,m))===key(after));
    if(!actual)throw Error('This game contains a position that does not follow a legal move.');
    let nodes=0,completedDepth=0;
    const budget=Symbol('budget'),ordered=list=>list.sort((a,b)=>b.priority-a.priority).map(x=>x.move);
    function order(s,list){return ordered(list.map(move=>({move,priority:(values[s.board[move.to]?.toLowerCase()]||0)*10-(values[s.board[move.from].toLowerCase()]||0)+(move.promotion?9000:0)+(move.ep?1000:0)})))}
    function score(s,d,alpha,beta,ply,quiet=2){
      if(++nodes>nodeLimit)throw budget;
      const legal=moves(s),checked=C.check(s,s.turn);
      if(!legal.length)return checked?-MATE+ply:0;
      const material=s.board.filter(p=>p&&p.toLowerCase()!=='k');
      if(s.half>=100||!material.length||(material.length===1&&/[bn]/i.test(material[0])))return 0;
      const stand=evaluate(s)*(s.turn==='w'?1:-1);
      let candidates=legal,best=-Infinity;
      if(d<=0){
        if(quiet<=0)return stand;
        if(!checked){best=stand;if(best>=beta)return best;alpha=Math.max(alpha,best);candidates=legal.filter(m=>s.board[m.to]||m.ep||m.promotion)}
      }
      for(const m of order(s,candidates)){const value=-score(C.apply(s,m),d-1,-beta,-alpha,ply+1,d<=0?quiet-1:quiet);best=Math.max(best,value);alpha=Math.max(alpha,value);if(alpha>=beta)break}
      return best;
    }
    // Keep only complete iterations so every candidate uses the same search depth.
    let scored=root.map(move=>{const next=C.apply(before,move),responses=moves(next);const value=!responses.length?(C.check(next,next.turn)?MATE-1:0):evaluate(next)*(before.turn==='w'?1:-1);return {move,score:value}});
    for(let d=1;d<=depth;d++){
      const iteration=[];try{for(const m of order(before,root)){iteration.push({move:m,score:-score(C.apply(before,m),d-1,-Infinity,Infinity,1)})}}catch(error){if(error===budget)break;throw error}
      scored=iteration;completedDepth=d;
    }
    const sacrifice=sacrificeEvidence(before,after),mateProof=sacrifice?sacrificeMate(after,before.turn):null;
    if(mateProof){const candidate=scored.find(x=>key(C.apply(before,x.move))===key(after));candidate.score=MATE-1-mateProof.plies;}
    scored.sort((a,b)=>b.score-a.score);
    const uci=m=>C.square(m.from)+C.square(m.to)+(m.promotion||''),played=scored.find(x=>uci(x.move)===uci(actual)),best=scored[0],loss=Math.max(0,best.score-played.score),side=before.turn;
    const opening=openingFor(before,actual);
    const label=classifyMove(loss,best.score,played.score,root.length===1,{book:!!opening,depth:mateProof?Math.max(2,completedDepth):completedDepth,secondScore:scored[1]?.score??best.score,sacrifice:!!sacrifice,positionScore:evaluate(before)*(side==='w'?1:-1),terminal:!moves(after).length}),playedSAN=C.completeNotation(before,actual,after),bestAfter=C.apply(before,best.move),bestSAN=C.completeNotation(before,best.move,bestAfter);
    let explanation=mateProof?'This move offers material and a deeper forcing-line check proves checkmate against every legal defence within '+mateProof.plies+' further plies. The offered piece does not have to be the piece that moved.':opening?'This move follows the '+opening+' line in the academy opening library.':label==='Brilliant'?'This move offers material, including any immediate recapture, while the search still finds a decisive advantage of at least 2.00 pawns. Brilliant takes priority over Great when both qualify.':label==='Great'?'From a difficult or balanced position, this is the only good or winning option found. The next candidate is at least 1.50 pawns worse and falls below that outcome threshold.':root.length===1?'Only one legal move was available.':label==='Miss'?`The search found a forced mate starting with ${bestSAN}; the played move did not preserve it at this depth.`:label==='Best'?`${playedSAN} ties for the best move found by this search.`:played.score<-MATE+100?`This move allows a forced mate within the searched line. Compare ${bestSAN}.`:`The search preferred ${bestSAN}. The played move gives up about ${(loss/100).toFixed(2)} pawns of evaluation.`;
    let reply=null;
    if(['Inaccuracy','Mistake','Blunder','Miss'].includes(label)){
      const candidate=suggestions(after)[0];
      if(candidate){const move=candidate.move,next=C.apply(after,move),checked=C.check(next,next.turn),mate=checked&&!moves(next).length;
        const pieceNames={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'},captured=move.ep?'p':after.board[move.to]?.toLowerCase();
        const reason=mate?'This is checkmate: your king is attacked and has no legal escape.':captured?'This reply captures your '+pieceNames[captured]+(checked?' and checks your king.':'.') :checked?'This reply checks your king, so you must answer the check.':'Compare this reply with the suggested improvement. Check which pieces and squares each move protects.';
        reply={uci:uci(move),san:candidate.san,reason};explanation+=' After '+playedSAN+', your opponent can play '+candidate.san+'. '+reason;
      }
    }
    return {side,played:uci(actual),san:playedSAN,best:uci(best.move),bestSAN,label,loss,score:played.score*(side==='w'?1:-1),beforeScore:best.score*(side==='w'?1:-1),accuracy:Math.round(100*Math.exp(-Math.min(loss,10000)/180)),depth:completedDepth,nodes,explanation,reply,sacrifice,mateProof,candidates:scored.slice(0,3).map(x=>({uci:uci(x.move),san:C.completeNotation(before,x.move,C.apply(before,x.move)),score:x.score*(side==='w'?1:-1)}))};
  }
  const StudyCore={parseFEN,toFEN,parsePGN,exportPGN,moves,suggestions,evaluate,analyseMove,classifyMove,sacrificeEvidence,sacrificeMate};
  if(typeof module!=='undefined')module.exports=StudyCore;else globalThis.StudyCore=StudyCore;
})();
