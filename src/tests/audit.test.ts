import { describe, it, expect } from 'vitest';
import { Simulation, runToEnd } from '../engine/simulation';
import { historyStats } from '../engine/history';
import { mutate, recombine, select, distribution } from '../engine/operators';
import { scripted } from '../engine/random';
import {
  compatibleConfig,
  defaultConfig,
  makeProblem,
  validQueens,
  decodeBinary,
  tourDistance,
  conflicts,
  exactTsp,
} from '../problems';
import type { Config, Individual } from '../engine/types';
const cfg = (patch: Partial<Config> = {}) =>
  compatibleConfig({
    ...defaultConfig,
    populationSize: 4,
    elitism: 0,
    tournamentSize: 2,
    maxGenerations: 3,
    earlyStopping: false,
    ...patch,
  });
const member = (fitness: number): Individual => ({
  id: String(fitness),
  fitness,
  objective: fitness,
  genes: [0],
  born: 0,
  parents: [],
  sources: [],
  mutations: [],
  feasible: true,
  decoded: '',
  details: {},
});
describe('Audit regressions', () => {
  it('rejects sparse populations, genomes and invalid permutation helpers', () => {
    expect(() => distribution(Array(2))).toThrow();
    expect(() => recombine(Array(3), Array(3), 'order', scripted([]), [0, 2])).toThrow();
    expect(() => mutate(Array(3), 'bit', 1, scripted([0, 0, 0]))).toThrow();
    const incompleteAlphabet = Array<string>(2);
    incompleteAlphabet[0] = 'A';
    expect(() => mutate(['A'], 'character', 1, scripted([0, 0]), incompleteAlphabet)).toThrow();
    expect(() => [...new Simulation(cfg()).run(Array(4))]).toThrow('Initial population');
    expect(() => tourDistance([0, 0, 2], defaultConfig.cities.slice(0, 3))).toThrow();
    expect(() => conflicts([0, 0, 0, 0])).toThrow();
    expect(() =>
      exactTsp([
        { x: 1e308, y: 0 },
        { x: -1e308, y: 0 },
        { x: 0, y: 1e308 },
      ]),
    ).toThrow();
  });
  it('requires character genes to be strings, even for digit targets', () =>
    expect(makeProblem(cfg({ problem: 'phrase', target: '1' })).valid([1])).toBe(false));
  it('rejects empty and string-valued boards in the independent queen checker', () => {
    expect(validQueens([])).toBe(false);
    expect(validQueens(['1', '3', '0', '2'])).toBe(false);
  });
  it('does not call a tiny but suboptimal objective globally optimal', () => {
    const events = [
      ...new Simulation(
        cfg({
          domainMax: 1e-6,
          earlyStopping: true,
          stagnation: 1,
          crossoverRate: 0,
          mutationRate: 0,
        }),
      ).run(Array.from({ length: 4 }, () => [0, 0, 0, 0, 0])),
    ];
    expect(events.at(-1)?.generation).toBe(1);
    expect(events.at(-1)?.reason).toBe('Stagnation limit reached');
  });
  it('solves the exact objective independently of rounded selection fitness', () => {
    const p = makeProblem(cfg({ functionPreset: 'minimum', domainMin: 3 - 1e-8, domainMax: 3 }));
    expect(p.optimum()?.objective).toBe(0);
  });
  it('recognizes a feasible zero-value knapsack optimum despite infeasible fitness ties', () => {
    const c = cfg({
      problem: 'knapsack',
      capacity: 1,
      earlyStopping: true,
      items: [
        { name: 'A', weight: 2, value: 7 },
        { name: 'B', weight: 3, value: 9 },
      ],
    });
    const events = [
      ...new Simulation(c).run([
        [1, 1],
        [0, 0],
        [1, 0],
        [0, 1],
      ]),
    ];
    expect(events.at(-1)?.generation).toBe(0);
    expect(events.at(-1)?.reason).toBe('Known discrete optimum reached');
    expect(events.at(-1)?.bestEver.feasible).toBe(true);
  });
  it('keeps generation zero at its actual initialization evaluation budget', () => {
    const events = runToEnd(cfg());
    expect(historyStats(events)[0].evaluations).toBe(4);
  });
  it('reports actual with-replacement tournament winner probabilities', () => {
    const result = select([member(0), member(1), member(3)], 'tournament', 2, scripted([0, 0.9]));
    expect(result.probabilities[0]).toBeCloseTo(1 / 9);
    expect(result.probabilities[1]).toBeCloseTo(3 / 9);
    expect(result.probabilities[2]).toBeCloseTo(5 / 9);
  });
  it('uniform crossover operates on a one-character chromosome', () =>
    expect(recombine(['A'], ['B'], 'uniform', scripted([0.9])).children).toEqual([['B'], ['A']]));
  it('rejects OX parents with incompatible allele sets', () =>
    expect(() => recombine([0, 1, 2], [1, 2, 3], 'order', scripted([]), [0, 2])).toThrow());
  it('rejects empty selection populations and invalid random samples', () => {
    expect(() => distribution([])).toThrow();
    expect(() => select([member(1)], 'roulette', 2, scripted([1]))).toThrow();
  });
  it('counts only actual changes when equal alleles are swapped', () =>
    expect(mutate([1, 1], 'swap', 1, scripted([0, 0, 0.9])).positions).toEqual([]));
  it('rejects nonbinary data instead of silently coercing it', () =>
    expect(() => decodeBinary([1, '1', 0])).toThrow());
  it('protects recorded chromosomes and config from external modification', () => {
    const simulation = new Simulation(cfg());
    const first = simulation.run().next().value!;
    expect(() => {
      first.population[0].genes[0] = 7;
    }).toThrow();
    expect(() => {
      simulation.config.mutationRate = 1;
    }).toThrow();
  });
});
