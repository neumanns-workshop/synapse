// Web-specific entry point
import React from "react";

import { createRoot } from "react-dom/client";

import "./index.css";
import App from "./App";

const rootElement = document.getElementById("root");

// Ensure the root element exists before proceeding
if (rootElement) {
  // Create the root once
  const root = createRoot(rootElement);

  // Initial render
  root.render(<App />);

  // Enable hot reloading
  if (module.hot) {
    module.hot.accept("./App", () => {
      // Re-render the existing root when App or its dependencies update
      root.render(<App />);
    });
  }
} else {
  console.error("Root element with ID 'root' not found in the DOM.");
}
