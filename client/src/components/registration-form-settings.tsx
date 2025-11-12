import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Settings, Building, Tag, CheckCircle2, X } from "lucide-react";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function RegistrationFormSettings() {
  const [roomRequired, setRoomRequired] = useState(true);
  const [tagRequired, setTagRequired] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Load settings
    const settingsRef = doc(db, "settings", "registrationFormSettings");
    
    const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setRoomRequired(data.roomRequired !== undefined ? data.roomRequired : true);
        setTagRequired(data.tagRequired !== undefined ? data.tagRequired : true);
      } else {
        // Initialize with default values (both required by default)
        setRoomRequired(true);
        setTagRequired(true);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error loading settings:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRoomToggle = async (checked: boolean) => {
    try {
      const settingsRef = doc(db, "settings", "registrationFormSettings");
      await setDoc(settingsRef, {
        roomRequired: checked,
        tagRequired: tagRequired,
        updatedAt: new Date(),
      }, { merge: true });

      setRoomRequired(checked);
      toast({
        title: "Settings Updated",
        description: checked 
          ? "Room selection is now required in the registration form."
          : "Room selection is now optional in the registration form.",
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

  const handleTagToggle = async (checked: boolean) => {
    try {
      const settingsRef = doc(db, "settings", "registrationFormSettings");
      await setDoc(settingsRef, {
        roomRequired: roomRequired,
        tagRequired: checked,
        updatedAt: new Date(),
      }, { merge: true });

      setTagRequired(checked);
      toast({
        title: "Settings Updated",
        description: checked 
          ? "Tag selection is now required in the registration form."
          : "Tag selection is now optional in the registration form.",
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
          Registration Form Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Room Selection Setting */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl border border-blue-200 dark:border-blue-700">
          <div className="flex-1">
            <Label htmlFor="room-required-toggle" className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 cursor-pointer">
              <Building className="h-5 w-5" />
              Room Selection Required
            </Label>
            <p className="text-sm text-muted-foreground mt-2">
              When enabled, users must select a room during registration. When disabled, room selection becomes optional.
            </p>
          </div>
          <div className="flex items-center gap-3 ml-4">
            <button
              type="button"
              onClick={() => handleRoomToggle(!roomRequired)}
              disabled={isLoading}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 transform hover:scale-105 shadow-lg ${
                roomRequired
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                  : "bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white"
              } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
            >
              {roomRequired ? (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Required
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <X className="h-4 w-4" />
                  Optional
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tag Selection Setting */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-xl border border-purple-200 dark:border-purple-700">
          <div className="flex-1">
            <Label htmlFor="tag-required-toggle" className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 cursor-pointer">
              <Tag className="h-5 w-5" />
              Tag Selection Required
            </Label>
            <p className="text-sm text-muted-foreground mt-2">
              When enabled, users must select a tag during registration. When disabled, tag selection becomes optional.
            </p>
          </div>
          <div className="flex items-center gap-3 ml-4">
            <button
              type="button"
              onClick={() => handleTagToggle(!tagRequired)}
              disabled={isLoading}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 transform hover:scale-105 shadow-lg ${
                tagRequired
                  ? "bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white"
                  : "bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white"
              } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
            >
              {tagRequired ? (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Required
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <X className="h-4 w-4" />
                  Optional
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Status Summary */}
        <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg border border-green-200 dark:border-green-700">
          <p className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <strong>Current Status:</strong> Room selection is <strong>{roomRequired ? "required" : "optional"}</strong>, Tag selection is <strong>{tagRequired ? "required" : "optional"}</strong>.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

