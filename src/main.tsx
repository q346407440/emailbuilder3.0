import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@shoplazza/sds/dist/sds.css";
import AppShell from "./AppShell";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppShell />
  </StrictMode>
);
