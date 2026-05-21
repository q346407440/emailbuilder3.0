import { useEffect, useState } from "react";

export const LIBRARY_PATH = "/library";

export function isLibraryPath(pathname: string): boolean {
  return pathname === LIBRARY_PATH || pathname.endsWith(LIBRARY_PATH);
}

export function navigateApp(path: string): void {
  if (window.location.pathname === path) return;
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function useAppPath(): string {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return pathname;
}

export function useIsLibraryRoute(): boolean {
  const pathname = useAppPath();
  return isLibraryPath(pathname);
}

export function goToLibrary(): void {
  navigateApp(LIBRARY_PATH);
}

export function goToEmailEditor(): void {
  navigateApp("/");
}
