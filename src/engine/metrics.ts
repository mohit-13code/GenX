import type { Config, Individual, Problem, SimulationEvent } from './types';
import { validQueens } from '../problems';
export type Optimum = ReturnType<Problem['optimum']>;
export const minimizes = (config: Config) =>
  config.problem === 'tsp' ||
  config.problem === 'queens' ||
  (config.problem === 'function' && config.functionPreset === 'minimum');
/** Higher fitness wins. Resolve equal fitness by feasibility, then the actual objective. */
export function compareIndividuals(a: Individual, b: Individual, config: Config) {
  if (a.fitness !== b.fitness) return a.fitness - b.fitness;
  if (a.feasible !== b.feasible) return a.feasible ? 1 : -1;
  return minimizes(config) ? b.objective - a.objective : a.objective - b.objective;
}
export function bestIndividual(population: Individual[], config: Config) {
  if (!population.length) throw new Error('Cannot rank an empty population.');
  return population.reduce((best, p) => (compareIndividuals(p, best, config) > 0 ? p : best));
}
export function reachedOptimum(config: Config, candidate: Individual | null, optimum: Optimum) {
  if (!candidate || !optimum || !candidate.feasible) return false;
  if (config.problem === 'queens') return candidate.objective === 0 && validQueens(candidate.genes);
  if (config.problem === 'phrase') return candidate.genes.join('') === config.target;
  if (config.problem === 'tsp') {
    const scale = Math.max(Math.abs(candidate.objective), Math.abs(optimum.objective));
    return Math.abs(candidate.objective - optimum.objective) <= 32 * Number.EPSILON * scale;
  }
  return candidate.objective === optimum.objective;
}
export function objectiveCandidate(config: Config, event: SimulationEvent) {
  return config.problem === 'knapsack' ? event.bestFeasible : event.bestEver;
}
export function optimalityGap(config: Config, event: SimulationEvent, optimum: Optimum) {
  const candidate = objectiveCandidate(config, event);
  return candidate && optimum ? Math.abs(candidate.objective - optimum.objective) : null;
}
