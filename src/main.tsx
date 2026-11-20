import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { reloadPageForNewDeploy } from "./lib/lazyWithRetry";

// A fresh deploy can remove the chunk an open tab expects. Reload once to pick up
// the new manifest instead of breaking into a script error.
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  reloadPageForNewDeploy();
});

const container = document.getElementById("root");
if (!container) throw new Error("Root element not found");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
