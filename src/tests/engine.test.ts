import { describe, it, expect } from 'vitest';
import { SeededRandom, scripted } from '../engine/random';
import { diversity, distribution, mutate, recombine, select } from '../engine/operators';
import { Simulation, runToEnd } from '../engine/simulation';
import { hand, verify } from '../engine/verification';
import { normalizeHistory } from '../engine/history';
import {
  compatibleConfig,
  conflicts,
  decodeBinary,
  defaultConfig,
  exactKnapsack,
  exactTsp,
  makeProblem,
  tourDistance,
  validateConfig,
  validQueens,
} from '../problems';
import type { Config, Individual, ProblemId } from '../engine/types';
const individual = (fitness: number, genes = [0, 0, 0]): Individual => ({
  id: String(fitness),
  genes,
  fitness,
  objective: fitness,
  feasible: true,
  decoded: '',
  details: {},
  born: 0,
  parents: [],
  mutations: [],
  sources: [],
});
const config = (patch: Partial<Config> = {}): Config =>
  compatibleConfig({
    ...defaultConfig,
    populationSize: 5,
    elitism: 1,
    maxGenerations: 3,
    earlyStopping: false,
    ...patch,
  });
describe('Mathematical representations', () => {
  it('decodes 5-bit chromosomes and x² independently', () => {
    expect(hand.initial.map((s) => decodeBinary(s.split('').map(Number)))).toEqual([13, 24, 8, 19]);
    expect(makeProblem(defaultConfig).evaluate([1, 1, 1, 1, 1]).fitness).toBe(961);
  });
  it('minimization fitness rewards lower objectives', () => {
    const p = makeProblem({ ...defaultConfig, functionPreset: 'minimum' });
    expect(p.evaluate([0, 0, 0, 1, 1]).fitness).toBe(1);
    expect(p.evaluate([0, 0, 1, 0, 0]).fitness).toBe(0.5);
  });
  it('signed function fitness remains positive', () => {
    const p = makeProblem({
      ...defaultConfig,
      functionPreset: 'sine',
      domainMin: -20,
      domainMax: 20,
    });
    for (let n = 0; n < 32; n++)
      expect(
        p.evaluate(n.toString(2).padStart(5, '0').split('').map(Number)).fitness,
      ).toBeGreaterThan(0);
  });
});
describe('Selection', () => {
  const pop = [individual(0), individual(1), individual(3)];
  it('uses half-open roulette intervals including exact boundaries', () => {
    expect(select(pop, 'roulette', 2, scripted([0])).index).toBe(1);
    expect(select(pop, 'roulette', 2, scripted([0.25])).index).toBe(2);
    expect(select(pop, 'roulette', 2, scripted([0.99999])).index).toBe(2);
  });
  it('uses uniform fallback at zero total fitness', () => {
    expect(distribution([individual(0), individual(0)]).probabilities).toEqual([0.5, 0.5]);
    expect(select([individual(0), individual(0)], 'roulette', 2, scripted([0.5])).index).toBe(1);
  });
  it('selects tournament maximum, sampling with replacement', () =>
    expect(select(pop, 'tournament', 3, scripted([0, 0.4, 0.9])).index).toBe(2));
  it('weights ranks and shares tied ranks', () => {
    expect(distribution(pop, 'rank').probabilities).toEqual([1 / 6, 2 / 6, 3 / 6]);
    expect(distribution([individual(3), individual(3)], 'rank').probabilities).toEqual([0.5, 0.5]);
    expect(select(pop, 'rank', 2, scripted([0.9])).index).toBe(2);
  });
});
describe('Crossover', () => {
  const a = [0, 0, 0, 0, 0],
    b = [1, 1, 1, 1, 1];
  it('single-point crossover after the third bit', () =>
    expect(recombine(a, b, 'single', scripted([]), [3]).children).toEqual([
      [0, 0, 0, 1, 1],
      [1, 1, 1, 0, 0],
    ]));
  it('two-point crossover exchanges the selected segment', () =>
    expect(recombine(a, b, 'two', scripted([]), [1, 4]).children[0]).toEqual([0, 1, 1, 1, 0]));
  it('uniform crossover records actual inheritance', () => {
    const c = recombine(a, b, 'uniform', scripted([0, 0.9, 0, 0.9, 0]));
    expect(c.children[0]).toEqual([0, 1, 0, 1, 0]);
    expect(c.sources[0]).toEqual([0, 1, 0, 1, 0]);
  });
  it('OX retains the segment and fills in cyclic order', () => {
    const c = recombine([0, 1, 2, 3, 4], [4, 3, 2, 1, 0], 'order', scripted([]), [1, 3]);
    expect(c.children[0]).toEqual([3, 1, 2, 0, 4]);
    expect(new Set(c.children[1]).size).toBe(5);
  });
});
describe('Mutation and metrics', () => {
  it('bit mutation handles 0 and 1 and never modifies inputs', () => {
    const input = [0, 1, 0];
    expect(mutate(input, 'bit', 0, scripted([0, 0, 0])).genes).toEqual(input);
    expect(mutate(input, 'bit', 1, scripted([0.9, 0.9, 0.9])).genes).toEqual([1, 0, 1]);
    expect(input).toEqual([0, 1, 0]);
  });
  it('swap mutation preserves permutations', () =>
    expect(mutate([0, 1, 2, 3], 'swap', 1, scripted([0, 0, 0.99])).genes).toEqual([3, 1, 2, 0]));
  it('inversion mutation reverses the inclusive interval', () =>
    expect(mutate([0, 1, 2, 3], 'inversion', 1, scripted([0, 0, 0.99])).genes).toEqual([
      3, 2, 1, 0,
    ]));
  it('mutation records only changed positions and tracks moved origins', () => {
    const m = mutate([0, 1, 2, 3, 4], 'inversion', 1, scripted([0, 0, 0.99]));
    expect(m.positions).toEqual([0, 1, 3, 4]);
    expect(m.origins).toEqual([4, 3, 2, 1, 0]);
  });
  it('character mutation changes selected characters', () =>
    expect(mutate(['A'], 'character', 1, scripted([0, 0]), ['A', 'B']).genes).toEqual(['B']));
  it('computes exact pairwise normalized Hamming diversity', () => {
    expect(diversity([individual(0, [0, 0]), individual(0, [1, 1])])).toBe(1);
    expect(diversity([individual(0), individual(0)])).toBe(0);
    expect(diversity([individual(0, [0]), individual(0, [0]), individual(0, [1])])).toBeCloseTo(
      2 / 3,
    );
  });
});
describe('Generation state machine', () => {
  it('normalizes shared histories without losing any genome version or recorded decision', () => {
    const events = runToEnd(config({ mutationRate: 1 }));
    const normalized = normalizeHistory(events);
    expect(normalized.populations).toHaveLength(4);
    const restored = normalized.events.map((e) => ({
      ...e,
      population: normalized.populations[e.population].map((i) => normalized.individuals[i]),
      inputs: e.inputs.map((i) => normalized.individuals[i]),
      outputs: e.outputs.map((i) => normalized.individuals[i]),
      bestEver: normalized.individuals[e.bestEver],
      bestFeasible: e.bestFeasible === null ? null : normalized.individuals[e.bestFeasible],
    }));
    expect(restored).toEqual(events);
    expect(JSON.stringify(normalized).length).toBeLessThan(JSON.stringify(events).length / 2);
  });
  it('reproduces all random decisions from the same seed', () => {
    expect(runToEnd(config())).toEqual(runToEnd(config()));
    expect(runToEnd(config({ seed: 43 }))).not.toEqual(runToEnd(config()));
  });
  it('has deterministic history restoration independent of playback timing', () => {
    const producer = new Simulation(config()).run(),
      history = [];
    for (let i = 0; i < 10; i++) history.push(producer.next().value);
    const saved = JSON.stringify(history);
    let cursor = 8;
    cursor--;
    cursor++;
    expect(history[cursor]).toEqual(history[8]);
    expect(JSON.stringify(history)).toBe(saved);
    const remainder = [...producer];
    expect([...history, ...remainder]).toEqual(runToEnd(config()));
  });
  it('preserves exact odd population counts and independent elite copies', () => {
    const events = runToEnd(config({ mutationRate: 1 }));
    for (const event of events) expect(event.population).toHaveLength(5);
    const elite = events.find((e) => e.stage === 'elites')!;
    expect(elite.outputs[0].genes).toEqual(elite.inputs[0].genes);
    expect(elite.outputs[0].genes).not.toBe(elite.inputs[0].genes);
    expect(events.at(-1)!.stats.bestEver).toBeGreaterThanOrEqual(events[0].stats.best);
  });
  it('terminates at generation limit', () =>
    expect(runToEnd(config()).at(-1)?.reason).toBe('Maximum generations reached'));
  it('counts real fitness evaluations including provisional chromosomes; elites reuse fitness', () => {
    const events = runToEnd(config());
    expect(events.at(-1)?.stats.evaluations).toBe(5 + 3 * 8);
  });
  it('early stops at exact solution', () => {
    const c = config({ earlyStopping: true });
    expect(
      [...new Simulation(c).run(Array.from({ length: 5 }, () => [1, 1, 1, 1, 1]))].at(-1)?.reason,
    ).toBe('Known discrete optimum reached');
  });
  it('stops after stagnation without claiming optimality', () => {
    const c = config({ earlyStopping: true, stagnation: 1, crossoverRate: 0, mutationRate: 0 });
    expect(
      [...new Simulation(c).run(Array.from({ length: 5 }, () => [0, 0, 0, 0, 0]))].at(-1)?.reason,
    ).toBe('Stagnation limit reached');
  });
  it('handles crossover probability 0 and 1', () => {
    const no = runToEnd(config({ crossoverRate: 0 })).filter((e) => e.stage === 'crossover');
    expect(no.every((e) => e.message.includes('skipped'))).toBe(true);
    expect(
      runToEnd(config({ crossoverRate: 1 }))
        .filter((e) => e.stage === 'crossover')
        .every((e) => !e.message.includes('skipped')),
    ).toBe(true);
  });
  it.each(['function', 'tsp', 'knapsack', 'queens', 'phrase'] as ProblemId[])(
    'preserves chromosome validity for %s',
    (problem) => {
      const c = config({ problem });
      const p = makeProblem(c);
      for (const e of runToEnd(c)) expect(e.population.every((i) => p.valid(i.genes))).toBe(true);
    },
  );
  it('validates structural inputs and history bounds', () => {
    expect(() => validateConfig({ ...defaultConfig, populationSize: 3 })).toThrow();
    expect(() => validateConfig({ ...defaultConfig, problem: 'tsp' })).toThrow();
    expect(() =>
      validateConfig({ ...defaultConfig, maxGenerations: 200, populationSize: 100 }),
    ).toThrow();
    expect(() => validateConfig({ ...defaultConfig, seed: NaN })).toThrow();
  });
  it('seeded random values remain in [0,1)', () => {
    const rng = new SeededRandom(42);
    for (let i = 0; i < 1000; i++) {
      const r = rng.next();
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(1);
    }
  });
});
describe('Independent exact solvers and verification', () => {
  it('matches every prescribed hand-calculated checkpoint', () => {
    const result = verify();
    expect(result.checks.filter((c) => !c.passed)).toEqual([]);
    expect(result.passed).toBe(true);
    expect(result.events.at(-1)?.stats.best).toBe(625);
  });
  it('solves a square tour of perimeter four', () => {
    const cities = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    const exact = exactTsp(cities)!;
    expect(exact.objective).toBe(4);
    expect(tourDistance(exact.genes, cities)).toBe(4);
    expect(exactTsp(Array(11).fill({ x: 0, y: 0 }))).toBeNull();
  });
  it('matches exhaustive enumeration on the editable knapsack instance', () => {
    const { items, capacity } = defaultConfig;
    let max = 0;
    for (let bits = 0; bits < 2 ** items.length; bits++) {
      let weight = 0,
        value = 0;
      items.forEach((item, i) => {
        if (bits & (1 << i)) {
          weight += item.weight;
          value += item.value;
        }
      });
      if (weight <= capacity) max = Math.max(max, value);
    }
    expect(exactKnapsack(items, capacity).objective).toBe(max);
    expect(
      makeProblem({ ...defaultConfig, problem: 'knapsack' }).evaluate(Array(items.length).fill(1))
        .fitness,
    ).toBe(0);
  });
  it('checks N-Queens independently of fitness', () => {
    expect(validQueens([1, 3, 0, 2])).toBe(true);
    expect(conflicts([1, 3, 0, 2])).toBe(0);
    expect(validQueens([0, 1, 2, 3])).toBe(false);
    expect(validQueens([1, 1, 1, 1])).toBe(false);
  });
  it('includes every target Unicode character', () => {
    const p = makeProblem({ ...defaultConfig, problem: 'phrase', target: 'नमस्ते 🧬' });
    expect(p.valid(Array.from('नमस्ते 🧬'))).toBe(true);
    expect(p.evaluate(Array.from('नमस्ते 🧬')).fitness).toBe(Array.from('नमस्ते 🧬').length);
  });
});
