import { supabase } from './supabase';
import type { User, LifePillar, Quest, DailyCheckin, ActivityLogEntry, Goal, Pillar } from './types';

const ALL_PILLARS: Pillar[] = ['mind', 'body', 'work', 'wealth', 'spirit', 'social'];

export async function loadUserData(userId: string) {
  const [userRes, pillarsRes, questsRes, checkinRes, logRes, goalsRes] = await Promise.all([
    supabase.from('users').select('*').eq('id', userId).single(),
    supabase.from('life_pillars').select('*').eq('user_id', userId),
    supabase.from('quests').select('*').eq('user_id', userId).order('sort_order'),
    supabase.from('daily_checkins').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1),
    supabase.from('activity_log').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
    supabase.from('goals').select('*').eq('user_id', userId),
  ]);

  return {
    user: userRes.data as User | null,
    pillars: (pillarsRes.data as LifePillar[]) || [],
    quests: (questsRes.data as Quest[]) || [],
    todayCheckin: (checkinRes.data?.[0] as DailyCheckin) || null,
    activityLog: (logRes.data as ActivityLogEntry[]) || [],
    goals: (goalsRes.data as Goal[]) || [],
  };
}

export async function createNewUser(userId: string, email: string, displayName: string) {
  const { error } = await supabase.from('users').insert({
    id: userId,
    email,
    display_name: displayName,
    total_xp: 0,
    current_streak: 0,
    longest_streak: 0,
    character_class: 'RECRUIT',
  });
  if (error) throw error;

  const pillarRows = ALL_PILLARS.map((pillar) => ({
    user_id: userId,
    pillar,
    current_xp: 0,
    level: 1,
    streak: 0,
    last_activity_date: null,
  }));
  const { error: pError } = await supabase.from('life_pillars').insert(pillarRows);
  if (pError) throw pError;

  return loadUserData(userId);
}

// --- Individual save helpers (fire-and-forget) ---

export async function saveUser(user: User) {
  const { id, ...rest } = user;
  await supabase.from('users').update(rest).eq('id', id);
}

export async function savePillars(pillars: LifePillar[]) {
  for (const p of pillars) {
    const { id, ...rest } = p;
    await supabase.from('life_pillars').update(rest).eq('id', id);
  }
}

export async function upsertQuest(quest: Quest) {
  await supabase.from('quests').upsert(quest);
}

export async function deleteQuestRemote(questId: string) {
  await supabase.from('quests').delete().eq('id', questId);
}

export async function saveCheckin(checkin: DailyCheckin) {
  await supabase.from('daily_checkins').upsert(checkin, { onConflict: 'user_id,date' });
}

export async function saveActivityLogEntries(entries: ActivityLogEntry[]) {
  if (entries.length === 0) return;
  await supabase.from('activity_log').upsert(entries);
}

export async function upsertGoals(goals: Goal[]) {
  if (goals.length === 0) return;
  await supabase.from('goals').upsert(goals);
}
