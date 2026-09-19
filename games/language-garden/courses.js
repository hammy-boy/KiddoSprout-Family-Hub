(function(root){
const meanings=['Hello','Thank you','Goodbye','One','Two','Three'];
const raw={
es:{native:'Español',locale:'es-ES',words:['hola','gracias','adiós','uno','dos','tres'],notes:['A common greeting.','A common way to say thanks.','A common farewell.','Counting number.','Counting number.','Counting number.']},
fr:{native:'Français',locale:'fr-FR',words:['bonjour','merci','au revoir','un','deux','trois'],notes:['A daytime greeting, also meaning good day.','A common way to say thanks.','A common farewell.','The counting number; forms can change with nouns.','Counting number.','Counting number.']},
de:{native:'Deutsch',locale:'de-DE',words:['hallo','danke','auf Wiedersehen','eins','zwei','drei'],notes:['A common greeting.','A common way to say thanks.','A polite farewell.','The counting form; forms can change with nouns.','Counting number.','Counting number.']},
it:{native:'Italiano',locale:'it-IT',words:['ciao','grazie','arrivederci','uno','due','tre'],notes:['An informal hello; ciao can also mean goodbye.','A common way to say thanks.','A common farewell.','Counting number.','Counting number.','Counting number.']},
pt:{native:'Português',locale:'pt-PT',words:['olá','obrigado / obrigada','adeus','um','dois','três'],notes:['A common greeting.','Obrigado is traditionally used by a male speaker; obrigada by a female speaker.','A farewell; other expressions are often used for see you later.','The counting number; forms can change with nouns.','The counting number; forms can change with nouns.','Counting number.']},
ar:{native:'العربية',locale:'ar',dir:'rtl',variety:'Modern Standard Arabic',words:['مرحبًا','شكرًا','إلى اللقاء','واحد','اثنان','ثلاثة'],notes:['A greeting in Modern Standard Arabic.','A common expression of thanks.','A farewell, literally until we meet.','A basic counting form; forms vary in sentences.','A basic counting form; forms vary in sentences.','A basic counting form; forms vary in sentences.']},
ja:{native:'日本語',locale:'ja-JP',words:['こんにちは','ありがとうございます','さようなら','一','二','三'],notes:['A common daytime greeting.','A polite expression of thanks.','A farewell often used for a longer separation; not every everyday goodbye.','The kanji for one, read ichi when counting.','The kanji for two, read ni when counting.','The kanji for three, read san when counting.']},
ko:{native:'한국어',locale:'ko-KR',words:['안녕하세요','감사합니다','안녕히 가세요','하나','둘','셋'],notes:['A polite greeting.','A polite expression of thanks.','Said to someone who is leaving when you are staying.','A native Korean counting number. Korean also has Sino-Korean numbers.','A native Korean counting number.','A native Korean counting number.']}
};
const courses=Object.fromEntries(Object.entries(raw).map(([id,c])=>[id,{...c,cards:c.words.map((text,i)=>({text,meaning:meanings[i],note:c.notes[i],topic:i<3?'Greetings':'Numbers'}))}]));
function fold(text){return String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().trim()}
function shuffle(values,random=Math.random){const out=[...values];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
const api={courses,fold,shuffle};if(typeof module==='object')module.exports=api;else root.LanguageGarden=api;
})(typeof window==='object'?window:globalThis);
