'use client';

interface HUDLabelProps {
  text: string;
  className?: string;
}

export default function HUDLabel({ text, className = '' }: HUDLabelProps) {
  return (
    <h3 className={`text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3 ${className}`}>
      {text}
    </h3>
  );
}
