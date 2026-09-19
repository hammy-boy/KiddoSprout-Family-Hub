(function(root){
const colours=[{name:'Blank',hex:'#fffdf5',mark:'·'},{name:'Coral',hex:'#d97767',mark:'●'},{name:'Gold',hex:'#e4ba4e',mark:'★'},{name:'Leaf',hex:'#80a56e',mark:'◆'},{name:'Sky',hex:'#72a5c0',mark:'▲'},{name:'Violet',hex:'#a58abf',mark:'✦'}];
const levels=[
{name:'Twin sprouts',axis:'vertical',seeds:[[1,2,3],[2,3,3],[1,4,3],[2,5,2]]},
{name:'Butterfly wings',axis:'vertical',seeds:[[1,1,5],[2,1,1],[1,2,1],[2,2,2],[3,2,5],[2,3,5],[3,3,2],[2,4,1],[1,5,5],[2,5,5]]},
{name:'Reflections in water',axis:'horizontal',seeds:[[1,1,4],[2,1,4],[5,1,2],[1,2,3],[2,2,4],[3,2,4],[4,2,4],[5,2,3],[3,3,2],[4,3,2]]},
{name:'Garden gates',axis:'vertical',seeds:[[0,1,3],[1,1,3],[2,1,2],[3,1,2],[0,2,3],[0,3,3],[1,3,1],[2,3,1],[3,3,5],[0,4,3],[2,5,4],[3,5,4],[0,6,3]]},
{name:'Sunrise tapestry',axis:'horizontal',seeds:[[1,0,5],[6,0,5],[1,1,4],[2,1,2],[3,1,2],[4,1,2],[5,1,2],[6,1,4],[2,2,1],[3,2,2],[4,2,2],[5,2,1],[0,3,3],[1,3,3],[6,3,3],[7,3,3]]},
{name:'Rainbow mosaic',axis:'vertical',seeds:[[0,0,1],[1,1,2],[2,2,3],[3,3,4],[3,4,5],[2,5,1],[1,6,2],[0,7,3],[0,3,5],[1,3,4],[1,4,3],[0,4,2],[3,0,5],[3,7,1]]}
];
function mirror(x,y,axis){return axis==='vertical'?[7-x,y]:[x,7-y]}
function editable(x,y,axis){return axis==='vertical'?x>=4:y>=4}
function solution(level){const grid=Array(64).fill(0);for(const [x,y,c]of level.seeds){grid[y*8+x]=c;const [mx,my]=mirror(x,y,level.axis);grid[my*8+mx]=c}return grid}
function initial(level){const goal=solution(level);return goal.map((c,i)=>editable(i%8,Math.floor(i/8),level.axis)?0:c)}
function differences(grid,level){const goal=solution(level);return goal.flatMap((c,i)=>editable(i%8,Math.floor(i/8),level.axis)&&grid[i]!==c?[i]:[])}
const api={colours,levels,mirror,editable,solution,initial,differences};if(typeof module==='object')module.exports=api;else root.PatternPainter=api;
})(typeof window==='object'?window:globalThis);
