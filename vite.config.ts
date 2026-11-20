import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// Tailwind v4 runs through its own Vite plugin. There is deliberately no
// postcss.config.js. The portal is private and desktop first, so there is no SEO
// pass here: every page is served noindex by the host headers in vercel.json.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 3200,
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        // Vendor code changes far less often than app code, so splitting it keeps
        // the cacheable chunk stable across deploys.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return "react";
          if (/node_modules\/(@supabase|iceberg-js)\//.test(id)) return "supabase";
          if (/node_modules\/(framer-motion|motion-dom|motion-utils)\//.test(id)) return "motion";
          if (id.includes("node_modules/@tanstack/")) return "query";
          if (id.includes("node_modules/@radix-ui/")) return "radix";
          return undefined;
        },
      },
    },
  },
});
