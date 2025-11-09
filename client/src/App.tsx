import { Switch, Route } from "wouter";
import { useEffect, useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { initializeDatabase } from "@/lib/firebase";
import { usePendingAssignments } from "@/hooks/use-pending-assignments";
import Home from "@/pages/home";
import { RoomsTagsDetailPage } from "@/components/rooms-tags-detail-page";
import { UserDetailsPage } from "@/components/user-details-page";
import { ProtectedAdminRoute } from "@/components/protected-admin-route";
import { UserProfile } from "@/pages/user-profile";
import NotFound from "@/pages/not-found";

function Router() {
  // Start monitoring for pending assignments
  usePendingAssignments();
  
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin" component={ProtectedAdminRoute} />
      <Route path="/rooms-tags" component={() => <RoomsTagsDetailPage onBack={() => window.history.back()} />} />
      <Route path="/user-details" component={() => <UserDetailsPage user={JSON.parse(localStorage.getItem('viewingUser') || '{}')} onBack={() => window.history.back()} />} />
      <Route path="/profile/:token">
        {({ params }) => <UserProfile token={params?.token} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const initApp = async () => {
      try {
        console.log("Initializing Firebase database...");
        const success = await initializeDatabase();
        if (success) {
          setIsInitialized(true);
          console.log("App initialization completed successfully!");
        } else {
          setInitError("Failed to initialize database");
        }
      } catch (error) {
        console.error("App initialization error:", error);
        setInitError("Failed to initialize application");
      }
    };

    initApp();
  }, []);

  if (!isInitialized && !initError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto mb-4"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-xs font-bold text-primary animate-pulse">TRAINING</div>
            </div>
          </div>
          <div className="text-lg font-bold text-primary animate-bounce">REGISTRATION</div>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Initialization Error</h2>
          <p className="text-muted-foreground mb-4">{initError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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
