import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, AlertCircle, User, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const editUserSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  surname: z.string().min(1, "Surname is required"),
  middleName: z.string().optional(),
  email: z.string().email("Valid email is required").optional().or(z.literal("")),
  phone: z.string().min(10, "Valid phone number is required"),
  lga: z.string().min(1, "LGA is required"),
  nin: z.string().regex(/^\d{11}$/, "NIN must contain only numbers and be exactly 11 digits").optional().or(z.literal("")),
  dob: z.string().min(1, "Date of birth is required"),
  specialization: z.string().min(1, "Please select your area of specialization"),
});

type EditUserForm = z.infer<typeof editUserSchema>;

interface UserData {
  id: string;
  firstName: string;
  surname: string;
  middleName?: string;
  email?: string;
  phone: string;
  lga: string;
  nin?: string;
  dob: string;
  gender: string;
  stateOfOrigin: string;
  roomNumber?: string;
  tagNumber?: string;
  specialization?: string;
}

interface UserProfileProps {
  token?: string;
}

export function UserProfile({ token: propToken }: UserProfileProps) {
  const [location] = useLocation();
  const [step, setStep] = useState<"welcome" | "tag-input" | "profile">("welcome");
  const [tagNumber, setTagNumber] = useState("");
  const [userData, setUserData] = useState<UserData | null>(null);
  const [specializations, setSpecializations] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const { toast } = useToast();

  const form = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      firstName: "",
      surname: "",
      middleName: "",
      email: "",
      phone: "",
      lga: "",
      nin: "",
      dob: "",
      specialization: "",
    },
  });

  // Extract token from URL or props
  useEffect(() => {
    let token = propToken;
    
    if (!token) {
      const pathParts = location.split("/");
      token = pathParts[pathParts.length - 1];
    }
    
    if (token && token.startsWith("token_")) {
      validateToken(token);
    } else {
      setTokenValid(false);
      setIsValidatingToken(false);
    }
  }, [location, propToken]);

  // Load specializations
  useEffect(() => {
    loadSpecializations();
  }, []);

  const validateToken = async (token: string) => {
    try {
      const q = query(
        collection(db, "accessLinks"),
        where("token", "==", token),
        where("isActive", "==", true)
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setTokenValid(false);
        setIsValidatingToken(false);
        return;
      }

      const linkData = snapshot.docs[0].data();
      const expiresAt = linkData.expiresAt?.toDate();
      
      if (expiresAt && expiresAt < new Date()) {
        setTokenValid(false);
        setIsValidatingToken(false);
        toast({
          title: "Link Expired",
          description: "This access link has expired. Please contact the administrator.",
          variant: "destructive",
        });
        return;
      }

      setTokenValid(true);
      setIsValidatingToken(false);
    } catch (error: any) {
      console.error("Error validating token:", error);
      setTokenValid(false);
      setIsValidatingToken(false);
    }
  };

  const loadSpecializations = async () => {
    try {
      const q = query(collection(db, "specializations"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
      }));
      setSpecializations(data);
    } catch (error: any) {
      console.error("Error loading specializations:", error);
    }
  };

  const handleTagSubmit = async () => {
    if (!tagNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter your tag number",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const q = query(collection(db, "users"), where("tagNumber", "==", tagNumber.trim()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        toast({
          title: "Not Found",
          description: "No user found with this tag number. Please check and try again.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const userDoc = snapshot.docs[0];
      const data = userDoc.data();
      
      const user: UserData = {
        id: userDoc.id,
        firstName: data.firstName || "",
        surname: data.surname || "",
        middleName: data.middleName || "",
        email: data.email || "",
        phone: data.phone || "",
        lga: data.lga || "",
        nin: data.nin || "",
        dob: data.dob || "",
        gender: data.gender || "",
        stateOfOrigin: data.stateOfOrigin || "",
        roomNumber: data.roomNumber || "",
        tagNumber: data.tagNumber || "",
        specialization: data.specialization || "",
      };

      setUserData(user);
      form.reset({
        firstName: user.firstName,
        surname: user.surname,
        middleName: user.middleName || "",
        email: user.email || "",
        phone: user.phone,
        lga: user.lga,
        nin: user.nin || "",
        dob: user.dob,
        specialization: user.specialization || "",
      });
      setStep("profile");
    } catch (error: any) {
      console.error("Error fetching user:", error);
      toast({
        title: "Error",
        description: "Failed to fetch user data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: EditUserForm) => {
    if (!userData) return;

    setIsSaving(true);
    try {
      const userRef = doc(db, "users", userData.id);
      await updateDoc(userRef, {
        firstName: data.firstName,
        surname: data.surname,
        middleName: data.middleName || undefined,
        email: data.email || undefined,
        phone: data.phone,
        lga: data.lga,
        nin: data.nin || undefined,
        dob: data.dob,
        specialization: data.specialization,
      });

      toast({
        title: "Success",
        description: "Your profile has been updated successfully!",
      });

      // Update local state
      setUserData({
        ...userData,
        ...data,
      });
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isValidatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Validating access...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <h2 className="text-2xl font-bold">Access Denied</h2>
              <p className="text-muted-foreground">
                This link is invalid or has expired. Please contact the administrator for a new access link.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto py-8">
        {step === "welcome" && (
          <Card className="shadow-lg">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-4">
                    <User className="h-12 w-12 text-white" />
                  </div>
                </div>
                <h1 className="text-3xl font-bold">Welcome!</h1>
                <p className="text-muted-foreground">
                  Please enter your tag number to access and update your profile information.
                </p>
                <Button onClick={() => setStep("tag-input")} size="lg" className="mt-4">
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "tag-input" && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Enter Your Tag Number</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="tagNumber">Tag Number</Label>
                  <Input
                    id="tagNumber"
                    value={tagNumber}
                    onChange={(e) => setTagNumber(e.target.value)}
                    placeholder="Enter your tag number"
                    className="mt-2"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleTagSubmit();
                      }
                    }}
                  />
                </div>
                <Button onClick={handleTagSubmit} disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "profile" && userData && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Your Profile Information</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                You can edit the fields below. Some fields are read-only.
              </p>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Read-only fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                    <div>
                      <Label className="text-muted-foreground">Gender</Label>
                      <p className="font-medium">{userData.gender}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">State of Origin</Label>
                      <p className="font-medium">{userData.stateOfOrigin}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Room Number</Label>
                      <p className="font-medium">{userData.roomNumber || "Not assigned"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Tag Number</Label>
                      <p className="font-medium">{userData.tagNumber || "Not assigned"}</p>
                    </div>
                  </div>

                  {/* Editable fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name *</FormLabel>
                          <FormControl>
                            <Input {...field} />
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
                          <FormLabel>Surname *</FormLabel>
                          <FormControl>
                            <Input {...field} />
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
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Email Address (Optional)</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lga"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Local Government Area (LGA) *</FormLabel>
                          <FormControl>
                            <Input {...field} />
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
                          <FormLabel>Date of Birth *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="nin"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>National Identification Number (NIN) (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              maxLength={11}
                              {...field}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="specialization"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Area of Specialization *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select your area of specialization" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {specializations.map((spec) => (
                                <SelectItem key={spec.id} value={spec.name}>
                                  {spec.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button type="submit" disabled={isSaving} size="lg">
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

