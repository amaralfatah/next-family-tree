import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { getCurrentUser } from "@/lib/auth/session";

// Each row is what lib/kinship returns for the path on the left.
const TERMS = [
  { path: "Kakak laki-laki dari ayah", term: "Paman (kakak ayah)" },
  { path: "Anak dari adik ibu", term: "Sepupu" },
  { path: "Anak dari sepupu ayah", term: "Sepupu dua kali" },
  { path: "Suami dari adik perempuan", term: "Adik ipar" },
  { path: "Ayah dari istri", term: "Ayah mertua" },
  { path: "Orang tua dari menantu", term: "Besan" },
];

const ABILITIES = [
  {
    title: "Bagan bani dan bagan leluhur",
    body: "Pasangan digambar berdampingan dan anak di bawah orang tuanya. Pernikahan kedua, anak angkat, dan orang tua yang tidak diketahui tetap punya tempat.",
  },
  {
    title: "Undangan lewat link",
    body: "Pemilik membuat link untuk editor atau pembaca, lalu membagikannya di grup WhatsApp. Link bisa diberi masa berlaku dan dicabut kapan saja.",
  },
  {
    title: "Cetak untuk acara keluarga",
    body: "Unduh bagan sebagai PDF ukuran A4 sampai A1, PNG, atau SVG untuk percetakan. Cocok dipajang saat halal bihalal.",
  },
  {
    title: "Riwayat perubahan",
    body: "Setiap orang yang ditambahkan atau diubah tercatat bersama nama pengubah dan waktunya.",
  },
];

const FAQ = [
  { q: "Berapa biayanya?", a: "Gratis, dan tidak ada iklan." },
  {
    q: "Siapa yang bisa melihat pohon kami?",
    a: "Hanya anggota yang diundang dan sudah masuk dengan akunnya. Tidak ada halaman publik, dan foto pun hanya terbuka untuk anggota.",
  },
  { q: "Harus memasang aplikasi?", a: "Tidak. Sararia Family Tree dibuka di browser, di ponsel maupun laptop." },
  {
    q: "Kalau ada yang salah mengisi?",
    a: "Lihat riwayatnya untuk tahu siapa yang mengubah apa. Pemilik juga bisa menjadikan anggota sebagai pembaca saja.",
  },
  { q: "Bisa diunduh untuk disimpan sendiri?", a: "Bisa. Seluruh isi pohon bisa diunduh sebagai berkas JSON dari halaman Pengaturan." },
];

export default async function Home() {
  if (await getCurrentUser()) redirect("/pohon");
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 pt-[env(safe-area-inset-top)]">
        <Wordmark full />
        <div className="flex items-center gap-1">
          <ThemeToggle label="Ganti tema terang/gelap" />
          <Link href="/masuk" className={buttonVariants({ variant: "ghost" })}>
            Masuk
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div aria-hidden className="kawung absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_80%_35%,black,transparent_55%)] md:opacity-80" />
          {/* On phones the chart sits right under the headline, so the first screen shows the product, not just copy. */}
          <div className="relative mx-auto grid max-w-6xl gap-8 px-4 pt-6 pb-16 md:grid-cols-[1.1fr_1fr] md:grid-rows-[auto_auto] md:gap-x-14 md:gap-y-0 md:pt-16 md:pb-24">
            <h1 className="rise font-display text-[2.6rem] leading-[1.02] tracking-[-0.015em] text-balance sm:text-6xl md:self-end md:text-7xl">
              &ldquo;Dia itu siapa kita?&rdquo; <em className="text-soga-ink">Kini ada jawabannya.</em>
            </h1>
            <HeroChart />
            <div className="rise md:col-start-1 md:row-start-2">
              <p className="max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg md:mt-6">
                Silsilah keluarga yang dikerjakan bersama. Tulis nama leluhur yang masih diingat, lalu ajak saudara melengkapi cabangnya masing-masing.
                Setelah Anda menandai diri sendiri di pohon, Sararia Family Tree menyebut hubungan Anda dengan setiap orang di dalamnya.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/masuk" className={buttonVariants({ size: "lg", className: "h-12 px-6 text-base active:scale-[0.98]" })}>
                  Mulai catat silsilah <ArrowRightIcon data-icon="inline-end" />
                </Link>
                <Link href="/contoh" className={buttonVariants({ variant: "outline", size: "lg", className: "h-12 px-6 text-base active:scale-[0.98]" })}>
                  Lihat contoh pohon
                </Link>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">Contoh bisa dibuka tanpa masuk. Gratis, tanpa iklan.</p>
            </div>
          </div>
        </section>

        <section className="border-t">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[1fr_1.3fr] md:gap-16 md:py-24">
            <div>
              <h2 className="font-display text-4xl leading-tight tracking-[-0.01em] text-balance md:text-5xl">Istilahnya sama dengan yang dipakai di rumah.</h2>
              <p className="mt-4 max-w-md text-pretty text-muted-foreground">
                Kakak atau adik ditentukan dari tanggal lahir, atau dari urutan anak bila tanggalnya tidak diketahui. Kerabat lewat pernikahan disebut sesuai
                jalurnya, misalnya &ldquo;paman dari istri&rdquo;.
              </p>
            </div>
            <table className="w-full self-start text-left">
              <caption className="sr-only">Contoh istilah kekerabatan</caption>
              <thead>
                <tr className="hidden border-b text-xs text-muted-foreground sm:table-row">
                  <th scope="col" className="pb-3 font-normal">
                    Jalur dari Anda
                  </th>
                  <th scope="col" className="pb-3 text-right font-normal">
                    Sebutannya
                  </th>
                </tr>
              </thead>
              <tbody>
                {TERMS.map((t) => (
                  // Phones stack the term under its path so long terms never wrap mid-phrase.
                  <tr key={t.term} className="flex flex-col gap-1 border-b py-3 last:border-0 sm:table-row sm:py-0">
                    <td className="text-[15px] text-muted-foreground sm:py-3.5 sm:pr-4 sm:text-foreground">{t.path}</td>
                    <td className="font-display text-2xl leading-none text-soga-ink sm:py-3.5 sm:text-right">{t.term}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border-t bg-paper-2/60">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
            <dl className="grid gap-x-12 gap-y-8 md:grid-cols-2">
              {ABILITIES.map((a) => (
                <div key={a.title} className="border-t border-foreground/15 pt-4">
                  <dt className="font-semibold">{a.title}</dt>
                  <dd className="mt-1.5 max-w-prose text-pretty text-muted-foreground">{a.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="border-t">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[1fr_1.6fr] md:gap-16 md:py-24">
            <h2 className="font-display text-4xl leading-tight tracking-[-0.01em] text-balance">Yang biasanya ditanyakan dulu</h2>
            <dl className="divide-y">
              {FAQ.map((f) => (
                <div key={f.q} className="grid gap-1 py-4 first:pt-0 sm:grid-cols-[14rem_1fr] sm:gap-6">
                  <dt className="font-medium">{f.q}</dt>
                  <dd className="text-pretty text-muted-foreground">{f.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="border-t">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 md:flex-row md:items-end md:justify-between md:py-20">
            <div>
              <h2 className="font-display text-4xl leading-tight tracking-[-0.01em] text-balance md:text-5xl">Mumpung para sesepuh masih bisa ditanya.</h2>
              <p className="mt-3 max-w-xl text-muted-foreground">Nama dan tahun lahir buyut biasanya hanya diingat satu atau dua orang di keluarga.</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link href="/contoh" className={buttonVariants({ variant: "outline", size: "lg", className: "h-12 px-6 text-base active:scale-[0.98]" })}>
                Lihat contoh
              </Link>
              <Link href="/masuk" className={buttonVariants({ size: "lg", className: "h-12 px-6 text-base active:scale-[0.98]" })}>
                Buat pohon keluarga <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground">
          <span>Sararia Family Tree adalah bagian dari keluarga aplikasi Sararia.</span>
          <Link href="/privasi" className="underline-offset-4 hover:underline">
            Privasi dan data keluarga
          </Link>
        </div>
      </footer>
    </div>
  );
}

/**
 * A static three-generation sample drawn the way the real chart draws it, including the
 * soga path from "Saya" to a relative: the product's main idea in one picture.
 */
function HeroChart() {
  const card = (x: number, y: number, name: string, years: string, state: "plain" | "path" | "me" = "plain", label?: string) => (
    <g transform={`translate(${x} ${y})`}>
      <rect
        width="132"
        height="50"
        rx="10"
        className={state === "plain" ? "fill-card stroke-border" : "fill-[color-mix(in_oklch,var(--soga)_12%,var(--card))] stroke-soga"}
        strokeWidth={state === "plain" ? 1 : 1.6}
      />
      <rect x="0" y="9" width="3" height="32" rx="1.5" className={state === "plain" ? "fill-nila/50" : "fill-soga"} />
      <text x="14" y="22" className="fill-foreground text-[12px] font-semibold">
        {name}
      </text>
      <text x="14" y="37" className="fill-muted-foreground text-[10.5px]">
        {years}
      </text>
      {label ? (
        <g transform="translate(84 -9)">
          <rect width="44" height="18" rx="9" className="fill-soga" />
          <text x="22" y="12.5" textAnchor="middle" className="fill-background text-[9.5px] font-semibold">
            {label}
          </text>
        </g>
      ) : null}
    </g>
  );
  return (
    <div className="rise relative mx-auto w-full max-w-sm md:col-start-2 md:row-span-2 md:row-start-1 md:max-w-none md:self-center" style={{ animationDelay: "140ms" }}>
      <div className="rounded-3xl border bg-card/60 p-3 shadow-[0_20px_60px_-30px_rgb(0_0_0/0.35)] backdrop-blur sm:p-5">
        <svg viewBox="0 0 420 330" className="w-full" role="img" aria-label="Contoh bagan keluarga tiga generasi dengan jalur hubungan yang disorot">
          <g className="stroke-nila/50" fill="none" strokeWidth="1.4">
            <path d="M142 45h136M210 45v40M345 85v30M210 85h135" />
            <path d="M210 165v35M280 200v25M210 200h70" />
          </g>
          <g className="stroke-soga" fill="none" strokeWidth="2.6" strokeLinecap="round">
            <path d="M210 85h-135v30M210 85v30" />
            <path d="M210 165v35h-70v25" />
            <path d="M210 50v35" />
          </g>
          <circle cx="210" cy="45" r="5" className="fill-soga" />
          <circle cx="210" cy="165" r="5" className="fill-soga" />
          {card(10, 20, "H. Abdullah", "Alm. · 1931–2004")}
          {card(278, 20, "Hj. Siti Aminah", "Almh. · 1935–2012")}
          {card(9, 115, "Ahmad", "l. 1958", "path")}
          {card(144, 115, "Yusuf", "l. 1961", "path")}
          {card(279, 115, "Fatimah", "l. 1965")}
          {card(74, 225, "Rina", "l. 1990", "me", "Saya")}
          {card(214, 225, "Dimas", "l. 1993")}
          <g transform="translate(9 172)">
            <rect width="132" height="24" rx="12" className="fill-soga" />
            <text x="66" y="16" textAnchor="middle" className="fill-background text-[10.5px] font-semibold">
              Paman (kakak ayah)
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}
