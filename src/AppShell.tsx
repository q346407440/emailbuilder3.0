import { ConfirmDialogProvider } from "./components/ui/ConfirmDialogProvider";
import {
  useIsEmailCampaignCreateRoute,
  useIsEditorRoute,
  useIsIntegrationRoute,
  useIsLibraryRoute,
  useLegacyEditorQueryRedirect,
} from "./lib/appNavigation";
import App from "./App";
import { EmailCampaignPage } from "./pages/EmailCampaignPage";
import { EmailCampaignCreatePage } from "./pages/EmailCampaignCreatePage";
import { ExternalApiIntegrationPage } from "./pages/ExternalApiIntegrationPage";
import { LibraryPage } from "./pages/LibraryPage";

export default function AppShell() {
  useLegacyEditorQueryRedirect();
  const isLibrary = useIsLibraryRoute();
  const isIntegration = useIsIntegrationRoute();
  const isEditor = useIsEditorRoute();
  const isCreate = useIsEmailCampaignCreateRoute();

  return (
    <ConfirmDialogProvider>
      {isIntegration ? (
        <ExternalApiIntegrationPage />
      ) : isLibrary ? (
        <LibraryPage />
      ) : isEditor ? (
        <App />
      ) : isCreate ? (
        <EmailCampaignCreatePage />
      ) : (
        <EmailCampaignPage />
      )}
    </ConfirmDialogProvider>
  );
}
