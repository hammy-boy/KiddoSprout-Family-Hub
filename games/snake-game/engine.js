(function(root){
class Snake{
 constructor(random=Math.random){this.random=random;this.reset()}
 reset(){this.body=[{x:9,y:10},{x:8,y:10},{x:7,y:10}];this.direction={x:1,y:0};this.queue=[];this.score=0;this.status='playing';this.placeFood()}
 placeFood(){const free=[];for(let y=0;y<20;y++)for(let x=0;x<20;x++)if(!this.body.some(p=>p.x===x&&p.y===y))free.push({x,y});if(!free.length){this.food=null;this.status='won';return}this.food=free[Math.min(free.length-1,Math.floor(this.random()*free.length))]}
 turn(x,y){if(this.status!=='playing'||Math.abs(x)+Math.abs(y)!==1||this.queue.length>=2)return false;const prev=this.queue.at(-1)||this.direction;if(x===-prev.x&&y===-prev.y||x===prev.x&&y===prev.y)return false;this.queue.push({x,y});return true}
 step(){if(this.status!=='playing')return;this.direction=this.queue.shift()||this.direction;const head={x:this.body[0].x+this.direction.x,y:this.body[0].y+this.direction.y},eat=head.x===this.food?.x&&head.y===this.food?.y;if(head.x<0||head.x>=20||head.y<0||head.y>=20||this.body.slice(0,eat?undefined:-1).some(p=>p.x===head.x&&p.y===head.y)){this.status='over';return}this.body.unshift(head);if(eat){this.score++;this.placeFood()}else this.body.pop()}
}
if(typeof module==='object'&&module.exports)module.exports=Snake;else root.OrbitSnake=Snake;
})(globalThis);
