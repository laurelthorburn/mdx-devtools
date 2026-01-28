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

  /**
   * Inject an in-page devtools overlay (no browser extension needed)
   * Defaults to true in development
   */
  overlay?: boolean;
}

const MDX_META_KEY = "__mdxMeta";

// Inline overlay code as a module that self-executes
function getOverlayCode(): string {
  return `
const MDX_META_KEY = '__mdxMeta';

function getFiberFromElement(element) {
  const keys = Object.keys(element);
  const fiberKey = keys.find(
    (key) => key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')
  );
  return fiberKey ? element[fiberKey] : null;
}

function getMDXMeta(fiber) {
  if (!fiber) return null;
  const type = fiber.type;
  if (type && type[MDX_META_KEY]) return type[MDX_META_KEY];
  if (typeof type === 'function' && type[MDX_META_KEY]) return type[MDX_META_KEY];
  return null;
}

function getDisplayName(fiber) {
  if (!fiber?.type) return 'Unknown';
  const type = fiber.type;
  if (typeof type === 'string') return type;
  return type.displayName || type.name || type.render?.displayName || type.render?.name || 'Anonymous';
}

function getDOMElement(fiber) {
  let current = fiber;
  while (current) {
    if (current.stateNode instanceof Element) return current.stateNode;
    current = current.child;
  }
  return null;
}

function findMDXComponents(rootFiber) {
  const components = [];
  let idCounter = 0;

  function walk(fiber, parent) {
    if (!fiber) return;

    const meta = getMDXMeta(fiber);
    if (meta) {
      const element = getDOMElement(fiber);
      const info = {
        id: 'mdx-' + idCounter++,
        displayName: getDisplayName(fiber),
        sourceFile: meta.sourceFile,
        plugins: meta.plugins,
        components: meta.components,
        element,
        rect: element?.getBoundingClientRect() || null,
        children: [],
      };

      if (parent) {
        parent.children.push(info);
      } else {
        components.push(info);
      }
      walk(fiber.child, info);
    } else {
      walk(fiber.child, parent);
    }
    walk(fiber.sibling, parent);
  }

  walk(rootFiber, null);
  return components;
}

function findReactRoots() {
  const roots = [];
  const potentialRoots = document.querySelectorAll('[id="root"], [id="__next"], [id="app"]');
  
  potentialRoots.forEach((element) => {
    const fiber = getFiberFromElement(element);
    if (fiber) {
      let root = fiber;
      while (root.return) root = root.return;
      roots.push(root);
    }
  });

  if (roots.length === 0) {
    const allElements = document.body.querySelectorAll('*');
    for (const element of allElements) {
      const fiber = getFiberFromElement(element);
      if (fiber) {
        let root = fiber;
        while (root.return) root = root.return;
        if (!roots.includes(root)) roots.push(root);
        break;
      }
    }
  }

  return roots;
}

function scanForMDXComponents() {
  const roots = findReactRoots();
  return roots.flatMap((root) => findMDXComponents(root));
}

function createOverlay() {
  if (document.getElementById('mdx-devtools-overlay')) return;

  const styles = document.createElement('style');
  styles.textContent = \`
#mdx-devtools-overlay {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 400px;
  max-height: 500px;
  background: #1e1e1e;
  border: 1px solid #3c3c3c;
  border-radius: 8px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 12px;
  color: #e0e0e0;
  z-index: 999999;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
#mdx-devtools-overlay.collapsed { width: auto; max-height: none; }
#mdx-devtools-overlay.collapsed .mdx-dt-content { display: none; }
.mdx-dt-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #2d2d2d;
  border-bottom: 1px solid #3c3c3c;
  cursor: move;
  user-select: none;
}
.mdx-dt-title { font-weight: 600; color: #f9cb28; flex: 1; }
.mdx-dt-btn {
  background: transparent;
  border: 1px solid #3c3c3c;
  color: #e0e0e0;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
}
.mdx-dt-btn:hover { background: #3c3c3c; }
.mdx-dt-btn.active { background: rgba(98, 126, 234, 0.3); border-color: rgba(98, 126, 234, 0.8); }
.mdx-dt-content { display: flex; flex: 1; overflow: hidden; max-height: 400px; }
.mdx-dt-tree { flex: 1; overflow: auto; padding: 8px; border-right: 1px solid #3c3c3c; }
.mdx-dt-details { width: 180px; overflow: auto; padding: 8px; }
.mdx-dt-item { padding: 4px 8px; cursor: pointer; border-radius: 3px; white-space: nowrap; }
.mdx-dt-item:hover { background: #2d2d2d; }
.mdx-dt-item.selected { background: rgba(98, 126, 234, 0.3); }
.mdx-dt-name { color: #61dafb; font-weight: 500; }
.mdx-dt-file { color: #888; font-size: 10px; margin-left: 8px; }
.mdx-dt-section { margin-bottom: 12px; }
.mdx-dt-section-title { font-size: 10px; text-transform: uppercase; color: #888; margin-bottom: 4px; }
.mdx-dt-tag { display: inline-block; padding: 2px 6px; margin: 2px; border-radius: 3px; font-size: 10px; }
.mdx-dt-tag.remark { background: rgba(98, 126, 234, 0.3); color: #a5b4fc; }
.mdx-dt-tag.rehype { background: rgba(234, 98, 126, 0.3); color: #fca5a5; }
.mdx-dt-empty { color: #666; font-style: italic; padding: 20px; text-align: center; }
.mdx-dt-highlight {
  position: fixed;
  pointer-events: none;
  background: rgba(98, 126, 234, 0.2);
  border: 2px solid rgba(98, 126, 234, 0.8);
  border-radius: 3px;
  z-index: 999998;
}
.mdx-dt-highlight-label {
  position: absolute;
  top: -22px;
  left: -2px;
  background: rgba(98, 126, 234, 0.9);
  color: white;
  padding: 2px 6px;
  font-size: 11px;
  border-radius: 3px 3px 0 0;
  white-space: nowrap;
}
\`;
  document.head.appendChild(styles);

  const overlay = document.createElement('div');
  overlay.id = 'mdx-devtools-overlay';
  overlay.innerHTML = '<div class="mdx-dt-header"><span class="mdx-dt-title">MDX DevTools</span><button class="mdx-dt-btn" id="mdx-dt-inspect">Inspect</button><button class="mdx-dt-btn" id="mdx-dt-refresh">Refresh</button><button class="mdx-dt-btn" id="mdx-dt-toggle">_</button></div><div class="mdx-dt-content"><div class="mdx-dt-tree" id="mdx-dt-tree"></div><div class="mdx-dt-details" id="mdx-dt-details"><div class="mdx-dt-empty">Select a component</div></div></div>';
  document.body.appendChild(overlay);

  let components = [];
  let selectedId = null;
  let isInspecting = false;

  const highlight = document.createElement('div');
  highlight.className = 'mdx-dt-highlight';
  highlight.style.display = 'none';
  highlight.innerHTML = '<div class="mdx-dt-highlight-label"></div>';
  document.body.appendChild(highlight);

  function findById(list, id) {
    for (const c of list) {
      if (c.id === id) return c;
      const child = findById(c.children, id);
      if (child) return child;
    }
    return null;
  }

  function renderItem(comp, depth) {
    const children = comp.children.map(c => renderItem(c, depth + 1)).join('');
    const selected = selectedId === comp.id ? ' selected' : '';
    const paddingLeft = 8 + depth * 16;
    return '<div class="mdx-dt-item' + selected + '" data-id="' + comp.id + '" style="padding-left: ' + paddingLeft + 'px"><span class="mdx-dt-name">' + comp.displayName + '</span><span class="mdx-dt-file">' + comp.sourceFile + '</span></div>' + children;
  }

  function renderTree() {
    const tree = document.getElementById('mdx-dt-tree');
    if (components.length === 0) {
      tree.innerHTML = '<div class="mdx-dt-empty">No MDX components found</div>';
      return;
    }
    tree.innerHTML = components.map(c => renderItem(c, 0)).join('');
  }

  function renderDetails() {
    const details = document.getElementById('mdx-dt-details');
    const comp = selectedId ? findById(components, selectedId) : null;
    
    if (!comp) {
      details.innerHTML = '<div class="mdx-dt-empty">Select a component</div>';
      return;
    }

    const remarkTags = comp.plugins.remark.length > 0
      ? comp.plugins.remark.map(p => '<span class="mdx-dt-tag remark">' + p + '</span>').join('')
      : '<span style="color:#666">None</span>';
    
    const rehypeTags = comp.plugins.rehype.length > 0
      ? comp.plugins.rehype.map(p => '<span class="mdx-dt-tag rehype">' + p + '</span>').join('')
      : '<span style="color:#666">None</span>';
    
    const compList = comp.components.length > 0 
      ? comp.components.map(c => '<div style="color:#e0e0e0">' + c + '</div>').join('')
      : '<span style="color:#666">None</span>';

    details.innerHTML = '<div class="mdx-dt-section"><div class="mdx-dt-section-title">Source</div><div style="color:#e0e0e0;word-break:break-all">' + comp.sourceFile + '</div></div><div class="mdx-dt-section"><div class="mdx-dt-section-title">Remark Plugins</div>' + remarkTags + '</div><div class="mdx-dt-section"><div class="mdx-dt-section-title">Rehype Plugins</div>' + rehypeTags + '</div><div class="mdx-dt-section"><div class="mdx-dt-section-title">Components</div>' + compList + '</div>';
  }

  function showHighlight(comp) {
    if (!comp?.element) {
      highlight.style.display = 'none';
      return;
    }
    const rect = comp.element.getBoundingClientRect();
    highlight.style.display = 'block';
    highlight.style.left = rect.left + 'px';
    highlight.style.top = rect.top + 'px';
    highlight.style.width = rect.width + 'px';
    highlight.style.height = rect.height + 'px';
    highlight.querySelector('.mdx-dt-highlight-label').textContent = comp.displayName + ' (' + comp.sourceFile + ')';
  }

  function refresh() {
    components = scanForMDXComponents();
    renderTree();
    renderDetails();
  }

  document.getElementById('mdx-dt-refresh').onclick = refresh;
  document.getElementById('mdx-dt-toggle').onclick = () => overlay.classList.toggle('collapsed');
  document.getElementById('mdx-dt-inspect').onclick = () => {
    isInspecting = !isInspecting;
    document.getElementById('mdx-dt-inspect').classList.toggle('active', isInspecting);
    document.body.style.cursor = isInspecting ? 'crosshair' : '';
    if (!isInspecting) highlight.style.display = 'none';
  };

  document.getElementById('mdx-dt-tree').onclick = (e) => {
    const item = e.target.closest('.mdx-dt-item');
    if (item) {
      selectedId = item.getAttribute('data-id');
      renderTree();
      renderDetails();
      showHighlight(findById(components, selectedId));
    }
  };

  document.getElementById('mdx-dt-tree').onmouseover = (e) => {
    const item = e.target.closest('.mdx-dt-item');
    if (item) {
      const id = item.getAttribute('data-id');
      showHighlight(id ? findById(components, id) : null);
    }
  };

  document.getElementById('mdx-dt-tree').onmouseout = () => {
    if (!selectedId) highlight.style.display = 'none';
    else showHighlight(findById(components, selectedId));
  };

  function findComponentAtPoint(x, y) {
    function findDeepest(list) {
      for (const comp of list) {
        const rect = comp.element?.getBoundingClientRect();
        if (rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          return findDeepest(comp.children) || comp;
        }
      }
      return null;
    }
    return findDeepest(components);
  }

  document.addEventListener('mousemove', (e) => {
    if (!isInspecting) return;
    showHighlight(findComponentAtPoint(e.clientX, e.clientY));
  });

  document.addEventListener('click', (e) => {
    if (!isInspecting) return;
    if (e.target.closest('#mdx-devtools-overlay')) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const comp = findComponentAtPoint(e.clientX, e.clientY);
    if (comp) {
      selectedId = comp.id;
      renderTree();
      renderDetails();
    }
    
    isInspecting = false;
    document.getElementById('mdx-dt-inspect').classList.remove('active');
    document.body.style.cursor = '';
  }, true);

  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };
  
  overlay.querySelector('.mdx-dt-header').onmousedown = (e) => {
    if (e.target.closest('.mdx-dt-btn')) return;
    isDragging = true;
    const rect = overlay.getBoundingClientRect();
    dragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    overlay.style.right = 'auto';
    overlay.style.bottom = 'auto';
    overlay.style.left = (e.clientX - dragOffset.x) + 'px';
    overlay.style.top = (e.clientY - dragOffset.y) + 'px';
  });

  document.addEventListener('mouseup', () => isDragging = false);

  setTimeout(refresh, 100);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createOverlay);
} else {
  setTimeout(createOverlay, 100);
}
`;
}

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
 * the MDX DevTools browser extension or in-page overlay.
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
 *       overlay: true, // Enable in-page devtools (no extension needed)
 *     }),
 *   ],
 * });
 * ```
 */
export default function mdxDevTools(options: MDXDevToolsOptions = {}): Plugin {
  let config: ResolvedConfig;
  let enabled = options.enabled;
  let overlayEnabled = options.overlay;

  const VIRTUAL_MODULE_ID = '/@mdx-devtools/overlay.js';

  return {
    name: "mdx-devtools",

    configResolved(resolvedConfig) {
      config = resolvedConfig;
      // Default to enabled in development only
      if (enabled === undefined) {
        enabled = config.mode === "development";
      }
      if (overlayEnabled === undefined) {
        overlayEnabled = config.mode === "development";
      }
    },

    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID || id === VIRTUAL_MODULE_ID.slice(1)) {
        return VIRTUAL_MODULE_ID;
      }
    },

    load(id) {
      if (id === VIRTUAL_MODULE_ID) {
        // Return the overlay code inline
        return getOverlayCode();
      }
    },

    transformIndexHtml(html) {
      if (!overlayEnabled) return html;
      
      // Inject the overlay script using the virtual module
      return html.replace(
        '</body>',
        `<script type="module" src="${VIRTUAL_MODULE_ID}"></script>
</body>`
      );
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
