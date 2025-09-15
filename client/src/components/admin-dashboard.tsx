import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation, Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, Upload, Download, Building, ChevronDown, UserPlus, Settings, Trash, Loader2, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { collection, onSnapshot, query, where, orderBy, doc, writeBatch, getDocs } from "firebase/firestore";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { db } from "@/lib/firebase";
import type { User, Room, Tag as TagType, Stats } from "@shared/schema";
import { StudentTable } from "./student-table";
import { UploadModal } from "./upload-modal";
import { EditStudentModal } from "./edit-student-modal";
import { RoomsTagsDetailPage } from "./rooms-tags-detail-page";
import { exportUsersToExcel } from "@/lib/excel-utils";
import { exportUsersToPDF } from "@/lib/pdf-utils";
import { clearAllData } from "@/lib/db-init";
import { useToast } from "@/hooks/use-toast";
import { ClearDataDialog } from "./clear-data-dialog";

export function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState<'rooms' | 'tags'>('rooms');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [, setLocation] = useLocation();
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');
  const [exportType, setExportType] = useState<'full' | 'summary'>('full');
  
  // Bulk delete state for tags and rooms
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState(0);
  const [bulkDeleteStatus, setBulkDeleteStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [bulkDeleteCount, setBulkDeleteCount] = useState(0);
  const [bulkDeleteType, setBulkDeleteType] = useState<'tags' | 'rooms' | null>(null);
  
  // Clear data dialog state
  const [showClearDataDialog, setShowClearDataDialog] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [wingFilter, setWingFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  
  const { toast } = useToast();

  // Force refresh function
  const refreshData = async () => {
    try {
      const [usersSnapshot, roomsSnapshot, tagsSnapshot] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "rooms")),
        getDocs(collection(db, "tags")),
      ]);

      const userData = usersSnapshot.docs
        .filter(doc => {
          const data = doc.data();
          return data.firstName && data.surname && data.email && !data._placeholder;
        })
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        })) as User[];

      const roomData = roomsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Room[];

      const tagData = tagsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as TagType[];

      setUsers(userData);
      setRooms(roomData);
      setTags(tagData);
      
      console.log("Data refreshed manually");
      console.log("Users:", userData.length);
      console.log("Rooms:", roomData.length);
      console.log("Tags:", tagData.length);
      
      toast({
        title: "Data Refreshed",
        description: "All data has been refreshed from the database.",
      });
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Real-time listeners
  useEffect(() => {
    const unsubscribeUsers = onSnapshot(
      query(collection(db, "users"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const userData = snapshot.docs
          .filter(doc => {
            const data = doc.data();
            // Filter out placeholder documents and invalid users
            return data.firstName && data.surname && data.email && !data._placeholder;
          })
          .map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        })) as User[];
        setUsers(userData);
        console.log("Users updated:", userData.length, "valid users");
      }
    );

    const unsubscribeRooms = onSnapshot(
      collection(db, "rooms"),
      (snapshot) => {
        const roomData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Room[];
        setRooms(roomData);
        console.log("Rooms updated:", roomData.length, "rooms");
        console.log("Room data:", roomData.map(room => ({
          id: room.id,
          roomNumber: room.roomNumber,
          availableBeds: room.availableBeds,
          gender: room.gender,
          wing: room.wing
        })));
      }
    );

    const unsubscribeTags = onSnapshot(
      collection(db, "tags"),
      (snapshot) => {
        const tagData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as TagType[];
        setTags(tagData);
        console.log("Tags updated:", tagData.length, "tags");
        console.log("Tag data:", tagData.map(tag => ({
          id: tag.id,
          tagNumber: tag.tagNumber,
          isAssigned: tag.isAssigned,
          assignedUserId: tag.assignedUserId
        })));
      }
    );

    return () => {
      unsubscribeUsers();
      unsubscribeRooms();
      unsubscribeTags();
    };
  }, []);

  // Update total students count
  useEffect(() => {
    setTotalStudents(users.length);
  }, [users]);

  // Apply filters
  useEffect(() => {
    let filtered = [...users];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.firstName.toLowerCase().includes(query) ||
        user.surname.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.phone.includes(query)
      );
    }

    if (genderFilter && genderFilter !== "all") {
      filtered = filtered.filter(user => user.gender === genderFilter);
    }

    if (wingFilter && wingFilter !== "all") {
      filtered = filtered.filter(user => user.roomNumber?.startsWith(wingFilter));
    }

    if (stateFilter && stateFilter !== "all") {
      filtered = filtered.filter(user => user.stateOfOrigin === stateFilter);
    }

    setFilteredUsers(filtered);
  }, [users, searchQuery, genderFilter, wingFilter, stateFilter]);

  const handleUpload = (type: 'rooms' | 'tags') => {
    setUploadType(type);
    setShowUploadModal(true);
  };

  const handleExport = () => {
    try {
      if (exportFormat === 'excel') {
        exportUsersToExcel(users, exportType);
        toast({
          title: "Export Successful",
          description: `Students data has been exported to Excel (${exportType} format) successfully!`,
        });
      } else {
        // Export as PDF - generate single PDF with all users in table format
        exportUsersToPDF(users, exportType);
        toast({
          title: "Export Successful",
          description: `PDF report generated for ${users.length} students (${exportType} format) successfully!`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
  };

  const handleViewDetails = (user: User) => {
    // Store user data in localStorage and navigate to details page
    localStorage.setItem('viewingUser', JSON.stringify(user));
    window.location.href = '/user-details';
  };

  // Bulk delete functions for tags and rooms
  const handleBulkDeleteTags = async () => {
    // Force refresh tags data before checking
    const tagsSnapshot = await getDocs(collection(db, "tags"));
    const currentTags = tagsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as TagType[];
    
    const availableTags = currentTags.filter(tag => !tag.isAssigned);
    console.log("Current tags in database:", currentTags.length);
    console.log("Available tags:", availableTags.length);
    console.log("Tags data:", currentTags.map(tag => ({
      id: tag.id,
      tagNumber: tag.tagNumber,
      isAssigned: tag.isAssigned
    })));
    
    if (availableTags.length === 0) {
      toast({
        title: "No Available Tags",
        description: "There are no available tags to delete.",
        variant: "destructive",
      });
      return;
    }

    setBulkDeleteType('tags');
    setBulkDeleteStatus('processing');
    setBulkDeleteProgress(0);
    setBulkDeleteCount(0);

    try {
      let deletedCount = 0;

      // Process in batches of 500 (Firebase limit)
      const batchSize = 500;
      for (let i = 0; i < availableTags.length; i += batchSize) {
        const tagBatch = availableTags.slice(i, i + batchSize);
        const batch = writeBatch(db);
        
        tagBatch.forEach(tag => {
          batch.delete(doc(db, "tags", tag.id));
        });

        await batch.commit();
        deletedCount += tagBatch.length;
        setBulkDeleteCount(deletedCount);
        setBulkDeleteProgress((deletedCount / availableTags.length) * 100);
      }

      setBulkDeleteStatus('success');
      toast({
        title: "✅ Tags Deleted Successfully",
        description: `Successfully deleted ${deletedCount} available tags.`,
        className: "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/20 dark:text-green-400",
      });

      // Reset after success
      setTimeout(() => {
        setBulkDeleteStatus('idle');
        setBulkDeleteProgress(0);
        setBulkDeleteCount(0);
        setBulkDeleteType(null);
      }, 2000);

    } catch (error: any) {
      console.error("Error deleting tags:", error);
      setBulkDeleteStatus('error');
      toast({
        title: "❌ Delete Failed",
        description: error.message || "Failed to delete tags. Please try again.",
        variant: "destructive",
      });
      
      setTimeout(() => {
        setBulkDeleteStatus('idle');
        setBulkDeleteProgress(0);
        setBulkDeleteCount(0);
        setBulkDeleteType(null);
      }, 3000);
    }
  };

  const handleBulkDeleteRooms = async () => {
    // Force refresh rooms data before checking
    const roomsSnapshot = await getDocs(collection(db, "rooms"));
    const currentRooms = roomsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Room[];
    
    const availableRooms = currentRooms.filter(room => room.availableBeds > 0);
    console.log("Current rooms in database:", currentRooms.length);
    console.log("Available rooms:", availableRooms.length);
    console.log("Rooms data:", currentRooms.map(room => ({
      id: room.id,
      roomNumber: room.roomNumber,
      availableBeds: room.availableBeds
    })));
    
    if (availableRooms.length === 0) {
      toast({
        title: "No Available Rooms",
        description: "There are no available rooms to delete.",
        variant: "destructive",
      });
      return;
    }

    setBulkDeleteType('rooms');
    setBulkDeleteStatus('processing');
    setBulkDeleteProgress(0);
    setBulkDeleteCount(0);

    try {
      let deletedCount = 0;

      // Process in batches of 500 (Firebase limit)
      const batchSize = 500;
      for (let i = 0; i < availableRooms.length; i += batchSize) {
        const roomBatch = availableRooms.slice(i, i + batchSize);
        const batch = writeBatch(db);
        
        roomBatch.forEach(room => {
          batch.delete(doc(db, "rooms", room.id));
        });

        await batch.commit();
        deletedCount += roomBatch.length;
        setBulkDeleteCount(deletedCount);
        setBulkDeleteProgress((deletedCount / availableRooms.length) * 100);
      }

      setBulkDeleteStatus('success');
      toast({
        title: "✅ Rooms Deleted Successfully",
        description: `Successfully deleted ${deletedCount} available rooms.`,
        className: "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/20 dark:text-green-400",
      });

      // Reset after success
      setTimeout(() => {
        setBulkDeleteStatus('idle');
        setBulkDeleteProgress(0);
        setBulkDeleteCount(0);
        setBulkDeleteType(null);
      }, 2000);

    } catch (error: any) {
      console.error("Error deleting rooms:", error);
      setBulkDeleteStatus('error');
      toast({
        title: "❌ Delete Failed",
        description: error.message || "Failed to delete rooms. Please try again.",
        variant: "destructive",
      });
      
      setTimeout(() => {
        setBulkDeleteStatus('idle');
        setBulkDeleteProgress(0);
        setBulkDeleteCount(0);
        setBulkDeleteType(null);
      }, 3000);
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setGenderFilter("all");
    setWingFilter("all");
    setStateFilter("all");
  };

  const handleClearAllData = async () => {
    setIsClearingData(true);
    try {
      const success = await clearAllData();
      if (success) {
        toast({
          title: "✅ Database Cleared",
          description: "All data has been successfully cleared from the database.",
          className: "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/20 dark:text-green-400",
        });
        setShowClearDataDialog(false);
      } else {
        throw new Error("Failed to clear data");
      }
    } catch (error: any) {
      console.error("Error clearing data:", error);
      toast({
        title: "❌ Clear Failed",
        description: error.message || "Failed to clear database. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsClearingData(false);
    }
  };


  const uniqueStates = Array.from(new Set(users?.map(user => user.stateOfOrigin).filter(Boolean) ?? [])).sort();
  const uniqueWings = Array.from(new Set(rooms?.map(room => room.wing).filter(Boolean) ?? [])).sort();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950">
      {/* Navigation */}
      <nav className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-2xl sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Building className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white drop-shadow-lg">
                  🎓 REGISTRATION MANAGEMENT SYSTEM
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link href="/">
                <Button
                  variant="default"
                  className="px-6 py-3 font-semibold transition-all duration-300 bg-white text-blue-600 hover:bg-blue-50 shadow-lg transform hover:scale-105"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  👤 Register User
                </Button>
              </Link>
              <Button
                variant="secondary"
                className="px-6 py-3 font-semibold transition-all duration-300 bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm border-white/30"
              >
                <Settings className="mr-2 h-4 w-4" />
                ⚙️ Admin Dashboard
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h2>
        <p className="text-muted-foreground">Manage user registrations, rooms, and tag assignments</p>
      </div>

      {/* Total Users Card */}
      <div className="max-w-sm">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-total-users">
                  {totalStudents}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Management Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Management Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button onClick={() => setLocation('/rooms-tags')} className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <Building className="mr-2 h-4 w-4" />
              🏠 View Rooms & Tags Details
            </Button>
            <Button onClick={() => handleUpload('rooms')} data-testid="button-upload-rooms">
              <Upload className="mr-2 h-4 w-4" />
              Upload Rooms (Excel)
            </Button>
            <Button onClick={() => handleUpload('tags')} data-testid="button-upload-tags">
              <Upload className="mr-2 h-4 w-4" />
              Upload Tags (Excel)
            </Button>
            <div className="flex flex-col gap-4">
              {/* Export Format Selection */}
              <div className="flex gap-2">
                <Select value={exportFormat} onValueChange={(value: 'excel' | 'pdf') => setExportFormat(value)}>
                  <SelectTrigger className="w-32 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 focus:ring-0 focus:ring-offset-0" data-testid="select-export-format">
                    <SelectValue className="text-gray-900 dark:text-gray-100" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-2 border-gray-300 dark:border-gray-700 shadow-2xl">
                    <SelectItem value="excel" className="hover:bg-green-50 dark:hover:bg-green-900/30 focus:bg-green-100 dark:focus:bg-green-800/40 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                      <span className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                        <span className="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 shadow-sm"></span>
                        📊 Excel
                      </span>
                    </SelectItem>
                    <SelectItem value="pdf" className="hover:bg-red-50 dark:hover:bg-red-900/30 focus:bg-red-100 dark:focus:bg-red-800/40 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                      <span className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                        <span className="w-3 h-3 rounded-full bg-gradient-to-r from-red-500 to-rose-600 shadow-sm"></span>
                        📄 PDF
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="secondary" onClick={handleExport} data-testid="button-export-users">
                  <Download className="mr-2 h-4 w-4" />
                  Export Users
                </Button>
              </div>
              
              {/* Export Type Tabs */}
              <div className="flex justify-center">
                <Tabs value={exportType} onValueChange={(value) => setExportType(value as 'full' | 'summary')} className="w-full max-w-md">
                  <TabsList className="grid w-full grid-cols-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                    <TabsTrigger value="full" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Full Details
                    </TabsTrigger>
                    <TabsTrigger value="summary" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Summary
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Delete Controls */}
      <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-xl border-2 border-red-200 dark:border-red-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-red-800 dark:text-red-200 flex items-center gap-3">
              <Trash className="h-6 w-6" />
              🗑️ Bulk Delete Operations
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshData}
                className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950/20"
              >
                <Settings className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowClearDataDialog(true)}
                className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/20"
              >
                <Trash className="h-4 w-4 mr-2" />
                Clear All Data
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Delete Available Tags */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200">Delete Available Tags</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {tags.filter(tag => !tag.isAssigned).length} available tags
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      disabled={bulkDeleteStatus === 'processing' || tags.filter(tag => !tag.isAssigned).length === 0}
                    >
                      {bulkDeleteStatus === 'processing' && bulkDeleteType === 'tags' ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Trash className="h-4 w-4 mr-2" />
                      )}
                      Delete All Available Tags
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-red-800 dark:text-red-200 flex items-center gap-2">
                        <Trash className="h-5 w-5" />
                        Delete All Available Tags
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-red-700 dark:text-red-300">
                        Are you sure you want to delete all {tags.filter(tag => !tag.isAssigned).length} available tags? 
                        This action cannot be undone and will permanently remove these tags from the system.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700">Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleBulkDeleteTags}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        Delete All Available Tags
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {/* Delete Available Rooms */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200">Delete Available Rooms</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {rooms.filter(room => room.availableBeds > 0).length} available rooms
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      disabled={bulkDeleteStatus === 'processing' || rooms.filter(room => room.availableBeds > 0).length === 0}
                    >
                      {bulkDeleteStatus === 'processing' && bulkDeleteType === 'rooms' ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Trash className="h-4 w-4 mr-2" />
                      )}
                      Delete All Available Rooms
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-red-800 dark:text-red-200 flex items-center gap-2">
                        <Trash className="h-5 w-5" />
                        Delete All Available Rooms
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-red-700 dark:text-red-300">
                        Are you sure you want to delete all {rooms.filter(room => room.availableBeds > 0).length} available rooms? 
                        This action cannot be undone and will permanently remove these rooms from the system.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700">Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleBulkDeleteRooms}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        Delete All Available Rooms
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>

          {/* Progress Indicator */}
          {bulkDeleteStatus === 'processing' && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  Deleting {bulkDeleteType}...
                </span>
                <span className="text-muted-foreground">
                  {bulkDeleteCount} items processed
                </span>
              </div>
              <Progress value={bulkDeleteProgress} className="h-3" />
            </div>
          )}

          {bulkDeleteStatus === 'success' && (
            <div className="mt-6 flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Bulk delete completed successfully!</span>
            </div>
          )}

          {bulkDeleteStatus === 'error' && (
            <div className="mt-6 flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Bulk delete failed. Please try again.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filters & Search</CardTitle>
            <Button variant="outline" size="sm" onClick={resetFilters} data-testid="button-reset-filters">
              Reset Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search"
              />
            </div>
            
            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger data-testid="select-gender-filter" className="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="All Genders" className="text-gray-900 dark:text-gray-100" />
              </SelectTrigger>
              <SelectContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-2 border-gray-300 dark:border-gray-700 shadow-2xl">
                <SelectItem value="all" className="hover:bg-blue-50 dark:hover:bg-blue-900/30 focus:bg-blue-100 dark:focus:bg-blue-800/40 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                  <span className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                    <span className="w-3 h-3 rounded-full bg-gradient-to-r from-gray-500 to-gray-600 shadow-sm"></span>
                    All Genders
                  </span>
                </SelectItem>
                <SelectItem value="Male" className="hover:bg-blue-50 dark:hover:bg-blue-900/30 focus:bg-blue-100 dark:focus:bg-blue-800/40 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                  <span className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                    <span className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 shadow-sm"></span>
                    👨 Male
                  </span>
                </SelectItem>
                <SelectItem value="Female" className="hover:bg-rose-50 dark:hover:bg-rose-900/30 focus:bg-rose-100 dark:focus:bg-rose-800/40 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                  <span className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                    <span className="w-3 h-3 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 shadow-sm"></span>
                    👩 Female
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={wingFilter} onValueChange={setWingFilter}>
              <SelectTrigger data-testid="select-wing-filter" className="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="All Wings" className="text-gray-900 dark:text-gray-100" />
              </SelectTrigger>
              <SelectContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-2 border-gray-300 dark:border-gray-700 shadow-2xl">
                <SelectItem value="all" className="hover:bg-emerald-50 dark:hover:bg-emerald-900/30 focus:bg-emerald-100 dark:focus:bg-emerald-800/40 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                  <span className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                    <span className="w-3 h-3 rounded-full bg-gradient-to-r from-gray-500 to-gray-600 shadow-sm"></span>
                    All Wings
                  </span>
                </SelectItem>
                {uniqueWings?.filter(Boolean).map((wing, index) => (
                  <SelectItem 
                    key={wing} 
                    value={wing}
                    className={`transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 ${
                      index % 4 === 0 ? 'hover:bg-emerald-50 dark:hover:bg-emerald-900/30 focus:bg-emerald-100 dark:focus:bg-emerald-800/40' :
                      index % 4 === 1 ? 'hover:bg-cyan-50 dark:hover:bg-cyan-900/30 focus:bg-cyan-100 dark:focus:bg-cyan-800/40' :
                      index % 4 === 2 ? 'hover:bg-sky-50 dark:hover:bg-sky-900/30 focus:bg-sky-100 dark:focus:bg-sky-800/40' :
                      'hover:bg-blue-50 dark:hover:bg-blue-900/30 focus:bg-blue-100 dark:focus:bg-blue-800/40'
                    }`}
                  >
                    <span className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                      <span className={`w-3 h-3 rounded-full shadow-sm ${
                        index % 4 === 0 ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' :
                        index % 4 === 1 ? 'bg-gradient-to-r from-cyan-500 to-cyan-600' :
                        index % 4 === 2 ? 'bg-gradient-to-r from-sky-500 to-sky-600' :
                        'bg-gradient-to-r from-blue-500 to-blue-600'
                      }`}></span>
                      Wing {wing}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger data-testid="select-state-filter" className="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="All States" className="text-gray-900 dark:text-gray-100" />
              </SelectTrigger>
              <SelectContent className="max-h-60 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-2 border-gray-300 dark:border-gray-700 shadow-2xl">
                <SelectItem value="all" className="hover:bg-violet-50 dark:hover:bg-violet-900/30 focus:bg-violet-100 dark:focus:bg-violet-800/40 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                  <span className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                    <span className="w-3 h-3 rounded-full bg-gradient-to-r from-gray-500 to-gray-600 shadow-sm"></span>
                    All States
                  </span>
                </SelectItem>
                {uniqueStates?.filter(Boolean).map((state, index) => (
                  <SelectItem 
                    key={state} 
                    value={state}
                    className={`transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 ${
                      index % 6 === 0 ? 'hover:bg-blue-50 dark:hover:bg-blue-900/30 focus:bg-blue-100 dark:focus:bg-blue-800/40' :
                      index % 6 === 1 ? 'hover:bg-emerald-50 dark:hover:bg-emerald-900/30 focus:bg-emerald-100 dark:focus:bg-emerald-800/40' :
                      index % 6 === 2 ? 'hover:bg-violet-50 dark:hover:bg-violet-900/30 focus:bg-violet-100 dark:focus:bg-violet-800/40' :
                      index % 6 === 3 ? 'hover:bg-amber-50 dark:hover:bg-amber-900/30 focus:bg-amber-100 dark:focus:bg-amber-800/40' :
                      index % 6 === 4 ? 'hover:bg-rose-50 dark:hover:bg-rose-900/30 focus:bg-rose-100 dark:focus:bg-rose-800/40' :
                      'hover:bg-indigo-50 dark:hover:bg-indigo-900/30 focus:bg-indigo-100 dark:focus:bg-indigo-800/40'
                    }`}
                  >
                    <span className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                      <span className={`w-3 h-3 rounded-full shadow-sm ${
                        index % 6 === 0 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                        index % 6 === 1 ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' :
                        index % 6 === 2 ? 'bg-gradient-to-r from-violet-500 to-violet-600' :
                        index % 6 === 3 ? 'bg-gradient-to-r from-amber-500 to-amber-600' :
                        index % 6 === 4 ? 'bg-gradient-to-r from-rose-500 to-rose-600' :
                        'bg-gradient-to-r from-indigo-500 to-indigo-600'
                      }`}></span>
                      {state}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {(searchQuery || (genderFilter && genderFilter !== "all") || (wingFilter && wingFilter !== "all") || (stateFilter && stateFilter !== "all")) && (
            <div className="flex items-center gap-2 mt-4">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {searchQuery && (
                <Badge key="search" variant="secondary" className="text-xs">
                  Search: {searchQuery}
                </Badge>
              )}
              {genderFilter && genderFilter !== "all" && (
                <Badge key="gender" variant="secondary" className="text-xs">
                  Gender: {genderFilter}
                </Badge>
              )}
              {wingFilter && wingFilter !== "all" && (
                <Badge key="wing" variant="secondary" className="text-xs">
                  Wing: {wingFilter}
                </Badge>
              )}
              {stateFilter && stateFilter !== "all" && (
                <Badge key="state" variant="secondary" className="text-xs">
                  State: {stateFilter}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Students Table */}
      <StudentTable 
        users={filteredUsers} 
        onEdit={handleEdit}
        onViewDetails={handleViewDetails}
      />

      {/* Modals */}
      {showUploadModal && (
        <UploadModal
          type={uploadType}
          onClose={() => setShowUploadModal(false)}
        />
      )}

      {editingUser && (
        <EditStudentModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
        />
      )}


      {/* Clear Data Dialog */}
      <ClearDataDialog
        open={showClearDataDialog}
        onOpenChange={setShowClearDataDialog}
        onConfirm={handleClearAllData}
        isLoading={isClearingData}
      />

      {/* Details view moved to dedicated route */}
        </div>
      </div>
    </div>
  );
}
