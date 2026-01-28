/**
 * Metadata injected into MDX components by the build plugin
 */
export interface MDXMeta {
  sourceFile: string;
  plugins: {
    remark: string[];
    rehype: string[];
  };
  components: string[];
}

/**
 * Information about a detected MDX component
 */
export interface MDXComponentInfo {
  id: string;
  displayName: string;
  sourceFile: string;
  plugins: MDXMeta['plugins'];
  components: string[];
  element: {
    tagName: string;
    rect: DOMRect | null;
  };
  children: MDXComponentInfo[];
}

/**
 * Messages sent between different parts of the extension
 */
export type MessageType =
  | { type: 'MDX_DEVTOOLS_INIT' }
  | { type: 'MDX_DEVTOOLS_SCAN_REQUEST' }
  | { type: 'MDX_DEVTOOLS_SCAN_RESULT'; data: MDXComponentInfo[] }
  | { type: 'MDX_DEVTOOLS_INSPECT_START' }
  | { type: 'MDX_DEVTOOLS_INSPECT_STOP' }
  | { type: 'MDX_DEVTOOLS_HOVER'; data: { x: number; y: number } }
  | { type: 'MDX_DEVTOOLS_HIGHLIGHT'; data: { rect: DOMRect | null; id: string | null } }
  | { type: 'MDX_DEVTOOLS_SELECT'; data: { id: string } };

/**
 * Bridge message wrapper for content script communication
 */
export interface BridgeMessage {
  source: 'mdx-devtools-page' | 'mdx-devtools-content' | 'mdx-devtools-panel';
  payload: MessageType;
}
