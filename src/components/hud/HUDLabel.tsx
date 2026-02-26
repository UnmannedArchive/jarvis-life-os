'use client';

interface HUDLabelProps {
  text: string;
  className?: string;
}

export default function HUDLabel({ text, className = '' }: HUDLabelProps) {
  return (
    <div className={`flex items-center gap-3 mb-3 ${className}`}>
      <span className="text-[10px] font-[family-name:var(--font-orbitron)] tracking-[3px] uppercase text-hud-green glow-text">
        {text}
      </span>
      <div className="flex-1 h-px bg-gradient-to-r from-hud-green/30 to-transparent" />
      <span className="text-hud-green/40 text-[10px]">◆</span>
    </div>
  );
}
