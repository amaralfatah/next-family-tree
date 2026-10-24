import { ChevronLeftIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/*
 * One frame for every page under a tree and the account pages, so width, title and back navigation are the
 * same everywhere: a readable column (wider for the list), a large title with size-specific tracking, a
 * 15px subtitle, and an iOS back link instead of a web breadcrumb.
 */

export function Page({ wide = false, className, children }: { wide?: boolean; className?: string; children: React.ReactNode }) {
  return <main id="content" className={cn("mx-auto w-full px-4 py-8", wide ? "max-w-3xl" : "max-w-2xl", className)}>{children}</main>;
}

export function PageTitle({ title, subtitle, action, eyebrow }: { title: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode; eyebrow?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        {eyebrow ? <p className="text-[15px] text-muted-foreground">{eyebrow}</p> : null}
        <h1 className="font-display text-[2.125rem] leading-tight tracking-[-0.02em] text-balance">{title}</h1>
        {subtitle ? <p className="mt-1 text-[15px] text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}

/** "‹ Daftar": back to where the page was opened from, in the tint colour, with a 44px target. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="-ml-1.5 mb-2 inline-flex min-h-11 max-w-full items-center gap-0.5 rounded-md pr-2 text-[17px] text-soga-ink outline-none hover:opacity-80 focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-60">
      <ChevronLeftIcon className="size-6 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}
