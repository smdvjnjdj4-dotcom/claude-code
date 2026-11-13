import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useReducedMotion } from '@/lib/motion';
import { IconButton } from '@/components/ui/primitives';
import { useT } from '@/lib/i18n';

export function Page({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.main
      id="main"
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, filter: 'blur(4px)' }}
      transition={{ duration: reduce ? 0.12 : 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="safe-top mx-auto w-full max-w-5xl px-4 pb-32 pt-5 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10"
    >
      {children}
    </motion.main>
  );
}

export function PageHeader({ title, subtitle, actions, back }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; back?: () => void }) {
  const { t } = useT();
  return (
    <header className="mb-6 flex items-end justify-between gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {back && <IconButton icon="ArrowLeft" label={t('common.back')} onClick={back} className="-ml-2" />}
        <div className="min-w-0">
          <h1 className="truncate font-display text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
