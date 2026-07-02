import {
  normalizeRecovery,
  normalizeSleep,
  normalizeCycle,
  normalizeRecords,
} from '../normalize';
import type { RawRecovery, RawSleep, RawCycle } from '../types';

// Sample payloads copied from the WHOOP v2 API docs.
const SCORED_RECOVERY: RawRecovery = {
  cycle_id: 93845,
  sleep_id: '123e4567-e89b-12d3-a456-426614174000',
  user_id: 10129,
  created_at: '2022-04-24T11:25:44.774Z',
  updated_at: '2022-04-24T14:25:44.774Z',
  score_state: 'SCORED',
  score: {
    user_calibrating: false,
    recovery_score: 44,
    resting_heart_rate: 64,
    hrv_rmssd_milli: 31.813562,
    spo2_percentage: 95.6875,
    skin_temp_celsius: 33.7,
  },
};

const SCORED_SLEEP: RawSleep = {
  id: 'ecfc6a15-4661-442f-a9a4-f160dd7afae8',
  cycle_id: 93845,
  user_id: 10129,
  created_at: '2022-04-24T11:25:44.774Z',
  updated_at: '2022-04-24T14:25:44.774Z',
  start: '2022-04-24T02:25:44.774Z',
  end: '2022-04-24T10:25:44.774Z',
  timezone_offset: '-05:00',
  nap: false,
  score_state: 'SCORED',
  score: {
    stage_summary: {
      total_in_bed_time_milli: 30272735,
      total_awake_time_milli: 1403507,
      total_no_data_time_milli: 0,
      total_light_sleep_time_milli: 14905851,
      total_slow_wave_sleep_time_milli: 6630370,
      total_rem_sleep_time_milli: 5879573,
      sleep_cycle_count: 3,
      disturbance_count: 12,
    },
    sleep_needed: {
      baseline_milli: 27395716,
      need_from_sleep_debt_milli: 352230,
      need_from_recent_strain_milli: 208595,
      need_from_recent_nap_milli: -12312,
    },
    respiratory_rate: 16.11328125,
    sleep_performance_percentage: 98,
    sleep_consistency_percentage: 90,
    sleep_efficiency_percentage: 91.69533848,
  },
};

const SCORED_CYCLE: RawCycle = {
  id: 93845,
  user_id: 10129,
  created_at: '2022-04-24T11:25:44.774Z',
  updated_at: '2022-04-24T14:25:44.774Z',
  start: '2022-04-24T02:25:44.774Z',
  end: '2022-04-24T10:25:44.774Z',
  timezone_offset: '-05:00',
  score_state: 'SCORED',
  score: {
    strain: 5.2951527,
    kilojoule: 8288.297,
    average_heart_rate: 68,
    max_heart_rate: 141,
  },
};

describe('normalizeRecovery', () => {
  it('maps a SCORED recovery onto the normalized shape', () => {
    expect(normalizeRecovery(SCORED_RECOVERY)).toEqual({
      cycleId: 93845,
      sleepId: '123e4567-e89b-12d3-a456-426614174000',
      createdAt: '2022-04-24T11:25:44.774Z',
      recoveryScore: 44,
      restingHeartRate: 64,
      hrvMs: 31.813562,
      spo2: 95.6875,
      skinTempCelsius: 33.7,
    });
  });

  it('returns null when the recovery is not yet scored', () => {
    const pending: RawRecovery = {
      ...SCORED_RECOVERY,
      score_state: 'PENDING_SCORE',
      score: undefined,
    };
    expect(normalizeRecovery(pending)).toBeNull();
  });
});

describe('normalizeSleep', () => {
  it('maps a SCORED sleep and derives time asleep (in-bed minus awake)', () => {
    const result = normalizeSleep(SCORED_SLEEP);
    expect(result).toMatchObject({
      id: 'ecfc6a15-4661-442f-a9a4-f160dd7afae8',
      start: '2022-04-24T02:25:44.774Z',
      end: '2022-04-24T10:25:44.774Z',
      nap: false,
      performancePct: 98,
      consistencyPct: 90,
      efficiencyPct: 91.69533848,
      respiratoryRate: 16.11328125,
      remSleepMs: 5879573,
      lightSleepMs: 14905851,
      swsSleepMs: 6630370,
    });
    // 30272735 in bed - 1403507 awake = 28869228 asleep
    expect(result!.asleepMs).toBe(28869228);
  });

  it('returns null for an unscorable sleep', () => {
    const bad: RawSleep = { ...SCORED_SLEEP, score_state: 'UNSCORABLE', score: undefined };
    expect(normalizeSleep(bad)).toBeNull();
  });
});

describe('normalizeCycle', () => {
  it('maps a SCORED cycle onto the normalized shape', () => {
    expect(normalizeCycle(SCORED_CYCLE)).toEqual({
      id: 93845,
      start: '2022-04-24T02:25:44.774Z',
      end: '2022-04-24T10:25:44.774Z',
      strain: 5.2951527,
      kilojoule: 8288.297,
      averageHeartRate: 68,
      maxHeartRate: 141,
    });
  });

  it('keeps end null for an active (current) cycle with no end yet', () => {
    const active: RawCycle = { ...SCORED_CYCLE, end: undefined };
    expect(normalizeCycle(active)!.end).toBeNull();
  });
});

describe('normalizeRecords', () => {
  it('normalizes a list response and drops unscored records', () => {
    const list = {
      records: [
        SCORED_RECOVERY,
        { ...SCORED_RECOVERY, cycle_id: 999, score_state: 'PENDING_SCORE' as const, score: undefined },
      ],
      next_token: null,
    };
    const result = normalizeRecords(list, normalizeRecovery);
    expect(result).toHaveLength(1);
    expect(result[0].cycleId).toBe(93845);
  });
});
