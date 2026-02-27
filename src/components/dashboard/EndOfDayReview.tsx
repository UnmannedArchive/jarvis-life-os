'use client';

import { useMemo } from 'react';
import { useStore } from '@/stores/useStore';
import { getDailyGrade, getDailyQuote } from '@/lib/psychology';
import HUDPanel from '@/components/hud/HUDPanel';
import { motion } from 'framer-motion';
import { Moon, Flame, Zap, CheckCircle2, Quote } from 'lucide-react';

export default function EndOfDayReview() {
  const quests = useStore((s) => s.quests);
  const user = useStore((s) => s.user);
  const todayCheckin = useStore((s) => s.todayCheckin);
  const xpHistory = useStore((s) => s.xpHistory);

  const hour = new Date().getHours();
  const isEvening = hour >= 18;

  const review = useMemo(() => {
    const daily = quests.filter((q) => q.quest_type === 'daily');
    const dailyDone = daily.filter((q) => q.completed).length;
    const sideDone = quests.filter((q) => q.quest_type === 'side' && q.completed).length;
    const totalDone = quests.filter((q) => q.completed).length;

    const today = new Date().toISOString().split('T')[0];
    const todayXP = xpHistory.filter((e) => e.date === today).reduce((sum, e) => sum + e.xp, 0);

    const grade = getDailyGrade(dailyDone, daily.length, sideDone, !!todayCheckin);
    const quote = getDailyQuote();

    return { dailyDone, dailyTotal: daily.length, sideDone, totalDone, todayXP, grade, quote };
  }, [quests, todayCheckin, xpHistory]);

  if (!isEvening || review.totalDone === 0) {
    const quote = getDailyQuote();
    if (hour >= 6 && hour < 18 && review.totalDone === 0) {
      return (
        <HUDPanel delay={6} className="mt-4">
          <div className="flex items-start gap-3">
            <Quote size={14} className="text-text-placeholder mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-text-secondary italic">&ldquo;{quote.text}&rdquo;</p>
              {quote.author && <p className="text-xs text-text-placeholder mt-1">— {quote.author}</p>}
            </div>
          </div>
        </HUDPanel>
      );
    }
    return null;
  }

  return (
    <HUDPanel delay={6} className="mt-4">
      <div className="flex items-center gap-2 mb-4">
        <Moon size={14} className="text-purple" />
        <span className="text-sm font-semibold text-text-primary">Daily Review</span>
      </div>

      <div className="flex items-center gap-6 mb-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: `${review.grade.color}14` }}>
          <span className="text-3xl font-black" style={{ color: review.grade.color }}>{review.grade.grade}</span>
        </motion.div>
        <div className="flex-1">
          <div className="text-base font-semibold text-text-primary">{review.grade.label}</div>
          <div className="text-xs text-text-tertiary mt-0.5">Today&apos;s performance grade</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-bg-elevated">
          <CheckCircle2 size={14} className="text-success" />
          <div>
            <div className="text-sm font-semibold text-text-primary">{review.totalDone}</div>
            <div className="text-[11px] text-text-tertiary">Tasks done</div>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-bg-elevated">
          <Zap size={14} className="text-accent" />
          <div>
            <div className="text-sm font-semibold text-text-primary">{review.todayXP.toLocaleString()}</div>
            <div className="text-[11px] text-text-tertiary">XP earned</div>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-bg-elevated">
          <Flame size={14} className="text-warning" />
          <div>
            <div className="text-sm font-semibold text-text-primary">{user?.current_streak || 0}d</div>
            <div className="text-[11px] text-text-tertiary">Streak</div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border">
        <div className="flex items-start gap-2.5">
          <Quote size={12} className="text-text-placeholder mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-text-secondary italic">&ldquo;{review.quote.text}&rdquo;</p>
            {review.quote.author && <p className="text-[11px] text-text-placeholder mt-0.5">— {review.quote.author}</p>}
          </div>
        </div>
      </div>
    </HUDPanel>
  );
}
