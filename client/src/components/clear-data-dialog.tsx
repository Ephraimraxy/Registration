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
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <AlertDialogTitle className="text-xl font-bold text-red-800 dark:text-red-200">
              Clear All Data
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-gray-600 dark:text-gray-300 space-y-3">
            <p className="font-medium">⚠️ This action cannot be undone!</p>
            <p>This will permanently delete:</p>
            <div className="space-y-2 ml-4">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-blue-500" />
                <span>All registered users</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Building className="h-4 w-4 text-green-500" />
                <span>All room data</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Tag className="h-4 w-4 text-purple-500" />
                <span>All tag data</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Database className="h-4 w-4 text-orange-500" />
                <span>All admin statistics</span>
              </div>
            </div>
            <p className="text-sm font-medium text-red-600 dark:text-red-400 mt-4">
              Type <code className="bg-red-100 dark:bg-red-900/20 px-2 py-1 rounded text-xs font-mono">DELETE ALL DATA</code> to confirm:
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4">
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type: DELETE ALL DATA"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
            disabled={isLoading}
          />
        </div>

        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel 
            onClick={handleCancel}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={confirmText !== "DELETE ALL DATA" || isLoading}
            className="flex-1 bg-red-600 hover:bg-red-700 focus:ring-red-500"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Clearing...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Trash className="h-4 w-4" />
                <span>Clear All Data</span>
              </div>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
