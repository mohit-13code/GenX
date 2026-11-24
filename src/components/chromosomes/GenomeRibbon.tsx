import { motion, useReducedMotion } from 'motion/react';
import type { Individual, Problem } from '../../engine/types';

export function GenomeRibbon({
  individual,
  problem,
  limit,
  indexed = false,
  cuts = [],
  animate = false,
}: {
  individual: Individual;
  problem: Problem;
  limit?: number;
  indexed?: boolean;
  cuts?: number[];
  animate?: boolean;
}) {
  const reduced = useReducedMotion();
  const shown = individual.genes.slice(0, limit ?? individual.genes.length);
  return (
    <div
      className={`genome-ribbon ${indexed ? 'indexed' : ''}`}
      aria-label={`Chromosome ${individual.id}: ${individual.genes.join(' ')}`}
    >
      {shown.map((gene, index) => (
        <motion.span
          key={`${index}:${gene}:${individual.mutations.includes(index)}`}
          className={`gene-cell ${individual.mutations.includes(index) ? 'gene-mutated' : individual.sources[index] === undefined ? 'gene-unassigned' : individual.sources[index] === 1 ? 'gene-parent-b' : 'gene-parent-a'} ${cuts.includes(index) ? 'gene-cut' : ''}`}
          title={problem.geneMeaning(gene, index)}
          aria-label={problem.geneMeaning(gene, index)}
          tabIndex={indexed ? 0 : undefined}
          initial={animate && !reduced ? { opacity: 0, y: 5 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: reduced ? 0 : 0.2,
            delay: reduced ? 0 : Math.min(index * 0.015, 0.15),
          }}
        >
          <span>{gene === ' ' ? '␣' : gene}</span>
          {indexed && <small>{index + 1}</small>}
        </motion.span>
      ))}
      {shown.length < individual.genes.length && (
        <span className="gene-more" title={`${individual.genes.length - shown.length} more genes`}>
          +{individual.genes.length - shown.length}
        </span>
      )}
    </div>
  );
}
