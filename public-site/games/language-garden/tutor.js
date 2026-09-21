(function(root){
'use strict';
const $=id=>document.getElementById(id);let course=null,session=null,savedRound=false;
function say(text){$('tutor-feedback').textContent=text;}
function show(){
  const s=session.state();$('tutor-answer').value='';$('tutor-answer').disabled=s.done||s.solved;
  for(const id of ['tutor-submit','tutor-hint','tutor-reveal'])$(id).disabled=s.done||s.solved;
  $('tutor-next').disabled=!s.solved||s.done;$('tutor-review').hidden=!s.done||!s.missed;
  if(s.done){$('tutor-prompt').textContent='Round complete!';$('tutor-step').textContent=`${s.clean} of ${s.total} without help`;say(s.missed?`You practised ${s.total} words. Let’s revisit the ${s.missed} you needed help with.`:'You remembered every word without help. Choose another topic or try the other direction!');
    if(!savedRound&&s.total){savedRound=true;try{const raw=JSON.parse(localStorage.getItem('sprout-language-tutor')||'{}');const data=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};const previous=Number(data[course.id]?.rounds)||0;data[course.id]={rounds:Math.min(previous+1,100000),lastCorrect:s.clean,lastTotal:s.total};localStorage.setItem('sprout-language-tutor',JSON.stringify(data));$('tutor-saved').textContent='Round saved in this browser.';}catch{$('tutor-saved').textContent='This round could not be saved; you can still practise.';}}
    return;
  }
  $('tutor-step').textContent=`Word ${s.index+1} of ${s.total} · ${s.card.topic||'Your words'}`;
  $('tutor-prompt').textContent=s.prompt;$('tutor-prompt').lang=s.direction==='word'?'en':course.locale;$('tutor-prompt').dir=s.direction==='word'?'ltr':course.dir;
  $('tutor-answer').lang=s.direction==='word'?course.locale:'en';$('tutor-answer').dir=s.direction==='word'?course.dir:'ltr';
  $('tutor-answer-label').textContent=s.direction==='word'?`Type the ${course.name} word from your cards`:'Type the English meaning from your cards';
  say(s.direction==='word'?'Try the word you learned. You can ask for a hint at any time.':'What does this word mean? Try it, or ask for a hint.');$('tutor-answer').focus();
}
function start(){if(!course)return;session=LanguageTutor.create(course.cards,{direction:$('tutor-direction').value,topic:$('tutor-topic').value});savedRound=false;$('tutor-saved').textContent='';$('tutor-round').hidden=false;show();}
function close(){session=null;course=null;$('tutor-panel').classList.add('hidden');}
root.SproutTutor={close,open(details){course=details;session=null;$('tutor-panel').classList.remove('hidden');$('tutor-round').hidden=true;$('tutor-title').textContent=`Sprout Tutor · ${course.name}`;$('tutor-topic').replaceChildren();
  for(const topic of ['all',...new Set(course.cards.map(c=>c.topic||'Your words'))]){const o=document.createElement('option');o.value=topic;o.textContent=topic==='all'?'All topics':topic;$('tutor-topic').append(o);}
  course.cards=course.cards.map(c=>({...c,topic:c.topic||'Your words'}));$('tutor-begin').disabled=!course.cards.length;$('tutor-panel').scrollIntoView({block:'start'});$('tutor-begin').focus();
}};
$('tutor-begin').onclick=start;$('tutor-close').onclick=()=>{close();$('tutor-start').focus();};
$('tutor-form').onsubmit=event=>{event.preventDefault();if(!session)return;const result=session.answer($('tutor-answer').value);
  if(result.kind==='correct'){say(`That’s right! ${result.note}`);$('tutor-answer').disabled=true;for(const id of ['tutor-submit','tutor-hint','tutor-reveal'])$(id).disabled=true;$('tutor-next').disabled=false;$('tutor-next').focus();}
  else if(result.kind==='almost')say('Almost! Check the accents or marks in the word. Try again, or reveal the card.');
  else if(result.kind==='retry')say('Not quite the word on this card. Try again, ask for a hint, or reveal it to learn.');
  else if(result.kind==='empty')say('Type an answer first, or choose Hint.');
};
$('tutor-hint').onclick=()=>{if(session){say(`Here’s the first letter: ${session.hint()}`);$('tutor-answer').focus();}};
$('tutor-reveal').onclick=()=>{if(!session)return;const answer=session.reveal();say(`The card’s answer is ${answer}. ${session.state().card.note||''} We’ll revisit this word after the round.`);for(const id of ['tutor-submit','tutor-hint','tutor-reveal','tutor-answer'])$(id).disabled=true;$('tutor-next').disabled=false;$('tutor-next').focus();};
$('tutor-next').onclick=()=>{if(session){session.next();show();}};
$('tutor-review').onclick=()=>{if(session&&session.review()){savedRound=false;show();}};
for(const id of ['tutor-topic','tutor-direction'])$(id).onchange=()=>{session=null;$('tutor-round').hidden=true;};
})(window);
