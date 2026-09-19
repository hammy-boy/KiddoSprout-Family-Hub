(function(root){
 const gardens=[
 {id:'seedlings',name:'Seedling Patch',icon:'🌱',description:'Start with three-letter words.',words:[
 ['cat','🐈','A pet that purrs.','The ___ slept on the mat.'],['sun','☀️','It lights up the daytime sky.','The ___ feels warm today.'],['pig','🐖','A farm animal with a snout.','The ___ rolled in the mud.'],['hat','👒','Something you wear on your head.','Put on your ___ outside.'],['bus','🚌','A large vehicle that carries passengers.','We took the ___ to school.'],['fox','🦊','A wild animal with a bushy tail.','The ___ ran through the woods.']]},
 {id:'blossoms',name:'Blossom Walk',icon:'🌼',description:'Grow into four-letter words.',words:[
 ['frog','🐸','An animal that hops and croaks.','A green ___ sat by the pond.'],['ship','🚢','A large boat.','The ___ sailed across the sea.'],['tree','🌳','A tall plant with a trunk.','Birds rested in the ___.'],['rain','🌧️','Water falling from clouds.','The ___ made puddles.'],['book','📖','It has pages to read.','I opened my favourite ___.'],['star','⭐','A shining object in the night sky.','We spotted a bright ___.']]},
 {id:'orchard',name:'Story Orchard',icon:'🍎',description:'Discover five-letter words.',words:[
 ['apple','🍎','A crunchy fruit that grows on a tree.','I ate a juicy ___.'],['house','🏠','A building where people live.','Our ___ has a blue door.'],['train','🚂','A vehicle that travels on rails.','The ___ stopped at the station.'],['cloud','☁️','A floating group of tiny water droplets or ice crystals.','A fluffy ___ crossed the sky.'],['green','🟢','The colour of many leaves.','The grass is ___.'],['smile','😊','A happy expression on your face.','Her joke made me ___.']]},
 {id:'meadow',name:'Wonder Meadow',icon:'🦋',description:'Try longer and trickier spellings.',words:[
 ['rabbit','🐇','An animal with long ears and a short tail.','The ___ nibbled a carrot.'],['school','🏫','A place where children go to learn.','We learn together at ___.'],['friend','🤝','Someone you enjoy spending time with.','I played a game with my ___.'],['because','💭','A word that introduces a reason.','I wore boots ___ it was wet.'],['beautiful','🌸','A word meaning lovely to look at or experience.','The garden looks ___.'],['elephant','🐘','A large animal with a trunk.','The ___ sprayed water.']]}
 ];
 function shuffle(values,random=Math.random){const out=[...values];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
 function tiles(word,random=Math.random){let letters=shuffle([...word],random);if(letters.join('')===word&&new Set(word).size>1){const j=letters.findIndex(c=>c!==letters[0]);[letters[0],letters[j]]=[letters[j],letters[0]]}return letters}
 function hint(word,letters,selected){let prefix=0;while(prefix<selected.length&&letters[selected[prefix]]===word[prefix])prefix++;const result=[];for(const char of word.slice(0,Math.min(prefix+1,word.length))){const i=letters.findIndex((c,j)=>c===char&&!result.includes(j));result.push(i)}return result}
 const api={gardens,shuffle,tiles,hint};if(typeof module==='object')module.exports=api;else root.WordGarden=api;
})(typeof window==='object'?window:globalThis);
