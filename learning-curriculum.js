(function () {
  "use strict";

  if (window.KiddoSproutCurriculum) return;

  function deepFreeze(value) {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      Object.freeze(value);
      for (const key of Object.keys(value)) deepFreeze(value[key]);
    }
    return value;
  }

  // Three home-education stages. Ages overlap on purpose: a family chooses the
  // stage that fits the child, not the child's birthday.
  const stages = [
    {
      id: "sprouts",
      name: "Sprouts",
      ages: "5-7",
      blurb: "First steps: counting, letter sounds, and noticing the world."
    },
    {
      id: "growers",
      name: "Growers",
      ages: "7-9",
      blurb: "Building confidence with patterns, tables, and longer writing."
    },
    {
      id: "explorers",
      name: "Explorers",
      ages: "9-11",
      blurb: "Deeper thinking: fractions, forces, evidence, and code."
    }
  ];

  // Every lesson below is written to be read aloud or worked through together.
  // `icon` names an inline SVG symbol in learning-path.html; no emoji is used
  // anywhere in the interface.
  const subjects = [
    {
      id: "maths",
      name: "Maths",
      icon: "maths",
      blurb: "Counting, number facts, and solving problems with confidence.",
      units: [
        {
          id: "maths-sprouts-1",
          stage: "sprouts",
          title: "Counting and Number",
          summary: "Count reliably, read numbers to 20, and find one more or one less.",
          lessons: [
            {
              id: "maths-sprouts-counting-to-10",
              title: "Counting to 10",
              minutes: 10,
              objective: "Count objects reliably up to 10 and know that the last number tells you how many.",
              teach: [
                "When we count, we say one number for each thing we touch. Touch each object once as you say the number.",
                "The last number you say is the answer. If you say one, two, three, four, there are four things.",
                "Slide the objects into a line before you start. A neat line is much easier to count."
              ],
              vocab: [
                ["count", "saying one number for each object"],
                ["altogether", "the total after you count everything"]
              ],
              activity: {
                id: "maths-sprouts-counting-to-10-practice",
                type: "quiz",
                prompt: "Aisha counts four shells. Then she finds one more shell. How many shells now?",
                options: ["Three", "Four", "Five"],
                answer: 2,
                explain: "One more than four is five. Counting on one gives five."
              },
              task: "Find five small toys. Line them up and count them out loud twice."
            },
            {
              id: "maths-sprouts-numbers-to-20",
              title: "Numbers to 20",
              minutes: 12,
              objective: "Read and write the numbers 11 to 20 and know what each digit is worth.",
              teach: [
                "Numbers from 11 to 19 are made of a ten and some ones. Fourteen is one ten and four ones.",
                "Twenty is two tens and no ones left over.",
                "Teen numbers are tricky to hear. Fourteen and forty sound alike, so always check the written number."
              ],
              vocab: [
                ["ten", "a group of ten ones"],
                ["teen number", "a number from 13 to 19"]
              ],
              activity: {
                id: "maths-sprouts-numbers-to-20-practice",
                type: "fill",
                prompt: "What number is one ten and seven ones? Write it in digits.",
                accept: ["17"],
                hint: "Put the ten first, then the ones.",
                explain: "One ten and seven ones make 17."
              },
              task: "Count the stairs in your home. Say the number each time you step."
            },
            {
              id: "maths-sprouts-one-more-one-less",
              title: "One More, One Less",
              minutes: 12,
              objective: "Find one more and one less than any number to 20 without counting from the start.",
              teach: [
                "One more than a number is the next number when you count forwards.",
                "One less is the number you say just before it.",
                "If you know six and seven are neighbours, you can answer one more and one less straight away."
              ],
              vocab: [
                ["more", "a bigger amount"],
                ["less", "a smaller amount"]
              ],
              activity: {
                id: "maths-sprouts-one-more-one-less-practice",
                type: "order",
                prompt: "Put these numbers in order, starting with the smallest.",
                items: ["6", "8", "11", "15"],
                explain: "Counting forwards gives 6, 8, 11, 15."
              },
              task: "Roll a dice twice and say one more and one less than the total."
            }
          ]
        },
        {
          id: "maths-growers-1",
          stage: "growers",
          title: "Multiplication and Division",
          summary: "Understand equal groups, learn table facts, and share with remainders.",
          lessons: [
            {
              id: "maths-growers-equal-groups",
              title: "Equal Groups",
              minutes: 15,
              objective: "Understand multiplication as repeated equal groups.",
              teach: [
                "Multiplication is a fast way to add the same number again and again.",
                "Three groups of four is the same as four plus four plus four.",
                "The groups must be equal. Three groups of four and one group of five is not multiplication."
              ],
              vocab: [
                ["group", "a set of the same number of things"],
                ["multiply", "put equal groups together to find a total"]
              ],
              activity: {
                id: "maths-growers-equal-groups-practice",
                type: "quiz",
                prompt: "There are 4 bags. Each bag holds 3 apples. Which calculation finds the total?",
                options: ["4 + 3", "4 x 3", "4 - 3"],
                answer: 1,
                explain: "4 groups of 3 is 4 multiplied by 3, which is 12 apples."
              },
              task: "Lay out buttons in 3 equal groups. Count the total two different ways."
            },
            {
              id: "maths-growers-times-table-facts",
              title: "Times Table Facts",
              minutes: 15,
              objective: "Recall multiplication facts for the 2, 5 and 10 times tables.",
              teach: [
                "Table facts are worth learning by heart so you can use them quickly.",
                "The 2 times table doubles every number. The 10 times table puts a zero on the end.",
                "The 5 times table always ends in 5 or 0."
              ],
              vocab: [
                ["fact", "something you know straight away"],
                ["multiple", "the answer when you multiply by a whole number"]
              ],
              activity: {
                id: "maths-growers-times-table-facts-practice",
                type: "match",
                prompt: "Match each calculation to its answer.",
                pairs: [
                  ["6 x 2", "12"],
                  ["6 x 5", "30"],
                  ["6 x 10", "60"]
                ]
              },
              task: "Chant the 5 times table while you climb the stairs."
            },
            {
              id: "maths-growers-sharing-remainders",
              title: "Sharing and Remainders",
              minutes: 15,
              objective: "Divide by sharing into equal groups and record any remainder.",
              teach: [
                "Division asks how many are in each share, or how many shares you can make.",
                "Sometimes a number will not divide exactly. The amount left over is the remainder.",
                "Seventeen shared between five gives three each with two left over."
              ],
              vocab: [
                ["divide", "share into equal groups"],
                ["remainder", "the amount left over after dividing"]
              ],
              activity: {
                id: "maths-growers-sharing-remainders-practice",
                type: "fill",
                prompt: "Share 17 counters between 5 children. How many are left over? Write just the number.",
                accept: ["2"],
                hint: "5, 10, 15 - then count what is left.",
                explain: "Five into seventeen goes three times (15) with 2 left over."
              },
              task: "Share a handful of pasta between 4 bowls and say the remainder."
            }
          ]
        },
        {
          id: "maths-explorers-1",
          stage: "explorers",
          title: "Fractions and Decimals",
          summary: "Find equivalent fractions, add them, and connect them to decimal place value.",
          lessons: [
            {
              id: "maths-explorers-equivalent-fractions",
              title: "Equivalent Fractions",
              minutes: 18,
              objective: "Recognise and create equivalent fractions.",
              teach: [
                "A fraction shows equal parts of a whole. The bottom number tells you how many parts the whole is cut into.",
                "Multiplying the top and bottom by the same number makes an equivalent fraction.",
                "One half is the same as two quarters, and the same as five tenths."
              ],
              vocab: [
                ["numerator", "the top number of a fraction"],
                ["equivalent", "equal in value but written differently"]
              ],
              activity: {
                id: "maths-explorers-equivalent-fractions-practice",
                type: "quiz",
                prompt: "Which fraction is equivalent to one half?",
                options: ["Two thirds", "Three sixths", "Two fifths"],
                answer: 1,
                explain: "Three sixths simplifies to one half because 3 is half of 6."
              },
              task: "Fold a sheet of paper in half, then in half again. Count how many quarters make one half."
            },
            {
              id: "maths-explorers-adding-fractions",
              title: "Adding Fractions",
              minutes: 18,
              objective: "Add fractions with the same denominator.",
              teach: [
                "When the bottom numbers match, add only the top numbers.",
                "One fifth plus two fifths is three fifths. The size of each part has not changed.",
                "If the answer fills the whole, rewrite it as one."
              ],
              vocab: [
                ["denominator", "the bottom number of a fraction"],
                ["common denominator", "the same bottom number in two fractions"]
              ],
              activity: {
                id: "maths-explorers-adding-fractions-practice",
                type: "fill",
                prompt: "One seventh plus two sevenths equals how many sevenths? Write the top number only.",
                accept: ["3"],
                hint: "The bottom number stays the same.",
                explain: "1 + 2 = 3, so the answer is three sevenths."
              },
              task: "Cut a cake picture into eighths and colour three eighths, then two eighths."
            },
            {
              id: "maths-explorers-decimal-place-value",
              title: "Decimals and Place Value",
              minutes: 18,
              objective: "Read decimals to two places and know the value of each digit.",
              teach: [
                "A decimal point separates whole numbers from parts of a whole.",
                "The first place after the point is tenths and the second is hundredths.",
                "In 4.27 the four is worth four, the two is worth two tenths, and the seven is worth seven hundredths."
              ],
              vocab: [
                ["decimal point", "the dot between whole numbers and parts"],
                ["hundredths", "one hundred equal parts of a whole"]
              ],
              activity: {
                id: "maths-explorers-decimal-place-value-practice",
                type: "order",
                prompt: "Put these decimals in order, starting with the smallest.",
                items: ["0.5", "0.75", "1.2", "1.25"],
                explain: "Compare tenths first, then hundredths: 0.5, 0.75, 1.2, 1.25."
              },
              task: "Measure three objects in metres and write each length as a decimal."
            }
          ]
        }
      ]
    },
    {
      id: "english",
      name: "English",
      icon: "english",
      blurb: "Sounds, sentences, reading clues, and expressing ideas clearly.",
      units: [
        {
          id: "english-sprouts-1",
          stage: "sprouts",
          title: "Sounds and Words",
          summary: "Listen for rhymes and notice the sounds at the ends of words.",
          lessons: [
            {
              id: "english-sprouts-hear-the-rhyme",
              title: "Hear the Rhyme",
              minutes: 10,
              objective: "Recognise words that rhyme by listening to their ending sounds.",
              teach: [
                "Rhyming words have the same sound at the end, such as cat and hat.",
                "Say both words slowly. Listen to the ending rather than looking only at the letters.",
                "Words can rhyme even when they begin with different sounds."
              ],
              vocab: [
                ["rhyme", "words with the same or a very similar ending sound"],
                ["sound", "what you hear when a word is spoken"]
              ],
              activity: {
                id: "english-sprouts-hear-the-rhyme-practice",
                type: "match",
                prompt: "Match each word to the word that rhymes with it.",
                pairs: [
                  ["cat", "hat"],
                  ["log", "frog"],
                  ["star", "car"]
                ],
                explain: "Cat and hat, log and frog, and star and car have matching ending sounds."
              },
              task: "Choose an object nearby. Say its name and make up a silly word that rhymes with it."
            }
          ]
        },
        {
          id: "english-growers-1",
          stage: "growers",
          title: "Strong Sentences",
          summary: "Arrange words into a clear sentence and check the punctuation.",
          lessons: [
            {
              id: "english-growers-build-a-sentence",
              title: "Build a Clear Sentence",
              minutes: 12,
              objective: "Build a sentence with a subject, an action, and correct punctuation.",
              teach: [
                "A sentence shares a complete idea. It often tells us who or what, and what happened.",
                "A sentence begins with a capital letter and ends with punctuation.",
                "Read your sentence aloud. If it sounds unfinished, check whether an important word is missing."
              ],
              vocab: [
                ["subject", "the person, animal, place, or thing the sentence is about"],
                ["punctuation", "marks that help make writing clear"]
              ],
              activity: {
                id: "english-growers-build-a-sentence-practice",
                type: "order",
                prompt: "Put the words and punctuation in order to make a sentence.",
                items: ["The", "small", "fox", "runs", "."],
                explain: "The small fox runs. It begins with a capital letter and ends with a full stop."
              },
              task: "Write a new sentence about an animal. Circle the subject and underline the action."
            }
          ]
        },
        {
          id: "english-explorers-1",
          stage: "explorers",
          title: "Reading for Evidence",
          summary: "Use details in a short text to support an answer.",
          lessons: [
            {
              id: "english-explorers-find-the-evidence",
              title: "Find the Evidence",
              minutes: 15,
              objective: "Choose a detail from a text that supports an idea.",
              teach: [
                "Evidence is a word, phrase, or detail that helps prove an answer.",
                "Read the question first, then scan the text for a detail that answers it.",
                "A strong answer explains how the evidence connects to the idea."
              ],
              vocab: [
                ["evidence", "a detail that supports an answer or idea"],
                ["infer", "work something out using clues and what you already know"]
              ],
              activity: {
                id: "english-explorers-find-the-evidence-practice",
                type: "quiz",
                prompt: "Mina packed a raincoat and checked the dark clouds twice. Which detail best shows that she expects rain?",
                options: ["Her name is Mina", "She packed a raincoat", "She checked twice"],
                answer: 1,
                explain: "Packing a raincoat is the clearest evidence that Mina expects wet weather."
              },
              task: "Read a paragraph from a book. Tell someone one idea and the exact detail that supports it."
            }
          ]
        }
      ]
    },
    {
      id: "science",
      name: "Science",
      icon: "science",
      blurb: "Observe, ask questions, and use evidence to explain how things work.",
      units: [
        {
          id: "science-sprouts-1",
          stage: "sprouts",
          title: "Living Things",
          summary: "Notice what living things need and how they are different from objects.",
          lessons: [
            {
              id: "science-sprouts-living-or-not",
              title: "Living or Not?",
              minutes: 10,
              objective: "Identify simple signs that something is living.",
              teach: [
                "Living things need water or food, and they change as they grow.",
                "Plants and animals are living things, even though they move in different ways.",
                "A toy can move when someone pushes it, but it does not grow or need food."
              ],
              vocab: [
                ["living", "alive and able to grow"],
                ["observe", "look or listen carefully to notice details"]
              ],
              activity: {
                id: "science-sprouts-living-or-not-practice",
                type: "quiz",
                prompt: "Which one is a living thing?",
                options: ["A sunflower", "A wooden chair", "A toy bus"],
                answer: 0,
                explain: "A sunflower is living: it needs water and light, and it grows."
              },
              task: "Look through a window or visit a safe outdoor space with an adult. Name two living things you notice."
            }
          ]
        },
        {
          id: "science-growers-1",
          stage: "growers",
          title: "Plant Life Cycles",
          summary: "Put the stages of a flowering plant's life cycle in order.",
          lessons: [
            {
              id: "science-growers-plant-life-cycle",
              title: "A Plant's Life Cycle",
              minutes: 12,
              objective: "Describe the main stages in the life cycle of a flowering plant.",
              teach: [
                "A seed can germinate when it has suitable water, warmth, and air.",
                "The young seedling grows roots, a stem, and leaves before becoming a mature plant.",
                "Flowers can help the plant make new seeds, beginning the cycle again."
              ],
              vocab: [
                ["germinate", "begin to grow from a seed"],
                ["life cycle", "the stages a living thing passes through"]
              ],
              activity: {
                id: "science-growers-plant-life-cycle-practice",
                type: "order",
                prompt: "Put these plant stages in order, starting with the earliest.",
                items: ["seed", "seedling", "mature plant", "flower and new seeds"],
                explain: "A seed germinates into a seedling, grows into a mature plant, then makes flowers and new seeds."
              },
              task: "Draw four boxes and sketch the plant life cycle. Add an arrow between each stage."
            }
          ]
        },
        {
          id: "science-explorers-1",
          stage: "explorers",
          title: "Forces in Action",
          summary: "Explain pushes, pulls, and how friction changes movement.",
          lessons: [
            {
              id: "science-explorers-friction",
              title: "Push, Pull, and Friction",
              minutes: 15,
              objective: "Explain how friction can slow a moving object.",
              teach: [
                "A force is a push or a pull that can change an object's movement.",
                "Friction acts between touching surfaces and usually works against movement.",
                "Rough surfaces often create more friction than smooth surfaces."
              ],
              vocab: [
                ["force", "a push or a pull"],
                ["friction", "a force between touching surfaces that resists movement"]
              ],
              activity: {
                id: "science-explorers-friction-practice",
                type: "fill",
                prompt: "What force slows a book sliding across a table? Write one word.",
                accept: ["friction"],
                hint: "It acts where the book and table touch.",
                explain: "Friction between the book and the table acts against the movement."
              },
              task: "With an adult nearby, slide an eraser gently over two safe surfaces. Describe which surface creates more friction."
            }
          ]
        }
      ]
    }
  ];

  const lessons = subjects.flatMap((subject) => subject.units.flatMap((unit) => (
    unit.lessons.map((lesson) => ({
      ...lesson,
      subjectId: subject.id,
      subjectName: subject.name,
      unitId: unit.id,
      unitTitle: unit.title,
      unitSummary: unit.summary,
      stage: unit.stage
    }))
  )));

  window.KiddoSproutCurriculum = deepFreeze({
    version: 1,
    stages,
    subjects,
    lessons
  });
}());
