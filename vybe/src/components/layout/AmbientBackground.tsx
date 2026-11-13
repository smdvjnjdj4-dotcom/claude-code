import { useReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/cn';

/** Slow-moving light blobs + fine grid. Pure CSS transforms; paused for reduced motion. */
export function AmbientBackground() {
  const reduce = useReducedMotion();
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className={cn('absolute -left-[20%] -top-[25%] h-[70vmax] w-[70vmax] rounded-full opacity-[0.16] blur-[110px]', !reduce && 'animate-drift')} style={{ background: 'radial-gradient(circle, rgb(var(--accent)), transparent 65%)' }} />
      <div className={cn('absolute -bottom-[30%] -right-[20%] h-[60vmax] w-[60vmax] rounded-full opacity-[0.12] blur-[120px]', !reduce && 'animate-drift')} style={{ background: 'radial-gradient(circle, rgb(var(--accent2)), transparent 65%)', animationDelay: '-12s' }} />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: 'linear-gradient(rgb(var(--line) / 0.025) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--line) / 0.025) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(ellipse at 50% 0%, black 20%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 0%, black 20%, transparent 75%)',
        }}
      />
    </div>
  );
}
