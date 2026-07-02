import { whoopScoreToLevel, recoveryInsight } from '../insights';

describe('whoopScoreToLevel', () => {
  it('maps a 0-100 score onto the 1-5 check-in scale (quintiles)', () => {
    expect(whoopScoreToLevel(0)).toBe(1);
    expect(whoopScoreToLevel(20)).toBe(1);
    expect(whoopScoreToLevel(21)).toBe(2);
    expect(whoopScoreToLevel(50)).toBe(3);
    expect(whoopScoreToLevel(67)).toBe(4);
    expect(whoopScoreToLevel(85)).toBe(5);
    expect(whoopScoreToLevel(100)).toBe(5);
  });

  it('clamps out-of-range input to 1..5', () => {
    expect(whoopScoreToLevel(-10)).toBe(1);
    expect(whoopScoreToLevel(150)).toBe(5);
  });
});

describe('recoveryInsight', () => {
  it('returns null when there is no recovery yet', () => {
    expect(recoveryInsight(null, [])).toBeNull();
  });

  it('flags a green day as a strength to push hard', () => {
    const i = recoveryInsight(75, [75, 70, 80]);
    expect(i?.type).toBe('strength');
    expect(i?.text).toContain('75');
  });

  it('warns (tip, not penalty) when recovery has been chronically low', () => {
    const i = recoveryInsight(30, [30, 28, 32]);
    expect(i?.type).toBe('tip');
    expect(i?.text.toLowerCase()).toMatch(/protect|rest|signal/);
  });

  it('nudges a low single-day recovery toward a lighter day', () => {
    const i = recoveryInsight(30, [30]);
    expect(i?.type).toBe('tip');
    expect(i?.text.toLowerCase()).toContain('today');
  });

  it('stays quiet on a middling recovery day', () => {
    expect(recoveryInsight(50, [50, 48, 52])).toBeNull();
  });
});
