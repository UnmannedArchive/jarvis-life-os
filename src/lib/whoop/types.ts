// ---------------------------------------------------------------------------
// WHOOP v2 API types — raw response shapes + the normalized shapes the rest of
// Life OS consumes. Raw shapes mirror https://api.prod.whoop.com/developer/v2.
// `score` is only present when `score_state === 'SCORED'`.
// ---------------------------------------------------------------------------

export type ScoreState = 'SCORED' | 'PENDING_SCORE' | 'UNSCORABLE';

/** Generic paginated list envelope returned by the v2 collection endpoints. */
export interface RawList<T> {
  records: T[];
  next_token?: string | null;
}

// --- Raw: recovery (GET /v2/recovery) --------------------------------------
export interface RawRecovery {
  cycle_id: number;
  sleep_id: string | null;
  user_id: number;
  created_at: string;
  updated_at: string;
  score_state: ScoreState;
  score?: {
    user_calibrating: boolean;
    recovery_score: number;
    resting_heart_rate: number;
    hrv_rmssd_milli: number;
    spo2_percentage?: number;
    skin_temp_celsius?: number;
  };
}

// --- Raw: sleep (GET /v2/activity/sleep) -----------------------------------
export interface RawSleep {
  id: string;
  cycle_id?: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end: string;
  timezone_offset: string;
  nap: boolean;
  score_state: ScoreState;
  score?: {
    stage_summary: {
      total_in_bed_time_milli: number;
      total_awake_time_milli: number;
      total_no_data_time_milli: number;
      total_light_sleep_time_milli: number;
      total_slow_wave_sleep_time_milli: number;
      total_rem_sleep_time_milli: number;
      sleep_cycle_count: number;
      disturbance_count: number;
    };
    sleep_needed?: Record<string, number>;
    respiratory_rate?: number;
    sleep_performance_percentage: number;
    sleep_consistency_percentage?: number;
    sleep_efficiency_percentage?: number;
  };
}

// --- Raw: cycle (GET /v2/cycle) --------------------------------------------
export interface RawCycle {
  id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end?: string | null;
  timezone_offset: string;
  score_state: ScoreState;
  score?: {
    strain: number;
    kilojoule: number;
    average_heart_rate: number;
    max_heart_rate: number;
  };
}

// --- Raw: workout (GET /v2/activity/workout) -------------------------------
export interface RawWorkout {
  id: string;
  user_id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end: string;
  timezone_offset: string;
  sport_name?: string | null;
  score_state: ScoreState;
  score?: {
    strain: number;
    average_heart_rate: number;
    max_heart_rate: number;
    kilojoule: number;
  };
}

// --- Normalized shapes (camelCase, scored records only) --------------------
export interface WhoopRecovery {
  cycleId: number;
  sleepId: string | null;
  createdAt: string;
  /** 0–100. */
  recoveryScore: number;
  restingHeartRate: number;
  /** HRV RMSSD in milliseconds. */
  hrvMs: number;
  spo2: number | null;
  skinTempCelsius: number | null;
}

export interface WhoopSleep {
  id: string;
  start: string;
  end: string;
  nap: boolean;
  /** Derived: total_in_bed − total_awake, in ms. */
  asleepMs: number;
  lightSleepMs: number;
  swsSleepMs: number;
  remSleepMs: number;
  sleepCycleCount: number;
  disturbanceCount: number;
  respiratoryRate: number | null;
  /** 0–100. */
  performancePct: number;
  consistencyPct: number | null;
  efficiencyPct: number | null;
}

export interface WhoopCycle {
  id: number;
  start: string;
  /** null while the cycle is still active. */
  end: string | null;
  strain: number;
  kilojoule: number;
  averageHeartRate: number;
  maxHeartRate: number;
}

export interface WhoopWorkout {
  id: string;
  start: string;
  end: string;
  sportName: string | null;
  strain: number;
  averageHeartRate: number;
  maxHeartRate: number;
  kilojoule: number;
}

/** Client-held OAuth token pair (also the shape persisted in the store). */
export interface WhoopTokens {
  accessToken: string;
  refreshToken: string;
  /** Epoch millis when the access token expires. */
  expiresAt: number;
}

/** The bundle of recent normalized records the app caches and renders from. */
export interface WhoopData {
  recovery: WhoopRecovery[];
  sleep: WhoopSleep[];
  cycles: WhoopCycle[];
  workouts: WhoopWorkout[];
}
