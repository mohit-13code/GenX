import { useRef } from 'react';
import { ChevronDown, Download, RotateCcw, Settings2, Upload } from 'lucide-react';
import type { Config, ProblemId } from '../../engine/types';
import {
  compatibleConfig,
  defaultConfig,
  makeProblem,
  problemMeta,
  validateConfig,
} from '../../problems';
import { Badge, Field } from '../../components/Common';
import { download } from '../../utils/export';
const crossNames = {
  single: 'Single-point',
  two: 'Two-point',
  uniform: 'Uniform',
  order: 'Order crossover (OX)',
};
const mutationNames = {
  bit: 'Bit-flip',
  character: 'Character replacement',
  swap: 'Swap',
  inversion: 'Inversion',
};
export function Configuration({
  draft,
  setDraft,
  dirty,
  onApply,
  error,
  setError,
  editing,
  setEditing,
  expanded,
  onToggle,
}: {
  draft: Config;
  setDraft: (config: Config) => void;
  dirty: boolean;
  onApply: () => void;
  error: string;
  setError: (error: string) => void;
  editing: boolean;
  setEditing: (v: boolean) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  const file = useRef<HTMLInputElement>(null);
  const problem = makeProblem(draft);
  const update = <K extends keyof Config>(key: K, value: Config[K]) =>
    setDraft(compatibleConfig({ ...draft, [key]: value }));
  const number = (
    key: keyof Config,
    label: string,
    min: number,
    max: number,
    step = 1,
    tip?: string,
  ) => (
    <Field label={label} tip={tip}>
      <div className="range-field">
        <input
          aria-label={`${label} slider`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={Number(draft[key])}
          onChange={(e) => update(key, Number(e.target.value))}
        />
        <input
          aria-label={label}
          type="number"
          min={min}
          max={max}
          step={step}
          value={Number(draft[key])}
          onChange={(e) => update(key, Number(e.target.value))}
        />
      </div>
    </Field>
  );
  return (
    <aside className="configuration panel">
      <div className="panel-heading">
        <h3>
          <button
            className="setup-toggle"
            aria-label="Toggle experiment setup"
            aria-controls="experiment-config"
            aria-expanded={expanded}
            onClick={onToggle}
          >
            <Settings2 size={17} /> Experiment setup <ChevronDown size={15} />
          </button>
        </h3>
        <button
          className="icon-button"
          aria-label="Restore default configuration"
          title="Restore default configuration as a draft"
          onClick={() => setDraft(structuredClone(defaultConfig))}
        >
          <RotateCcw size={15} />
        </button>
      </div>
      <div className="config-body" id="experiment-config" hidden={!expanded}>
        <Field label="Optimization problem">
          <select
            aria-label="Optimization problem"
            value={draft.problem}
            onChange={(e) => {
              update('problem', e.target.value as ProblemId);
              setEditing(false);
            }}
          >
            {problemMeta.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="problem-description">{problem.description}</div>
        {draft.problem === 'function' && (
          <>
            <Field label="Objective function">
              <select
                aria-label="Objective function"
                value={draft.functionPreset}
                onChange={(e) =>
                  update('functionPreset', e.target.value as Config['functionPreset'])
                }
              >
                <option value="square">Maximize f(x) = x²</option>
                <option value="minimum">Minimize f(x) = (x − 3)²</option>
                <option value="sine">Maximize f(x) = x sin(x)</option>
                <option value="multimodal">Maximize sin(3x) + 0.4cos(7x) + 2</option>
              </select>
            </Field>
            <div className="paired-fields">
              <Field label="Domain minimum">
                <input
                  aria-label="Domain minimum"
                  type="number"
                  min="-100"
                  max="99"
                  value={draft.domainMin}
                  onChange={(e) => update('domainMin', Number(e.target.value))}
                />
              </Field>
              <Field label="Domain maximum">
                <input
                  aria-label="Domain maximum"
                  type="number"
                  min="-99"
                  max="100"
                  value={draft.domainMax}
                  onChange={(e) => update('domainMax', Number(e.target.value))}
                />
              </Field>
            </div>
            {number(
              'bits',
              'Chromosome bits',
              3,
              10,
              1,
              'Uniform discrete encoding. The default 5-bit domain 0–31 contains integers; other settings may encode fractional points.',
            )}
          </>
        )}
        {draft.problem === 'queens' && number('queens', 'Board size', 4, 16)}
        {draft.problem === 'phrase' && (
          <Field
            label="Target phrase"
            tip="1–40 printable Unicode code points; every target character is included in the mutation alphabet."
          >
            <input
              aria-label="Target phrase"
              value={draft.target}
              maxLength={80}
              onChange={(e) => update('target', e.target.value)}
            />
          </Field>
        )}
        {draft.problem === 'tsp' && (
          <>
            <button
              className={`button full ${editing ? 'primary' : 'secondary'}`}
              onClick={() => setEditing(!editing)}
            >
              {editing ? 'Finish editing map' : 'Edit cities on map'}{' '}
              <Badge tone="muted">{draft.cities.length}</Badge>
            </button>
            <small className="hint">
              City edits become active when you create a new experiment. Exact solver: up to 10
              cities.
            </small>
          </>
        )}
        {draft.problem === 'knapsack' && (
          <details className="instance-editor">
            <summary>Edit items & capacity</summary>
            <Field label="Capacity (kg)">
              <input
                aria-label="Capacity"
                type="number"
                min="1"
                max="500"
                value={draft.capacity}
                onChange={(e) => update('capacity', Number(e.target.value))}
              />
            </Field>
            <div className="item-edit-head">
              <span>Item</span>
              <span>kg</span>
              <span>Value</span>
            </div>
            {draft.items.map((item, i) => (
              <div className="item-edit-row" key={i}>
                {(['name', 'weight', 'value'] as const).map((key) => (
                  <input
                    key={key}
                    aria-label={`Item ${i + 1} ${key}`}
                    value={item[key]}
                    type={key === 'name' ? 'text' : 'number'}
                    min={key === 'weight' ? 1 : 0}
                    onChange={(e) =>
                      update(
                        'items',
                        draft.items.map((a, j) =>
                          j === i
                            ? {
                                ...a,
                                [key]: key === 'name' ? e.target.value : Number(e.target.value),
                              }
                            : a,
                        ),
                      )
                    }
                  />
                ))}
              </div>
            ))}
            <div className="button-row">
              <button
                className="button small"
                disabled={draft.items.length >= 20}
                onClick={() =>
                  update('items', [
                    ...draft.items,
                    { name: `Item ${draft.items.length + 1}`, weight: 1, value: 1 },
                  ])
                }
              >
                Add item
              </button>
              <button
                className="button small"
                disabled={draft.items.length <= 2}
                onClick={() => update('items', draft.items.slice(0, -1))}
              >
                Remove last
              </button>
            </div>
          </details>
        )}
        <div className="config-divider">
          <span>GENETIC PARAMETERS</span>
          <Badge tone="muted">{problem.representation}</Badge>
        </div>
        {number(
          'populationSize',
          'Population size',
          4,
          100,
          1,
          'Number of candidate solutions in every generation. History budget: population × generations ≤ 6,000.',
        )}
        {number('maxGenerations', 'Maximum generations', 1, 200)}
        {number(
          'crossoverRate',
          'Crossover probability',
          0,
          1,
          0.01,
          'Probability of recombining each parent pair. If skipped, children copy their respective parent.',
        )}
        {number(
          'mutationRate',
          'Mutation probability',
          0,
          1,
          0.01,
          'Probability checks are recorded. Mutation maintains representation validity.',
        )}
        <small className="hint mutation-hint">
          ↳ Applied{' '}
          {problem.representation === 'permutation' ? 'per chromosome' : 'independently per gene'}
        </small>
        <Field label="Selection method">
          <select
            aria-label="Selection method"
            value={draft.selection}
            onChange={(e) => update('selection', e.target.value as Config['selection'])}
          >
            <option value="tournament">Tournament selection</option>
            <option value="roulette">Roulette-wheel selection</option>
            <option value="rank">Rank-based selection</option>
          </select>
        </Field>
        <details className="advanced">
          <summary>Advanced parameters</summary>
          <Field label="Crossover operator">
            <select
              aria-label="Crossover operator"
              value={draft.crossover}
              onChange={(e) => update('crossover', e.target.value as Config['crossover'])}
            >
              {problem.crossover.map((k) => (
                <option key={k} value={k}>
                  {crossNames[k]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Mutation operator">
            <select
              aria-label="Mutation operator"
              value={draft.mutation}
              onChange={(e) => update('mutation', e.target.value as Config['mutation'])}
            >
              {problem.mutation.map((k) => (
                <option key={k} value={k}>
                  {mutationNames[k]}
                </option>
              ))}
            </select>
          </Field>
          {number('elitism', 'Elites preserved', 0, Math.max(1, draft.populationSize - 1))}
          {draft.selection === 'tournament' &&
            number('tournamentSize', 'Tournament size', 2, Math.max(2, draft.populationSize))}
          <Field
            label="Random seed"
            tip="Mulberry32. Identical inputs and seed produce identical events."
          >
            <input
              aria-label="Random seed"
              type="number"
              min="0"
              max="4294967295"
              value={draft.seed}
              onChange={(e) => update('seed', Number(e.target.value))}
            />
          </Field>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={draft.earlyStopping}
              onChange={(e) => update('earlyStopping', e.target.checked)}
            />
            Stop at optimum or stagnation
          </label>
          {number('stagnation', 'Stagnation threshold', 1, 200)}
          <small className="hint">
            All structural changes remain a draft until a new experiment starts.
          </small>
        </details>
        {error && (
          <div role="alert" className="error-message">
            {error}
          </div>
        )}
        <button className="button primary full" onClick={onApply}>
          {dirty ? 'Create new experiment' : 'Restart experiment'}
        </button>
        <div className="button-row">
          <button className="button small" onClick={() => download('genx-settings.json', draft)}>
            <Download size={14} />
            Settings
          </button>
          <button className="button small" onClick={() => file.current?.click()}>
            <Upload size={14} />
            Import
          </button>
        </div>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          hidden
          aria-label="Import configuration file"
          onChange={async (e) => {
            const selected = e.target.files?.[0];
            if (!selected) return;
            try {
              if (selected.size > 100000)
                throw new Error('Configuration file must be smaller than 100 KB.');
              const next = validateConfig(JSON.parse(await selected.text()));
              setDraft(next);
              setError('');
            } catch (error) {
              setError(error instanceof Error ? error.message : 'Invalid configuration.');
            }
            e.target.value = '';
          }}
        />
      </div>
    </aside>
  );
}
