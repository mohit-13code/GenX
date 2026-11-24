import type {
  Config,
  Decision,
  Genome,
  Individual,
  Problem,
  RandomSource,
  SimulationEvent,
  Stage,
  Statistics,
} from './types';
import { SeededRandom, randomUnit } from './random';
import { immutable } from './immutability';
import { bestIndividual, compareIndividuals, reachedOptimum } from './metrics';
import { diversity, mutate, recombine, select } from './operators';
import { makeProblem, validateConfig } from '../problems';
const texNumber = (value: number) =>
  String(value).replace(
    /e([+-]?\d+)$/,
    (_, exponent: string) => `\\times 10^{${Number(exponent)}}`,
  );
export function populationStats(
  population: Individual[],
  generation: number,
  bestEver: Individual,
  evaluations: number,
  stagnant: number,
  bestFeasible: Individual | null = null,
  targetReached = false,
): Statistics {
  const fitness = population.map((p) => p.fitness);
  return {
    generation,
    best: Math.max(...fitness),
    bestEver: bestEver.fitness,
    average: fitness.reduce((a, b) => a + b, 0) / population.length,
    worst: Math.min(...fitness),
    diversity: diversity(population),
    unique: new Set(population.map((p) => JSON.stringify(p.genes))).size,
    evaluations,
    stagnant,
    objective: bestEver.objective,
    bestFeasibleObjective: bestFeasible?.objective ?? null,
    bestEverFeasible: bestEver.feasible,
    targetReached,
  };
}
/** Lazy deterministic producer. Events share immutable population arrays until replacement. */
export class Simulation {
  readonly config: Config;
  readonly problem: Problem;
  readonly optimum: ReturnType<Problem['optimum']>;
  private source: RandomSource;
  private random: Decision[] = [];
  private nextId = 0;
  private eventId = 0;
  private evaluations = 0;
  private rng: RandomSource;
  private started = false;
  constructor(config: Config, source?: RandomSource) {
    this.config = immutable(structuredClone(validateConfig(config)));
    this.problem = immutable(makeProblem(this.config));
    this.optimum = immutable(this.problem.optimum());
    this.source = source ?? new SeededRandom(config.seed);
    this.rng = {
      next: (label = 'sample') => {
        const value = randomUnit(this.source, label);
        this.random.push({ label, value });
        return value;
      },
    };
  }
  private individual(
    genes: Genome,
    born: number,
    parents: string[] = [],
    mutations: number[] = [],
    sources: number[] = [],
  ): Individual {
    this.evaluations++;
    return {
      id: `g${born}-${String(++this.nextId).padStart(3, '0')}`,
      genes: [...genes],
      born,
      parents: [...parents],
      mutations: [...mutations],
      sources: [...sources],
      ...this.problem.evaluate(genes),
    };
  }
  *run(initial?: Genome[]): Generator<SimulationEvent> {
    if (this.started)
      throw new Error('A Simulation is single-use; construct a new instance to replay its seed.');
    this.started = true;
    const c = this.config,
      p = this.problem;
    if (
      initial &&
      (initial.length !== c.populationSize || Array.from(initial).some((g) => !p.valid(g)))
    )
      throw new Error('Initial population does not match the problem or population size.');
    let population = (
      initial ?? Array.from({ length: c.populationSize }, () => p.initialize(this.rng))
    ).map((g) => this.individual(g, 0));
    let bestEver = bestIndividual(population, c),
      bestFeasible: Individual | null = null;
    for (const i of population)
      if (i.feasible && (!bestFeasible || compareIndividuals(i, bestFeasible, c) > 0))
        bestFeasible = i;
    let generation = 0,
      evaluations = population.length,
      stagnant = 0,
      stats = populationStats(
        population,
        0,
        bestEver,
        evaluations,
        stagnant,
        bestFeasible,
        reachedOptimum(c, c.problem === 'knapsack' ? bestFeasible : bestEver, this.optimum),
      );
    const event = (
      stage: Stage,
      message: string,
      technical: string,
      formula: string,
      extra: Partial<SimulationEvent> = {},
    ): SimulationEvent => {
      const random = this.random;
      this.random = [];
      return immutable({
        id: this.eventId++,
        generation,
        stage,
        population,
        inputs: [],
        outputs: [],
        random,
        selected: [],
        points: [],
        positions: [],
        message,
        technical,
        formula,
        stats,
        bestEver,
        bestFeasible,
        ...extra,
      });
    };
    yield event(
      'initialize',
      `Created ${population.length} ${p.representation} chromosomes using seed ${c.seed}.`,
      'Initialization uses a reproducible sampling stream; IDs and genes are recorded.',
      'P_0 = \\{c_1,\\ldots,c_N\\}',
    );
    yield event(
      'decode',
      `Translate each chromosome into a candidate solution. The first is ${population[0].decoded}.`,
      'Binary integers are mapped to the domain; permutations and characters decode directly.',
      c.problem === 'function'
        ? 'x = a + \\frac{z}{2^L-1}(b-a)'
        : c.problem === 'tsp'
          ? '\\pi=(c_1,\\ldots,c_n,c_1)'
          : c.problem === 'queens'
            ? 'q_j=\\text{row in column }j'
            : c.problem === 'knapsack'
              ? 'S=\\{i:c_i=1\\}'
              : 's=c_1c_2\\cdots c_L',
      { outputs: population },
    );
    const sample = population[0];
    const evaluationFormula =
      c.problem === 'function'
        ? c.functionPreset === 'square'
          ? `F(${sample.details.x})=${sample.details.x}^2=${sample.fitness}`
          : c.functionPreset === 'minimum'
            ? `F=\\frac{1}{1+(${texNumber(sample.objective)})}\\approx ${texNumber(sample.fitness)}`
            : `f(x)\\approx ${texNumber(sample.objective)},\\quad F\\approx ${texNumber(sample.fitness)}`
        : c.problem === 'tsp'
          ? `F=\\frac{1}{1+(${texNumber(sample.objective)})}\\approx ${texNumber(sample.fitness)}`
          : c.problem === 'queens'
            ? `F=\\binom{${c.queens}}{2}-${sample.objective}=${sample.fitness}`
            : c.problem === 'knapsack'
              ? `F=\\begin{cases}V&W\\le C\\\\0&W>C\\end{cases},\\quad W=${sample.details.weight},V=${sample.objective},C=${c.capacity}`
              : `F=\\sum_i[c_i=t_i]=${sample.fitness}`;
    yield event(
      'evaluate',
      `Each candidate receives an objective value and selection fitness. ${sample.id} decodes to ${sample.decoded}; objective = ${sample.objective.toPrecision(5)}, fitness = ${sample.fitness.toPrecision(5)}.`,
      `Selection maximizes fitness. ${sample.id}: ${sample.decoded}; objective ${sample.objective}; fitness ${sample.fitness}. ${c.problem === 'queens' ? 'Fitness counts nonattacking pairs; feasibility requires zero conflicts.' : c.problem === 'knapsack' ? 'Infeasible bags have zero fitness.' : c.problem === 'tsp' || (c.functionPreset === 'minimum' && c.problem === 'function') ? 'Fitness = 1 / (1 + objective).' : c.problem === 'function' && c.functionPreset === 'sine' ? 'Fitness = objective + max(|domain endpoints|) + 1.' : 'Fitness equals the objective.'}`,
      evaluationFormula,
      { outputs: population },
    );
    yield event(
      'statistics',
      `The initial population has average fitness ${stats.average.toPrecision(5)} and ${(stats.diversity * 100).toFixed(1)}% diversity.`,
      'Diversity is exact mean pairwise positional Hamming distance, normalized by chromosome length.',
      'D=\\frac{\\sum_{i<j} d_H(c_i,c_j)}{L\\binom{N}{2}}',
    );
    while (true) {
      let reason: string | undefined;
      const solved = reachedOptimum(
        c,
        c.problem === 'knapsack' ? bestFeasible : bestEver,
        this.optimum,
      );
      if (generation >= c.maxGenerations) reason = 'Maximum generations reached';
      else if (c.earlyStopping && solved) reason = 'Known discrete optimum reached';
      else if (c.earlyStopping && stagnant >= c.stagnation) reason = 'Stagnation limit reached';
      if (reason) {
        yield event(
          'stop',
          reason,
          `Stopped at generation ${generation} after ${evaluations} fitness evaluations.`,
          '\\mathrm{stop}=\\mathrm{limit}\\lor(\\mathrm{earlyStopping}\\land(\\mathrm{target}\\lor\\mathrm{stagnation}))',
          { reason },
        );
        return;
      }
      const next: Individual[] = [];
      const elites = [...population]
        .sort((a, b) => compareIndividuals(b, a, c))
        .slice(0, c.elitism);
      while (next.length < c.populationSize - c.elitism) {
        const parents: Individual[] = [];
        for (let j = 0; j < 2; j++) {
          const choice = select(population, c.selection, c.tournamentSize, this.rng);
          const parent = population[choice.index];
          parents.push(parent);
          const technical =
            c.selection === 'tournament'
              ? `Candidate indices (1-based, with replacement): ${choice.candidates.map((i) => i + 1).join(', ')}. Fitness: ${choice.candidates.map((i) => population[i].fitness).join(', ')}. Winner: ${choice.index + 1}. First sampled maximum wins ties.`
              : `r = ${choice.sample} falls in [${choice.index ? choice.cumulative[choice.index - 1] : '0'}, ${choice.cumulative[choice.index]}). ${c.selection === 'rank' ? 'Weights are average ranks (ties share ranks).' : 'Weights are nonnegative fitness; all-zero fitness falls back to uniform.'}`;
          yield event(
            'select',
            `Selected chromosome ${parent.id} as parent ${j + 1}. ${c.selection === 'tournament' ? 'It has the highest fitness among the sampled candidates.' : 'The random sample landed in its probability interval.'}`,
            technical,
            c.selection === 'tournament'
              ? 'c^*=\\arg\\max_{c\\in T}F(c)'
              : 'p_i=\\frac{w_i}{\\sum_j w_j}',
            {
              inputs: [parent],
              selected: [choice.index],
              probabilities: choice.probabilities,
              cumulative: choice.cumulative,
              selectionMethod: c.selection,
              candidateIndices: choice.candidates,
            },
          );
        }
        const crossSample = this.rng.next('crossover probability check');
        const probabilityPassed = crossSample < c.crossoverRate;
        const crossed = probabilityPassed
          ? recombine(parents[0].genes, parents[1].genes, c.crossover, this.rng)
          : {
              children: parents.map((i) => [...i.genes]),
              points: [],
              sources: parents.map((p, i) => p.genes.map(() => i)),
              performed: false,
            };
        const applied = probabilityPassed && crossed.performed;
        let children = crossed.children.map((genes, i) =>
          this.individual(
            genes,
            generation + 1,
            parents.map((p) => p.id),
            [],
            crossed.sources[i],
          ),
        );
        evaluations = this.evaluations;
        stats = { ...stats, evaluations };
        yield event(
          'crossover',
          applied
            ? `Recombined two parents with ${c.crossover} crossover.`
            : probabilityPassed
              ? 'Crossover was skipped: a one-gene chromosome has no internal cut.'
              : 'Crossover was skipped; offspring copy their parents.',
          `r = ${crossSample} ${probabilityPassed ? '<' : '≥'} p_c = ${c.crossoverRate}. Cuts are boundaries before the zero-based index; single-point cut 3 means after the third gene.`,
          'r < p_c',
          {
            inputs: parents,
            outputs: children,
            points: crossed.points,
            sources: crossed.sources,
            operatorApplied: applied,
          },
        );
        const before = children;
        const checksPassed: number[] = [];
        children = children.map((child) => {
          const result = mutate(child.genes, c.mutation, c.mutationRate, this.rng, p.alphabet);
          checksPassed.push(result.checksPassed);
          this.evaluations++;
          return {
            ...child,
            genes: result.genes,
            mutations: result.positions,
            sources: result.origins.map((i) => child.sources[i]),
            ...p.evaluate(result.genes),
          };
        });
        evaluations = this.evaluations;
        stats = { ...stats, evaluations };
        const changed = children.reduce((sum, child) => sum + child.mutations.length, 0);
        yield event(
          'mutate',
          changed
            ? `Mutation changed ${changed} gene positions across the offspring.`
            : checksPassed.some(Boolean)
              ? 'Mutation checks passed, but the operator left all allele values unchanged.'
              : 'No gene changes this time: all mutation checks failed.',
          `${c.mutation} mutation uses probability ${c.mutationRate} ${p.representation === 'permutation' ? 'once per chromosome' : 'independently per gene'}. Positions are shown using 1-based labels in the inspector.`,
          p.representation === 'permutation' ? 'r < p_m' : 'r_i < p_m',
          {
            inputs: before,
            outputs: children,
            positions: children.flatMap((i) => i.mutations),
            operatorApplied: changed > 0,
            mutationChecksPassed: checksPassed,
          },
        );
        if (children.some((child) => !p.valid(child.genes)))
          throw new Error('Operator violated chromosome validity.');
        yield event(
          'validate',
          'Offspring satisfy the chromosome representation. No repair was needed.',
          'Permutation-safe operators preserve unique city/queen indices. Knapsack feasibility is handled by fitness, not genome repair.',
          'c\\in\\mathcal{C}',
          { outputs: children },
        );
        const accepted = children.slice(0, c.populationSize - c.elitism - next.length);
        next.push(...accepted);
        yield event(
          'offspring',
          `Recorded fitness for ${accepted.length} accepted offspring. ${accepted.map((i) => `${i.id}: fitness ${i.fitness.toPrecision(5)}`).join('; ')}.`,
          `${accepted.map((i) => `${i.id}: ${i.decoded}; objective=${i.objective}; fitness=${i.fitness}`).join('. ')}. ${accepted.length < children.length ? 'One excess child is discarded to preserve an odd population size.' : 'Both offspring enter the replacement pool.'} Evaluations include pre-mutation preview outputs and all generated children.`,
          'F_{\\mathrm{child}} = F(c)',
          { outputs: accepted },
        );
      }
      const copies = elites.map((elite) => ({
        ...elite,
        id: `g${generation + 1}-${String(++this.nextId).padStart(3, '0')}`,
        genes: [...elite.genes],
        born: generation + 1,
        parents: [elite.id],
        mutations: [],
        sources: elite.genes.map(() => 0),
      }));
      yield event(
        'elites',
        `Preserved ${copies.length} elite ${copies.length === 1 ? 'chromosome' : 'chromosomes'} without mutation.`,
        'Elites receive copied gene arrays and a recorded single-parent lineage. Cached fitness is reused; elites do not add fitness evaluations.',
        'P_{t+1}=E_t\\cup O_t',
        { inputs: elites, outputs: copies },
      );
      population = [...copies, ...next];
      generation++;
      const best = bestIndividual(population, c);
      if (compareIndividuals(best, bestEver, c) > 0) {
        bestEver = best;
        stagnant = 0;
      } else stagnant++;
      for (const i of population)
        if (i.feasible && (!bestFeasible || compareIndividuals(i, bestFeasible, c) > 0))
          bestFeasible = i;
      stats = populationStats(
        population,
        generation,
        bestEver,
        evaluations,
        stagnant,
        bestFeasible,
        reachedOptimum(c, c.problem === 'knapsack' ? bestFeasible : bestEver, this.optimum),
      );
      yield event(
        'replace',
        `Generation ${generation} is ready: ${population.length} individuals, best fitness ${stats.best.toPrecision(5)}.`,
        `${c.elitism} copied elites + ${next.length} offspring. Best-ever fitness ${stats.bestEver.toPrecision(5)}; ${stagnant} generations without improvement.`,
        '\\bar F=\\frac{1}{N}\\sum_{i=1}^{N}F(c_i)',
        { outputs: population },
      );
      yield event(
        'statistics',
        `Average fitness is ${stats.average.toPrecision(5)}; ${stats.unique} unique chromosomes remain.`,
        'Diversity describes population differences, not a guarantee of global convergence.',
        'D=\\frac{\\sum_{i<j}d_H(c_i,c_j)}{L\\binom{N}{2}}',
      );
    }
  }
}
export function runToEnd(config: Config, initial?: Genome[]) {
  return [...new Simulation(config).run(initial)];
}
