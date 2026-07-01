'use client';

type Variant = 'card' | 'text' | 'chart' | 'list';

interface SkeletonLoaderProps {
  variant?: Variant;
  className?: string;
}

export default function SkeletonLoader({ variant = 'card', className = '' }: SkeletonLoaderProps) {
  if (variant === 'card') {
    return <div className={`h-32 w-full bg-[rgba(255,255,255,0.06)] rounded-lg animate-pulse ${className}`} />;
  }
  if (variant === 'text') {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="h-4 w-3/4 bg-[rgba(255,255,255,0.06)] rounded animate-pulse" />
        <div className="h-4 w-1/2 bg-[rgba(255,255,255,0.06)] rounded animate-pulse" />
        <div className="h-4 w-5/6 bg-[rgba(255,255,255,0.06)] rounded animate-pulse" />
      </div>
    );
  }
  if (variant === 'chart') {
    return (
      <div className={`h-48 w-full bg-[rgba(255,255,255,0.06)] rounded-lg animate-pulse flex gap-2 items-end p-4 ${className}`}>
        {[40, 65, 45, 80, 55, 70].map((h, i) => (
          <div key={i} className="flex-1 bg-[rgba(255,255,255,0.1)] rounded-t" style={{ height: `${h}%` }} />
        ))}
      </div>
    );
  }
  return (
    <div className={`space-y-2 ${className}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-12 w-full bg-[rgba(255,255,255,0.06)] rounded-lg animate-pulse" />
      ))}
    </div>
  );
}
