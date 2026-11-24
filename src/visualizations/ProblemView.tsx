import { useEffect, useId, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { Config, Individual, Problem } from '../engine/types';
import { decodeX, functionValue } from '../problems';
import { format } from '../components/Common';
export function ProblemView({
  config,
  population,
  best,
  bestEver,
  initial,
  selected,
  onSelect,
  problem,
  editing = false,
  onCities,
}: {
  config: Config;
  population: Individual[];
  best: Individual;
  bestEver?: Individual;
  initial?: Individual;
  selected?: string;
  onSelect?: (individual: Individual) => void;
  problem: Problem;
  editing?: boolean;
  onCities?: (cities: Config['cities']) => void;
}) {
  const [drag, setDrag] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [plotSize, setPlotSize] = useState({ width: 570, height: 300 });
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || config.problem !== 'function') return;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.max(280, Math.round(entry.contentRect.width)),
        height = Math.max(180, Math.round(entry.contentRect.height));
      setPlotSize((previous) =>
        previous.width === width && previous.height === height ? previous : { width, height },
      );
    });
    observer.observe(svg);
    return () => observer.disconnect();
  }, [config.problem]);
  const svgId = useId().replace(/:/g, '');
  const reduced = useReducedMotion();
  if (config.problem === 'function') {
    const left = 72,
      right = 24,
      top = 32,
      bottom = 48,
      plotWidth = plotSize.width - left - right,
      plotHeight = plotSize.height - top - bottom,
      baseline = plotSize.height - bottom;
    const frequency =
      config.functionPreset === 'multimodal' ? 7 : config.functionPreset === 'sine' ? 1 : 0;
    const sampleCount = Math.max(
      160,
      Math.ceil(((config.domainMax - config.domainMin) * frequency * 12) / (2 * Math.PI)) + 1,
    );
    const samples = Array.from({ length: sampleCount }, (_, i) => {
      const x = config.domainMin + (i / (sampleCount - 1)) * (config.domainMax - config.domainMin);
      return { x, y: functionValue(x, config.functionPreset) };
    });
    const values = [...samples.map((p) => p.y), ...population.map((p) => p.objective)],
      min = Math.min(0, ...values),
      max = Math.max(...values),
      range = max - min || 1;
    const px = (x: number) =>
        left + ((x - config.domainMin) / (config.domainMax - config.domainMin)) * plotWidth,
      py = (y: number) => baseline - ((y - min) / range) * plotHeight;
    const line = samples.map((p, i) => `${i ? 'L' : 'M'}${px(p.x)},${py(p.y)}`).join(' ');
    return (
      <div className="landscape-wrap">
        <div className="viz-caption">
          <span className="live-dot" />
          OBJECTIVE LANDSCAPE<span>Continuous guide · {2 ** config.bits} encoded candidates</span>
        </div>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${plotSize.width} ${plotSize.height}`}
          className="landscape"
          aria-label="Function landscape with current population"
        >
          <defs>
            <linearGradient id={`${svgId}-landscape-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity=".14" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
            <pattern id={`${svgId}-plot-grid`} width="47" height="43" patternUnits="userSpaceOnUse">
              <path d="M 47 0 L 0 0 0 43" fill="none" stroke="var(--grid)" strokeWidth=".6" />
            </pattern>
          </defs>
          <rect
            x={left}
            y={top}
            width={plotWidth}
            height={plotHeight}
            fill={`url(#${svgId}-plot-grid)`}
          />
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <text
                x={left - 12}
                y={py(min + t * range) + 4}
                textAnchor="end"
                className="axis-text"
              >
                {format(min + t * range, 1)}
              </text>
              <text
                x={left + t * plotWidth}
                y={plotSize.height - 26}
                textAnchor="middle"
                className="axis-text"
              >
                {format(config.domainMin + t * (config.domainMax - config.domainMin), 1)}
              </text>
            </g>
          ))}
          <path
            d={`${line} L${plotSize.width - right},${baseline} L${left},${baseline}Z`}
            fill={`url(#${svgId}-landscape-fill)`}
          />
          <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" />
          {[...population.filter((p) => p.id !== best.id), best].map((p, i) => {
            const x = px(decodeX(p.genes, config)),
              y = py(p.objective);
            const active = p.id === selected;
            return (
              <g
                key={p.id}
                tabIndex={0}
                role="button"
                aria-label={`Inspect chromosome ${p.id}`}
                onClick={() => onSelect?.(p)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSelect?.(p);
                }}
                className="population-point"
              >
                <motion.circle
                  cx={x}
                  cy={y}
                  r={active ? 8 : 5}
                  fill={p.id === best.id ? 'var(--gold)' : 'var(--accent)'}
                  stroke="var(--bg)"
                  strokeWidth="2"
                  opacity={0.6 + (0.4 * i) / population.length}
                  initial={reduced ? false : { r: 0 }}
                  animate={{ r: active ? 8 : 5 }}
                  transition={{ duration: reduced ? 0 : 0.24 }}
                />
                <title>
                  {p.id}: {p.decoded}, objective {format(p.objective)}
                </title>
              </g>
            );
          })}
          <line
            x1={px(best.details.x)}
            x2={px(best.details.x)}
            y1={py(best.objective)}
            y2={baseline}
            stroke="var(--gold)"
            strokeDasharray="4 5"
            opacity=".6"
          />
          <text
            x={left + plotWidth / 2}
            y={plotSize.height - 7}
            className="axis-text"
            textAnchor="middle"
          >
            SEARCH SPACE · x
          </text>
          <text
            x="12"
            y={top + plotHeight / 2}
            transform={`rotate(-90 12 ${top + plotHeight / 2})`}
            className="axis-text"
            textAnchor="middle"
          >
            OBJECTIVE f(x)
          </text>
        </svg>
        <div className="viz-footer">
          <span>
            <i className="dot teal" />
            Population
          </span>
          <span>
            <i className="dot amber-dot" />
            Current best
          </span>
          <strong>
            {best.decoded} · f(x) = {format(best.objective)}
          </strong>
        </div>
      </div>
    );
  }
  if (config.problem === 'tsp') {
    const cities = config.cities,
      route = (p: Individual) =>
        [...p.genes, p.genes[0]]
          .map((g) => `${cities[Number(g)].x},${cities[Number(g)].y}`)
          .join(' ');
    const position = (event: { clientX: number; clientY: number }) => {
      const rect = svgRef.current!.getBoundingClientRect();
      return {
        x: Math.max(10, Math.min(530, ((event.clientX - rect.left) / rect.width) * 540)),
        y: Math.max(10, Math.min(350, ((event.clientY - rect.top) / rect.height) * 360)),
      };
    };
    return (
      <div className="route-wrap">
        <div className="viz-caption">
          {editing ? 'EDIT PROBLEM INSTANCE' : 'CLOSED-TOUR SEARCH'}
          <span>{cities.length} cities · Euclidean distance</span>
        </div>
        <svg
          ref={svgRef}
          viewBox="0 0 540 360"
          className="route-map"
          aria-label="Editable city map"
          onPointerMove={(e) => {
            if (editing && drag !== null)
              onCities?.(cities.map((city, i) => (i === drag ? position(e) : city)));
          }}
          onPointerUp={() => setDrag(null)}
          onClick={(e) => {
            if (editing && drag === null && e.target === e.currentTarget && cities.length < 20)
              onCities?.([...cities, position(e)]);
          }}
        >
          <defs>
            <pattern id="city-grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="15" cy="15" r=".8" fill="var(--border)" />
            </pattern>
          </defs>
          <rect width="540" height="360" fill="url(#city-grid)" pointerEvents="none" />
          {!editing && (
            <>
              <polyline
                points={route(initial ?? population[0])}
                stroke="var(--muted)"
                strokeWidth="1"
                fill="none"
                strokeDasharray="4 5"
                opacity=".4"
              />
              {bestEver && (
                <polyline
                  points={route(bestEver)}
                  stroke="var(--violet)"
                  strokeWidth="5"
                  fill="none"
                  opacity=".45"
                />
              )}
              <motion.polyline
                key={best.id}
                points={route(best)}
                stroke="var(--accent)"
                strokeWidth="2.5"
                fill="none"
                initial={reduced ? false : { opacity: 0.3, pathLength: 0 }}
                animate={{ opacity: 1, pathLength: 1 }}
                transition={{ duration: reduced ? 0 : 0.3 }}
              />
            </>
          )}
          {cities.map((city, i) => (
            <g
              key={i}
              onPointerDown={(e) => {
                if (editing) {
                  e.stopPropagation();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setDrag(i);
                }
              }}
              onDoubleClick={() => {
                if (editing && cities.length > 3) onCities?.(cities.filter((_, j) => j !== i));
              }}
              style={{ cursor: editing ? 'grab' : 'default' }}
            >
              <circle
                cx={city.x}
                cy={city.y}
                r="15"
                fill="var(--surface)"
                stroke={i === 0 ? 'var(--gold)' : 'var(--accent)'}
                strokeWidth="2"
              />
              <text x={city.x} y={city.y + 4} textAnchor="middle" className="city-text">
                {i + 1}
              </text>
            </g>
          ))}
        </svg>
        <div className="viz-footer">
          <span>
            <i className="dot teal" />
            {editing ? 'Click to add · drag to move · double-click to remove' : 'Current route'}
          </span>
          {!editing && (
            <strong>
              {format(best.objective)} units · returns to city {Number(best.genes[0]) + 1}
            </strong>
          )}
        </div>
        {!editing && (
          <div className="route-legend">
            <span>Dashed: initial route</span>
            <span>Teal: current best</span>
            <span>Violet: best ever</span>
          </div>
        )}
      </div>
    );
  }
  if (config.problem === 'queens') {
    const n = config.queens,
      cell = 300 / n,
      lines: { a: number; b: number }[] = [];
    for (let a = 0; a < n; a++)
      for (let b = a + 1; b < n; b++)
        if (Math.abs(Number(best.genes[a]) - Number(best.genes[b])) === b - a) lines.push({ a, b });
    const bad = new Set(lines.flatMap((l) => [l.a, l.b]));
    return (
      <div className="queens-wrap">
        <svg
          viewBox="0 0 340 340"
          className="chessboard"
          aria-label={`Queen board, ${best.objective} attacking diagonal pairs`}
        >
          {Array.from({ length: n * n }, (_, i) => {
            const x = i % n,
              y = Math.floor(i / n);
            return (
              <rect
                key={i}
                x={20 + x * cell}
                y={20 + y * cell}
                width={cell}
                height={cell}
                fill={(x + y) % 2 ? 'var(--board-dark)' : 'var(--board-light)'}
              />
            );
          })}
          {lines.map(({ a, b }) => (
            <line
              key={`${a}-${b}`}
              x1={20 + (a + 0.5) * cell}
              y1={20 + (Number(best.genes[a]) + 0.5) * cell}
              x2={20 + (b + 0.5) * cell}
              y2={20 + (Number(best.genes[b]) + 0.5) * cell}
              stroke="var(--red)"
              strokeWidth="1.5"
              opacity=".7"
            />
          ))}
          {best.genes.map((row, col) => (
            <text
              key={col}
              x={20 + (col + 0.5) * cell}
              y={20 + (Number(row) + 0.73) * cell}
              fontSize={cell * 0.8}
              textAnchor="middle"
              fill={bad.has(col) ? 'var(--red)' : 'var(--accent)'}
            >
              ♛
            </text>
          ))}
        </svg>
        <div className="viz-footer">
          <span>
            {best.objective === 0
              ? 'Valid solution · no attacks'
              : `${best.objective} attacking diagonal pairs`}
          </span>
          <strong>
            {n} × {n} board
          </strong>
        </div>
      </div>
    );
  }
  if (config.problem === 'knapsack')
    return (
      <div className="knapsack-view">
        <div className="viz-caption">
          PACKING STRATEGY
          <span>{best.feasible ? 'Feasible solution' : 'Over capacity · fitness = 0'}</span>
        </div>
        <div className="item-grid">
          {config.items.map((item, i) => (
            <div key={i} className={`item-card ${best.genes[i] === 1 ? 'packed' : ''}`}>
              <span>{best.genes[i] === 1 ? '●' : '○'}</span>
              <strong>{item.name}</strong>
              <small>
                {item.weight} kg <b>·</b> {item.value} value
              </small>
            </div>
          ))}
        </div>
        <div className="capacity-label">
          <span>Carrying capacity</span>
          <strong>
            {best.details.weight} / {config.capacity} kg
          </strong>
        </div>
        <div className="meter">
          <span
            style={{
              width: `${Math.min(100, (best.details.weight / config.capacity) * 100)}%`,
              background: best.feasible ? 'var(--accent)' : 'var(--red)',
            }}
          />
        </div>
        <div className="viz-footer">
          <span>Total value</span>
          <strong>{best.details.value}</strong>
        </div>
      </div>
    );
  const target = Array.from(config.target);
  return (
    <div className="phrase-view">
      <span className="eyebrow">TARGET SEQUENCE</span>
      <div className="phrase-target">{config.target}</div>
      <span className="eyebrow">BEST EVOLVING SEQUENCE</span>
      <div className="phrase-genes">
        {best.genes.map((g, i) => (
          <span
            className={g === target[i] ? 'match' : ''}
            key={i}
            title={problem.geneMeaning(g, i)}
          >
            {String(g) === ' ' ? '␣' : g}
          </span>
        ))}
      </div>
      <div className="meter">
        <span style={{ width: `${best.details.percentage}%` }} />
      </div>
      <div className="viz-footer">
        <span>
          {best.details.matches} of {target.length} characters match
        </span>
        <strong>{format(best.details.percentage, 1)}%</strong>
      </div>
    </div>
  );
}
export function GenomeCanvas({ population }: { population: Individual[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 440 * dpr;
    canvas.height = 70 * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, 440, 70);
    const rows = Math.min(20, population.length),
      cols = population[0]?.genes.length ?? 1;
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const g = population[y].genes[x],
          hash = typeof g === 'number' ? g : (String(g).codePointAt(0) ?? 0);
        ctx.fillStyle = `hsla(${155 + ((hash * 23) % 100)},65%,${32 + ((hash * 11) % 35)}%,0.9)`;
        ctx.fillRect((x * 440) / cols, (y * 70) / rows, 440 / cols - 1, 70 / rows - 1);
      }
  }, [population]);
  return (
    <canvas
      ref={ref}
      className="genome-canvas"
      aria-label="Gene variation heatmap: up to 20 individuals; each column is a gene"
      role="img"
    />
  );
}
