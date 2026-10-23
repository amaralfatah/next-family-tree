"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="konten" className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <Wordmark full className="justify-center" />
        <h1 className="mt-8 font-display text-[2.125rem] leading-tight tracking-[-0.02em]">Halaman gagal dimuat</h1>
        <p className="mt-2 text-muted-foreground">Koneksi sedang bermasalah. Data Anda aman, silakan coba lagi.</p>
        <Button variant="outline" className="mt-6" onClick={() => retry()}>
          Coba lagi
        </Button>
      </div>
    </main>
  );
}
