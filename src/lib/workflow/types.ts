export type WorkflowCategory = 'focus' | 'neutral' | 'distraction';

/** One coalesced session as written by the collector (a line in events.jsonl). */
export interface UsageSession {
  app: string;
  title: string;
  start: string; // ISO 8601 with offset
  end: string;   // ISO 8601 with offset
  seconds: number;
}

export interface RawAppSeconds { app: string; seconds: number; }
export interface RawHourBucket { hour: number; byApp: RawAppSeconds[]; } // hour 0..23 local
export interface RawAggregate {
  date: string; // YYYY-MM-DD
  totalSeconds: number;
  byApp: RawAppSeconds[];   // sorted desc by seconds
  byHour: RawHourBucket[];  // ascending hour, only hours with data
}

export interface CategoryTotals { focus: number; neutral: number; distraction: number; }
export interface HourCategorySeconds { hour: number; focus: number; neutral: number; distraction: number; }
export interface AppRow { app: string; seconds: number; category: WorkflowCategory; }
export interface WorkflowView {
  date: string;
  totals: CategoryTotals; // seconds
  focusScore: number;     // 0..100 integer
  byHour: HourCategorySeconds[];
  byApp: AppRow[];
}
