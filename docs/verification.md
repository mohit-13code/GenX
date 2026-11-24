# Independent numerical verification

This calculation is written independently of the implementation. The expected chromosomes and fitness values in `src/engine/verification.ts` are literal expectations, not values recomputed from the engine for comparison. Its scripted fixture runs the same production `Simulation` state machine used by Playground.

## Configuration

Maximize `f(x)=x²`, with integer `x∈{0,…,31}`. Five bits, four individuals, roulette selection, single-point crossover, crossover probability 1, mutation probability 0.1 **per gene**, no elitism, one complete generation and generational replacement. Early stopping is disabled.

## Decode and evaluate

The leftmost gene is the most significant bit. Positions are 1-based in explanations.

| ID  | Genes | Hand decoding                |   x |  x² |
| --- | ----- | ---------------------------- | --: | --: |
| A   | 01101 | 0×16 + 1×8 + 1×4 + 0×2 + 1×1 |  13 | 169 |
| B   | 11000 | 1×16 + 1×8                   |  24 | 576 |
| C   | 01000 | 1×8                          |   8 |  64 |
| D   | 10011 | 1×16 + 1×2 + 1×1             |  19 | 361 |

Total: `169+576+64+361=1170`. Mean: `1170/4=292.5`. Best: `576` (B).

## Roulette selection

For nonzero total fitness, `pᵢ=fᵢ/Σf`.

| ID  | Exact p  | Approximate p | Exact cumulative | Approximate cumulative | Interval             |
| --- | -------- | ------------: | ---------------- | ---------------------: | -------------------- |
| A   | 169/1170 |      0.144444 | 169/1170         |               0.144444 | [0, 169/1170)        |
| B   | 576/1170 |      0.492308 | 745/1170         |               0.636752 | [169/1170, 745/1170) |
| C   | 64/1170  |      0.054701 | 809/1170         |               0.691453 | [745/1170, 809/1170) |
| D   | 361/1170 |      0.308547 | 1170/1170        |               1.000000 | [809/1170, 1)        |

Rounding is only for display. Selection operates on unrounded values. Scripted samples:

- `0.10` falls in A’s interval.
- `0.40` falls in B’s interval.
- `0.68` falls in C’s interval.
- `0.90` falls in D’s interval.

Selected order is therefore **A, B, C, D**. Pair A with B; pair C with D.

## Single-point crossover

The cut is **after the third bit from the left**, the zero-based array boundary 3. Each crossover check uses 0, which is below crossover probability 1. The scripted cut sample 0.5 produces `1+floor(0.5×(5−1))=3`.

```text
A  011 | 01       child 1  011 | 00 = 01100 = 12
B  110 | 00       child 2  110 | 01 = 11001 = 25

C  010 | 00       child 3  010 | 11 = 01011 = 11
D  100 | 11       child 4  100 | 00 = 10000 = 16
```

The provisional pre-mutation fitness values are `144, 625, 121, 256`. These are real preview evaluations and are counted, but do not enter the replacement population until mutation and validation finish.

## Per-gene mutation

Flip a bit exactly when `r<pₘ`.

| Child | Samples at genes 1–5        | Changed positions | Mutated chromosome |
| ----- | --------------------------- | ----------------- | ------------------ |
| 1     | .90, .90, .90, .90, **.05** | **5**             | 01100 → **01101**  |
| 2     | .90, .90, .90, .90, .90     | None              | 11001              |
| 3     | .90, .90, .90, .90, .90     | None              | 01011              |
| 4     | .90, .90, .90, .90, .90     | None              | 10000              |

Since `.05<.1`, only child 1’s fifth gene flips. `.90≥.1`, so every other gene stays unchanged. This fixture contains 20 mutation checks and exactly one changed position.

## Validate, evaluate and replace

Each child remains a valid five-bit genome. With no elites, all four children replace the four parents.

| Child | Final genes |   x | Objective = selection fitness |
| ----- | ----------- | --: | ----------------------------: |
| 1     | 01101       |  13 |                           169 |
| 2     | 11001       |  25 |                           625 |
| 3     | 01011       |  11 |                           121 |
| 4     | 10000       |  16 |                           256 |

Total: `169+625+121+256=1171`.

Mean: `1171/4=292.75`.

Best: `625` at `x=25`, versus initial best `576` at `x=24`.

Known global optimum: `x=31`, `f(x)=961`. Absolute objective gap: `961−625=336`. The first generation **does not** reach the optimum. The stop reason is the one-generation limit.

GenX reports 12 fitness evaluations for this fixture: four initial candidates, four provisional crossover outputs and four post-mutation outputs. Display-only landscape sampling and the independent exhaustive optimum are excluded. Elite copies would reuse evaluated fitness.

## What the application checks

The Verification Lab compares **29 checkpoints**. Alongside decoded values, fitness, aggregates and chromosomes, it checks all selection probability/cumulative tables directly from recorded events, every random draw, selected indices, crossover checks and boundaries, provisional evaluations, mutation checks/positions, lineage/source maps, replacement, diversity, evaluation budget and termination. No probability table is independently recomputed from the same operator during comparison.

Initial diversity is 17/30 and final diversity 16/30, from six chromosome pairs × five genes. There are 28 random draws: four selections, two crossover checks, two cut draws and twenty mutation checks.

Run `npm run audit:verification` to write the complete machine-readable expected/actual report and normalized trace to `docs/audit-verification.json`. See [mathematical-audit.md](mathematical-audit.md) for findings and coverage.

Chromosomes and mutation positions compare exactly. Numeric vectors compare exactly or within absolute tolerance `1e−10`, accommodating floating-point cumulative summation without using rounded display probabilities for selection. The expected results remain fixed and independent.

Run `npm run test` or open `#verification` and select **Run verification**. The tests also independently verify binary decoding, roulette boundaries, all-zero selection, operator validity, exact solvers, deterministic history, elitism and odd population counts.
