"use client";

import { ChevronsUpDownIcon, SearchIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Spinner } from "@/components/ui/spinner";

/**
 * The list's search field and generation filter. Like a search bar on iOS they apply as you type or pick,
 * with no "Terapkan" step; the query string stays the source of truth so results can be linked.
 */
export function ListFilters({ q, gen, generations, autoFocus }: { q: string; gen: number | null; generations: number[]; autoFocus?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [text, setText] = useState(q);
  const [pending, start] = useTransition();
  const typed = useRef(false);

  function go(next: { q?: string; gen?: string }) {
    const sp = new URLSearchParams(params.toString());
    sp.delete("hal");
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    const s = sp.toString();
    start(() => router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false }));
  }

  // A short pause after typing, so each keystroke doesn't fetch the page again.
  useEffect(() => {
    if (!typed.current) return;
    const t = setTimeout(() => go({ q: text.trim() }), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2" role="search">
      <label className="flex h-10 min-w-0 flex-1 basis-72 items-center gap-2 rounded-[10px] bg-muted px-3 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/40">
        {pending ? <Spinner className="size-4 text-muted-foreground" /> : <SearchIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
        <input
          type="search"
          value={text}
          onChange={(e) => {
            typed.current = true;
            setText(e.target.value);
          }}
          placeholder="Cari nama, panggilan, atau tempat lahir"
          aria-label="Cari"
          autoComplete="off"
          // Arrives from "Cari saya": the search is the only thing to do on this page.
          autoFocus={autoFocus}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:cursor-pointer"
        />
      </label>
      <span className="relative flex h-10 items-center rounded-[10px] bg-muted has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/40">
        <select
          value={gen ?? ""}
          onChange={(e) => go({ gen: e.target.value })}
          aria-label="Filter generasi"
          className="h-full cursor-pointer appearance-none bg-transparent pr-8 pl-3 text-[15px] outline-none"
        >
          <option value="">Semua generasi</option>
          {generations.map((g) => (
            <option key={g} value={g}>
              Generasi {g}
            </option>
          ))}
        </select>
        <ChevronsUpDownIcon className="pointer-events-none absolute right-2.5 size-4 text-muted-foreground" aria-hidden />
      </span>
    </div>
  );
}
