import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCheck, Copy, Check, Loader2, BookOpen } from "lucide-react";
import { collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AttendanceRecord {
  id: string;
  tagNumber: string;
  lectureTitle: string;
  status: "present" | "absent";
  timestamp: any;
  lectureId: string;
}

interface Lecture {
  id: string;
  title: string;
  token: string;
  createdAt: any;
}

export function AttendanceManagement() {
  const [lectureTitle, setLectureTitle] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedToken, setGeneratedToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Load lectures
    const lecturesQuery = query(collection(db, "lectures"), orderBy("createdAt", "desc"));
    const unsubscribeLectures = onSnapshot(lecturesQuery, (snapshot) => {
      const lecturesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Lecture[];
      setLectures(lecturesData);
    });

    // Load attendance records - we'll get all and group by lecture
    const attendanceQuery = query(collection(db, "attendance"), orderBy("timestamp", "desc"));
    const unsubscribeAttendance = onSnapshot(attendanceQuery, (snapshot) => {
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as AttendanceRecord[];
      setAttendanceRecords(records);
    }, (error) => {
      console.error("Error loading attendance:", error);
      // If ordering fails, try without orderBy
      const fallbackQuery = query(collection(db, "attendance"));
      onSnapshot(fallbackQuery, (snapshot) => {
        const records = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as AttendanceRecord[];
        // Sort manually
        records.sort((a, b) => {
          const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
          const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
          return timeB - timeA;
        });
        setAttendanceRecords(records);
      });
    });

    return () => {
      unsubscribeLectures();
      unsubscribeAttendance();
    };
  }, []);

  const generateToken = () => {
    const randomPart1 = Math.random().toString(36).substring(2, 15);
    const randomPart2 = Math.random().toString(36).substring(2, 15);
    const randomPart3 = Math.random().toString(36).substring(2, 15);
    const timestamp = Date.now().toString(36);
    return `${randomPart1}${randomPart2}${timestamp}${randomPart3}`;
  };

  const handleSetLecture = async () => {
    if (!lectureTitle.trim()) {
      toast({
        title: "Error",
        description: "Please enter a lecture title",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const token = generateToken();
      
      const lectureDocRef = await addDoc(collection(db, "lectures"), {
        title: lectureTitle.trim(),
        token,
        createdAt: serverTimestamp(),
      });

      setGeneratedToken(token);
      setLectureTitle("");
      
      toast({
        title: "Lecture Set",
        description: "Lecture link generated successfully",
      });
    } catch (error: any) {
      console.error("Error setting lecture:", error);
      toast({
        title: "Error",
        description: "Failed to set lecture",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyLink = (token: string) => {
    const baseUrl = window.location.origin;
    const fullLink = `${baseUrl}/attendance/${token}`;
    navigator.clipboard.writeText(fullLink);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Attendance link copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  // Group attendance records by lecture title
  const groupedRecords = attendanceRecords.reduce((acc, record) => {
    if (!acc[record.lectureTitle]) {
      acc[record.lectureTitle] = [];
    }
    acc[record.lectureTitle].push(record);
    return acc;
  }, {} as Record<string, AttendanceRecord[]>);

  // Get unique lecture titles in order
  const lectureTitles = Array.from(new Set(attendanceRecords.map(r => r.lectureTitle))).reverse();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          Attendance Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Set Lecture Section */}
        <div className="space-y-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-xl border border-purple-200 dark:border-purple-700">
          <div className="space-y-2">
            <Label htmlFor="lecture-title" className="text-gray-900 dark:text-gray-100 font-semibold">
              Lecture Title
            </Label>
            <div className="flex gap-2">
              <Input
                id="lecture-title"
                value={lectureTitle}
                onChange={(e) => setLectureTitle(e.target.value)}
                placeholder="e.g., FISHERY"
                className="bg-white dark:bg-white text-gray-900 border-gray-300 focus:border-purple-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSetLecture();
                  }
                }}
              />
              <Button
                onClick={handleSetLecture}
                disabled={isGenerating || !lectureTitle.trim()}
                className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting...
                  </>
                ) : (
                  <>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Set Lecture
                  </>
                )}
              </Button>
            </div>
          </div>

          {generatedToken && (
            <div className="mt-4 p-4 bg-white dark:bg-gray-100 rounded-lg space-y-3 border border-gray-300">
              <Label className="text-gray-900 dark:text-gray-900 font-semibold">Generated Attendance Link:</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={`${window.location.origin}/attendance/${generatedToken}`}
                  readOnly
                  className="font-mono text-xs bg-white dark:bg-white text-gray-900 border-gray-300 break-all"
                />
                <Button size="sm" onClick={() => copyLink(generatedToken)} className="shrink-0">
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Attendance Records Table */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Live Attendance Records</h3>
          
          {lectureTitles.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No attendance records yet.</p>
          ) : (
            <div className="space-y-6">
              {lectureTitles.map((lectureTitle) => {
                const records = groupedRecords[lectureTitle];
                const presentCount = records.filter(r => r.status === "present").length;
                const absentCount = records.filter(r => r.status === "absent").length;
                
                return (
                  <div key={lectureTitle} className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-200 dark:border-blue-700">
                      <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        {lectureTitle}
                      </h4>
                      <div className="flex gap-4">
                        <Badge className="bg-green-500">
                          Present: {presentCount}
                        </Badge>
                        <Badge variant="destructive">
                          Absent: {absentCount}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tag Number</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Time</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {records.map((record) => {
                            const timestamp = record.timestamp?.toDate ? record.timestamp.toDate() : new Date(record.timestamp);
                            return (
                              <TableRow key={record.id}>
                                <TableCell className="font-mono font-semibold">
                                  {record.tagNumber}
                                </TableCell>
                                <TableCell>
                                  <Badge className={record.status === "present" ? "bg-green-500" : "bg-red-500"}>
                                    {record.status === "present" ? "Present" : "Absent"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {timestamp.toLocaleString()}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

