"use client";

import { SearchIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

/**
 * Nudges a member who isn't linked to a person yet: finding yourself is the fastest
 * way to "hubungan dengan saya" (PRD success criterion: under a minute).
 */
export function WelcomeBanner({ treeId, joined, linked }: { treeId: string; joined: boolean; linked: boolean }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <div className="no-print border-b bg-accent/60">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 text-[13px] sm:py-2.5 sm:text-sm">
        <p className="flex-1">
          {joined ? <strong className="font-semibold">Selamat bergabung! </strong> : null}
          {linked
            ? "Klik siapa pun di bagan untuk melihat hubungannya dengan Anda."
            : "Tandai diri Anda di pohon untuk melihat hubungan dengan setiap kerabat."}
        </p>
        {!linked ? (
          <Link href={`/pohon/${treeId}/daftar?cari-saya=1`} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-foreground">
            <SearchIcon className="size-3.5" /> Cari saya
          </Link>
        ) : null}
        <button type="button" onClick={() => setHidden(true)} aria-label="Tutup" className="text-muted-foreground hover:text-foreground">
          <XIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}
