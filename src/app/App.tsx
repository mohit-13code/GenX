import { useEffect, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  FlaskConical,
  Home as HomeIcon,
  Info,
  Menu,
  Moon,
  Sun,
  Swords,
  X,
} from 'lucide-react';
import { MotionConfig } from 'motion/react';
import { Logo } from '../components/Common';
import { Home } from '../pages/Home';
import { Playground } from '../features/playground/Playground';
import { Verification } from '../pages/Verification';
import { Battle } from '../features/comparison/Battle';
import { Learn } from '../pages/Learn';
import { About } from '../pages/About';
import type { ProblemId } from '../engine/types';
const links = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'playground', label: 'Playground', icon: FlaskConical },
  { id: 'battle', label: 'Evolution Battle', icon: Swords },
  { id: 'verification', label: 'Verification', icon: CheckCircle2 },
  { id: 'learn', label: 'Learn', icon: BookOpen },
  { id: 'about', label: 'About', icon: Info },
];
const route = () => {
  const id = window.location.hash.slice(1).split('?')[0];
  return links.some((l) => l.id === id) ? id : 'home';
};
export default function App() {
  const [page, setPage] = useState(route),
    [mobile, setMobile] = useState(false),
    [initialProblem, setInitialProblem] = useState<ProblemId | undefined>();
  const [light, setLight] = useState(() => {
    try {
      return localStorage.getItem('genx-theme') === 'light';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = light ? 'light' : 'dark';
    try {
      localStorage.setItem('genx-theme', light ? 'light' : 'dark');
    } catch {
      /* Theme persistence is optional. */
    }
  }, [light]);
  useEffect(() => {
    const listener = () => {
      setPage(route());
      setMobile(false);
      window.scrollTo({ top: 0, behavior: 'instant' });
    };
    window.addEventListener('hashchange', listener);
    return () => window.removeEventListener('hashchange', listener);
  }, []);
  useEffect(() => {
    document.title = `${links.find((l) => l.id === page)?.label ?? 'Home'} · GenX — Evolution in Action`;
  }, [page]);
  const navigate = (id: string, problem?: ProblemId) => {
    setInitialProblem(problem);
    if (route() === id) {
      setPage(id);
      window.scrollTo({ top: 0 });
    } else window.location.hash = id;
    setMobile(false);
  };
  return (
    <MotionConfig reducedMotion="user">
      <a
        href="#main-content"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <a href="#home" className="brand-link" aria-label="GenX home">
            <Logo />
          </a>
          <nav aria-label="Main navigation" className={mobile ? 'navigation open' : 'navigation'}>
            {links.map((link) => (
              <a
                href={`#${link.id}`}
                key={link.id}
                aria-current={page === link.id ? 'page' : undefined}
                className={page === link.id ? 'active' : ''}
                onClick={() => setInitialProblem(undefined)}
              >
                <link.icon size={15} />
                {link.label}
                {page === link.id && <span className="nav-indicator" aria-hidden="true" />}
              </a>
            ))}
          </nav>
          <div className="header-tools">
            <span className="version-tag">v1.0 LAB</span>
            <button
              className="icon-button theme-toggle"
              aria-label={light ? 'Switch to dark theme' : 'Switch to light theme'}
              onClick={() => setLight(!light)}
            >
              {light ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              className="icon-button mobile-menu"
              aria-label="Toggle navigation"
              aria-expanded={mobile}
              onClick={() => setMobile(!mobile)}
            >
              {mobile ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>
        {page === 'home' ? (
          <Home navigate={navigate} />
        ) : page === 'playground' ? (
          <Playground key={initialProblem ?? 'saved'} initialProblem={initialProblem} />
        ) : page === 'battle' ? (
          <Battle />
        ) : page === 'verification' ? (
          <Verification />
        ) : page === 'learn' ? (
          <Learn />
        ) : (
          <About />
        )}
      </main>
      <footer className="site-footer">
        <div>
          <Logo />
          <span>An interactive Soft Computing project.</span>
        </div>
        <span>Built for exploration. Grounded in mathematics.</span>
        <a href="#about">Project & credits</a>
      </footer>
    </MotionConfig>
  );
}
