import type { RandomSource } from './types';
/** Mulberry32: a 32-bit seeded PRNG. Each draw advances one integer state. */
export class SeededRandom implements RandomSource {
  private state: number;
  constructor(seed: number) {
    if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
      throw new Error('Seed must be an unsigned 32-bit integer.');
    this.state = seed >>> 0;
  }
  next(label = 'sample') {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    void label;
    return value;
  }
}
export function randomUnit(rng: RandomSource, label = 'sample') {
  const value = rng.next(label);
  if (!Number.isFinite(value) || value < 0 || value >= 1)
    throw new Error(`Random source returned an invalid [0,1) sample for ${label}.`);
  return value;
}
export function int(rng: RandomSource, n: number, label = 'index') {
  if (!Number.isSafeInteger(n) || n < 1)
    throw new Error('Random integer range must have a positive integer size.');
  return Math.floor(randomUnit(rng, label) * n);
}
export function shuffled(n: number, rng: RandomSource) {
  if (!Number.isSafeInteger(n) || n < 0)
    throw new Error('Permutation size must be a nonnegative integer.');
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = int(rng, i + 1, 'shuffle');
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function scripted(values: number[]): RandomSource {
  const samples = [...values];
  let cursor = 0;
  return {
    next: () => {
      if (cursor >= samples.length) throw new Error('Scripted random source exhausted');
      const value = samples[cursor++];
      if (!Number.isFinite(value) || value < 0 || value >= 1)
        throw new Error('Scripted samples must belong to [0,1).');
      return value;
    },
  };
}
