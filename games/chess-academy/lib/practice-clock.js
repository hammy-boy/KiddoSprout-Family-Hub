(function(root){
 class PracticeClock {
  constructor(now=()=>Date.now()){this.now=now;this.reset(300,0)}
  reset(seconds,increment){if(!Number.isFinite(seconds)||seconds<1||seconds>10800||!Number.isFinite(increment)||increment<0||increment>60)throw Error('Choose 1–10800 seconds and 0–60 seconds increment.');this.remaining={w:seconds*1000,b:seconds*1000};this.increment=increment*1000;this.turn='w';this.running=false;this.expired=null;this.at=this.now()}
  tick(){const time=this.now();if(this.running){this.remaining[this.turn]=Math.max(0,this.remaining[this.turn]-Math.max(0,time-this.at));if(this.remaining[this.turn]===0){this.expired=this.turn;this.running=false}}this.at=time;return this}
  toggle(){this.tick();if(!this.expired)this.running=!this.running;return this}
  press(side){this.tick();if(!this.running||side!==this.turn)return false;this.remaining[side]+=this.increment;this.turn=side==='w'?'b':'w';return true}
 }
 if(typeof module==='object'&&module.exports)module.exports=PracticeClock;else root.PracticeClock=PracticeClock;
})(globalThis);
