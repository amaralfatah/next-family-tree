import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";

export default function NotFound() {
  const t = useTranslations("common.notFound");
  return (
    <main id="content" className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <Wordmark className="justify-center" />
        <h1 className="mt-8 font-display text-[2.125rem] leading-tight tracking-[-0.02em]">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("message")}</p>
        <Link href="/trees" className={buttonVariants({ variant: "outline", className: "mt-6" })}>
          {t("action")}
        </Link>
      </div>
    </main>
  );
}
