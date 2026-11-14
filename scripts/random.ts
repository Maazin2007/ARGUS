// Seeded random numbers, so `npm run generate` writes the same file every run.
// Math.random() cannot be seeded, which would make our results impossible to
// reproduce.

// mulberry32 by Tommy Ettinger, public domain.
// https://gist.github.com/tommyettinger/46a874533244883189143505d203312c
// Returns a function that gives a new number in [0, 1) on each call.
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A number between -size and +size, spread evenly.
export function noise(random: () => number, size: number): number {
  return (random() * 2 - 1) * size;
}
