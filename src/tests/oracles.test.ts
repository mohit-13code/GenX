import { describe, it, expect } from 'vitest';
import { SeededRandom, scripted, int, shuffled } from '../engine/random';
import { recombine, mutate, distribution, select, diversity } from '../engine/operators';
import { Simulation, runToEnd } from '../engine/simulation';
import { historyStats } from '../engine/history';
import { bestIndividual, optimalityGap, reachedOptimum } from '../engine/metrics';
import {
  defaultConfig,
  compatibleConfig,
  decodeBinary,
  decodeX,
  functionValue,
  makeProblem,
  conflicts,
  validQueens,
  exactTsp,
  exactKnapsack,
  validateConfig,
} from '../problems';
import type { Config, Individual, Genome, ProblemId } from '../engine/types';
const cfg = (patch: Partial<Config> = {}) =>
  compatibleConfig({
    ...defaultConfig,
    populationSize: 5,
    elitism: 1,
    tournamentSize: 2,
    maxGenerations: 3,
    earlyStopping: false,
    ...patch,
  });
const member = (fitness: number): Individual => ({
  fitness,
  objective: fitness,
  id: 'fixture',
  genes: [0],
  parents: [],
  mutations: [],
  sources: [],
  born: 0,
  decoded: '',
  details: {},
  feasible: true,
});
const bits = (n: number, l: number) => n.toString(2).padStart(l, '0').split('').map(Number);
function permutations<T>(a: T[]): T[][] {
  return a.length
    ? a.flatMap((v, i) => permutations(a.filter((_, j) => j !== i)).map((t) => [v, ...t]))
    : [[]];
}
// Independent OX oracle: retain the block, then zip cyclic holes with cyclic unused alleles.
function ox(a: number[], b: number[], lo: number, hi: number) {
  const result = [...a],
    order = Array.from({ length: a.length }, (_, i) => (hi + i) % a.length);
  const holes = order.filter((i) => i < lo || i >= hi),
    unused = order.map((i) => b[i]).filter((g) => !a.slice(lo, hi).includes(g));
  holes.forEach((slot, i) => {
    result[slot] = unused[i];
  });
  return result;
}
describe('Independent representation and fitness oracles', () => {
  it.each([3, 4, 5, 6, 7, 8, 9, 10])(
    'exhaustively decodes all %i-bit integers and domain endpoints',
    (l) => {
      const c = cfg({ bits: l, domainMin: -7, domainMax: 13 });
      for (let n = 0; n < 2 ** l; n++) {
        expect(decodeBinary(bits(n, l))).toBe(n);
        expect(decodeX(bits(n, l), c)).toBeCloseTo(-7 + (20 * n) / (2 ** l - 1), 12);
      }
    },
  );
  it.each(['square', 'minimum', 'sine', 'multimodal'] as const)(
    'checks every encoded %s objective, fitness and discrete optimum',
    (preset) => {
      const c = cfg({ functionPreset: preset, bits: 8, domainMin: -10, domainMax: 10 }),
        p = makeProblem(c);
      const objectives = Array.from({ length: 256 }, (_, n) => {
        const x = -10 + (20 * n) / 255;
        const objective =
          preset === 'square'
            ? x * x
            : preset === 'minimum'
              ? (x - 3) ** 2
              : preset === 'sine'
                ? x * Math.sin(x)
                : Math.sin(3 * x) + 0.4 * Math.cos(7 * x) + 2;
        const e = p.evaluate(bits(n, 8));
        expect(e.objective).toBeCloseTo(objective, 11);
        expect(e.fitness).toBeCloseTo(
          preset === 'minimum'
            ? 1 / (1 + objective)
            : preset === 'sine'
              ? objective + 11
              : objective,
          11,
        );
        expect(e.fitness).toBeGreaterThanOrEqual(0);
        return objective;
      });
      expect(p.optimum()!.objective).toBeCloseTo(
        (preset === 'minimum' ? Math.min : Math.max)(...objectives),
        11,
      );
    },
  );
  it('distinguishes the continuous minimum from the encoded minimum', () => {
    const c = cfg({ functionPreset: 'minimum', bits: 3, domainMin: 0, domainMax: 10 }),
      p = makeProblem(c);
    expect(p.optimum()!.objective).toBeCloseTo(1 / 49, 12);
    expect(functionValue(3, 'minimum')).toBe(0);
  });
  it('checks all 24 four-queen permutations against an independent pair checker', () => {
    let solutions = 0;
    const p = makeProblem(cfg({ problem: 'queens', queens: 4 }));
    for (const genes of permutations([0, 1, 2, 3])) {
      let attacks = 0;
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < i; j++)
          if (genes[i] - i === genes[j] - j || genes[i] + i === genes[j] + j) attacks++;
      const e = p.evaluate(genes);
      expect(e.objective).toBe(attacks);
      expect(e.fitness).toBe(6 - attacks);
      expect(conflicts(genes)).toBe(attacks);
      expect(validQueens(genes)).toBe(attacks === 0);
      if (!attacks) solutions++;
    }
    expect(solutions).toBe(2);
  });
  it('counts Unicode code points and rejects sparse or mixed representations', () => {
    const p = makeProblem(cfg({ problem: 'phrase', target: 'A🧬é' }));
    expect(p.length).toBe(3);
    expect(p.evaluate(['A', '🧬', 'é']).fitness).toBe(3);
    expect(p.evaluate(['A', 'é', '🧬']).fitness).toBe(1);
    for (const problem of ['function', 'tsp', 'knapsack', 'queens', 'phrase'] as ProblemId[]) {
      const q = makeProblem(cfg({ problem }));
      const sparse = Array(q.length) as Genome;
      expect(q.valid(sparse)).toBe(false);
      expect(() => q.evaluate(sparse)).toThrow();
    }
  });
});
describe('Exact reference solvers versus enumeration', () => {
  it.each([3, 4, 5, 6, 7])('compares Held–Karp with all closed tours for %i cities', (n) => {
    const rng = new SeededRandom(70 + n),
      cities = Array.from({ length: n }, () => ({ x: int(rng, 30), y: int(rng, 30) }));
    const distance = (route: number[]) =>
      route.reduce((sum, a, i) => {
        const b = route[(i + 1) % n];
        return sum + Math.sqrt((cities[a].x - cities[b].x) ** 2 + (cities[a].y - cities[b].y) ** 2);
      }, 0);
    const brute = Math.min(
        ...permutations(Array.from({ length: n - 1 }, (_, i) => i + 1)).map((t) =>
          distance([0, ...t]),
        ),
      ),
      exact = exactTsp(cities)!;
    expect(exact.objective).toBeCloseTo(brute, 11);
    expect(distance(exact.genes as number[])).toBeCloseTo(brute, 11);
    expect(new Set(exact.genes).size).toBe(n);
  });
  it('handles coincident cities and unavailable references above ten cities', () => {
    expect(exactTsp(Array.from({ length: 4 }, () => ({ x: 0, y: 0 })))!.objective).toBe(0);
    expect(exactTsp(Array.from({ length: 11 }, () => ({ x: 0, y: 0 })))).toBeNull();
    expect(() => exactTsp([])).toThrow();
  });
  it('compares knapsack DP with 53,760 explicitly enumerated subset/capacity cases', () => {
    for (let seed = 0; seed < 10; seed++) {
      const rng = new SeededRandom(seed),
        items = Array.from({ length: 8 }, (_, i) => ({
          name: String(i),
          weight: 1 + int(rng, 12),
          value: int(rng, 20),
        }));
      for (let capacity = 0; capacity <= 20; capacity++) {
        let maximum = 0;
        for (let subset = 0; subset < 256; subset++) {
          let w = 0,
            v = 0;
          items.forEach((item, i) => {
            if (subset & (1 << i)) {
              w += item.weight;
              v += item.value;
            }
          });
          if (w <= capacity) maximum = Math.max(maximum, v);
        }
        const exact = exactKnapsack(items, capacity);
        expect(exact.objective).toBe(maximum);
        expect(
          exact.genes.reduce<number>((w, g, i) => w + Number(g) * items[i].weight, 0),
        ).toBeLessThanOrEqual(capacity);
        expect(exact.genes.reduce<number>((v, g, i) => v + Number(g) * items[i].value, 0)).toBe(
          maximum,
        );
      }
    }
  });
  it('rejects malformed exact-solver inputs', () => {
    expect(() => exactKnapsack(defaultConfig.items, 1.5)).toThrow();
    expect(() => exactKnapsack([{ name: 'bad', weight: 0, value: 2 }], 3)).toThrow();
    expect(() =>
      exactTsp([
        { x: NaN, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
      ]),
    ).toThrow();
  });
});
describe('Selection probability oracles', () => {
  it.each([
    [0, 1, 3],
    [1, 1, 3],
    [0, 0, 0],
    [2, 1, 2],
  ])('enumerates every tournament draw with fitness %j', (...fitness: number[]) => {
    const pop = fitness.map(member);
    for (const k of [2, 3, 4]) {
      const wins = [0, 0, 0];
      for (let sequence = 0; sequence < 3 ** k; sequence++) {
        const indices = Array.from({ length: k }, (_, i) => Math.floor(sequence / 3 ** i) % 3);
        let winner = indices[0];
        for (const i of indices) if (fitness[i] > fitness[winner]) winner = i;
        const result = select(pop, 'tournament', k, scripted(indices.map((i) => (i + 0.25) / 3)));
        expect(result.index).toBe(winner);
        wins[winner]++;
      }
      distribution(pop, 'tournament', k).probabilities.forEach((p, i) =>
        expect(p).toBeCloseTo(wins[i] / 3 ** k, 13),
      );
    }
  });
  it('handles huge fitness without overflow and never selects trailing zero weight', () => {
    expect(distribution([member(1e308), member(1e308), member(0)]).probabilities).toEqual([
      0.5, 0.5, 0,
    ]);
    expect(
      select([member(1), member(0), member(0)], 'roulette', 2, scripted([1 - Number.EPSILON]))
        .index,
    ).toBe(0);
    for (const f of [NaN, Infinity, -Infinity]) expect(() => distribution([member(f)])).toThrow();
  });
});
describe('Exhaustive operator oracles', () => {
  it.each([3, 4, 8, 10, 16, 20])(
    'preserves %i-allele permutations across 100 independent seeds',
    (n) => {
      for (let seed = 0; seed < 100; seed++) {
        const rng = new SeededRandom(seed),
          a = shuffled(n, rng),
          b = shuffled(n, rng),
          crossed = recombine(a, b, 'order', rng);
        for (const child of crossed.children)
          for (const method of ['swap', 'inversion'] as const) {
            const m = mutate(child, method, 1, rng);
            expect([...m.genes].sort((a, b) => Number(a) - Number(b))).toEqual(
              Array.from({ length: n }, (_, i) => i),
            );
            expect(m.origins.map((i) => child[i])).toEqual(m.genes);
          }
      }
    },
  );
  it('checks 11,520 OX children and their source maps over all four-allele parent pairs and cuts', () => {
    const all = permutations([0, 1, 2, 3]);
    for (const a of all)
      for (const b of all)
        for (let lo = 0; lo < 4; lo++)
          for (let hi = lo + 1; hi <= 4; hi++) {
            const result = recombine(a, b, 'order', scripted([]), [lo, hi]);
            expect(result.children).toEqual([ox(a, b, lo, hi), ox(b, a, lo, hi)]);
            result.children.forEach((child, k) => {
              expect(new Set(child).size).toBe(4);
              child.forEach((gene, i) => {
                expect((result.sources[k][i] === 0 ? a : b).includes(Number(gene))).toBe(true);
                expect(result.sources[k][i]).toBe(i >= lo && i < hi ? k : 1 - k);
              });
            });
          }
  });
  it('checks all binary segment boundaries, uniform inheritance masks and probability equality', () => {
    const a = [0, 0, 0, 0],
      b = [1, 1, 1, 1];
    for (let cut = 1; cut < 4; cut++)
      expect(recombine(a, b, 'single', scripted([]), [cut]).children[0]).toEqual(
        a.map((_, i) => (i >= cut ? 1 : 0)),
      );
    for (let lo = 0; lo < 4; lo++)
      for (let hi = lo + 1; hi <= 4; hi++)
        expect(recombine(a, b, 'two', scripted([]), [lo, hi]).children[0]).toEqual(
          a.map((_, i) => (i >= lo && i < hi ? 1 : 0)),
        );
    for (let mask = 0; mask < 16; mask++) {
      const expected = bits(mask, 4),
        r = recombine(a, b, 'uniform', scripted(expected.map((v) => (v ? 0.5 : 0))));
      expect(r.children[0]).toEqual(expected);
      expect(r.children[1]).toEqual(expected.map((v) => 1 - v));
    }
    expect(mutate([0, 1], 'bit', 0.1, scripted([0.1, 0.099999])).genes).toEqual([0, 0]);
  });
  it('verifies per-gene mutation over all 32 Bernoulli outcomes with total probability one', () => {
    let sum = 0,
      any = 0,
      mean = 0;
    for (let mask = 0; mask < 32; mask++) {
      const desired = bits(mask, 5),
        k = desired.reduce((a, b) => a + b, 0),
        prob = 0.1 ** k * 0.9 ** (5 - k);
      const m = mutate([0, 0, 0, 0, 0], 'bit', 0.1, scripted(desired.map((v) => (v ? 0.05 : 0.9))));
      expect(m.genes).toEqual(desired);
      expect(m.positions.length).toBe(k);
      sum += prob;
      if (k) any += prob;
      mean += k * prob;
    }
    expect(sum).toBeCloseTo(1, 14);
    expect(any).toBeCloseTo(0.40951, 14);
    expect(mean).toBeCloseTo(0.5, 14);
  });
  it.each(['swap', 'inversion'] as const)(
    'checks every ordered %s position pair and origin mapping',
    (method) => {
      for (let a = 0; a < 5; a++)
        for (let b = 0; b < 5; b++)
          if (a !== b) {
            const input = [0, 1, 2, 3, 4],
              m = mutate(
                input,
                method,
                1,
                scripted([0, (a + 0.1) / 5, ((b > a ? b - 1 : b) + 0.1) / 4]),
              );
            const expected = [...input];
            if (method === 'swap') [expected[a], expected[b]] = [expected[b], expected[a]];
            else {
              const lo = Math.min(a, b),
                hi = Math.max(a, b);
              for (let i = lo; i <= hi; i++) expected[i] = input[hi + lo - i];
            }
            expect(m.genes).toEqual(expected);
            expect(m.origins).toEqual(expected);
            expect([...m.positions].sort()).toEqual(
              expected.flatMap((v, i) => (v !== input[i] ? [i] : [])),
            );
            expect(new Set(m.genes).size).toBe(5);
            const untouched = mutate(input, method, 0.5, scripted([0.5]));
            expect(untouched.genes).toEqual(input);
            expect(untouched.checksPassed).toBe(0);
          }
    },
  );
  it('chooses characters uniformly from alternatives and reports no-op single-symbol alphabets', () => {
    for (let n = 0; n < 3; n++)
      expect(
        mutate(['A'], 'character', 1, scripted([0, (n + 0.1) / 3]), ['A', 'B', 'C', '🧬']).genes,
      ).toEqual([['B', 'C', '🧬'][n]]);
    const m = mutate(['A'], 'character', 1, scripted([0]), ['A']);
    expect(m.checksPassed).toBe(1);
    expect(m.positions).toEqual([]);
  });
  it('matches Hamming diversity to a literal pairwise count for every representation', () => {
    for (const problem of ['function', 'tsp', 'knapsack', 'queens', 'phrase'] as ProblemId[]) {
      const p = makeProblem(cfg({ problem })),
        rng = new SeededRandom(1),
        pop = Array.from({ length: 7 }, () => ({ genes: p.initialize(rng) }));
      let count = 0;
      for (let i = 0; i < 7; i++)
        for (let j = i + 1; j < 7; j++)
          for (let k = 0; k < p.length; k++) if (pop[i].genes[k] !== pop[j].genes[k]) count++;
      expect(diversity(pop)).toBeCloseTo(count / (21 * p.length), 14);
    }
  });
});
describe('Seeded state, replacement and stopping invariants', () => {
  it('skips crossover at exact probability equality and at probability zero', () => {
    for (const rate of [0, 0.5]) {
      const c = cfg({
        populationSize: 4,
        elitism: 0,
        maxGenerations: 1,
        crossoverRate: rate,
        mutationRate: 0,
      });
      const events = [
        ...new Simulation(c, { next: () => rate }).run(
          Array.from({ length: 4 }, (_, i) => bits(i, 5)),
        ),
      ];
      for (const e of events.filter((e) => e.stage === 'crossover')) {
        expect(e.operatorApplied).toBe(false);
        expect(e.outputs.map((i) => i.genes)).toEqual(e.inputs.map((i) => i.genes));
      }
    }
  });
  it('matches a separately calculated integer-arithmetic Mulberry32 vector', () => {
    const expected = [
      2581720956, 1925393290, 3661312704, 2876485805, 750819978, 2261697747, 1173505300, 2683257857,
    ];
    const a = new SeededRandom(42),
      b = new SeededRandom(42);
    expect(expected.map(() => a.next() * 2 ** 32)).toEqual(expected);
    expect(expected.map((_, i) => b.next(`arbitrary label ${i}`) * 2 ** 32)).toEqual(expected);
  });
  it.each(['function', 'tsp', 'knapsack', 'queens', 'phrase'] as ProblemId[])(
    'preserves all %s invariants across 32 parameter combinations',
    (problem) => {
      for (const populationSize of [4, 5, 6, 7])
        for (const elitism of [0, populationSize - 1])
          for (const rate of [0, 1])
            for (const seed of [0, 42]) {
              const c = cfg({
                  problem,
                  populationSize,
                  elitism,
                  crossoverRate: rate,
                  mutationRate: rate,
                  seed,
                }),
                p = makeProblem(c),
                events = runToEnd(c);
              for (const e of events) {
                expect(e.population.length).toBe(populationSize);
                for (const i of [...e.population, ...e.inputs, ...e.outputs]) {
                  expect(p.valid(i.genes)).toBe(true);
                  expect(p.evaluate(i.genes)).toMatchObject({
                    fitness: i.fitness,
                    objective: i.objective,
                    feasible: i.feasible,
                  });
                }
              }
              const committed = events.filter(
                (e) => e.stage === 'initialize' || e.stage === 'replace',
              );
              committed.forEach((e, i) => {
                if (i)
                  expect(e.stats.bestEver).toBeGreaterThanOrEqual(committed[i - 1].stats.bestEver);
                expect(e.stats.best).toBe(bestIndividual(e.population, c).fitness);
              });
              const children = 2 * Math.ceil((populationSize - elitism) / 2);
              expect(events.at(-1)!.stats.evaluations).toBe(populationSize + 3 * 2 * children);
              expect(historyStats(events).map((s) => s.evaluations)).toEqual(
                [0, 1, 2, 3].map((g) => populationSize + g * 2 * children),
              );
              expect(events.at(-1)!.reason).toBe('Maximum generations reached');
              for (const e of events.filter((e) => e.stage === 'elites'))
                e.outputs.forEach((out, i) => {
                  expect(out.genes).toEqual(e.inputs[i].genes);
                  expect(out.genes).not.toBe(e.inputs[i].genes);
                  expect(out.parents).toEqual([e.inputs[i].id]);
                });
            }
    },
  );
  it('tracks the true objective when reciprocal fitness rounds to the same value', () => {
    const c = cfg({
      populationSize: 4,
      elitism: 1,
      functionPreset: 'minimum',
      domainMin: 3 - 1e-8,
      domainMax: 3,
      earlyStopping: true,
    });
    const e = [...new Simulation(c).run([bits(0, 5), bits(31, 5), bits(1, 5), bits(2, 5)])].at(-1)!;
    expect(e.bestEver.genes).toEqual(bits(31, 5));
    expect(e.stats.targetReached).toBe(true);
    expect(e.generation).toBe(0);
  });
  it('never reports an infeasible knapsack gap as an optimum', () => {
    const c = cfg({
      problem: 'knapsack',
      populationSize: 4,
      items: [
        { name: 'A', weight: 2, value: 0 },
        { name: 'B', weight: 2, value: 0 },
      ],
      capacity: 1,
    });
    const s = new Simulation(c),
      e = s
        .run([
          [1, 1],
          [1, 1],
          [1, 0],
          [0, 1],
        ])
        .next().value!;
    expect(e.bestFeasible).toBeNull();
    expect(optimalityGap(c, e, s.optimum)).toBeNull();
    expect(e.stats.targetReached).toBe(false);
  });
  it('requires actual zero conflicts and exact phrases, and uses scaled TSP roundoff only', () => {
    const qc = cfg({ problem: 'queens', queens: 4 }),
      qp = makeProblem(qc);
    const invalid = { ...member(6), objective: 0, genes: [0, 1, 2, 3] };
    expect(reachedOptimum(qc, invalid, qp.optimum())).toBe(false);
    const pc = cfg({ problem: 'phrase', target: 'ABC' }),
      pp = makeProblem(pc);
    expect(reachedOptimum(pc, { ...member(3), genes: ['A', 'B', 'X'] }, pp.optimum())).toBe(false);
    const tc = cfg({ problem: 'tsp' });
    expect(
      reachedOptimum(
        tc,
        { ...member(1), objective: 1e-12 },
        { objective: 2e-12, genes: [], label: '' },
      ),
    ).toBe(false);
  });
  it('keeps all historical object versions immutable and rejects reusing a consumed engine', () => {
    const s = new Simulation(cfg()),
      producer = s.run(),
      first = producer.next().value!,
      saved = JSON.stringify(first);
    Array.from(producer);
    expect(JSON.stringify(first)).toBe(saved);
    expect(() => {
      s.config.cities[0].x = 12;
    }).toThrow();
    expect(() => {
      first.stats.evaluations = 123;
    }).toThrow();
    expect(() => {
      first.population.push(member(2));
    }).toThrow();
    expect(() => [...s.run()]).toThrow();
  });
  it('rejects invalid PRNG samples, integer ranges, seeds and sparse config data', () => {
    for (const value of [-0.1, 1, NaN, Infinity]) {
      expect(() => int({ next: () => value }, 3)).toThrow();
      expect(() => [...new Simulation(cfg(), { next: () => value }).run()]).toThrow();
    }
    for (const n of [0, -1, 1.5, NaN]) expect(() => int(scripted([0]), n)).toThrow();
    for (const seed of [-1, 2 ** 32, 1.5]) expect(() => new SeededRandom(seed)).toThrow();
    expect(() => shuffled(-1, scripted([]))).toThrow();
    expect(() => validateConfig({ ...defaultConfig, cities: Array(3) })).toThrow();
    expect(() => validateConfig({ ...defaultConfig, items: Array(3) })).toThrow();
  });
});
