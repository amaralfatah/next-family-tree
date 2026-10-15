import { cn } from "@/lib/utils";

/** A union dot with two lines descending: the smallest possible family chart. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7", className)}>
      <rect x="2" y="3" width="11" height="8" rx="2.5" className="fill-soga" />
      <rect x="19" y="3" width="11" height="8" rx="2.5" className="fill-primary" />
      <path d="M7.5 11v4h17v-4M16 15v5M9 20h14v3M9 20v3" fill="none" className="stroke-nila" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="16" cy="15" r="2.2" className="fill-nila" />
      <rect x="4" y="23" width="10" height="6" rx="2" className="fill-foreground/80" />
      <rect x="18" y="23" width="10" height="6" rx="2" className="fill-foreground/80" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Mark />
      <span className="font-display text-2xl leading-none tracking-tight">Wargi</span>
    </span>
  );
}
