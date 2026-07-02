import { orderTasksHeuristic } from '../planDay';

describe('orderTasksHeuristic (local backup ordering)', () => {
  const input =
    'gym, finish the deck for Valence, reply to the optometry client, grocery run, pick up dry cleaning';

  it('parses every task without dropping or duplicating any', () => {
    const ordered = orderTasksHeuristic(input);
    expect(ordered).toHaveLength(5);
    const titles = ordered.map((o) => o.task.toLowerCase());
    expect(titles.some((t) => t.includes('deck'))).toBe(true);
    expect(titles.some((t) => t.includes('grocery'))).toBe(true);
    expect(titles.some((t) => t.includes('dry cleaning'))).toBe(true);
  });

  it('gives every task a non-empty reason', () => {
    const ordered = orderTasksHeuristic(input);
    expect(ordered.every((o) => o.reason.trim().length > 0)).toBe(true);
  });

  it('batches errands into one contiguous block', () => {
    const ordered = orderTasksHeuristic(input);
    const isErrand = (t: string) =>
      /grocery|dry cleaning|gym/i.test(t);
    const positions = ordered
      .map((o, i) => ({ i, errand: isErrand(o.task) }))
      .filter((x) => x.errand)
      .map((x) => x.i);
    // Errand positions should be consecutive (max - min + 1 === count).
    expect(positions[positions.length - 1] - positions[0] + 1).toBe(positions.length);
  });

  it('returns an empty array for empty input', () => {
    expect(orderTasksHeuristic('')).toEqual([]);
    expect(orderTasksHeuristic('   ')).toEqual([]);
  });

  it('respects an explicit dependency cue ("before")', () => {
    const ordered = orderTasksHeuristic('finish the deck, prep slides before the deck');
    const prepIdx = ordered.findIndex((o) => /prep/i.test(o.task));
    const deckIdx = ordered.findIndex((o) => /finish the deck/i.test(o.task));
    expect(prepIdx).toBeGreaterThanOrEqual(0);
    expect(deckIdx).toBeGreaterThanOrEqual(0);
    expect(prepIdx).toBeLessThan(deckIdx);
  });
});
