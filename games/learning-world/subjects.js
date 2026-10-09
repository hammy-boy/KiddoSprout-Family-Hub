(function(root){
// Each row: prompt, correct answer, two alternatives, teaching explanation.
const subjects=[
{id:'maths',name:'Maths',place:'Number Nook',icon:'🔢',colour:'#e3edd5',description:'Explore numbers, operations, fractions and shapes.',game:{href:'../multiplication-runner/index.html',label:'Open Math Runner →'},study:[
{title:'Place value',text:'A digit has a value based on its position. In 3,482, the 3 stands for 3,000.',example:'3,000 + 400 + 80 + 2 = 3,482.',check:'In 5,216, what is the value of the 2?',answer:'The 2 is in the hundreds place, so its value is 200.'},
{title:'Addition and subtraction',text:'Addition joins amounts. Subtraction finds the difference or what remains. You can check subtraction with addition.',example:'If 47 - 18 = 29, check it with 29 + 18 = 47.',check:'What is 36 + 27?',answer:'63. Add the ones (6 + 7 = 13), then combine the tens.'},
{title:'Multiplication and division',text:'Multiplication is equal groups. Division shares into equal groups. They can check each other.',example:'4 groups of 6 make 24, so 24 divided by 6 is 4.',check:'There are 35 apples shared equally among 5 baskets. How many in each?',answer:'7 apples in each basket, because 5 x 7 = 35.'},
{title:'Fractions and shapes',text:'A fraction names equal parts of a whole. Shape properties include sides, corners and angles.',example:'One half and two quarters are equal: 1/2 = 2/4.',check:'What is one quarter of 20?',answer:'5. Four equal groups of 5 make 20.'}
],questions:[
['What is 7 + 8?','15','14','16','You can make ten first: 7 + 3 + 5 = 15.'],
['What is 9 x 4?','36','32','45','Nine groups of four make 36.'],
['What is 45 - 19?','26','24','34','Subtract 20 to get 25, then add 1 back: 26.'],
['What is 56 divided by 7?','8','7','9','Seven groups of eight make 56.'],
['What is one quarter of 20?','5','4','10','A quarter means split into four equal groups: 20 divided by 4 is 5.'],
['A square has sides of 5 cm. What is its perimeter?','20 cm','10 cm','25 cm','Perimeter is the distance around the edge: 5 + 5 + 5 + 5 = 20 cm.'],
['In 3,482, what is the value of the digit 3?','3,000','300','30','The 3 is in the thousands place, so its value is 3,000.'],
['Which fraction is larger?','3/4','1/2','They are equal','Three quarters is larger than one half. On a number line, 3/4 is farther along.'],
['What comes next: 5, 10, 15, ...?','20','18','25','The pattern increases by 5 each time, so 15 + 5 = 20.'],
['What is the area of a rectangle that is 4 cm long and 3 cm wide?','12 square cm','14 square cm','7 square cm','Area is length times width: 4 x 3 = 12 square cm.']
]},
{id:'english',name:'English',place:'Word Woods',icon:'📚',colour:'#e3eed6',description:'Spelling, grammar, rhymes and little stories.',study:[
{title:'Word classes',text:'Nouns name people, places, things or ideas. Verbs show actions. Adjectives describe nouns.',example:'In "The bright bird sings", bird is a noun, bright is an adjective, and sings is a verb.',check:'Which word is the verb in "A puppy runs fast"?',answer:'Runs is the verb because it tells us the action.'},
{title:'Build a sentence',text:'A sentence starts with a capital letter and expresses a complete idea. It usually ends with punctuation.',example:'"We planted seeds." starts with a capital and ends with a full stop.',check:'Which punctuation mark belongs at the end of "Where is my book"?',answer:'A question mark, because the sentence asks something.'},
{title:'Spelling clues',text:'Break a long word into syllables and look for familiar letter patterns. Read it aloud to hear the parts.',example:'Remember can be read as re-mem-ber.',check:'How many syllables can you hear in "butterfly"?',answer:'Three: but-ter-fly.'},
{title:'Story detectives',text:'Readers use details in a story to make an inference. An inference is a sensible idea supported by clues.',example:'If a character grabs an umbrella and rain is falling, the clues suggest they want to stay dry.',check:'A character yawns and rubs their eyes. What might they need?',answer:'They may be tired and need rest. The actions are clues.'}
],questions:[
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
{id:'science',name:'Science',place:'Discovery Garden',icon:'🔬',colour:'#dcefeb',description:'Plants, animals, materials and space.',study:[
{title:'Plants and life cycles',text:'Plants use roots to take in water and leaves to collect light. Many animals grow through stages in a life cycle.',example:'A butterfly life cycle goes from egg to caterpillar to pupa to adult.',check:'Which plant part usually absorbs water from the soil?',answer:'Roots absorb water; the stem carries it to other parts.'},
{title:'Materials and mixtures',text:'Materials have properties such as hardness, flexibility and whether they dissolve. Mixtures combine substances without joining them chemically.',example:'Sand and water make a mixture. A filter can trap sand while water passes through.',check:'How could you separate iron filings from sand?',answer:'Use a magnet: it attracts the iron but not the sand.'},
{title:'Forces and light',text:'A force is a push or pull. Gravity pulls objects towards Earth. Light travels from a source and can reflect from surfaces.',example:'The Sun is a light source; a mirror reflects light rather than making its own.',check:'What force pulls a dropped ball towards the ground?',answer:'Gravity pulls it towards Earth.'},
{title:'Elements and matter',text:'An element is a pure substance made from one kind of atom. The periodic table organizes elements by atomic number and properties.',example:'Water is a compound made from hydrogen and oxygen; oxygen gas is an element.',check:'Is water an element or a compound?',answer:'Water is a compound because it contains hydrogen and oxygen chemically joined.'}
],questions:[
['Which part of a plant usually takes water from the soil?','Roots','Petals','Seeds','Roots absorb water from the soil. The stem carries water to other parts.'],
['What does a caterpillar become after its pupa stage?','A butterfly or moth','A frog','A spider','Butterflies and moths have a caterpillar stage, then a pupa stage, then become adults.'],
['What happens when ice warms enough to melt?','It becomes liquid water','It becomes stone','It disappears forever','Melting changes solid ice into liquid water.'],
['Which is a source of light?','The Sun','A wooden chair','An unlit candle','The Sun gives off light. An unlit candle does not.'],
['Which sense do we mainly use to hear a bell?','Hearing','Taste','Smell','Our ears help us hear sounds, including a ringing bell.'],
['What pulls a dropped ball towards the ground?','Gravity','A rainbow','Moonlight','Gravity pulls objects towards Earth.'],
['Which animal has six legs?','An ant','A spider','A dog','Insects, including ants, have six legs. Spiders have eight.'],
['Which material can a typical magnet attract?','Iron','Wood','Glass','Iron is a magnetic material. Wood and glass are not.']
]},
{id:'geography',name:'Geography',place:'Explorer Island',icon:'🌍',colour:'#dceaf5',description:'Maps, directions, land and water.',study:[
{title:'Map skills',text:'Maps show places from above. A key explains the symbols, a compass rose shows directions, and a scale helps compare distances.',example:'A tent symbol in a map key might mark a campsite.',check:'What does a map key explain?',answer:'The meaning of the map symbols.'},
{title:'Land and water',text:'Physical features are natural, such as rivers and mountains. Human features are built by people, such as bridges and roads.',example:'A river begins at its source and flows towards its mouth.',check:'Is a bridge a physical or human feature?',answer:'A bridge is a human feature because people build it.'},
{title:'Our planet',text:'Earth has continents and oceans. The equator is an imaginary line around the middle of Earth.',example:'The Pacific Ocean is the largest ocean on Earth.',check:'What is an island?',answer:'An area of land surrounded by water.'},
{title:'Weather and climate',text:'Weather describes conditions over a short time. Climate describes the usual weather patterns of a place over many years.',example:'A rainy afternoon is weather; a region’s typical wet season is part of its climate.',check:'Is tomorrow’s forecast weather or climate?',answer:'Weather: it describes a short time.'}
],questions:[
['Which direction is opposite north?','South','East','West','North and south are opposite directions. East and west are opposites too.'],
['What does a map key explain?','The meaning of symbols','The weather tomorrow','How old you are','A map key explains symbols, such as a tent for a campsite.'],
['Which is the largest ocean on Earth?','Pacific Ocean','Arctic Ocean','Indian Ocean','The Pacific is the largest ocean on Earth.'],
['Which is a continent?','Africa','London','The Thames','Africa is a continent. London is a city, and the Thames is a river.'],
['Where does a river usually begin?','At its source','At its mouth','In a compass','The source is where a river begins. The mouth is where it enters a sea, lake or another river.'],
['What is an island?','Land surrounded by water','Water surrounded by mountains','A very tall building','An island is an area of land surrounded by water.'],
['Which is a human-made feature?','A bridge','A mountain','An ocean','People build bridges. Mountains and oceans are natural features.'],
['What is the equator?','An imaginary line around Earth’s middle','A road to the Moon','The bottom of the ocean','The equator divides Earth into the Northern and Southern Hemispheres.']
]},
{id:'history',name:'History',place:'Time Trail',icon:'🏺',colour:'#f4e4cc',description:'Explore the past and spot useful evidence.',study:[
{title:'Sources and evidence',text:'Historians use evidence to investigate the past. Sources include objects, photographs, letters, diaries and buildings.',example:'A diary written by someone at the time is a first-hand source about their experiences.',check:'What might an archaeologist learn from an old pot?',answer:'It can offer evidence about how people made, stored or used things.'},
{title:'Timelines',text:'A timeline puts events in time order. Dates help historians compare when events happened.',example:'A timeline can show that steam trains came before space travel.',check:'How many years are in a century?',answer:'100 years.'},
{title:'Change and continuity',text:'Some parts of life change over time; others continue. Comparing evidence from different periods can reveal both.',example:'People have travelled for a long time, but the vehicles they use have changed.',check:'Why compare an old object with a modern one?',answer:'To notice what changed and what stayed similar.'},
{title:'Different viewpoints',text:'People can remember or describe the same event differently. Historians compare accounts and check evidence.',example:'Two witnesses may notice different details from different places.',check:'Why read more than one account of an event?',answer:'To compare perspectives and build a better-supported understanding.'}
],questions:[
['What does a historian study?','The past','Only tomorrow','Only the weather','Historians study the past using evidence such as objects, documents and buildings.'],
['Which helps us put events in time order?','A timeline','A shopping basket','A compass','A timeline shows when events happened and their order.'],
['Which is older?','A Roman coin','A modern smartphone','A new electric car','The ancient Romans lived long before smartphones and modern electric cars.'],
['What is an archaeologist likely to study?','Objects and remains from the past','Next week’s lunch','Only living butterflies','Archaeologists study physical remains, including tools, pottery and buildings.'],
['Which can be a first-hand source about someone’s life?','Their diary','A made-up dragon story','A blank notebook','A diary written by that person can provide first-hand evidence about their experiences.'],
['What does a century mean?','100 years','10 years','1,000 years','A century is 100 years. A decade is 10 years.'],
['Which came first?','Steam trains','Space travel','Smartphones','Steam trains were used before people travelled to space or used smartphones.'],
['Why compare more than one account of an event?','To check different perspectives','To make the event happen again','To erase the past','Different accounts may include different details and perspectives. Comparing them helps us investigate.']
]},
{id:'computing',name:'Computing',place:'Robot Workshop',icon:'🤖',colour:'#e7def5',description:'Instructions, patterns and clever problem-solving.',study:[
{title:'Algorithms',text:'An algorithm is a clear set of steps for a task. Instructions need to be precise and in a useful order.',example:'A recipe is an everyday algorithm: follow steps to make something.',check:'What is an algorithm?',answer:'A set of instructions or steps for solving a problem or doing a task.'},
{title:'Loops and patterns',text:'A loop repeats instructions. Patterns help us predict what comes next and can make programs shorter.',example:'A loop can tell a robot to move forward four times.',check:'In red, blue, red, blue, what comes next?',answer:'Red: the two-colour pattern repeats.'},
{title:'Inputs and outputs',text:'A computer receives input, follows instructions, then produces output. Different devices can be inputs or outputs.',example:'A keyboard sends input; a monitor shows output.',check:'Is a keyboard usually an input or output device?',answer:'An input device: it sends information to the computer.'},
{title:'Debugging and safety',text:'Debugging means finding and fixing errors. Online, protect personal details and tell a trusted adult if something worries you.',example:'Test a program one step at a time to find where it goes wrong.',check:'What should you do if an online message makes you worried?',answer:'Tell a trusted adult and ask them for help.'}
],questions:[
['What is an algorithm?','A set of steps to follow','A computer’s colour','A type of chair','An algorithm is a set of steps for completing a task. A recipe is one example.'],
['A robot must move forward twice. Which instructions work?','Forward, forward','Forward, turn','Turn, turn','Two forward instructions move the robot forward twice. Order matters.'],
['What is a loop in a program?','Instructions that repeat','A broken screen','A loudspeaker','A loop repeats instructions, helping us avoid writing the same steps many times.'],
['What does debugging mean?','Finding and fixing errors','Painting a computer','Deleting every file','Debugging means finding and fixing errors in a program.'],
['Which is an input device?','Keyboard','Monitor','Printer','A keyboard sends input to a computer. A monitor and printer produce output.'],
['What comes next: red, blue, red, blue, …?','Red','Green','Yellow','The pattern repeats red then blue, so red comes next.'],
['Which is sensible if an online message worries you?','Tell a trusted adult','Keep it secret forever','Send your password','A trusted adult can help you deal with a worrying message.'],
['A program says: if it rains, take an umbrella. It is raining. What should happen?','Take an umbrella','Ignore the instruction','Take a swimming pool','An if instruction checks a condition. Here the condition is true, so take an umbrella.']
]},
{id:'art',name:'Art & Design',place:'Colour Cove',icon:'🎨',colour:'#f3dfe7',description:'Colours, shapes, texture and creative choices.',study:[
{title:'Colour mixing',text:'Artists use colour choices to create mood and contrast. With ordinary paints, red and yellow make orange.',example:'Warm colours often include red, orange and yellow; blues and greens are often called cool.',check:'What colour do red and yellow paint usually make?',answer:'Orange.'},
{title:'Lines and shapes',text:'Lines can be straight, curved, thick or thin. Shapes can be geometric or organic.',example:'A triangle has three sides; a circle has a curved edge and no corners.',check:'How many sides does a triangle have?',answer:'Three.'},
{title:'Texture and materials',text:'Texture describes how a surface feels or appears to feel. Artists can combine materials to make a collage.',example:'Rough paper and smooth foil create different textures in one artwork.',check:'What is a collage?',answer:'An artwork made by combining pieces of materials on a surface.'},
{title:'Plan a composition',text:'Composition is how parts of an artwork are arranged. Artists can choose a focal point to guide the viewer’s attention.',example:'A large bright shape near the centre can become a focal point.',check:'What is a self-portrait?',answer:'A picture an artist makes of themselves.'}
],questions:[
['What colour usually results from mixing red and yellow paint?','Orange','Green','Purple','With ordinary paints, mixing red and yellow makes orange.'],
['How many sides does a triangle have?','Three','Four','Five','A triangle has three straight sides and three corners.'],
['What does texture describe?','How a surface feels or looks like it feels','How loud music is','How fast a car moves','Texture can be smooth, rough, bumpy or soft. Artists can show texture in pictures too.'],
['What is a self-portrait?','A picture an artist makes of themselves','A picture of only trees','A map of a city','A self-portrait shows the artist who made it.'],
['Which is a warm colour?','Orange','Blue','Blue-green','Orange, red and yellow are often called warm colours.'],
['What is a sculpture?','A three-dimensional artwork','Only a pencil line','Only a photograph','A sculpture has three dimensions. It can be made from materials such as clay, wood or metal.'],
['Which tool is useful for drawing a straight line?','A ruler','A sponge','A spoon','You can draw along the edge of a ruler to make a straight line.'],
['What is a collage?','An artwork made by combining pieces of material','A type of drum','A weather forecast','A collage combines pieces such as paper or fabric on a surface.']
]},
{id:'music',name:'Music',place:'Melody Mountain',icon:'🎵',colour:'#f4ebc9',description:'Rhythm, instruments and musical words.',study:[
{title:'Beat and rhythm',text:'The beat is a steady pulse. Rhythm is the pattern of long and short sounds and silences played around the beat.',example:'Clap a steady beat, then tap a different rhythm over it.',check:'What is a beat?',answer:'A steady pulse in music.'},
{title:'Pitch and tempo',text:'Pitch describes how high or low a sound is. Tempo describes how fast or slow the music moves.',example:'A tune can have a high pitch and a slow tempo at the same time.',check:'Which word describes how fast or slow music is?',answer:'Tempo.'},
{title:'Families of instruments',text:'Instruments make sound in different ways. String instruments vibrate strings; wind instruments use moving air; percussion instruments are struck or shaken.',example:'A violin has strings; a flute uses air; a drum is percussion.',check:'Which family does a flute belong to?',answer:'Wind instruments.'},
{title:'Musical expression',text:'Dynamics describe how loud or quiet music is. A crescendo means the music gradually gets louder.',example:'Musicians may change dynamics to make a performance feel exciting or gentle.',check:'What does a rest mean in music?',answer:'A period of silence.'}
],questions:[
['What does tempo describe?','How fast or slow music is','The colour of an instrument','The age of a singer','Tempo is the speed of music.'],
['Which instrument has strings?','Violin','Trumpet','Tambourine','A violin has strings that vibrate to make sound.'],
['What does a rest mean in music?','A period of silence','Play as loudly as possible','Start running','A rest tells the musician not to play for a certain amount of time.'],
['What is a beat?','A steady pulse in music','Only a very loud sound','A colour','The beat is the steady pulse you can often tap along to.'],
['Which word means a sound is high or low?','Pitch','Texture','Speed','Pitch describes how high or low a sound is.'],
['Which instrument is usually played by blowing air into it?','Flute','Drum','Violin','A flute is a wind instrument. The player blows air to make sound.'],
['What does a conductor help a group of musicians do?','Play together','Change their shoes','Paint the stage','A conductor uses gestures to help musicians follow timing and musical expression.'],
['Which word means getting gradually louder?','Crescendo','Silence','Portrait','A crescendo is a gradual increase in loudness.']
]},
{id:'languages',name:'Languages',place:'Hello Harbour',icon:'💬',colour:'#ddeeea',description:'First words in Spanish and French.',study:[
{title:'Greetings',text:'Greetings help us begin a conversation. Spanish and French words can sound different from English, so listen and practise them.',example:'Hola means hello in Spanish. Bonjour means hello or good day in French.',check:'What does hola mean?',answer:'Hello in Spanish.'},
{title:'Useful words',text:'A few polite words can help you communicate. Practise saying them aloud and notice which language each belongs to.',example:'Gracias means thank you in Spanish. Merci means thank you in French.',check:'Which language uses the word merci?',answer:'French.'},
{title:'Numbers and colours',text:'Numbers and colours are useful words to learn in a new language. Say each one with an object you can see.',example:'Dos is two in Spanish; bleu is blue in French.',check:'What number is dos?',answer:'Two in Spanish.'},
{title:'Build a phrase',text:'A short phrase can combine a greeting with a name or a simple description. Word order and pronunciation may differ across languages.',example:'Bonjour is a friendly French greeting you can use during the day.',check:'What does bleu mean in French?',answer:'Blue.'}
],questions:[
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
