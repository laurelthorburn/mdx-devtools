/**
 * MDX DevTools Panel UI
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import type { MDXComponentInfo } from '../shared/types';

// Styles
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    overflow: 'hidden',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    borderBottom: '1px solid var(--border-color)',
    background: 'var(--bg-color)',
  },
  button: {
    padding: '4px 8px',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    background: 'transparent',
    color: 'var(--text-color)',
    cursor: 'pointer',
    fontSize: '11px',
  },
  buttonActive: {
    background: 'rgba(98, 126, 234, 0.3)',
    borderColor: 'rgba(98, 126, 234, 0.8)',
  },
  content: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  treePanel: {
    flex: 1,
    overflow: 'auto',
    padding: '8px',
    borderRight: '1px solid var(--border-color)',
  },
  detailsPanel: {
    width: '300px',
    overflow: 'auto',
    padding: '8px',
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'var(--text-color)',
    opacity: 0.6,
    textAlign: 'center' as const,
    padding: '20px',
  },
  treeItem: {
    padding: '4px 8px',
    cursor: 'pointer',
    borderRadius: '3px',
  },
  treeItemSelected: {
    background: 'rgba(98, 126, 234, 0.3)',
  },
  treeItemName: {
    fontWeight: 500,
    color: '#61dafb',
  },
  treeItemFile: {
    marginLeft: '8px',
    opacity: 0.6,
    fontSize: '10px',
  },
  detailsSection: {
    marginBottom: '16px',
  },
  detailsTitle: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    opacity: 0.6,
    marginBottom: '8px',
  },
  detailsValue: {
    fontSize: '12px',
    padding: '4px 8px',
    background: 'var(--hover-bg)',
    borderRadius: '3px',
    marginBottom: '4px',
  },
  pluginTag: {
    display: 'inline-block',
    padding: '2px 6px',
    margin: '2px',
    borderRadius: '3px',
    fontSize: '11px',
  },
  remarkTag: {
    background: 'rgba(98, 126, 234, 0.3)',
    color: '#a5b4fc',
  },
  rehypeTag: {
    background: 'rgba(234, 98, 126, 0.3)',
    color: '#fca5a5',
  },
};

// Tree Item Component
function TreeItem({
  component,
  depth,
  selected,
  onSelect,
}: {
  component: MDXComponentInfo;
  depth: number;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const isSelected = selected === component.id;

  return (
    <div>
      <div
        style={{
          ...styles.treeItem,
          ...(isSelected ? styles.treeItemSelected : {}),
          paddingLeft: `${8 + depth * 16}px`,
        }}
        onClick={() => onSelect(component.id)}
        onMouseEnter={() => {
          // Highlight on hover
          if (component.element.rect) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                  type: 'MDX_DEVTOOLS_SELECT',
                  data: { id: component.id },
                });
              }
            });
          }
        }}
      >
        <span style={styles.treeItemName}>{component.displayName}</span>
        <span style={styles.treeItemFile}>{component.sourceFile}</span>
      </div>
      {component.children.map((child) => (
        <TreeItem
          key={child.id}
          component={child}
          depth={depth + 1}
          selected={selected}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

// Details Panel Component
function DetailsPanel({ component }: { component: MDXComponentInfo | null }) {
  if (!component) {
    return (
      <div style={styles.detailsPanel}>
        <div style={styles.emptyState}>Select a component to see details</div>
      </div>
    );
  }

  return (
    <div style={styles.detailsPanel}>
      <div style={styles.detailsSection}>
        <div style={styles.detailsTitle}>Component</div>
        <div style={styles.detailsValue}>{component.displayName}</div>
      </div>

      <div style={styles.detailsSection}>
        <div style={styles.detailsTitle}>Source File</div>
        <div style={styles.detailsValue}>{component.sourceFile}</div>
      </div>

      <div style={styles.detailsSection}>
        <div style={styles.detailsTitle}>Remark Plugins</div>
        {component.plugins.remark.length > 0 ? (
          <div>
            {component.plugins.remark.map((plugin) => (
              <span key={plugin} style={{ ...styles.pluginTag, ...styles.remarkTag }}>
                {plugin}
              </span>
            ))}
          </div>
        ) : (
          <div style={{ opacity: 0.5 }}>None</div>
        )}
      </div>

      <div style={styles.detailsSection}>
        <div style={styles.detailsTitle}>Rehype Plugins</div>
        {component.plugins.rehype.length > 0 ? (
          <div>
            {component.plugins.rehype.map((plugin) => (
              <span key={plugin} style={{ ...styles.pluginTag, ...styles.rehypeTag }}>
                {plugin}
              </span>
            ))}
          </div>
        ) : (
          <div style={{ opacity: 0.5 }}>None</div>
        )}
      </div>

      <div style={styles.detailsSection}>
        <div style={styles.detailsTitle}>Mapped Components</div>
        {component.components.length > 0 ? (
          <div>
            {component.components.map((comp) => (
              <div key={comp} style={styles.detailsValue}>
                {comp}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ opacity: 0.5 }}>None</div>
        )}
      </div>
    </div>
  );
}

// Main Panel Component
function Panel() {
  const [components, setComponents] = useState<MDXComponentInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedComponent = useCallback(() => {
    function find(list: MDXComponentInfo[]): MDXComponentInfo | null {
      for (const comp of list) {
        if (comp.id === selectedId) return comp;
        const child = find(comp.children);
        if (child) return child;
      }
      return null;
    }
    return find(components);
  }, [components, selectedId]);

  const scan = useCallback(() => {
    setLoading(true);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'MDX_DEVTOOLS_SCAN_REQUEST' });
      }
    });
  }, []);

  const toggleInspect = useCallback(() => {
    const newState = !isInspecting;
    setIsInspecting(newState);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: newState ? 'MDX_DEVTOOLS_INSPECT_START' : 'MDX_DEVTOOLS_INSPECT_STOP',
        });
      }
    });
  }, [isInspecting]);

  // Listen for messages from content script
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.payload?.type === 'MDX_DEVTOOLS_SCAN_RESULT') {
        setComponents(message.payload.data);
        setLoading(false);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  // Initial scan
  useEffect(() => {
    scan();
  }, [scan]);

  return (
    <div style={styles.container}>
      <div style={styles.toolbar}>
        <button style={styles.button} onClick={scan} disabled={loading}>
          {loading ? 'Scanning...' : '🔄 Refresh'}
        </button>
        <button
          style={{ ...styles.button, ...(isInspecting ? styles.buttonActive : {}) }}
          onClick={toggleInspect}
        >
          🎯 {isInspecting ? 'Stop Inspecting' : 'Inspect'}
        </button>
        <span style={{ marginLeft: 'auto', opacity: 0.6 }}>
          {components.length} MDX component{components.length !== 1 ? 's' : ''} found
        </span>
      </div>

      <div style={styles.content}>
        <div style={styles.treePanel}>
          {components.length === 0 ? (
            <div style={styles.emptyState}>
              <div>
                <p>No MDX components found on this page.</p>
                <p style={{ marginTop: '8px', fontSize: '11px' }}>
                  Make sure the page uses the MDX DevTools Vite plugin.
                </p>
              </div>
            </div>
          ) : (
            components.map((comp) => (
              <TreeItem
                key={comp.id}
                component={comp}
                depth={0}
                selected={selectedId}
                onSelect={setSelectedId}
              />
            ))
          )}
        </div>

        <DetailsPanel component={selectedComponent()} />
      </div>
    </div>
  );
}

// Mount the app
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<Panel />);
}
