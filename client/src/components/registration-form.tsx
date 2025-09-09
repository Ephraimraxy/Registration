import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, User, MapPin } from "lucide-react";
import { collection, addDoc, query, where, getDocs, updateDoc, doc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SuccessModal } from "./success-modal";

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo",
  "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa",
  "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba",
  "Yobe", "Zamfara"
];

interface RegistrationFormProps {
  onSuccess: (user: any) => void;
}

export function RegistrationForm({ onSuccess }: RegistrationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<any>(null);
  const { toast } = useToast();

  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      firstName: "",
      surname: "",
      middleName: "",
      dob: "",
      gender: "Male",
      phone: "",
      email: "",
      stateOfOrigin: "",
      lga: "",
    },
  });

  const assignRoomAndTag = async (gender: "Male" | "Female") => {
    try {
      // Find available room for the gender
      const roomsQuery = query(
        collection(db, "rooms"),
        where("gender", "==", gender),
        where("availableBeds", ">", 0)
      );
      const roomsSnapshot = await getDocs(roomsQuery);
      
      if (roomsSnapshot.empty) {
        throw new Error(`No available rooms for ${gender} students`);
      }
      
      const availableRoom = roomsSnapshot.docs[0];
      const roomData = availableRoom.data();
      
      // Find available tag
      const tagsQuery = query(
        collection(db, "tags"),
        where("isAssigned", "==", false)
      );
      const tagsSnapshot = await getDocs(tagsQuery);
      
      if (tagsSnapshot.empty) {
        throw new Error("No available tags");
      }
      
      const availableTag = tagsSnapshot.docs[0];
      const tagData = availableTag.data();
      
      return {
        roomNumber: roomData.roomNumber,
        tagNumber: tagData.tagNumber,
        roomId: availableRoom.id,
        tagId: availableTag.id,
        availableBeds: roomData.availableBeds,
      };
    } catch (error) {
      console.error("Error assigning room and tag:", error);
      throw error;
    }
  };

  const onSubmit = async (data: InsertUser) => {
    setIsSubmitting(true);
    try {
      // Assign room and tag
      const assignment = await assignRoomAndTag(data.gender);
      
      // Create user data with assignment
      const userData = {
        ...data,
        roomNumber: assignment.roomNumber,
        tagNumber: assignment.tagNumber,
        createdAt: Timestamp.now(),
      };
      
      // Add user to Firestore
      const userRef = await addDoc(collection(db, "users"), userData);
      
      // Update room availability
      const roomRef = doc(db, "rooms", assignment.roomId);
      await updateDoc(roomRef, {
        availableBeds: assignment.availableBeds - 1,
      });
      
      // Mark tag as assigned
      const tagRef = doc(db, "tags", assignment.tagId);
      await updateDoc(tagRef, {
        isAssigned: true,
        assignedUserId: userRef.id,
      });
      
      // Create user object for success modal
      const newUser = {
        id: userRef.id,
        ...userData,
        createdAt: userData.createdAt.toDate(),
      };
      
      setRegisteredUser(newUser);
      setShowSuccess(true);
      onSuccess(newUser);
      
      toast({
        title: "Registration Successful",
        description: "Room and tag have been assigned successfully!",
      });
      
      form.reset();
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Registration Failed",
        description: error.message || "An error occurred during registration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="max-w-3xl mx-auto">
        <Card className="shadow-lg">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-foreground mb-2">Student Registration</h2>
              <p className="text-muted-foreground">Complete your hostel registration and get your room assignment</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="form-registration">
                {/* Personal Information Section */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                    <User className="mr-2 h-5 w-5 text-primary" />
                    Personal Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your first name" {...field} data-testid="input-first-name" />
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
                            <Input placeholder="Enter your surname" {...field} data-testid="input-surname" />
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
                          <FormLabel>Middle Name (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your middle name" {...field} data-testid="input-middle-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="dob"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-dob" />
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-gender">
                                <SelectValue placeholder="Select gender" />
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
                            <Input placeholder="08012345678" {...field} data-testid="input-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="your.email@example.com" {...field} data-testid="input-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Location Information Section */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                    <MapPin className="mr-2 h-5 w-5 text-primary" />
                    Location Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="stateOfOrigin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State of Origin</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-state">
                                <SelectValue placeholder="Select state" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {NIGERIAN_STATES.map((state) => (
                                <SelectItem key={state} value={state}>{state}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="lga"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Local Government Area</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your LGA" {...field} data-testid="input-lga" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-center pt-4">
                  <Button 
                    type="submit" 
                    size="lg" 
                    disabled={isSubmitting}
                    className="px-8"
                    data-testid="button-register"
                  >
                    <UserPlus className="mr-2 h-5 w-5" />
                    {isSubmitting ? "Registering..." : "Register & Get Room Assignment"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {showSuccess && registeredUser && (
        <SuccessModal
          user={registeredUser}
          onClose={() => setShowSuccess(false)}
        />
      )}
    </>
  );
}
