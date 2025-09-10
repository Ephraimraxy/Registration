import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Bed, Tag, Upload, Download, BarChart3 } from "lucide-react";
import { collection, onSnapshot, query, where, orderBy, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User, Room, Tag as TagType, Stats } from "@shared/schema";
import { StudentTable } from "./student-table";
import { UploadModal } from "./upload-modal";
import { EditStudentModal } from "./edit-student-modal";
import { exportUsersToExcel } from "@/lib/excel-utils";
import { useToast } from "@/hooks/use-toast";

export function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    availableRooms: 0,
    assignedTags: 0,
    availableTags: 0,
  });
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState<'rooms' | 'tags'>('rooms');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
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
      }
    );

    return () => {
      unsubscribeUsers();
      unsubscribeRooms();
      unsubscribeTags();
    };
  }, []);

  // Calculate stats directly from real-time data
  useEffect(() => {
    console.log("Calculating stats from real-time data...");
    const calculatedStats = {
      totalStudents: users.length,
      availableRooms: rooms.filter(room => room.availableBeds > 0).length,
      assignedTags: tags.filter(tag => tag.isAssigned).length,
      availableTags: tags.filter(tag => !tag.isAssigned).length,
    };
    
    console.log("Real-time calculated stats:", calculatedStats);
    setStats(calculatedStats);
  }, [users, rooms, tags]);

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
      exportUsersToExcel(users);
      toast({
        title: "Export Successful",
        description: "Students data has been exported to Excel successfully!",
      });
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-total-users">
                  {stats.totalStudents}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Available Rooms</p>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-available-rooms">
                  {stats.availableRooms}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <Bed className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Assigned Tags</p>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-assigned-tags">
                  {stats.assignedTags}
                </p>
              </div>
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                <Tag className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Available Tags</p>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-available-tags">
                  {stats.availableTags}
                </p>
              </div>
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <Tag className="h-5 w-5 text-purple-600 dark:text-purple-400" />
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
            <Button onClick={() => handleUpload('rooms')} data-testid="button-upload-rooms">
              <Upload className="mr-2 h-4 w-4" />
              Upload Rooms (Excel)
            </Button>
            <Button onClick={() => handleUpload('tags')} data-testid="button-upload-tags">
              <Upload className="mr-2 h-4 w-4" />
              Upload Tags (Excel)
            </Button>
            <Button variant="secondary" onClick={handleExport} data-testid="button-export-users">
              <Download className="mr-2 h-4 w-4" />
              Export Users
            </Button>
            <Button variant="secondary" onClick={refreshStats} data-testid="button-refresh-stats">
              <BarChart3 className="mr-2 h-4 w-4" />
              Refresh Stats
            </Button>
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
              <SelectTrigger data-testid="select-gender-filter">
                <SelectValue placeholder="All Genders" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genders</SelectItem>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={wingFilter} onValueChange={setWingFilter}>
              <SelectTrigger data-testid="select-wing-filter">
                <SelectValue placeholder="All Wings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Wings</SelectItem>
                {uniqueWings?.filter(Boolean).map(wing => (
                  <SelectItem key={wing} value={wing}>Wing {wing}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger data-testid="select-state-filter">
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {uniqueStates?.filter(Boolean).map(state => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
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
    </div>
  );
}
