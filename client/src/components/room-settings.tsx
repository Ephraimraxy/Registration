import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Settings, Users } from "lucide-react";
import { collection, doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function RoomSettings() {
  const [allowCrossGender, setAllowCrossGender] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Load settings
    const settingsRef = doc(db, "settings", "roomSettings");
    
    const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setAllowCrossGender(data.allowCrossGender || false);
      } else {
        // Initialize with default value
        setAllowCrossGender(false);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error loading settings:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleToggle = async (checked: boolean) => {
    try {
      const settingsRef = doc(db, "settings", "roomSettings");
      await setDoc(settingsRef, {
        allowCrossGender: checked,
        updatedAt: new Date(),
      }, { merge: true });

      setAllowCrossGender(checked);
      toast({
        title: "Settings Updated",
        description: checked 
          ? "Male users can now see and select female rooms when male rooms are full."
          : "Male users will only see male rooms.",
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Room Assignment Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl border border-blue-200 dark:border-blue-700">
          <div className="flex-1">
            <Label htmlFor="cross-gender-toggle" className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 cursor-pointer">
              <Users className="h-5 w-5" />
              Allow Cross-Gender Room Assignment
            </Label>
            <p className="text-sm text-muted-foreground mt-2">
              When enabled, male users can see and select female rooms in the registration form when male rooms are full or unavailable.
            </p>
          </div>
          <Switch
            id="cross-gender-toggle"
            checked={allowCrossGender}
            onCheckedChange={handleToggle}
            disabled={isLoading}
            className="ml-4"
          />
        </div>
        {allowCrossGender && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ <strong>Note:</strong> This setting allows male registrants to see and select female rooms. Use this when male rooms are full and you need to utilize available female room spaces.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

