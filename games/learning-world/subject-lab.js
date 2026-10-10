(()=>{
 const main=document.getElementById('main-content');
 const subject=LearningWorld.subjects.find(item=>item.id===main.dataset.subject);
 if(!subject||!subject.activity)throw new Error('This subject lab is not configured.');
 const $=id=>document.getElementById(id);
 const accent={maths:'#91e0bd',english:'#f6c879',science:'#67ddcf',geography:'#83cbff',history:'#f1b86d',computing:'#b6a0ff',art:'#ff9fc3',music:'#f5d36d',languages:'#8ee0d2'}[subject.id];
 document.documentElement.style.setProperty('--accent',accent);
 document.title=`${subject.name} Lab · KiddoSprout`;
 $('subject-icon').textContent=subject.icon;
 $('subject-name').textContent=subject.name;
 $('subject-place').textContent=subject.place;
 $('subject-description').textContent=subject.description;
 const studySection=document.createElement('section');studySection.className='section';studySection.setAttribute('aria-labelledby','study-heading');
 const studyHeading=document.createElement('div');studyHeading.className='section-heading';
 const studyHeadingContent=document.createElement('div');
 const studyEyebrow=document.createElement('p');studyEyebrow.className='eyebrow';studyEyebrow.textContent='LEARN THE IDEAS';
 const studyTitle=document.createElement('h2');studyTitle.id='study-heading';studyTitle.textContent='Explore this subject';
 const studyDescription=document.createElement('p');studyDescription.textContent=`Explore key ideas in ${subject.name.toLowerCase()} with examples and quick self-checks.`;
 studyHeadingContent.append(studyEyebrow,studyTitle,studyDescription);studyHeading.append(studyHeadingContent);studySection.append(studyHeading);
 const topics=document.createElement('div');topics.className='choice-grid';topics.setAttribute('role','group');topics.setAttribute('aria-label','Choose a study topic');
 const studyCard=document.createElement('article');studyCard.className='activity-board';studyCard.setAttribute('aria-live','polite');
 const topicTitle=document.createElement('h3');topicTitle.className='task-prompt';topicTitle.tabIndex=-1;
 const topicText=document.createElement('p');topicText.className='task-detail';
 const topicExample=document.createElement('p');topicExample.className='task-detail';
 const topicCheck=document.createElement('p');topicCheck.className='task-detail';
 const reveal=document.createElement('button');reveal.type='button';reveal.className='action-button';reveal.textContent='Show answer';
 const topicAnswer=document.createElement('p');topicAnswer.className='feedback';topicAnswer.hidden=true;topicAnswer.setAttribute('aria-live','polite');
 studyCard.append(topicTitle,topicText,topicExample,topicCheck,reveal,topicAnswer);studySection.append(topics,studyCard);
 $('subject-description').closest('.hero').after(studySection);
 function selectStudyTopic(index){
  const topic=subject.study[index];topicTitle.textContent=topic.title;topicText.textContent=topic.text;topicExample.textContent=`Example: ${topic.example}`;topicCheck.textContent=`Quick check: ${topic.check}`;topicAnswer.textContent=topic.answer;topicAnswer.hidden=true;reveal.textContent='Show answer';
  topics.querySelectorAll('button').forEach((item,itemIndex)=>item.setAttribute('aria-pressed',String(itemIndex===index)))
 }
 subject.study.forEach((topic,index)=>topics.append(button(topic.title,()=>selectStudyTopic(index))));
 reveal.addEventListener('click',()=>{topicAnswer.hidden=!topicAnswer.hidden;reveal.textContent=topicAnswer.hidden?'Show answer':'Hide answer'});
 selectStudyTopic(0);
 $('activity-title').textContent=subject.activity.title;
 $('activity-instructions').textContent=subject.activity.instructions;
 $('subject-back').href='index.html';
 const rounds=subject.activity.rounds;
 const board=$('activity-board'),feedback=$('activity-feedback'),finish=$('activity-finish');
 let roundIndex=0,activityPoints=0,selectedNumbers=[],spellTarget='',spellBuilt=[],robotCommands=[],rhythmInput=[];
 function showFeedback(text,correct){feedback.textContent=text;feedback.className=`feedback ${correct?'success':'retry'}`}
 function button(label,onClick,extraClass='choice-button'){
  const element=document.createElement('button');element.type='button';element.className=extraClass;element.textContent=label;element.addEventListener('click',onClick);return element
 }
 function completeActivity(correct,message){
  if(correct)activityPoints++;
  showFeedback(message,correct);
  roundIndex++;
  if(roundIndex>=rounds.length){finish.textContent=`Activity complete! You solved ${activityPoints} of ${rounds.length} tasks.`;finish.classList.add('visible');const next=button('Continue to the quiz ↓',()=>{$('quiz-section').hidden=false;$('quiz-section').scrollIntoView({behavior:'smooth',block:'start'});startQuiz()},'action-button primary');$('activity-actions').replaceChildren(next);return}
  $('activity-progress').textContent=`Task ${roundIndex} of ${rounds.length} complete`;
  const next=button('Next task →',renderActivity,'action-button');$('activity-actions').replaceChildren(next)
 }
 function renderActivity(){
  const task=rounds[roundIndex];
  board.replaceChildren();feedback.textContent='';feedback.className='feedback';finish.classList.remove('visible');$('activity-actions').replaceChildren();
  $('activity-progress').textContent=`Task ${roundIndex+1} of ${rounds.length}`;
  if(subject.activity.type==='number-pairs'){
   const prompt=document.createElement('p');prompt.className='task-prompt';prompt.textContent=`Make ${task.target}`;board.append(prompt);
   const detail=document.createElement('p');detail.className='task-detail';detail.textContent=`Choose two number tiles. Selected: ${selectedNumbers.join(' + ')||'none'}`;board.append(detail);
   selectedNumbers=[];
   const choices=document.createElement('div');choices.className='choice-grid';
   task.numbers.forEach((number,index)=>choices.append(button(String(number),event=>{if(selectedNumbers.length>=2)return;selectedNumbers.push(number);detail.textContent=`Make ${task.target} · Selected: ${selectedNumbers.join(' + ')}`;event.currentTarget.disabled=true;if(selectedNumbers.length===2){const answer=selectedNumbers.reduce((sum,value)=>sum+value,0);completeActivity(answer===task.target,answer===task.target?`${selectedNumbers.join(' + ')} makes ${task.target}.`:`${selectedNumbers.join(' + ')} makes ${answer}. Try the next number puzzle.`)}},'choice-button')));
   board.append(choices)
  }else if(subject.activity.type==='spell-it'){
   spellTarget=task;spellBuilt=[];
   const prompt=document.createElement('p');prompt.className='task-prompt';prompt.textContent=`Spell this word: ${task}`;board.append(prompt);
   const built=document.createElement('p');built.className='task-detail';built.setAttribute('aria-live','polite');built.textContent='Your letters: —';board.append(built);
   const letters=task.split('');for(let i=letters.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[letters[i],letters[j]]=[letters[j],letters[i]]}
   const choices=document.createElement('div');choices.className='choice-grid';
   letters.forEach((letter,index)=>choices.append(button(letter,event=>{spellBuilt.push({letter,index});event.currentTarget.disabled=true;built.textContent=`Your letters: ${spellBuilt.map(part=>part.letter).join('')||'—'}`},'choice-button')));
   board.append(choices);
   const actions=document.createElement('div');actions.className='action-row';actions.append(button('Check spelling',()=>{const answer=spellBuilt.map(part=>part.letter).join('');completeActivity(answer===spellTarget,answer===spellTarget?`Correct — ${spellTarget} is spelled ${spellTarget.split('').join(' · ')}.`:`That spells ${answer||'nothing yet'}. The target word was ${spellTarget}.`)},'action-button primary'),button('Clear letters',renderActivity,'action-button'));board.append(actions)
  }else if(subject.activity.type==='lab-selection'){
   const prompt=document.createElement('p');prompt.className='task-prompt';prompt.textContent=`Separate: ${task.prompt}`;board.append(prompt);
   const choices=document.createElement('div');choices.className='choice-grid';
   task.options.forEach(option=>choices.append(button(option,()=>completeActivity(option===task.answer,option===task.answer?`${option} is a good method for this mixture.`:`Try again next time. ${task.answer} separates this mixture.`))));
   board.append(choices)
  }else if(subject.activity.type==='compass-route'){
   const prompt=document.createElement('p');prompt.className='task-prompt';prompt.textContent=`${task.start} → ${task.target}`;board.append(prompt);
   const detail=document.createElement('p');detail.className='task-detail';detail.textContent='Which direction should the explorer travel?';board.append(detail);
   const choices=document.createElement('div');choices.className='choice-grid';
   task.options.forEach(direction=>choices.append(button(`${{North:'↑',East:'→',South:'↓',West:'←'}[direction]} ${direction}`,()=>completeActivity(direction===task.direction,direction===task.direction?`Correct — travel ${direction.toLowerCase()} to reach the landmark.`:`Check the compass again. The landmark is ${task.direction.toLowerCase()} from here.`))));
   board.append(choices)
  }else if(subject.activity.type==='timeline'){
   const remaining=[...task.events];let sequence=[];
   const prompt=document.createElement('p');prompt.className='task-prompt';prompt.textContent='Choose the earliest event';board.append(prompt);
   const detail=document.createElement('p');detail.className='task-detail';detail.textContent='Build the timeline from oldest to newest.';board.append(detail);
   const choices=document.createElement('div');choices.className='choice-grid';
   function update(){choices.replaceChildren(...remaining.map((event,index)=>button(`${event.label} · ${event.year<0?`${Math.abs(event.year)} BCE`:event.year}`,()=>{sequence.push(event);remaining.splice(index,1);if(!remaining.length){const sorted=[...task.events].sort((a,b)=>a.year-b.year);const correct=sequence.every((entry,index)=>entry===sorted[index]);completeActivity(correct,correct?'Timeline complete — oldest to newest!':'Some events were out of order. Review the dates on the next timeline.');return}prompt.textContent=`Choose event ${sequence.length+1} of ${task.events.length}`})))}
   update();board.append(choices)
  }else if(subject.activity.type==='robot-route'){
   robotCommands=[];
   const prompt=document.createElement('p');prompt.className='task-prompt';prompt.textContent='Program the robot to reach the star';board.append(prompt);
   const track=document.createElement('div');track.className='choice-grid';track.setAttribute('aria-label','Robot route');board.append(track);
   const detail=document.createElement('p');detail.className='task-detail';board.append(detail);
   const controls=document.createElement('div');controls.className='choice-grid';board.append(controls);
   function update(){track.replaceChildren();for(let i=0;i<task.width;i++){const cell=document.createElement('div');cell.className='choice-button';cell.style.textAlign='center';cell.textContent=i===task.start?'🤖':i===task.target?'⭐':task.blocked.includes(i)?'🧱':'·';track.append(cell)}detail.textContent=`Route: ${robotCommands.map(value=>value==='left'?'←':'→').join(' ')||'Choose commands'}`}
   task.commands.forEach(command=>controls.append(button(command==='left'?'← Move left':'Move right →',()=>{if(robotCommands.length<task.width){robotCommands.push(command);update()}},'choice-button')));
   const actions=document.createElement('div');actions.className='action-row';actions.append(button('Run program',()=>{let position=task.start,hitWall=false;for(const command of robotCommands){position+=command==='left'?-1:1;if(position<0||position>=task.width||task.blocked.includes(position)){hitWall=true;break}}const correct=position===task.target&&!hitWall;completeActivity(correct,correct?'The robot followed its instructions and reached the star!':hitWall?'The robot hit an obstacle. Adjust your commands next time.':'The robot stopped in the wrong place. Check the route.');},'action-button primary'),button('Clear',()=>{robotCommands=[];update()},'action-button'));board.append(actions);update()
  }else if(subject.activity.type==='colour-mixer'){
   const prompt=document.createElement('p');prompt.className='task-prompt';prompt.textContent=`Mix a paint colour to make ${task.target}`;board.append(prompt);
   const detail=document.createElement('p');detail.className='task-detail';detail.textContent='Choose two different primary paints.';board.append(detail);
   const colors=document.createElement('div');colors.className='choice-grid';let selected=[];
   task.colors.forEach(color=>colors.append(button(color,button=>{if(selected.length>=2)return;selected.push(color);button.currentTarget.disabled=true;detail.textContent=`Selected paints: ${selected.join(' + ')}`;if(selected.length===2){const pairs={Orange:['Red','Yellow'],Green:['Yellow','Blue'],Purple:['Red','Blue']};const correct=pairs[task.target].every(value=>selected.includes(value));completeActivity(correct,correct?`${selected.join(' and ')} make ${task.target}.`:`${selected.join(' and ')} make a different colour. Try another mix.`)}},'choice-button')));
   board.append(colors)
  }else if(subject.activity.type==='rhythm'){
   rhythmInput=[];let playing=false;
   const prompt=document.createElement('p');prompt.className='task-prompt';prompt.textContent='Listen to the rhythm, then echo it';board.append(prompt);
   const detail=document.createElement('p');detail.className='task-detail';detail.textContent='Press Play pattern to hear the beat.';board.append(detail);
   const pads=document.createElement('div');pads.className='choice-grid';['Beat 1','Beat 2','Beat 3'].forEach((label,index)=>pads.append(button(label,()=>{if(playing)return;rhythmInput.push(index+1);detail.textContent=`Your rhythm: ${rhythmInput.join(' · ')}`},'choice-button')));board.append(pads);
   const actions=document.createElement('div');actions.className='action-row';actions.append(button('▶ Play pattern',async()=>{playing=true;rhythmInput=[];detail.textContent='Listen carefully…';for(const beat of task){detail.textContent=`♪ Beat ${beat}`;await new Promise(resolve=>setTimeout(resolve,480))}playing=false;detail.textContent=`Now echo ${task.length} beats using the pads.`},'action-button'),button('Check my rhythm',()=>{const correct=rhythmInput.length===task.length&&rhythmInput.every((beat,index)=>beat===task[index]);completeActivity(correct,correct?'Perfect echo — you matched the rhythm!':'The pattern did not match this time. Listen and try the next rhythm.')},'action-button primary'),button('Clear',()=>{rhythmInput=[];detail.textContent='Your rhythm cleared. Play the pattern again.'},'action-button'));board.append(actions)
  }else if(subject.activity.type==='word-match'){
   const prompt=document.createElement('p');prompt.className='task-prompt';prompt.textContent=`Translate ${task.language}: “${task.word}”`;board.append(prompt);
   const detail=document.createElement('p');detail.className='task-detail';detail.textContent='Choose the matching English meaning.';board.append(detail);
   const choices=document.createElement('div');choices.className='choice-grid';task.options.forEach(option=>choices.append(button(option,()=>completeActivity(option===task.answer,option===task.answer?`That’s right — ${task.word} means ${option}.`:`Not quite. ${task.word} means ${task.answer}.`))));board.append(choices)
  }
 }
 function startQuiz(){
  quizOrder=LearningWorld.shuffle(subject.questions);quizIndex=0;quizScore=0;quizMissed=[];$('quiz-next').hidden=true;$('quiz-section').hidden=false;$('quiz-results').hidden=true;$('quiz-card').hidden=false;$('quiz-section').scrollIntoView({block:'start'});showQuestion()
 }
 let quizOrder=[],quizIndex=0,quizScore=0,quizMissed=[];
 function showQuestion(){
  const question=quizOrder[quizIndex];$('quiz-progress').textContent=`Question ${quizIndex+1} of ${quizOrder.length}`;$('quiz-score').textContent=`★ ${quizScore} correct`;$('quiz-track').replaceChildren(...quizOrder.map((_,index)=>{const dot=document.createElement('span');dot.className=index<quizIndex?'done':'';return dot}));
  $('quiz-question').textContent=question[0];$('quiz-explanation').textContent='Choose an answer to see why.';$('quiz-options').replaceChildren(...LearningWorld.shuffle(question.slice(1,4)).map((answer,index)=>button(`${index+1}. ${answer}`,()=>answerQuestion(answer,question), 'choice-button quiz-option')))
 }
 function answerQuestion(answer,question){
  const correct=answer===question[1];if(correct)quizScore++;else quizMissed.push(question);
  $('quiz-options').querySelectorAll('button').forEach(option=>{option.disabled=true;const value=option.textContent.replace(/^\d+\.\s/,'');if(value===question[1])option.classList.add('is-correct');else if(value===answer)option.classList.add('is-wrong')});
  $('quiz-score').textContent=`★ ${quizScore} correct`;$('quiz-explanation').textContent=`${correct?'Correct!':'Not quite.'} ${question[4]}`;
  $('quiz-next').textContent=quizIndex===quizOrder.length-1?'Finish quiz →':'Next question →';$('quiz-next').hidden=false
 }
 $('quiz-next').addEventListener('click',()=>{quizIndex++;if(quizIndex<quizOrder.length){$('quiz-next').hidden=true;showQuestion()}else finishQuiz()});
 function finishQuiz(){
  $('quiz-card').hidden=true;$('quiz-results').hidden=false;$('result-heading').textContent=`${subject.name} quiz complete`;$('result-text').textContent=`You answered ${quizScore} of ${quizOrder.length} questions correctly. ${quizMissed.length?'Try the quiz again to practise and strengthen your knowledge.':'Brilliant work — you got every question right!'}`;
  try{const saved=JSON.parse(localStorage.getItem('sprout-learning-passport')||'{}');const old=saved[subject.id]||{};saved[subject.id]={completed:true,best:Math.max(Number(old.best)||0,quizScore)};localStorage.setItem('sprout-learning-passport',JSON.stringify(saved))}catch(error){$('result-text').textContent+=' The browser could not save your badge, but your score is shown.'}
 }
 $('quiz-again').addEventListener('click',startQuiz);
 document.querySelector('#quiz-heading + p').textContent=`${subject.questions.length} questions, helpful explanations, and a badge for your discovery passport.`;
 for(const subject of LearningWorld.subjects){const link=document.querySelector(`[data-subject-link="${subject.id}"]`);if(link)link.href=`${subject.id}.html`}
 $('lab-game-link').hidden=!subject.game;if(subject.game){$('lab-game-link').href=subject.game.href;$('lab-game-link').textContent=subject.game.label}
 renderActivity()
})();
