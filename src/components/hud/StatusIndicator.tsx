'use client';

interface StatusIndicatorProps {
  label: string;
  status: 'online' | 'warning' | 'danger' | 'pending';
  sublabel?: string;
}

const statusColors = {
  online: '#00ff88',
  warning: '#ffd740',
  danger: '#ff6e40',
  pending: '#7fba9a',
};

export default function StatusIndicator({ label, status, sublabel }: StatusIndicatorProps) {
  const color = statusColors[status];

  return (
    <div className="flex items-center gap-2">
      <div
        className="w-2 h-2 rounded-full status-dot"
        style={{ backgroundColor: color, color }}
      />
      <div className="flex flex-col">
        <span
          className="text-[10px] font-[family-name:var(--font-orbitron)] tracking-[2px] uppercase"
          style={{ color }}
        >
          {label}
        </span>
        {sublabel && (
          <span className="text-[9px] text-hud-text-dim">{sublabel}</span>
        )}
      </div>
    </div>
  );
}
