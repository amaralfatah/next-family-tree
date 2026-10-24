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
    <main id="konten" className="grid min-h-dvh place-items-center bg-grouped px-4 py-10">
      {/* A plain column on the grouped background, no card around it: the groups inside are the only cards. */}
      <div className="w-full max-w-sm">
        <Link href="/" className="inline-block rounded-md outline-none hover:opacity-80 focus-visible:ring-3 focus-visible:ring-ring/50">
          <Wordmark full />
        </Link>
        <h1 className="mt-6 font-display text-[1.75rem] leading-tight tracking-[-0.015em] text-balance">{fromInvite ? "Masuk untuk bergabung" : "Masuk ke Sararia Family Tree"}</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          {fromInvite
            ? "Anda diundang ke sebuah pohon keluarga. Masuk dulu agar data keluarga tetap terlindungi."
            : "Silsilah keluarga bersifat privat. Masuk untuk membuat atau membuka pohon keluarga Anda."}
        </p>

        {google ? (
          <GoogleSignInButton next={next} failed={sp.error === "google"} />
        ) : (
          <p className="mt-6 px-4 text-[13px] text-muted-foreground">Login Google belum tersedia di sini.</p>
        )}

        {dev ? <DevLoginForm next={next} /> : null}

        <p className="mt-6 px-4 text-[13px] text-muted-foreground">
          Dengan masuk, Anda menyetujui bahwa data keluarga yang Anda isi hanya terlihat oleh anggota pohon.{" "}
          <Link href="/privasi" className="text-soga-ink hover:opacity-80 active:opacity-60">
            Kebijakan privasi
          </Link>
        </p>
      </div>
    </main>
  );
}
