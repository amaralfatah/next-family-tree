import Link from "next/link";
import { redirect } from "next/navigation";
import { AcceptInviteButton } from "@/components/accept-invite-button";
import { buttonVariants } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { inspectInvite } from "@/lib/members/service";
import { ROLE_LABEL } from "@/lib/person";

export const metadata = { title: "Undangan" };

export default async function InvitePage({ params }: PageProps<"/undangan/[token]">) {
  const { token } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/masuk?next=${encodeURIComponent(`/undangan/${token}`)}`);
  const state = await inspectInvite(await getDb(), token, user.id);
  if (state.status === "valid" && state.alreadyMember) redirect(`/pohon/${state.treeId}`);

  return (
    <main className="relative grid min-h-dvh place-items-center px-4 py-10">
      <div aria-hidden className="kawung absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_65%)]" />
      <div className="rise relative w-full max-w-md rounded-2xl border bg-card p-6 text-center shadow-sm sm:p-8">
        <Wordmark full className="justify-center" />
        {state.status === "valid" ? (
          <>
            <p className="mt-6 text-sm text-muted-foreground">Anda diundang bergabung ke</p>
            <h1 className="mt-1 font-display text-4xl leading-tight">{state.treeName}</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              sebagai <strong className="text-foreground">{ROLE_LABEL[state.role].toLowerCase()}</strong>
              {state.role === "editor" ? ". Anda bisa menambah dan mengubah data keluarga." : ". Anda bisa melihat bagan dan profil."}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Masuk sebagai {user.email}</p>
            <AcceptInviteButton token={token} />
          </>
        ) : (
          <>
            <h1 className="mt-6 font-display text-3xl">
              {state.status === "invalid" ? "Link undangan tidak dikenal" : state.status === "expired" ? "Link undangan kedaluwarsa" : "Link undangan sudah dicabut"}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {state.status === "invalid"
                ? "Periksa kembali link yang Anda terima; mungkin terpotong saat disalin."
                : `Minta link baru kepada pemilik pohon "${state.treeName}".`}
            </p>
            <Link href="/pohon" className={buttonVariants({ variant: "outline", className: "mt-6" })}>
              Ke pohon saya
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
