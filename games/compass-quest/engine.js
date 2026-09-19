(function(root){
 const map=['M..~..L','.F.~...','...~...','...=...','.P.~...','...~.C.','H..~..B'];
 const landmarks={H:{name:'Home',icon:'🏠'},F:{name:'Forest',icon:'🌲'},M:{name:'Mountain',icon:'⛰️'},L:{name:'Lighthouse',icon:'🚨'},C:{name:'Campsite',icon:'⛺'},B:{name:'Beach',icon:'🏖️'},P:{name:'Park',icon:'🌷'}};
 const missions=[{name:'A walk in the park',route:['P']},{name:'Into the woods',route:['F','M']},{name:'Across the river',route:['C']},{name:'Coastal explorer',route:['L','B']},{name:'The long way home',route:['F','C','H']},{name:'Island expedition',route:['M','L','B','P','H']}];
 const directions={N:[0,-1],E:[1,0],S:[0,1],W:[-1,0]};
 function locate(symbol){for(let y=0;y<map.length;y++){const x=map[y].indexOf(symbol);if(x>=0)return {x,y}}throw Error('Unknown landmark')}
 function initial(){return {...locate('H'),moves:0,stop:0,won:false,error:'',arrived:false}}
 function move(state,direction,mission){if(state.won)return state;const delta=directions[direction];if(!delta)throw Error('Unknown direction');const x=state.x+delta[0],y=state.y+delta[1],next={...state,error:'',arrived:false};if(!map[y]||!map[y][x]){next.error='That is the edge of the map. Choose another direction.';return next}if(map[y][x]==='~'){next.error='The river blocks this path. Find the bridge at D4.';return next}next.x=x;next.y=y;next.moves++;if(map[y][x]===mission.route[state.stop]){next.stop++;next.arrived=true;next.won=next.stop===mission.route.length}return next}
 function coordinate(x,y){return String.fromCharCode(65+x)+(y+1)}
 const api={map,landmarks,missions,directions,locate,initial,move,coordinate};if(typeof module==='object')module.exports=api;else root.CompassQuest=api;
})(typeof window==='object'?window:globalThis);
