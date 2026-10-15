import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <Wordmark className="justify-center" />
        <h1 className="mt-8 font-display text-4xl">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-muted-foreground">Halaman ini tidak ada, atau Anda bukan anggota pohon keluarga tersebut.</p>
        <Link href="/pohon" className={buttonVariants({ variant: "outline", className: "mt-6" })}>
          Ke pohon saya
        </Link>
      </div>
    </main>
  );
}
