import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DevLoginForm } from "@/components/dev-login-form";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
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
    <main className="relative grid min-h-dvh place-items-center px-4 py-10">
      <div aria-hidden className="kawung absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_65%)]" />
      <div className="rise relative w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <Link href="/" className="inline-block">
          <Wordmark full />
        </Link>
        <h1 className="mt-6 font-display text-3xl">{fromInvite ? "Masuk untuk bergabung" : "Masuk ke Sararia Family Tree"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {fromInvite
            ? "Anda diundang ke sebuah pohon keluarga. Masuk dulu agar data keluarga tetap terlindungi."
            : "Silsilah keluarga bersifat privat. Masuk untuk membuat atau membuka pohon keluarga Anda."}
        </p>

        {sp.error === "google" ? (
          <p role="alert" className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Login Google gagal atau dibatalkan. Silakan coba lagi.
          </p>
        ) : null}

        {google ? (
          <GoogleSignInButton next={next} />
        ) : (
          <p className="mt-6 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
            Login Google belum dikonfigurasi (NEON_AUTH_BASE_URL dan NEON_AUTH_COOKIE_SECRET).
          </p>
        )}

        {dev ? <DevLoginForm next={next} /> : null}

        <p className="mt-6 text-xs text-muted-foreground">
          Dengan masuk, Anda menyetujui bahwa data keluarga yang Anda isi hanya terlihat oleh anggota pohon.{" "}
          <Link href="/privasi" className="underline underline-offset-2">
            Kebijakan privasi
          </Link>
        </p>
      </div>
    </main>
  );
}
