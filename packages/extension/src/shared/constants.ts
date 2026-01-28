/**
 * Key used to identify MDX metadata on components
 */
export const MDX_META_KEY = '__mdxMeta';

/**
 * Event name for communication between page script and content script
 */
export const BRIDGE_EVENT = 'mdx-devtools-bridge';

/**
 * Highlight overlay colors
 */
export const HIGHLIGHT_COLORS = {
  background: 'rgba(98, 126, 234, 0.2)',
  border: 'rgba(98, 126, 234, 0.8)',
} as const;
