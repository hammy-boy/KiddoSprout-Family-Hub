(function(root){
 function question(table,random=Math.random,operation='multiply'){
 const n=table==='mixed'?2+Math.floor(random()*11):Number(table),m=1+Math.floor(random()*12);
 let a=n,b=m,answer=n*m,symbol='×';
 if(operation==='add'){answer=a+b;symbol='+'}
 if(operation==='subtract'){a=n+m;b=n;answer=m;symbol='−'}
 if(operation==='divide'){a=n*m;b=n;answer=m;symbol='÷'}
 const values=new Set([answer]);for(const v of [answer+n,answer-n,answer+1,answer+2])if(v>=0&&v!==answer&&values.size<3)values.add(v);
 const options=[...values];for(let i=options.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[options[i],options[j]]=[options[j],options[i]]}
 return {a,b,answer,options,symbol,operation};
 }
 function explanation(q){
 if(q.operation==='add')return `Start at ${q.a} and count on ${q.b}: ${q.a} + ${q.b} = ${q.answer}.`;
 if(q.operation==='subtract')return `Start with ${q.a}, take away ${q.b}, and ${q.answer} remain. Check: ${q.answer} + ${q.b} = ${q.a}.`;
 if(q.operation==='divide')return `Share ${q.a} equally into ${q.b} groups: ${q.answer} in each group. Check: ${q.b} × ${q.answer} = ${q.a}.`;
 return `${q.b} groups of ${q.a}: ${Array.from({length:q.b},(_,i)=>(i+1)*q.a).join(' → ')}. So ${q.a} × ${q.b} = ${q.answer}.`;
 }
 const api={question,explanation};if(typeof module==='object')module.exports=api;else root.MultiplyRun=api;
})(typeof window==='object'?window:globalThis);
