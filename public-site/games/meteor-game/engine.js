(function(root){
class Patrol{
 constructor(random=Math.random){this.random=random;this.reset()}
 reset(){this.score=0;this.health=3;this.load(0)}
 load(wave){this.wave=wave;this.ship={x:300,y:600};this.meteors=[];this.shots=[];this.spawned=0;this.target=10+wave*4;this.spawnTimer=.6;this.fireTimer=0;this.shield=0;this.cooldown=0;this.invulnerable=0;this.status='playing'}
 move(x){this.ship.x=Math.max(25,Math.min(575,x))}
 protect(){if(this.status!=='playing'||this.cooldown>0)return false;this.shield=3;this.cooldown=15;return true}
 hurt(){this.health--;if(this.health<=0)this.status='over'}
 step(dt,input={}){if(this.status!=='playing')return;dt=Math.max(0,Math.min(dt,.04));this.move(this.ship.x+((input.right?1:0)-(input.left?1:0))*360*dt);this.shield=Math.max(0,this.shield-dt);this.cooldown=Math.max(0,this.cooldown-dt);this.invulnerable=Math.max(0,this.invulnerable-dt);this.fireTimer-=dt;
 if(this.fireTimer<=0){this.shots.push({x:this.ship.x,y:this.ship.y-30});this.fireTimer=.22}
 this.spawnTimer-=dt;if(this.spawnTimer<=0&&this.spawned<this.target){const hp=this.wave>0&&this.spawned%3===0?2:1;this.meteors.push({x:35+this.random()*530,y:-40,r:hp===2?25:19,hp,vx:(this.random()-.5)*45,vy:72+this.wave*24+this.random()*24,spin:this.random()*6});this.spawned++;this.spawnTimer=1.1-this.wave*.12}
 for(const b of this.shots)b.y-=570*dt;
 for(const m of this.meteors){m.x+=m.vx*dt;m.y+=m.vy*dt;m.spin+=dt*.5;if(m.x<m.r||m.x>600-m.r){m.x=Math.max(m.r,Math.min(600-m.r,m.x));m.vx*=-1}
 for(const b of this.shots){if(b.dead||m.dead)continue;if(Math.abs(b.x-m.x)<m.r+3&&Math.abs(b.y-m.y)<m.r+8){b.dead=true;m.hp--;if(m.hp<=0){m.dead=true;this.score+=25+this.wave*10}}}
 if(m.dead)continue;
 if(Math.hypot(m.x-this.ship.x,m.y-this.ship.y)<m.r+20){m.dead=true;if(this.shield>0)this.score+=10;else if(this.invulnerable<=0){this.hurt();this.invulnerable=1.3}}
 else if(m.y-m.r>700){m.dead=true;this.hurt()}
 if(this.status==='over')break;
 }
 this.shots=this.shots.filter(b=>!b.dead&&b.y>-25);this.meteors=this.meteors.filter(m=>!m.dead);if(this.status==='playing'&&this.spawned===this.target&&this.meteors.length===0)this.status=this.wave===2?'won':'complete';
 }
}
if(typeof module==='object'&&module.exports)module.exports=Patrol;else root.MeteorPatrol=Patrol;
})(globalThis);
