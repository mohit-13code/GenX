export type Gene = number | string;
export type Genome = Gene[];
export type ProblemId = 'function' | 'tsp' | 'knapsack' | 'queens' | 'phrase';
export type Selection = 'tournament' | 'roulette' | 'rank';
export type Crossover = 'single' | 'two' | 'uniform' | 'order';
export type Mutation = 'bit' | 'character' | 'swap' | 'inversion';
export type Stage =
  | 'initialize'
  | 'decode'
  | 'evaluate'
  | 'statistics'
  | 'select'
  | 'crossover'
  | 'mutate'
  | 'validate'
  | 'offspring'
  | 'elites'
  | 'replace'
  | 'stop';
export interface City {
  x: number;
  y: number;
}
export interface Item {
  name: string;
  weight: number;
  value: number;
}
export interface Config {
  problem: ProblemId;
  populationSize: number;
  maxGenerations: number;
  crossoverRate: number;
  mutationRate: number;
  selection: Selection;
  crossover: Crossover;
  mutation: Mutation;
  elitism: number;
  tournamentSize: number;
  seed: number;
  earlyStopping: boolean;
  stagnation: number;
  functionPreset: 'square' | 'minimum' | 'sine' | 'multimodal';
  bits: number;
  domainMin: number;
  domainMax: number;
  cities: City[];
  items: Item[];
  capacity: number;
  queens: number;
  target: string;
}
export interface Evaluation {
  objective: number;
  fitness: number;
  feasible: boolean;
  decoded: string;
  details: Record<string, number>;
}
export interface Individual extends Evaluation {
  id: string;
  genes: Genome;
  born: number;
  parents: string[];
  mutations: number[];
  sources: number[];
}
export interface Statistics {
  generation: number;
  best: number;
  bestEver: number;
  average: number;
  worst: number;
  diversity: number;
  unique: number;
  evaluations: number;
  stagnant: number;
  objective: number;
  bestFeasibleObjective: number | null;
  bestEverFeasible: boolean;
  targetReached: boolean;
}
// Statistics describe committed populations; the evaluation counter also includes previews.
export interface Decision {
  label: string;
  value: number;
}
export interface SimulationEvent {
  id: number;
  generation: number;
  stage: Stage;
  population: Individual[];
  inputs: Individual[];
  outputs: Individual[];
  random: Decision[];
  selected: number[];
  points: number[];
  positions: number[];
  message: string;
  technical: string;
  formula: string;
  stats: Statistics;
  bestEver: Individual;
  bestFeasible: Individual | null;
  reason?: string;
  probabilities?: number[];
  cumulative?: number[];
  sources?: number[][];
  selectionMethod?: Selection;
  candidateIndices?: number[];
  operatorApplied?: boolean;
  mutationChecksPassed?: number[];
}
export interface RandomSource {
  next: (label?: string) => number;
}
export interface Problem {
  id: ProblemId;
  name: string;
  short: string;
  description: string;
  representation: 'binary' | 'permutation' | 'character';
  length: number;
  crossover: Crossover[];
  mutation: Mutation[];
  initialize: (rng: RandomSource) => Genome;
  evaluate: (genes: Genome) => Evaluation;
  valid: (genes: Genome) => boolean;
  optimum: () => { objective: number; genes: Genome; label: string } | null;
  geneMeaning: (gene: Gene, index: number) => string;
  alphabet?: string[];
  objectiveLabel: string;
}
export const STAGES: Stage[] = [
  'initialize',
  'decode',
  'evaluate',
  'statistics',
  'select',
  'crossover',
  'mutate',
  'validate',
  'offspring',
  'elites',
  'replace',
  'stop',
];
