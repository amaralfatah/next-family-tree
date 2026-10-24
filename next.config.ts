import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // PGlite ships WASM + data files that must be loaded from node_modules at runtime.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  // Old Indonesian URLs (before the app had English paths and locales), kept alive for bookmarks and invite links that were already shared.
  async redirects() {
    return [
      { source: "/masuk", destination: "/id/login", permanent: true },
      { source: "/privasi", destination: "/id/privacy", permanent: true },
      { source: "/contoh", destination: "/id/example", permanent: true },
      { source: "/undangan/:token", destination: "/id/invite/:token", permanent: true },
      { source: "/pohon", destination: "/id/trees", permanent: true },
      { source: "/pohon/baru", destination: "/id/trees/new", permanent: true },
      { source: "/pohon/:treeId", destination: "/id/trees/:treeId", permanent: true },
      { source: "/pohon/:treeId/anggota", destination: "/id/trees/:treeId/members", permanent: true },
      { source: "/pohon/:treeId/daftar", destination: "/id/trees/:treeId/list", permanent: true },
      { source: "/pohon/:treeId/riwayat", destination: "/id/trees/:treeId/history", permanent: true },
      { source: "/pohon/:treeId/pengaturan", destination: "/id/trees/:treeId/settings", permanent: true },
      { source: "/pohon/:treeId/orang/baru", destination: "/id/trees/:treeId/people/new", permanent: true },
      { source: "/pohon/:treeId/orang/:personId", destination: "/id/trees/:treeId/people/:personId", permanent: true },
      { source: "/pohon/:treeId/orang/:personId/ubah", destination: "/id/trees/:treeId/people/:personId/edit", permanent: true },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
