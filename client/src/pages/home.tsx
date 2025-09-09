import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Building, UserPlus, Settings } from "lucide-react";
import { RegistrationForm } from "@/components/registration-form";
import { AdminDashboard } from "@/components/admin-dashboard";

export default function Home() {
  const [activeView, setActiveView] = useState<'registration' | 'admin'>('registration');

  const handleRegistrationSuccess = (user: any) => {
    console.log("Registration successful:", user);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Building className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-semibold text-foreground">University Hostel Management</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant={activeView === 'registration' ? 'default' : 'secondary'}
                onClick={() => setActiveView('registration')}
                data-testid="button-show-registration"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Register Student
              </Button>
              <Button
                variant={activeView === 'admin' ? 'default' : 'secondary'}
                onClick={() => setActiveView('admin')}
                data-testid="button-show-admin"
              >
                <Settings className="mr-2 h-4 w-4" />
                Admin Dashboard
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView === 'registration' ? (
          <RegistrationForm onSuccess={handleRegistrationSuccess} />
        ) : (
          <AdminDashboard />
        )}
      </main>
    </div>
  );
}
