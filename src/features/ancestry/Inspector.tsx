import { useEffect, useMemo, useRef, useState } from 'react';
import type { Config, Individual, Problem, SimulationEvent } from '../../engine/types';
import { Badge, Modal, format } from '../../components/Common';
export function Inspector({
  individual,
  events,
  problem,
  config,
  onClose,
  onSelect,
}: {
  individual: Individual;
  events: SimulationEvent[];
  problem: Problem;
  config: Config;
  onClose: () => void;
  onSelect: (p: Individual) => void;
}) {
  const [tab, setTab] = useState<'genome' | 'ancestry'>('genome');
  const container = useRef<HTMLDivElement>(null);
  const recorded = useMemo(() => {
    const m = new Map<string, Individual>();
    for (const e of events)
      for (const p of [...e.population, ...e.inputs, ...e.outputs]) m.set(p.id, p);
    return m;
  }, [events]);
  const current = individual;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const focusable = container.current
          ?.closest('.modal')
          ?.querySelectorAll<HTMLElement>('button,[href],input,select,textarea,[tabindex="0"]');
        if (!focusable?.length) return;
        const first = focusable[0],
          last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [onClose]);
  const rank =
    1 + (events.at(-1)?.population.filter((i) => i.fitness > current.fitness).length ?? 0);
  const nodes: { p: Individual; x: number; y: number; key: string }[] = [];
  const edges: { x: number; y: number; px: number; py: number }[] = [];
  const walk = (p: Individual, depth: number, x: number, width: number, key: string) => {
    nodes.push({ p, x, y: 215 - depth * 86, key });
    if (depth >= 2) return;
    p.parents.forEach((id, i) => {
      const parent = recorded.get(id);
      if (!parent) return;
      const px = x + (i - (p.parents.length - 1) / 2) * width;
      edges.push({ x, y: 215 - depth * 86, px, py: 215 - (depth + 1) * 86 });
      walk(parent, depth + 1, px, width / 2, `${key}.${i}`);
    });
  };
  walk(current, 0, 300, 240, '0');
  return (
    <Modal title="DNA Microscope" onClose={onClose}>
      <div ref={container}>
        <div className="inspector-header">
          <div>
            <span className="eyebrow">CHROMOSOME ID</span>
            <h2 className="mono">{current.id}</h2>
          </div>
          <Badge tone={current.feasible ? 'green' : 'amber'}>
            {current.feasible ? 'Feasible' : 'Constraint violation'}
          </Badge>
        </div>
        <div className="tab-strip">
          <button className={tab === 'genome' ? 'active' : ''} onClick={() => setTab('genome')}>
            Genome & phenotype
          </button>
          <button className={tab === 'ancestry' ? 'active' : ''} onClick={() => setTab('ancestry')}>
            Recorded ancestry
          </button>
        </div>
        {tab === 'genome' ? (
          <>
            <div className="inspector-genes">
              {current.genes.map((g, i) => (
                <div key={i}>
                  <span
                    className={
                      current.mutations.includes(i)
                        ? 'mutated'
                        : current.sources[i] === 1
                          ? 'from-b'
                          : 'from-a'
                    }
                    title={problem.geneMeaning(g, i)}
                    tabIndex={0}
                    aria-label={problem.geneMeaning(g, i)}
                  >
                    {g}
                  </span>
                  <small>{i + 1}</small>
                </div>
              ))}
            </div>
            <p className="hint">
              Gene positions start at 1 on the left. Hover or focus a gene for its meaning. Teal =
              parent A, violet = parent B, amber = mutation.
            </p>
            <dl className="inspector-properties">
              <div>
                <dt>Decoded solution</dt>
                <dd>{current.decoded}</dd>
              </div>
              <div>
                <dt>{problem.objectiveLabel}</dt>
                <dd>{format(current.objective, 6)}</dd>
              </div>
              <div>
                <dt>Selection fitness ↑</dt>
                <dd>{format(current.fitness, 8)}</dd>
              </div>
              <div>
                <dt>Born in generation</dt>
                <dd>{current.born}</dd>
              </div>
              <div>
                <dt>Rank against displayed population</dt>
                <dd>#{rank}</dd>
              </div>
              <div>
                <dt>Parents</dt>
                <dd>
                  {current.parents.length
                    ? current.parents.map((id) => (
                        <button
                          key={id}
                          className="text-button"
                          onClick={() => {
                            const p = recorded.get(id);
                            if (p) onSelect(p);
                          }}
                        >
                          {id}
                        </button>
                      ))
                    : 'Initial seeded population'}
                </dd>
              </div>
              <div>
                <dt>Mutated positions</dt>
                <dd>
                  {current.mutations.length
                    ? current.mutations.map((i) => i + 1).join(', ')
                    : 'None'}
                </dd>
              </div>
              {Object.entries(current.details).map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{format(value, 6)}</dd>
                </div>
              ))}
            </dl>
            {config.problem === 'knapsack' && !current.feasible && (
              <p className="warning">
                Infeasible items remain inspectable; their selection fitness is zero.
              </p>
            )}
          </>
        ) : (
          <>
            <svg
              className="ancestry-svg"
              viewBox="0 0 600 275"
              aria-label="Exact recorded parent links through two ancestral generations"
            >
              {edges.map((e, i) => (
                <path
                  key={i}
                  d={`M${e.x},${e.y - 18}C${e.x},${e.y - 40} ${e.px},${e.py + 40} ${e.px},${e.py + 18}`}
                  stroke={i % 2 ? '#a78bfa' : '#2dd4bf'}
                  strokeWidth="1.5"
                  fill="none"
                />
              ))}
              {nodes.map(({ p, x, y, key }) => (
                <g
                  key={key}
                  tabIndex={0}
                  role="button"
                  aria-label={`Inspect ancestor ${p.id}`}
                  onClick={() => onSelect(p)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onSelect(p);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <rect
                    x={x - 54}
                    y={y - 22}
                    width="108"
                    height="48"
                    rx="8"
                    fill="var(--surface)"
                    stroke={p.mutations.length ? '#fbbf24' : 'var(--border)'}
                  />
                  <text
                    x={x}
                    y={y - 4}
                    textAnchor="middle"
                    fill="var(--text)"
                    fontSize="12"
                    fontFamily="monospace"
                  >
                    {p.id}
                  </text>
                  <text x={x} y={y + 14} textAnchor="middle" fill="var(--muted)" fontSize="11">
                    G{p.born} · F {format(p.fitness, 3)}
                  </text>
                </g>
              ))}
            </svg>
            <p className="hint">
              Exact parent IDs, limited to parents and grandparents. Repeated ancestors are drawn
              once per link. Click an ancestor to explore its lineage. Amber outlines indicate
              recorded mutations.
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
