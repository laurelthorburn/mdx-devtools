/**
 * Background service worker for MDX DevTools
 * Manages communication between content scripts and devtools panel
 */

// Store connections to devtools panels by tab ID
const panelConnections = new Map<number, chrome.runtime.Port>();

// Listen for connections from the devtools panel
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "mdx-devtools-panel") return;

  const tabId = port.sender?.tab?.id;

  port.onMessage.addListener((message, senderPort) => {
    // Forward messages from panel to content script
    const targetTabId = message.tabId;
    if (targetTabId) {
      chrome.tabs.sendMessage(targetTabId, message.payload).catch(() => {
        // Tab might not have content script loaded yet
        console.debug("Could not send message to tab", targetTabId);
      });
    }
  });

  port.onDisconnect.addListener(() => {
    // Clean up when panel is closed
    for (const [id, p] of panelConnections) {
      if (p === port) {
        panelConnections.delete(id);
        break;
      }
    }
  });
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.source !== "mdx-devtools-content") return;

  const tabId = sender.tab?.id;
  if (tabId && panelConnections.has(tabId)) {
    const panel = panelConnections.get(tabId);
    panel?.postMessage(message);
  }

  return true;
});

// Handle extension icon click (optional - for debugging)
chrome.action?.onClicked?.addListener((tab) => {
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: "MDX_DEVTOOLS_SCAN_REQUEST" });
  }
});

console.log("MDX DevTools background service worker initialized");
