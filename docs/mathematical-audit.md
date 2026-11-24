# GenX mathematical and technical audit

Audit date: 24 November 2026. This audit covers the delivered local TypeScript engine, all five problem definitions, event history, exports, teaching explanations, convergence plots and the running desktop/mobile application. The simulations remain the production genetic algorithms; no computed view has been replaced by a mockup.

## Findings and corrections

The original 38-test suite passed. Thirteen newly written regression cases then **all failed against the original implementation**, demonstrating gaps in that suite. The fixes are covered by `audit.test.ts`, independent enumerative oracles in `oracles.test.ts`, and real-browser checks in `e2e/audit.spec.ts`.

| Finding                                                                     | Consequence before correction                                                                                                                                   | Delivered correction                                                                                                                                                                                       |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fixed absolute `1e−9` optimum tolerance                                     | With domain `[0,10⁻⁶]`, `x=0` was declared optimal although the maximum is `10⁻¹²`                                                                              | Function/integer targets compare actual objective equality. TSP alone uses scale-relative floating-point roundoff; queens and phrases also require a valid complete solution.                              |
| Function reference selected by transformed fitness                          | In minimization on `[3−10⁻⁸,3]`, reciprocal fitness rounded to 1 for different objectives; the reference missed the exact zero                                  | Exhaustive reference compares the original objective in the correct direction.                                                                                                                             |
| Equal-fitness best/elite ordering ignored feasibility and objective         | An infeasible zero-fitness bag could hide the feasible empty-bag optimum; rounded fitness ties could hide a better objective                                    | Order by fitness, then feasibility, then objective direction. Apply consistently to best records, elite copies and current-best displays. Parent selection retains its documented fitness-only tie rule.   |
| Battle used an infeasible fitness winner for objective gap/target           | An invalid bag could be compared with the feasible optimum; target detection repeated the unsafe tolerance                                                      | Use best feasible bag, nullable gap when none exists, and the engine’s validated `targetReached` status.                                                                                                   |
| Generation-zero history accepted every event with generation 0              | Breeding previews overwrote initialization’s evaluation budget: a four-individual initial population could appear to cost 12 evaluations                        | Plot/export only initialization and committed replacement snapshots.                                                                                                                                       |
| Tournament table showed roulette weights                                    | Displayed probabilities did not describe the actual tournament operator                                                                                         | Calculate the tournament winner distribution, including ties and sampling with replacement. Record method and candidate indices.                                                                           |
| Uniform crossover returned clones at length 1                               | A one-character phrase never underwent valid uniform inheritance                                                                                                | Run uniform inheritance before the no-internal-cut guard. Single/two-point length-one crossover is explicitly marked skipped.                                                                              |
| OX accepted incompatible allele sets                                        | Public operator calls could create invalid permutations                                                                                                         | Reject different lengths, duplicate/missing alleles, incompatible allele sets, invalid boundaries and sparse/nonfinite input. Exhaustive tests check every four-allele parent pair and cut.                |
| Representation validators coerced types or skipped holes                    | Numeric phrase genes, string queen rows, empty queen boards and sparse chromosomes could pass checks                                                            | Strict numeric binary/permutation encodings and string code points; reject sparse arrays. Evaluation validates first. Independent queen checking remains separate from fitness.                            |
| Public helpers accepted malformed input/random draws                        | Empty selection, samples equal to 1/NaN, nonbinary decoding, invalid exact-solver data or extreme distances could produce incorrect results or unsafe loops     | Validate sources, seeds, integer ranges, distributions, decoding, mutation, permutation helpers and solver inputs; reject nonfinite tour results. Normalize huge finite roulette weights without overflow. |
| Swap reported changed positions when values were equal                      | Recorded mutation highlights could claim a change that never happened                                                                                           | Changed positions compare actual values; separately record passed mutation checks, moved origins and whether an operator changed anything.                                                                 |
| History/configuration were only described as immutable                      | A consumer could mutate a recorded chromosome/config and corrupt subsequent results                                                                             | Recursively freeze configuration, problem metadata, reference solution and every recorded event/object version. Prevent reuse of an already consumed simulation stream.                                    |
| Explanations differed from implementation                                   | Binary decoding formula appeared for all problems; generic minimization explanation omitted queen pair-complement fitness; skipped/no-op events were misleading | Problem-specific decoding/evaluation formulas, accurate stopping formula, full recorded RNG precision and truthful crossover/mutation messages. Learn and algorithm documentation updated.                 |
| Objective plot was called a fitness landscape; small values rounded to zero | Reciprocal/shifted fitness could be confused with the plotted objective; tiny objectives and axes appeared zero                                                 | Label objective and continuous guide explicitly; preserve tiny values in scientific notation and decoded coordinates. Include actual population objectives in plot bounds.                                 |
| 160 curve samples across every domain                                       | Wide high-frequency multimodal domains could alias the curve                                                                                                    | Sample at least 12 points per fastest analytic period, with a 160-point floor. Curves remain context; discrete encoded optima come from enumeration.                                                       |
| Linear Battle interpolation suggested unobserved gradual gains              | Plots implied intermediate fitness values between measurements                                                                                                  | Draw best-ever curves as steps, using committed generation/evaluation observations.                                                                                                                        |

## Representation and fitness audit

All selection maximizes `F`. Objectives retain their original meaning and direction.

| Problem          | Chromosome and objective                                                                       | Selection fitness                                           | Constraint/reference                                                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Binary functions | Numeric bits; `z=Σ bᵢ2^(L−1−i)`; `x=a+z(b−a)/(2ᴸ−1)`                                           | Square: `x²`; minimum: `1/(1+(x−3)²)`; sine: `x sin(x)+max( | a                                                                                                                                            | ,   | b   | )+1`; multimodal: `sin(3x)+0.4cos(7x)+2` | Exhaust every encoded point; minimize only the quadratic minimum. Sine fitness ≥1, multimodal fitness ≥0.6. The reference is discrete, not a continuous optimizer. |
| Closed TSP       | Permutation of `0…n−1`; sum Euclidean distances including last→first                           | `1/(1+d)`                                                   | Every city exactly once; OX and swap/inversion only. Held–Karp exact reference through 10 cities; no exact target above 10.                  |
| 0/1 knapsack     | Numeric bit per item; value `V=Σbᵢvᵢ`, weight `W=Σbᵢwᵢ`                                        | `V` if `W≤C`, otherwise 0                                   | Infeasibility is a penalty, not genome repair. Best feasible record is separate. Integer DP reference independently checked against subsets. |
| N-Queens         | Permutation: column is position, row is allele; objective counts attacking diagonal pairs once | `n(n−1)/2 − attacks`                                        | Rows/columns unique by representation. A solution requires zero attacks and the independent row/diagonal checker.                            |
| Phrase           | Unicode code-point string per locus, target-augmented alphabet                                 | Exact positional match count                                | No UTF-16 surrogate splitting. Exact complete phrase is the target; no grapheme normalization is implied.                                    |

`evaluate` rejects malformed chromosomes. Knapsack overweight chromosomes and queen boards with attacks are valid representations but infeasible solutions; they are retained with the documented fitness rather than silently repaired.

## Operator and probability audit

Roulette uses `max(0,Fᵢ)/Σmax(0,Fⱼ)`, with uniform fallback when the total is zero. Rank selection sorts ascending and assigns the average rank to ties. Both sample left-inclusive, right-exclusive cumulative intervals. Trailing zero-weight entries cannot receive the floating-point tail. Overflowing finite fitness sums are safely rescaled.

Tournament samples `k` indices **with replacement**, choosing the first sampled maximum. If candidate i has L strictly lower-fitness members and T equal-fitness members in population N, its theoretical winner probability is:

`pᵢ = [((L+T)/N)^k − (L/N)^k] / T`.

The exhaustive oracle enumerates every ordered candidate sequence for N=3, k=2,3,4, including tied and all-zero populations. These are the ideal uniform-sampling probabilities. Mulberry32 provides a finite 32-bit grid; finite-grid interval quantization is distinct from the theoretical model.

Crossover checks `r<p꜀` once **per parent pair**. Single-point chooses an internal boundary uniformly. Uniform chooses one parent per locus with probability 1/2 for child one and complementary inheritance for child two. Two-point and OX choose two distinct **gene positions**, exchanging/retaining the inclusive segment `[min,max]`, recorded as array boundaries `[start,end)`. This intentionally permits whole-chromosome exchange and has minimum random segment length two. It is a documented variant, not uniform sampling of two arbitrary array boundaries. Fixed-boundary operator tests also exercise one-gene and full-length segments.

OX retains the first parent’s block, scans the second parent cyclically from the block end and fills cyclic holes with unused alleles. No duplicates or missing cities/rows are permitted. Per-locus parent source maps are checked independently.

Binary and phrase mutation check each gene independently with strict `r<pₘ`; phrase replacements are uniform over distinct alphabet entries excluding the current code point. Thus five bits at `pₘ=.1` have probability `1−.9⁵=.40951` of at least one change and expected changed count `.5`. The oracle enumerates all 32 Bernoulli outcomes and their probabilities. Swap/inversion check **once per chromosome**, then select two distinct positions. Inversion reverses the inclusive interval; an odd segment’s unchanged middle is not highlighted as changed. Source-origin maps follow moved alleles. A successful check and an actual value change are recorded separately.

## Replacement, elitism, budgets and stopping

Each generation copies E elites with independent gene/source arrays, new IDs and one-parent lineage. Their cached evaluation is reused. It then accepts N−E offspring. Breeding produces pairs; an excess child in an odd remaining slot is evaluated and discarded. Every committed population has exactly N members.

Let `M=2 ceil((N−E)/2)`. Every completed generation costs **2M** fitness evaluations: M real crossover previews and M post-mutation evaluations, even for skipped/no-op operators. Initialization costs N. Therefore after G completed generations, `evaluations=N+2MG`. Reference solvers and display-only landscape points do not enter this GA counter. Tests check this formula across all five problems, N=4,5,6,7, E=0/N−1, probability 0/1 and seeds 0/42 (160 complete runs).

Best-ever and best-feasible records cover **committed populations**; provisional and discarded children do not set those records. Best-ever selection fitness cannot decrease. Stagnation counts completed generations without improvement under the documented fitness→feasibility→objective ordering, including meaningful objective improvements hidden by floating-point fitness ties. Without elitism, current population fitness may fall; this is legitimate.

Generation limit is always checked first. With early stopping enabled, target attainment is checked next, then stagnation. A generation-limit or stagnation stop is not a claim of global optimality. Target status is recorded even when early stopping is disabled. Functions/integer objectives use exact equality of values evaluated by the same definitions. TSP allows `32·Number.EPSILON·max(|candidate|,|reference|)` roundoff, with no absolute floor; queens additionally pass the independent checker and phrases match the exact target.

## Seeded randomness and history

Mulberry32 state advances by `0x6D2B79F5` modulo 2³² and uses signed integer multiplication/unsigned shifts before dividing by 2³². An eight-draw seed-42 golden vector was calculated separately using Python masked integer arithmetic and matches exactly. Labels do not change the stream. Fisher–Yates initializes permutations. Invalid injected draws are rejected throughout operators and simulation.

Configuration is cloned/frozen, events and shared subobjects are frozen, and each run is single-use. A fresh instance with the same seed/config/input reproduces the same decisions. Existing browser tests compare complete exports at different playback speeds and verify restoration of recorded states. Pre/post-mutation objects sharing an individual ID remain separate historical versions; normalized export identifies objects, not merely IDs.

## Independent hand-calculated generation

The production state machine is driven with explicitly prescribed random decisions, independent of seeded initialization. Literal expected values are frozen; the comparison reads actual event metadata instead of recomputing probability tables alongside the implementation.

| Checkpoint                      | Hand result matched by the engine                                            |
| ------------------------------- | ---------------------------------------------------------------------------- |
| Initial genes                   | `01101, 11000, 01000, 10011`                                                 |
| Decoded x                       | `13,24,8,19`                                                                 |
| Initial fitness                 | `169,576,64,361`; total 1170; mean 292.5; best 576                           |
| Roulette p                      | `(169,576,64,361)/1170`                                                      |
| Cumulative p                    | `(169,745,809,1170)/1170`                                                    |
| Samples and selected indices    | `.10,.40,.68,.90` → A,B,C,D                                                  |
| Pair crossover checks/cut draws | `(0,.5)` twice; both checks pass; both cuts at boundary 3                    |
| Crossover outputs               | `01100,11001,01011,10000` → x `12,25,11,16`; F `144,625,121,256`             |
| Mutation draws                  | 20 checks; child one gene five `.05`, every other draw `.90`                 |
| Actual changed positions        | `[5],[],[],[]`, using one-based labels                                       |
| Final genes/fitness             | `01101,11001,01011,10000`; `169,625,121,256`                                 |
| Replacement aggregates          | N=4, generation=1, no elites; total 1171; mean 292.75; best 625              |
| Diversity                       | Initial `17/30`; final `16/30`, independently counting six pairs × five loci |
| Lineage/source maps             | Pairwise parent IDs and first-three/suffix inheritance match every child     |
| Budget/termination              | 12 evaluations, 28 draws; maximum generations reached; target not attained   |

The encoded global optimum is 961 at x=31; final absolute gap is 336. The full **29-checkpoint** expected/actual comparison and normalized event trace are in [audit-verification.json](audit-verification.json). Reproduce with `npm run audit:verification`. Full arithmetic is in [verification.md](verification.md).

## Test evidence and limits

Executed results: **105 unit tests passed**, **38 desktop/mobile browser tests passed**, **29/29 independent comparisons passed**. Strict TypeScript, ESLint and the production build passed. The initial 13 audit regressions failed on the original engine before correction. One new mobile browser test initially used an incorrect role selector; after correcting the test helper, the complete suite passed without retries.

Final executed command results are recorded in [../VALIDATION.md](../VALIDATION.md). The oracle suite includes all 11,520 four-allele OX children, all 24 four-queen permutations, 53,760 knapsack subset/capacity comparisons, brute-force closed tours for 3–7 cities, all 3–10-bit decoded integers, and additional permutation cases through length 20.

This is a source audit plus executed regression and enumerative testing, not a formal proof over all configurations. Numerical calculations use IEEE-754 doubles. No physical-device or Safari/Firefox execution is claimed; mobile coverage is Chrome’s device emulation. Exact TSP references stop at 10 cities, and function references apply to encoded candidates. Positional Hamming diversity for TSP deliberately measures positional genes, not tour-edge diversity. Single-seed Battle results do not establish statistical superiority.
