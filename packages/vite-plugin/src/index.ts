/**
 * MDX DevTools Vite Plugin
 *
 * This plugin wraps the MDX compilation process to inject metadata
 * about the source file and plugins used.
 */

import type { Plugin, ResolvedConfig } from "vite";

export interface MDXDevToolsOptions {
  /**
   * List of remark plugins being used (for display in DevTools)
   */
  remarkPlugins?: string[];

  /**
   * List of rehype plugins being used (for display in DevTools)
   */
  rehypePlugins?: string[];

  /**
   * Enable/disable the plugin (defaults to true in development)
   */
  enabled?: boolean;

  /**
   * Custom component mapping names to display
   */
  components?: string[];
}

const MDX_META_KEY = "__mdxMeta";

/**
 * Creates a string that adds __mdxMeta to the default export
 */
function createMetaInjection(
  sourceFile: string,
  options: MDXDevToolsOptions,
): string {
  const meta = {
    sourceFile,
    plugins: {
      remark: options.remarkPlugins || [],
      rehype: options.rehypePlugins || [],
    },
    components: options.components || [],
  };

  return `
// MDX DevTools metadata injection
if (typeof MDXContent !== 'undefined') {
  MDXContent.${MDX_META_KEY} = ${JSON.stringify(meta)};
}
if (typeof _createMdxContent !== 'undefined') {
  _createMdxContent.${MDX_META_KEY} = ${JSON.stringify(meta)};
}
`;
}

/**
 * MDX DevTools Vite Plugin
 *
 * Injects metadata into MDX files during compilation for use with
 * the MDX DevTools browser extension.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import mdx from '@mdx-js/rollup';
 * import mdxDevTools from '@mdx-devtools/vite-plugin';
 *
 * export default defineConfig({
 *   plugins: [
 *     mdx({
 *       remarkPlugins: [remarkGfm],
 *       rehypePlugins: [rehypeSlug],
 *     }),
 *     mdxDevTools({
 *       remarkPlugins: ['remark-gfm'],
 *       rehypePlugins: ['rehype-slug'],
 *     }),
 *   ],
 * });
 * ```
 */
export default function mdxDevTools(options: MDXDevToolsOptions = {}): Plugin {
  let config: ResolvedConfig;
  let enabled = options.enabled;

  return {
    name: "mdx-devtools",

    configResolved(resolvedConfig) {
      config = resolvedConfig;
      // Default to enabled in development only
      if (enabled === undefined) {
        enabled = config.mode === "development";
      }
    },

    transform(code: string, id: string) {
      // Only process MDX files
      if (!id.endsWith(".mdx") && !id.endsWith(".md")) {
        return null;
      }

      // Skip if disabled
      if (!enabled) {
        return null;
      }

      // Get relative path for cleaner display
      const sourceFile = id.replace(config.root, "").replace(/^\//, "");

      // Try to detect components from the code
      const componentMatches = code.match(/components\s*=\s*\{([^}]+)\}/);
      const detectedComponents: string[] = [];

      if (componentMatches) {
        const componentStr = componentMatches[1];
        const componentNames = componentStr.match(/\w+/g);
        if (componentNames) {
          detectedComponents.push(...componentNames);
        }
      }

      // Merge detected components with provided ones
      const allComponents = [
        ...new Set([...(options.components || []), ...detectedComponents]),
      ];

      // Inject metadata at the end of the compiled MDX
      const metaInjection = createMetaInjection(sourceFile, {
        ...options,
        components: allComponents,
      });

      return {
        code: code + metaInjection,
        map: null,
      };
    },
  };
}

// Also export as named export
export { mdxDevTools };
