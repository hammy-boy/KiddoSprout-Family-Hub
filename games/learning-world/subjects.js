(function(root){
// Each row: prompt, correct answer, two alternatives, teaching explanation.
const subjects=[
{id:'english',name:'English',place:'Word Woods',icon:'📚',colour:'#e3eed6',description:'Spelling, grammar, rhymes and little stories.',questions:[
['Which word rhymes with cat?','Hat','Cup','Dog','Cat and hat end with the same sound: at.'],
['Choose the correct spelling.','Because','Becaus','Beacause','Because explains a reason: I wore a coat because it was cold.'],
['In “The rabbit hops”, which word is the noun?','Rabbit','The','Hops','A noun names a person, place, thing or idea. Rabbit names an animal.'],
['Which word describes the ball in “the shiny ball”?','Shiny','The','Ball','Shiny is an adjective. It tells us what the ball is like.'],
['What is the plural of child?','Children','Childs','Childes','Some plurals change their spelling. One child becomes two children.'],
['Which sentence is a question?','Where is my kite?','My kite is red.','Fly the kite!','A question asks for information and ends with a question mark.'],
['Mia put on her boots. Outside, puddles covered the path. Why might Mia need boots?','To keep her feet dry','To read a book','To make it sunny','Puddles contain water. Boots can help keep her feet dry. We use clues in the story.'],
['Choose the past tense of go.','Went','Goed','Going','The past tense of go is went: Yesterday, we went to the park.'],
['Which word means the opposite of tiny?','Huge','Small','Little','Huge means very big. Tiny means very small.'],
['Choose the sentence with correct punctuation.','I like apples.','i like apples','I like apples,','A sentence begins with a capital letter and can end with a full stop.']
]},
{id:'science',name:'Science',place:'Discovery Garden',icon:'🔬',colour:'#dcefeb',description:'Plants, animals, materials and space.',questions:[
['Which part of a plant usually takes water from the soil?','Roots','Petals','Seeds','Roots absorb water from the soil. The stem carries water to other parts.'],
['What does a caterpillar become after its pupa stage?','A butterfly or moth','A frog','A spider','Butterflies and moths have a caterpillar stage, then a pupa stage, then become adults.'],
['What happens when ice warms enough to melt?','It becomes liquid water','It becomes stone','It disappears forever','Melting changes solid ice into liquid water.'],
['Which is a source of light?','The Sun','A wooden chair','An unlit candle','The Sun gives off light. An unlit candle does not.'],
['Which sense do we mainly use to hear a bell?','Hearing','Taste','Smell','Our ears help us hear sounds, including a ringing bell.'],
['What pulls a dropped ball towards the ground?','Gravity','A rainbow','Moonlight','Gravity pulls objects towards Earth.'],
['Which animal has six legs?','An ant','A spider','A dog','Insects, including ants, have six legs. Spiders have eight.'],
['Which material can a typical magnet attract?','Iron','Wood','Glass','Iron is a magnetic material. Wood and glass are not.']
]},
{id:'geography',name:'Geography',place:'Explorer Island',icon:'🌍',colour:'#dceaf5',description:'Maps, directions, land and water.',questions:[
['Which direction is opposite north?','South','East','West','North and south are opposite directions. East and west are opposites too.'],
['What does a map key explain?','The meaning of symbols','The weather tomorrow','How old you are','A map key explains symbols, such as a tent for a campsite.'],
['Which is the largest ocean on Earth?','Pacific Ocean','Arctic Ocean','Indian Ocean','The Pacific is the largest ocean on Earth.'],
['Which is a continent?','Africa','London','The Thames','Africa is a continent. London is a city, and the Thames is a river.'],
['Where does a river usually begin?','At its source','At its mouth','In a compass','The source is where a river begins. The mouth is where it enters a sea, lake or another river.'],
['What is an island?','Land surrounded by water','Water surrounded by mountains','A very tall building','An island is an area of land surrounded by water.'],
['Which is a human-made feature?','A bridge','A mountain','An ocean','People build bridges. Mountains and oceans are natural features.'],
['What is the equator?','An imaginary line around Earth’s middle','A road to the Moon','The bottom of the ocean','The equator divides Earth into the Northern and Southern Hemispheres.']
]},
{id:'history',name:'History',place:'Time Trail',icon:'🏺',colour:'#f4e4cc',description:'Explore the past and spot useful evidence.',questions:[
['What does a historian study?','The past','Only tomorrow','Only the weather','Historians study the past using evidence such as objects, documents and buildings.'],
['Which helps us put events in time order?','A timeline','A shopping basket','A compass','A timeline shows when events happened and their order.'],
['Which is older?','A Roman coin','A modern smartphone','A new electric car','The ancient Romans lived long before smartphones and modern electric cars.'],
['What is an archaeologist likely to study?','Objects and remains from the past','Next week’s lunch','Only living butterflies','Archaeologists study physical remains, including tools, pottery and buildings.'],
['Which can be a first-hand source about someone’s life?','Their diary','A made-up dragon story','A blank notebook','A diary written by that person can provide first-hand evidence about their experiences.'],
['What does a century mean?','100 years','10 years','1,000 years','A century is 100 years. A decade is 10 years.'],
['Which came first?','Steam trains','Space travel','Smartphones','Steam trains were used before people travelled to space or used smartphones.'],
['Why compare more than one account of an event?','To check different perspectives','To make the event happen again','To erase the past','Different accounts may include different details and perspectives. Comparing them helps us investigate.']
]},
{id:'computing',name:'Computing',place:'Robot Workshop',icon:'🤖',colour:'#e7def5',description:'Instructions, patterns and clever problem-solving.',questions:[
['What is an algorithm?','A set of steps to follow','A computer’s colour','A type of chair','An algorithm is a set of steps for completing a task. A recipe is one example.'],
['A robot must move forward twice. Which instructions work?','Forward, forward','Forward, turn','Turn, turn','Two forward instructions move the robot forward twice. Order matters.'],
['What is a loop in a program?','Instructions that repeat','A broken screen','A loudspeaker','A loop repeats instructions, helping us avoid writing the same steps many times.'],
['What does debugging mean?','Finding and fixing errors','Painting a computer','Deleting every file','Debugging means finding and fixing errors in a program.'],
['Which is an input device?','Keyboard','Monitor','Printer','A keyboard sends input to a computer. A monitor and printer produce output.'],
['What comes next: red, blue, red, blue, …?','Red','Green','Yellow','The pattern repeats red then blue, so red comes next.'],
['Which is sensible if an online message worries you?','Tell a trusted adult','Keep it secret forever','Send your password','A trusted adult can help you deal with a worrying message.'],
['A program says: if it rains, take an umbrella. It is raining. What should happen?','Take an umbrella','Ignore the instruction','Take a swimming pool','An if instruction checks a condition. Here the condition is true, so take an umbrella.']
]},
{id:'art',name:'Art & Design',place:'Colour Cove',icon:'🎨',colour:'#f3dfe7',description:'Colours, shapes, texture and creative choices.',questions:[
['What colour usually results from mixing red and yellow paint?','Orange','Green','Purple','With ordinary paints, mixing red and yellow makes orange.'],
['How many sides does a triangle have?','Three','Four','Five','A triangle has three straight sides and three corners.'],
['What does texture describe?','How a surface feels or looks like it feels','How loud music is','How fast a car moves','Texture can be smooth, rough, bumpy or soft. Artists can show texture in pictures too.'],
['What is a self-portrait?','A picture an artist makes of themselves','A picture of only trees','A map of a city','A self-portrait shows the artist who made it.'],
['Which is a warm colour?','Orange','Blue','Blue-green','Orange, red and yellow are often called warm colours.'],
['What is a sculpture?','A three-dimensional artwork','Only a pencil line','Only a photograph','A sculpture has three dimensions. It can be made from materials such as clay, wood or metal.'],
['Which tool is useful for drawing a straight line?','A ruler','A sponge','A spoon','You can draw along the edge of a ruler to make a straight line.'],
['What is a collage?','An artwork made by combining pieces of material','A type of drum','A weather forecast','A collage combines pieces such as paper or fabric on a surface.']
]},
{id:'music',name:'Music',place:'Melody Mountain',icon:'🎵',colour:'#f4ebc9',description:'Rhythm, instruments and musical words.',questions:[
['What does tempo describe?','How fast or slow music is','The colour of an instrument','The age of a singer','Tempo is the speed of music.'],
['Which instrument has strings?','Violin','Trumpet','Tambourine','A violin has strings that vibrate to make sound.'],
['What does a rest mean in music?','A period of silence','Play as loudly as possible','Start running','A rest tells the musician not to play for a certain amount of time.'],
['What is a beat?','A steady pulse in music','Only a very loud sound','A colour','The beat is the steady pulse you can often tap along to.'],
['Which word means a sound is high or low?','Pitch','Texture','Speed','Pitch describes how high or low a sound is.'],
['Which instrument is usually played by blowing air into it?','Flute','Drum','Violin','A flute is a wind instrument. The player blows air to make sound.'],
['What does a conductor help a group of musicians do?','Play together','Change their shoes','Paint the stage','A conductor uses gestures to help musicians follow timing and musical expression.'],
['Which word means getting gradually louder?','Crescendo','Silence','Portrait','A crescendo is a gradual increase in loudness.']
]},
{id:'languages',name:'Languages',place:'Hello Harbour',icon:'💬',colour:'#ddeeea',description:'First words in Spanish and French.',questions:[
['In Spanish, what does hola mean?','Hello','Goodbye','Thank you','Hola is a Spanish greeting meaning hello.'],
['Which Spanish word means thank you?','Gracias','Hola','Rojo','Gracias means thank you in Spanish.'],
['What does the Spanish number dos mean?','Two','One','Three','Uno is one, dos is two, and tres is three.'],
['Which colour is rojo in Spanish?','Red','Blue','Green','Rojo means red in Spanish.'],
['What does bonjour mean in French?','Hello / good day','Good night','Thank you','Bonjour is a French daytime greeting: hello or good day.'],
['Which French word means thank you?','Merci','Bonjour','Bleu','Merci means thank you in French.'],
['What does chat mean in French?','Cat','Dog','Bird','Un chat is a cat in French.'],
['Which colour is bleu in French?','Blue','Red','Yellow','Bleu means blue in French.']
]}
];
function shuffle(list,random=Math.random){const out=[...list];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
const api={subjects,shuffle};if(typeof module==='object')module.exports=api;else root.LearningWorld=api;
})(typeof window==='object'?window:globalThis);
