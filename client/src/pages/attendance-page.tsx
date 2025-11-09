import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCheck, Check, X, Loader2 } from "lucide-react";
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface User {
  id: string;
  tagNumber?: string;
}

interface AttendanceRecord {
  id: string;
  tagNumber: string;
  status: "present" | "absent";
  timestamp: any;
}

export function AttendancePage({ token }: { token: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceRecord>>({});
  const [lectureTitle, setLectureTitle] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadLectureAndUsers();
    setupAttendanceListener();
  }, [token]);

  const loadLectureAndUsers = async () => {
    setIsLoading(true);
    try {
      // Get lecture by token
      const lecturesQuery = query(collection(db, "lectures"), where("token", "==", token));
      const lectureSnapshot = await getDocs(lecturesQuery);
      
      if (lectureSnapshot.empty) {
        toast({
          title: "Invalid Link",
          description: "This attendance link is invalid or has expired.",
          variant: "destructive",
        });
        return;
      }

      const lectureDoc = lectureSnapshot.docs[0];
      const lectureData = lectureDoc.data();
      const lectureId = lectureDoc.id;
      setLectureTitle(lectureData.title);

      // Get all users with tag numbers
      // Note: Firestore doesn't support != null directly, so we get all users and filter
      const usersQuery = query(collection(db, "users"));
      const usersSnapshot = await getDocs(usersQuery);
      const usersData = usersSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter(user => user.tagNumber && user.tagNumber.trim() !== "") as User[];

      // Sort by tag number
      usersData.sort((a, b) => {
        const tagA = a.tagNumber || "";
        const tagB = b.tagNumber || "";
        return tagA.localeCompare(tagB, undefined, { numeric: true, sensitivity: 'base' });
      });

      setUsers(usersData);
      
      // Store lectureId for use in marking attendance
      (window as any).currentLectureId = lectureId;
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load attendance data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setupAttendanceListener = () => {
    // Get lecture ID first, then listen for attendance records
    const loadAndListen = async () => {
      try {
        const lecturesQuery = query(collection(db, "lectures"), where("token", "==", token));
        const lectureSnapshot = await getDocs(lecturesQuery);
        
        if (lectureSnapshot.empty) return;
        
        const lectureId = lectureSnapshot.docs[0].id;
        
        // Listen for attendance records for this lecture
        const attendanceQuery = query(
          collection(db, "attendance"),
          where("lectureId", "==", lectureId)
        );
        
        const unsubscribe = onSnapshot(attendanceQuery, (snapshot) => {
          const records: Record<string, AttendanceRecord> = {};
          snapshot.docs.forEach(doc => {
            const data = doc.data() as AttendanceRecord;
            records[data.tagNumber] = {
              id: doc.id,
              ...data,
            };
          });
          setAttendanceRecords(records);
        });

        return unsubscribe;
      } catch (error) {
        console.error("Error setting up attendance listener:", error);
        return () => {};
      }
    };

    return loadAndListen();
  };

  const markAttendance = async (tagNumber: string, status: "present" | "absent") => {
    setIsSubmitting(prev => ({ ...prev, [tagNumber]: true }));
    
    try {
      // Get lecture ID
      const lecturesQuery = query(collection(db, "lectures"), where("token", "==", token));
      const lectureSnapshot = await getDocs(lecturesQuery);
      
      if (lectureSnapshot.empty) {
        toast({
          title: "Error",
          description: "Invalid lecture link",
          variant: "destructive",
        });
        return;
      }

      const lectureDoc = lectureSnapshot.docs[0];
      const lectureId = lectureDoc.id;
      const lectureData = lectureDoc.data();

      // Check if record already exists
      const existingQuery = query(
        collection(db, "attendance"),
        where("lectureId", "==", lectureId),
        where("tagNumber", "==", tagNumber)
      );
      const existingSnapshot = await getDocs(existingQuery);

      if (!existingSnapshot.empty) {
        // Update existing record
        const existingDoc = existingSnapshot.docs[0];
        await setDoc(doc(db, "attendance", existingDoc.id), {
          tagNumber,
          lectureTitle: lectureData.title,
          lectureId: lectureId,
          status,
          timestamp: serverTimestamp(),
        }, { merge: true });
      } else {
        // Create new record
        await setDoc(doc(collection(db, "attendance")), {
          tagNumber,
          lectureTitle: lectureData.title,
          lectureId: lectureId,
          status,
          timestamp: serverTimestamp(),
        });
      }

      toast({
        title: "Success",
        description: `Tag ${tagNumber} marked as ${status}`,
      });
    } catch (error: any) {
      console.error("Error marking attendance:", error);
      toast({
        title: "Error",
        description: "Failed to mark attendance",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(prev => ({ ...prev, [tagNumber]: false }));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading attendance...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-600 text-white">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <ClipboardCheck className="h-6 w-6" />
              Attendance: {lectureTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {users.map((user) => {
                const record = attendanceRecords[user.tagNumber || ""];
                const currentStatus = record?.status;
                const isSubmittingTag = isSubmitting[user.tagNumber || ""];

                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="font-mono font-bold text-lg text-gray-900 dark:text-gray-100">
                        {user.tagNumber}
                      </div>
                      {currentStatus && (
                        <Badge className={currentStatus === "present" ? "bg-green-500" : "bg-red-500"}>
                          {currentStatus === "present" ? "Present" : "Absent"}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => markAttendance(user.tagNumber || "", "present")}
                        disabled={isSubmittingTag}
                        className={`${
                          currentStatus === "present"
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-green-500 hover:bg-green-600"
                        } text-white`}
                      >
                        {isSubmittingTag && currentStatus !== "present" ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Check className="h-4 w-4 mr-2" />
                        )}
                        Present
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => markAttendance(user.tagNumber || "", "absent")}
                        disabled={isSubmittingTag}
                        className={currentStatus === "absent" ? "bg-red-600 hover:bg-red-700" : ""}
                      >
                        {isSubmittingTag && currentStatus !== "absent" ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <X className="h-4 w-4 mr-2" />
                        )}
                        Absent
                      </Button>
                    </div>
                  </div>
                );
              })}
              
              {users.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">No registered users with tag numbers found.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

