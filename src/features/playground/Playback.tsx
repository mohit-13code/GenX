import {
  ChevronFirst,
  ChevronLast,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  StepBack,
  StepForward,
  History,
  Settings2,
} from 'lucide-react';
import { useState } from 'react';
import type { Experiment } from '../../hooks/useExperiment';
export function Playback({ experiment, onReset }: { experiment: Experiment; onReset: () => void }) {
  const e = experiment;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const control = (label: string, icon: React.ReactNode, action: () => void, disabled = false) => (
    <button
      aria-label={label}
      title={label}
      className="icon-button"
      onClick={() => {
        e.setPlaying(false);
        action();
      }}
      disabled={disabled}
    >
      {icon}
    </button>
  );
  return (
    <div className="playback" data-playing={e.playing} aria-label="Evolution playback controls">
      <div className="playback-context">
        <span>
          <History size={14} />
          Evolution Time Machine
        </span>
        <span className="playback-operation">
          {e.event.stage === 'stop' ? e.event.reason : `${e.event.stage} · event ${e.cursor + 1}`}
        </span>
        <kbd>space</kbd>
        <button
          className="playback-settings-toggle icon-button"
          aria-label="Playback settings"
          aria-expanded={settingsOpen}
          onClick={() => setSettingsOpen((v) => !v)}
        >
          <Settings2 size={15} />
        </button>
      </div>
      <div className="playback-top">
        <div className="transport">
          {control('Jump to beginning', <ChevronFirst size={18} />, () => e.go(0), e.cursor === 0)}
          {control(
            'Previous generation',
            <SkipBack size={17} />,
            () => e.previous(true),
            e.cursor === 0,
          )}
          {control('Previous step', <StepBack size={18} />, () => e.previous(), e.cursor === 0)}
          <button
            className={`play-button ${e.playing ? 'is-playing' : ''}`}
            aria-label={e.playing ? 'Pause simulation' : 'Play simulation'}
            title="Space to play or pause"
            disabled={e.event.stage === 'stop'}
            onClick={() => e.setPlaying(!e.playing)}
          >
            {e.playing ? (
              <Pause size={19} fill="currentColor" />
            ) : (
              <Play size={19} fill="currentColor" />
            )}
            <span>{e.playing ? 'Pause' : 'Evolve'}</span>
          </button>
          {control(
            'Next step',
            <StepForward size={18} />,
            () => e.advance('micro'),
            e.event.stage === 'stop',
          )}
          {control(
            'Next generation',
            <SkipForward size={17} />,
            () => e.advance('generation'),
            e.event.stage === 'stop',
          )}
          {control(
            'Jump to latest generated state',
            <ChevronLast size={18} />,
            () => e.go(e.events.length - 1),
            e.cursor === e.events.length - 1,
          )}
          <span className="transport-divider" />
          {control('Reset experiment', <RotateCcw size={17} />, onReset)}
        </div>
        <div className={`playback-options ${settingsOpen ? 'expanded' : ''}`}>
          <select
            aria-label="Execution granularity"
            value={e.granularity}
            onChange={(event) => e.setGranularity(event.target.value as 'micro' | 'generation')}
          >
            <option value="generation">Generation steps</option>
            <option value="micro">Micro steps</option>
          </select>
          <select
            aria-label="Playback speed"
            value={e.speed}
            onChange={(event) => e.setSpeed(Number(event.target.value))}
          >
            {[0.25, 0.5, 1, 2, 4, 16].map((s) => (
              <option value={s} key={s}>
                {s}× speed
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="timeline-row">
        <span className="mono">GEN {String(e.event.generation).padStart(3, '0')}</span>
        <input
          aria-label="Evolution timeline"
          type="range"
          min="0"
          max={Math.max(1, e.events.length - 1)}
          value={e.cursor}
          onChange={(event) => {
            e.setPlaying(false);
            e.go(Number(event.target.value));
          }}
        />
        <span className="mono muted" title="Recorded events">
          {e.cursor + 1} / {e.events.length}
        </span>
      </div>
      <div className="timeline-events">
        {e.events
          .filter((event) => event.stage === 'replace' || event.stage === 'stop')
          .map((event) => (
            <button
              key={event.id}
              title={`Generation ${event.generation}: ${event.message}`}
              aria-label={`Go to generation ${event.generation}`}
              style={{ left: `${(100 * event.id) / Math.max(1, e.events.length - 1)}%` }}
              onClick={() => {
                e.setPlaying(false);
                e.go(event.id);
              }}
            />
          ))}
      </div>
    </div>
  );
}
