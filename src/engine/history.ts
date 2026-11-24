import type { Individual, SimulationEvent, Statistics } from './types';
export function historyStats(events: SimulationEvent[], cursor = events.length - 1) {
  const map = new Map<number, Statistics>();
  for (let i = 0; i <= cursor; i++) {
    const e = events[i];
    if (e.stage === 'replace' || e.stage === 'initialize') map.set(e.stats.generation, e.stats);
  }
  return [...map.values()];
}
/** Normalize shared objects for JSON without duplicating full populations for every micro-step. */
export function normalizeHistory(events: SimulationEvent[]) {
  const individuals: Individual[] = [],
    populations: number[][] = [];
  const individualMap = new Map<Individual, number>(),
    populationMap = new Map<Individual[], number>();
  const individualIndex = (p: Individual) => {
    const existing = individualMap.get(p);
    if (existing !== undefined) return existing;
    const index = individuals.length;
    individuals.push(p);
    individualMap.set(p, index);
    return index;
  };
  const populationIndex = (p: Individual[]) => {
    const existing = populationMap.get(p);
    if (existing !== undefined) return existing;
    const index = populations.length;
    populations.push(p.map(individualIndex));
    populationMap.set(p, index);
    return index;
  };
  const trace = events.map((event) => {
    const { population, inputs, outputs, bestEver, bestFeasible, ...rest } = event;
    return {
      ...rest,
      population: populationIndex(population),
      inputs: inputs.map(individualIndex),
      outputs: outputs.map(individualIndex),
      bestEver: individualIndex(bestEver),
      bestFeasible: bestFeasible ? individualIndex(bestFeasible) : null,
    };
  });
  return { individuals, populations, events: trace };
}
