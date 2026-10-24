"use client";

import { useSyncExternalStore } from "react";
import { Toaster as Sonner } from "sonner";

const isDark = () => document.documentElement.classList.contains("dark");

/**
 * Brief confirmations ("… disimpan."). At the bottom, clear of the navigation bar and the inspector's
 * Batal/Simpan, and above the tab bar on phones; drawn in the app's own colours for the current theme
 * (set as a class on <html> by ThemeScript), not sonner's bright success green.
 */
export function Toaster() {
  const dark = useSyncExternalStore(
    (onChange) => {
      const o = new MutationObserver(onChange);
      o.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      return () => o.disconnect();
    },
    isDark,
    () => false,
  );
  return (
    <Sonner
      theme={dark ? "dark" : "light"}
      position="bottom-center"
      offset={24}
      mobileOffset={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      toastOptions={{ classNames: { toast: "!rounded-xl !shadow-lg", icon: "text-soga-ink", error: "[&_[data-icon]]:!text-destructive" } }}
    />
  );
}
