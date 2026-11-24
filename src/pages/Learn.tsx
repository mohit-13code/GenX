import { useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, Lightbulb, Shuffle } from 'lucide-react';
import { Badge, Field, Formula, Panel } from '../components/Common';
import { recombine, mutate } from '../engine/operators';
import { scripted } from '../engine/random';
import { defaultConfig, makeProblem } from '../problems';
const lessons = [
  {
    title: 'From genes to solutions',
    tag: 'Representation',
    formula: 'x=\\sum_{i=0}^{L-1} b_i 2^{L-1-i}',
    text: 'A chromosome encodes a candidate solution. Five binary genes represent integers 0–31. A permutation represents a route or one unique queen row per column. A character chromosome directly represents a phrase. Representation determines which operators are valid.',
  },
  {
    title: 'Objective is not always fitness',
    tag: 'Evaluation',
    formula: 'F(c)=\\frac{1}{1+f(c)}\\quad\\text{for nonnegative minimization}',
    text: 'The objective measures the problem itself, such as tour distance. Selection rewards higher fitness. TSP and quadratic minimization use 1/(1+objective); N-Queens uses total pairs minus attacking pairs. Square, multimodal and phrase tasks use direct fitness; signed x sin(x) uses a fixed positive shift based on the domain. Infeasible knapsacks receive fitness zero.',
  },
  {
    title: 'Choosing who gets to reproduce',
    tag: 'Selection',
    formula: 'p_i=\\frac{F_i}{\\sum_j F_j}',
    text: 'Roulette-wheel selection allocates probability proportional to nonnegative fitness. If every fitness is zero, the fallback is uniform. Tournament selection samples candidates with replacement and chooses their maximum fitness. Rank selection weights sorted rank, sharing the average rank among ties.',
  },
  {
    title: 'Mixing useful building blocks',
    tag: 'Crossover',
    formula: '(a_1\\ldots a_k b_{k+1}\\ldots b_L)',
    text: 'Single-point crossover exchanges suffixes after one boundary. Two-point exchanges a segment. Uniform independently chooses a parent at each gene. Permutations require order crossover (OX): retain a segment, then fill unused values in the other parent’s cyclic order. Ordinary binary crossover would create invalid tours.',
  },
  {
    title: 'Introducing something new',
    tag: 'Mutation',
    formula: 'r_i<p_m,\\quad r_i\\sim U[0,1)',
    text: 'Binary and phrase mutation check each gene independently. A five-bit chromosome with per-gene probability 0.1 has probability 1 − 0.9⁵ ≈ 0.40951 of at least one mutation. Swap and inversion instead check once per permutation chromosome and then choose distinct positions.',
  },
  {
    title: 'Protecting progress without losing variation',
    tag: 'Elitism & diversity',
    formula: 'D=\\frac{\\sum_{i<j}d_H(c_i,c_j)}{L\\binom{N}{2}}',
    text: 'Elitism copies the strongest chromosomes unchanged into the next generation. Too much elitism can reduce exploration. GenX measures normalized positional Hamming diversity for all representations, including permutations. Low diversity suggests possible premature convergence; it does not prove it.',
  },
  {
    title: 'Reproduction you can reproduce',
    tag: 'Determinism',
    formula: 's\\leftarrow(s+\\mathtt{0x6D2B79F5})\\bmod 2^{32}',
    text: 'GenX uses the Mulberry32 seeded pseudorandom generator. The same config, data and seed yield the same decisions. Every generated event is retained; moving backward restores recorded state rather than drawing new random values. Playback speed only controls when an event is displayed.',
  },
  {
    title: 'Knowing when to stop',
    tag: 'Termination',
    formula:
      '\\mathrm{stop}=\\mathrm{limit}\\lor(\\mathrm{earlyStopping}\\land(\\mathrm{target}\\lor\\mathrm{stagnation}))',
    text: 'The generation limit always applies. Optional early stopping checks an independently known discrete optimum or a stagnation threshold. A limit or stagnation stop does not prove global optimality. Function optima are exhaustive over encoded points, not claimed as exact continuous solutions.',
  },
];
export function Learn() {
  const [cut, setCut] = useState(3),
    [flips, setFlips] = useState<number[]>([]),
    [prediction, setPrediction] = useState(''),
    [reveal, setReveal] = useState(false);
  const parents = [
    [0, 1, 1, 0, 1],
    [1, 1, 0, 0, 0],
  ];
  const result = useMemo(() => {
    const crossed = recombine(parents[0], parents[1], 'single', scripted([]), [cut]);
    const child = mutate(
      crossed.children[0],
      'bit',
      0.5,
      scripted(Array.from({ length: 5 }, (_, i) => (flips.includes(i) ? 0 : 0.9))),
    );
    return {
      ...child,
      crossed: crossed.children[0],
      ...makeProblem(defaultConfig).evaluate(child.genes),
    };
  }, [cut, flips]);
  return (
    <div className="content-page learn-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">OPEN THE BLACK BOX</span>
          <h1>
            Learn by evolving<span className="heading-period">.</span>
          </h1>
          <p>A practical field guide to the mathematics behind the laboratory.</p>
        </div>
        <Badge tone="violet">
          <BookOpen size={15} />
          Beginner friendly, mathematically precise
        </Badge>
      </div>
      <div className="learn-grid">
        {lessons.map((lesson, i) => (
          <Panel
            key={lesson.title}
            title={lesson.title}
            eyebrow={lesson.tag}
            aside={<span className="lesson-number">{String(i + 1).padStart(2, '0')}</span>}
          >
            <p>{lesson.text}</p>
            <Formula value={lesson.formula} />
          </Panel>
        ))}
      </div>
      <Panel
        title="Your turn: breed a chromosome"
        eyebrow="MANUAL EVOLUTION & PREDICTION"
        aside={<Shuffle size={20} />}
        className="manual-lab"
      >
        <p>
          Choose a single-point crossover boundary, then explicitly flip any genes. These manual
          decisions call the production crossover, mutation and fitness functions. They are separate
          from automatic random playback.
        </p>
        <div className="manual-columns">
          <div>
            <div className="manual-parent">
              <Badge>Parent A</Badge>
              <code>0 1 1 0 1</code>
              <span>x = 13</span>
            </div>
            <div className="manual-parent">
              <Badge tone="violet">Parent B</Badge>
              <code>1 1 0 0 0</code>
              <span>x = 24</span>
            </div>
            <Field label={`Crossover after gene ${cut}`}>
              <input
                aria-label="Manual crossover point"
                type="range"
                min="1"
                max="4"
                value={cut}
                onChange={(e) => {
                  setCut(Number(e.target.value));
                  setReveal(false);
                }}
              />
            </Field>
            <span className="eyebrow">CHOOSE MANUAL BIT FLIPS</span>
            <div className="manual-bits">
              {result.crossed.map((g, i) => (
                <button
                  key={i}
                  className={flips.includes(i) ? 'mutated' : ''}
                  onClick={() => {
                    setFlips(flips.includes(i) ? flips.filter((x) => x !== i) : [...flips, i]);
                    setReveal(false);
                  }}
                  aria-label={`Toggle mutation at gene ${i + 1}`}
                  aria-pressed={flips.includes(i)}
                >
                  {g}
                  <small>{i + 1}</small>
                </button>
              ))}
            </div>
          </div>
          <div className="prediction-card">
            <Lightbulb size={25} />
            <h3>Predict the child’s fitness.</h3>
            <p>Decode the first child after your chosen bit flips, then square x.</p>
            <Field label="Predicted f(x)">
              <input
                aria-label="Predicted fitness"
                type="number"
                min="0"
                max="961"
                value={prediction}
                onChange={(e) => {
                  setPrediction(e.target.value);
                  setReveal(false);
                }}
              />
            </Field>
            <button className="button primary" onClick={() => setReveal(true)}>
              Reveal computed result
            </button>
            {reveal && (
              <div className="prediction-result">
                <Badge
                  tone={
                    Number(prediction) === result.fitness && prediction !== '' ? 'green' : 'amber'
                  }
                >
                  {Number(prediction) === result.fitness && prediction !== '' ? (
                    <>
                      <CheckCircle2 size={14} />
                      Correct prediction
                    </>
                  ) : (
                    'Follow the calculation'
                  )}
                </Badge>
                <code>
                  {result.genes.join('')} → {result.decoded} → f(x) = {result.fitness}
                </code>
                <p>
                  First child takes the first {cut} genes from A and the suffix from B. Flip
                  positions {flips.length ? flips.map((i) => i + 1).join(', ') : 'none'}. The
                  resulting integer is {Math.sqrt(result.fitness)}.
                </p>
              </div>
            )}
          </div>
        </div>
      </Panel>
      <Panel title="Research & further reading">
        <p>
          These sources informed the algorithm explanations and educational approach. GenX’s engine,
          interface and graphics are original implementations.
        </p>
        <div className="reference-links">
          <a
            href="https://optimization.cbe.cornell.edu/index.php?title=Genetic_algorithm"
            target="_blank"
            rel="noreferrer"
          >
            Cornell · Computational Optimization Open Textbook
          </a>
          <a
            href="https://mude.citg.tudelft.nl/book/2025/optimization/genetic_algorithm.html"
            target="_blank"
            rel="noreferrer"
          >
            TU Delft · MUDE Genetic Algorithm chapter
          </a>
          <a
            href="https://www.civil.iitb.ac.in/tvm/nptel/703_GAs.html"
            target="_blank"
            rel="noreferrer"
          >
            IIT Bombay · Genetic Algorithms lecture notes
          </a>
          <a href="https://visualgo.net/en/" target="_blank" rel="noreferrer">
            VisuAlgo · Educational visualization
          </a>
          <a
            href="https://optimization-algorithms-book.github.io/Code-Listings/Chapter%208/GA_Lab.html"
            target="_blank"
            rel="noreferrer"
          >
            Alaa Khamis · Genetic Algorithm Lab
          </a>
        </div>
      </Panel>
    </div>
  );
}
