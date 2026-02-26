# JARVIS Life OS

A gamified personal life operating system with a sci-fi HUD interface inspired by Tony Stark's JARVIS. Track every area of your life, earn XP, level up, and maintain streaks across 6 life pillars.

## Features

- **JARVIS HUD Interface** — Dark sci-fi command center with glowing green/cyan accents, animated scanlines, corner accents, and terminal log
- **6 Life Pillars** — Mind, Body, Work, Wealth, Spirit, Social — tracked with XP, levels, and streaks
- **Smart Priority Queue** — Auto-ranks daily tasks based on urgency, streak risk, pillar balance, energy level, and difficulty flow
- **XP & Leveling System** — Earn XP for completing quests with streak multipliers, combo bonuses, and perfect day rewards
- **Character Classes** — Evolves based on dominant pillar: Scholar, Warrior, Engineer, Strategist, Monk, Diplomat, or Polymath
- **Daily Check-in** — Sleep, energy, and mood tracking that influences task prioritization
- **Radar Chart** — Life balance visualization across all 6 pillars
- **Terminal Activity Log** — Real-time scrolling feed of all actions
- **Responsive Design** — Desktop, tablet, and mobile layouts

## Tech Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS** with custom HUD effects
- **Zustand** for state management
- **Supabase** for database + auth (optional, runs in demo mode without it)
- **Framer Motion** for animations
- **Lucide React** for icons
- **date-fns** for date utilities

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the app runs in demo mode with sample data out of the box.

## Supabase Setup (Optional)

To connect to Supabase for persistent data:

1. Create a project at [supabase.com](https://supabase.com)
2. Run the schema in `supabase-schema.sql` in your Supabase SQL Editor
3. Copy your project URL and anon key to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Game Mechanics

| Difficulty | Base XP |
|-----------|---------|
| EASY | 50 |
| MEDIUM | 100 |
| HARD | 150 |
| LEGENDARY | 300 |

**Streak Multipliers:** 3+ days (1.25x), 7+ days (1.5x), 14+ days (1.75x), 30+ days (2.0x)

**Combo Bonus:** 3+ different pillars in one day = 1.25x

**Perfect Day:** All daily quests completed = 1.5x bonus
