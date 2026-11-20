import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn, gradientFor, initials } from "@/lib/utils";

/* ─────────────────────────── Button ─────────────────────────── */

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "soft";
type Size = "sm" | "md" | "lg" | "icon";

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "pressable inline-flex select-none items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap",
    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25 disabled:pointer-events-none disabled:opacity-50",
    {
      primary: "bg-brand text-brand-fg shadow-[0_6px_20px_-8px_var(--brand)] hover:bg-brand-strong",
      secondary: "bg-fg text-bg hover:opacity-90",
      soft: "bg-brand-soft text-brand hover:brightness-95",
      ghost: "text-fg hover:bg-surface-2",
      outline: "border border-line bg-surface text-fg hover:bg-surface-2",
      danger: "bg-danger text-white hover:brightness-110",
    }[variant],
    { sm: "h-9 px-4 text-sm", md: "h-11 px-5 text-[15px]", lg: "h-13 px-7 text-base", icon: "h-10 w-10" }[size],
    className,
  );
}

export function Button({ variant, size, className, ...props }: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({ variant, size, className, ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

/* ─────────────────────────── Surfaces ─────────────────────────── */

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-3xl border border-line bg-surface shadow-card", className)} {...props} />;
}

export function CardHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
      <div className="min-w-0">
        <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("p-5 sm:p-6", className)} {...props} />;
}

export function PageHeader({ title, description, action, back }: { title: ReactNode; description?: ReactNode; action?: ReactNode; back?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 animate-fade-up">
      <div className="min-w-0">
        {back && (
          <Link href={back} className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-fg">
            ← Zurück
          </Link>
        )}
        <h1 className="text-[28px] font-bold leading-tight tracking-tight sm:text-[32px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[15px] text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function SectionHeader({ title, href, linkLabel = "Alle anzeigen" }: { title: ReactNode; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h2 className="text-[20px] font-bold tracking-tight">{title}</h2>
      {href && (
        <Link href={href} className="text-sm font-semibold text-brand hover:underline">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

/* ─────────────────────────── Badges ─────────────────────────── */

type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "dark";
export function Badge({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        {
          neutral: "bg-surface-2 text-muted",
          brand: "bg-brand-soft text-brand",
          success: "bg-success-soft text-success",
          warning: "bg-warning-soft text-warning",
          danger: "bg-danger-soft text-danger",
          dark: "bg-black/60 text-white backdrop-blur",
        }[tone],
        className,
      )}
      {...props}
    />
  );
}

/* ─────────────────────────── Form controls ─────────────────────────── */

const fieldBase =
  "w-full rounded-2xl border border-line bg-surface-2 px-4 text-[15px] text-fg placeholder:text-muted/70 transition focus:border-brand focus:bg-surface focus:outline-none focus:ring-4 focus:ring-brand/15 disabled:opacity-60";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(fieldBase, "h-12", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(fieldBase, "min-h-24 py-3", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(fieldBase, "h-12 appearance-none bg-[length:16px] bg-[right_1rem_center] bg-no-repeat pr-10", className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...props} />;
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("mb-1.5 block text-sm font-semibold", className)} {...props} />;
}

export function Hint({ children }: { children: ReactNode }) {
  return <p className="mt-1.5 text-xs text-muted">{children}</p>;
}

export function Switch({ name, defaultChecked, label, description, disabled }: { name: string; defaultChecked?: boolean; label: ReactNode; description?: ReactNode; disabled?: boolean }) {
  return (
    <label className={cn("flex cursor-pointer items-start justify-between gap-4 py-2", disabled && "cursor-not-allowed opacity-60")}>
      <span>
        <span className="block text-[15px] font-medium">{label}</span>
        {description && <span className="mt-0.5 block text-sm text-muted">{description}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" name={name} defaultChecked={defaultChecked} disabled={disabled} className="peer sr-only" />
        <span className="h-7 w-12 rounded-full bg-surface-3 transition peer-checked:bg-brand peer-focus-visible:ring-4 peer-focus-visible:ring-brand/25" />
        <span className="absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

/* ─────────────────────────── Identity ─────────────────────────── */

export function Avatar({ name, src, size = 40, className, color }: { name: string; src?: string | null; size?: number; className?: string; color?: string | null }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white", className)}
      style={{ width: size, height: size, fontSize: size * 0.38, background: src ? undefined : gradientFor(name, color) }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-bold tracking-tight", className)}>
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <defs>
          <linearGradient id="stamply-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8B6DFF" />
            <stop offset="1" stopColor="#5532F0" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="10" fill="url(#stamply-g)" />
        <circle cx="16" cy="16" r="8.5" fill="none" stroke="#fff" strokeWidth="2.2" strokeDasharray="3 2.2" />
        <path d="m12 16.2 2.8 2.8 5.4-5.6" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-[19px]">stamply</span>
    </span>
  );
}

/* ─────────────────────────── States ─────────────────────────── */

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-line bg-surface/60 px-6 py-12 text-center animate-fade-up">
      {icon && <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-2xl text-brand">{icon}</div>}
      <h3 className="text-[17px] font-semibold">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-2xl", className)} />;
}

export function Notice({ tone = "brand", title, children }: { tone?: "brand" | "warning" | "danger" | "success" | "neutral"; title?: ReactNode; children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-2xl px-4 py-3 text-sm",
        { brand: "bg-brand-soft text-fg", warning: "bg-warning-soft text-fg", danger: "bg-danger-soft text-fg", success: "bg-success-soft text-fg", neutral: "bg-surface-2 text-fg" }[tone],
      )}
    >
      {title && <p className="mb-0.5 font-semibold">{title}</p>}
      <div className="text-fg/80">{children}</div>
    </div>
  );
}

/* ─────────────────────────── Loyalty visuals ─────────────────────────── */

export function StampDots({ progress, required, color, size = "md" }: { progress: number; required: number; color?: string | null; size?: "sm" | "md" | "lg" }) {
  const dim = { sm: "h-3.5 w-3.5", md: "h-7 w-7", lg: "h-10 w-10" }[size];
  return (
    <div className={cn("flex flex-wrap", size === "sm" ? "gap-1" : "gap-2")} role="img" aria-label={`${progress} von ${required} Stempeln`}>
      {Array.from({ length: required }, (_, i) => {
        const filled = i < progress;
        const last = i === required - 1;
        return (
          <span
            key={i}
            className={cn(
              dim,
              "inline-flex shrink-0 items-center justify-center rounded-full border-2 transition",
              filled ? "border-transparent text-white animate-pop" : "border-dashed border-surface-3 text-muted",
            )}
            style={filled ? { background: color ?? "var(--brand)", animationDelay: `${i * 40}ms` } : undefined}
          >
            {size !== "sm" && (filled ? <CheckIcon /> : last ? <span className="text-[11px]">🎁</span> : null)}
          </span>
        );
      })}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[55%] w-[55%]" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export function ProgressBar({ value, max, color }: { value: number; max: number; color?: string | null }) {
  const pct = Math.min(100, Math.round((value / Math.max(1, max)) * 100));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${pct}%`, background: color ?? "var(--brand)" }} />
    </div>
  );
}

/* ─────────────────────────── Stats ─────────────────────────── */

export function StatCard({
  label,
  value,
  hint,
  estimated,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  estimated?: boolean;
  icon?: ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted">{label}</span>
        {icon && <span className="text-muted">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-[30px] font-bold tracking-tight tabular-nums">{value}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
        <Badge tone={estimated ? "warning" : "neutral"}>{estimated ? "Schätzung" : "Messwert"}</Badge>
        {hint && <span>{hint}</span>}
      </div>
    </Card>
  );
}
