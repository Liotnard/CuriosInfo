import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// Public Pages
import Home from "@/pages/Home";
import TopicDetail from "@/pages/TopicDetail";
import ActorsList from "@/pages/MediaList";
import PresseList from "@/pages/PresseList";
import PersonnalitesList from "@/pages/PersonnalitesList";
import InfluenceursList from "@/pages/InfluenceursList";
import AudiovisuelList from "@/pages/AudiovisuelList";
import IndependantsList from "@/pages/IndependantsList";

// Admin Pages
import AdminLogin from "@/pages/admin/Login";
import AdminDashboard from "@/pages/admin/Dashboard";
import EditTopic from "@/pages/admin/EditTopic";

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={Home} />
      <Route path="/actor" component={ActorsList} />
      <Route path="/presse" component={PresseList} />
      <Route path="/personnalites" component={PersonnalitesList} />
      <Route path="/influenceurs" component={InfluenceursList} />
      <Route path="/audiovisuel" component={AudiovisuelList} />
      <Route path="/independants" component={IndependantsList} />
      <Route path="/topics/:slug" component={TopicDetail} />

      {/* Admin Routes */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/topics/:id" component={EditTopic} />

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
