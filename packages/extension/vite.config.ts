import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, "src/background/index.ts"),
        content: resolve(__dirname, "src/content/index.ts"),
        page: resolve(__dirname, "src/page/index.ts"),
        devtools: resolve(__dirname, "src/devtools/devtools.ts"),
        panel: resolve(__dirname, "src/devtools/panel.tsx"),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          const name = chunkInfo.name;
          if (name === "background") return "background/index.js";
          if (name === "content") return "content/index.js";
          if (name === "page") return "page/index.js";
          if (name === "devtools") return "devtools/devtools.js";
          if (name === "panel") return "devtools/panel.js";
          return "[name].js";
        },
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
    sourcemap: process.env.NODE_ENV === "development",
    minify: process.env.NODE_ENV === "production",
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
