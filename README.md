# Melorina

An early working prototype of an adaptive Emirati Arabic learning application. The initial goal is useful everyday conversation. Each learner has separate, evolving evidence for individual words and abilities; there are no fixed beginner/intermediate/advanced placements.

## Run

Requires Node.js 18 or later. There are **no packages to install**.

```sh
node scripts/serve.js
```

Open http://localhost:4173. The server binds only to your device. `PORT` can select another port.

Alternatively, open `dist/melorina.html` directly in a browser after building it. The main app works without a network connection. Recording requires microphone access in a supported browser on localhost or HTTPS; file URLs vary by browser.

```sh
node --test tests/engine.test.js tests/controller.test.js
node scripts/build.js
```

The included browser test uses Playwright when available: `node tests/browser.cjs`. Start the local server first. Playwright is an optional development tool, not an application dependency.

## Try the adaptive loop

1. Open **A first hello**.
2. Choose **A little help, please** and type `marhaba`.
3. Recognise `اسمي` as **My name is**.
4. Type `shukran` for thanks. Use a hint if you need it.
5. Revisit the greeting independently. An early supported response adds one separated recall opportunity to the session.
6. Read the reflection, then open **Your growth**. Hinted and independent attempts are separate. Pronunciation and listening remain unassessed.
7. Open **Your words** to search or practice a word. **Explore your practice** schedules due reviews, recognition-to-recall transitions, and new material related to your goal.
8. In **Your preferences**, choose a goal and practice window. In **Your growth**, export your local progress.

## What works

- Responsive dashboard, three guided conversation scenarios, searchable vocabulary, learner profile, preferences, and session reflection.
- Arabic and transliterated text input with conservative, explicit accepted variants. Unmatched free text does **not** automatically count as a learning failure.
- Separate recognition and recall evidence per word, context, hint use, timestamp, and session.
- Bounded within-session adaptation and a persistent review queue. Same-session repetition cannot establish durable retention.
- Local progress persistence; JSON export; user-confirmed local reset.
- Optional microphone recording and replay. Audio remains in memory, is never uploaded, and is discarded when leaving a turn. This is not speech recognition or pronunciation scoring.
- Self-contained HTML build, dependency-free development server, engine tests, and browser-flow tests.

## Boundaries of this prototype

This is a guided text prototype, not an open-ended AI tutor. Eight words/phrases and three authored scenarios make the adaptive behavior inspectable. Phrase matching may not recognise other valid Arabic expressions. Transliteration is approximate and not a pronunciation reference. The content is **draft and requires review by an Emirati Arabic educator before public release**. Some phrases are shared with other Arabic varieties; the intended course variety is Emirati Arabic.

The review intervals and evidence labels are transparent starting rules, not a clinically or educationally validated learning model. No proficiency percentages or automatically inferred pronunciation scores are shown. Listening, phonemes, sentence-level grammar, spontaneous conversation, and conversational transfer need dedicated assessments. Success in this app does not establish real-world speaking proficiency.

Progress is local to one browser/origin and is not encrypted account storage. Opening a file and using localhost can create separate profiles. There is no sign-in, cloud sync, analytics, payment handling, or backend. The prototype sends no learner data to a server. The learning content sources link is optional and opens only on user action.

## Structure

| File | Responsibility |
| --- | --- |
| `src/content.js` | Draft Emirati Arabic vocabulary, aliases, scenarios, and task contexts |
| `src/engine.js` | Pure evidence updates, review selection, retention labels, and state validation |
| `src/app.js` | Interface, guided session controller, persistence, and local recording |
| `src/styles.css` | Responsive visual system and Arabic rendering |
| `scripts/serve.js` | Local static server |
| `scripts/build.js` | Portable single-file HTML build |
| `tests/engine.test.js` | Evidence separation, hints, delayed recall, scheduling, idempotency, validation |
| `tests/controller.test.js` | Session/controller integration in a minimal DOM stub, persistence, rendering, and support fallback |
| `tests/browser.cjs` | Full user flow, persistence, mobile layout, recording, and accessible controls |

## Product decisions carried forward

- Name: **Melorina**.
- Initial variety: **Emirati Arabic**, expanding to other varieties later.
- Initial content: everyday conversations, accessible to people starting out while recognising uneven existing abilities.
- Personalization: ongoing at the interaction, session, and cross-session timescales; deep personalization is core.
- Later premium tracks: workplace communication and specialized fluency development.
- No invented learner strengths or fixed global level. Unknown abilities remain unknown.

See `ROADMAP.md` for the next implementation milestones.

## Background references

- [Al Ramsa: Emirati Arabic and MSA](https://alramsa.ae/alramsa-faqs/) — course-variety context; not a verification of every phrase in this prototype.
- [Karpicke and Roediger, 2008](https://web.mit.edu/jbelcher/www/learner/retrieval.pdf) — repeated retrieval and delayed vocabulary recall; does not validate this prototype's interval rules.

No external image, font, audio, or AI service is required.
