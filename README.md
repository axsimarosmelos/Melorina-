# Melorina

An early working prototype of an adaptive Emirati Arabic learning application. The initial goal is useful everyday conversation. Each learner has separate, evolving evidence for individual words and abilities; there are no fixed beginner/intermediate/advanced placements.

## Run

Requires Node.js 22 or later. There are **no packages to install**.

```sh
node scripts/serve.js
```

Open http://localhost:4173. The server binds only to your device. `PORT` can select another port.

Alternatively, open `dist/melorina.html` directly in a browser after building it. Text practice works without a network connection. AI voice needs the local Node server and an OpenAI API key; a standalone file does not include a backend. Recording requires microphone access in a supported browser on localhost or HTTPS; file URLs vary by browser.

```sh
npm test
node scripts/build.js
```

The included browser test uses Playwright when available: `node tests/browser.cjs`. Start the local server first. Playwright is an optional development tool, not an application dependency.

## Enable voice practice (0.3)

Copy `.env.example` to `.env`, set `OPENAI_API_KEY` on your own machine, then run:

```sh
npm run start:voice
```

Open `http://localhost:4173` and choose **Voice studio**. Pick a synthetic voice, coaching tone, pace, conversation version, and sound focus. Enable AI voice for this visit.

- **Listen & recognise:** hear a word before seeing its written form; replay or reveal help when needed.
- **Say it yourself:** record a word, explicitly send it for transcription, then confirm what was heard.
- **Sound workshop:** hear a model, record and compare, and rehearse a small part without invented pronunciation scores.
- **Voice conversation:** speak or type in a café, neighbour, or directions scenario; choose guided, everyday, or unexpected exchanges.
- **Voice controls:** explicitly record and confirm repeat, slower, hint, next, or stop.

AI voice usage is billed to the configured OpenAI account. The key stays on the server. See [voice setup, personalization, and data handling](docs/voice-practice.md). This is a local single-user server, not a production hosting setup.

## Try the adaptive loop

1. Open **A first hello**.
2. Choose **A little help, please** and type `marhaba`.
3. Recognise `اسمي` as **My name is**.
4. Type `shukran` for thanks. Use a hint if you need it.
5. Revisit the greeting independently. An early supported response adds one separated recall opportunity to the session.
6. Read the reflection, then open **Your growth**. Hinted and independent attempts are separate. Pronunciation and listening remain unassessed.
7. Open **Your words** to search or practice a word. **Explore your practice** schedules due reviews, recognition-to-recall transitions, and new material related to your goal.
8. In **Your preferences**, choose a goal and practice window. In **Your growth**, export your local progress.

## Try focused practice (0.2)

1. In **Your preferences**, add a personal conversation goal, such as ordering breakfast near home. The selected topic guides word suggestions; the free-text goal stays visible as a reminder of why you are practicing.
2. Choose **Start focused practice** on the dashboard, or **Focus on this word** in **Your words**.
3. Try one word. Recall hints reveal an initial-letter clue before the full written model. Recent recall attempts that consistently needed help start with the clue already visible.
4. Read the feedback and the written example in small pieces. After a supported answer or recognition miss, optionally **Hide the model & try again**. You can also continue without retrying.
5. Practice a different word, then return to the focus word in another situation. If recognition still needs support, the last turn remains a recognition task.
6. Read your reflection. Immediate retries are saved as rehearsals, separately from independent attempts and review scheduling.

This loop applies ideas from Daniel Coyle's discussion of deep practice. See [the design note](docs/deep-practice.md) for the source, implementation choices, and limits.

## What works

- Responsive dashboard, three guided conversation scenarios, searchable vocabulary, learner profile, preferences, and session reflection.
- Arabic and transliterated text input with conservative, explicit accepted variants. Unmatched free text does **not** automatically count as a learning failure.
- Separate recognition and recall evidence per word, context, hint use, timestamp, and session.
- Three-turn focused practice, gradual hints, written phrase chunks, and one optional repair per turn.
- Recent evidence for each word and task guides support; personal conversation goals persist across sessions.
- Bounded within-session adaptation and a persistent review queue. Same-session repetition cannot establish durable retention.
- Local progress persistence; JSON export; user-confirmed local reset.
- Text lessons retain optional local-only microphone recording and replay. Voice studio separately supports explicit transcription uploads. Neither provides pronunciation scores.
- Self-contained text-capable HTML build, dependency-free local API server, learning/controller/service tests, and optional browser-flow tests.
- OpenAI-backed transcription, synthetic speech, and turn-based conversation; separate listening and spoken-word evidence.
- Six voices, three coaching tones, pace controls, three conversation versions, sound families, and explicit voice controls.

## Boundaries of this prototype

The text course is a guided prototype; Voice studio adds bounded AI conversations when configured. Eight words/phrases and three authored scenarios make the adaptive behavior inspectable. Phrase matching may not recognise other valid Arabic expressions. Transliteration is approximate and not a pronunciation reference. The content is **draft and requires review by an Emirati Arabic educator before public release**. Some phrases are shared with other Arabic varieties; the intended course variety is Emirati Arabic.

The review intervals and evidence labels are transparent starting rules, not a clinically or educationally validated learning model. No proficiency percentages or automatically inferred pronunciation scores are shown. The new listening tasks and confirmed spoken-word transcripts provide limited task evidence. Phonemes, sentence-level grammar, spontaneous conversation, and conversational transfer still need dedicated validation. Success in this app does not establish real-world speaking proficiency.

Progress is local to one browser/origin and is not encrypted account storage. Opening a file and using localhost can create separate profiles. There is no sign-in, cloud sync, analytics, or payment handling. Text-only practice remains local. Enabling AI voice sends selected audio and conversation text through the local backend to OpenAI. Recordings and conversation history stay in page memory locally; provider data policies also apply. The interface explains this before voice use.

## Structure

| File | Responsibility |
| --- | --- |
| `src/content.js` | Draft Emirati Arabic vocabulary, aliases, scenarios, and task contexts |
| `src/engine.js` | Pure evidence updates, review selection, retention labels, and state validation |
| `src/practice.js` | Focus selection, recent-evidence support, and contextual follow-up planning |
| `src/app.js` | Interface, guided session controller, persistence, and local recording |
| `src/styles.css` | Responsive visual system and Arabic rendering |
| `scripts/serve.js` | Launch the loopback-only local app and API server |
| `server/app.js` | Bounded API routes, local-origin checks, and browser asset allowlist |
| `server/openai.js` | Server-only OpenAI speech, transcription, and structured conversation adapter |
| `src/voice-core.js` | Separate voice evidence, selection, preferences, pace, and commands |
| `src/voice-client.js` | Recording, playback, API calls, and cancellation |
| `src/voice-ui.js` | Voice studio, consent, transcript confirmation, and practice flows |
| `scripts/build.js` | Portable single-file HTML build |
| `tests/engine.test.js` | Evidence separation, hints, delayed recall, scheduling, idempotency, validation |
| `tests/controller.test.js` | Session/controller integration in a minimal DOM stub, persistence, rendering, and support fallback |
| `tests/practice.test.js` | Focus planning, challenge signals, rehearsal separation, and profile migration |
| `tests/browser.cjs` | Text user flow, persistence, mobile layout, recording, and accessible controls |
| `tests/voice-*.test.js`, `tests/server.test.js` | Voice evidence, mocked media/API flows, local HTTP boundaries, and cancellation |
| `tests/voice-browser.cjs` | Optional real-browser voice flow with mocked OpenAI endpoints |

See [VALIDATION.md](VALIDATION.md) for what has actually been run and what still needs browser verification.

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
- [Daniel Coyle on deep practice, Big Think Clips](https://youtu.be/vMyiySyx0AU) — design inspiration taken from a user-supplied transcript. Its anecdotes and numerical claims are not treated as validated product guarantees.

Text practice requires no external image, font, audio, or AI service. AI voice features require OpenAI API access and an internet connection.
