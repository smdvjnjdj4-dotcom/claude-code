import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from '@/lib/motion';
import { IconButton } from './primitives';
import { useT } from '@/lib/i18n';

/** Accessible modal: bottom sheet on mobile, centered dialog on desktop. Esc closes, focus is trapped. */
export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useT();
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
        else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    setTimeout(() => ref.current?.querySelector<HTMLElement>('input, textarea, select')?.focus() ?? ref.current?.focus(), 60);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={reduce ? { opacity: 0 } : { y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 36 }}
            className="relative z-10 flex max-h-[92dvh] w-full flex-col rounded-t-[28px] border hairline bg-surface shadow-2xl outline-none sm:max-w-lg sm:rounded-[28px]"
          >
            <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line/15 sm:hidden" />
            <div className="flex items-center justify-between px-6 pb-2 pt-4">
              <h2 className="font-display text-lg font-semibold">{title}</h2>
              <IconButton icon="X" label={t('common.close')} onClick={onClose} />
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-4">{children}</div>
            {footer && <div className="safe-bottom flex gap-3 border-t hairline px-6 py-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
