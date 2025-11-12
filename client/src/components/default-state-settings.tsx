import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MapPin, CheckCircle2, X } from "lucide-react";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo",
  "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa",
  "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba",
  "Yobe", "Zamfara"
];

export function DefaultStateSettings() {
  const [isActive, setIsActive] = useState(false);
  const [selectedState, setSelectedState] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Load settings
    const settingsRef = doc(db, "settings", "defaultStateSettings");
    
    const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setIsActive(data.isActive || false);
        setSelectedState(data.defaultState || "");
      } else {
        // Initialize with default values
        setIsActive(false);
        setSelectedState("");
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error loading settings:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleToggle = async (checked: boolean) => {
    if (checked && !selectedState) {
      toast({
        title: "State Required",
        description: "Please select a default state first before activating.",
        variant: "destructive",
      });
      return;
    }

    try {
      const settingsRef = doc(db, "settings", "defaultStateSettings");
      await setDoc(settingsRef, {
        isActive: checked,
        defaultState: checked ? selectedState : "",
        updatedAt: new Date(),
      }, { merge: true });

      setIsActive(checked);
      toast({
        title: "Settings Updated",
        description: checked 
          ? `Default state "${selectedState}" is now active. Users will only be able to select LGAs for this state.`
          : "Default state has been deactivated. Users can now select any state.",
      });
    } catch (error: any) {
      console.error("Error updating settings:", error);
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    }
  };

  const handleStateChange = async (state: string) => {
    setSelectedState(state);
    
    // If setting is active, update immediately
    if (isActive) {
      try {
        const settingsRef = doc(db, "settings", "defaultStateSettings");
        await setDoc(settingsRef, {
          isActive: true,
          defaultState: state,
          updatedAt: new Date(),
        }, { merge: true });

        toast({
          title: "State Updated",
          description: `Default state changed to "${state}".`,
        });
      } catch (error: any) {
        console.error("Error updating state:", error);
        toast({
          title: "Error",
          description: "Failed to update default state",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Default State Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl border border-blue-200 dark:border-blue-700">
          <div className="space-y-4">
            <div>
              <Label htmlFor="state-select" className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4" />
                Select Default State
              </Label>
              <Select
                value={selectedState}
                onValueChange={handleStateChange}
                disabled={isLoading}
              >
                <SelectTrigger 
                  id="state-select"
                  className="w-full bg-gradient-to-r from-blue-600/30 via-indigo-600/30 to-purple-600/30 dark:from-blue-600/20 dark:via-indigo-600/20 dark:to-purple-600/20 text-gray-900 dark:text-gray-100 border-0 focus:bg-gradient-to-r focus:from-blue-600/50 focus:via-indigo-600/50 focus:to-purple-600/50 transition-all duration-300"
                >
                  <SelectValue placeholder="Choose a state..." />
                </SelectTrigger>
                <SelectContent className="max-h-60 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
                  {NIGERIAN_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex-1">
                <Label htmlFor="default-state-toggle" className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 cursor-pointer">
                  {isActive ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <X className="h-5 w-5 text-gray-400" />
                  )}
                  Activate Default State
                </Label>
                <p className="text-sm text-muted-foreground mt-2">
                  When active, the selected state will be auto-selected and locked in the registration form. Users will only be able to select LGAs for this state.
                </p>
              </div>
              <Switch
                id="default-state-toggle"
                checked={isActive}
                onCheckedChange={handleToggle}
                disabled={isLoading || !selectedState}
                className="ml-4"
              />
            </div>
          </div>
        </div>

        {isActive && selectedState && (
          <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-700">
            <p className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <strong>Active:</strong> Default state is set to <strong>"{selectedState}"</strong>. Users will see this state pre-selected and can only choose LGAs within this state.
            </p>
          </div>
        )}

        {!isActive && selectedState && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ <strong>Inactive:</strong> Default state "{selectedState}" is set but not active. Toggle the switch above to activate it.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

