import { ConfirmDialogProvider } from "./components/ui/ConfirmDialogProvider";
import {
  useIsEmailCampaignCreateRoute,
  useIsEditorRoute,
  useIsIntegrationRoute,
  useLegacyEditorQueryRedirect,
} from "./lib/appNavigation";
import App from "./App";
import { EmailCampaignPage } from "./pages/EmailCampaignPage";
import { EmailCampaignCreatePage } from "./pages/EmailCampaignCreatePage";
import { ExternalApiIntegrationPage } from "./pages/ExternalApiIntegrationPage";

export default function AppShell() {
  useLegacyEditorQueryRedirect();
  const isIntegration = useIsIntegrationRoute();
  const isEditor = useIsEditorRoute();
  const isCreate = useIsEmailCampaignCreateRoute();

  return (
    <ConfirmDialogProvider>
      {isIntegration ? (
        <ExternalApiIntegrationPage />
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
