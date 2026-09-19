(()=>{
 const canvas=document.getElementById('landscape'),ctx=canvas.getContext('2d');
 const palettes={add:['#bce7dd','#74b789','#327f60'],subtract:['#cbe9f5','#96b8d9','#5f88b9'],multiply:['#ffe3af','#d8b46a','#a18a4b'],divide:['#ded8f7','#aaa2d2','#7975b0']};
 let distance=0,progress=0,jump=0,velocity=0,running=false,paused=false,op='multiply',objects=[],onEnd=()=>{},onCoin=()=>{},last=performance.now(),travel=0;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function begin(operation,round,done,coin){op=operation;travel=0;progress=0;jump=0;velocity=0;running=true;paused=false;onEnd=done;onCoin=coin;objects=[{x:220,type:'coin',taken:false},{x:330,type:'log',taken:false},{x:445,type:'coin',taken:false}];canvas.dataset.phase='running';canvas.dataset.checkpoint=round+1}
 function hop(){if(running&&!paused&&jump===0)velocity=440}
 function draw(){const [sky,hill,tree]=palettes[op];ctx.clearRect(0,0,900,330);ctx.fillStyle=sky;ctx.fillRect(0,0,900,330);ctx.fillStyle='#fff7cd';ctx.beginPath();ctx.arc(746,62,32,0,Math.PI*2);ctx.fill();
 for(let i=-1;i<6;i++){const x=i*240-(distance*.2%240);ctx.fillStyle=hill;ctx.beginPath();ctx.ellipse(x,220,190,92,0,0,Math.PI*2);ctx.fill()}
 for(let i=-1;i<9;i++){const x=i*155-(distance*.5%155);ctx.fillStyle='#796547';ctx.fillRect(x,167,13,78);ctx.fillStyle=tree;ctx.beginPath();ctx.arc(x+7,154,38,0,Math.PI*2);ctx.fill()}
 ctx.fillStyle='#f2d4a0';ctx.fillRect(0,245,900,85);ctx.fillStyle='#8db66f';ctx.fillRect(0,243,900,9);ctx.fillStyle='#d4ad77';for(let i=0;i<24;i++)ctx.fillRect(i*50-distance%50,285+(i%2)*15,20,4);
 for(const o of objects){const x=160+o.x-travel;if(o.taken||x<0)continue;if(o.type==='coin'){ctx.fillStyle='#ffcf42';ctx.beginPath();ctx.arc(x,210,13,0,Math.PI*2);ctx.fill();ctx.fillStyle='#976621';ctx.font='bold 16px system-ui';ctx.fillText('★',x-8,216)}else{ctx.fillStyle='#976d4e';ctx.fillRect(x-16,222,32,23);ctx.fillStyle='#c49166';ctx.beginPath();ctx.arc(x+15,234,11,0,Math.PI*2);ctx.fill()}}
 const gate=160+620-travel;ctx.fillStyle=tree;ctx.fillRect(gate,137,12,108);ctx.fillRect(gate+110,137,12,108);ctx.fillStyle='#fffdf1';ctx.fillRect(gate-7,128,139,47);ctx.fillStyle='#24483b';ctx.font='bold 21px system-ui';ctx.fillText(running?'MATH STOP':'LET’S THINK',gate+2,158);
 // Original little fox explorer, drawn with simple shapes.
 const y=239-jump,bob=running&&!paused&&!reduced?Math.sin(distance*.12)*3:0;ctx.save();ctx.translate(160,y+bob);ctx.fillStyle='#d47837';ctx.beginPath();ctx.ellipse(-23,-16,25,10,-.4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#278477';ctx.fillRect(-12,-37,27,28);ctx.fillStyle='#e98d49';ctx.beginPath();ctx.arc(4,-48,23,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(-15,-61);ctx.lineTo(-15,-85);ctx.lineTo(0,-68);ctx.moveTo(12,-67);ctx.lineTo(29,-82);ctx.lineTo(25,-53);ctx.fill();ctx.fillStyle='#fff0d5';ctx.beginPath();ctx.ellipse(12,-42,17,10,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#253c3b';ctx.beginPath();ctx.arc(13,-52,3,0,Math.PI*2);ctx.arc(29,-44,3,0,Math.PI*2);ctx.fill();const step=running&&!paused?Math.sin(distance*.1)*7:0;ctx.fillRect(-10,-10,9,12+step);ctx.fillRect(7,-10,9,12-step);ctx.restore();
 }
 function tick(now){const dt=Math.min((now-last)/1000,.04);last=now;if(running&&!paused){const step=155*dt;travel+=step;distance+=step;progress=Math.min(1,travel/560);if(velocity||jump){jump+=velocity*dt;velocity-=1050*dt;if(jump<=0){jump=0;velocity=0}}for(const o of objects){if(!o.taken&&Math.abs(o.x-travel)<18){o.taken=true;if(o.type==='coin'){onCoin()}else if(jump<24){document.getElementById('trail-note').textContent='A little bump! Jump with Space or the Jump button.'}}}if(travel>=560){running=false;canvas.dataset.phase='question';onEnd()}}
 draw();requestAnimationFrame(tick)}requestAnimationFrame(tick);
 window.MathTrail={begin,hop,setPaused(value){paused=value},stop(){running=false;canvas.dataset.phase='idle'},get progress(){return progress}};
})();
