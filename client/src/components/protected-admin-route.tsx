import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User as FirebaseUser } from "firebase/auth";
import { useLocation, Switch, Route } from "wouter";
import { auth } from "@/lib/firebase";
import { AdminLogin } from "./admin-login";
import { AdminDashboard } from "./admin-dashboard";
import { RoomsTagsDetailPage } from "./rooms-tags-detail-page";

export function ProtectedAdminRoute() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useLocation();

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    // Sign out on page unload/refresh to ensure fresh login each time
    const handleBeforeUnload = () => {
      if (auth.currentUser) {
        signOut(auth).catch(() => {
          // Ignore errors during unload
        });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Sign out when component unmounts (navigation away from /admin)
    return () => {
      unsubscribe();
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Only sign out if navigating completely away from /admin routes
      if (auth.currentUser && !location.startsWith('/admin')) {
        signOut(auth).catch(console.error);
      }
    };
  }, [location]);

  const handleLoginSuccess = () => {
    // Auth state will update automatically via onAuthStateChanged
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto mb-4"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-xs font-bold text-primary animate-pulse">LOADING</div>
            </div>
          </div>
          <div className="text-lg font-bold text-primary animate-bounce">Checking Authentication...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
  }

  // Handle nested routes within admin section
  return (
    <Switch>
      <Route path="/admin/rooms-tags">
        <RoomsTagsDetailPage onBack={() => setLocation('/admin')} />
      </Route>
      <Route path="/admin">
        <AdminDashboard />
      </Route>
    </Switch>
  );
}

