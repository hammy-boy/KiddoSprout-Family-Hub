(function(root){
'use strict';
const normalize=value=>String(value).normalize('NFC').toLocaleLowerCase().replace(/[\p{P}\p{S}]/gu,' ').replace(/\s+/g,' ').trim();
const loose=value=>normalize(value).normalize('NFD').replace(/\p{M}/gu,'');
function create(cards,{direction='meaning',topic='all',size=5,random=Math.random}={}){
  let deck=cards.filter(c=>c&&typeof c.text==='string'&&typeof c.meaning==='string'&&c.text.trim()&&c.meaning.trim()&&(topic==='all'||c.topic===topic)).map(c=>({...c}));
  for(let i=deck.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
  deck=deck.slice(0,Math.max(1,Math.min(10,size)));
  let index=0,clean=0,helped=false,attempted=false,solved=false;const missed=[];
  const target=()=>direction==='word'?deck[index]?.text:deck[index]?.meaning;
  const remember=()=>{const c=deck[index];if(c&&!missed.includes(c))missed.push(c)};
  const state=()=>({card:deck[index],prompt:direction==='word'?deck[index]?.meaning:deck[index]?.text,target:target(),index,total:deck.length,done:index>=deck.length,solved,clean,missed:missed.length,direction});
  return {state,
    answer(value){if(index>=deck.length||solved)return {kind:'inactive'};if(!normalize(value))return {kind:'empty'};
      const answers=direction==='word'?target().split(/\s*\/\s*/):[target()];
      if(answers.some(a=>normalize(a)===normalize(value))){if(!helped&&!attempted)clean++;solved=true;return {kind:'correct',note:deck[index].note||''};}
      attempted=true;remember();return {kind:answers.some(a=>loose(a)===loose(value))?'almost':'retry'};
    },
    hint(){if(index>=deck.length||solved)return '';helped=true;remember();const parts=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(target())].map(p=>p.segment):Array.from(target());return `${parts[0]}${parts.slice(1).map(c=>/\s/.test(c)?' ':'·').join('')}`;},
    reveal(){if(index>=deck.length)return '';if(!solved){helped=true;remember();solved=true;}return target();},
    next(){if(!solved||index>=deck.length)return state();index++;helped=false;attempted=false;solved=false;return state();},
    review(){if(index<deck.length||!missed.length)return false;deck=[...missed];missed.length=0;index=0;clean=0;helped=false;attempted=false;solved=false;return true;}
  };
}
const api={create,normalize};if(typeof module==='object'&&module.exports)module.exports=api;else root.LanguageTutor=api;
})(typeof window==='object'?window:globalThis);
