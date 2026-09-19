(function(root){
function randomSeed(seed){let n=2166136261;for(const c of seed)n=Math.imul(n^c.charCodeAt(0),16777619);return()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
class MemoryGame{
 constructor(pairs=8,random=Math.random){if(![6,8,12].includes(pairs))throw Error('Choose 6, 8, or 12 pairs');this.cards=Array.from({length:pairs*2},(_,i)=>({value:i%pairs,matched:false}));for(let i=this.cards.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[this.cards[i],this.cards[j]]=[this.cards[j],this.cards[i]]}this.open=[];this.moves=0;this.found=0;this.pairs=pairs}
 flip(i){const c=this.cards[i];if(!c||c.matched||this.open.includes(i)||this.open.length===2||this.won)return 'ignored';this.open.push(i);if(this.open.length===1)return 'first';this.moves++;if(this.cards[this.open[0]].value===c.value){for(const k of this.open)this.cards[k].matched=true;this.open=[];this.found++;return this.won?'won':'match'}return 'miss'}
 close(){this.open=[]}
 get won(){return this.found===this.pairs}
}
const api={MemoryGame,randomSeed};if(typeof module==='object'&&module.exports)module.exports=api;else root.LittleMatches=api;
})(globalThis);
