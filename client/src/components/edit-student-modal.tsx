import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { User } from "@shared/schema";
import { doc, updateDoc, runTransaction, collection, query, where, getDocs } from "firebase/firestore";
import { db, updateAdminStats } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { X, Save, Loader2, CheckCircle, AlertCircle } from "lucide-react";

const editUserSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  surname: z.string().min(1, "Surname is required"),
  middleName: z.string().optional(),
  gender: z.enum(["Male", "Female"]),
  phone: z.string().min(10, "Valid phone number is required"),
  email: z.string().email("Valid email is required"),
  roomNumber: z.string().optional(),
  tagNumber: z.string().optional(),
});

type EditUserData = z.infer<typeof editUserSchema>;

interface EditStudentModalProps {
  user: User;
  onClose: () => void;
}

export function EditStudentModal({ user, onClose }: EditStudentModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'validating' | 'updating-room' | 'updating-user' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  const form = useForm<EditUserData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      firstName: user.firstName,
      surname: user.surname,
      middleName: user.middleName || "",
      gender: user.gender,
      phone: user.phone,
      email: user.email,
      roomNumber: user.roomNumber || "",
      tagNumber: user.tagNumber || "",
    },
  });

  const onSubmit = async (data: EditUserData) => {
    if (!user.id) return;

    setIsUpdating(true);
    setUpdateStatus('validating');
    setUpdateProgress(10);
    
    try {
      // Use atomic transaction for room reassignment if gender changed
      if (data.gender !== user.gender) {
        setUpdateStatus('updating-room');
        setUpdateProgress(30);
        
        await runTransaction(db, async (transaction) => {
          // Free up old room if user had one
          if (user.roomNumber) {
            const oldRoomsQuery = query(
              collection(db, "rooms"),
              where("roomNumber", "==", user.roomNumber)
            );
            const oldRoomsSnapshot = await getDocs(oldRoomsQuery);
            
            if (!oldRoomsSnapshot.empty) {
              const oldRoomDoc = oldRoomsSnapshot.docs[0];
              const oldRoomData = oldRoomDoc.data();
              transaction.update(oldRoomDoc.ref, {
                availableBeds: oldRoomData.availableBeds + 1,
              });
            }
          }

          // Find new room for the new gender (using single field query to avoid composite index)
          const roomsQuery = query(
            collection(db, "rooms"),
            where("gender", "==", data.gender)
          );
          const roomsSnapshot = await getDocs(roomsQuery);
          
          let newRoomNumber = null;
          if (!roomsSnapshot.empty) {
            // Find the first room with available beds
            for (const roomDoc of roomsSnapshot.docs) {
              const roomData = roomDoc.data();
              if (roomData.availableBeds > 0) {
                transaction.update(roomDoc.ref, {
                  availableBeds: roomData.availableBeds - 1,
                });
                newRoomNumber = roomData.roomNumber;
                break;
              }
            }
          }

          // Update user with new room assignment
          setUpdateStatus('updating-user');
          setUpdateProgress(70);
          
          const userRef = doc(db, "users", user.id);
          transaction.update(userRef, {
            firstName: data.firstName,
            surname: data.surname,
            middleName: data.middleName || null,
            gender: data.gender,
            phone: data.phone,
            email: data.email,
            roomNumber: newRoomNumber,
            tagNumber: data.tagNumber || user.tagNumber,
          });
          
          setUpdateProgress(90);
        });
      } else {
        // Simple update if gender didn't change
        setUpdateStatus('updating-user');
        setUpdateProgress(50);
        
        const userRef = doc(db, "users", user.id);
        await updateDoc(userRef, {
          firstName: data.firstName,
          surname: data.surname,
          middleName: data.middleName || null,
          gender: data.gender,
          phone: data.phone,
          email: data.email,
          roomNumber: data.roomNumber || user.roomNumber,
          tagNumber: data.tagNumber || user.tagNumber,
        });
        
        setUpdateProgress(90);
      }
      
      setUpdateProgress(100);
      setUpdateStatus('success');

      // Update admin stats after successful update
      try {
        await updateAdminStats();
      } catch (statsError) {
        console.error("Failed to update admin stats:", statsError);
      }

      toast({
        title: "User Updated",
        description: data.gender !== user.gender 
          ? "User information and room assignment have been updated successfully."
          : "User information has been updated successfully.",
      });

      // Reset after success
      setTimeout(() => {
        setUpdateStatus('idle');
        setUpdateProgress(0);
        onClose();
      }, 2000);
      
    } catch (error: any) {
      console.error("Error updating student:", error);
      setUpdateStatus('error');
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update user. Please try again.",
        variant: "destructive",
      });
      
      // Reset after error
      setTimeout(() => {
        setUpdateStatus('idle');
        setUpdateProgress(0);
      }, 3000);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="edit-description">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Edit User Information</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-edit">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p id="edit-description" className="text-sm text-muted-foreground">
            Update user information and room assignments. Changes will be saved immediately.
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="form-edit-user">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-first-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="surname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Surname</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-surname" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="middleName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Middle Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-middle-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-gender">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} data-testid="input-edit-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="roomNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room Number</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-room" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tagNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tag Number</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-tag" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Progress Display */}
            {isUpdating && (
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {updateStatus === 'validating' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                    {updateStatus === 'updating-room' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                    {updateStatus === 'updating-user' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                    {updateStatus === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {updateStatus === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                    <span className="text-sm font-medium">
                      {updateStatus === 'validating' && 'Validating changes...'}
                      {updateStatus === 'updating-room' && 'Updating room assignment...'}
                      {updateStatus === 'updating-user' && 'Saving user information...'}
                      {updateStatus === 'success' && 'Update successful!'}
                      {updateStatus === 'error' && 'Update failed'}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(updateProgress)}%
                  </span>
                </div>
                <Progress value={updateProgress} className="h-2" />
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <Button 
                type="submit" 
                disabled={isUpdating}
                className="flex-1"
                data-testid="button-save-changes"
              >
                {isUpdating ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </div>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button 
                type="button" 
                variant="secondary" 
                onClick={onClose}
                disabled={isUpdating}
                className="flex-1"
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
