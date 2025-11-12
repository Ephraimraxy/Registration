import { useState } from "react";
import { Building } from "lucide-react";
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
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0 py-3 sm:py-0 sm:h-20">
            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto justify-center sm:justify-start">
              <div className="p-1.5 sm:p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Building className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white drop-shadow-lg text-center sm:text-left">
                  <span className="hidden sm:inline">ISAC ACCREDITATION SYSTEM</span>
                  <span className="sm:hidden">ISAC ACCREDITATION</span>
                </h1>
              </div>
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
        <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-4 sm:p-6 md:p-8">
            <RegistrationForm onSuccess={handleRegistrationSuccess} />
          </div>
        </main>
      )}
    </div>
  );
}
