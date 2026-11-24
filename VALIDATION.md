# Actual validation record — 24 November 2026

The mathematical audit below supersedes the earlier redesign counts. The 38-unit/30-browser results and unchanged-engine hashes later in this file describe the preceding UI-only redesign; the subsequent audit intentionally corrects engine behavior. See [docs/mathematical-audit.md](docs/mathematical-audit.md) for the complete findings.

The commands below were executed against the delivered implementation. Results are not inferred from source inspection.

## Mathematical audit — latest executed results

| Check                        | Actual result                                                                                                              |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Original baseline            | 38 tests passed; 13 added audit regressions then all failed before correction                                              |
| `npm run test`               | **105 passed**, three files: 38 original + 14 audit regressions + 53 oracle/matrix tests; latest complete run 5.16 seconds |
| `npm run typecheck`          | Passed, no TypeScript errors                                                                                               |
| `npm run lint`               | Passed, no lint errors                                                                                                     |
| `npm run build`              | Passed, optimized production build in `dist/`                                                                              |
| `npm run audit:verification` | **29 / 29** comparisons passed; actual trace saved to `docs/audit-verification.json`                                       |
| `npm run test:e2e`           | **38 passed** in 2.0 minutes: 19 scenarios each on desktop Chrome and iPhone 13 Chrome emulation                           |

The browser audit checks real displayed tournament probabilities, length-one crossover skip messages, feasible zero-value knapsack stopping, and tiny-objective labels and target detection. Existing checks cover every problem, inspection of pre/post-mutation object versions, seeded speed independence, history restoration, imports, exports, city edits and responsive layout. The first expanded browser run passed 37 and failed one new mobile test because its helper searched for a tab role instead of the existing Algorithm trace button. The selector was corrected; the full rerun passed all 38 without retries.

After final display refinements, the 10 affected desktop/mobile audit and Verification Lab checks passed again in 22.1 seconds. Very small nonzero probabilities use scientific notation instead of displaying as zero, and full recorded random values are available. A final API guard also rejects sparse mutation alphabets.

Independent enumerations check all 11,520 four-allele OX children, all 24 four-queen permutations, 53,760 knapsack subset/capacity cases, brute-force tours with 3–7 cities, all binary encodings at 3–10 bits, and 160 complete simulation parameter combinations. Additional seeded operator cases cover permutation lengths through 20. These are executed tests, not a formal correctness proof. No physical-phone or Safari/Firefox results are claimed.

The controlled generation finishes at total fitness **1171**, mean **292.75**, best **625**, with **12 evaluations** and **28 random draws**. The global optimum **961** remains unreached; the recorded reason is the one-generation limit. See [docs/mathematical-audit.md](docs/mathematical-audit.md) for formulas, fixes, precise variants and limits.

## Earlier UI redesign record

| Check                         | Result                                                                              |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| `npm install`                 | Passed after retrying outside the network-restricted sandbox                        |
| `npm run typecheck`           | Passed, strict TypeScript, no errors                                                |
| `npm run lint`                | Passed, including the final browser test files                                      |
| `npm run test`                | **38 passed**, 1 test file                                                          |
| `npm run build`               | Passed, Vite production output in `dist/`; latest build 16.35 seconds               |
| `npm run test:e2e`            | **30 passed**, desktop Chrome and mobile Chromium emulation, latest run 1.6 minutes |
| Independent numerical fixture | **11 / 11 checkpoints match**                                                       |
| Local HTTP preview            | Returned status 200                                                                 |
| Visual inspection             | Desktop home/lab and mobile lab captures reviewed                                   |

The final numerical fixture produces chromosomes `01101, 11001, 01011, 10000`, fitness `169, 625, 121, 256`, total **1171**, mean **292.75**, best **625**. The optimum is still **961**, so the one-generation fixture does not claim a global solution.

## Local environment

- Windows, Node.js **22.13.1**, npm **10.9.2**.
- React **19.3.1**, TypeScript **5.9.3**, Vite **7.3.8**, Vitest **3.2.7**, Playwright **1.65.1**.
- Browser tests used installed Chrome through `PLAYWRIGHT_CHANNEL=chrome`, targeting the local Vite server at `http://127.0.0.1:5174` through `GENX_BASE_URL`.
- Desktop viewport: 1440 × 1000 CSS pixels. Mobile: iPhone 13 Chromium emulation, with touch/device viewport settings.
- The production build contains separate application, charts, mathematics and animation JavaScript chunks. Final build emitted no large-chunk or empty-chunk warnings.

## Browser scenarios actually exercised

Each scenario ran in both desktop and mobile projects:

1. Home navigation and the real live evolution demonstration.
2. Draft parameter changes, explicit experiment creation and invalid-input rejection.
3. Play, pause, individual steps, generations, backward/forward restoration and reset.
4. All five computed problems with compatible operators.
5. DNA Microscope and recorded ancestry.
6. Independent Verification Lab, all 29 comparisons.
7. Synchronized battle, comparison axis and configuration application.
8. Manual crossover/mutation and fitness prediction.
9. All routes, horizontal overflow checks, light/dark themes, mobile navigation, runtime and console error checks.
10. Equal final seeded populations at playback speeds 16× and 4×.
11. Invalid/valid configuration imports, actual downloaded settings and normalized-results JSON, print-report settings visibility.
12. City addition, draft isolation and correct route size after a new experiment.
13. Simulation / Population / Algorithm trace view switching, default mobile setup collapse and navigation indicator alignment.
14. Workbench crossover boundaries, ten actual mutation positions at per-gene probability 1, and inspection of the exact pre-mutation chromosome version.
15. Viewport containment at 360, 768 and 1280 CSS pixels, plus the normal 1440-pixel desktop and 390-pixel mobile projects.

Actual captures are stored in `docs/screenshots/`. `lab-preview-desktop.png` and `lab-preview-mobile.png` are viewport captures; the remaining files include full-page home, playground, verification and light-theme views.

Latest design captures: `redesign-lab-desktop.png`, `redesign-lab-mobile.png`, `redesign-operators-desktop.png`, `redesign-operators-mobile.png` and `redesign-light-*.png`. The `before-lab-preview-*.png` files are preserved, unmodified captures from the earlier delivery archive.

## UI audit and resulting redesign

The actual running application was inspected in the in-app browser at desktop and mobile sizes before changes. The redesigned application was inspected again through the browser and through Playwright captures.

| Observed issue                                                                           | Implemented improvement                                                                                         |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Playback floated over the fitness landscape at smaller widths                            | Sticky desktop toolbar; compact mobile controls with expandable speed/granularity settings                      |
| The mobile configuration form occupied several screens before the simulation             | Collapsed-by-default setup, compact workspace header, plot before metrics, and separate mobile views            |
| A floating chromosome badge obscured the home demo heading                               | Integrated, non-overlapping fittest-chromosome row with actual gene cells                                       |
| Mixed system typography and very small scientific labels                                 | Bundled Inter Variable and JetBrains Mono, consistent numeric styling, larger labels and stronger hierarchy     |
| Fixed SVG proportions left large unused horizontal margins and crowded the y-axis labels | ResizeObserver-based plot geometry, dedicated axis margins, unique SVG definition IDs, best-point emphasis      |
| Parent and child chromosomes appeared as plain strings                                   | Indexed gene ribbons, inherited-parent colors, crossover cuts, amber mutation positions and focus/hover meaning |
| Genetic operations were hard to inspect spatially                                        | DNA Workbench shows actual recorded inputs and outputs with restrained, reduced-motion-aware transitions        |
| Smoothed convergence could imply values between discrete generations                     | Stepped best-fitness trace, linear mean trace, precise small-number labels and an explicit initial-data note    |
| Repeated generic problem cards and excessive hero space                                  | Tighter live-demo composition, a problem catalog, consistent panel spacing and restrained scientific styling    |
| The active-navigation animation could move out of place                                  | Geometrically stable underline with a brief entrance transition and an explicit alignment test                  |

The final mobile capture shows the mathematical landscape immediately after the collapsed setup. Desktop setup and explanation panels have bounded scrolling. View changes retain the same experiment state. Color roles remain consistent between dark and light themes.

## Algorithm preservation

SHA-256 comparisons confirmed that every file in `src/engine/` is byte-for-byte unchanged from before this redesign. `src/problems/index.ts` was also checked against the previous source archive and is unchanged. The 38 numerical tests, five-problem browser scenarios, deterministic playback tests and eleven verification checkpoints passed after the UI changes. No decorative data or replacement simulation was introduced.

The inspector UI now honors the exact selected object version, allowing the pre-mutation workbench row to remain inspectable even when the same chromosome ID also has a recorded post-mutation version. This changes presentation and inspection, not engine execution.

## Corrections made during validation

The first type check found and prompted a mouse/pointer coordinate type correction. An early browser run was interrupted by development hot reload. A subsequent city-count test incorrectly included the SVG background pattern dot; its selector was corrected to count city labels. Mutation origin tracking, unchanged inversion centers, true evaluation counts, compact history serialization, feasible knapsack gaps and print settings were also checked before the final passing run.

## What is not claimed

No remote GitHub Actions run, external public repository, deployment, physical-device test, Firefox/WebKit test, formal accessibility audit or multi-seed statistical superiority result is claimed. Static hosting configuration and a manually triggered GitHub Pages workflow are included. The temporary preview servers are stopped during delivery cleanup; use `npm run dev` to start your own session.
