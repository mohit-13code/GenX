import { bestIndividual, objectiveCandidate, optimalityGap } from '../../engine/metrics';
import { useEffect, useMemo, useState } from 'react';
import { Pause, Play, RotateCcw, SkipForward, Swords } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useExperiment, type Experiment } from '../../hooks/useExperiment';
import { compatibleConfig, defaultConfig, problemMeta } from '../../problems';
import type { Config } from '../../engine/types';
import { Badge, Field, Panel, format } from '../../components/Common';
import { ProblemView } from '../../visualizations/ProblemView';
import { historyStats } from '../../components/Charts';
function BattlePanel({
  name,
  config,
  setConfig,
  experiment,
}: {
  name: string;
  config: Config;
  setConfig: (c: Config) => void;
  experiment: Experiment;
}) {
  const e = experiment.event,
    best = bestIndividual(e.population, experiment.config);
  return (
    <Panel
      title={`Experiment ${name}`}
      aside={<Badge tone={name === 'A' ? 'green' : 'violet'}>GEN {e.generation}</Badge>}
      className={`battle-panel experiment-${name}`}
    >
      <div className="battle-settings">
        <Field label={`Mutation ${name}`}>
          <input
            aria-label={`Mutation ${name}`}
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={config.mutationRate}
            onChange={(event) =>
              setConfig({
                ...config,
                mutationRate: Math.max(0, Math.min(1, Number(event.target.value))),
              })
            }
          />
        </Field>
        <Field label={`Selection ${name}`}>
          <select
            aria-label={`Selection ${name}`}
            value={config.selection}
            onChange={(event) =>
              setConfig({ ...config, selection: event.target.value as Config['selection'] })
            }
          >
            <option value="tournament">Tournament</option>
            <option value="roulette">Roulette</option>
            <option value="rank">Rank-based</option>
          </select>
        </Field>
        <Field label={`Population ${name}`}>
          <input
            aria-label={`Population ${name}`}
            type="number"
            min="4"
            max="100"
            value={config.populationSize}
            onChange={(event) =>
              setConfig({
                ...config,
                populationSize: Math.max(4, Math.min(100, Math.round(Number(event.target.value)))),
              })
            }
          />
        </Field>
        <Field label={`Elites ${name}`}>
          <input
            aria-label={`Elites ${name}`}
            type="number"
            min="0"
            max={config.populationSize - 1}
            value={config.elitism}
            onChange={(event) =>
              setConfig({
                ...config,
                elitism: Math.max(
                  0,
                  Math.min(config.populationSize - 1, Math.round(Number(event.target.value))),
                ),
              })
            }
          />
        </Field>
        <Field label={`Crossover ${name}`}>
          <input
            aria-label={`Crossover ${name}`}
            type="number"
            min="0"
            max="1"
            step="0.05"
            value={config.crossoverRate}
            onChange={(event) =>
              setConfig({
                ...config,
                crossoverRate: Math.max(0, Math.min(1, Number(event.target.value))),
              })
            }
          />
        </Field>
      </div>
      <ProblemView
        config={experiment.config}
        population={e.population}
        best={best}
        bestEver={e.bestEver}
        initial={experiment.events[0].population[0]}
        problem={experiment.problem}
      />
      <div className="battle-metrics">
        <div>
          <span>Best objective</span>
          <strong>
            {objectiveCandidate(experiment.config, e)
              ? format(objectiveCandidate(experiment.config, e)!.objective, 4)
              : 'No feasible candidate'}
          </strong>
        </div>
        <div>
          <span>Average fitness</span>
          <strong>{format(e.stats.average, 5)}</strong>
        </div>
        <div>
          <span>Diversity</span>
          <strong>{format(e.stats.diversity * 100, 1)}%</strong>
        </div>
        <div>
          <span>Evaluations</span>
          <strong>{e.stats.evaluations}</strong>
        </div>
        <div>
          <span>Absolute gap</span>
          <strong>
            {optimalityGap(experiment.config, e, experiment.optimum) !== null
              ? format(optimalityGap(experiment.config, e, experiment.optimum)!, 4)
              : '—'}
          </strong>
        </div>
        <div>
          <span>First target generation</span>
          <strong>
            {experiment.optimum
              ? (historyStats(experiment.events, experiment.cursor).find((s) => s.targetReached)
                  ?.generation ?? 'Not reached')
              : 'Unknown'}
          </strong>
        </div>
      </div>
    </Panel>
  );
}
export function Battle() {
  const [a, setA] = useState<Config>({
      ...defaultConfig,
      maxGenerations: 50,
      earlyStopping: false,
      mutationRate: 0.01,
    }),
    [b, setB] = useState<Config>({
      ...defaultConfig,
      maxGenerations: 50,
      earlyStopping: false,
      mutationRate: 0.2,
    });
  const left = useExperiment(a),
    right = useExperiment(b);
  const [running, setRunning] = useState(false),
    [axis, setAxis] = useState<'generation' | 'evaluations'>('generation');
  const dirty =
    JSON.stringify(a) !== JSON.stringify(left.config) ||
    JSON.stringify(b) !== JSON.stringify(right.config);
  const done = left.event.stage === 'stop' && right.event.stage === 'stop';
  useEffect(() => {
    if (!running || done) return;
    const timer = window.setInterval(() => {
      left.advance('generation');
      right.advance('generation');
    }, 140);
    return () => window.clearInterval(timer);
  }, [running, done, left.advance, right.advance]);
  const data = useMemo(() => {
    const map = new Map<number, { x: number; A?: number; B?: number }>();
    for (const [name, e] of [
      ['A', left],
      ['B', right],
    ] as const)
      for (const s of historyStats(e.events, e.cursor)) {
        const x = s[axis];
        map.set(x, { ...(map.get(x) ?? { x }), [name]: s.bestEver });
      }
    return [...map.values()].sort((a, b) => a.x - b.x);
  }, [left.events, left.cursor, right.events, right.cursor, axis]);
  const apply = () => {
    setRunning(false);
    left.restart(a);
    right.restart(b);
  };
  return (
    <div className="content-page battle-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">THE COMPARISON LAB</span>
          <h1>
            Evolution Battle<span className="heading-period">.</span>
          </h1>
          <p>Same problem. Same sampling stream. Two different evolutionary strategies.</p>
        </div>
        <Badge tone="violet">
          <Swords size={15} />
          Single-seed comparison
        </Badge>
      </div>
      <div className="battle-toolbar">
        <Field label="Shared optimization problem">
          <select
            aria-label="Shared optimization problem"
            value={a.problem}
            onChange={(e) => {
              setRunning(false);
              setA(compatibleConfig({ ...a, problem: e.target.value as Config['problem'] }));
              setB(compatibleConfig({ ...b, problem: e.target.value as Config['problem'] }));
            }}
          >
            {problemMeta.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Shared seed">
          <input
            aria-label="Shared seed"
            type="number"
            min="0"
            max="4294967295"
            value={a.seed}
            onChange={(e) => {
              const seed = Math.max(0, Math.min(4294967295, Math.round(Number(e.target.value))));
              setA({ ...a, seed });
              setB({ ...b, seed });
            }}
          />
        </Field>
        <button className="button secondary" onClick={apply}>
          <RotateCcw size={16} />
          {dirty ? 'Apply configurations' : 'Reset both'}
        </button>
        <button
          className="button primary"
          disabled={dirty || done}
          onClick={() => setRunning(!running)}
        >
          {running && !done ? <Pause size={16} /> : <Play size={16} />}{' '}
          {running && !done ? 'Pause battle' : 'Run battle'}
        </button>
        <button
          className="button secondary"
          disabled={dirty || done}
          onClick={() => {
            setRunning(false);
            left.advance('generation');
            right.advance('generation');
          }}
        >
          <SkipForward size={16} />
          Step both
        </button>
      </div>
      {dirty && (
        <div className="draft-banner">
          Draft configurations changed. Apply configurations to start a fair new comparison.
        </div>
      )}
      <div className="battle-grid">
        <BattlePanel
          name="A"
          config={a}
          setConfig={(c) => {
            setRunning(false);
            setA({
              ...c,
              elitism: Math.min(c.elitism, c.populationSize - 1),
              tournamentSize: Math.min(c.tournamentSize, c.populationSize),
            });
          }}
          experiment={left}
        />
        <BattlePanel
          name="B"
          config={b}
          setConfig={(c) => {
            setRunning(false);
            setB({
              ...c,
              elitism: Math.min(c.elitism, c.populationSize - 1),
              tournamentSize: Math.min(c.tournamentSize, c.populationSize),
            });
          }}
          experiment={right}
        />
      </div>
      <Panel
        title="Convergence head to head"
        aside={
          <select
            aria-label="Comparison axis"
            value={axis}
            onChange={(e) => setAxis(e.target.value as typeof axis)}
          >
            <option value="generation">By generation</option>
            <option value="evaluations">By fitness evaluations</option>
          </select>
        }
      >
        <div className="battle-chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: 0, right: 25, top: 20, bottom: 5 }}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis
                dataKey="x"
                type="number"
                domain={['dataMin', 'dataMax']}
                stroke="var(--muted)"
              />
              <YAxis stroke="var(--muted)" width={65} tickFormatter={(v) => format(Number(v), 4)} />
              <Tooltip
                contentStyle={{
                  background: 'var(--surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)',
                }}
                labelFormatter={(v) => `${axis}: ${v}`}
              />
              <Line
                name="A · best-ever fitness"
                dataKey="A"
                type="stepAfter"
                stroke="var(--accent)"
                dot={false}
                strokeWidth={2.5}
                isAnimationActive={false}
                connectNulls
              />
              <Line
                name="B · best-ever fitness"
                dataKey="B"
                type="stepAfter"
                stroke="var(--violet)"
                dot={false}
                strokeWidth={2.5}
                isAnimationActive={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="hint">
          Teal: experiment A · Violet: experiment B. Equal population sizes have identical initial
          chromosomes. Different sizes use prefixes of the same deterministic initialization stream.
          Each run records its own evaluation count. A single run cannot establish that one
          configuration is universally better.
        </p>
      </Panel>
    </div>
  );
}
