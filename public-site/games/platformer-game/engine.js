(function(root){
const levels=[
 {name:'First light',width:1900,platforms:[[0,440,430,100],[535,440,365,100],[1010,440,390,100],[1510,440,390,100],[240,340,140,22],[640,315,130,22],[1110,315,150,22],[1560,325,120,22]],enemies:[[690,410,580,850],[1200,410,1050,1360]],gems:[[170,392],[300,300],[580,390],[705,275],[855,390],[1080,390],[1185,275],[1350,390],[1620,285],[1760,390]],checkpoint:1080,goal:1810},
 {name:'The floating garden',width:2250,platforms:[[0,440,340,100],[475,440,345,100],[970,440,430,100],[1555,440,310,100],[2010,440,240,100],[220,335,115,22],[555,305,130,22],[1050,330,120,22],[1260,270,110,22],[1630,300,135,22],[1920,350,100,22]],enemies:[[630,410,510,780],[1190,410,1010,1360],[1740,410,1590,1820]],gems:[[160,390],[270,295],[510,390],[615,265],[760,390],[1080,290],[1315,230],[1650,260],[1970,310],[2140,390]],checkpoint:1040,goal:2160},
 {name:'Above the clouds',width:2550,platforms:[[0,440,300,100],[455,440,280,100],[900,440,430,100],[1500,440,300,100],[1970,440,580,100],[190,325,110,22],[510,310,120,22],[1000,320,125,22],[1210,255,100,22],[1390,390,65,22],[1585,290,110,22],[1870,350,100,22],[2090,310,130,22],[2280,255,120,22]],enemies:[[590,410,490,700],[1120,410,940,1280],[1640,410,1535,1760],[2240,410,2030,2470]],gems:[[120,390],[240,285],[570,270],[955,390],[1060,280],[1260,215],[1640,250],[1920,310],[2150,270],[2340,215]],checkpoint:970,goal:2460}
];
class Game{
 constructor(){this.restart()}
 restart(){this.lives=3;this.collected=new Set();this.levelIndex=0;this.status='ready';this.load(0)}
 load(i){this.levelIndex=i;this.level=levels[i];this.checkpoint=false;this.spawnX=55;this.enemies=this.level.enemies.map(([x,y,min,max])=>({x,y,min,max,vx:65+i*14,alive:true}));this.player={x:55,y:360,w:30,h:38,vx:0,vy:0,jumps:0,grounded:false,invulnerable:1};this.status='playing'}
 jump(){if(this.status!=='playing'||this.player.jumps>=2)return false;this.player.vy=-510;this.player.jumps++;this.player.grounded=false;return true}
 hit(){if(this.status!=='playing')return;this.lives--;if(this.lives<=0){this.status='over';return}this.player={x:this.spawnX,y:350,w:30,h:38,vx:0,vy:0,jumps:0,grounded:false,invulnerable:1.6}}
 step(dt,input={}){if(this.status!=='playing')return;const p=this.player;dt=Math.min(dt,1/30);p.invulnerable=Math.max(0,p.invulnerable-dt);p.vx=((input.right?1:0)-(input.left?1:0))*260;p.x=Math.max(0,Math.min(this.level.width-p.w,p.x+p.vx*dt));for(const [x,y,w,h] of this.level.platforms){if(p.x<x+w&&p.x+p.w>x&&p.y<y+h&&p.y+p.h>y){if(p.vx>0)p.x=x-p.w;else if(p.vx<0)p.x=x+w}}
 const oldY=p.y;p.vy+=1450*dt;p.y+=p.vy*dt;p.grounded=false;
 for(const [x,y,w,h] of this.level.platforms){if(p.x<x+w&&p.x+p.w>x&&p.y<y+h&&p.y+p.h>y){if(p.vy>=0&&oldY+p.h<=y+1){p.y=y-p.h;p.vy=0;p.grounded=true;p.jumps=0}else if(p.vy<0&&oldY>=y+h-1){p.y=y+h;p.vy=0}}}if(!p.grounded&&p.jumps===0)p.jumps=1;
 if(p.y>640){this.hit();return}
 if(!this.checkpoint&&p.x>=this.level.checkpoint&&p.grounded){this.checkpoint=true;this.spawnX=this.level.checkpoint}
 this.level.gems.forEach(([x,y],i)=>{if(Math.abs(p.x+15-x)<30&&Math.abs(p.y+19-y)<35)this.collected.add(this.levelIndex+':'+i)});
 for(const e of this.enemies){if(!e.alive)continue;e.x+=e.vx*dt;if(e.x<e.min||e.x>e.max){e.x=Math.max(e.min,Math.min(e.max,e.x));e.vx*=-1}if(p.x<e.x+32&&p.x+p.w>e.x&&p.y<e.y+30&&p.y+p.h>e.y){if(p.vy>0&&oldY+p.h<=e.y+12){e.alive=false;p.vy=-390;p.jumps=1}else if(p.invulnerable<=0){this.hit();return}}}
 if(p.x>=this.level.goal&&p.grounded)this.status=this.levelIndex===levels.length-1?'won':'level-complete';
 }
}
if(typeof module==='object'&&module.exports)module.exports={Game,levels};else root.Cloudbound={Game,levels};
})(globalThis);
