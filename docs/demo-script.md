# Four-minute presentation script

## Before presenting

Run `npm install`, `npm run test`, `npm run build`, then `npm run dev`. Open the Local URL printed by Vite. Close any unrelated applications. Keep this script beside the browser. On Playground, restore default draft settings and create the experiment. Leave seed 42 and the x² task selected. If demonstrating longer evolution, open Advanced and disable early stopping before creating the experiment.

No network connection or API key is needed after the app assets load. Use the local server for a predictable presentation. Team credits can be edited on About in advance.

## 0:00–0:25 — Introduce the idea

Open Home. Say: “GenX is a browser-based laboratory for genetic algorithms. Instead of showing only a final answer, it records how the population gets there.” Click **Evolve once**. Point to the changed generation and actual fitness/diversity values. Explain that the plotted dots are decoded chromosomes from the engine.

## 0:25–1:15 — Inspect the core algorithm

Open Playground. Explain the default problem: maximize x² for integer x from 0 to 31 using five-bit chromosomes. Point to population size, crossover and per-gene mutation probability, and seed 42.

Set playback granularity to **Micro steps**. Select **Next step**. Switch the explanation to Technical and show the sampled tournament indices and fitness values. Step through the second selection, crossover and mutation. Point to actual random samples, inherited teal/violet genes and any amber changed genes. A mutation may be skipped; that is a correct probability outcome, not a malfunction.

## 1:15–1:50 — Inspect history and ancestry

Select **Next generation**. Explain current best, average fitness and diversity. Open a chromosome’s DNA Microscope. Hover or focus a gene to show its place value. Show decoded objective, selection fitness, birth generation and parent IDs. Switch to Recorded ancestry.

Close the inspector. Select **Previous generation**, then **Next generation**. Say: “This restores the exact recorded state. Rewinding does not resample randomness.” If needed, briefly play at 4×, pause, then inspect the convergence curve.

## 1:50–2:30 — Demonstrate another representation

Select Travelling Salesman and create a new experiment. Explain that this changes from binary genes to a permutation. Highlight OX crossover and swap/inversion mutation as validity-preserving operators. Point to the closed tour and minimized distance; selection instead maximizes `1/(1+distance)`.

Edit cities on the map, move or add one, finish editing and create a new experiment. Explain that structural changes are drafts until explicitly applied. At up to 10 cities, the displayed reference distance comes from independent Held–Karp dynamic programming.

## 2:30–3:15 — Verify the mathematics

Open Verification. Show the independently calculated A–D population and roulette probabilities. Explain that samples `0.10, 0.40, 0.68, 0.90` select A, B, C, D. Point to the cut after the third bit and the single forced mutation at child 1’s fifth gene.

Select **Run verification**. Show all 29 checkpoints matching, including every random draw, intermediate chromosome and evaluation budget. State: “Best fitness improves from 576 to 625. The final total is 1171 and average is 292.75. This does not reach the global optimum 961.”

## 3:15–3:45 — Compare strategies

Open Evolution Battle. A uses mutation 0.01; B uses 0.20. Both have the same seed and initial population. Run or step both. Switch the chart between generations and fitness evaluations. Explain: “One stochastic comparison is illustrative; it does not prove that one strategy is always better.”

## 3:45–4:00 — Close with reproducibility

Mention phrase, knapsack and N-Queens; the manual prediction lab; exports; automated tests; and static hosting. Open About for team credits. State that the whole application runs client-side and that the source includes the complete verification calculation and deployment instructions.

## Presentation recovery tips

- An early-stopped run can already have solved the task. Reset or turn off early stopping in a fresh experiment.
- A reset confirmation protects a recorded timeline; choose Reset to restore the original configuration and seed.
- If x² solves too quickly, use the multimodal function or TSP to illustrate diversity and stagnation.
- Export a run before changing pages. Only configuration, theme and credits are saved locally; the full timeline is in memory.
- If the development server selects a different port, use the exact Local URL it prints.
