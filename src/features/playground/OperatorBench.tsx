import { bestIndividual } from '../../engine/metrics';
import { Dna, ScanLine, GitMerge, Shuffle, CheckCircle2 } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { Config, Individual, Problem, SimulationEvent } from '../../engine/types';
import { format } from '../../components/Common';
import { GenomeRibbon } from '../../components/chromosomes/GenomeRibbon';

export function OperatorBench({
  event,
  config,
  problem,
  onInspect,
}: {
  event: SimulationEvent;
  config: Config;
  problem: Problem;
  onInspect: (individual: Individual) => void;
}) {
  const reduced = useReducedMotion();
  const operation = ['select', 'crossover', 'mutate', 'validate', 'offspring', 'elites'].includes(
    event.stage,
  );
  const inputs = operation ? event.inputs.slice(0, 2) : [];
  const outputs = event.outputs.length > 0 && event.outputs.length <= 2 ? event.outputs : [];
  const best = bestIndividual(event.population, config);
  const title =
    event.stage === 'select'
      ? 'Selection under the microscope'
      : event.stage === 'crossover'
        ? 'Recombining the next generation'
        : event.stage === 'mutate'
          ? 'A small change. A new possibility.'
          : outputs.length
            ? 'Recorded offspring'
            : 'Inside the chromosome';
  const skipped = event.stage === 'crossover' && event.operatorApplied === false;
  const check = event.random.find((r) => r.label === 'crossover probability check');
  const Icon =
    event.stage === 'select'
      ? ScanLine
      : event.stage === 'crossover'
        ? GitMerge
        : event.stage === 'mutate'
          ? Shuffle
          : Dna;
  const row = (p: Individual, label: string, child = false) => (
    <div className={`bench-chromosome ${child ? 'bench-child' : ''}`} key={`${label}-${p.id}`}>
      <div className="bench-identity">
        <span>{label}</span>
        <button className="text-button" onClick={() => onInspect(p)} title={`Inspect ${p.id}`}>
          {p.id}
          <ScanLine size={13} />
        </button>
      </div>
      <GenomeRibbon
        individual={p}
        problem={problem}
        indexed
        cuts={event.stage === 'crossover' ? event.points : []}
        animate
      />
      <div className="bench-phenotype">
        <span>{p.decoded}</span>
        <span>
          F <b>{format(p.fitness, 6)}</b>
        </span>
      </div>
    </div>
  );
  return (
    <section className="operator-bench" aria-label="Recorded genetic operation">
      <header>
        <div>
          <span className="eyebrow">DNA WORKBENCH</span>
          <h3>
            <Icon size={17} />
            {title}
          </h3>
        </div>
        <span className={`operation-state ${skipped ? 'skipped' : ''}`}>
          {skipped ? 'Crossover skipped' : operation ? 'Recorded operation' : 'Current fittest'}
        </span>
      </header>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={event.id}
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.1 }}
        >
          <div className="bench-rows">
            {inputs.map((p, i) =>
              row(
                p,
                event.stage === 'mutate'
                  ? `Before mutation ${i + 1}`
                  : event.stage === 'select'
                    ? 'Selected parent'
                    : `Parent ${i === 0 ? 'A' : 'B'}`,
              ),
            )}
            {inputs.length > 0 && outputs.length > 0 && (
              <div className="recombination-bridge" aria-hidden="true">
                <span />
                <GitMerge size={16} />
                <span />
              </div>
            )}
            {outputs.length > 0
              ? outputs.map((p, i) => row(p, `Recorded output ${i + 1}`, true))
              : !inputs.length && row(best, 'Best in current population')}
          </div>
          <footer>
            {operation ? (
              <>
                <CheckCircle2 size={13} />
                <span>
                  {event.stage === 'mutate'
                    ? `${event.outputs.reduce((n, p) => n + p.mutations.length, 0)} changed positions · ${problem.representation === 'permutation' ? 'per chromosome' : 'per gene'} probability ${config.mutationRate}`
                    : event.stage === 'crossover'
                      ? `p꜀ ${config.crossoverRate}${check ? ` · recorded r ${check.value}` : ''}`
                      : event.inputs.length
                        ? `${event.inputs.length} recorded input${event.inputs.length === 1 ? '' : 's'} · generation ${event.generation}`
                        : 'All values come from the recorded event.'}
                </span>
              </>
            ) : (
              <>
                <ScanLine size={13} />
                <span>
                  Hover a gene to decode its meaning. Select the ID to inspect its ancestry.
                </span>
              </>
            )}
          </footer>
        </motion.div>
      </AnimatePresence>
      <div className="gene-key">
        <span>
          <i className="gene-key-a" />
          Parent A
        </span>
        <span>
          <i className="gene-key-b" />
          Parent B
        </span>
        <span>
          <i className="gene-key-m" />
          Mutation
        </span>
        <span>Positions start at 1</span>
      </div>
    </section>
  );
}
