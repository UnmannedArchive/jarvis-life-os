// ---------------------------------------------------------------------------
// normalize — raw WHOOP v2 JSON → the camelCase shapes the app consumes.
// Records without a score (score_state !== 'SCORED', so `score` is absent) are
// normalized to null and dropped by `normalizeRecords`.
// ---------------------------------------------------------------------------

import type {
  RawRecovery,
  RawSleep,
  RawCycle,
  RawWorkout,
  RawList,
  WhoopRecovery,
  WhoopSleep,
  WhoopCycle,
  WhoopWorkout,
} from './types';

export function normalizeRecovery(raw: RawRecovery): WhoopRecovery | null {
  if (raw.score_state !== 'SCORED' || !raw.score) return null;
  const s = raw.score;
  return {
    cycleId: raw.cycle_id,
    sleepId: raw.sleep_id,
    createdAt: raw.created_at,
    recoveryScore: s.recovery_score,
    restingHeartRate: s.resting_heart_rate,
    hrvMs: s.hrv_rmssd_milli,
    spo2: s.spo2_percentage ?? null,
    skinTempCelsius: s.skin_temp_celsius ?? null,
  };
}

export function normalizeSleep(raw: RawSleep): WhoopSleep | null {
  if (raw.score_state !== 'SCORED' || !raw.score) return null;
  const { stage_summary: stages } = raw.score;
  return {
    id: raw.id,
    start: raw.start,
    end: raw.end,
    nap: raw.nap,
    asleepMs: stages.total_in_bed_time_milli - stages.total_awake_time_milli,
    lightSleepMs: stages.total_light_sleep_time_milli,
    swsSleepMs: stages.total_slow_wave_sleep_time_milli,
    remSleepMs: stages.total_rem_sleep_time_milli,
    sleepCycleCount: stages.sleep_cycle_count,
    disturbanceCount: stages.disturbance_count,
    respiratoryRate: raw.score.respiratory_rate ?? null,
    performancePct: raw.score.sleep_performance_percentage,
    consistencyPct: raw.score.sleep_consistency_percentage ?? null,
    efficiencyPct: raw.score.sleep_efficiency_percentage ?? null,
  };
}

export function normalizeCycle(raw: RawCycle): WhoopCycle | null {
  if (raw.score_state !== 'SCORED' || !raw.score) return null;
  return {
    id: raw.id,
    start: raw.start,
    end: raw.end ?? null,
    strain: raw.score.strain,
    kilojoule: raw.score.kilojoule,
    averageHeartRate: raw.score.average_heart_rate,
    maxHeartRate: raw.score.max_heart_rate,
  };
}

export function normalizeWorkout(raw: RawWorkout): WhoopWorkout | null {
  if (raw.score_state !== 'SCORED' || !raw.score) return null;
  return {
    id: raw.id,
    start: raw.start,
    end: raw.end,
    sportName: raw.sport_name ?? null,
    strain: raw.score.strain,
    averageHeartRate: raw.score.average_heart_rate,
    maxHeartRate: raw.score.max_heart_rate,
    kilojoule: raw.score.kilojoule,
  };
}

/** Normalize a paginated list response, dropping records that normalize to null. */
export function normalizeRecords<TRaw, TOut>(
  list: RawList<TRaw>,
  normalizer: (raw: TRaw) => TOut | null,
): TOut[] {
  return (list.records ?? [])
    .map(normalizer)
    .filter((r): r is TOut => r !== null);
}
