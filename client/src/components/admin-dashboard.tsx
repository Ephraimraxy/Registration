import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Upload, Download, Building, ChevronDown } from "lucide-react";
import { collection, onSnapshot, query, where, orderBy, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { User, Room, Tag as TagType, Stats } from "@shared/schema";
import { StudentTable } from "./student-table";
import { UploadModal } from "./upload-modal";
import { EditStudentModal } from "./edit-student-modal";
import { RoomsTagsDetailPage } from "./rooms-tags-detail-page";
import { exportUsersToExcel } from "@/lib/excel-utils";
import { exportUsersToPDF } from "@/lib/pdf-utils";
import { useToast } from "@/hooks/use-toast";

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
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [wingFilter, setWingFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  
  const { toast } = useToast();

  // Real-time listeners
  useEffect(() => {
    const unsubscribeUsers = onSnapshot(
      query(collection(db, "users"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const userData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        })) as User[];
        setUsers(userData);
        console.log("Users updated:", userData.length, "users");
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
        exportUsersToExcel(users);
        toast({
          title: "Export Successful",
          description: "Students data has been exported to Excel successfully!",
        });
      } else {
        // Export as PDF - generate single PDF with all users in table format
        exportUsersToPDF(users);
        toast({
          title: "Export Successful",
          description: `PDF report generated for ${users.length} students successfully!`,
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

  const resetFilters = () => {
    setSearchQuery("");
    setGenderFilter("all");
    setWingFilter("all");
    setStateFilter("all");
  };

  const uniqueStates = Array.from(new Set(users?.map(user => user.stateOfOrigin).filter(Boolean) ?? [])).sort();
  const uniqueWings = Array.from(new Set(rooms?.map(room => room.wing).filter(Boolean) ?? [])).sort();

  return (
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
          </div>
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

      {/* Details view moved to dedicated route */}
    </div>
  );
}
