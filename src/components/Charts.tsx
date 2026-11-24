import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SimulationEvent } from '../engine/types';
import { historyStats } from '../engine/history';
export { historyStats } from '../engine/history';
import { format } from './Common';
import { useId } from 'react';
export function FitnessChart({ events, cursor }: { events: SimulationEvent[]; cursor?: number }) {
  const data = historyStats(events, cursor);
  const chartId = useId().replace(/:/g, '');
  return (
    <>
      <div
        className="chart"
        role="img"
        aria-label="Fitness convergence chart from recorded generation statistics"
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 15, right: 15, left: 1, bottom: 0 }}>
            <defs>
              <linearGradient id={`${chartId}-fitness-fill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.12} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis
              dataKey="generation"
              type="number"
              domain={[0, Math.max(4, data.at(-1)?.generation ?? 0)]}
              allowDecimals={false}
              tick={{ fill: 'var(--muted)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              tick={{ fill: 'var(--muted)', fontSize: 12 }}
              tickFormatter={(v) =>
                Number(v) > 0 && Number(v) < 0.01
                  ? Number(v).toExponential(1)
                  : format(Number(v), 2)
              }
              width={65}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                color: 'var(--text)',
              }}
              formatter={(value) => format(Number(value), 6)}
              labelFormatter={(value) => `Generation ${value}`}
            />
            <Area
              type="stepAfter"
              dataKey="bestEver"
              name="Best ever"
              stroke="transparent"
              fill={`url(#${chartId}-fitness-fill)`}
              isAnimationActive={false}
            />
            <Line
              type="stepAfter"
              dataKey="bestEver"
              name="Best ever"
              stroke="var(--accent)"
              strokeWidth={2.5}
              dot={data.length < 2}
              isAnimationActive={false}
            />
            <Line
              type="linear"
              dataKey="average"
              name="Average"
              stroke="var(--violet)"
              strokeWidth={1.8}
              dot={false}
              strokeDasharray="4 4"
              isAnimationActive={false}
            />
            <Line
              dataKey="worst"
              name="Worst"
              stroke="#64748b"
              dot={false}
              strokeWidth={1}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {data.length === 1 && (
        <p className="chart-empty-note">
          Generation 0 recorded. Advance the experiment to trace convergence.
        </p>
      )}
    </>
  );
}
