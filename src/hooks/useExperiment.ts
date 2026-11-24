import { useCallback, useEffect, useRef, useState } from 'react';
import { Simulation } from '../engine/simulation';
import type { Config, SimulationEvent } from '../engine/types';
export type Granularity = 'micro' | 'generation';
function start(config: Config) {
  const engine = new Simulation(config),
    producer = engine.run(),
    events: SimulationEvent[] = [];
  for (let i = 0; i < 4; i++) {
    const next = producer.next();
    if (!next.done) events.push(next.value);
  }
  return { engine, producer, events };
}
export function useExperiment(initial: Config) {
  const [session, setSession] = useState(() => start(initial));
  const sessionRef = useRef(session);
  const [cursor, setCursor] = useState(3);
  const cursorRef = useRef(3);
  const [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1),
    [granularity, setGranularity] = useState<Granularity>('generation');
  const go = useCallback((index: number) => {
    const safe = Math.max(0, Math.min(index, sessionRef.current.events.length - 1));
    cursorRef.current = safe;
    setCursor(safe);
  }, []);
  const restart = useCallback((config: Config) => {
    const next = start(config);
    sessionRef.current = next;
    setSession(next);
    cursorRef.current = 3;
    setCursor(3);
    setPlaying(false);
  }, []);
  const advance = useCallback(
    (mode: Granularity = 'micro') => {
      const s = sessionRef.current;
      let index = cursorRef.current;
      const generation = s.events[index].generation;
      for (let count = 0; count < 1000; count++) {
        if (s.events[index].stage === 'stop') {
          setPlaying(false);
          break;
        }
        if (index + 1 < s.events.length) index++;
        else {
          const next = s.producer.next();
          if (next.done) {
            setPlaying(false);
            break;
          }
          s.events.push(next.value);
          index++;
        }
        if (
          mode === 'micro' ||
          s.events[index].generation > generation ||
          s.events[index].stage === 'stop'
        )
          break;
      }
      setSession({ ...s });
      go(index);
      if (s.events[index].stage === 'stop') setPlaying(false);
    },
    [go],
  );
  const previous = useCallback(
    (generation = false) => {
      setPlaying(false);
      let index = cursorRef.current - 1;
      const s = sessionRef.current;
      if (generation) {
        const target =
          s.events[Math.max(0, index)].generation -
          (s.events[cursorRef.current].generation === s.events[Math.max(0, index)].generation
            ? 1
            : 0);
        while (index > 0 && s.events[index].generation > target) index--;
        while (index > 0 && !['replace', 'statistics'].includes(s.events[index].stage)) index--;
      }
      go(index);
    },
    [go],
  );
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => advance(granularity), Math.max(25, 700 / speed));
    return () => window.clearInterval(timer);
  }, [playing, speed, granularity, advance]);
  const event = session.events[cursor] ?? session.events[0];
  return {
    config: session.engine.config,
    optimum: session.engine.optimum,
    problem: session.engine.problem,
    events: session.events,
    event,
    cursor,
    playing,
    setPlaying,
    speed,
    setSpeed,
    granularity,
    setGranularity,
    advance,
    previous,
    go,
    restart,
  };
}
export type Experiment = ReturnType<typeof useExperiment>;
