# Validation — 2026-09-17

## Passed

`npm test` (`node --test tests/engine.test.js tests/controller.test.js tests/practice.test.js`): **34 tests passed**.

These cover separate recognition/recall evidence, supported answers, duplicate submissions, delayed retention, review scheduling, aliases, invalid state, scenario references, a full guided session with adaptive revisit, persisted progress, rendered screen generation, escaped user content, and the unsupported-recording fallback.

Version 0.2 adds checks for recent per-word/task support decisions, recognition misses that do not advance to recall, progressive hint evidence, bounded and skippable retries, rehearsals that preserve skill estimates and review dates, contextual follow-up selection, old-profile compatibility, visible versus invented hint use, and persisted personal goals.

JavaScript syntax checks and parsing all four embedded build scripts: passed.

`node scripts/build.js`: generated a standalone HTML file with inlined application code and styles and no runtime package dependencies.

## Not verified in this environment

The Playwright browser test is included in `tests/browser.cjs` but could not run because no browser binary was installed. Downloading the browser was denied by the environment's network policy. Therefore, actual browser layout, mobile rendering, microphone capture/playback, and the end-to-end DOM flow still need browser verification.

The browser test now includes personal goals, focused practice, gradual hints, and hidden-model repair on mobile. These browser assertions have not been executed successfully in this environment.

Controller tests use a minimal DOM stub. They do not replace browser tests or establish that recording works on a particular device.

Emirati teaching content is draft; no native educator review or pronunciation assessment validation has taken place. Review timing is a prototype heuristic, and learning effectiveness has not been measured.

## Repository

Project destination: [axsimarosmelos/Melorina-](https://github.com/axsimarosmelos/Melorina-). The repository contains source, tests, build tools, and documentation. Generate the portable HTML build with `node scripts/build.js`. Hosting and deployment are separate from storing the source on GitHub.
