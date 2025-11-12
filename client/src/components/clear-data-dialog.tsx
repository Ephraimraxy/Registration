import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash, AlertTriangle, Database, Users, Building, Tag } from "lucide-react";

interface ClearDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ClearDataDialog({ open, onOpenChange, onConfirm, isLoading = false }: ClearDataDialogProps) {
  const [confirmText, setConfirmText] = useState("");

  const handleConfirm = () => {
    if (confirmText === "DELETE ALL DATA") {
      onConfirm();
      setConfirmText("");
    }
  };

  const handleCancel = () => {
    setConfirmText("");
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-red-950/20 dark:via-orange-950/20 dark:to-yellow-950/20 border-2 border-red-200 dark:border-red-800 shadow-2xl">
        <AlertDialogHeader className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 rounded-full shadow-lg">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <AlertDialogTitle className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-800 dark:from-red-400 dark:to-red-600 bg-clip-text text-transparent">
                Clear All Data
              </AlertDialogTitle>
              <p className="text-sm text-red-600 dark:text-red-400 font-medium mt-1">
                ⚠️ This action cannot be undone!
              </p>
            </div>
          </div>
          
          <AlertDialogDescription className="space-y-4 text-gray-700 dark:text-gray-300">
            <p className="font-semibold text-lg">This will permanently delete:</p>
            <div className="space-y-3 ml-2">
              <div className="flex items-center gap-3 p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="font-medium">All registered users</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-green-200 dark:border-green-800">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <Building className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <span className="font-medium">All room data</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  <Tag className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="font-medium">All tag data</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                  <Database className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <span className="font-medium">All admin statistics</span>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-red-100 dark:bg-red-900/20 rounded-lg border border-red-300 dark:border-red-700">
              <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2">
                Type <code className="bg-red-200 dark:bg-red-800 px-2 py-1 rounded text-xs font-mono font-bold">DELETE ALL DATA</code> to confirm:
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4">
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type: DELETE ALL DATA"
            className="w-full px-4 py-3 border-2 border-red-300 dark:border-red-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-800 dark:text-white font-mono text-center text-lg shadow-inner"
            disabled={isLoading}
          />
        </div>

        <AlertDialogFooter className="gap-3">
          <AlertDialogCancel 
            onClick={handleCancel}
            disabled={isLoading}
            className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={confirmText !== "DELETE ALL DATA" || isLoading}
            className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:ring-red-500 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                <span>Clearing...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Trash className="h-5 w-5" />
                <span>Clear All Data</span>
              </div>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
