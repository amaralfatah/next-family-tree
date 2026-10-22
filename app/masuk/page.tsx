import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DevLoginForm } from "@/components/dev-login-form";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wordmark } from "@/components/wordmark";
import { devLoginEnabled, getCurrentUser, googleEnabled, safeNext } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Masuk" };

export default async function LoginPage({ searchParams }: PageProps<"/masuk">) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null);
  if (await getCurrentUser()) redirect(next);
  const google = googleEnabled();
  const dev = devLoginEnabled();
  const fromInvite = next.startsWith("/undangan/");

  return (
    <main id="konten" className="grid min-h-dvh place-items-center bg-grouped px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.12)] sm:p-8">
        <Link href="/" className="inline-block rounded-md outline-none hover:opacity-80 focus-visible:ring-3 focus-visible:ring-ring/50">
          <Wordmark full />
        </Link>
        <h1 className="mt-6 font-display text-[1.75rem] leading-tight tracking-[-0.03em] text-balance">{fromInvite ? "Masuk untuk bergabung" : "Masuk ke Sararia Family Tree"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {fromInvite
            ? "Anda diundang ke sebuah pohon keluarga. Masuk dulu agar data keluarga tetap terlindungi."
            : "Silsilah keluarga bersifat privat. Masuk untuk membuat atau membuka pohon keluarga Anda."}
        </p>

        {sp.error === "google" ? (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>Login Google gagal atau dibatalkan. Silakan coba lagi.</AlertDescription>
          </Alert>
        ) : null}

        {google ? (
          <GoogleSignInButton next={next} />
        ) : (
          <Alert className="mt-6">
            <AlertDescription>Login Google belum dikonfigurasi (NEON_AUTH_BASE_URL dan NEON_AUTH_COOKIE_SECRET).</AlertDescription>
          </Alert>
        )}

        {dev ? <DevLoginForm next={next} /> : null}

        <p className="mt-6 text-xs text-muted-foreground">
          Dengan masuk, Anda menyetujui bahwa data keluarga yang Anda isi hanya terlihat oleh anggota pohon.{" "}
          <Link href="/privasi" className="underline underline-offset-2 hover:text-foreground">
            Kebijakan privasi
          </Link>
        </p>
      </div>
    </main>
  );
}
