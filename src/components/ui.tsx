"use client";

import Link from "next/link";
import { Search20Regular } from "@fluentui/react-icons";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

export function Card({
  children,
  className,
  onClick,
  style,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  style?: CSSProperties;
}) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={style}
        className={cn("card tap w-full p-[var(--space-200)] text-left transition hover:border-[var(--line-strong)]", className)}
      >
        {children}
      </button>
    );
  }
  return (
    <div style={style} className={cn("card p-[var(--space-200)] text-left", className)}>
      {children}
    </div>
  );
}

export function Button({
  children,
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "soft" }) {
  const styles = {
    primary:
      "bg-[var(--colorBrandBackground)] text-white hover:bg-[var(--colorBrandBackgroundHover)] active:bg-[var(--colorBrandBackgroundPressed)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--colorStrokeFocus2)]",
    ghost:
      "bg-white/40 text-[var(--ink)] border border-[var(--glass-line)] backdrop-blur-md hover:bg-white/60 active:bg-white/72 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--colorStrokeFocus2)]",
    danger:
      "bg-[var(--status-danger)] text-white hover:bg-[var(--status-danger-hover)] active:bg-[var(--status-danger-press)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--colorStrokeFocus2)]",
    soft:
      "bg-[var(--brand-soft)] text-[var(--brand-ink)] hover:bg-[var(--brand-20)] active:bg-[var(--brand-20)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--colorStrokeFocus2)]",
  };
  return (
    <button
      className={cn(
        "tap inline-flex items-center justify-center gap-[var(--space-100)] rounded-[var(--radius-btn)] px-[var(--space-200)] py-[var(--space-100)] text-[var(--font-size-300)] font-semibold transition disabled:bg-[var(--neutral-6)] disabled:text-[var(--colorNeutralForegroundDisabled)] disabled:opacity-100",
        styles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Tag({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "brand" | "success" | "warning" | "danger" }) {
  const map = {
    neutral: "text-[var(--colorNeutralForeground2)]",
    brand: "bg-[color-mix(in_srgb,var(--brand-soft)_78%,transparent)] text-[var(--brand-ink)]",
    success: "bg-[var(--status-success-bg)] text-[var(--status-success)]",
    warning: "bg-[var(--status-warning-bg)] text-[var(--status-warning)]",
    danger: "bg-[var(--status-danger-bg)] text-[var(--status-danger)]",
  };
  return (
    <span className={cn("inline-flex items-center rounded-[var(--radius-small)] border border-[var(--glass-line)] bg-white/45 px-[var(--space-100)] py-[2px] text-[var(--font-size-200)] font-semibold backdrop-blur-sm", map[tone])}>
      {children}
    </span>
  );
}

export function Stars({ n, color = "var(--brand)" }: { n: number; color?: string }) {
  return (
    <span className="tracking-tight" aria-label={`${n}점`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ color: i < n ? color : "var(--neutral-14)" }}>
          ★
        </span>
      ))}
    </span>
  );
}

export function Progress({ value, color = "var(--brand)", label }: { value: number; color?: string; label?: string }) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div>
      <div className="h-1.5 overflow-hidden rounded-sm bg-[var(--neutral-6)]" role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="h-full rounded-sm transition-all" style={{ width: `${v}%`, background: color }} />
      </div>
    </div>
  );
}

export function Meter({
  label,
  hint,
  value,
  color = "var(--brand)",
}: {
  label: string;
  hint?: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <p className="truncate text-sm font-semibold">{label}</p>
        {hint ? <p className="shrink-0 text-xs text-[var(--muted)]">{hint}</p> : null}
      </div>
      <Progress value={value} color={color} label={label} />
    </div>
  );
}

export function PageTitle({ kicker, title, sub }: { kicker?: string; title: string; sub?: string }) {
  return (
    <header className="mb-[var(--space-300)]">
      {kicker ? <p className="mb-[var(--space-50)] text-[var(--font-size-200)] font-semibold text-[var(--muted)]">{kicker}</p> : null}
      <h1 className="text-[var(--font-size-600)] font-semibold leading-[var(--line-600)] tracking-tight break-keep">{title}</h1>
      {sub ? <p className="mt-[var(--space-100)] max-w-[40rem] text-[var(--font-size-300)] leading-[var(--line-400)] text-[var(--muted)]">{sub}</p> : null}
    </header>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  "aria-label": string;
}) {
  return (
    <label className="relative block">
      <Search20Regular className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-[var(--muted)]" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="field field-icon"
        aria-label={ariaLabel}
      />
    </label>
  );
}

export function Pivot({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div role="tablist" className="pivot">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          className="pivot-item tap"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function Choice({
  selected,
  children,
  onClick,
  className,
}: {
  selected: boolean;
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} className={cn("choice tap w-full", selected && "choice-on", className)}>
      {children}
    </button>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[var(--font-size-200)] text-[var(--muted)]">{label}</p>
      <p className="mt-[var(--space-50)] text-[var(--font-size-700)] font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-[var(--space-50)] text-[var(--font-size-200)] text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}

export function HeroBanner({
  kicker,
  title,
  sub,
  actions,
}: {
  kicker?: string;
  title: ReactNode;
  sub?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-[var(--space-300)]">
      {kicker ? <p className="text-[var(--font-size-200)] font-semibold text-[var(--muted)]">{kicker}</p> : null}
      <h1 className="mt-[var(--space-100)] text-[var(--font-size-700)] font-semibold leading-[var(--line-600)] tracking-tight break-keep">{title}</h1>
      {sub ? <p className="mt-[var(--space-100)] max-w-[36rem] text-[var(--font-size-300)] text-[var(--muted)]">{sub}</p> : null}
      {actions ? <div className="mt-[var(--space-200)]">{actions}</div> : null}
    </header>
  );
}

export function IconTile({ children }: { children: ReactNode }) {
  return <span className="icon-tile">{children}</span>;
}

export function FitnessRow({
  color,
  name,
  desc,
  stars,
}: {
  color: string;
  name: string;
  desc: string;
  stars: number;
}) {
  return (
    <div className="flex min-w-0 items-center gap-[var(--space-150)] py-[var(--space-100)]">
      <span className="h-8 w-1 shrink-0 rounded-sm" style={{ background: color }} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{name}</p>
        <p className="truncate text-xs text-[var(--muted)]">{desc}</p>
        <div className="mt-2">
          <Progress value={stars * 20} color={color} label={name} />
        </div>
      </div>
    </div>
  );
}

export function BtnRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("btn-row", className)}>{children}</div>;
}

export function SectionTitle({ children, href, linkLabel }: { children: ReactNode; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-[var(--space-150)] flex items-end justify-between gap-[var(--space-100)]">
      <h2 className="text-[var(--font-size-400)] font-semibold">{children}</h2>
      {href ? (
        <Link href={href} className="text-[var(--font-size-300)] font-semibold text-[var(--brand)] hover:underline">
          {linkLabel ?? "모두 보기"}
        </Link>
      ) : null}
    </div>
  );
}
