(function(root){
const labs=[
{id:'matter',name:'Matter Lab',icon:'🧊',description:'Explore solids, liquids and gases.',bins:['Solid','Liquid','Gas'],cards:[
['Ice cube','🧊','Solid','An ice cube is frozen water. It keeps its shape until it melts.'],
['Water in a cup','💧','Liquid','Liquid water flows and takes the shape of the part of the cup it fills.'],
['Air in a balloon','🎈','Gas','Air is a mixture of gases. It spreads out to fill the space inside a balloon.'],
['A wooden block','🪵','Solid','A wooden block keeps its own shape. It is a solid.'],
['Cooking oil in a bottle','🫙','Liquid','Cooking oil flows and takes the shape of its container.'],
['Helium inside a balloon','🎈','Gas','Helium is a gas. It fills the space inside its container.'],
['A stone','🪨','Solid','A stone keeps its own shape and does not flow like a liquid.'],
['Liquid water after ice melts','💦','Liquid','Melting changes solid ice into liquid water.']
]},
{id:'animals',name:'Animal Lab',icon:'🦋',description:'Meet mammals, birds, insects and fish.',bins:['Mammal','Bird','Insect','Fish'],cards:[
['Dolphin','🐬','Mammal','Dolphins are mammals. They breathe air and mothers feed their young milk.'],
['Penguin','🐧','Bird','Penguins have feathers and are birds, even though they cannot fly.'],
['Butterfly','🦋','Insect','A butterfly is an insect. Its adult body has six legs.'],
['Goldfish','🐟','Fish','Goldfish are fish. They use gills to take oxygen from water.'],
['Bat','🦇','Mammal','Bats are mammals, even though they fly. Mothers feed their young milk.'],
['Robin','🐦','Bird','Robins are birds. Like other birds, they have feathers.'],
['Ant','🐜','Insect','Ants are insects with six legs and three main body sections.'],
['Salmon','🐟','Fish','Salmon are fish with gills and fins.']
]},
{id:'plants',name:'Plant Lab',icon:'🌱',description:'Match each job to the right plant part.',bins:['Roots','Stem','Leaves','Flower'],cards:[
['Which part usually absorbs water from the soil?','💧','Roots','Roots absorb water and minerals from the soil.'],
['Which part holds the leaves up?','🌿','Stem','The stem supports the plant and holds its leaves up.'],
['Which parts usually make most of a green plant’s food using sunlight?','☀️','Leaves','Green leaves use light, water and carbon dioxide to make sugars. This is photosynthesis.'],
['Which part often has colourful petals?','🌸','Flower','Petals are parts of flowers. In many plants, they help attract pollinators.'],
['Which parts help anchor a plant in the soil?','🌱','Roots','Roots spread through the soil and help hold the plant in place.'],
['Which part carries water between the roots and leaves?','💦','Stem','The stem contains tubes that carry water through the plant.'],
['Which parts are often broad and flat to catch sunlight?','🍃','Leaves','Many leaves have a broad, flat shape that helps them catch light.'],
['Which part of a flowering plant contains its reproductive structures?','🌼','Flower','Flowers contain the structures used in reproduction. Seeds can develop after fertilisation.']
]}
];
function shuffle(items,random=Math.random){const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
const api={labs,shuffle};if(typeof module==='object')module.exports=api;else root.ScienceSorter=api;
})(typeof window==='object'?window:globalThis);
