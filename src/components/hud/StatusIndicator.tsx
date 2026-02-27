'use client';

interface StatusIndicatorProps {
  label: string;
  status: 'online' | 'warning' | 'danger' | 'pending';
}

const colors = { online: '#3ecf8e', warning: '#f0b429', danger: '#f25757', pending: '#666666' };

export default function StatusIndicator({ label, status }: StatusIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors[status] }} />
      <span className="text-xs text-text-secondary">{label}</span>
    </div>
  );
}
