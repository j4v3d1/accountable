import { Route, Routes } from "react-router";
import { ContactPage } from "./features/contacts/ContactPage";
import { ContactsPage } from "./features/contacts/ContactsPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { DealPage } from "./features/deals/DealPage";
import { DealsPage } from "./features/deals/DealsPage";
import { OrganizationPage } from "./features/organizations/OrganizationPage";
import { OrganizationsPage } from "./features/organizations/OrganizationsPage";
import { PipelinePage } from "./features/pipeline/PipelinePage";
import { RequireSignIn } from "./features/auth/RequireSignIn";
import { AppLayout } from "./ui/AppLayout";
import { NotFoundPage } from "./ui/NotFoundPage";
import { TopBar } from "./ui/TopBar";

export function App() {
  return (
    <RequireSignIn>
      <Routes>
        <Route element={<AppLayout topBar={<TopBar />} />}>
          <Route index element={<DashboardPage />} />
          <Route path="organizations" element={<OrganizationsPage />} />
          <Route path="organizations/:id" element={<OrganizationPage />} />
          <Route path="contacts" element={<ContactsPage />} />
          <Route path="contacts/:id" element={<ContactPage />} />
          <Route path="deals" element={<DealsPage />} />
          <Route path="deals/:id" element={<DealPage />} />
          <Route path="pipeline" element={<PipelinePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </RequireSignIn>
  );
}
