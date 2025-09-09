import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CheckCircle, Download, X } from "lucide-react";
import { generateUserDetailsPDF } from "@/lib/pdf-utils";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";

interface SuccessModalProps {
  user: User;
  onClose: () => void;
}

export function SuccessModal({ user, onClose }: SuccessModalProps) {
  const { toast } = useToast();

  const handleDownload = () => {
    try {
      generateUserDetailsPDF(user);
      toast({
        title: "PDF Downloaded",
        description: "Your registration details have been downloaded successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Download Failed", 
        description: error.message || "Failed to download PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const fullName = `${user.firstName} ${user.middleName || ''} ${user.surname}`.trim();

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Registration Successful!
          </h3>
          
          <p className="text-muted-foreground mb-6">
            Your room has been assigned. Download your details below.
          </p>
          
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="space-y-2 text-left">
                <div className="flex justify-between">
                  <span className="font-medium">Name:</span>
                  <span data-testid="text-user-name">{fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Room:</span>
                  <span data-testid="text-room-number">{user.roomNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Tag:</span>
                  <span data-testid="text-tag-number">{user.tagNumber}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex space-x-3">
            <Button 
              onClick={handleDownload} 
              className="flex-1"
              data-testid="button-download-pdf"
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
            <Button 
              variant="secondary" 
              onClick={onClose}
              className="flex-1"
              data-testid="button-close-modal"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
