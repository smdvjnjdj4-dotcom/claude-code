import { useReducedMotion as useSystemReduced } from 'framer-motion';
import { useVybe } from '@/store/useVybe';

/** True when animations should be minimised (system preference or user setting). */
export function useReducedMotion(): boolean {
  const sys = useSystemReduced();
  const pref = useVybe((s) => s.settings.motion);
  if (pref === 'reduced') return true;
  if (pref === 'full') return false;
  return !!sys;
}

export const spring = { type: 'spring', stiffness: 380, damping: 32 } as const;
export const softSpring = { type: 'spring', stiffness: 160, damping: 22 } as const;
