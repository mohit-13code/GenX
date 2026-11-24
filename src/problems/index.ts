import type { Config, Evaluation, Gene, Genome, Problem } from '../engine/types';
import { int, shuffled } from '../engine/random';
export const problemMeta = [
  {
    id: 'function',
    name: 'Function optimization',
    short: 'Find the peak',
    description: 'Watch binary chromosomes climb a mathematical landscape.',
    symbol: 'ƒ(x)',
  },
  {
    id: 'tsp',
    name: 'Travelling Salesman',
    short: 'Connect the dots',
    description: 'Evolve the shortest closed route through a set of cities.',
    symbol: '⌁',
  },
  {
    id: 'knapsack',
    name: '0/1 Knapsack',
    short: 'Make every gram count',
    description: 'Balance value and weight under a strict capacity constraint.',
    symbol: '▣',
  },
  {
    id: 'queens',
    name: 'N-Queens',
    short: 'Find the balance',
    description: 'Arrange queens so that no two attack each other.',
    symbol: '♛',
  },
  {
    id: 'phrase',
    name: 'Evolve a Phrase',
    short: 'Make a match',
    description: 'Discover how a population learns to spell your target.',
    symbol: 'Aa',
  },
] as const;
export const defaultConfig: Config = {
  problem: 'function',
  populationSize: 20,
  maxGenerations: 100,
  crossoverRate: 0.8,
  mutationRate: 0.05,
  selection: 'tournament',
  crossover: 'single',
  mutation: 'bit',
  elitism: 2,
  tournamentSize: 3,
  seed: 42,
  earlyStopping: true,
  stagnation: 30,
  functionPreset: 'square',
  bits: 5,
  domainMin: 0,
  domainMax: 31,
  cities: [
    { x: 90, y: 80 },
    { x: 240, y: 40 },
    { x: 410, y: 75 },
    { x: 490, y: 220 },
    { x: 390, y: 320 },
    { x: 210, y: 290 },
    { x: 55, y: 220 },
    { x: 270, y: 160 },
  ],
  items: [
    { name: 'Camera', weight: 4, value: 12 },
    { name: 'Water', weight: 3, value: 8 },
    { name: 'Tent', weight: 7, value: 18 },
    { name: 'Map', weight: 1, value: 5 },
    { name: 'Food', weight: 5, value: 14 },
    { name: 'Jacket', weight: 4, value: 9 },
  ],
  capacity: 15,
  queens: 8,
  target: 'HELLO GENX',
};
export const decodeBinary = (genes: Genome) => {
  if (!genes.length || genes.length > 53 || Array.from(genes).some((g) => g !== 0 && g !== 1))
    throw new Error('Expected 1–53 numeric binary genes.');
  return genes.reduce<number>((value, gene) => value * 2 + Number(gene), 0);
};
export function functionValue(x: number, preset: Config['functionPreset']) {
  switch (preset) {
    case 'minimum':
      return (x - 3) ** 2;
    case 'sine':
      return x * Math.sin(x);
    case 'multimodal':
      return Math.sin(3 * x) + 0.4 * Math.cos(7 * x) + 2;
    default:
      return x * x;
  }
}
export function decodeX(genes: Genome, c: Config) {
  if (genes.length !== c.bits)
    throw new Error('Binary chromosome length must match the configured precision.');
  return c.domainMin + (decodeBinary(genes) / (2 ** c.bits - 1)) * (c.domainMax - c.domainMin);
}
export function tourDistance(genes: Genome, cities: Config['cities']) {
  assertPermutation(genes, cities.length);
  if (
    cities.length < 3 ||
    Array.from(cities).some((p) => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y))
  )
    throw new Error('Tour requires at least three finite coordinate pairs.');
  const distance = genes.reduce<number>((sum, gene, i) => {
    const a = cities[Number(gene)],
      b = cities[Number(genes[(i + 1) % genes.length])];
    return sum + Math.hypot(a.x - b.x, a.y - b.y);
  }, 0);
  if (!Number.isFinite(distance)) throw new Error('Tour distance exceeds finite numeric range.');
  return distance;
}
export function conflicts(genes: Genome) {
  assertPermutation(genes, genes.length);
  let total = 0;
  for (let a = 0; a < genes.length; a++)
    for (let b = a + 1; b < genes.length; b++)
      if (Math.abs(Number(genes[a]) - Number(genes[b])) === b - a) total++;
  return total;
}
function assertPermutation(genes: Genome, length: number) {
  if (
    !length ||
    genes.length !== length ||
    new Set(genes).size !== length ||
    Array.from(genes).some(
      (g) => typeof g !== 'number' || !Number.isInteger(g) || g < 0 || g >= length,
    )
  )
    throw new Error('Expected a complete numeric index permutation.');
}
/** Independent checker checks rows, columns and diagonals, without the fitness function. */
export function validQueens(genes: Genome) {
  if (!genes.length) return false;
  const rows = new Set(),
    ascending = new Set(),
    descending = new Set();
  for (let col = 0; col < genes.length; col++) {
    const row = genes[col];
    if (
      typeof row !== 'number' ||
      !Number.isInteger(row) ||
      row < 0 ||
      row >= genes.length ||
      rows.has(row) ||
      ascending.has(row + col) ||
      descending.has(row - col)
    )
      return false;
    rows.add(row);
    ascending.add(row + col);
    descending.add(row - col);
  }
  return true;
}
export function exactKnapsack(items: Config['items'], capacity: number) {
  if (
    !Number.isInteger(capacity) ||
    capacity < 0 ||
    capacity > 500 ||
    items.length > 20 ||
    Array.from(items).some(
      (i) =>
        !i ||
        !Number.isInteger(i.weight) ||
        i.weight < 1 ||
        !Number.isSafeInteger(i.value) ||
        i.value < 0 ||
        i.value > 10000,
    )
  )
    throw new Error('Exact knapsack requires bounded integer inputs.');
  const dp = Array.from({ length: items.length + 1 }, () => Array<number>(capacity + 1).fill(0));
  for (let i = 1; i <= items.length; i++)
    for (let w = 0; w <= capacity; w++) {
      const item = items[i - 1];
      dp[i][w] = Math.max(
        dp[i - 1][w],
        item.weight <= w ? dp[i - 1][w - item.weight] + item.value : 0,
      );
    }
  const genes = Array<number>(items.length).fill(0);
  let w = capacity;
  for (let i = items.length; i > 0; i--)
    if (dp[i][w] !== dp[i - 1][w]) {
      genes[i - 1] = 1;
      w -= items[i - 1].weight;
    }
  return {
    objective: dp[items.length][capacity],
    genes,
    label: 'Exact integer dynamic programming',
  };
}
/** Held–Karp dynamic programming, fixed start at city 0, O(n² 2ⁿ), capped at 10. */
export function exactTsp(cities: Config['cities']) {
  const n = cities.length;
  if (n < 3 || Array.from(cities).some((p) => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y)))
    throw new Error('Exact TSP requires at least three finite coordinate pairs.');
  if (n > 10) return null;
  const size = 1 << n;
  const dp = Array.from({ length: size }, () => Array<number>(n).fill(Infinity));
  const prev = Array.from({ length: size }, () => Array<number>(n).fill(-1));
  dp[1][0] = 0;
  const d = (i: number, j: number) =>
    Math.hypot(cities[i].x - cities[j].x, cities[i].y - cities[j].y);
  for (let mask = 1; mask < size; mask += 2)
    for (let end = 0; end < n; end++)
      if (Number.isFinite(dp[mask][end]))
        for (let next = 1; next < n; next++)
          if (!(mask & (1 << next))) {
            const m = mask | (1 << next),
              v = dp[mask][end] + d(end, next);
            if (v < dp[m][next]) {
              dp[m][next] = v;
              prev[m][next] = end;
            }
          }
  let best = Infinity,
    end = -1;
  for (let j = 1; j < n; j++)
    if (dp[size - 1][j] + d(j, 0) < best) {
      best = dp[size - 1][j] + d(j, 0);
      end = j;
    }
  const genes: number[] = [];
  if (end < 0 || !Number.isFinite(best))
    throw new Error('Exact tour distance exceeds finite numeric range.');
  let mask = size - 1;
  while (end !== 0) {
    genes.push(end);
    const p = prev[mask][end];
    mask ^= 1 << end;
    end = p;
  }
  genes.push(0);
  genes.reverse();
  return { objective: best, genes, label: 'Exact Held–Karp closed-tour distance' };
}
const numeric = (v: Gene) => typeof v === 'number' && Number.isFinite(v);
export function makeProblem(c: Config): Problem {
  const meta = problemMeta.find((p) => p.id === c.problem)!;
  const permutation = c.problem === 'tsp' || c.problem === 'queens';
  const length =
    c.problem === 'function'
      ? c.bits
      : c.problem === 'tsp'
        ? c.cities.length
        : c.problem === 'knapsack'
          ? c.items.length
          : c.problem === 'queens'
            ? c.queens
            : Array.from(c.target).length;
  const alphabet = Array.from(
    new Set(
      Array.from(
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz 0123456789.,!?-:' + c.target,
      ),
    ),
  );
  const valid = (genes: Genome) =>
    Array.isArray(genes) &&
    genes.length === length &&
    length > 0 &&
    (permutation
      ? new Set(genes).size === length &&
        Array.from(genes).every(
          (g) => numeric(g) && Number.isInteger(g) && Number(g) >= 0 && Number(g) < length,
        )
      : c.problem === 'phrase'
        ? Array.from(genes).every((g) => typeof g === 'string' && alphabet.includes(g))
        : Array.from(genes).every((g) => g === 0 || g === 1));
  const evaluate = (genes: Genome): Evaluation => {
    if (!valid(genes)) throw new Error('Invalid chromosome for this problem.');
    if (c.problem === 'function') {
      const x = decodeX(genes, c),
        objective = functionValue(x, c.functionPreset);
      // Positive fitness for minimization; bounded upward shift for signed maxima.
      const fitness =
        c.functionPreset === 'minimum'
          ? 1 / (1 + objective)
          : c.functionPreset === 'sine'
            ? objective + Math.max(Math.abs(c.domainMin), Math.abs(c.domainMax)) + 1
            : objective;
      return {
        objective,
        fitness,
        feasible: true,
        decoded: `x = ${Number(x.toPrecision(12))}`,
        details: { x, binary: decodeBinary(genes) },
      };
    }
    if (c.problem === 'tsp') {
      const distance = tourDistance(genes, c.cities);
      return {
        objective: distance,
        fitness: 1 / (1 + distance),
        feasible: true,
        decoded: [...genes, genes[0]].map((g) => Number(g) + 1).join(' → '),
        details: { distance },
      };
    }
    if (c.problem === 'knapsack') {
      let weight = 0,
        value = 0;
      genes.forEach((g, i) => {
        if (g === 1) {
          weight += c.items[i].weight;
          value += c.items[i].value;
        }
      });
      return {
        objective: value,
        fitness: weight <= c.capacity ? value : 0,
        feasible: weight <= c.capacity,
        decoded:
          genes.flatMap((g, i) => (g === 1 ? [c.items[i].name] : [])).join(', ') || 'Empty bag',
        details: { weight, value, capacity: c.capacity },
      };
    }
    if (c.problem === 'queens') {
      const attacking = conflicts(genes);
      return {
        objective: attacking,
        fitness: (length * (length - 1)) / 2 - attacking,
        feasible: attacking === 0,
        decoded: genes.map((g) => Number(g) + 1).join(' · '),
        details: { conflicts: attacking, pairs: (length * (length - 1)) / 2 },
      };
    }
    const target = Array.from(c.target),
      matches = genes.filter((g, i) => g === target[i]).length;
    return {
      objective: matches,
      fitness: matches,
      feasible: true,
      decoded: genes.join(''),
      details: { matches, percentage: (100 * matches) / length },
    };
  };
  return {
    ...meta,
    representation: permutation ? 'permutation' : c.problem === 'phrase' ? 'character' : 'binary',
    length,
    alphabet,
    crossover: permutation ? ['order'] : ['single', 'two', 'uniform'],
    mutation: permutation
      ? ['swap', 'inversion']
      : c.problem === 'phrase'
        ? ['character']
        : ['bit'],
    objectiveLabel:
      c.problem === 'tsp'
        ? 'Closed-tour distance ↓'
        : c.problem === 'queens'
          ? 'Attacking pairs ↓'
          : c.functionPreset === 'minimum' && c.problem === 'function'
            ? 'Objective ↓'
            : 'Objective ↑',
    initialize: (rng) =>
      permutation
        ? shuffled(length, rng)
        : Array.from({ length }, () =>
            c.problem === 'phrase'
              ? alphabet[int(rng, alphabet.length, 'initial character')]
              : int(rng, 2, 'initial bit'),
          ),
    evaluate,
    valid,
    optimum: () => {
      if (c.problem === 'tsp') return exactTsp(c.cities);
      if (c.problem === 'knapsack') return exactKnapsack(c.items, c.capacity);
      if (c.problem === 'queens')
        return {
          objective: 0,
          genes: [],
          label: 'Zero diagonal conflicts (checked independently)',
        };
      if (c.problem === 'phrase')
        return { objective: length, genes: Array.from(c.target), label: 'Exact character match' };
      let best: Genome = [];
      let objective = c.functionPreset === 'minimum' ? Infinity : -Infinity;
      for (let i = 0; i < 2 ** c.bits; i++) {
        const genes = i.toString(2).padStart(c.bits, '0').split('').map(Number);
        const e = evaluate(genes);
        if (c.functionPreset === 'minimum' ? e.objective < objective : e.objective > objective) {
          best = genes;
          objective = e.objective;
        }
      }
      return {
        objective: evaluate(best).objective,
        genes: best,
        label: `Exact optimum on ${2 ** c.bits} encoded points (discrete)`,
      };
    },
    geneMeaning: (g, i) =>
      c.problem === 'function'
        ? `Gene ${i + 1} (left = 1): ${g} × 2^${length - 1 - i} = ${Number(g) * 2 ** (length - 1 - i)} in the encoded integer; then mapped to the domain.`
        : c.problem === 'tsp'
          ? `Stop ${i + 1}: city ${Number(g) + 1}`
          : c.problem === 'queens'
            ? `Column ${i + 1}: queen in row ${Number(g) + 1}`
            : c.problem === 'knapsack'
              ? `${c.items[i].name}: ${g === 1 ? 'included' : 'excluded'} (${c.items[i].weight} weight, ${c.items[i].value} value)`
              : `Character ${i + 1}: ${g === Array.from(c.target)[i] ? 'matches' : 'does not match'} target “${Array.from(c.target)[i]}”`,
  };
}
export function compatibleConfig(c: Config): Config {
  const p = makeProblem(c);
  return {
    ...c,
    crossover: p.crossover.includes(c.crossover) ? c.crossover : p.crossover[0],
    mutation: p.mutation.includes(c.mutation) ? c.mutation : p.mutation[0],
  };
}
export function validateConfig(value: unknown): Config {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Configuration must be a JSON object.');
  const c = { ...defaultConfig, ...value } as Config;
  const bounded = (key: keyof Config, min: number, max: number, integer = false) => {
    const n = c[key];
    if (
      typeof n !== 'number' ||
      !Number.isFinite(n) ||
      n < min ||
      n > max ||
      (integer && !Number.isInteger(n))
    )
      throw new Error(
        `${key} must be ${integer ? 'an integer' : 'a number'} from ${min} to ${max}.`,
      );
  };
  if (!problemMeta.some((p) => p.id === c.problem)) throw new Error('Unknown problem.');
  bounded('populationSize', 4, 100, true);
  bounded('maxGenerations', 1, 200, true);
  bounded('crossoverRate', 0, 1);
  bounded('mutationRate', 0, 1);
  bounded('elitism', 0, c.populationSize - 1, true);
  bounded('tournamentSize', 2, c.populationSize, true);
  bounded('seed', 0, 4294967295, true);
  bounded('stagnation', 1, 200, true);
  bounded('bits', 3, 10, true);
  bounded('domainMin', -100, 100);
  bounded('domainMax', -100, 100);
  bounded('queens', 4, 16, true);
  bounded('capacity', 1, 500, true);
  if (c.domainMax <= c.domainMin) throw new Error('Domain maximum must exceed minimum.');
  if (c.populationSize * c.maxGenerations > 6000)
    throw new Error(
      'History budget is 6,000 population × generation slots. Reduce population or generations.',
    );
  if (
    typeof c.earlyStopping !== 'boolean' ||
    !['square', 'minimum', 'sine', 'multimodal'].includes(c.functionPreset) ||
    !['tournament', 'roulette', 'rank'].includes(c.selection)
  )
    throw new Error('Invalid algorithm option.');
  if (
    typeof c.target !== 'string' ||
    Array.from(c.target).length < 1 ||
    Array.from(c.target).length > 40 ||
    /[\p{Cc}\p{Cs}]/u.test(c.target)
  )
    throw new Error('Target must contain 1–40 printable Unicode characters.');
  if (
    !Array.isArray(c.cities) ||
    c.cities.length < 3 ||
    c.cities.length > 20 ||
    Array.from(c.cities).some(
      (p) =>
        !p ||
        !Number.isFinite(p.x) ||
        !Number.isFinite(p.y) ||
        p.x < 10 ||
        p.x > 530 ||
        p.y < 10 ||
        p.y > 350,
    )
  )
    throw new Error('Use 3–20 cities inside the map.');
  if (
    !Array.isArray(c.items) ||
    c.items.length < 2 ||
    c.items.length > 20 ||
    Array.from(c.items).some(
      (i) =>
        !i ||
        typeof i.name !== 'string' ||
        !i.name.trim() ||
        i.name.length > 30 ||
        !Number.isInteger(i.weight) ||
        i.weight < 1 ||
        i.weight > 500 ||
        !Number.isInteger(i.value) ||
        i.value < 0 ||
        i.value > 10000,
    )
  )
    throw new Error('Use 2–20 items with names, integer weights 1–500 and values 0–10000.');
  const p = makeProblem(c);
  if (!p.crossover.includes(c.crossover) || !p.mutation.includes(c.mutation))
    throw new Error('Genetic operators are incompatible with this representation.');
  return c;
}
