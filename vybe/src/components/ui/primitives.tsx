import { motion, type HTMLMotionProps } from 'framer-motion';
import { forwardRef, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { useReducedMotion, spring } from '@/lib/motion';
import { Icon } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg' | 'icon';
  icon?: string;
  children?: ReactNode;
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = 'primary', size = 'md', icon, className, children, ...rest }, ref) {
  const reduce = useReducedMotion();
  const base = 'relative inline-flex select-none items-center justify-center gap-2 font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none';
  const sizes = { sm: 'h-9 px-3.5 text-sm rounded-xl', md: 'h-11 px-5 text-[15px] rounded-2xl', lg: 'h-14 px-7 text-base rounded-2xl', icon: 'h-10 w-10 rounded-xl' };
  const variants: Record<Variant, string> = {
    primary: 'bg-gradient-accent text-white shadow-glow hover:brightness-110',
    secondary: 'glass text-fg hover:bg-elevated',
    ghost: 'text-muted hover:text-fg hover:bg-line/5',
    danger: 'bg-danger/15 text-danger hover:bg-danger/25 border border-danger/30',
  };
  return (
    <motion.button ref={ref} whileTap={reduce ? undefined : { scale: 0.96 }} transition={spring} className={cn(base, sizes[size], variants[variant], className)} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}
      {children}
    </motion.button>
  );
});

export function Card({ className, interactive, children, ...rest }: HTMLMotionProps<'div'> & { interactive?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      whileHover={interactive && !reduce ? { y: -3 } : undefined}
      transition={spring}
      className={cn('card p-5', interactive && 'cursor-pointer transition-shadow hover:shadow-glow', className)}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function SectionHeader({ title, action, className }: { title: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-3 flex items-center justify-between gap-3', className)}>
      <h2 className="font-display text-[15px] font-semibold tracking-tight text-fg">{title}</h2>
      {action}
    </div>
  );
}

export function Chip({ selected, onClick, children, className, icon }: { selected?: boolean; onClick?: () => void; children: ReactNode; className?: string; icon?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-all',
        selected ? 'border-accent/60 bg-accent/15 text-fg shadow-[0_0_0_3px_rgb(var(--accent)/0.12)]' : 'hairline bg-elevated/50 text-muted hover:text-fg',
        className,
      )}
    >
      {icon && <Icon name={icon} size={15} />}
      {children}
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange, className, label }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; className?: string; label?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('relative flex rounded-2xl bg-elevated/60 p-1 hairline border', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn('relative z-10 flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors', value === o.value ? 'text-fg' : 'text-muted hover:text-fg')}
        >
          {value === o.value && <motion.span layoutId={`seg-${label}`} transition={spring} className="absolute inset-0 -z-10 rounded-xl bg-surface shadow-card hairline border" />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, error, hint, children }: { label: string; error?: string | null; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {error ? <span role="alert" className="mt-1.5 block text-xs text-danger">{error}</span> : hint ? <span className="mt-1.5 block text-xs text-faint">{hint}</span> : null}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn('input', className)} {...rest} />;
});

export function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-4 py-3 text-left disabled:opacity-40">
      <span>
        <span className="block text-[15px] text-fg">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
      </span>
      <span className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', checked ? 'bg-gradient-accent' : 'bg-line/15')}>
        <motion.span layout transition={spring} className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow', checked ? 'right-1' : 'left-1')} />
      </span>
    </button>
  );
}

export function ProgressBar({ value, className, color }: { value: number; className?: string; color?: string }) {
  const reduce = useReducedMotion();
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className={cn('h-2 overflow-hidden rounded-full bg-line/10', className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color ? `rgb(${color})` : 'linear-gradient(90deg, rgb(var(--accent)), rgb(var(--accent2)))' }}
        initial={reduce ? false : { width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: reduce ? 0 : 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-2xl bg-line/[0.06]', className)} aria-hidden>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-line/[0.06] to-transparent" />
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: string; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <div className="relative mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-accent/10 text-accent">
        <div className="absolute inset-0 rounded-3xl bg-accent/20 blur-xl" />
        <Icon name={icon} size={28} className="relative" />
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-xs text-sm text-muted">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function IconButton({ icon, label, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: string; label: string }) {
  return (
    <button type="button" aria-label={label} title={label} className={cn('grid h-10 w-10 place-items-center rounded-xl text-muted transition hover:bg-line/5 hover:text-fg', className)} {...rest}>
      <Icon name={icon} size={19} />
    </button>
  );
}

export function Badge({ children, tone = 'default', className }: { children: ReactNode; tone?: 'default' | 'accent' | 'warn' | 'success' | 'danger'; className?: string }) {
  const tones = {
    default: 'bg-line/10 text-muted',
    accent: 'bg-accent/15 text-accent',
    warn: 'bg-warn/15 text-warn',
    success: 'bg-success/15 text-success',
    danger: 'bg-danger/15 text-danger',
  };
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide', tones[tone], className)}>{children}</span>;
}
