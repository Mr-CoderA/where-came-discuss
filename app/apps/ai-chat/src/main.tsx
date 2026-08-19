import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "@asad-architect/ui/styles/tokens.css";
import "@asad-architect/ui/styles/base.css";
import "./styles/shell.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Missing #root");
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
