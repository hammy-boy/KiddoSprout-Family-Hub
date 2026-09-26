const {test}=require('node:test');const assert=require('node:assert/strict');
const {create}=require('../games/language-garden/tutor-engine.js');
const cards=[{text:'árbol',meaning:'Tree',topic:'Nature',note:'A plant.'},{text:'flor',meaning:'Flower',topic:'Nature',note:'A blossom.'}];
test('Assisted answers cannot earn unassisted credit and all tricky words return',()=>{
 const s=create(cards,{random:()=>.999});assert.equal(s.answer('wrong').kind,'retry');assert.equal(s.state().index,0);s.next();assert.equal(s.state().index,0);s.hint();assert.equal(s.answer('Tree').kind,'correct');assert.equal(s.answer('Tree').kind,'inactive');s.next();assert.equal(s.reveal(),'Flower');s.next();assert.equal(s.state().done,true);assert.equal(s.state().clean,0);assert.equal(s.state().missed,2);assert(s.review());assert.equal(s.answer('tree').kind,'correct');s.next();assert.equal(s.answer('flower').kind,'correct');s.next();assert.equal(s.state().clean,2);assert.equal(s.state().missed,0);assert.equal(s.review(),false);
});
test('Writing practice preserves accents, allows punctuation and declared alternatives',()=>{
 const s=create(cards,{direction:'word',topic:'Nature',size:1,random:()=>.999});assert.equal(s.answer('arbol').kind,'almost');assert.equal(s.answer(' ÁRBOL! ').kind,'correct');assert.equal(s.state().clean,0);
 const variants=create([{text:'obrigado / obrigada',meaning:'Thank you'}],{direction:'word'});assert.equal(variants.answer('obrigada').kind,'correct');
 const displayedVariant=create([{text:'obrigado / obrigada',meaning:'Thank you'}],{direction:'word'});assert.equal(displayedVariant.answer('obrigado / obrigada').kind,'correct');
});
test('Topics, empty decks and user text remain bounded and do not mutate course data',()=>{
 const snapshot=JSON.stringify(cards);const s=create(cards,{topic:'Absent'});assert.equal(s.state().done,true);assert.equal(s.answer('anything').kind,'inactive');assert.equal(s.reveal(),'');assert.equal(s.review(),false);assert.equal(JSON.stringify(cards),snapshot);
 const normal=create(cards);assert.equal(normal.answer('   ').kind,'empty');assert.equal(normal.state().missed,0);
});
test('Hints preserve grapheme clusters and sessions handle RTL answers',()=>{
 const s=create([{text:'שמש',meaning:'Sun',topic:'Nature'}],{direction:'word'});assert.equal(s.state().prompt,'Sun');assert.equal(s.answer('שמש').kind,'correct');s.next();assert.equal(s.state().done,true);
 const cluster=create([{text:'छह',meaning:'Six'}],{direction:'word'});assert.ok(cluster.hint().startsWith('छ'));
});
