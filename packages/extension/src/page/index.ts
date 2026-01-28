/**
 * Page script for MDX DevTools
 * Runs in the page's JavaScript context to access React fiber tree
 */

import { MDX_META_KEY } from '../shared/constants';
import type { BridgeMessage, MDXComponentInfo, MDXMeta } from '../shared/types';

/**
 * Get React fiber from a DOM element
 */
function getFiberFromElement(element: Element): any {
  const keys = Object.keys(element);
  const fiberKey = keys.find(
    (key) => key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')
  );
  return fiberKey ? (element as any)[fiberKey] : null;
}

/**
 * Check if a fiber corresponds to an MDX component
 */
function getMDXMeta(fiber: any): MDXMeta | null {
  if (!fiber) return null;

  // Check the component type for __mdxMeta
  const type = fiber.type;
  if (type && type[MDX_META_KEY]) {
    return type[MDX_META_KEY];
  }

  // Check if it's a function component with MDX meta
  if (typeof type === 'function' && type[MDX_META_KEY]) {
    return type[MDX_META_KEY];
  }

  return null;
}

/**
 * Get display name for a fiber
 */
function getDisplayName(fiber: any): string {
  if (!fiber || !fiber.type) return 'Unknown';

  const type = fiber.type;

  if (typeof type === 'string') return type;
  if (type.displayName) return type.displayName;
  if (type.name) return type.name;
  if (type.render?.displayName) return type.render.displayName;
  if (type.render?.name) return type.render.name;

  return 'Anonymous';
}

/**
 * Get the DOM element for a fiber
 */
function getDOMElement(fiber: any): Element | null {
  let current = fiber;

  while (current) {
    if (current.stateNode instanceof Element) {
      return current.stateNode;
    }
    current = current.child;
  }

  return null;
}

/**
 * Walk the fiber tree and find all MDX components
 */
function findMDXComponents(rootFiber: any): MDXComponentInfo[] {
  const components: MDXComponentInfo[] = [];
  let idCounter = 0;

  function walk(fiber: any, parent: MDXComponentInfo | null): void {
    if (!fiber) return;

    const meta = getMDXMeta(fiber);
    if (meta) {
      const element = getDOMElement(fiber);
      const info: MDXComponentInfo = {
        id: `mdx-${idCounter++}`,
        displayName: getDisplayName(fiber),
        sourceFile: meta.sourceFile,
        plugins: meta.plugins,
        components: meta.components,
        element: {
          tagName: element?.tagName.toLowerCase() || 'unknown',
          rect: element?.getBoundingClientRect() || null,
        },
        children: [],
      };

      if (parent) {
        parent.children.push(info);
      } else {
        components.push(info);
      }

      // Continue walking children with this as parent
      walk(fiber.child, info);
    } else {
      // Not an MDX component, continue walking
      walk(fiber.child, parent);
    }

    // Walk siblings
    walk(fiber.sibling, parent);
  }

  walk(rootFiber, null);
  return components;
}

/**
 * Find all React roots in the document
 */
function findReactRoots(): any[] {
  const roots: any[] = [];

  // Look for common React root containers
  const potentialRoots = document.querySelectorAll('[id="root"], [id="__next"], [id="app"]');
  
  potentialRoots.forEach((element) => {
    const fiber = getFiberFromElement(element);
    if (fiber) {
      // Navigate to the root fiber
      let root = fiber;
      while (root.return) {
        root = root.return;
      }
      roots.push(root);
    }
  });

  // Also check all elements for React fibers
  if (roots.length === 0) {
    const allElements = document.body.querySelectorAll('*');
    for (const element of allElements) {
      const fiber = getFiberFromElement(element);
      if (fiber) {
        let root = fiber;
        while (root.return) {
          root = root.return;
        }
        if (!roots.includes(root)) {
          roots.push(root);
        }
        break;
      }
    }
  }

  return roots;
}

/**
 * Scan the page for MDX components
 */
function scanForMDXComponents(): MDXComponentInfo[] {
  const roots = findReactRoots();
  const allComponents: MDXComponentInfo[] = [];

  roots.forEach((root) => {
    const components = findMDXComponents(root);
    allComponents.push(...components);
  });

  return allComponents;
}

/**
 * Find the MDX component at a given point
 */
function findComponentAtPoint(x: number, y: number): MDXComponentInfo | null {
  const components = scanForMDXComponents();

  // Find the deepest component that contains the point
  function findDeepest(list: MDXComponentInfo[]): MDXComponentInfo | null {
    for (const comp of list) {
      const rect = comp.element.rect;
      if (rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        // Check children first (depth-first)
        const childResult = findDeepest(comp.children);
        return childResult || comp;
      }
    }
    return null;
  }

  return findDeepest(components);
}

// Message handler
window.addEventListener('message', (event) => {
  if (event.source !== window) return;

  const message = event.data as BridgeMessage;
  if (message.source !== 'mdx-devtools-content') return;

  switch (message.payload.type) {
    case 'MDX_DEVTOOLS_SCAN_REQUEST': {
      const components = scanForMDXComponents();
      window.postMessage({
        source: 'mdx-devtools-page',
        payload: {
          type: 'MDX_DEVTOOLS_SCAN_RESULT',
          data: components,
        },
      } satisfies BridgeMessage, '*');
      break;
    }

    case 'MDX_DEVTOOLS_HOVER': {
      const { x, y } = message.payload.data;
      const component = findComponentAtPoint(x, y);

      window.postMessage({
        source: 'mdx-devtools-page',
        payload: {
          type: 'MDX_DEVTOOLS_HIGHLIGHT',
          data: {
            rect: component?.element.rect || null,
            id: component ? `${component.displayName} (${component.sourceFile})` : null,
          },
        },
      } satisfies BridgeMessage, '*');
      break;
    }
  }
});

// Announce that we're ready
window.postMessage({
  source: 'mdx-devtools-page',
  payload: { type: 'MDX_DEVTOOLS_INIT' },
} satisfies BridgeMessage, '*');

console.log('MDX DevTools page script loaded');
