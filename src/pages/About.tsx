import { useState } from 'react';
import { CheckCircle2, Code2, Dna, FlaskConical, Heart } from 'lucide-react';
import { Badge, Field, Logo, Panel } from '../components/Common';
export function About() {
  const [team, setTeam] = useState<string[]>(() => {
    try {
      const value = JSON.parse(localStorage.getItem('genx-team') ?? '[]');
      return Array.isArray(value) && value.length === 3 && value.every((v) => typeof v === 'string')
        ? value
        : ['', '', ''];
    } catch {
      return ['', '', ''];
    }
  });
  const [saved, setSaved] = useState(false);
  return (
    <div className="content-page about-page">
      <div className="about-hero">
        <Logo />
        <Badge tone="green">A SOFT COMPUTING LABORATORY</Badge>
        <h1>Evolution in Action.</h1>
        <p>
          GenX turns the inner workings of genetic algorithms into an observable, reproducible
          learning experience. Built for curiosity, designed for a university presentation.
        </p>
      </div>
      <div className="about-grid">
        <Panel title="The project" aside={<FlaskConical size={22} />}>
          <p>
            Genetic algorithms search complex spaces by evolving populations rather than following a
            single path. GenX makes that process visible: not just the final answer, but the
            selection decisions, gene inheritance, mutations and fitness calculations that produce
            it.
          </p>
          <p>
            The entire application runs in your browser. No account, database, backend or paid API
            is required. Configuration and theme preferences can be saved locally.
          </p>
        </Panel>
        <Panel title="Built for inspection" aside={<Code2 size={22} />}>
          <ul className="check-list">
            <li>
              <CheckCircle2 size={16} />
              Typed engine independent of React
            </li>
            <li>
              <CheckCircle2 size={16} />
              Deterministic Mulberry32 randomness
            </li>
            <li>
              <CheckCircle2 size={16} />
              Recorded reversible simulation events
            </li>
            <li>
              <CheckCircle2 size={16} />
              Independent exact solvers & numerical fixture
            </li>
            <li>
              <CheckCircle2 size={16} />
              Original SVG and Canvas visualizations
            </li>
          </ul>
          <p className="hint">
            React · TypeScript · Vite · Tailwind CSS · Motion · Recharts · KaTeX · Vitest ·
            Playwright
          </p>
        </Panel>
      </div>
      <Panel
        title="Project team"
        eyebrow="MAKE THIS PRESENTATION YOURS"
        aside={<Heart size={20} />}
      >
        <p>
          Enter your team’s names, roles and roll numbers. These editable credits are stored only in
          this browser.
        </p>
        <div className="team-fields">
          {team.map((member, i) => (
            <Field key={i} label={`Team member ${i + 1}`}>
              <input
                aria-label={`Team member ${i + 1}`}
                value={member}
                placeholder="Name · role · roll number"
                maxLength={100}
                onChange={(e) => {
                  setSaved(false);
                  setTeam(team.map((name, j) => (j === i ? e.target.value : name)));
                }}
              />
            </Field>
          ))}
        </div>
        <button
          className="button primary"
          onClick={() => {
            try {
              localStorage.setItem('genx-team', JSON.stringify(team));
              setSaved(true);
            } catch {
              setSaved(false);
            }
          }}
        >
          {saved ? 'Credits saved' : 'Save credits locally'}
        </button>
      </Panel>
      <Panel title="Scope & practical limits" aside={<Dna size={22} />}>
        <p>
          Experiments support 4–100 individuals, 1–200 generations and at most 6,000 population ×
          generation slots. The history uses shared population arrays. TSP accepts 3–20 cities;
          exact Held–Karp comparison is limited to 10. Binary function precision is 3–10 bits;
          optima apply to encoded points only. Phrase targets contain 1–40 printable Unicode code
          points.
        </p>
        <p>
          Ancestry shows two ancestral generations at a time. Comparisons use a single shared seed
          and do not make statistical superiority claims. Historical forking, multi-seed statistical
          trials, custom function parsing and PMX are not implemented.
        </p>
      </Panel>
    </div>
  );
}
