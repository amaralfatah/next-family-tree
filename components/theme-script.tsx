"use client";

/**
 * Runs before first paint so the saved / system theme never flashes.
 * See node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md
 */
const script = `(function(){try{var t=localStorage.getItem("theme");document.documentElement.dataset.themePref=t==="light"||t==="dark"?t:"system";var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);document.querySelectorAll("meta[name=theme-color]").forEach(function(m){m.content=d?"#1f1e1d":"#faf9f5"})}catch(e){document.documentElement.dataset.themePref="system"}})()`;

export function ThemeScript() {
  // Only the server renders the tag. As a client component it is skipped on the client, so switching language
  // (which re-renders the root layout there) doesn't make React warn that scripts inside components never run.
  if (typeof window !== "undefined") return null;
  return <script dangerouslySetInnerHTML={{ __html: script }} suppressHydrationWarning />;
}
