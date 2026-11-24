import { bestIndividual } from '../engine/metrics';
import { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Dna,
  FlaskConical,
  GitBranch,
  Layers,
  Play,
  RotateCcw,
  ScanLine,
  Shuffle,
  Timer,
  TrendingUp,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Badge, format } from '../components/Common';
import { defaultConfig, problemMeta } from '../problems';
import { useExperiment } from '../hooks/useExperiment';
import { ProblemView } from '../visualizations/ProblemView';
import type { ProblemId } from '../engine/types';
import { GenomeRibbon } from '../components/chromosomes/GenomeRibbon';
const lifecycle = [
  {
    name: 'Initialize',
    text: 'Sample a reproducible population of candidate solutions.',
    icon: Layers,
  },
  {
    name: 'Evaluate',
    text: 'Decode every chromosome and calculate its actual fitness.',
    icon: Activity,
  },
  {
    name: 'Select',
    text: 'Use fitness to choose the parents of the next generation.',
    icon: ScanLine,
  },
  { name: 'Crossover', text: 'Recombine parent genes into valid offspring.', icon: GitBranch },
  {
    name: 'Mutate',
    text: 'Introduce new variation with recorded probability checks.',
    icon: Shuffle,
  },
  {
    name: 'Repeat',
    text: 'Preserve elites, replace the population and measure progress.',
    icon: RotateCcw,
  },
];
export function Home({ navigate }: { navigate: (page: string, problem?: ProblemId) => void }) {
  const [stage, setStage] = useState(0);
  const experiment = useExperiment({ ...defaultConfig, maxGenerations: 100, earlyStopping: false });
  const e = experiment.event,
    best = bestIndividual(e.population, experiment.config);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="home-page">
      <section className="hero">
        <div className="hero-copy">
          <Badge tone="green">
            <span className="live-dot" />
            THE INTERACTIVE EVOLUTION LAB
          </Badge>
          <h1>
            Don’t just learn evolution.
            <span>Control it.</span>
          </h1>
          <p>
            Open the black box of genetic algorithms. Shape a population, trace its DNA and watch
            better solutions emerge.
          </p>
          <div className="hero-actions">
            <button className="button primary large" onClick={() => navigate('playground')}>
              <Play size={17} fill="currentColor" />
              Start evolving
            </button>
            <button className="button secondary large" onClick={() => navigate('learn')}>
              <Dna size={18} />
              Explore the algorithm
            </button>
          </div>
          <div className="hero-facts">
            <span>
              <CheckCircle2 size={15} />
              Real computation
            </span>
            <span>
              <CheckCircle2 size={15} />
              No login needed
            </span>
            <span>
              <CheckCircle2 size={15} />
              Reproducible by seed
            </span>
          </div>
        </div>
        <div className="hero-demo">
          <div className="demo-window-bar">
            <FlaskConical size={15} />
            <span className="mono">experiment_042.genx</span>
            <Badge tone="green">LIVE ENGINE</Badge>
          </div>
          <div className="demo-heading">
            <span className="eyebrow">FUNCTION OPTIMIZATION / BINARY ENCODING</span>
            <h3>Follow the search for a better solution.</h3>
          </div>
          <ProblemView
            config={experiment.config}
            population={e.population}
            best={best}
            problem={experiment.problem}
            onSelect={() => navigate('playground')}
          />
          <div className="demo-metrics">
            <div>
              <span>GENERATION</span>
              <strong>{String(e.generation).padStart(3, '0')}</strong>
            </div>
            <div>
              <span>BEST FITNESS</span>
              <strong className="text-accent">{format(e.stats.best)}</strong>
            </div>
            <div>
              <span>DIVERSITY</span>
              <strong>{format(e.stats.diversity * 100, 1)}%</strong>
            </div>
            <button
              className="button secondary"
              onClick={() =>
                e.stage === 'stop'
                  ? experiment.restart(experiment.config)
                  : experiment.advance('generation')
              }
            >
              {e.stage === 'stop' ? <RotateCcw size={15} /> : <Play size={15} />}Evolve once
            </button>
          </div>
          <div className="floating-genome">
            <div>
              <span className="eyebrow">FITTEST CHROMOSOME</span>
              <code>{best.id}</code>
            </div>
            <GenomeRibbon individual={best} problem={experiment.problem} />
            <span>{best.decoded}</span>
          </div>
        </div>
      </section>
      <section className="home-lifecycle">
        <div>
          <span className="eyebrow">A SIMPLE IDEA. A POWERFUL SEARCH.</span>
          <h2>
            Small changes.
            <br />
            Extraordinary possibilities.
          </h2>
          <p>
            A genetic algorithm improves a population of candidate solutions using selection,
            crossover and mutation. Explore each operation, then watch it happen.
          </p>
        </div>
        <div className="lifecycle-interactive">
          <div className="lifecycle-buttons">
            {lifecycle.map((s, i) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.name}
                  className={stage === i ? 'active' : ''}
                  onClick={() => setStage(i)}
                >
                  <Icon size={21} />
                  <span>{s.name}</span>
                </button>
              );
            })}
          </div>
          <div className="lifecycle-detail">
            <Badge tone="violet">{lifecycle[stage].name}</Badge>
            <p>{lifecycle[stage].text}</p>
            <button className="text-button" onClick={() => navigate('learn')}>
              See the mathematics
            </button>
          </div>
        </div>
      </section>
      <section className="problem-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">FIVE WAYS TO EXPERIMENT</span>
            <h2>Pick your evolutionary challenge.</h2>
          </div>
          <p>
            Different representations.
            <br />
            The same powerful principle.
          </p>
        </div>
        <div className="problem-cards">
          {problemMeta.map((p, i) => (
            <button
              key={p.id}
              className={`problem-card problem-card-${i}`}
              onClick={() => navigate('playground', p.id)}
            >
              <span className="problem-symbol">{p.symbol}</span>
              <span className="eyebrow">{p.short}</span>
              <h3>{p.name}</h3>
              <p>{p.description}</p>
              <span className="card-action">
                Open experiment <FlaskConical size={15} />
              </span>
            </button>
          ))}
        </div>
      </section>
      <section className="capabilities">
        <div className="feature-intro">
          <span className="eyebrow">GO BEYOND THE FINAL ANSWER</span>
          <h2>
            The interesting part
            <br />
            is how you get there.
          </h2>
          <p>
            Open the black box. Every individual, every decision and every generation is yours to
            inspect.
          </p>
        </div>
        {[
          {
            icon: Dna,
            title: 'DNA Microscope',
            text: 'Inspect genes, decoded values, mutation positions and recorded parentage.',
          },
          {
            icon: Timer,
            title: 'Evolution Time Machine',
            text: 'Rewind an experiment and restore its exact population and random decisions.',
          },
          {
            icon: TrendingUp,
            title: 'Evolution Battle',
            text: 'Compare configurations on the same problem and seeded starting stream.',
          },
        ].map((f) => (
          <div className="feature-card" key={f.title}>
            <f.icon size={26} />
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </div>
        ))}
      </section>
      <section className="verification-cta">
        <div className="verification-icon">
          <FlaskConical size={30} />
        </div>
        <div>
          <Badge tone="green">INDEPENDENTLY CHECKABLE</Badge>
          <h2>Beautiful science needs correct mathematics.</h2>
          <p>
            Follow a complete hand-calculated generation, then compare every result against the
            engine.
          </p>
        </div>
        <button className="button primary" onClick={() => navigate('verification')}>
          Enter Verification Lab
        </button>
      </section>
    </motion.div>
  );
}
