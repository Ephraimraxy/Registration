import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Building, UserPlus, Settings } from "lucide-react";
import { RegistrationForm } from "@/components/registration-form";
import { RegistrationSuccessPage } from "@/components/registration-success-page";
import type { User } from "@shared/schema";

export default function Home() {
  const [registeredUser, setRegisteredUser] = useState<User | null>(null);

  const handleRegistrationSuccess = (user: User) => {
    console.log("Registration successful:", user);
    setRegisteredUser(user);
  };

  const handleBackToRegistration = () => {
    setRegisteredUser(null);
  };

  const handleNewRegistration = () => {
    setRegisteredUser(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950">
      {/* Navigation */}
      <nav className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-2xl sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Building className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white drop-shadow-lg">
                  🎓 REGISTRATION MANAGEMENT SYSTEM
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="default"
                data-testid="button-show-registration"
                className="px-6 py-3 font-semibold transition-all duration-300 bg-white text-blue-600 hover:bg-blue-50 shadow-lg transform hover:scale-105"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                👤 Register User
              </Button>
              <Link href="/admin">
                <Button
                  variant="secondary"
                  data-testid="button-show-admin"
                  className="px-6 py-3 font-semibold transition-all duration-300 bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm border-white/30"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  ⚙️ Admin Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      {registeredUser ? (
        <RegistrationSuccessPage
          user={registeredUser}
          onBack={handleBackToRegistration}
          onNewRegistration={handleNewRegistration}
        />
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-8">
            <RegistrationForm onSuccess={handleRegistrationSuccess} />
          </div>
        </main>
      )}
    </div>
  );
}
