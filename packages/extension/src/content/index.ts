/**
 * Content script for MDX DevTools
 * Bridges communication between the page and the devtools panel
 */

import { BRIDGE_EVENT, HIGHLIGHT_COLORS } from "../shared/constants";
import type { BridgeMessage, MessageType } from "../shared/types";

// Inject the page script to access the page's JavaScript context
function injectPageScript() {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("dist/page/index.js");
  script.type = "module";
  (document.head || document.documentElement).appendChild(script);
  script.onload = () => script.remove();
}

// Create highlight overlay element
let highlightOverlay: HTMLDivElement | null = null;

function createHighlightOverlay(): HTMLDivElement {
  if (highlightOverlay) return highlightOverlay;

  const overlay = document.createElement("div");
  overlay.id = "mdx-devtools-highlight";
  overlay.style.cssText = `
    position: fixed;
    pointer-events: none;
    z-index: 999999;
    background: ${HIGHLIGHT_COLORS.background};
    border: 2px solid ${HIGHLIGHT_COLORS.border};
    border-radius: 3px;
    display: none;
    transition: all 0.1s ease-out;
  `;

  const label = document.createElement("div");
  label.style.cssText = `
    position: absolute;
    top: -22px;
    left: -2px;
    background: ${HIGHLIGHT_COLORS.border};
    color: white;
    padding: 2px 6px;
    font-size: 11px;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    border-radius: 3px 3px 0 0;
    white-space: nowrap;
  `;
  label.id = "mdx-devtools-highlight-label";

  overlay.appendChild(label);
  document.body.appendChild(overlay);
  highlightOverlay = overlay;

  return overlay;
}

function showHighlight(rect: DOMRect, label: string) {
  const overlay = createHighlightOverlay();
  const labelEl = overlay.querySelector(
    "#mdx-devtools-highlight-label",
  ) as HTMLDivElement;

  overlay.style.left = `${rect.left}px`;
  overlay.style.top = `${rect.top}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
  overlay.style.display = "block";

  labelEl.textContent = label;
}

function hideHighlight() {
  if (highlightOverlay) {
    highlightOverlay.style.display = "none";
  }
}

// Inspection mode state
let isInspecting = false;

function handleMouseMove(event: MouseEvent) {
  if (!isInspecting) return;

  // Send hover position to page script
  window.postMessage(
    {
      source: "mdx-devtools-content",
      payload: {
        type: "MDX_DEVTOOLS_HOVER",
        data: { x: event.clientX, y: event.clientY },
      },
    } satisfies BridgeMessage,
    "*",
  );
}

function handleClick(event: MouseEvent) {
  if (!isInspecting) return;

  event.preventDefault();
  event.stopPropagation();

  // Send click position to select the component
  window.postMessage(
    {
      source: "mdx-devtools-content",
      payload: {
        type: "MDX_DEVTOOLS_HOVER",
        data: { x: event.clientX, y: event.clientY },
      },
    } satisfies BridgeMessage,
    "*",
  );

  stopInspecting();
}

function startInspecting() {
  isInspecting = true;
  document.addEventListener("mousemove", handleMouseMove, true);
  document.addEventListener("click", handleClick, true);
  document.body.style.cursor = "crosshair";
}

function stopInspecting() {
  isInspecting = false;
  document.removeEventListener("mousemove", handleMouseMove, true);
  document.removeEventListener("click", handleClick, true);
  document.body.style.cursor = "";
  hideHighlight();
}

// Listen for messages from the page script
window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  const message = event.data as BridgeMessage;
  if (message.source !== "mdx-devtools-page") return;

  // Handle highlight updates from page script
  if (message.payload.type === "MDX_DEVTOOLS_HIGHLIGHT") {
    const { rect, id } = message.payload.data;
    if (rect && id) {
      showHighlight(rect, id);
    } else {
      hideHighlight();
    }
    return;
  }

  // Forward other messages to the background script
  chrome.runtime.sendMessage({
    source: "mdx-devtools-content",
    payload: message.payload,
  });
});

// Listen for messages from the devtools panel (via background)
chrome.runtime.onMessage.addListener(
  (message: MessageType, sender, sendResponse) => {
    switch (message.type) {
      case "MDX_DEVTOOLS_SCAN_REQUEST":
        // Forward to page script
        window.postMessage(
          {
            source: "mdx-devtools-content",
            payload: message,
          } satisfies BridgeMessage,
          "*",
        );
        break;

      case "MDX_DEVTOOLS_INSPECT_START":
        startInspecting();
        break;

      case "MDX_DEVTOOLS_INSPECT_STOP":
        stopInspecting();
        break;

      case "MDX_DEVTOOLS_SELECT":
        // Forward selection to page script
        window.postMessage(
          {
            source: "mdx-devtools-content",
            payload: message,
          } satisfies BridgeMessage,
          "*",
        );
        break;
    }

    return true;
  },
);

// Initialize
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", injectPageScript);
} else {
  injectPageScript();
}

console.log("MDX DevTools content script loaded");
