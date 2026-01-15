import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import ModelDetail from "@/pages/ModelDetail";
import Repository from "@/pages/Repository";
import Analysis from "@/pages/Analysis";
import Settings from "@/pages/Settings";
import PortfolioPage from "@/pages/Portfolio";
import ExecutiveInsights from "@/pages/ExecutiveInsights";

// Protected Route Wrapper
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <div />; // Loading state handled in component usually, or here
  
  if (!isAuthenticated) {
    return <Redirect to="/auth" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={Home} />
      <Route path="/auth" component={Auth} />
      
      {/* Protected Routes */}
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/repository">
        <ProtectedRoute component={Repository} />
      </Route>
      <Route path="/analysis">
        <ProtectedRoute component={Analysis} />
      </Route>
      <Route path="/model/:id">
        <ProtectedRoute component={ModelDetail} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={Settings} />
      </Route>
      <Route path="/portfolio">
        <ProtectedRoute component={PortfolioPage} />
      </Route>
      <Route path="/insights">
        <ProtectedRoute component={ExecutiveInsights} />
      </Route>

      {/* Auth callback is handled by server, we just need the route logic to exist */}
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('bottomline-theme');
    if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
