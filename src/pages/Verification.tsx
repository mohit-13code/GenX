import { useState } from 'react';
import { Check, CheckCircle2, FlaskConical, Play, ShieldCheck } from 'lucide-react';
import { Badge, Formula, Panel } from '../components/Common';
import { hand, verify } from '../engine/verification';
export function Verification() {
  const [result, setResult] = useState<ReturnType<typeof verify> | null>(null);
  return (
    <div className="content-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">TRUST, THROUGH REPRODUCTION</span>
          <h1>
            Verification Lab<span className="heading-period">.</span>
          </h1>
          <p>
            One independently calculated generation. Every operation checked against the engine.
          </p>
        </div>
        <button className="button primary" onClick={() => setResult(verify())}>
          <Play size={16} />
          Run verification
        </button>
      </div>
      <div className="verification-overview">
        <Panel title="The controlled experiment" aside={<FlaskConical size={20} />}>
          <Formula value="\\max_{x\\in\\{0,\\ldots,31\\}}f(x)=x^2" />
          <div className="verification-settings">
            <Badge tone="muted">5-bit binary</Badge>
            <Badge tone="muted">Population 4</Badge>
            <Badge tone="muted">Roulette selection</Badge>
            <Badge tone="muted">Single-point crossover</Badge>
            <Badge tone="muted">p꜀ = 1.0</Badge>
            <Badge tone="muted">pₘ = 0.1 / gene</Badge>
            <Badge tone="muted">No elitism</Badge>
          </div>
          <p>
            Scripted random decisions isolate algorithm correctness from the seeded PRNG. The
            complete production state machine runs this fixture, including replacement and
            termination.
          </p>
        </Panel>
        <Panel title="Verification status" className="verification-status">
          {result ? (
            <>
              <CheckCircle2 size={44} className={result.passed ? 'text-accent' : 'text-error'} />
              <h2>{result.passed ? 'All checkpoints match' : 'A checkpoint differs'}</h2>
              <p>
                {result.checks.filter((c) => c.passed).length} / {result.checks.length} independent
                comparisons passed.
              </p>
            </>
          ) : (
            <>
              <ShieldCheck size={44} className="muted" />
              <h2>Ready to verify</h2>
              <p>
                Run the engine and compare its actual results with the expected calculations below.
              </p>
            </>
          )}
        </Panel>
      </div>
      <div className="verification-steps">
        <Panel title="Initial population & selection" eyebrow="HAND CALCULATION">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Individual</th>
                  <th>Chromosome</th>
                  <th>x</th>
                  <th>f(x)</th>
                  <th>Probability</th>
                  <th>Cumulative</th>
                </tr>
              </thead>
              <tbody>
                {hand.initial.map((s, i) => (
                  <tr key={s}>
                    <td>{'ABCD'[i]}</td>
                    <td>
                      <code>{s}</code>
                    </td>
                    <td>{hand.decimal[i]}</td>
                    <td>{hand.fitness[i]}</td>
                    <td>{hand.probabilities[i].toFixed(6)}</td>
                    <td>
                      {hand.probabilities
                        .slice(0, i + 1)
                        .reduce((a, b) => a + b, 0)
                        .toFixed(6)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Formula value="\\sum_i f_i=1170,\\quad \\bar f=292.5,\\quad p_i=\\frac{f_i}{1170}" />
          <p>
            Samples <code>0.10, 0.40, 0.68, 0.90</code> fall into A, B, C and D’s half-open
            cumulative intervals. Pair A with B and C with D.
          </p>
        </Panel>
        <Panel title="Recombination & mutation" eyebrow="HAND CALCULATION">
          <div className="verification-crosses">
            <div>
              <span>Pair A × B · cut after bit 3</span>
              <code>
                <b>011</b> | <em>01</em> &nbsp;×&nbsp; <em>110</em> | <b>00</b>
              </code>
              <code>
                Children: <b>01100</b> · <em>11001</em>
              </code>
            </div>
            <div>
              <span>Pair C × D · cut after bit 3</span>
              <code>
                <b>010</b> | <em>00</em> &nbsp;×&nbsp; <em>100</em> | <b>11</b>
              </code>
              <code>
                Children: <b>01011</b> · <em>10000</em>
              </code>
            </div>
          </div>
          <p>
            Child 1, gene 5 receives <code>r = 0.05 &lt; 0.10</code>, so its last bit flips. Every
            other mutation sample is 0.90 and fails the check.
          </p>
          <div className="mutation-example">
            <code>
              0110<span>0</span>
            </code>
            <span>becomes</span>
            <code>
              0110<b>1</b>
            </code>
          </div>
        </Panel>
        <Panel title="Generational replacement" eyebrow="EXPECTED RESULT">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Child</th>
                  <th>Binary</th>
                  <th>x</th>
                  <th>f(x)</th>
                </tr>
              </thead>
              <tbody>
                {hand.final.map((s, i) => (
                  <tr key={s}>
                    <td>{i + 1}</td>
                    <td>
                      <code>{s}</code>
                    </td>
                    <td>{Math.sqrt(hand.finalFitness[i])}</td>
                    <td>{hand.finalFitness[i]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Formula value="\\sum_i f_i=1171,\\quad \\bar f=292.75,\\quad \\max_i f_i=625" />
          <p>
            The best fitness improves from <strong>576 to 625</strong>. The global optimum{' '}
            <code>x = 31, f(x) = 961</code> has not been reached.
          </p>
        </Panel>
      </div>
      {result && (
        <Panel
          title="Engine versus independent expectations"
          aside={
            <Badge tone={result.passed ? 'green' : 'amber'}>
              {result.passed ? 'VERIFIED' : 'MISMATCH'}
            </Badge>
          }
        >
          <div className="verification-checks">
            {result.checks.map((check) => (
              <div key={check.name} className="verification-check">
                <Check size={19} className={check.passed ? 'text-accent' : 'text-error'} />
                <div>
                  <strong>{check.name}</strong>
                  <small>Expected: {JSON.stringify(check.expected)}</small>
                  <small>Computed: {JSON.stringify(check.actual)}</small>
                </div>
                <Badge tone={check.passed ? 'green' : 'amber'}>
                  {check.passed ? 'MATCH' : 'DIFF'}
                </Badge>
              </div>
            ))}
          </div>
          <p className="hint">
            Chromosomes and positions match. Numeric values compare within absolute tolerance 10⁻¹⁰
            to allow floating-point summation; selection uses unrounded probabilities. Every random
            sample, input and output remains recorded in the trace.
          </p>
        </Panel>
      )}
    </div>
  );
}
