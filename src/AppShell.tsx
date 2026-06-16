import { ConfirmDialogProvider } from "./components/ui/ConfirmDialogProvider";
import {
  useIsEmailCampaignCreateRoute,
  useIsEmailTemplateEditorRoute,
  useIsEmailTemplateListRoute,
  useIsIntegrationRoute,
} from "./lib/appNavigation";
import App from "./App";
import { EmailCampaignPage } from "./pages/EmailCampaignPage";
import { EmailCampaignCreatePage } from "./pages/EmailCampaignCreatePage";
import { EmailTemplateListPage } from "./pages/EmailTemplateListPage";
import { ExternalApiIntegrationPage } from "./pages/ExternalApiIntegrationPage";

export default function AppShell() {
  const isIntegration = useIsIntegrationRoute();
  const isTemplateList = useIsEmailTemplateListRoute();
  const isEditor = useIsEmailTemplateEditorRoute();
  const isCreate = useIsEmailCampaignCreateRoute();

  return (
    <ConfirmDialogProvider>
      {isIntegration ? (
        <ExternalApiIntegrationPage />
      ) : isTemplateList ? (
        <EmailTemplateListPage />
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
