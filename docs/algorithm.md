# Engine, representations and formulas

## Deterministic execution

The engine uses a lazy generator, with explicit stages: initialize, decode, evaluate, statistics, select, crossover, mutate, validate, offspring, elites, replace, stop. Each yielded `SimulationEvent` records its ID, generation, population, inputs, outputs, random decisions, selected indices, cut boundaries, changed mutation positions, statistics, best-ever and best-feasible candidate. Individual records include immutable genes, birth generation, parent IDs and the parent source of each gene.

GenX uses **Mulberry32**, with unsigned 32-bit state and a 32-bit integer seed. Each call adds hexadecimal `6D2B79F5`, mixes with integer multiplication and bit shifts, and divides the resulting unsigned integer by `2³²`. Outputs are in `[0,1)`. The seeded engine never calls `Math.random`. Fisher–Yates shuffle initializes valid permutations. Scripted sources are dependency-injected for verification and operator tests.

The timeline stores every generated event. Configuration, problem metadata, reference and recorded events are recursively frozen. Population arrays are shared until generation replacement; operators and elite copies produce new gene arrays. A Simulation instance is single-use; reset constructs a fresh seeded instance. Advancing from a historical cursor consumes existing events until the latest recorded event, then resumes the original generator. Playback speed cannot affect the random stream. Reset discards history and constructs a new engine with the original config and seed.

The producer is independent of React. UI state only determines which event to display and when to request another. There is one timer per active playback session, canceled on pause, reset and unmount.

## Binary function encoding

For left-to-right bits `b₀,…,bL−1`:

`integer = Σ bᵢ 2^(L−1−i)`

`x = domainMin + integer/(2^L−1) × (domainMax−domainMin)`

The default `L=5, domain=[0,31]` yields precisely the 32 integers. Other domains or precisions yield a finite grid which may contain fractional points.

- Square: maximize `f(x)=x²`, with `F=f`.
- Minimum: minimize `f(x)=(x−3)²`, with `F=1/(1+f)`.
- Sine: maximize `f(x)=x sin(x)`, with `F=f+max(|domainMin|,|domainMax|)+1`. The shift makes every encoded fitness positive and remains fixed during the experiment.
- Multimodal: maximize `sin(3x)+0.4cos(7x)+2`, with `F=f`, bounded below by 0.6.

Exact references exhaustively inspect at most 1,024 encoded points. They are discrete optima, never advertised as exact continuous optima. There is no arbitrary-expression execution.

## TSP

Genes are a permutation of city indices. The objective sums Euclidean distance between each consecutive pair **and the closing last-to-first edge**. Selection fitness is `1/(1+distance)`. Coincident city coordinates are allowed and yield zero-length edges without invalidating the permutation.

OX crossover and swap/inversion mutation preserve unique city visits. Genome validity checks length, integer index bounds and uniqueness. Independent Held–Karp dynamic programming fixes city 0, stores the cheapest path for each visited mask/end city, then adds the closing edge. Complexity is `O(n²2ⁿ)` time and `O(n2ⁿ)` memory, capped at 10 cities; larger instances show no exact comparison.

## Knapsack

One bit per item: 1 includes its weight and value. `W=Σ bᵢwᵢ`, `V=Σ bᵢvᵢ`. Fitness is `V` if `W≤capacity`, otherwise 0. The objective remains total value even for infeasible candidates; feasibility and penalized fitness are distinct fields. A separate best-feasible record is preserved across generations. Zero fitness may include both empty bags and infeasible bags.

The independent reference uses integer dynamic programming: `DP[i,w]=max(DP[i−1,w],vᵢ+DP[i−1,w−wᵢ])` when the item fits. Backtracking recovers an optimal feasible genome. Weight and capacity limits bound computation. The reported gap is an absolute objective difference, not a percentage.

## N-Queens

Permutation gene `g[c]` gives the queen’s row in column `c`, ensuring unique rows and columns. Columns `a<b` attack diagonally if `|g[a]−g[b]|=b−a`.

Objective: attacking diagonal pairs. Fitness: `N(N−1)/2 − attacks`.

Only zero attacks is a solved board. `validQueens` independently tracks unique rows and both diagonal keys `(row+column)` and `(row−column)`; it does not reuse the fitness conflict count.

## Phrase

Chromosome and target are arrays of Unicode **code points**, using `Array.from`, not UTF-16 code units. Fitness is the number of equal code points at equal positions. The mutation alphabet is a fixed Latin/digit/punctuation base augmented by every code point from the target. A replacement chooses uniformly among alphabet entries other than the current character. Targets have 1–40 printable code points; control characters and unpaired surrogates are rejected. Combining sequences are compared at code-point granularity, not normalized grapheme clusters.

## Selection

### Roulette

Weights are `max(0,Fᵢ)`. If the total is positive, `pᵢ=wᵢ/Σw`. If all weights are zero, use `pᵢ=1/N`. Draw `r∈[0,1)` and choose the first cumulative probability **strictly greater** than `r`. Thus intervals are half-open, zero-weight intervals cannot be selected and a boundary belongs to the next nonempty interval. The final cumulative value is clamped to exactly 1 for floating-point safety.

### Tournament

Sample `k` indices independently with replacement; choose the largest fitness. Ties keep the first sampled maximum. Repeated samples are legitimate and recorded. The probability table shows theoretical tournament winner probabilities. With L strictly lower-fitness members and T tied members, pᵢ = [((L+T)/N)^k − (L/N)^k]/T. Actual sampled candidate indices and their fitness are recorded.

### Rank

Sort ascending by fitness, assigning ranks 1…N. Equal-fitness candidates share their group’s average rank. Roulette-sample these positive rank weights. Unlike raw roulette, one exceptionally large fitness does not dominate solely because of its magnitude.

## Crossover

One probability draw applies per parent pair. If `r≥p꜀`, clone the two respective parent genomes and record a skipped operation. Length-one single/two-point chromosomes also skip because no internal cut exists; uniform crossover still inherits at its single locus.

- **Single-point:** choose a boundary `k∈{1,…,L−1}`, exchange suffixes. `k=3` means after the third gene from the left.
- **Two-point:** choose two distinct gene positions, sort them, and exchange the inclusive position segment (represented as `[start,end)` array boundaries).
- **Uniform:** independently choose parent A/B with probability 0.5 at each locus of child 1; child 2 receives the complementary inheritance.
- **OX:** preserve the selected segment of parent A; starting from the segment’s end, traverse parent B cyclically, inserting only unused values into the remaining cyclic positions. Reverse the parent roles for child 2.

Binary/character representations support the first three; permutations support only OX. Incompatible combinations are prevented in the configuration UI and rejected by import validation. PMX is intentionally absent.

## Mutation

- **Bit flip:** independently for every gene, flip 0↔1 when `r<pₘ`.
- **Character:** independently for every gene, replace its code point when `r<pₘ`, choosing a different entry from the augmented alphabet.
- **Swap:** check once per chromosome; if successful choose two distinct positions and swap.
- **Inversion:** check once per chromosome; if successful reverse the inclusive segment between two distinct positions.

Permutation source-origin indices move with the genes. Changed-position annotations exclude the unchanged center of an odd-length reversed segment. Child chromosomes retain their own birth IDs while the mutation event records before/after versions. The latest recorded version at the current timeline cursor is shown by the inspector.

For a length-L binary chromosome, probability of at least one mutation is `1−(1−pₘ)^L`; it is not simply `pₘ`. Probability 0 and 1 use strict `<` semantics consistently.

## Replacement, elitism and counters

Rank the current population by fitness, then feasibility and original objective direction for equal fitness; copy the top E genomes, including independent gene/source arrays. Elites have new IDs and a single recorded parent, retain evaluated objective/fitness, and receive no mutation. Breed until `N−E` children are accepted. If only one remaining slot exists, discard the second child. Population size is always N.

Every offspring gets a real provisional evaluation at crossover construction and a real evaluation after mutation, so each intermediate genome can be inspected. These evaluations, including an excess discarded child, count toward the evaluation metric. Elite fitness is copied. For N=5, E=1, one generation generates four children and contributes eight evaluations. Initial evaluation contributes N. Solver and plotted landscape evaluations are outside the GA counter.

Best current fitness may fall with zero elites. Best-ever fitness never falls. The best feasible candidate is tracked separately. Best records cover committed populations, excluding provisional or discarded children. Stagnation counts completed generations without an improvement under fitness → feasibility → original objective ordering. Equal floating-point fitness can hide an objective improvement, which resets stagnation.

## Diversity and stopping

Normalized positional Hamming diversity is the average fraction of differing gene positions across all unordered pairs:

`D = Σᵢ<ⱼ dH(cᵢ,cⱼ) / (L × N(N−1)/2)`.

Per-locus value frequencies give the exact result in `O(NL)` without enumerating every pair. It ranges from 0 (identical genomes) to 1. This is used for every representation and explicitly labeled; equivalent rotated/reversed TSP tours may differ positionally.

Stop at the generation limit. If early stopping is enabled, also stop at a known exact discrete objective or after the configured stagnation window. For N-Queens, zero attacks and the independent board checker are required. For knapsack, use the best feasible record. Function/integer targets compare actual objective equality; the discrete function reference compares objective rather than rounded selection fitness. TSP permits only scale-relative roundoff (32 × Number.EPSILON × maximum absolute compared distance), with no absolute tolerance floor. Above 10 TSP cities there is no exact-target stop, only limit or stagnation.

## History, comparison and practical constraints

The UI caps `populationSize × maxGenerations` at 6,000, population at 100 and generations at 200. Events use structural sharing; no arbitrary-length run is permitted. A generation is computed in one bounded task, and playback returns to the event loop between generation advances. Population tables scroll instead of growing without bounds on screen.

Initialization and replacement are the committed chart/CSV observations; provisional events cannot overwrite generation-zero evaluation counts. Best-ever chart lines use steps. The landscape plots the original objective as a continuous guide, marks discrete population candidates, adapts sampling to analytic frequency and shows tiny nonzero values in scientific notation.

Battle uses the same instance and seed. Equal population sizes have identical initial genomes. Different sizes are prefixes of the same deterministic initialization stream; subsequent random positions naturally diverge after consuming different initial draw counts. Generation and evaluation-axis charts compare best-ever **selection fitness** only for the shared problem instance. Single-seed results do not support universal superiority claims.

Manual evolution uses explicit user choices and scripted decision fixtures in its separate teaching sandbox. It calls the same operators; it does not overwrite the automatic experiment or claim that manual choices are random.
