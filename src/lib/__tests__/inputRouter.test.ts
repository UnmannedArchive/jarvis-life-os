import { dispatchRouteDecision } from '../inputRouter';
import type { RouteDecision } from '../inputRouter';
import type { useStore } from '@/stores/useStore';
import { DIFFICULTY_CONFIG } from '../types';

type Store = ReturnType<typeof useStore.getState>;

function makeStore(overrides: Partial<Store> = {}): Store {
  const base = {
    quests: [],
    todayCheckin: null,
    dailyIntention: null,
    addQuest: jest.fn(),
    deleteQuest: jest.fn(),
    addIdea: jest.fn(),
    deleteIdea: jest.fn(),
    addJournalEntry: jest.fn(),
    deleteJournalEntry: jest.fn(),
    setDailyIntention: jest.fn(),
    submitCheckin: jest.fn(),
    setTodayCheckin: jest.fn(),
    addLogEntry: jest.fn(),
    addActivity: jest.fn(),
    ...overrides,
  };
  return base as unknown as Store;
}

describe('dispatchRouteDecision', () => {
  it('routes a quest decision to addQuest with the right xp_reward', () => {
    const store = makeStore();
    const decision: RouteDecision = {
      type: 'quest',
      questType: 'daily',
      pillar: 'body',
      difficulty: 'MED',
      title: 'Run 5k',
      dueDate: '2026-05-11',
    };

    const result = dispatchRouteDecision(decision, store);

    expect(store.addQuest).toHaveBeenCalledTimes(1);
    const arg = (store.addQuest as jest.Mock).mock.calls[0][0];
    expect(arg.title).toBe('Run 5k');
    expect(arg.pillar).toBe('body');
    expect(arg.difficulty).toBe('MED');
    expect(arg.xp_reward).toBe(DIFFICULTY_CONFIG.MED.xp);
    expect(arg.quest_type).toBe('daily');
    expect(arg.due_date).toBe('2026-05-11');
    expect(arg.is_recurring).toBe(false);
    expect(result.destination).toContain('Daily Quest');
    expect(result.destination).toContain('Body');
    expect(typeof result.undo).toBe('function');
  });

  it('routes an idea decision through organizeIdea and addIdea', () => {
    const store = makeStore();
    const decision: RouteDecision = {
      type: 'idea',
      raw: 'what if habit tracking worked through iMessage app integration',
    };

    const result = dispatchRouteDecision(decision, store);

    expect(store.addIdea).toHaveBeenCalledTimes(1);
    const arg = (store.addIdea as jest.Mock).mock.calls[0][0];
    expect(arg.raw).toBe(decision.raw);
    expect(arg.source).toBe('typed');
    expect(typeof arg.id).toBe('string');
    expect(typeof arg.created_at).toBe('string');
    expect(arg.title).toBeTruthy();
    expect(arg.category).toBeTruthy();
    expect(result.destination).toMatch(/^Idea/);

    // Undo deletes the same id
    result.undo();
    expect(store.deleteIdea).toHaveBeenCalledWith(arg.id);
  });

  it('routes a journal decision to addJournalEntry with the right shape', () => {
    const store = makeStore();
    const decision: RouteDecision = {
      type: 'journal',
      text: "feeling burned out, can't focus today",
      mood: 2,
    };

    const result = dispatchRouteDecision(decision, store);

    expect(store.addJournalEntry).toHaveBeenCalledTimes(1);
    const arg = (store.addJournalEntry as jest.Mock).mock.calls[0][0];
    expect(arg.text).toBe(decision.text);
    expect(arg.analysis).toBeNull();
    expect(typeof arg.id).toBe('string');
    expect(typeof arg.date).toBe('string');
    expect(result.destination).toBe('Journal');

    result.undo();
    expect(store.deleteJournalEntry).toHaveBeenCalledWith(arg.id);
  });

  it('routes an intention decision to setDailyIntention and undoes to previous value', () => {
    const store = makeStore({ dailyIntention: 'previous focus' });
    const decision: RouteDecision = {
      type: 'intention',
      text: 'ship the auth flow',
    };

    const result = dispatchRouteDecision(decision, store);

    expect(store.setDailyIntention).toHaveBeenCalledWith('ship the auth flow');

    result.undo();
    expect(store.setDailyIntention).toHaveBeenLastCalledWith('previous focus');
  });

  it('routes a checkin_flag decision through submitCheckin with encoded notes', () => {
    const store = makeStore();
    const decision: RouteDecision = {
      type: 'checkin_flag',
      drank: true,
      note: 'Drank too much last night',
    };

    dispatchRouteDecision(decision, store);

    expect(store.submitCheckin).toHaveBeenCalledTimes(1);
    const [sleep, energy, mood, notes] = (store.submitCheckin as jest.Mock).mock.calls[0];
    expect(typeof sleep).toBe('number');
    expect(typeof energy).toBe('number');
    expect(typeof mood).toBe('number');
    expect(notes).toContain('drank_last_night');
  });

  it('routes an activity decision to addLogEntry + addActivity', () => {
    const store = makeStore();
    const decision: RouteDecision = {
      type: 'activity',
      title: 'Finished a 45min run',
      pillar: 'body',
      xp: 40,
    };

    const result = dispatchRouteDecision(decision, store);

    expect(store.addLogEntry).toHaveBeenCalledTimes(1);
    const [action, description, xp, pillar] = (store.addLogEntry as jest.Mock).mock.calls[0];
    expect(action).toBe('activity');
    expect(description).toContain('Finished a 45min run');
    expect(xp).toBe(40);
    expect(pillar).toBe('body');

    expect(store.addActivity).toHaveBeenCalledTimes(1);
    const activityArg = (store.addActivity as jest.Mock).mock.calls[0][0];
    expect(activityArg.pillar).toBe('body');
    expect(activityArg.xp).toBe(40);
    expect(result.destination).toContain('Body');
  });
});
