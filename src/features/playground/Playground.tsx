import { bestIndividual } from '../../engine/metrics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Check,
  Copy,
  Dna,
  Download,
  FlaskConical,
  GitBranch,
  MapPin,
  Printer,
  Sparkles,
  Users,
  Code2,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { Config, Individual } from '../../engine/types';
import { defaultConfig, makeProblem, validateConfig } from '../../problems';
import { useExperiment } from '../../hooks/useExperiment';
import { Badge, Panel, format } from '../../components/Common';
import { FitnessChart, historyStats } from '../../components/Charts';
import { GenomeCanvas, ProblemView } from '../../visualizations/ProblemView';
import { Configuration } from './Configuration';
import { Playback } from './Playback';
import { Explanation } from './Explanation';
import { Inspector } from '../ancestry/Inspector';
import { SeededRandom } from '../../engine/random';
import { exportCsv, exportResults } from '../../utils/export';
import { OperatorBench } from './OperatorBench';
import { GenomeRibbon } from '../../components/chromosomes/GenomeRibbon';
function storedConfig() {
  try {
    const raw = localStorage.getItem('genx-config');
    return raw ? validateConfig(JSON.parse(raw)) : structuredClone(defaultConfig);
  } catch {
    return structuredClone(defaultConfig);
  }
}
export function Playground({ initialProblem }: { initialProblem?: Config['problem'] }) {
  const [draft, setDraft] = useState<Config>(() => {
    const c = storedConfig();
    if (initialProblem) {
      c.problem = initialProblem;
      const p = makeProblem(c);
      c.crossover = p.crossover[0];
      c.mutation = p.mutation[0];
    }
    return c;
  });
  const experiment = useExperiment(draft);
  const { event, config } = experiment;
  const [error, setError] = useState(''),
    [setupOpen, setSetupOpen] = useState(() => !window.matchMedia('(max-width: 760px)').matches),
    [workspaceView, setWorkspaceView] = useState<'simulation' | 'population' | 'trace'>(
      'simulation',
    ),
    [editing, setEditing] = useState(false),
    [inspect, setInspect] = useState<Individual | null>(null),
    [copied, setCopied] = useState(false),
    [confirmReset, setConfirmReset] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(config);
  const best = bestIndividual(event.population, experiment.config);
  const selectIndividual = (p: Individual) => {
    experiment.setPlaying(false);
    setInspect(p);
  };
  const apply = () => {
    try {
      const next = validateConfig(draft);
      experiment.restart(next);
      setError('');
      setEditing(false);
      setInspect(null);
      setConfirmReset(false);
      try {
        localStorage.setItem('genx-config', JSON.stringify(next));
      } catch {
        /* Storage is optional. */
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Invalid settings.');
    }
  };
  const requestReset = useCallback(() => {
    experiment.setPlaying(false);
    if (experiment.cursor > 3) setConfirmReset(true);
    else {
      experiment.restart(config);
      setDraft(structuredClone(config));
    }
  }, [experiment, config]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest('input,textarea,select,[contenteditable="true"],button') ||
        inspect ||
        confirmReset
      )
        return;
      if (e.code === 'Space') {
        e.preventDefault();
        experiment.setPlaying((v) => !v);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        experiment.setPlaying(false);
        experiment.advance(e.shiftKey ? 'generation' : 'micro');
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        experiment.previous();
      } else if (e.key.toLowerCase() === 'r') requestReset();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [experiment, inspect, confirmReset, requestReset]);
  const stats = historyStats(experiment.events, experiment.cursor);
  const referenceCandidate = config.problem === 'knapsack' ? event.bestFeasible : event.bestEver;
  const gap =
    experiment.optimum && referenceCandidate
      ? Math.abs(referenceCandidate.objective - experiment.optimum.objective)
      : null;
  const warnings = useMemo(() => {
    const messages = [];
    if (event.stats.diversity < 0.1)
      messages.push('Low diversity: the population may be converging prematurely.');
    if (config.mutationRate === 0)
      messages.push('Mutation is disabled. Lost alleles cannot reappear.');
    if (config.mutationRate > 0.3)
      messages.push('High mutation may disrupt useful inherited sequences.');
    if (event.stats.stagnant >= config.stagnation)
      messages.push('No improvement across the configured stagnation window.');
    return messages;
  }, [event.stats, config]);
  const closeInspector = useCallback(() => setInspect(null), []);
  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 760px)');
    const onResize = () => setSetupOpen(!mobile.matches);
    mobile.addEventListener('change', onResize);
    return () => mobile.removeEventListener('change', onResize);
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="playground-page"
      data-view={workspaceView}
    >
      <section className="print-only print-report-header">
        <h2>GenX experiment report</h2>
        <p>
          {experiment.problem.name} · seed {config.seed} · displayed generation {event.generation}
        </p>
        <dl>
          {Object.entries(config)
            .filter(([, value]) => typeof value !== 'object')
            .map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{String(value)}</dd>
              </div>
            ))}
        </dl>
        <p>
          Initial best: {experiment.events[0].bestEver.decoded}; objective{' '}
          {format(experiment.events[0].bestEver.objective, 6)}. Current best-ever:{' '}
          {event.bestEver.decoded}; objective {format(event.bestEver.objective, 6)}.
        </p>
      </section>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="live-dot" />
            GENX / EXPERIMENT WORKSPACE
          </div>
          <h1>
            Evolution Playground<span className="heading-period">.</span>
          </h1>
          <p>Observe every decision. Trace every generation.</p>
        </div>
        <div className="heading-actions">
          <Badge tone="muted">
            <FlaskConical size={13} />
            Seeded experiment
          </Badge>
          <button
            className="button secondary"
            onClick={() => {
              exportResults(config, experiment.events, experiment.optimum);
            }}
          >
            <Download size={16} />
            Export experiment
          </button>
        </div>
      </div>
      <div className="lab-tabs" aria-label="Workspace views">
        <div className="workspace-views">
          {(
            [
              { id: 'simulation', label: 'Simulation', icon: Activity },
              { id: 'population', label: 'Population', icon: Users },
              { id: 'trace', label: 'Algorithm trace', icon: Code2 },
            ] as const
          ).map((view) => (
            <button
              key={view.id}
              className={workspaceView === view.id ? 'active' : ''}
              aria-pressed={workspaceView === view.id}
              onClick={() => {
                setWorkspaceView(view.id);
                if (window.innerWidth > 760 && view.id !== 'simulation')
                  document
                    .getElementById(`lab-${view.id}`)
                    ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
              }}
            >
              <view.icon size={15} />
              {view.label}
            </button>
          ))}
        </div>
        <span>
          <GitBranch size={15} />
          Seed <b className="mono">{config.seed}</b>
        </span>
        <span className="lab-status">
          <i className={`dot ${experiment.playing ? 'teal' : 'violet-dot'}`} />
          {experiment.playing
            ? 'Evolving'
            : event.stage === 'stop'
              ? 'Completed'
              : 'Ready to explore'}
        </span>
      </div>
      {dirty && (
        <div className="draft-banner">
          <span>
            Settings changed. The recorded experiment still uses its original configuration.
          </span>
          <button className="text-button" onClick={apply}>
            Create new experiment
          </button>
        </div>
      )}
      <Playback experiment={experiment} onReset={requestReset} />
      <div className="lab-grid">
        <Configuration
          draft={draft}
          setDraft={(c) => {
            setDraft(c);
            experiment.setPlaying(false);
          }}
          dirty={dirty}
          onApply={apply}
          error={error}
          setError={setError}
          editing={editing}
          setEditing={setEditing}
          expanded={setupOpen}
          onToggle={() => setSetupOpen((v) => !v)}
        />
        <div className="center-column">
          <div className="metrics-grid">
            <div className="metric">
              <span>
                BEST FITNESS <Sparkles size={13} />
              </span>
              <strong className="text-accent">{format(event.stats.best, 5)}</strong>
              <small>Current generation</small>
            </div>
            <div className="metric">
              <span title="Average fitness of the current population">MEAN FITNESS</span>
              <strong>{format(event.stats.average, 5)}</strong>
              <small>Across {config.populationSize} individuals</small>
            </div>
            <div className="metric">
              <span>
                DIVERSITY <Activity size={13} />
              </span>
              <strong>
                {format(event.stats.diversity * 100, 1)}
                <em>%</em>
              </strong>
              <small>Positional Hamming distance</small>
            </div>
          </div>
          <Panel
            title={experiment.problem.name}
            eyebrow={editing ? 'PROBLEM INSTANCE EDITOR' : 'OBSERVE THE SEARCH'}
            aside={
              <Badge tone="green">GENERATION {String(event.generation).padStart(3, '0')}</Badge>
            }
            className="visualization-panel"
          >
            <ProblemView
              config={editing ? draft : config}
              population={event.population}
              best={best}
              bestEver={event.bestEver}
              initial={experiment.events[0].population[0]}
              selected={inspect?.id}
              onSelect={selectIndividual}
              problem={experiment.problem}
              editing={editing}
              onCities={(cities) => setDraft({ ...draft, cities })}
            />
            {editing && (
              <div className="map-tools">
                <button
                  className="button small"
                  onClick={() => {
                    const rng = new SeededRandom(draft.seed);
                    setDraft({
                      ...draft,
                      cities: Array.from({ length: 8 }, () => ({
                        x: 30 + rng.next() * 470,
                        y: 30 + rng.next() * 300,
                      })),
                    });
                  }}
                >
                  Seeded random cities
                </button>
                <button
                  className="button small"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      cities: Array.from({ length: 8 }, (_, i) => ({
                        x: 270 + 140 * Math.cos((i * Math.PI) / 4),
                        y: 180 + 140 * Math.sin((i * Math.PI) / 4),
                      })),
                    })
                  }
                >
                  Circle preset
                </button>
                <button
                  className="button small"
                  disabled={draft.cities.length <= 3}
                  onClick={() => setDraft({ ...draft, cities: draft.cities.slice(0, -1) })}
                >
                  Remove last city
                </button>
                <MapPin size={14} />
              </div>
            )}
          </Panel>
          <OperatorBench
            event={event}
            config={config}
            problem={experiment.problem}
            onInspect={selectIndividual}
          />
          <Panel
            title="Fitness convergence"
            className="convergence-panel"
            aside={
              <div className="chart-legend">
                <span>
                  <i className="dot teal" />
                  Best ever
                </span>
                <span>
                  <i className="dot violet-dot" />
                  Average
                </span>
              </div>
            }
          >
            <FitnessChart events={experiment.events} cursor={experiment.cursor} />
            <div className="convergence-footer">
              <span>GENERATION</span>
              <span>
                {event.stats.evaluations} fitness evaluations · {event.stats.stagnant} without
                improvement
              </span>
            </div>
          </Panel>
          <Panel
            title="Population explorer"
            className="population-panel"
            eyebrow="LOOK CLOSER"
            aside={
              <Badge tone="muted">
                {event.stats.unique} unique / {config.populationSize}
              </Badge>
            }
          >
            <div id="lab-population" className="section-anchor" />
            <GenomeCanvas population={event.population} />
            <div className="population-table-wrap">
              <table className="population-table">
                <thead>
                  <tr>
                    <th>CHROMOSOME</th>
                    <th>GENES</th>
                    <th>OBJECTIVE</th>
                    <th>FITNESS ↑</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {event.population.map((p) => (
                    <tr key={p.id} onClick={() => selectIndividual(p)}>
                      <td>
                        <span className={`tiny-dot ${p.id === best.id ? 'best-dot' : ''}`} />
                        {p.id}
                      </td>
                      <td>
                        <GenomeRibbon individual={p} problem={experiment.problem} limit={8} />
                      </td>
                      <td>{format(p.objective, 4)}</td>
                      <td className={p.id === best.id ? 'text-accent' : ''}>
                        {format(p.fitness, 6)}
                      </td>
                      <td>
                        <button
                          className="icon-button"
                          aria-label={`Open chromosome inspector ${p.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            selectIndividual(p);
                          }}
                        >
                          <Dna size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="hint table-hint">
              Select any chromosome to inspect its genes, fitness and recorded ancestry.
            </p>
          </Panel>
          <div className="result-cards">
            <Panel title="Experiment record">
              <dl className="result-list">
                <div>
                  <dt>Best-ever fitness</dt>
                  <dd>{format(event.bestEver.fitness, 7)}</dd>
                </div>
                <div>
                  <dt>Best-ever solution</dt>
                  <dd>{event.bestEver.decoded}</dd>
                </div>
                {config.problem === 'knapsack' && (
                  <div>
                    <dt>Best feasible value</dt>
                    <dd>{event.bestFeasible?.objective ?? 'None yet'}</dd>
                  </div>
                )}
                <div>
                  <dt>Exact objective</dt>
                  <dd>
                    {experiment.optimum
                      ? format(experiment.optimum.objective, 6)
                      : 'Unavailable above 10 cities'}
                  </dd>
                </div>
                <div>
                  <dt>Absolute optimality gap</dt>
                  <dd>{gap === null ? '—' : format(gap, 6)}</dd>
                </div>
                <div>
                  <dt>Termination</dt>
                  <dd>{event.reason ?? 'In progress'}</dd>
                </div>
              </dl>
              <p className="hint">
                {experiment.optimum?.label}.{' '}
                {config.problem === 'tsp'
                  ? 'Tour distance is minimized; selection fitness = 1 / (1 + distance).'
                  : config.problem === 'function' && config.functionPreset === 'minimum'
                    ? 'Objective is minimized; fitness = 1 / (1 + objective).'
                    : ''}
              </p>
            </Panel>
            <Panel title="Population health">
              <div className="health-meter">
                <strong>
                  {format(event.stats.diversity * 100, 1)}
                  <em>%</em>
                </strong>
                <span>Normalized positional diversity</span>
              </div>
              <div className="meter">
                <span style={{ width: `${event.stats.diversity * 100}%` }} />
              </div>
              {warnings.length ? (
                warnings.map((w) => (
                  <p key={w} className="warning">
                    {w}
                  </p>
                ))
              ) : (
                <p className="hint">
                  The population retains variation. Diversity alone cannot establish convergence.
                </p>
              )}
              <p className="hint">
                {stats.length} recorded generations · exact pairwise metric in O(NL).
              </p>
            </Panel>
          </div>
          <div className="export-bar">
            <button className="button small" onClick={() => exportCsv(experiment.events)}>
              <Download size={14} />
              Statistics CSV
            </button>
            <button
              className="button small"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2000);
                } catch {
                  setError('Clipboard unavailable. Export settings as JSON instead.');
                }
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}Copy settings
            </button>
            <button className="button small" onClick={() => window.print()}>
              <Printer size={14} />
              Print report
            </button>
          </div>
        </div>
        <Explanation event={event} />
      </div>
      <div className="keyboard-hints">
        <kbd>space</kbd> play / pause <kbd>←</kbd>
        <kbd>→</kbd> micro-step <kbd>shift →</kbd> generation <kbd>R</kbd> reset{' '}
        <span>Deterministic by design. Every decision is recorded.</span>
      </div>
      <section className="print-only">
        <h2>Recorded generation statistics</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Generation</th>
              <th>Best fitness</th>
              <th>Average</th>
              <th>Diversity</th>
              <th>Evaluations</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.generation}>
                <td>{s.generation}</td>
                <td>{format(s.best, 6)}</td>
                <td>{format(s.average, 6)}</td>
                <td>{format(s.diversity * 100, 2)}%</td>
                <td>{s.evaluations}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {confirmReset && (
        <div className="modal-backdrop">
          <section
            className="modal confirm-modal"
            role="alertdialog"
            aria-modal="true"
            aria-label="Reset recorded experiment"
          >
            <h2>Reset this experiment?</h2>
            <p>
              This clears its recorded timeline and restores the original configuration and seed.
            </p>
            <div className="button-row">
              <button className="button secondary" autoFocus onClick={() => setConfirmReset(false)}>
                Keep exploring
              </button>
              <button
                className="button primary"
                onClick={() => {
                  experiment.restart(config);
                  setDraft(structuredClone(config));
                  setConfirmReset(false);
                  setInspect(null);
                }}
              >
                Reset to seed {config.seed}
              </button>
            </div>
          </section>
        </div>
      )}
      {inspect && (
        <Inspector
          individual={inspect}
          events={experiment.events.slice(0, experiment.cursor + 1)}
          problem={experiment.problem}
          config={config}
          onClose={closeInspector}
          onSelect={setInspect}
        />
      )}
    </motion.div>
  );
}
