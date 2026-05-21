import { useIsLibraryRoute } from "./lib/appNavigation";
import App from "./App";
import { LibraryPage } from "./pages/LibraryPage";

export default function AppShell() {
  const isLibrary = useIsLibraryRoute();
  return isLibrary ? <LibraryPage /> : <App />;
}
