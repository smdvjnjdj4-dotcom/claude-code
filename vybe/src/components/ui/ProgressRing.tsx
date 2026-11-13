import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useId } from 'react';
import { useReducedMotion } from '@/lib/motion';

interface Props {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  children?: ReactNode;
  color?: string; // rgb triplet; default gradient
  trackOpacity?: number;
  label?: string;
}

export function ProgressRing({ value, size = 120, stroke = 10, children, color, trackOpacity = 0.08, label }: Props) {
  const reduce = useReducedMotion();
  const id = useId();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={label ?? `${Math.round(v * 100)}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgb(var(--accent))" />
            <stop offset="100%" stopColor="rgb(var(--accent2))" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--line))" strokeOpacity={trackOpacity} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color ? `rgb(${color})` : `url(#g${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduce ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - v) }}
          transition={{ duration: reduce ? 0 : 1.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 ${stroke * 0.6}px rgb(${color ?? 'var(--accent)'} / 0.45))` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}
