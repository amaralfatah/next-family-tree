"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations("common.error");
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="content" className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <Wordmark className="justify-center" />
        <h1 className="mt-8 font-display text-[2.125rem] leading-tight tracking-[-0.02em]">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("message")}</p>
        <Button variant="outline" className="mt-6" onClick={() => retry()}>
          {t("retry")}
        </Button>
      </div>
    </main>
  );
}
