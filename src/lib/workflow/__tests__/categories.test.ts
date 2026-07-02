import { classifyApp, DEFAULT_CATEGORIES } from '../categories';

describe('classifyApp', () => {
  it('classifies known focus apps regardless of case', () => {
    expect(classifyApp('Cursor')).toBe('focus');
    expect(classifyApp('TERMINAL')).toBe('focus');
  });

  it('classifies known distraction apps', () => {
    expect(classifyApp('YouTube')).toBe('distraction');
    expect(classifyApp('TikTok')).toBe('distraction');
  });

  it('defaults unknown apps to neutral', () => {
    expect(classifyApp('SomeRandomApp')).toBe('neutral');
  });

  it('lets a user override win over the default', () => {
    expect(classifyApp('YouTube', { youtube: 'focus' })).toBe('focus');
  });

  it('has a non-empty default map', () => {
    expect(Object.keys(DEFAULT_CATEGORIES).length).toBeGreaterThan(5);
  });
});
