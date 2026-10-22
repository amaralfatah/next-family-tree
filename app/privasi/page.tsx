import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

export const metadata = { title: "Privasi dan data keluarga" };

export default function PrivacyPage() {
  return (
    <main id="konten" className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/" className="inline-block rounded-md outline-none hover:opacity-80 focus-visible:ring-3 focus-visible:ring-ring/50">
        <Wordmark full />
      </Link>
      <h1 className="mt-8 font-display text-[2.125rem] leading-tight tracking-[-0.02em]">Privasi dan data keluarga</h1>
      <p className="mt-2 text-sm text-muted-foreground">Ringkasan cara Sararia Family Tree menangani data keluarga Anda.</p>
      <div className="mt-8 flex flex-col gap-6 text-[15px] leading-relaxed">
        <section>
          <h2 className="font-semibold">Data diisi oleh anggota keluarga</h2>
          <p className="mt-1 text-muted-foreground">
            Nama, tanggal, foto, dan catatan di setiap pohon diisi oleh anggota pohon tersebut, bukan oleh Sararia. Pemilik pohon bertanggung jawab atas
            siapa saja yang diundang.
          </p>
        </section>
        <section>
          <h2 className="font-semibold">Privat secara bawaan</h2>
          <p className="mt-1 text-muted-foreground">
            Tidak ada halaman publik. Setiap pohon hanya bisa dibuka oleh anggota yang sudah masuk dengan akunnya. Foto disimpan tanpa akses publik dan hanya
            disajikan setelah keanggotaan diperiksa.
          </p>
        </section>
        <section>
          <h2 className="font-semibold">Hak orang yang tercatat (UU PDP No. 27/2022)</h2>
          <p className="mt-1 text-muted-foreground">
            Bila Anda tercatat di sebuah pohon dan ingin data Anda diubah atau dihapus, hubungi pemilik pohon tersebut. Bila tidak berhasil, kirim permintaan
            ke <a className="underline underline-offset-2 hover:text-foreground" href="mailto:hello@caanglabs.com">hello@caanglabs.com</a> dengan menyebutkan nama pohon; kami akan menindaklanjuti.
          </p>
        </section>
        <section>
          <h2 className="font-semibold">Penghapusan</h2>
          <p className="mt-1 text-muted-foreground">
            Pemilik bisa menghapus pohon beserta semua orang, relasi, foto, undangan, dan riwayatnya secara permanen dari halaman Pengaturan.
          </p>
        </section>
      </div>
    </main>
  );
}
