import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/Dashboard";
import Properties from "@/pages/Properties";
import PropertyDetail from "@/pages/PropertyDetail";
import Units from "@/pages/Units";
import Tenants from "@/pages/Tenants";
import TenantDetail from "@/pages/TenantDetail";
import Payments from "@/pages/Payments";
import NewPayment from "@/pages/NewPayment";
import Agreements from "@/pages/Agreements";
import NewAgreement from "@/pages/NewAgreement";
import Maintenance from "@/pages/Maintenance";
import NewMaintenance from "@/pages/NewMaintenance";
import Expenses from "@/pages/Expenses";
import Vendors from "@/pages/Vendors";
import Reports from "@/pages/Reports";

const queryClient = new QueryClient();

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/properties" component={Properties} />
        <Route path="/properties/:id" component={PropertyDetail} />
        <Route path="/units" component={Units} />
        <Route path="/tenants" component={Tenants} />
        <Route path="/tenants/:id" component={TenantDetail} />
        <Route path="/payments" component={Payments} />
        <Route path="/payments/new" component={NewPayment} />
        <Route path="/agreements" component={Agreements} />
        <Route path="/agreements/new" component={NewAgreement} />
        <Route path="/maintenance" component={Maintenance} />
        <Route path="/maintenance/new" component={NewMaintenance} />
        <Route path="/expenses" component={Expenses} />
        <Route path="/vendors" component={Vendors} />
        <Route path="/reports" component={Reports} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
