import { defaultConfig } from '../problems';
import { immutable } from './immutability';
import { Simulation } from './simulation';
import type { Genome, RandomSource } from './types';
export const hand = immutable({
  initial: ['01101', '11000', '01000', '10011'],
  decimal: [13, 24, 8, 19],
  fitness: [169, 576, 64, 361],
  probabilities: [169 / 1170, 576 / 1170, 64 / 1170, 361 / 1170],
  selected: ['01101', '11000', '01000', '10011'],
  crossed: ['01100', '11001', '01011', '10000'],
  final: ['01101', '11001', '01011', '10000'],
  finalFitness: [169, 625, 121, 256],
  total: 1171,
  average: 292.75,
  best: 625,
});
/** Independent fixture supplies decisions by meaning, not by consuming seed-dependent initialization. */
export function verify() {
  let selections = 0,
    mutationDraw = 0;
  const rng: RandomSource = {
    next: (label) => {
      if (label === 'selection sample') return [0.1, 0.4, 0.68, 0.9][selections++];
      if (label === 'crossover probability check') return 0;
      if (label === 'crossover cut') return 0.5; // 1 + floor(0.5 × 4) = 3
      if (label?.startsWith('mutation gene')) return ++mutationDraw === 5 ? 0.05 : 0.9;
      throw new Error(`Unexpected fixture draw: ${label}`);
    },
  };
  const config = {
    ...defaultConfig,
    populationSize: 4,
    maxGenerations: 1,
    selection: 'roulette' as const,
    crossoverRate: 1,
    mutationRate: 0.1,
    elitism: 0,
    earlyStopping: false,
  };
  const initial: Genome[] = hand.initial.map((s) => s.split('').map(Number));
  const events = [...new Simulation(config, rng).run(initial)];
  const first = events[0],
    last = events.at(-1)!;
  const selectionsRecorded = events.filter((e) => e.stage === 'select');
  const crosses = events.filter((e) => e.stage === 'crossover');
  const mutations = events.filter((e) => e.stage === 'mutate');
  const d = {
    probabilities: selectionsRecorded[0].probabilities!,
    cumulative: selectionsRecorded[0].cumulative!,
  };
  const checks = [
    {
      name: 'Binary decoding',
      expected: hand.decimal,
      actual: first.population.map((i) => i.details.x),
    },
    {
      name: 'Initial fitness',
      expected: hand.fitness,
      actual: first.population.map((i) => i.fitness),
    },
    {
      name: 'Initial total / average / best',
      expected: [1170, 292.5, 576],
      actual: [
        first.population.reduce((a, b) => a + b.fitness, 0),
        first.stats.average,
        first.stats.best,
      ],
    },
    { name: 'Roulette probabilities', expected: hand.probabilities, actual: d.probabilities },
    {
      name: 'Cumulative intervals',
      expected: [169 / 1170, 745 / 1170, 809 / 1170, 1],
      actual: d.cumulative,
    },
    {
      name: 'Selected parents',
      expected: hand.selected,
      actual: events.filter((e) => e.stage === 'select').map((e) => e.inputs[0].genes.join('')),
    },
    {
      name: 'Crossover at third bit',
      expected: hand.crossed,
      actual: events
        .filter((e) => e.stage === 'crossover')
        .flatMap((e) => e.outputs.map((i) => i.genes.join(''))),
    },
    {
      name: 'Final chromosomes',
      expected: hand.final,
      actual: last.population.map((i) => i.genes.join('')),
    },
    {
      name: 'Mutated positions (1-based)',
      expected: [[5], [], [], []],
      actual: events
        .filter((e) => e.stage === 'mutate')
        .flatMap((e) => e.outputs.map((i) => i.mutations.map((position) => position + 1))),
    },
    {
      name: 'Final fitness',
      expected: hand.finalFitness,
      actual: last.population.map((i) => i.fitness),
    },
    {
      name: 'Final total / average / best',
      expected: [1171, 292.75, 625],
      actual: [
        last.population.reduce((a, b) => a + b.fitness, 0),
        last.stats.average,
        last.stats.best,
      ],
    },
    {
      name: 'Selection samples',
      expected: [0.1, 0.4, 0.68, 0.9],
      actual: selectionsRecorded.flatMap((e) => e.random.map((r) => r.value)),
    },
    {
      name: 'Selected population indices',
      expected: [0, 1, 2, 3],
      actual: selectionsRecorded.flatMap((e) => e.selected),
    },
    {
      name: 'Every recorded probability table',
      expected: Array.from({ length: 4 }, () => hand.probabilities),
      actual: selectionsRecorded.map((e) => e.probabilities),
    },
    {
      name: 'Every recorded cumulative table',
      expected: Array.from({ length: 4 }, () => [169 / 1170, 745 / 1170, 809 / 1170, 1]),
      actual: selectionsRecorded.map((e) => e.cumulative),
    },
    {
      name: 'Crossover checks and cut draws',
      expected: [
        [0, 0.5],
        [0, 0.5],
      ],
      actual: crosses.map((e) => e.random.map((r) => r.value)),
    },
    {
      name: 'Crossover boundaries and application',
      expected: [
        [3, true],
        [3, true],
      ],
      actual: crosses.map((e) => [e.points[0], e.operatorApplied]),
    },
    {
      name: 'Crossover decoded integers',
      expected: [12, 25, 11, 16],
      actual: crosses.flatMap((e) => e.outputs.map((i) => i.details.binary)),
    },
    {
      name: 'Crossover fitness',
      expected: [144, 625, 121, 256],
      actual: crosses.flatMap((e) => e.outputs.map((i) => i.fitness)),
    },
    {
      name: 'Every mutation sample',
      expected: Array.from({ length: 20 }, (_, i) => (i === 4 ? 0.05 : 0.9)),
      actual: mutations.flatMap((e) => e.random.map((r) => r.value)),
    },
    {
      name: 'Mutation checks passed per child',
      expected: [1, 0, 0, 0],
      actual: mutations.flatMap((e) => e.mutationChecksPassed!),
    },
    {
      name: 'Final decoded integers',
      expected: [13, 25, 11, 16],
      actual: last.population.map((i) => i.details.binary),
    },
    {
      name: 'Crossover parent lineage',
      expected: [
        ['g0-001', 'g0-002'],
        ['g0-001', 'g0-002'],
        ['g0-003', 'g0-004'],
        ['g0-003', 'g0-004'],
      ],
      actual: crosses.flatMap((e) => e.outputs.map((i) => i.parents)),
    },
    {
      name: 'Inherited parent per locus',
      expected: [
        [0, 0, 0, 1, 1],
        [1, 1, 1, 0, 0],
        [0, 0, 0, 1, 1],
        [1, 1, 1, 0, 0],
      ],
      actual: last.population.map((i) => i.sources),
    },
    {
      name: 'Independent initial/final Hamming diversity',
      expected: [17 / 30, 16 / 30],
      actual: [first.stats.diversity, last.stats.diversity],
    },
    {
      name: 'Population, generation and elitism',
      expected: [4, 1, 0],
      actual: [
        last.population.length,
        last.generation,
        events.find((e) => e.stage === 'elites')!.outputs.length,
      ],
    },
    {
      name: 'Fitness evaluations and random draws',
      expected: [12, 28],
      actual: [last.stats.evaluations, events.reduce((n, e) => n + e.random.length, 0)],
    },
    {
      name: 'Replacement fitness is the recorded mutation result',
      expected: hand.finalFitness,
      actual: events.find((e) => e.stage === 'replace')!.outputs.map((i) => i.fitness),
    },
    {
      name: 'Termination and target status',
      expected: ['Maximum generations reached', false],
      actual: [last.reason, last.stats.targetReached],
    },
  ].map((check) => ({
    ...check,
    passed: same(check.actual, check.expected),
  }));
  return { checks, events, config, passed: checks.every((c) => c.passed) };
}
function same(a: unknown, b: unknown): boolean {
  if (typeof a === 'number' && typeof b === 'number')
    return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 1e-10;
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((v, i) => same(v, b[i]));
  return a === b;
}
