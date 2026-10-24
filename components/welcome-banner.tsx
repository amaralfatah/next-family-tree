"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Nudges a member who isn't linked to a person yet: finding yourself is the fastest
 * way to "hubungan dengan saya" (PRD success criterion: under a minute).
 */
export function WelcomeBanner({ treeId, joined, linked }: { treeId: string; joined: boolean; linked: boolean }) {
  const t = useTranslations("public.welcome");
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <div className="no-print border-b">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-1.5 text-[13px] text-muted-foreground sm:text-sm">
        <p className="flex-1">
          {joined ? <strong className="font-semibold text-foreground">{t("joined")} </strong> : null}
          {linked ? t("linkedHint") : t("unlinkedHint")}
        </p>
        {!linked ? (
          <Link href={`/trees/${treeId}/list?find-me=1`} className="hit flex min-h-9 shrink-0 items-center gap-1.5 rounded-md font-medium text-soga-ink outline-none hover:opacity-80 focus-visible:ring-3 focus-visible:ring-ring/40 active:opacity-60">
            <SearchIcon className="size-3.5" /> {t("findMe")}
          </Link>
        ) : null}
        <Button variant="ghost" size="icon-sm" className="hit" onClick={() => setHidden(true)} aria-label={t("close")}>
          <XIcon />
        </Button>
      </div>
    </div>
  );
}
