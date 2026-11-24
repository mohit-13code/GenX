import type { Crossover, Genome, Individual, Mutation, RandomSource, Selection } from './types';
import { int, randomUnit } from './random';
function validPopulation(population: Pick<Individual, 'fitness'>[]) {
  if (!population.length || Array.from(population).some((p) => !p || !Number.isFinite(p.fitness)))
    throw new Error('Selection requires a nonempty population with finite fitness.');
}
export function distribution(
  population: Pick<Individual, 'fitness'>[],
  method: Selection = 'roulette',
  tournamentSize = 3,
) {
  validPopulation(population);
  if (!['roulette', 'rank', 'tournament'].includes(method))
    throw new Error('Unknown selection method.');
  let weights = population.map((p) => Math.max(0, p.fitness));
  if (method === 'tournament') {
    if (!Number.isInteger(tournamentSize) || tournamentSize < 1)
      throw new Error('Tournament size must be a positive integer.');
    weights = population.map((p) => {
      const lower = population.filter((q) => q.fitness < p.fitness).length,
        ties = population.filter((q) => q.fitness === p.fitness).length;
      return (
        (((lower + ties) / population.length) ** tournamentSize -
          (lower / population.length) ** tournamentSize) /
        ties
      );
    });
  }
  if (method === 'rank') {
    const sorted = population.map((p, i) => ({ i, f: p.fitness })).sort((a, b) => a.f - b.f);
    weights = Array(population.length).fill(0) as number[];
    for (let i = 0; i < sorted.length;) {
      let j = i;
      while (j + 1 < sorted.length && sorted[j + 1].f === sorted[i].f) j++;
      const rank = (i + j + 2) / 2;
      for (let k = i; k <= j; k++) weights[sorted[k].i] = rank;
      i = j + 1;
    }
  }
  let total = weights.reduce((a, b) => a + b, 0);
  if (!Number.isFinite(total)) {
    const max = Math.max(...weights);
    weights = weights.map((w) => w / max);
    total = weights.reduce((a, b) => a + b, 0);
  }
  const probabilities = weights.map((w) => (total === 0 ? 1 / weights.length : w / total));
  let sum = 0;
  const cumulative = probabilities.map((p) => Math.min(1, (sum += p)));
  let lastPositive = probabilities.length - 1;
  while (probabilities[lastPositive] === 0) lastPositive--;
  for (let i = lastPositive; i < cumulative.length; i++) cumulative[i] = 1;
  return { probabilities, cumulative };
}
export function select(pop: Individual[], method: Selection, size: number, rng: RandomSource) {
  validPopulation(pop);
  if (method === 'tournament') {
    if (!Number.isInteger(size) || size < 1)
      throw new Error('Tournament size must be a positive integer.');
    const candidates = Array.from({ length: size }, () =>
      int(rng, pop.length, 'tournament candidate'),
    );
    const index = candidates.reduce(
      (best, i) => (pop[i].fitness > pop[best].fitness ? i : best),
      candidates[0],
    );
    return { index, candidates, ...distribution(pop, method, size), sample: null };
  }
  const d = distribution(pop, method);
  const sample = randomUnit(rng, 'selection sample');
  const index = d.cumulative.findIndex((v) => sample < v);
  return { index: index < 0 ? pop.length - 1 : index, candidates: [], ...d, sample };
}
export function recombine(
  a: Genome,
  b: Genome,
  method: Crossover,
  rng: RandomSource,
  fixedPoints?: number[],
) {
  const n = a.length;
  if (!n || a.length !== b.length)
    throw new Error('Crossover parents must have equal, nonzero lengths.');
  if (
    [...a, ...b].some(
      (g) => typeof g !== 'string' && (typeof g !== 'number' || !Number.isFinite(g)),
    )
  )
    throw new Error('Crossover requires dense, finite gene arrays.');
  if (!['single', 'two', 'uniform', 'order'].includes(method))
    throw new Error('Unknown crossover method.');
  if (
    method === 'order' &&
    (new Set(a).size !== n || new Set(b).size !== n || a.some((g) => !b.includes(g)))
  )
    throw new Error('OX requires permutations of the same unique allele set.');
  if (fixedPoints) {
    const valid =
      method === 'single'
        ? fixedPoints.length === 1 &&
          Number.isInteger(fixedPoints[0]) &&
          fixedPoints[0] > 0 &&
          fixedPoints[0] < n
        : method === 'uniform'
          ? fixedPoints.length === 0
          : fixedPoints.length === 2 &&
            fixedPoints.every(Number.isInteger) &&
            fixedPoints[0] >= 0 &&
            fixedPoints[0] < fixedPoints[1] &&
            fixedPoints[1] <= n;
    if (!valid) throw new Error('Invalid crossover boundaries.');
  }
  let points: number[] = [];
  let sources: number[][] = [Array(n).fill(0), Array(n).fill(1)] as number[][];
  if (method === 'uniform') {
    sources = [[], []];
    const children: Genome[] = [[], []];
    for (let i = 0; i < n; i++) {
      const parent = randomUnit(rng, `inherit gene ${i + 1}`) < 0.5 ? 0 : 1;
      sources[0].push(parent);
      sources[1].push(1 - parent);
      children[0].push(parent === 0 ? a[i] : b[i]);
      children[1].push(parent === 0 ? b[i] : a[i]);
    }
    return { children, points, sources, performed: true };
  }
  if (n < 2) return { children: [[...a], [...b]], points, sources, performed: false };
  if (method === 'single') points = fixedPoints ?? [1 + int(rng, n - 1, 'crossover cut')];
  else if (fixedPoints) points = fixedPoints;
  else {
    const first = int(rng, n, 'left cut');
    let second = int(rng, n - 1, 'right cut');
    if (second >= first) second++;
    points = [Math.min(first, second), Math.max(first, second) + 1];
  }
  if (method === 'order') {
    const [start, end] = points;
    const child = (p: Genome, q: Genome, which: number) => {
      const result: Genome = Array(n).fill(-1) as Genome;
      const origin = Array(n).fill(1 - which) as number[];
      const held = new Set(p.slice(start, end));
      for (let i = start; i < end; i++) {
        result[i] = p[i];
        origin[i] = which;
      }
      let cursor = end % n;
      for (let k = 0; k < n; k++) {
        const gene = q[(end + k) % n];
        if (!held.has(gene)) {
          result[cursor] = gene;
          cursor = (cursor + 1) % n;
        }
      }
      return { result, origin };
    };
    const c = child(a, b, 0),
      d = child(b, a, 1);
    return {
      children: [c.result, d.result],
      points,
      sources: [c.origin, d.origin],
      performed: true,
    };
  }
  sources = Array.from({ length: 2 }, (_, parent) =>
    Array.from({ length: n }, (_, i) => {
      const swapped = method === 'single' ? i >= points[0] : i >= points[0] && i < points[1];
      return swapped ? 1 - parent : parent;
    }),
  );
  return {
    children: sources.map((row) => row.map((p, i) => (p === 0 ? a[i] : b[i]))),
    points,
    sources,
    performed: true,
  };
}
export function mutate(
  genes: Genome,
  method: Mutation,
  rate: number,
  rng: RandomSource,
  alphabet: string[] = [],
) {
  if (
    !genes.length ||
    Array.from(genes).some(
      (g) => typeof g !== 'string' && (typeof g !== 'number' || !Number.isFinite(g)),
    )
  )
    throw new Error('Mutation requires a nonempty, dense genome.');
  if (!Number.isFinite(rate) || rate < 0 || rate > 1)
    throw new Error('Mutation probability must be in [0,1].');
  if (!['bit', 'character', 'swap', 'inversion'].includes(method))
    throw new Error('Unknown mutation method.');
  if (method === 'bit' && genes.some((g) => g !== 0 && g !== 1))
    throw new Error('Bit mutation requires numeric binary genes.');
  if (
    method === 'character' &&
    (!alphabet.length ||
      Array.from(alphabet).some((c) => typeof c !== 'string' || Array.from(c).length !== 1) ||
      genes.some((g) => typeof g !== 'string' || !alphabet.includes(g)))
  )
    throw new Error('Character mutation requires genes from a nonempty code-point alphabet.');
  const output = [...genes];
  const positions: number[] = [];
  const origins = genes.map((_, i) => i);
  let checksPassed = 0;
  if (method === 'swap' || method === 'inversion') {
    const sample = randomUnit(rng, 'mutation chromosome check');
    if (sample < rate) checksPassed++;
    if (sample < rate && genes.length > 1) {
      const a = int(rng, genes.length, 'mutation position A');
      let b = int(rng, genes.length - 1, 'mutation position B');
      if (b >= a) b++;
      if (method === 'swap') {
        [output[a], output[b]] = [output[b], output[a]];
        [origins[a], origins[b]] = [origins[b], origins[a]];
        for (const i of [a, b]) if (output[i] !== genes[i]) positions.push(i);
      } else {
        const lo = Math.min(a, b),
          hi = Math.max(a, b);
        output.splice(lo, hi - lo + 1, ...output.slice(lo, hi + 1).reverse());
        origins.splice(lo, hi - lo + 1, ...origins.slice(lo, hi + 1).reverse());
        for (let i = lo; i <= hi; i++) if (output[i] !== genes[i]) positions.push(i);
      }
    }
  } else
    for (let i = 0; i < genes.length; i++) {
      if (randomUnit(rng, `mutation gene ${i + 1}`) < rate) {
        checksPassed++;
        if (method === 'bit') output[i] = Number(genes[i]) === 0 ? 1 : 0;
        else {
          const choices = [...new Set(alphabet)].filter((c) => c !== genes[i]);
          if (choices.length)
            output[i] = choices[int(rng, choices.length, 'replacement character')];
        }
        if (output[i] !== genes[i]) positions.push(i);
      }
    }
  return { genes: output, positions, origins, checksPassed, applied: positions.length > 0 };
}
/** Exact pairwise normalized Hamming distance, computed by per-locus frequencies. O(NL). */
export function diversity(pop: Pick<Individual, 'genes'>[]) {
  const n = pop.length,
    length = pop[0]?.genes.length ?? 0;
  if (n < 2 || !length) return 0;
  let unequal = 0;
  for (let i = 0; i < length; i++) {
    const counts = new Map<string | number, number>();
    for (const p of pop) counts.set(p.genes[i], (counts.get(p.genes[i]) ?? 0) + 1);
    let same = 0;
    for (const count of counts.values()) same += (count * (count - 1)) / 2;
    unequal += (n * (n - 1)) / 2 - same;
  }
  return unequal / ((length * n * (n - 1)) / 2);
}
