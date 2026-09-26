(function(){
'use strict';
const color=p=>p?(p===p.toUpperCase()?'w':'b'):null, other=c=>c==='w'?'b':'w', square=i=>'abcdefgh'[i%8]+(8-Math.floor(i/8));
function initial(){return {board:('rnbqkbnrpppppppp'+'.'.repeat(32)+'PPPPPPPPRNBQKBNR').split('').map(p=>p==='.'?null:p),turn:'w',rights:'KQkq',ep:null,half:0};}
function attacked(s,index,by){const r=Math.floor(index/8),c=index%8;for(let i=0;i<64;i++){const p=s.board[i];if(color(p)!==by)continue;const y=Math.floor(i/8),x=i%8,dy=r-y,dx=c-x,t=p.toLowerCase();if(t==='p'&&dy===(by==='w'?-1:1)&&Math.abs(dx)===1)return true;if(t==='n'&&Math.abs(dx)*Math.abs(dy)===2)return true;if(t==='k'&&Math.max(Math.abs(dx),Math.abs(dy))===1)return true;if((t==='b'||t==='q')&&Math.abs(dx)===Math.abs(dy)||((t==='r'||t==='q')&&(dx===0||dy===0))){if(!dx&&!dy)continue;let yy=y+Math.sign(dy),xx=x+Math.sign(dx),clear=true;while(yy!==r||xx!==c){if(s.board[yy*8+xx]){clear=false;break}yy+=Math.sign(dy);xx+=Math.sign(dx)}if(clear)return true}}return false}
function check(s,c){return attacked(s,s.board.indexOf(c==='w'?'K':'k'),other(c))}
function pseudo(s,from){const p=s.board[from];if(!p)return [];const side=color(p),r=Math.floor(from/8),c=from%8,t=p.toLowerCase(),out=[];function add(y,x,extra={}){if(y<0||y>7||x<0||x>7)return false;const to=y*8+x,target=s.board[to];if(color(target)===side||target?.toLowerCase()==='k')return false;out.push({from,to,...extra});return !target}
if(t==='p'){const d=side==='w'?-1:1,y=r+d;if(y>=0&&y<8){if(!s.board[y*8+c]){add(y,c);if(r===(side==='w'?6:1)&&!s.board[(r+2*d)*8+c])add(r+2*d,c)}for(const x of [c-1,c+1])if(x>=0&&x<8){const to=y*8+x;if(color(s.board[to])===other(side))add(y,x);else if(to===s.ep)add(y,x,{ep:true})}}}
else if(t==='n'){for(const [dy,dx]of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])add(r+dy,c+dx)}
else {const dirs=t==='b'?[[1,1],[1,-1],[-1,1],[-1,-1]]:t==='r'?[[1,0],[-1,0],[0,1],[0,-1]]:[[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];for(const [dy,dx]of dirs)for(let n=1;n<=(t==='k'?1:7);n++)if(!add(r+dy*n,c+dx*n))break;
if(t==='k'&&from===(side==='w'?60:4)&&!check(s,side)){for(const [right,rook,step]of side==='w'?[['K',63,1],['Q',56,-1]]:[['k',7,1],['q',0,-1]]){if(!s.rights.includes(right)||s.board[rook]!==(side==='w'?'R':'r'))continue;let clear=true;for(let i=from+step;i!==rook;i+=step)if(s.board[i])clear=false;if(clear&& !attacked(s,from+step,other(side))&&!attacked(s,from+2*step,other(side)))out.push({from,to:from+2*step,castle:rook})}}}return out}
function apply(s,m){const n={...s,board:[...s.board]},p=n.board[m.from],capture=n.board[m.to];n.board[m.from]=null;n.board[m.to]=m.promotion?(color(p)==='w'?m.promotion.toUpperCase():m.promotion):p;if(m.ep)n.board[m.to+(color(p)==='w'?8:-8)]=null;if(m.castle!==undefined){n.board[(m.from+m.to)/2]=n.board[m.castle];n.board[m.castle]=null}for(const [idx,right]of [[0,'q'],[7,'k'],[56,'Q'],[63,'K']])if(m.from===idx||m.to===idx)n.rights=n.rights.replace(right,'');if(p==='K')n.rights=n.rights.replace(/[KQ]/g,'');if(p==='k')n.rights=n.rights.replace(/[kq]/g,'');n.ep=p.toLowerCase()==='p'&&Math.abs(m.to-m.from)===16?(m.to+m.from)/2:null;n.half=p.toLowerCase()==='p'||capture||m.ep?0:s.half+1;n.turn=other(s.turn);return n}
function legal(s,from){return pseudo(s,from).filter(m=>!check(apply(s,m),color(s.board[from])))}
function allMoves(s){return s.board.flatMap((p,i)=>color(p)===s.turn?legal(s,i):[])}
function positionKey(s){const ep=s.ep!==null&&allMoves(s).some(m=>m.ep)?s.ep:'-';return s.board.map(p=>p||'.').join('')+s.turn+s.rights+ep}
function getOutcome(state,past=[]){const moves=allMoves(state),checked=check(state,state.turn);if(!moves.length)return checked?{title:(state.turn==='w'?'Black':'White')+' wins',detail:'Checkmate. A game well played.'}:{title:'Draw by stalemate',detail:'The king is safe, but there are no legal moves.'};if(state.half>=100)return {title:'Draw · fifty-move rule',detail:'Fifty moves each without a pawn move or capture.'};const key=positionKey(state);if(past.filter(s=>positionKey(s)===key).length>=2)return {title:'Draw by repetition',detail:'The same position has appeared three times.'};const pieces=state.board.map((p,i)=>({p,i})).filter(x=>x.p&&x.p.toLowerCase()!=='k');if(!pieces.length||(pieces.length===1&&/[bn]/i.test(pieces[0].p))||(pieces.every(x=>x.p.toLowerCase()==='b')&&new Set(pieces.map(x=>(Math.floor(x.i/8)+x.i%8)%2)).size===1))return {title:'Draw · insufficient material',detail:'Neither side has enough material to checkmate.'};return null}
function notationFor(state,m){const p=state.board[m.from],t=p.toLowerCase(),capture=state.board[m.to]||m.ep;if(m.castle!==undefined)return m.to>m.from?'O-O':'O-O-O';let prefix=t==='p'?(capture?square(m.from)[0]:''):p.toUpperCase();if(t!=='p'){const rivals=allMoves(state).filter(x=>x.to===m.to&&x.from!==m.from&&state.board[x.from]===p);if(rivals.length)prefix+=rivals.every(x=>x.from%8!==m.from%8)?square(m.from)[0]:rivals.every(x=>Math.floor(x.from/8)!==Math.floor(m.from/8))?square(m.from)[1]:square(m.from)}return prefix+(capture?'x':'')+square(m.to)+(m.promotion?'='+m.promotion.toUpperCase():'')}

function fromFEN(fen){
 const [placement,turn,rights,ep,half='0']=fen.trim().split(/\s+/);const board=[];
 if(!placement||!['w','b'].includes(turn))throw Error('Invalid FEN');
 for(const row of placement.split('/')){let count=0;for(const char of row){if(/[1-8]/.test(char)){board.push(...Array(Number(char)).fill(null));count+=Number(char)}else if(/^[prnbqkPRNBQK]$/.test(char)){board.push(char);count++}else throw Error('Invalid piece')}if(count!==8)throw Error('Invalid rank')}
 if(board.length!==64||board.filter(p=>p==='K').length!==1||board.filter(p=>p==='k').length!==1)throw Error('Invalid kings');
 return {board,turn,rights:rights==='-'?'':rights,ep:ep==='-'?null:indexOfSquare(ep),half:Number(half)};
}
function indexOfSquare(name){if(!/^[a-h][1-8]$/.test(name))throw Error('Invalid square');return (8-Number(name[1]))*8+name.charCodeAt(0)-97}
function resolveMove(state,input){
 if(!input||!Number.isInteger(input.from)||!Number.isInteger(input.to)||color(state.board[input.from])!==state.turn)return null;
 const move=legal(state,input.from).find(m=>m.to===input.to);if(!move)return null;
 const promotes=state.board[move.from].toLowerCase()==='p'&&(move.to<8||move.to>=56);
 if(promotes){if(!['q','r','b','n'].includes(input.promotion))return null;move.promotion=input.promotion}else if(input.promotion)return null;
 return move;
}
function moveFromUCI(state,uci){return resolveMove(state,{from:indexOfSquare(uci.slice(0,2)),to:indexOfSquare(uci.slice(2,4)),...(uci[4]?{promotion:uci[4]}:{})})}
function completeNotation(state,move,next){return notationFor(state,move)+(check(next,next.turn)?(allMoves(next).length?'+':'#'):'')}
const ChessCore={color,other,square,initial,attacked,check,pseudo,apply,legal,allMoves,positionKey,getOutcome,notationFor,fromFEN,indexOfSquare,resolveMove,moveFromUCI,completeNotation};
if(typeof module!=='undefined')module.exports=ChessCore;else globalThis.ChessCore=ChessCore;

})();
