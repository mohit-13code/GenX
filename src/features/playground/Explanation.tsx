import { useState } from 'react';
import { BookOpen, ChevronDown, Code2, Lightbulb } from 'lucide-react';
import { Badge, Formula, format } from '../../components/Common';
import type { SimulationEvent } from '../../engine/types';
import { STAGES } from '../../engine/types';
const code = [
  ['initialize', 'population ← initialize(seed)'],
  ['decode', 'decode chromosomes'],
  ['evaluate', 'evaluate fitness(population)'],
  ['statistics', 'measure fitness & diversity'],
  ['select', 'parents ← select(population)'],
  ['crossover', 'children ← crossover(parents)'],
  ['mutate', 'children ← mutate(children)'],
  ['validate', 'validate chromosomes'],
  ['offspring', 'evaluate fitness(children)'],
  ['elites', 'elites ← copy best(population)'],
  ['replace', 'population ← elites + children'],
  ['stop', 'check stopping conditions'],
] as const;
const why: Record<string, string> = {
  initialize: 'A diverse starting population samples different parts of the search space.',
  decode: 'The genotype stores genes; the phenotype is the actual solution they describe.',
  evaluate: 'Fitness makes candidate quality comparable for selection.',
  statistics: 'Summaries reveal progress and whether variation is being lost.',
  select: 'Prefer stronger candidates while retaining a chance to explore.',
  crossover: 'Combine inherited building blocks to create new candidates.',
  mutate: 'Introduce variation that crossover alone cannot create.',
  validate: 'Every offspring must remain a valid encoding of the problem.',
  offspring: 'Children must be evaluated before generation replacement.',
  elites: 'Copied elites protect the strongest solutions from destructive changes.',
  replace: 'A complete replacement keeps population size and experiment history consistent.',
  stop: 'Bounds keep computation finite; a stopped run is not necessarily globally optimal.',
};
export function Explanation({ event }: { event: SimulationEvent }) {
  const [technical, setTechnical] = useState(false);
  return (
    <aside className="explanation panel" id="lab-trace">
      <div className="panel-heading">
        <h3>
          <BookOpen size={17} /> Under the hood
        </h3>
        <Code2 size={16} className="muted" />
      </div>
      <div className="mode-toggle">
        <button className={!technical ? 'active' : ''} onClick={() => setTechnical(false)}>
          Beginner
        </button>
        <button className={technical ? 'active' : ''} onClick={() => setTechnical(true)}>
          Technical
        </button>
      </div>
      <div className="stage-title">
        <span className="stage-number">
          {String(STAGES.indexOf(event.stage) + 1).padStart(2, '0')}
        </span>
        <div>
          <span className="eyebrow">CURRENT OPERATION</span>
          <h3>
            {event.stage === 'statistics'
              ? 'Population statistics'
              : event.stage === 'replace'
                ? 'Next generation'
                : event.stage === 'offspring'
                  ? 'Evaluate offspring'
                  : event.stage.charAt(0).toUpperCase() + event.stage.slice(1)}
          </h3>
        </div>
        <Badge tone="violet">G{event.generation}</Badge>
      </div>
      <p className="event-message" aria-live="polite">
        {technical ? event.technical : event.message}
      </p>
      <div className="why">
        <Lightbulb size={15} />
        <p>{why[event.stage]}</p>
      </div>
      <Formula value={event.formula} />
      {event.inputs.length > 0 && (
        <div className="operation-genes">
          <span className="eyebrow">
            INPUT {event.inputs.length > 1 ? 'CHROMOSOMES' : 'CHROMOSOME'}
          </span>
          {event.inputs.map((p, i) => (
            <div key={`${p.id}-${i}`} className={`gene-line parent-${i % 2}`}>
              <span>{p.id}</span>
              <code>
                {p.genes.join(event.inputs[0].genes.some((g) => typeof g === 'string') ? '' : ' ')}
              </code>
            </div>
          ))}
        </div>
      )}
      {event.outputs.length > 0 && event.outputs.length <= 2 && (
        <div className="operation-genes">
          <span className="eyebrow">RECORDED OUTPUT</span>
          {event.outputs.map((p, j) => (
            <div key={p.id} className="mini-genes">
              {p.genes.map((g, i) => (
                <span
                  key={i}
                  className={
                    p.mutations.includes(i) ? 'mutated' : p.sources[i] === 1 ? 'from-b' : 'from-a'
                  }
                  title={`Gene ${i + 1}: inherited from parent ${(p.sources[i] ?? 0) + 1}${p.mutations.includes(i) ? ', mutated' : ''}`}
                >
                  {g}
                </span>
              ))}
              <small>child {j + 1}</small>
            </div>
          ))}
        </div>
      )}
      {event.points.length > 0 && (
        <p className="hint">
          Crossover boundaries: {event.points.join(', ')} (zero-based boundaries).
        </p>
      )}
      {event.probabilities && event.stage === 'select' && (
        <details className="probability-detail">
          <summary>Selection probability table</summary>
          <div
            className="roulette"
            style={{
              background: `conic-gradient(${event.probabilities
                .map((prob, i) => {
                  const prev = event.cumulative![i] - prob;
                  return `hsl(${155 + ((i * 137.5) % 200)} 55% 55%) ${prev * 100}% ${event.cumulative![i] * 100}%`;
                })
                .join(',')})`,
            }}
            aria-label="Wheel sectors represent actual selection probabilities"
          />
          <table className="compact-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Fitness</th>
                <th>p</th>
                <th>Σ p</th>
              </tr>
            </thead>
            <tbody>
              {event.population.map((p, i) => (
                <tr key={p.id} className={event.selected.includes(i) ? 'selected-row' : ''}>
                  <td>{p.id}</td>
                  <td>{format(p.fitness, 5)}</td>
                  <td title={String(event.probabilities![i])}>
                    {format(event.probabilities![i], 4)}
                  </td>
                  <td title={String(event.cumulative![i])}>{format(event.cumulative![i], 4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="hint">
            {event.selectionMethod === 'tournament'
              ? 'Actual winner probabilities for sampling with replacement. Tied fitness shares each fitness group’s winning probability equally; the first sampled maximum wins.'
              : 'Actual selection probabilities. Intervals are left inclusive and right exclusive.'}
          </p>
        </details>
      )}
      <div className="pseudocode">
        <div className="code-heading">
          <span className="eyebrow">ALGORITHM TRACE</span>
          <span className="mono">genetic_algorithm.ts</span>
        </div>
        {code.map(([stage, line], i) => (
          <div className={`code-line ${event.stage === stage ? 'executing' : ''}`} key={stage}>
            <span>{String(i + 1).padStart(2, '0')}</span>
            <code>{line}</code>
          </div>
        ))}
      </div>
      <details className="random-detail">
        <summary>
          <span>
            Random decisions <Badge tone="muted">{event.random.length}</Badge>
          </span>
          <ChevronDown size={14} />
        </summary>
        {event.random.length ? (
          event.random.map((r, i) => (
            <div className="random-row" key={i}>
              <span>{r.label}</span>
              <code title={String(r.value)}>{r.value}</code>
            </div>
          ))
        ) : (
          <p className="hint">This operation uses no random samples.</p>
        )}
      </details>
      <div className="next-operation">
        <span className="eyebrow">NEXT IN THE LIFECYCLE</span>
        <span>
          {event.stage === 'stop'
            ? 'Experiment complete'
            : event.stage === 'select'
              ? 'Select another parent or recombine the pair'
              : event.stage === 'statistics'
                ? 'Selection or stopping-condition check'
                : code[(STAGES.indexOf(event.stage) + 1) % code.length][1]}
        </span>
      </div>
    </aside>
  );
}
