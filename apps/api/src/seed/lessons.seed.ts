import type { Types } from 'mongoose'
import { v4 as uuidv4 } from 'uuid'
import { GrammarConcept } from '../models/grammar-concept.model.js'
import { Lesson } from '../models/lesson.model.js'
import { VocabularyItem } from '../models/vocabulary-item.model.js'

export async function seedLessons(unitIdMap: Map<number, Types.ObjectId>): Promise<void> {
  const count = await Lesson.countDocuments()
  if (count > 0) {
    console.log('Lessons already seeded, skipping...')
    return
  }

  const week1Id = unitIdMap.get(1)!
  const week2Id = unitIdMap.get(2)!
  const week3Id = unitIdMap.get(3)!
  const week4Id = unitIdMap.get(4)!

  // Get grammar concept IDs
  const articlesConceptDoc = await GrammarConcept.findOne({
    name: 'Definite Articles (der, die, das)',
  })
  const _pronounsConceptDoc = await GrammarConcept.findOne({
    name: 'Personal Pronouns (ich, du, er, sie, es)',
  })
  const seinConceptDoc = await GrammarConcept.findOne({
    name: 'Present Tense: sein (to be)',
  })
  const habenConceptDoc = await GrammarConcept.findOne({
    name: 'Present Tense: haben (to have)',
  })
  const accusativeConceptDoc = await GrammarConcept.findOne({
    name: 'Accusative Case (direct objects)',
  })
  const dativeConceptDoc = await GrammarConcept.findOne({
    name: 'Dative Case with Prepositions',
  })

  // Get some vocab IDs
  const halloDoc = await VocabularyItem.findOne({ german: 'hallo' })
  const heissenDoc = await VocabularyItem.findOne({ german: 'heißen' })
  const kommenDoc = await VocabularyItem.findOne({ german: 'kommen' })
  const brotDoc = await VocabularyItem.findOne({ german: 'Brot' })
  const kaufenDoc = await VocabularyItem.findOne({ german: 'kaufen' })
  const bahnhofDoc = await VocabularyItem.findOne({ german: 'Bahnhof' })

  const lessons = [
    // Unit 1 - Week 1 - Lesson 1: Greetings
    {
      unitId: week1Id,
      type: 'vocabulary' as const,
      title: 'Basic Greetings',
      orderInUnit: 1,
      estimatedMinutes: 15,
      content: {
        explanation: {
          markdown: `## Greetings in German

Learning to greet people is the first step in any language. German has both formal and informal greetings.

**Formal greetings** (use with strangers, older people, authority figures):
- *Guten Morgen* — Good morning (until ~10am)
- *Guten Tag* — Good day/afternoon (main daytime greeting)
- *Guten Abend* — Good evening (after ~6pm)
- *Auf Wiedersehen* — Goodbye (formal)

**Informal greetings** (use with friends, family, peers):
- *Hallo* — Hello
- *Hi* — Hi
- *Tschüss* — Bye
- *Bis später* — See you later`,
          examples: [
            {
              german: 'Guten Morgen, Herr Schmidt!',
              english: 'Good morning, Mr. Schmidt!',
              annotation: 'Formal morning greeting with title',
            },
            {
              german: 'Hallo! Wie geht es dir?',
              english: 'Hello! How are you?',
              annotation: 'Informal greeting between friends',
            },
            {
              german: 'Auf Wiedersehen!',
              english: 'Goodbye! (formal)',
              annotation: 'Formal farewell',
            },
          ],
        },
        vocabularyItemIds: [halloDoc?._id, heissenDoc?._id, kommenDoc?._id].filter(
          Boolean,
        ) as Types.ObjectId[],
        exercises: [
          {
            id: uuidv4(),
            type: 'multiple_choice' as const,
            question: 'Which greeting is appropriate in the morning?',
            options: ['Guten Abend', 'Guten Morgen', 'Auf Wiedersehen', 'Tschüss'],
            answer: 'Guten Morgen',
            explanation: '"Guten Morgen" means "Good morning" and is used until around 10am.',
          },
          {
            id: uuidv4(),
            type: 'multiple_choice' as const,
            question: 'Which is the informal way to say "bye" in German?',
            options: ['Guten Tag', 'Auf Wiedersehen', 'Tschüss', 'Guten Abend'],
            answer: 'Tschüss',
            explanation: '"Tschüss" is the informal farewell, similar to "bye" in English.',
          },
          {
            id: uuidv4(),
            type: 'translate_en_de' as const,
            question: 'Translate to German: "Hello, how are you?" (informal)',
            answer: 'Hallo, wie geht es dir?',
            hint: 'Use "Hallo" and the informal "dir"',
            explanation: '"Hallo" = hello, "wie geht es dir?" = how are you? (informal)',
          },
          {
            id: uuidv4(),
            type: 'fill_blank' as const,
            question: '___ Abend! (Good evening!)',
            answer: 'Guten',
            hint: 'The word means "good"',
            explanation: '"Guten" is the accusative form of "gut" used in time-of-day greetings.',
          },
          {
            id: uuidv4(),
            type: 'translate_de_en' as const,
            question: 'What does "Auf Wiedersehen" mean?',
            answer: 'Goodbye',
            explanation:
              '"Auf Wiedersehen" literally means "until we see again" — it is the formal goodbye.',
          },
          {
            id: uuidv4(),
            type: 'multiple_choice' as const,
            question: 'You are meeting your boss at work. Which greeting should you use?',
            options: ['Hey!', 'Tschüss!', 'Guten Tag!', 'Hallo Kumpel!'],
            answer: 'Guten Tag!',
            explanation:
              '"Guten Tag" is the appropriate formal greeting to use in professional settings.',
          },
          {
            id: uuidv4(),
            type: 'fill_blank' as const,
            question: 'Guten ___, wie geht es Ihnen? (Good day, how are you?)',
            answer: 'Tag',
            hint: 'The German word for "day"',
            explanation: '"Tag" means "day" — "Guten Tag" is the standard daytime formal greeting.',
          },
          {
            id: uuidv4(),
            type: 'translate_en_de' as const,
            question: 'Translate: "Good evening!"',
            answer: 'Guten Abend!',
            hint: '"Abend" means evening',
            explanation: '"Guten Abend" is used as a greeting in the evening hours.',
          },
        ],
      },
    },
    // Unit 1 - Week 1 - Lesson 2: Articles
    {
      unitId: week1Id,
      type: 'grammar' as const,
      title: 'German Articles: der, die, das',
      orderInUnit: 2,
      estimatedMinutes: 20,
      content: {
        explanation: {
          markdown: `## German Definite Articles

Every German noun has a grammatical gender: **masculine (der)**, **feminine (die)**, or **neuter (das)**.

Unlike English where "the" works for everything, German requires you to know each noun's gender.

| Gender | Article | Example |
|--------|---------|---------|
| Masculine | **der** | *der Mann* (the man), *der Tisch* (the table) |
| Feminine | **die** | *die Frau* (the woman), *die Schule* (the school) |
| Neuter | **das** | *das Kind* (the child), *das Buch* (the book) |
| Plural (all) | **die** | *die Männer* (the men), *die Bücher* (the books) |

**Learning tip**: Always learn a new noun together with its article. Don't learn just "Tisch" — learn "der Tisch".`,
          examples: [
            {
              german: 'Der Tisch ist groß.',
              english: 'The table is big.',
              annotation: 'Tisch = masculine → der',
            },
            {
              german: 'Die Frau arbeitet.',
              english: 'The woman works.',
              annotation: 'Frau = feminine → die',
            },
            {
              german: 'Das Buch ist interessant.',
              english: 'The book is interesting.',
              annotation: 'Buch = neuter → das',
            },
          ],
        },
        exercises: [
          {
            id: uuidv4(),
            type: 'multiple_choice' as const,
            question: 'What is the correct article for "Tisch" (table)?',
            options: ['der', 'die', 'das', 'den'],
            answer: 'der',
            explanation: '"Tisch" is masculine in German, so it takes the article "der".',
            grammarConceptId: articlesConceptDoc?._id?.toString(),
          },
          {
            id: uuidv4(),
            type: 'multiple_choice' as const,
            question: 'What is the correct article for "Schule" (school)?',
            options: ['der', 'die', 'das', 'dem'],
            answer: 'die',
            explanation: '"Schule" is feminine in German, so it takes the article "die".',
            grammarConceptId: articlesConceptDoc?._id?.toString(),
          },
          {
            id: uuidv4(),
            type: 'multiple_choice' as const,
            question: 'What is the correct article for "Buch" (book)?',
            options: ['der', 'die', 'das', 'ein'],
            answer: 'das',
            explanation: '"Buch" is neuter in German, so it takes the article "das".',
            grammarConceptId: articlesConceptDoc?._id?.toString(),
          },
          {
            id: uuidv4(),
            type: 'fill_blank' as const,
            question: '___ Kind spielt im Park. (The child plays in the park.)',
            answer: 'Das',
            hint: '"Kind" is neuter in German',
            explanation: '"Kind" (child) is neuter → das Kind.',
            grammarConceptId: articlesConceptDoc?._id?.toString(),
          },
          {
            id: uuidv4(),
            type: 'fill_blank' as const,
            question: '___ Mann liest die Zeitung. (The man reads the newspaper.)',
            answer: 'Der',
            hint: '"Mann" is masculine in German',
            explanation: '"Mann" (man) is masculine → der Mann.',
          },
          {
            id: uuidv4(),
            type: 'translate_en_de' as const,
            question: 'Translate: "The woman drinks coffee."',
            answer: 'Die Frau trinkt Kaffee.',
            hint: 'Remember: Frau is feminine',
            explanation:
              '"Frau" is feminine → die Frau. "trinkt" is the 3rd person singular of "trinken".',
          },
          {
            id: uuidv4(),
            type: 'multiple_choice' as const,
            question: 'Which sentence uses the correct article for "Haus" (house)?',
            options: [
              'Der Haus ist groß.',
              'Die Haus ist groß.',
              'Das Haus ist groß.',
              'Ein Haus ist groß.',
            ],
            answer: 'Das Haus ist groß.',
            explanation: '"Haus" (house) is neuter in German → das Haus.',
          },
          {
            id: uuidv4(),
            type: 'translate_de_en' as const,
            question: 'Translate: "Die Frau und der Mann arbeiten."',
            answer: 'The woman and the man work.',
            explanation:
              '"Die Frau" = the woman (feminine), "der Mann" = the man (masculine), "arbeiten" = work (they work).',
          },
          {
            id: uuidv4(),
            type: 'fill_blank' as const,
            question: "___ Bus kommt um drei Uhr. (The bus comes at three o'clock.)",
            answer: 'Der',
            hint: '"Bus" is masculine',
            explanation: '"Bus" is masculine in German → der Bus.',
          },
        ],
      },
    },
    // Unit 2 - Week 2 - Lesson 1: sein
    {
      unitId: week2Id,
      type: 'grammar' as const,
      title: 'The Verb "sein" (to be)',
      orderInUnit: 1,
      estimatedMinutes: 20,
      content: {
        explanation: {
          markdown: `## Conjugating "sein" (to be)

"Sein" is the German word for "to be". It is completely irregular, so you must memorize each form.

| Person | German | English |
|--------|--------|---------|
| ich | **bin** | I am |
| du | **bist** | you are (informal) |
| er/sie/es | **ist** | he/she/it is |
| wir | **sind** | we are |
| ihr | **seid** | you all are (informal) |
| sie/Sie | **sind** | they are / you are (formal) |

**Pro tip**: With professions, German omits the indefinite article:
- Correct: *Ich bin Arzt.* (I am a doctor.)
- Wrong: ~~Ich bin ein Arzt.~~`,
          examples: [
            {
              german: 'Ich bin müde.',
              english: 'I am tired.',
              annotation: 'ich → bin',
            },
            {
              german: 'Bist du Student?',
              english: 'Are you a student?',
              annotation: 'du → bist (question form)',
            },
            {
              german: 'Sie ist Lehrerin.',
              english: 'She is a teacher.',
              annotation: 'sie (she) → ist, no article with professions',
            },
          ],
        },
        exercises: [
          {
            id: uuidv4(),
            type: 'fill_blank' as const,
            question: 'Ich ___ Student. (I am a student.)',
            answer: 'bin',
            hint: 'Present tense of "sein" for "ich"',
            explanation: '"sein" conjugated for "ich" is "bin".',
            grammarConceptId: seinConceptDoc?._id?.toString(),
          },
          {
            id: uuidv4(),
            type: 'fill_blank' as const,
            question: 'Du ___ sehr nett. (You are very kind.)',
            answer: 'bist',
            hint: 'Present tense of "sein" for "du"',
            explanation: '"sein" conjugated for "du" is "bist".',
            grammarConceptId: seinConceptDoc?._id?.toString(),
          },
          {
            id: uuidv4(),
            type: 'fill_blank' as const,
            question: 'Er ___ Arzt. (He is a doctor.)',
            answer: 'ist',
            hint: 'Present tense of "sein" for "er"',
            explanation: '"sein" conjugated for "er/sie/es" is "ist".',
            grammarConceptId: seinConceptDoc?._id?.toString(),
          },
          {
            id: uuidv4(),
            type: 'fill_blank' as const,
            question: 'Wir ___ aus Deutschland. (We are from Germany.)',
            answer: 'sind',
            hint: 'Present tense of "sein" for "wir"',
            explanation: '"sein" conjugated for "wir" is "sind".',
          },
          {
            id: uuidv4(),
            type: 'multiple_choice' as const,
            question: 'Which sentence is grammatically correct?',
            options: [
              'Ich bin eine Lehrerin.',
              'Ich bin Lehrerin.',
              'Ich ist Lehrerin.',
              'Ich bist Lehrerin.',
            ],
            answer: 'Ich bin Lehrerin.',
            explanation:
              'With professions, German omits the article. "Ich bin Lehrerin." is correct — not "eine Lehrerin".',
          },
          {
            id: uuidv4(),
            type: 'translate_en_de' as const,
            question: 'Translate: "Are you (formal) from Austria?"',
            answer: 'Sind Sie aus Österreich?',
            hint: 'Use the formal "Sie" and the sein form "sind"',
            explanation: 'Formal "you" is "Sie" (capital S). "sein" for "Sie" is "sind".',
          },
          {
            id: uuidv4(),
            type: 'translate_de_en' as const,
            question: 'Translate: "Das Wetter ist schön heute."',
            answer: 'The weather is beautiful today.',
            explanation:
              '"Das Wetter" = the weather, "ist" = is, "schön" = beautiful, "heute" = today.',
          },
          {
            id: uuidv4(),
            type: 'multiple_choice' as const,
            question: 'Fill in: "Ihr ___ meine besten Freunde." (You all are my best friends.)',
            options: ['bin', 'bist', 'ist', 'seid'],
            answer: 'seid',
            explanation: '"sein" conjugated for "ihr" (informal you-plural) is "seid".',
          },
          {
            id: uuidv4(),
            type: 'fill_blank' as const,
            question: 'Sie (they) ___ sehr freundlich. (They are very friendly.)',
            answer: 'sind',
            hint: '"sie" (they) uses the same form as "wir"',
            explanation: '"sein" for "sie" (they) and "Sie" (formal you) is "sind".',
          },
        ],
      },
    },
    // Unit 2 - Week 2 - Lesson 2: haben
    {
      unitId: week2Id,
      type: 'grammar' as const,
      title: 'The Verb "haben" (to have)',
      orderInUnit: 2,
      estimatedMinutes: 20,
      content: {
        explanation: {
          markdown: `## Conjugating "haben" (to have)

"Haben" means "to have" and is the second most important German verb.

| Person | German | English |
|--------|--------|---------|
| ich | **habe** | I have |
| du | **hast** | you have |
| er/sie/es | **hat** | he/she/it has |
| wir | **haben** | we have |
| ihr | **habt** | you all have |
| sie/Sie | **haben** | they/you (formal) have |

**Idiomatic uses** — German uses "haben" for many feelings:
- *Ich habe Hunger.* — I am hungry. (lit: I have hunger)
- *Ich habe Durst.* — I am thirsty.
- *Ich habe Angst.* — I am scared.
- *Ich habe Glück.* — I am lucky.
- *Ich habe keine Zeit.* — I don't have time.`,
          examples: [
            {
              german: 'Ich habe zwei Kinder.',
              english: 'I have two children.',
              annotation: 'ich → habe',
            },
            {
              german: 'Hast du Hunger?',
              english: 'Are you hungry?',
              annotation: 'du → hast (idiomatic)',
            },
            {
              german: 'Sie haben keine Zeit.',
              english: 'They have no time.',
              annotation: 'sie (they) → haben',
            },
          ],
        },
        exercises: [
          {
            id: uuidv4(),
            type: 'fill_blank' as const,
            question: 'Ich ___ einen Bruder. (I have a brother.)',
            answer: 'habe',
            hint: '"haben" conjugated for "ich"',
            explanation: '"haben" for "ich" is "habe".',
            grammarConceptId: habenConceptDoc?._id?.toString(),
          },
          {
            id: uuidv4(),
            type: 'fill_blank' as const,
            question: 'Er ___ Hunger. (He is hungry.)',
            answer: 'hat',
            hint: '"haben" conjugated for "er"',
            explanation: '"haben" for "er/sie/es" is "hat". "Hunger haben" = to be hungry.',
          },
          {
            id: uuidv4(),
            type: 'translate_en_de' as const,
            question: 'Translate: "Do you have time?" (informal)',
            answer: 'Hast du Zeit?',
            hint: '"haben" for "du" is "hast", "Zeit" = time',
            explanation:
              '"Hast du Zeit?" literally means "Have you time?" — natural way to ask in German.',
          },
          {
            id: uuidv4(),
            type: 'multiple_choice' as const,
            question: 'How do you say "I am thirsty" in German (using haben)?',
            options: ['Ich bin Durst.', 'Ich habe Durst.', 'Ich hast Durst.', 'Mir ist Durst.'],
            answer: 'Ich habe Durst.',
            explanation:
              'German uses "haben + Durst" to express thirst: "Ich habe Durst." (lit: I have thirst).',
          },
          {
            id: uuidv4(),
            type: 'fill_blank' as const,
            question: 'Wir ___ eine große Wohnung. (We have a large apartment.)',
            answer: 'haben',
            hint: '"haben" conjugated for "wir"',
            explanation: '"haben" for "wir" is "haben" — same as the infinitive.',
          },
          {
            id: uuidv4(),
            type: 'translate_de_en' as const,
            question: 'Translate: "Sie hat keine Angst."',
            answer: 'She has no fear. / She is not afraid.',
            explanation:
              '"sie hat" = she has, "keine" = no/not any, "Angst" = fear. Idiom: to have fear = to be afraid.',
          },
          {
            id: uuidv4(),
            type: 'multiple_choice' as const,
            question: 'Which is the correct form: "Ihr ___ ein großes Haus."?',
            options: ['habe', 'hast', 'haben', 'habt'],
            answer: 'habt',
            explanation: '"haben" conjugated for "ihr" (informal you-plural) is "habt".',
          },
          {
            id: uuidv4(),
            type: 'fill_blank' as const,
            question: '___ Sie ein Zimmer frei? (Do you have a free room?) [formal]',
            answer: 'Haben',
            hint: 'Formal "you" + haben',
            explanation:
              '"haben" for formal "Sie" is "haben". This is a question a hotel guest might ask.',
          },
        ],
      },
    },
    // Unit 3 - Week 3 - Lesson 1: Accusative
    {
      unitId: week3Id,
      type: 'grammar' as const,
      title: 'The Accusative Case',
      orderInUnit: 1,
      estimatedMinutes: 25,
      content: {
        explanation: {
          markdown: `## The Accusative Case

The accusative case marks the **direct object** — the noun that receives the action of the verb.

### Article changes in accusative
Only **masculine** nouns change their article. Feminine, neuter, and plural stay the same.

| Gender | Nominative | Accusative | Change? |
|--------|-----------|-----------|---------|
| Masculine | **der** Mann | **den** Mann | ✓ der → den |
| Masculine | **ein** Mann | **einen** Mann | ✓ ein → einen |
| Feminine | **die** Frau | **die** Frau | ✗ no change |
| Neuter | **das** Kind | **das** Kind | ✗ no change |

### Key verbs that take accusative objects
- *kaufen* (to buy): *Ich kaufe **den** Apfel.*
- *essen* (to eat): *Sie isst **ein** Brötchen.*
- *trinken* (to drink): *Er trinkt **einen** Kaffee.*
- *haben* (to have): *Wir haben **einen** Hund.*
- *sehen* (to see): *Ich sehe **den** Mann.*`,
          examples: [
            {
              german: 'Ich kaufe den Apfel.',
              english: 'I buy the apple.',
              annotation: 'Apfel = masculine accusative → den (not der)',
            },
            {
              german: 'Sie trinkt einen Kaffee.',
              english: 'She drinks a coffee.',
              annotation: 'Kaffee = masculine indefinite accusative → einen',
            },
            {
              german: 'Er isst das Brot.',
              english: 'He eats the bread.',
              annotation: 'Brot = neuter → no change (das stays das)',
            },
          ],
        },
        exercises: [
          {
            id: uuidv4(),
            type: 'multiple_choice' as const,
            question: 'Complete: "Ich kaufe ___ Apfel." (I buy the apple.)',
            options: ['der', 'die', 'den', 'dem'],
            answer: 'den',
            explanation: '"Apfel" (apple) is masculine. In the accusative case, der → den.',
            grammarConceptId: accusativeConceptDoc?._id?.toString(),
          },
          {
            id: uuidv4(),
            type: 'fill_blank' as const,
            question: 'Er kauft ___ neuen Computer. (He buys a new computer.) [indefinite]',
            answer: 'einen',
            hint: '"Computer" is masculine — indefinite article in accusative',
            explanation: '"Computer" is masculine. Indefinite accusative: ein → einen.',
          },
          {
            id: uuidv4(),
            type: 'translate_en_de' as const,
            question: 'Translate: "The woman drinks a coffee."',
            answer: 'Die Frau trinkt einen Kaffee.',
            hint: '"Kaffee" is masculine, indefinite accusative',
            explanation:
              '"Die Frau" = the woman (subject), "trinkt" = drinks, "einen Kaffee" = a coffee (masc. indef. accusative).',
            vocabularyItemId: brotDoc?._id?.toString(),
          },
          {
            id: uuidv4(),
            type: 'multiple_choice' as const,
            question: 'Which article is correct? "Sie isst ___ Brot."',
            options: ['den', 'dem', 'das', 'die'],
            answer: 'das',
            explanation:
              '"Brot" (bread) is neuter. Neuter nouns do not change in the accusative — das stays das.',
          },
          {
            id: uuidv4(),
            type: 'fill_blank' as const,
            question: 'Hast du ___ Stift? (Do you have a pen?) [masculine]',
            answer: 'einen',
            hint: '"Stift" (pen) is masculine, indefinite accusative',
            explanation: '"Stift" is masculine. Indefinite accusative: ein → einen.',
          },
          {
            id: uuidv4(),
            type: 'translate_en_de' as const,
            question: 'Translate: "I see the man."',
            answer: 'Ich sehe den Mann.',
            hint: '"Mann" is masculine accusative',
            explanation: '"Mann" is masculine. Direct object in accusative: der → den Mann.',
          },
          {
            id: uuidv4(),
            type: 'multiple_choice' as const,
            question: 'Which changes in the accusative case?',
            options: [
              'Only feminine articles',
              'Only masculine articles',
              'All articles',
              'No articles',
            ],
            answer: 'Only masculine articles',
            explanation:
              'Only masculine articles change in accusative: der → den, ein → einen. Feminine and neuter stay the same.',
          },
          {
            id: uuidv4(),
            type: 'translate_de_en' as const,
            question: 'Translate: "Wir kaufen einen neuen Wagen."',
            answer: 'We are buying a new car.',
            explanation:
              '"wir kaufen" = we buy, "einen neuen Wagen" = a new car (masculine indefinite accusative).',
          },
        ],
      },
    },
    // Unit 3 - Week 3 - Lesson 2: Food vocabulary
    {
      unitId: week3Id,
      type: 'vocabulary' as const,
      title: 'Food & Drinks at the Market',
      orderInUnit: 2,
      estimatedMinutes: 20,
      content: {
        explanation: {
          markdown: `## Food and Shopping Vocabulary

Going to the Markt (market) or Supermarkt (supermarket) requires knowing food vocabulary and how to ask for prices.

**Useful phrases at the shop**:
- *Was kostet das?* — How much does this cost?
- *Ich hätte gern...* — I would like...
- *Haben Sie...?* — Do you have...?
- *Das ist zu teuer.* — That is too expensive.
- *Ich nehme das.* — I'll take that.

**Common food items**:
- *das Brot* — bread
- *die Milch* — milk
- *das Fleisch* — meat
- *das Gemüse* — vegetables
- *das Obst* — fruit
- *der Käse* — cheese`,
          examples: [
            {
              german: 'Ich kaufe Brot und Gemüse.',
              english: 'I buy bread and vegetables.',
              annotation: 'Brot = neuter, Gemüse = neuter',
            },
            {
              german: 'Was kostet der Käse?',
              english: 'How much does the cheese cost?',
              annotation: 'Käse = masculine',
            },
            {
              german: 'Das ist zu teuer!',
              english: 'That is too expensive!',
              annotation: 'zu = too, teuer = expensive',
            },
          ],
        },
        vocabularyItemIds: [brotDoc?._id, kaufenDoc?._id].filter(Boolean) as Types.ObjectId[],
        exercises: [
          {
            id: uuidv4(),
            type: 'multiple_choice' as const,
            question: 'What is "das Brot"?',
            options: ['meat', 'bread', 'water', 'milk'],
            answer: 'bread',
            explanation: '"das Brot" means "bread". It is a neuter noun (das).',
          },
          {
            id: uuidv4(),
            type: 'translate_en_de' as const,
            question: 'How do you ask "How much does this cost?" in German?',
            answer: 'Was kostet das?',
            hint: '"Was" = what, "kostet" = costs',
            explanation: '"Was kostet das?" is the standard question for prices in a shop.',
          },
          {
            id: uuidv4(),
            type: 'fill_blank' as const,
            question: 'Das Fleisch ist zu ___. (The meat is too expensive.)',
            answer: 'teuer',
            hint: 'The German word for "expensive"',
            explanation: '"teuer" means expensive. "zu teuer" = too expensive.',
          },
          {
            id: uuidv4(),
            type: 'multiple_choice' as const,
            question: 'Which word means "vegetables" in German?',
            options: ['das Obst', 'das Fleisch', 'das Gemüse', 'das Brot'],
            answer: 'das Gemüse',
            explanation:
              '"das Gemüse" means vegetables. "das Obst" is fruit, "das Fleisch" is meat.',
          },
          {
            id: uuidv4(),
            type: 'translate_de_en' as const,
            question: 'Translate: "Ich kaufe frisches Obst auf dem Markt."',
            answer: 'I buy fresh fruit at the market.',
            explanation:
              '"Ich kaufe" = I buy, "frisches Obst" = fresh fruit, "auf dem Markt" = at the market.',
          },
          {
            id: uuidv4(),
            type: 'fill_blank' as const,
            question: 'Ich ___ gern ein Kilo Äpfel. (I would like one kilo of apples.)',
            answer: 'hätte',
            hint: 'Polite way to say "I would like" — subjunctive of haben',
            explanation: '"Ich hätte gern" = I would like (polite request form).',
          },
          {
            id: uuidv4(),
            type: 'multiple_choice' as const,
            question: 'How do you say "I\'ll take that" in a shop?',
            options: ['Das kostet viel.', 'Ich nehme das.', 'Was kostet das?', 'Das ist billig.'],
            answer: 'Ich nehme das.',
            explanation: '"Ich nehme das." = I\'ll take that. "nehmen" = to take.',
          },
          {
            id: uuidv4(),
            type: 'translate_en_de' as const,
            question: 'Translate: "Do you have fresh milk?"',
            answer: 'Haben Sie frische Milch?',
            hint: 'Use formal "Sie", "Milch" = milk',
            explanation:
              '"Haben Sie...?" = Do you have...? (formal). "frische Milch" = fresh milk.',
          },
        ],
      },
    },
    // Unit 4 - Week 4 - Lesson 1: Dative
    {
      unitId: week4Id,
      type: 'grammar' as const,
      title: 'Dative Case with Prepositions',
      orderInUnit: 1,
      estimatedMinutes: 25,
      content: {
        explanation: {
          markdown: `## Dative Prepositions and Location

The dative case is used with certain prepositions to indicate **location (where?)** or after specific verbs.

### Common dative prepositions (always dative):
- **mit** — with: *Ich fahre mit dem Bus.*
- **nach** — to (cities/countries), after: *Ich fahre nach Berlin.*
- **bei** — at (someone's place), near: *Ich wohne bei meiner Mutter.*
- **von** — from, of: *Das ist ein Geschenk von meinem Bruder.*
- **zu** — to (people, buildings): *Ich gehe zum Arzt.*
- **aus** — from (origin), out of: *Ich komme aus Deutschland.*

### Two-way prepositions (location = dative):
- **in** + dative: *Das Buch ist im Regal.* (location)
- **an** + dative: *Das Bild hängt an der Wand.* (location)
- **auf** + dative: *Die Tasse steht auf dem Tisch.* (location)

### Contractions:
- *zu + dem → **zum*** (zum Bahnhof, zum Supermarkt)
- *zu + der → **zur*** (zur Post, zur Schule)
- *in + dem → **im*** (im Park, im Haus)
- *an + dem → **am*** (am Bahnhof, am Strand)`,
          examples: [
            {
              german: 'Ich bin im Supermarkt.',
              english: 'I am in the supermarket.',
              annotation: 'in + dem (neuter) → im',
            },
            {
              german: 'Wir treffen uns am Bahnhof.',
              english: 'We meet at the train station.',
              annotation: 'an + dem (masculine) → am',
            },
            {
              german: 'Ich gehe zur Post.',
              english: 'I am going to the post office.',
              annotation: 'zu + der (feminine) → zur',
            },
          ],
        },
        exercises: [
          {
            id: uuidv4(),
            type: 'fill_blank' as const,
            question: 'Ich fahre mit ___ Bus. (I travel by bus.) [dative]',
            answer: 'dem',
            hint: '"mit" always takes the dative. "Bus" is masculine → dative: dem',
            explanation: '"mit" + dative. "Bus" is masculine → dem Bus.',
            grammarConceptId: dativeConceptDoc?._id?.toString(),
          },
          {
            id: uuidv4(),
            type: 'multiple_choice' as const,
            question:
              'Which contraction is correct? "Ich gehe ___ Arzt." (I am going to the doctor.)',
            options: ['zu der', 'zum', 'zur', 'zu dem'],
            answer: 'zum',
            explanation:
              '"Arzt" is masculine. "zu + dem → zum". "zum Arzt gehen" = to go to the doctor.',
          },
          {
            id: uuidv4(),
            type: 'fill_blank' as const,
            question: 'Das Buch liegt ___ Tisch. (The book is on the table.) [dative location]',
            answer: 'auf dem',
            hint: '"auf" for location + dative. "Tisch" is masculine',
            explanation: '"auf" for location uses dative. "Tisch" is masculine → auf dem Tisch.',
          },
          {
            id: uuidv4(),
            type: 'translate_en_de' as const,
            question: 'Translate: "I come from Germany."',
            answer: 'Ich komme aus Deutschland.',
            hint: '"aus" + country name (no article needed for Deutschland)',
            explanation:
              '"aus" = from (origin). Countries without article: Ich komme aus Deutschland/Frankreich/etc.',
          },
          {
            id: uuidv4(),
            type: 'multiple_choice' as const,
            question: 'Complete: "Wir sind ___ Bahnhof." (We are at the train station.)',
            options: ['in dem', 'am', 'im', 'zur'],
            answer: 'am',
            explanation:
              '"an + dem → am". "Bahnhof" is masculine. "am Bahnhof" = at the train station.',
          },
          {
            id: uuidv4(),
            type: 'translate_de_en' as const,
            question: 'Translate: "Ich wohne bei meinen Eltern."',
            answer: 'I live with/at my parents.',
            explanation:
              '"bei" + dative = at (someone\'s place). "meinen Eltern" = my parents (dative plural).',
          },
          {
            id: uuidv4(),
            type: 'fill_blank' as const,
            question: 'Die Kinder spielen ___ Park. (The children play in the park.)',
            answer: 'im',
            hint: '"in" + dative for location. "Park" is masculine → dem. Contract: in + dem = im',
            explanation: '"in" for location + dative. "Park" is masculine → im Park.',
          },
          {
            id: uuidv4(),
            type: 'multiple_choice' as const,
            question: 'Which preposition always takes the dative?',
            options: ['in', 'auf', 'an', 'mit'],
            answer: 'mit',
            explanation:
              '"mit" always takes the dative case. "in", "auf", "an" are two-way prepositions (dative for location, accusative for movement).',
          },
        ],
      },
    },
    // Unit 4 - Week 4 - Lesson 2: Directions
    {
      unitId: week4Id,
      type: 'vocabulary' as const,
      title: 'Getting Around: Directions & Transport',
      orderInUnit: 2,
      estimatedMinutes: 20,
      content: {
        explanation: {
          markdown: `## Asking for and Giving Directions

When navigating a German city, knowing how to ask for and understand directions is essential.

**Asking for directions**:
- *Entschuldigung, wie komme ich zum/zur...?* — Excuse me, how do I get to the...?
- *Wo ist der/die/das...?* — Where is the...?
- *Wie weit ist es bis...?* — How far is it to...?

**Giving directions**:
- *Gehen Sie geradeaus.* — Go straight ahead.
- *Biegen Sie links/rechts ab.* — Turn left/right.
- *Nehmen Sie die erste/zweite Straße links.* — Take the first/second street on the left.
- *Es ist auf der linken/rechten Seite.* — It is on the left/right side.
- *Ungefähr 500 Meter.* — About 500 meters.

**Transport vocabulary**:
- *der Zug* — train
- *der Bus* — bus
- *die U-Bahn* — subway/underground
- *das Taxi* — taxi
- *zu Fuß gehen* — to go on foot`,
          examples: [
            {
              german: 'Entschuldigung, wo ist der Bahnhof?',
              english: 'Excuse me, where is the train station?',
              annotation: 'der Bahnhof = masculine',
            },
            {
              german: 'Biegen Sie rechts ab, dann geradeaus.',
              english: 'Turn right, then go straight ahead.',
              annotation: 'Formal imperative with Sie',
            },
            {
              german: 'Ich fahre mit der U-Bahn.',
              english: 'I take the subway.',
              annotation: 'mit + dative feminine → der',
            },
          ],
        },
        vocabularyItemIds: [bahnhofDoc?._id].filter(Boolean) as Types.ObjectId[],
        exercises: [
          {
            id: uuidv4(),
            type: 'translate_en_de' as const,
            question: 'Translate: "Excuse me, where is the train station?"',
            answer: 'Entschuldigung, wo ist der Bahnhof?',
            hint: '"Bahnhof" is masculine',
            explanation:
              '"Entschuldigung" = excuse me, "wo ist" = where is, "der Bahnhof" = the train station (masculine).',
          },
          {
            id: uuidv4(),
            type: 'multiple_choice' as const,
            question: 'What does "geradeaus" mean?',
            options: ['Turn left', 'Turn right', 'Straight ahead', 'Go back'],
            answer: 'Straight ahead',
            explanation: '"geradeaus" means "straight ahead". "links" = left, "rechts" = right.',
          },
          {
            id: uuidv4(),
            type: 'fill_blank' as const,
            question: 'Biegen Sie ___ ab. (Turn left.)',
            answer: 'links',
            hint: '"links" means left, "rechts" means right',
            explanation:
              '"Biegen Sie ab" = turn (formal). "links" = left, so "links abbiegen" = turn left.',
          },
          {
            id: uuidv4(),
            type: 'translate_de_en' as const,
            question: 'Translate: "Ich fahre mit dem Zug nach Hamburg."',
            answer: 'I am travelling by train to Hamburg.',
            explanation:
              '"mit dem Zug" = by train (dative), "nach Hamburg" = to Hamburg (nach + city).',
          },
          {
            id: uuidv4(),
            type: 'multiple_choice' as const,
            question: 'How do you say "I am going on foot" in German?',
            options: [
              'Ich fahre zu Fuß.',
              'Ich gehe zu Fuß.',
              'Ich komme zu Fuß.',
              'Ich nehme zu Fuß.',
            ],
            answer: 'Ich gehe zu Fuß.',
            explanation: '"zu Fuß gehen" = to go on foot. "gehen" is used for walking.',
          },
          {
            id: uuidv4(),
            type: 'fill_blank' as const,
            question: 'Wie weit ist es bis ___ Bahnhof? (How far is it to the train station?)',
            answer: 'zum',
            hint: '"zu + dem (masculine)" contracts to "zum"',
            explanation: '"bis zum" = until/to the (with masculine nouns). "zu + dem → zum".',
          },
          {
            id: uuidv4(),
            type: 'translate_en_de' as const,
            question: 'Translate: "The hotel is on the right side."',
            answer: 'Das Hotel ist auf der rechten Seite.',
            hint: '"rechts" → "rechten Seite" (dative feminine)',
            explanation:
              '"auf der rechten Seite" = on the right side. "auf" for location takes dative.',
          },
          {
            id: uuidv4(),
            type: 'multiple_choice' as const,
            question: 'You want to go to the post office by subway. Which sentence is correct?',
            options: [
              'Ich fahre mit die U-Bahn zur Post.',
              'Ich fahre mit der U-Bahn zur Post.',
              'Ich fahre mit dem U-Bahn zur Post.',
              'Ich fahre mit den U-Bahn zur Post.',
            ],
            answer: 'Ich fahre mit der U-Bahn zur Post.',
            explanation:
              '"U-Bahn" is feminine. "mit" + dative feminine → mit der U-Bahn. "zur Post" = to the post office.',
          },
        ],
      },
    },
  ]

  await Lesson.insertMany(lessons)
  console.log(`Seeded ${lessons.length} lessons`)
}
