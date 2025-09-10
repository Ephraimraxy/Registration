import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, User, MapPin, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { collection, addDoc, query, where, getDocs, updateDoc, doc, Timestamp, runTransaction } from "firebase/firestore";
import { db, validateRegistrationData, updateAdminStats } from "@/lib/firebase";
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
  const [registrationProgress, setRegistrationProgress] = useState(0);
  const [registrationStatus, setRegistrationStatus] = useState<'idle' | 'validating' | 'finding-room' | 'finding-tag' | 'creating-user' | 'success' | 'error'>('idle');
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

  const onSubmit = async (data: InsertUser) => {
    setIsSubmitting(true);
    setRegistrationStatus('validating');
    setRegistrationProgress(10);
    
    try {
      // Enhanced validation before processing
      const validation = validateRegistrationData(data);
      if (!validation.isValid) {
        setRegistrationStatus('error');
        toast({
          title: "Validation Error",
          description: validation.errors.join(", "),
          variant: "destructive",
        });
        setIsSubmitting(false);
        setRegistrationStatus('idle');
        setRegistrationProgress(0);
        return;
      }

      // Use atomic transaction to prevent race conditions
      const result = await runTransaction(db, async (transaction: any) => {
        setRegistrationStatus('finding-room');
        setRegistrationProgress(30);
        
        // Find available room for the gender
        const roomsQuery = query(
          collection(db, "rooms"),
          where("gender", "==", data.gender),
          where("availableBeds", ">", 0)
        );
        const roomsSnapshot = await getDocs(roomsQuery);
        
        if (roomsSnapshot.empty) {
          throw new Error(`No available rooms for ${data.gender} students`);
        }
        
        const availableRoom = roomsSnapshot.docs[0];
        const roomData = availableRoom.data();
        
        // Verify room is still available within transaction
        if (roomData.availableBeds <= 0) {
          throw new Error(`Room ${roomData.roomNumber} is no longer available`);
        }
        
        setRegistrationStatus('finding-tag');
        setRegistrationProgress(50);
        
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
        
        // Verify tag is still available within transaction
        if (tagData.isAssigned) {
          throw new Error(`Tag ${tagData.tagNumber} is no longer available`);
        }
        
        setRegistrationStatus('creating-user');
        setRegistrationProgress(70);
        
        // Create user data with assignment
        const userData = {
          ...data,
          roomNumber: roomData.roomNumber,
          tagNumber: tagData.tagNumber,
          createdAt: Timestamp.now(),
        };
        
        // Create user document reference
        const userRef = doc(collection(db, "users"));
        const roomRef = doc(db, "rooms", availableRoom.id);
        const tagRef = doc(db, "tags", availableTag.id);
        
        // Add all operations to transaction
        transaction.set(userRef, userData);
        transaction.update(roomRef, {
          availableBeds: roomData.availableBeds - 1,
        });
        transaction.update(tagRef, {
          isAssigned: true,
          assignedUserId: userRef.id,
        });
        
        setRegistrationProgress(90);
        
        return {
          userRef,
          userData,
          roomNumber: roomData.roomNumber,
          tagNumber: tagData.tagNumber,
        };
      });
      
      setRegistrationProgress(100);
      setRegistrationStatus('success');
      
      // Create user object for success modal
      const newUser = {
        id: result.userRef.id,
        ...result.userData,
        createdAt: result.userData.createdAt.toDate(),
      };
      
      setRegisteredUser(newUser);
      setShowSuccess(true);
      onSuccess(newUser);
      
      // Update admin stats in real-time
      try {
        await updateAdminStats();
      } catch (error) {
        console.error("Failed to update admin stats:", error);
      }
      
      toast({
        title: "Registration Successful",
        description: "Room and tag have been assigned successfully!",
      });
      
      form.reset();
      
      // Reset progress after success
      setTimeout(() => {
        setRegistrationStatus('idle');
        setRegistrationProgress(0);
      }, 2000);
    } catch (error: any) {
      console.error("Registration error:", error);
      setRegistrationStatus('error');
      toast({
        title: "Registration Failed",
        description: error.message || "An error occurred during registration. Please try again.",
        variant: "destructive",
      });
      
      // Reset after error
      setTimeout(() => {
        setRegistrationStatus('idle');
        setRegistrationProgress(0);
      }, 3000);
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
              <h2 className="text-3xl font-bold text-foreground mb-2">User Registration</h2>
              <p className="text-muted-foreground">Complete your registration and get your room assignment</p>
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

                {/* Progress Display */}
                {isSubmitting && (
                  <div className="space-y-4 py-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {registrationStatus === 'validating' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                        {registrationStatus === 'finding-room' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                        {registrationStatus === 'finding-tag' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                        {registrationStatus === 'creating-user' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                        {registrationStatus === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {registrationStatus === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                        <span className="text-sm font-medium">
                          {registrationStatus === 'validating' && 'Validating data...'}
                          {registrationStatus === 'finding-room' && 'Finding available room...'}
                          {registrationStatus === 'finding-tag' && 'Finding available tag...'}
                          {registrationStatus === 'creating-user' && 'Creating user account...'}
                          {registrationStatus === 'success' && 'Registration successful!'}
                          {registrationStatus === 'error' && 'Registration failed'}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(registrationProgress)}%
                      </span>
                    </div>
                    <Progress value={registrationProgress} className="h-2" />
                  </div>
                )}

                <div className="flex justify-center pt-4">
                  <Button 
                    type="submit" 
                    size="lg" 
                    disabled={isSubmitting}
                    className="px-8"
                    data-testid="button-register"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Registering...
                      </div>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-5 w-5" />
                        Register & Get Room Assignment
                      </>
                    )}
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
          onNewRegistration={() => {
            setShowSuccess(false);
            form.reset();
          }}
        />
      )}
    </>
  );
}
