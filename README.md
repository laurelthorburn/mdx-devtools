# MDX DevTools

> **Note:** This project was entirely vibe coded with AI assistance. Use at your own risk, expect bugs, and feel free to contribute improvements!

A Chrome DevTools extension for inspecting MDX components and their plugins, similar to React DevTools.

## Features

- **Component Tree View**: See all MDX components on the page in a hierarchical tree
- **Plugin Information**: View which remark and rehype plugins are used for each MDX file
- **Hover-to-Inspect**: Click the inspect button and hover over elements to find their MDX source
- **Source File Display**: See which `.mdx` file each component comes from
- **Component Mapping**: View custom components passed to MDX

## Packages

This is a monorepo containing:

- `@mdx-devtools/extension` - Chrome DevTools extension
- `@mdx-devtools/vite-plugin` - Vite plugin to inject MDX metadata

## Quick Start

### 1. Install the Vite Plugin

```bash
npm install @mdx-devtools/vite-plugin
```

### 2. Configure Vite

```ts
// vite.config.ts
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
    // Add MDX DevTools AFTER the MDX plugin
    mdxDevTools({
      remarkPlugins: ["remark-gfm"],
      rehypePlugins: ["rehype-slug"],
    }),
  ],
});
```

### 3. Install the Chrome Extension

1. Clone this repo and build the extension:

   ```bash
   pnpm install
   pnpm build
   ```

2. Open Chrome and go to `chrome://extensions/`

3. Enable "Developer mode" (top right toggle)

4. Click "Load unpacked" and select the `packages/extension` folder

5. Open DevTools on any page using MDX and look for the "MDX" tab

## Development

```bash
# Install dependencies
pnpm install

# Start development (watches all packages)
pnpm dev

# Build all packages
pnpm build
```

### Testing with the Demo App

```bash
cd examples/demo-app
pnpm dev
```

Then open `http://localhost:5173` and use the MDX DevTools panel in Chrome DevTools.

## How It Works

### Build Time (Vite Plugin)

The Vite plugin injects metadata into each MDX file during compilation:

```js
// Added to compiled MDX output
MDXContent.__mdxMeta = {
  sourceFile: "docs/getting-started.mdx",
  plugins: {
    remark: ["remark-gfm"],
    rehype: ["rehype-slug"],
  },
  components: ["Callout", "CodeBlock"],
};
```

### Runtime (Chrome Extension)

The extension:

1. Injects a page script that walks the React fiber tree
2. Finds components with `__mdxMeta` attached
3. Displays them in a DevTools panel
4. Provides hover-to-inspect functionality via a content script overlay

## Configuration Options

### `mdxDevTools(options)`

| Option          | Type       | Default       | Description                        |
| --------------- | ---------- | ------------- | ---------------------------------- |
| `remarkPlugins` | `string[]` | `[]`          | Names of remark plugins to display |
| `rehypePlugins` | `string[]` | `[]`          | Names of rehype plugins to display |
| `enabled`       | `boolean`  | `true` in dev | Enable/disable metadata injection  |
| `overlay`       | `boolean`  | `true` in dev | Show in-page devtools overlay      |
| `components`    | `string[]` | auto-detected | Custom component names to track    |

## In-Page Overlay (No Extension Required)

If you can't install the Chrome extension (e.g., corporate policy restrictions), the Vite plugin includes a built-in overlay that appears in the bottom-right corner of your page during development:

```ts
mdxDevTools({
  remarkPlugins: ["remark-gfm"],
  rehypePlugins: ["rehype-slug"],
  overlay: true, // Enabled by default in development
});
```

The overlay provides the same features as the extension: component tree, plugin details, and hover-to-inspect.

## License

MIT
