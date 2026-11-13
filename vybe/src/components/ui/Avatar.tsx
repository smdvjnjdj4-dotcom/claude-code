import { motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/cn';

/** Abstract character orb: initials inside a living aura. The aura colour follows the active accent. */
export function Avatar({ name, size = 64, level, className }: { name: string; size?: number; level?: number; className?: string }) {
  const reduce = useReducedMotion();
  const initials = name.trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || 'V';
  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }}>
      <motion.div
        className="absolute -inset-1 rounded-full opacity-80 blur-md"
        style={{ background: 'conic-gradient(from 0deg, rgb(var(--accent)), rgb(var(--accent2)), rgb(var(--accent)))' }}
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
      />
      <div className="absolute inset-0 rounded-full p-[2px]" style={{ background: 'linear-gradient(135deg, rgb(var(--accent)), rgb(var(--accent2)))' }}>
        <div className="grid h-full w-full place-items-center rounded-full bg-surface">
          <span className="font-display font-semibold text-gradient" style={{ fontSize: size * 0.34 }}>{initials}</span>
        </div>
      </div>
      {level !== undefined && (
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full border hairline bg-surface px-2 py-0.5 text-[10px] font-bold num shadow-card">
          {level}
        </span>
      )}
    </div>
  );
}
