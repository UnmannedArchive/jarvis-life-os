'use client';

interface StatusIndicatorProps {
  label: string;
  status: 'online' | 'warning' | 'danger' | 'pending';
  sublabel?: string;
}

const statusColors = {
  online: '#40c057',
  warning: '#fab005',
  danger: '#fa5252',
  pending: '#adb5bd',
};

export default function StatusIndicator({ label, status, sublabel }: StatusIndicatorProps) {
  const color = statusColors[status];
  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      <div className="flex flex-col">
        <span className="text-xs font-medium text-text-secondary">{label}</span>
        {sublabel && <span className="text-[11px] text-text-tertiary">{sublabel}</span>}
      </div>
    </div>
  );
}
