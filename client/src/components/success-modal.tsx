import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CheckCircle, Download, X, UserPlus, IdCard } from "lucide-react";
import { generateUserDetailsPDF } from "@/lib/pdf-utils";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";

interface SuccessModalProps {
  user: User;
  onClose: () => void;
  onNewRegistration?: () => void;
}

export function SuccessModal({ user, onClose, onNewRegistration }: SuccessModalProps) {
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

  const handleNewRegistration = () => {
    onClose();
    if (onNewRegistration) {
      onNewRegistration();
    }
  };

  const fullName = `${user.firstName} ${user.middleName || ''} ${user.surname}`.trim();

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <CheckCircle className="h-10 w-10 text-white" />
          </div>
          
          <h3 className="text-2xl font-bold text-foreground mb-2">
            Registration Successful!
          </h3>
          
          <p className="text-muted-foreground mb-8">
            Your room has been assigned successfully. Here are your details:
          </p>
          
          {/* Beautiful Registration Card */}
          <Card className="mb-8 border-2 border-primary/20 shadow-xl bg-gradient-to-br from-background to-accent/10">
            <CardContent className="p-8">
              <div className="flex items-center justify-center mb-6">
                <IdCard className="h-8 w-8 text-primary mr-3" />
                <h4 className="text-lg font-bold text-foreground">Registration Card</h4>
              </div>
              
              <div className="space-y-4">
                <div className="bg-card/50 rounded-lg p-4 border">
                  <div className="text-sm text-muted-foreground mb-1">Full Name</div>
                  <div className="text-xl font-bold text-foreground" data-testid="text-user-name">
                    {fullName}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                    <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">Room Number</div>
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300" data-testid="text-room-number">
                      {user.roomNumber}
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                    <div className="text-sm text-purple-600 dark:text-purple-400 mb-1">Tag Number</div>
                    <div className="text-2xl font-bold text-purple-700 dark:text-purple-300" data-testid="text-tag-number">
                      {user.tagNumber}
                    </div>
                  </div>
                </div>
                
                <div className="bg-muted/50 rounded-lg p-3 border">
                  <div className="text-xs text-muted-foreground">
                    Registration Date: {user.createdAt.toLocaleDateString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Action Buttons */}
          <div className="space-y-3">
            <div className="flex space-x-3">
              <Button 
                onClick={handleDownload} 
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
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
                <X className="mr-2 h-4 w-4" />
                Close
              </Button>
            </div>
            
            <Button 
              onClick={handleNewRegistration}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              data-testid="button-new-registration"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Take New Registration
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
