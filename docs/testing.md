# Verification and testing

## Commands

```sh
npm run lint
npm run typecheck
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

The browser suite has desktop Chromium and mobile Chromium device emulation projects. The default setup starts Vite on port 5173. To target an existing server with installed Chrome in PowerShell:

```powershell
$env:GENX_BASE_URL = 'http://127.0.0.1:5174'
$env:PLAYWRIGHT_CHANNEL = 'chrome'
npm run test:e2e
```

Unset these environment variables to return to Playwright’s default local-server/downloaded-browser setup. In CI, the workflow installs Chromium and its dependencies. Browser reports are written to `playwright-report/` and failing traces to `test-results/`; both directories are ignored by Git.

## Meaningful coverage

Unit coverage includes binary decoding, direct/transformed fitness, roulette boundaries, zero-fitness fallback, tournament/rank selection, all implemented crossover and mutation operators, exact diversity, changed-position/source-origin tracking, representation validity, independent elite copies, odd population sizes, generation replacement, evaluation counters, seeded reproducibility, history restoration, stopping reasons, validation, the complete independent fixture, exact solvers and queen solution checking.

Browser scenarios exercise real UI controls: changing parameters with draft semantics, applying invalid input, all five problems, play/pause, micro/generation stepping, backward/forward restoration, reset, microscope/ancestry, verification, battle synchronization, comparison axis, manual prediction, light/dark themes, navigation, horizontal overflow checks, speed independence, JSON imports/settings downloads and city editing. The suite captures screenshots from the application rather than using mock images.

## Actual execution record

The mathematical audit expands the original 38 tests to **105 passing unit tests** across three files. The original 13 audit regressions were first run against the old engine and all failed, then passed after fixes. Independent oracles enumerate OX, tournament outcomes, queens, knapsack subsets and small TSP tours. See [mathematical-audit.md](mathematical-audit.md) for exact scope. The 29-checkpoint controlled example passes with every random draw and intermediate output checked.

The browser suite passed **38 tests** (19 scenarios each in desktop and mobile projects), including tournament probability checks, length-one crossover messages, feasible zero-value knapsack termination and tiny-objective display/stopping checks. The consolidated execution record is in VALIDATION.md. Browser scenarios also verify view switching without lost state, exact pre/post-mutation inspection and viewport layout bounds. Earlier redesign results are historical, preceding the mathematical fixes.

The final consolidated execution record is in `VALIDATION.md` at the project root. Its results are recorded only after the commands finish. Supplied GitHub workflows have not been run remotely, and no cross-browser or physical-phone results are claimed.
