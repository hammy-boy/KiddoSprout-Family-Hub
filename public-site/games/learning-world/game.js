(()=>{
 const $=id=>document.getElementById(id),{subjects,shuffle}=LearningWorld;
 let subject,deck=[],index=0,score=0,missed=[],answered=false,reviewing=false;
 function saved(){try{const value=JSON.parse(localStorage.getItem('sprout-learning-passport')||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}catch{return {}}}
 function home(){
  const records=saved();
  $('badge-count').textContent=`${subjects.filter(s=>records[s.id]?.completed).length} / ${subjects.length} badges`;
  $('subjects').replaceChildren();
  for(const item of subjects){
   const b=document.createElement('button');
   b.type='button';
   b.className='subject';
   b.dataset.subject=item.id;
   b.style.background=item.colour;
   const record=records[item.id];
   b.innerHTML=`<span class="icon" aria-hidden="true">${item.icon}</span><h2>${item.name}</h2><p>${item.description}</p><small>${record?.completed?`✦ Badge earned · best ${Number(record.best)||0}/${item.questions.length}`:`${item.questions.length} discoveries · Start exploring →`}</small>`;
   b.onclick=()=>start(item);
   $('subjects').append(b)
  }
  const adventures=[
   ['../multiplication-runner/index.html','#e3edd5','🦊','Maths','Run through addition, subtraction, multiplication and division islands.','Open Math Runner →'],
   ['../pattern-painter/index.html','#f0dfd8','🎨','Pattern Painter','Complete colourful mirror patterns and save your own artwork.','Play the art adventure →'],
   ['../melody-meadow/index.html','#f0e6c6','🎵','Melody Meadow','Listen, repeat short tunes and try free play with musical flowers.','Play the music adventure →'],
   ['../compass-quest/index.html','#e5edce','🧭','Compass Quest','Follow compass directions and map coordinates to find island landmarks.','Play the geography adventure →'],
   ['../science-sorter/index.html','#dcebe7','🔬','Science Sorter','Explore matter, animal groups and plant parts in three labs.','Play the science adventure →'],
   ['../robot-routes/index.html','#dce9e6','🤖','Robot Routes','Program a robot through six star-collecting mazes.','Try the coding adventure →'],
   ['../word-builder/index.html','#f2e9cd','🌻','Word Builder','Arrange letter tiles and grow four gardens of English words.','Play the spelling adventure →']
  ];
  for(const [href,colour,icon,title,description,action] of adventures){
   const link=document.createElement('a');
   link.href=href;
   link.className='subject';
   link.style.background=colour;
   link.innerHTML=`<span class="icon" aria-hidden="true">${icon}</span><h2>${title}</h2><p>${description}</p><small>${action}</small>`;
   $('subjects').append(link)
  }
  $('home').classList.remove('hidden');
  $('quest').classList.add('hidden')
 }
 function start(item,questions){subject=item;reviewing=!!questions;deck=shuffle(questions||item.questions);index=0;score=0;missed=[];$('home').classList.add('hidden');$('quest').classList.remove('hidden');$('results').classList.add('hidden');document.querySelector('.challenge').classList.remove('hidden');$('quest-icon').textContent=item.icon;$('quest-title').textContent=item.place;$('subject-name').textContent=item.name+(reviewing?' · PRACTICE AGAIN':' · DISCOVERY QUEST');show();$('quest').scrollIntoView({block:'start'})}
 function show(){answered=false;const row=deck[index];$('step').textContent=`Discovery ${index+1} / ${deck.length}`;$('score').textContent=`★ ${score} correct`;$('trail').replaceChildren();deck.forEach((_,i)=>{const dot=document.createElement('span');dot.className=i<index?'done':i===index?'current':'';dot.setAttribute('aria-label',`Question ${i+1}${i<index?' completed':''}`);$('trail').append(dot)});$('question').textContent=row[0];$('question-type').textContent=reviewing?'ANOTHER CHANCE TO DISCOVER':'DISCOVERY CHALLENGE';$('answers').replaceChildren();shuffle(row.slice(1,4)).forEach((value,i)=>{const b=document.createElement('button');b.className='answer';const n=document.createElement('span');n.textContent=`${i+1}`;b.append(n,document.createTextNode(value));b.onclick=()=>answer(value,b);$('answers').append(b)});$('feedback-title').textContent='Choose your answer';$('explanation').textContent='Tap a card or press 1, 2, or 3.';$('next').classList.add('hidden');$('question').focus({preventScroll:true})}
 function answer(value,button){if(answered)return;answered=true;const row=deck[index],correct=value===row[1];if(correct)score++;else missed.push(row);document.querySelectorAll('.answer').forEach(b=>{b.disabled=true;if(b.lastChild.textContent===row[1])b.classList.add('correct')});if(!correct)button.classList.add('wrong');$('feedback-title').textContent=correct?'You found it!':'A new thing to learn';$('explanation').textContent=row[4];$('score').textContent=`★ ${score} correct`;$('next').textContent=index===deck.length-1?'Finish this quest →':'Keep exploring →';$('next').classList.remove('hidden');$('next').focus({preventScroll:true})}
 function finish(){document.querySelector('.challenge').classList.add('hidden');$('results').classList.remove('hidden');document.querySelectorAll('#trail span').forEach(e=>e.className='done');$('result-title').textContent=reviewing?'Practice complete!':`${subject.name} badge earned!`;$('result-detail').textContent=`You answered ${score} of ${deck.length} correctly. ${missed.length?'Try the missed questions again to help them stick.':'You explored every question. Choose another adventure!'}`;$('review').classList.toggle('hidden',missed.length===0);if(!reviewing){try{const records=saved();records[subject.id]={completed:true,best:Math.max(Number(records[subject.id]?.best)||0,score)};localStorage.setItem('sprout-learning-passport',JSON.stringify(records))}catch{}}$('results').scrollIntoView({block:'center'})}
 $('next').onclick=()=>{if(!answered)return;index++;if(index<deck.length)show();else{answered=false;finish()}};$('back').onclick=home;$('map').onclick=home;$('again').onclick=()=>start(subject);$('review').onclick=()=>start(subject,[...missed]);document.addEventListener('keydown',e=>{if(!e.repeat&&!$('quest').classList.contains('hidden')&&!document.querySelector('.challenge').classList.contains('hidden')&&['1','2','3'].includes(e.key)){e.preventDefault();document.querySelectorAll('.answer')[Number(e.key)-1]?.click()}});home();
})();
