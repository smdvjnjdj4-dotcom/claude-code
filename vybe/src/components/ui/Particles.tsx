import { motion } from 'framer-motion';
import { useMemo } from 'react';

/** A short, GPU-friendly burst of particles (transform + opacity only). */
export function ParticleBurst({ count = 14, color = 'var(--accent)' }: { count?: number; color?: string }) {
  const parts = useMemo(
    () => Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 28 + Math.random() * 30;
      return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, s: 3 + Math.random() * 4, alt: i % 3 === 0 };
    }),
    [count],
  );
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden>
      {parts.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{ width: p.s, height: p.s, background: `rgb(${p.alt ? 'var(--accent2)' : color})`, boxShadow: `0 0 8px rgb(${color} / 0.8)` }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.3 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}
    </div>
  );
}
