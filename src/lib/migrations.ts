/**
 * Store schema migrations. Run on rehydrate to add new fields and migrate existing data.
 */

const CURRENT_VERSION = 1;

export interface PersistedState {
  _version?: number;
  [key: string]: unknown;
}

export function migrateStore(persistedState: PersistedState | undefined): PersistedState {
  if (!persistedState || typeof persistedState !== 'object') return persistedState ?? {};
  const state = { ...persistedState };
  const version = (state._version as number) ?? 0;

  if (version < 1) {
    state.activityFeed = state.activityFeed ?? [];
    state.focusSessions = state.focusSessions ?? [];
    state.checkinHistory = state.checkinHistory ?? [];
    state.theme = state.theme ?? 'dark';
    state.accentColor = state.accentColor ?? '#F59E0B';
    state.compactMode = state.compactMode ?? false;
    state.notificationPrefs = state.notificationPrefs ?? {
      streakReminder: true,
      dailyCheckin: true,
      achievements: true,
      browserNotifications: false,
    };
    state.customPillarNames = state.customPillarNames ?? {};
    state.onboardingComplete = state.onboardingComplete ?? false;
    state.onboardingStep = state.onboardingStep ?? 0;
    state.achievements = state.achievements ?? [];
    state._version = 1;
  }

  return state;
}

export { CURRENT_VERSION };
