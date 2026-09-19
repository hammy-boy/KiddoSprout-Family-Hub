(function(root){
const W=720,H=640;
class Game{
 constructor(){this.reset()}
 reset(){this.score=0;this.lives=3;this.level=0;this.load(0)}
 load(level){this.level=level;this.paddle={x:W/2,w:104};this.wide=0;this.drops=[];this.bricks=[];for(let r=0;r<5+level;r++)for(let c=0;c<9;c++){if(level===1&&(r+c)%4===0||level===2&&(c===0||c===8)&&r%2===0)continue;this.bricks.push({x:28+c*74,y:105+r*30,w:66,h:21,hp:level===2&&r<2?2:1,row:r})}this.ready()}
 ready(){this.status='ready';this.ball={x:this.paddle.x,y:563,vx:145,vy:-315,r:8}}
 launch(){if(this.status==='ready')this.status='playing'}
 move(x){this.paddle.x=Math.max(this.paddle.w/2+10,Math.min(W-this.paddle.w/2-10,x));if(this.status==='ready')this.ball.x=this.paddle.x}
 step(dt){if(this.status!=='playing')return;while(dt>0&&this.status==='playing'){const s=Math.min(dt,1/240);this.tick(s);dt-=s}}
 tick(dt){const b=this.ball,p=this.paddle,oldX=b.x,oldY=b.y;this.wide=Math.max(0,this.wide-dt);p.w=this.wide>0?156:104;this.move(p.x);b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.x<b.r){b.x=b.r;b.vx=Math.abs(b.vx)}if(b.x>W-b.r){b.x=W-b.r;b.vx=-Math.abs(b.vx)}if(b.y<b.r){b.y=b.r;b.vy=Math.abs(b.vy)}
 if(b.vy>0&&oldY+b.r<=578&&b.y+b.r>=578&&b.x>=p.x-p.w/2-b.r&&b.x<=p.x+p.w/2+b.r){const offset=Math.max(-1,Math.min(1,(b.x-p.x)/(p.w/2))),speed=Math.min(510,Math.hypot(b.vx,b.vy)+6);b.vx=Math.sin(offset*1.05)*speed;b.vy=-Math.cos(offset*1.05)*speed;b.y=578-b.r}
 for(const brick of this.bricks){if(brick.hp<=0)continue;const nx=Math.max(brick.x,Math.min(brick.x+brick.w,b.x)),ny=Math.max(brick.y,Math.min(brick.y+brick.h,b.y));if((b.x-nx)**2+(b.y-ny)**2>b.r*b.r)continue;brick.hp--;this.score+=brick.hp===0?10:5;if(brick.hp===0&&this.bricks.indexOf(brick)%11===0)this.drops.push({x:brick.x+brick.w/2,y:brick.y});if(oldY+b.r<=brick.y){b.y=brick.y-b.r;b.vy=-Math.abs(b.vy)}else if(oldY-b.r>=brick.y+brick.h){b.y=brick.y+brick.h+b.r;b.vy=Math.abs(b.vy)}else if(oldX<brick.x){b.x=brick.x-b.r;b.vx=-Math.abs(b.vx)}else{b.x=brick.x+brick.w+b.r;b.vx=Math.abs(b.vx)}break}
 for(const d of this.drops){d.y+=150*dt;if(d.y>=570&&d.y<=603&&Math.abs(d.x-p.x)<p.w/2+12){this.wide=12;p.w=156;d.caught=true}}this.drops=this.drops.filter(d=>!d.caught&&d.y<H+20);
 if(this.bricks.every(b=>b.hp===0)){this.status=this.level===2?'won':'complete';return}if(b.y>H+20){this.lives--;this.drops=[];if(this.lives===0)this.status='over';else this.ready()}
 }
}
const api={Game,W,H};if(typeof module==='object'&&module.exports)module.exports=api;else root.PrismBreak=api;
})(globalThis);
