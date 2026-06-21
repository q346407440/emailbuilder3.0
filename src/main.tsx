import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppAntdProvider } from "./components/ui/AppAntdProvider";
import AppShell from "./AppShell";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppAntdProvider>
      <AppShell />
    </AppAntdProvider>
  </StrictMode>
);
