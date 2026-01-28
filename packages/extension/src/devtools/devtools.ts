/**
 * DevTools script - creates the MDX panel in Chrome DevTools
 */

chrome.devtools.panels.create(
  "MDX",
  "", // No icon for now
  "panel.html",
  (panel) => {
    console.log("MDX DevTools panel created");
  },
);
