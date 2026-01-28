import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mdx from "@mdx-js/rollup";
import mdxDevTools from "@mdx-devtools/vite-plugin";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";

export default defineConfig({
  plugins: [
    mdx({
      remarkPlugins: [remarkGfm],
      rehypePlugins: [rehypeSlug],
    }),
    mdxDevTools({
      remarkPlugins: ["remark-gfm"],
      rehypePlugins: ["rehype-slug"],
    }),
    react(),
  ],
});
