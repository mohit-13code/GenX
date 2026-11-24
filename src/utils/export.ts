import type { Config, Problem, SimulationEvent } from '../engine/types';
import { historyStats, normalizeHistory } from '../engine/history';
export function download(name: string, data: unknown) {
  const isCsv = name.endsWith('.csv');
  const text = isCsv ? String(data) : JSON.stringify(data, null, 2);
  const url = URL.createObjectURL(
    new Blob([text], { type: isCsv ? 'text/csv;charset=utf-8' : 'application/json' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportCsv(events: SimulationEvent[]) {
  const stats = historyStats(events);
  const keys = [
    'generation',
    'best',
    'bestEver',
    'average',
    'worst',
    'diversity',
    'unique',
    'evaluations',
    'stagnant',
    'objective',
    'bestFeasibleObjective',
    'bestEverFeasible',
    'targetReached',
  ] as const;
  download(
    'genx-generations.csv',
    [keys.join(','), ...stats.map((s) => keys.map((k) => s[k]).join(','))].join('\n'),
  );
}
export function exportResults(
  config: Config,
  events: SimulationEvent[],
  optimum: ReturnType<Problem['optimum']>,
) {
  const first = events[0],
    last = events.at(-1)!;
  download('genx-results.json', {
    version: 2,
    config,
    initialSolution: first.bestEver,
    finalBest: last.bestEver,
    bestFeasible: last.bestFeasible,
    history: historyStats(events),
    generations: last.generation,
    evaluations: last.stats.evaluations,
    optimum,
    absoluteOptimalityGap:
      optimum && (config.problem !== 'knapsack' || last.bestFeasible)
        ? Math.abs(
            (config.problem === 'knapsack' ? last.bestFeasible! : last.bestEver).objective -
              optimum.objective,
          )
        : null,
    termination: last.reason ?? 'Experiment in progress',
    ...normalizeHistory(events),
  });
}
