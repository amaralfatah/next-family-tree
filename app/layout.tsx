import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { ThemeScript } from "@/components/theme-script";
import { TooltipProvider } from "@/components/ui/tooltip";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Sararia Family Tree · Silsilah keluarga", template: "%s · Sararia Family Tree" },
  description: "Catat silsilah keluarga bersama-sama, lihat bagan bani, dan temukan hubungan Anda dengan kerabat.",
  applicationName: "Sararia Family Tree",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f3ea" },
    { media: "(prefers-color-scheme: dark)", color: "#1d1813" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={fontVariables} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-dvh">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
