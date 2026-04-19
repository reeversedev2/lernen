import type { Types } from 'mongoose'
import { GrammarConcept } from '../models/grammar-concept.model.js'

export async function seedGrammar(unitIdMap: Map<number, Types.ObjectId>): Promise<void> {
  const count = await GrammarConcept.countDocuments()
  if (count > 0) {
    console.log('Grammar concepts already seeded, skipping...')
    return
  }

  const week1Id = unitIdMap.get(1)!
  const week2Id = unitIdMap.get(2)!
  const week3Id = unitIdMap.get(3)!
  const week4Id = unitIdMap.get(4)!

  const grammarConcepts = [
    {
      name: 'Definite Articles (der, die, das)',
      cefrLevel: 'A1' as const,
      explanationMarkdown: `## Definite Articles in German

German has three grammatical genders: **masculine**, **feminine**, and **neuter**. Every noun has a gender, and you must use the correct article.

| Gender | Article | Example |
|--------|---------|---------|
| Masculine | **der** | der Mann (the man) |
| Feminine | **die** | die Frau (the woman) |
| Neuter | **das** | das Kind (the child) |

**Important**: The gender of German nouns must be memorized. There are some patterns:
- Words ending in **-ung**, **-heit**, **-keit**, **-schaft** are usually **die**
- Words ending in **-chen**, **-lein** are always **das**
- Nouns of male people/animals are usually **der**

**Plural**: All plural nouns use **die** regardless of gender.`,
      ruleSummary:
        'Use der (masculine), die (feminine), das (neuter) — always learn nouns with their article.',
      examples: [
        {
          german: 'Der Mann ist groß.',
          english: 'The man is tall.',
          annotation: 'Mann = masculine → der',
        },
        {
          german: 'Die Frau trinkt Kaffee.',
          english: 'The woman drinks coffee.',
          annotation: 'Frau = feminine → die',
        },
        {
          german: 'Das Kind spielt.',
          english: 'The child plays.',
          annotation: 'Kind = neuter → das',
        },
        {
          german: 'Die Männer arbeiten.',
          english: 'The men work.',
          annotation: 'Plural always uses die',
        },
      ],
      unitId: week1Id,
    },
    {
      name: 'Personal Pronouns (ich, du, er, sie, es)',
      cefrLevel: 'A1' as const,
      explanationMarkdown: `## Personal Pronouns in German

Personal pronouns replace nouns and indicate who is doing the action.

| Pronoun | English | Usage |
|---------|---------|-------|
| **ich** | I | first person singular |
| **du** | you (informal) | second person singular, informal |
| **Sie** | you (formal) | second person singular/plural, formal |
| **er** | he / it (m) | third person singular masculine |
| **sie** | she / it (f) | third person singular feminine |
| **es** | it (n) | third person singular neuter |
| **wir** | we | first person plural |
| **ihr** | you all (informal) | second person plural, informal |
| **sie** | they | third person plural |

**Key distinction**: **du** is informal (friends, family, children), **Sie** is formal (strangers, authority figures). When in doubt, use **Sie**.`,
      ruleSummary:
        'German has formal (Sie) and informal (du) "you" — always use Sie with strangers.',
      examples: [
        { german: 'Ich heiße Maria.', english: 'My name is Maria.', annotation: 'ich = I' },
        {
          german: 'Wie heißt du?',
          english: 'What is your name? (informal)',
          annotation: 'du = informal you',
        },
        {
          german: 'Wie heißen Sie?',
          english: 'What is your name? (formal)',
          annotation: 'Sie = formal you (capital S)',
        },
        {
          german: 'Er kommt aus Österreich.',
          english: 'He comes from Austria.',
          annotation: 'er = he',
        },
      ],
      unitId: week1Id,
    },
    {
      name: 'Present Tense: sein (to be)',
      cefrLevel: 'A1' as const,
      explanationMarkdown: `## The Verb "sein" (to be)

**Sein** is the most important German verb. It is highly irregular and must be memorized completely.

| Pronoun | Form | Example |
|---------|------|---------|
| ich | **bin** | Ich bin Student. |
| du | **bist** | Du bist müde. |
| er/sie/es | **ist** | Er ist Arzt. |
| wir | **sind** | Wir sind hier. |
| ihr | **seid** | Ihr seid spät. |
| sie/Sie | **sind** | Sie sind nett. |

**Usage notes**:
- Used to describe identity: *Ich bin Lehrerin.* (I am a teacher.)
- Used to describe states: *Du bist müde.* (You are tired.)
- Used to indicate location: *Wir sind in Berlin.* (We are in Berlin.)

Note: Unlike English, German does NOT use an article before professions: *Ich bin Arzt.* (I am a/the doctor.)`,
      ruleSummary: 'sein conjugation: bin/bist/ist/sind/seid/sind — no article before professions.',
      examples: [
        { german: 'Ich bin müde.', english: 'I am tired.', annotation: 'ich → bin' },
        {
          german: 'Er ist Lehrer.',
          english: 'He is a teacher.',
          annotation: 'er → ist (no article with professions)',
        },
        {
          german: 'Wir sind aus Deutschland.',
          english: 'We are from Germany.',
          annotation: 'wir → sind',
        },
        {
          german: 'Sind Sie Frau Müller?',
          english: 'Are you Mrs. Müller?',
          annotation: 'Sie → sind (formal question)',
        },
      ],
      unitId: week2Id,
    },
    {
      name: 'Present Tense: haben (to have)',
      cefrLevel: 'A1' as const,
      explanationMarkdown: `## The Verb "haben" (to have)

**Haben** is the second most important German verb. It is slightly irregular.

| Pronoun | Form | Example |
|---------|------|---------|
| ich | **habe** | Ich habe einen Hund. |
| du | **hast** | Du hast Recht. |
| er/sie/es | **hat** | Er hat Zeit. |
| wir | **haben** | Wir haben Hunger. |
| ihr | **habt** | Ihr habt Glück. |
| sie/Sie | **haben** | Sie haben Fragen. |

**Usage notes**:
- Possession: *Ich habe ein Auto.* (I have a car.)
- Feelings/states (idiomatic): *Ich habe Hunger.* (I am hungry. — lit: I have hunger.)
- *Ich habe Durst.* (I am thirsty.)
- *Ich habe Angst.* (I am scared.)
- *Wir haben Zeit.* (We have time.)`,
      ruleSummary:
        'haben: habe/hast/hat/haben/habt/haben — used for possession and many feeling expressions.',
      examples: [
        {
          german: 'Ich habe einen Bruder.',
          english: 'I have a brother.',
          annotation: 'ich → habe',
        },
        {
          german: 'Sie hat keine Zeit.',
          english: 'She has no time.',
          annotation: 'sie (she) → hat',
        },
        {
          german: 'Habt ihr Hunger?',
          english: 'Are you all hungry?',
          annotation: 'ihr → habt (idiomatic: have hunger)',
        },
        {
          german: 'Wir haben eine Frage.',
          english: 'We have a question.',
          annotation: 'wir → haben',
        },
      ],
      unitId: week2Id,
    },
    {
      name: 'Accusative Case (direct objects)',
      cefrLevel: 'A1' as const,
      explanationMarkdown: `## The Accusative Case

The accusative case is used for **direct objects** — the thing that receives the action of the verb.

### Article Changes in the Accusative

| Gender | Nominative | Accusative |
|--------|-----------|-----------|
| Masculine | der / ein | **den / einen** |
| Feminine | die / eine | die / eine (no change!) |
| Neuter | das / ein | das / ein (no change!) |
| Plural | die | die (no change!) |

**Key insight**: Only masculine articles change in the accusative (der → den, ein → einen).

### Verbs that take accusative objects
- essen (to eat): *Ich esse **den** Apfel.* (I eat the apple.)
- trinken (to drink): *Er trinkt **einen** Kaffee.* (He drinks a coffee.)
- kaufen (to buy): *Sie kauft **ein** Buch.* (She buys a book.)
- haben (to have): *Wir haben **einen** Hund.* (We have a dog.)`,
      ruleSummary: 'Accusative = direct object. Only masculine changes: der→den, ein→einen.',
      examples: [
        {
          german: 'Ich esse den Apfel.',
          english: 'I eat the apple.',
          annotation: 'Apfel = masculine, accusative → den',
        },
        {
          german: 'Er kauft einen Kaffee.',
          english: 'He buys a coffee.',
          annotation: 'Kaffee = masculine, indefinite accusative → einen',
        },
        {
          german: 'Sie trinkt die Milch.',
          english: 'She drinks the milk.',
          annotation: 'Milch = feminine, no change in accusative',
        },
        {
          german: 'Wir essen das Brot.',
          english: 'We eat the bread.',
          annotation: 'Brot = neuter, no change in accusative',
        },
      ],
      unitId: week3Id,
    },
    {
      name: 'Dative Case with Prepositions',
      cefrLevel: 'A1' as const,
      explanationMarkdown: `## The Dative Case with Prepositions

Some prepositions always require the **dative case** in German. The most common are:

**Always dative**: mit, nach, bei, seit, von, zu, aus, gegenüber
**Two-way prepositions** (location → dative, movement → accusative): in, an, auf, über, unter, vor, hinter, neben, zwischen

### Article Changes in the Dative

| Gender | Nominative | Dative |
|--------|-----------|--------|
| Masculine | der / ein | **dem / einem** |
| Feminine | die / eine | **der / einer** |
| Neuter | das / ein | **dem / einem** |
| Plural | die | **den** + noun gets -n |

### Examples with common prepositions
- *in + dem* often contracts to **im**: *Ich bin im Supermarkt.*
- *an + dem* often contracts to **am**: *Wir treffen uns am Bahnhof.*
- *zu + dem* often contracts to **zum**: *Ich gehe zum Arzt.*
- *zu + der* often contracts to **zur**: *Gehen Sie zur Post.*`,
      ruleSummary:
        'Dative prepositions: mit, nach, bei, von, zu, aus. Location uses dative: im Park, am Bahnhof.',
      examples: [
        {
          german: 'Ich wohne in der Stadtmitte.',
          english: 'I live in the city center.',
          annotation: 'in + dative feminine → der',
        },
        {
          german: 'Er wartet am Bahnhof.',
          english: 'He is waiting at the station.',
          annotation: 'an + dem → am (contraction)',
        },
        {
          german: 'Wir gehen zum Supermarkt.',
          english: 'We are going to the supermarket.',
          annotation: 'zu + dem → zum (contraction)',
        },
        {
          german: 'Das Hotel ist neben dem Kino.',
          english: 'The hotel is next to the cinema.',
          annotation: 'neben + dative neuter → dem',
        },
      ],
      unitId: week4Id,
    },
  ]

  await GrammarConcept.insertMany(grammarConcepts)
  console.log(`Seeded ${grammarConcepts.length} grammar concepts`)
}
