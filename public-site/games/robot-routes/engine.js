(function(root){
 const levels=[
 {name:'First steps',hint:'Forward moves one square in the direction the robot faces.',map:['#####','#>.*G','#####']},
 {name:'Around the corner',hint:'Turn right changes the direction clockwise. It does not move the robot.',map:['#####','#>..#','###.#','#G*.#','#####']},
 {name:'Take the left path',hint:'The arrow on the robot shows which way forward will go.',map:['#####','#G*.#','###.#','#>..#','#####']},
 {name:'The star detour',hint:'Collect both stars before reaching the green goal.',map:['#######','#>...G#','#.###.#','#*...*#','#######']},
 {name:'A winding route',hint:'If your program meets a wall, edit it and try again from the start.',map:['#######','#>.*..#','#####.#','#*....#','#.#####','#....G#','#######']},
 {name:'Mission control',hint:'Break the journey into small parts: first star, second star, then goal.',map:['#######','#>..#G#','#.#.#.#','#*#...#','#.###.#','#....*#','#######']}
 ];
 const dirs=[[0,-1],[1,0],[0,1],[-1,0]];
 function initial(level){let robot,goal;const stars=[];level.map.forEach((row,y)=>[...row].forEach((c,x)=>{if(c==='>')robot={x,y,d:1};if(c==='G')goal={x,y};if(c==='*')stars.push(`${x},${y}`)}));return {...robot,goal,stars,collected:[],error:'',won:false}}
 function step(level,state,command){const s={...state,collected:[...state.collected],error:'',won:false};if(command==='L')s.d=(s.d+3)%4;else if(command==='R')s.d=(s.d+1)%4;else if(command==='F'){const [dx,dy]=dirs[s.d],x=s.x+dx,y=s.y+dy;if(!level.map[y]||level.map[y][x]===undefined||level.map[y][x]==='#'){s.error='A wall is in the way. Try turning before moving forward.';return s}s.x=x;s.y=y}else throw Error('Unknown command');const key=`${s.x},${s.y}`;if(s.stars.includes(key)&&!s.collected.includes(key))s.collected.push(key);s.won=s.x===s.goal.x&&s.y===s.goal.y&&s.collected.length===s.stars.length;return s}
 const api={levels,initial,step};if(typeof module==='object')module.exports=api;else root.RobotRoutes=api;
})(typeof window==='object'?window:globalThis);
