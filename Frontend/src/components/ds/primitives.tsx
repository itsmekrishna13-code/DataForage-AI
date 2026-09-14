import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatStatus = "success" | "error" | "neutral";

export function StatCard({
  icon: Icon,
  label,
  value,
  footer,
  status = "neutral",
  statusLabel,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  footer?: string;
  status?: StatStatus;
  statusLabel?: string;
}) {
  const statusStyles: Record<StatStatus, string> = {
    success: "text-[color:var(--success)] bg-[color:var(--success-soft)]",
    error: "text-destructive bg-[color:var(--destructive-soft)]",
    neutral: "text-muted-foreground bg-[color:var(--neutral-soft)]",
  };
  return (
    <div className="rounded-[10px] border bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[color:var(--accent-soft)] text-primary">
          <Icon className="h-5 w-5" />
        </div>
        {statusLabel && (
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
              statusStyles[status]
            )}
          >
            {statusLabel}
          </span>
        )}
      </div>
      <div className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-mono-num text-3xl font-semibold text-foreground">
        {value}
      </div>
      {footer && (
        <>
          <div className="mt-4 border-t" />
          <div className="mt-3 text-xs text-muted-foreground">{footer}</div>
        </>
      )}
    </div>
  );
}

export function SectionHeader({
  title,
  caption,
  action,
}: {
  title: string;
  caption?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-3">
      <div className="min-w-0">
        <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
        {caption && (
          <p className="mt-1 text-sm text-muted-foreground">{caption}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function InsightCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[10px] border border-l-[4px] border-l-primary bg-[color:var(--accent-soft)] p-5">
      {children}
    </div>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "primary" | "success" | "error" | "neutral";
}) {
  const styles = {
    primary: "text-primary bg-[color:var(--accent-soft)]",
    success: "text-[color:var(--success)] bg-[color:var(--success-soft)]",
    error: "text-destructive bg-[color:var(--destructive-soft)]",
    neutral: "text-muted-foreground bg-[color:var(--neutral-soft)]",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[tone]
      )}
    >
      {children}
    </span>
  );
}

export function CardShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[10px] border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.06)]",
        className
      )}
    >
      {children}
    </div>
  );
}
