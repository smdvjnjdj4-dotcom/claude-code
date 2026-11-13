import { animate } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/lib/motion';

/** Counts smoothly to the new value. Renders plain text for screen readers. */
export function AnimatedNumber({ value, format = (n) => Math.round(n).toLocaleString(), className }: { value: number; format?: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      el.textContent = format(value);
      prev.current = value;
      return;
    }
    const controls = animate(prev.current, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => (el.textContent = format(v)),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, reduce, format]);
  return <span ref={ref} className={className + ' num'}>{format(reduce ? value : prev.current)}</span>;
}
