import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  Bed, 
  Tag, 
  Users, 
  User, 
  Home,
  CheckCircle,
  XCircle,
  AlertCircle,
  Building,
  Hash
} from "lucide-react";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type { Room, Tag as TagType, User as UserType } from "@shared/schema";

interface RoomsTagsDetailPageProps {
  onBack: () => void;
}

export function RoomsTagsDetailPage({ onBack }: RoomsTagsDetailPageProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { toast } = useToast();

  // Real-time listeners
  useEffect(() => {
    const unsubscribeRooms = onSnapshot(
      query(collection(db, "rooms"), orderBy("roomNumber", "asc")),
      (snapshot) => {
        const roomData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Room[];
        setRooms(roomData);
      }
    );

    const unsubscribeTags = onSnapshot(
      query(collection(db, "tags"), orderBy("tagNumber", "asc")),
      (snapshot) => {
        const tagData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as TagType[];
        setTags(tagData);
      }
    );

    const unsubscribeUsers = onSnapshot(
      query(collection(db, "users"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const userData = snapshot.docs
          .filter(doc => {
            const data = doc.data();
            return data.firstName && data.surname && data.email && !data._placeholder;
          })
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
          })) as UserType[];
        setUsers(userData);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeRooms();
      unsubscribeTags();
      unsubscribeUsers();
    };
  }, []);

  // Helper function to get users in a specific room
  const getUsersInRoom = (roomNumber: string) => {
    return users.filter(user => user.roomNumber === roomNumber);
  };

  // Helper function to get user assigned to a tag
  const getUserForTag = (tagNumber: string) => {
    return users.find(user => user.tagNumber === tagNumber);
  };


  // Helper function to get room occupancy status
  const getRoomOccupancyStatus = (room: Room) => {
    const usersInRoom = getUsersInRoom(room.roomNumber);
    const occupiedBeds = usersInRoom.length;
    const totalBeds = room.totalBeds || 0;
    const availableBeds = room.availableBeds || 0;

    if (occupiedBeds === 0) {
      return { status: "empty", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200", icon: XCircle };
    } else if (occupiedBeds === totalBeds) {
      return { status: "full", color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400", icon: CheckCircle };
    } else {
      return { status: "partial", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400", icon: AlertCircle };
    }
  };

  // Helper function to get avatar color
  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-purple-500", 
      "bg-pink-500", "bg-indigo-500", "bg-red-500", "bg-orange-500"
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading rooms and tags...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={onBack}
            variant="outline"
            className="mb-6 bg-white/90 backdrop-blur-sm border-blue-300 hover:bg-blue-50 dark:bg-gray-800/90 dark:border-blue-600 dark:hover:bg-blue-950/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            ← Back to Admin Dashboard
          </Button>
          
          <div className="text-center bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 dark:from-blue-600/20 dark:via-indigo-600/20 dark:to-purple-600/20 rounded-2xl p-8 border border-blue-200/50 dark:border-blue-700/50">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full shadow-lg">
                <Building className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4 drop-shadow-lg">
              🏠 Rooms & Tags Detailed View
            </h1>
            <p className="text-lg text-gray-700 dark:text-gray-300 font-medium">
              📊 Complete overview of room occupancy and tag assignments
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-xl border-2 border-blue-200 dark:border-blue-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Rooms</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{rooms.length}</p>
                </div>
                <Home className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-xl border-2 border-green-200 dark:border-green-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Available Beds</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {rooms.reduce((sum, room) => sum + (room.availableBeds || 0), 0)}
                  </p>
                </div>
                <Bed className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-xl border-2 border-purple-200 dark:border-purple-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tags</p>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{tags.length}</p>
                </div>
                <Tag className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-xl border-2 border-orange-200 dark:border-orange-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Available Tags</p>
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    {tags.filter(tag => !tag.isAssigned).length}
                  </p>
                </div>
                <Hash className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>


        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Rooms Table */}
          <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-xl border-2 border-blue-200 dark:border-blue-700">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
              <CardTitle className="text-2xl font-bold text-blue-800 dark:text-blue-200 flex items-center gap-3">
                <Home className="h-6 w-6" />
                🏠 Rooms Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Room
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Wing
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Gender
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Occupancy
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Residents
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {rooms.map((room) => {
                      const usersInRoom = getUsersInRoom(room.roomNumber);
                      const occupancyStatus = getRoomOccupancyStatus(room);
                      const StatusIcon = occupancyStatus.icon;
                      
                      return (
                        <tr key={room.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3">
                                <Hash className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  Room {room.roomNumber}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {room.availableBeds || 0} / {room.totalBeds || 0} beds
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400">
                              {room.wing}
                            </Badge>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <Badge 
                              variant="secondary" 
                              className={room.gender === 'Male' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400'}
                            >
                              {room.gender}
                            </Badge>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <Badge className={occupancyStatus.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {occupancyStatus.status === 'empty' ? 'Empty' : 
                               occupancyStatus.status === 'full' ? 'Full' : 'Partial'}
                            </Badge>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-2">
                              {usersInRoom.length > 0 ? (
                                usersInRoom.map((user) => {
                                  const fullName = `${user.firstName} ${user.surname}`.trim();
                                  const initials = `${user.firstName?.charAt(0) || ''}${user.surname?.charAt(0) || ''}`.toUpperCase();
                                  return (
                                    <div key={user.id} className="flex items-center gap-2">
                                      <Avatar className="h-6 w-6">
                                        <AvatarFallback className={`${getAvatarColor(fullName)} text-white text-xs`}>
                                          {initials}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-xs text-gray-600 dark:text-gray-400">
                                        {fullName}
                                      </span>
                                    </div>
                                  );
                                })
                              ) : (
                                <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                                  No residents
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Tags Table */}
          <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-xl border-2 border-purple-200 dark:border-purple-700">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
              <CardTitle className="text-2xl font-bold text-purple-800 dark:text-purple-200 flex items-center gap-3">
                <Tag className="h-6 w-6" />
                🏷️ Tags Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Tag Number
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Assigned To
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {tags.map((tag) => {
                      const assignedUser = getUserForTag(tag.tagNumber);
                      
                      return (
                        <tr key={tag.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg mr-3">
                                <Hash className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                              </div>
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {tag.tagNumber}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <Badge 
                              className={tag.isAssigned 
                                ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" 
                                : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                              }
                            >
                              {tag.isAssigned ? (
                                <>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Taken
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Available
                                </>
                              )}
                            </Badge>
                          </td>
                          <td className="px-4 py-4">
                            {assignedUser ? (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className={`${getAvatarColor(`${assignedUser.firstName} ${assignedUser.surname}`)} text-white text-xs`}>
                                    {`${assignedUser.firstName?.charAt(0) || ''}${assignedUser.surname?.charAt(0) || ''}`.toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {`${assignedUser.firstName} ${assignedUser.surname}`.trim()}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    Room {assignedUser.roomNumber}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500 dark:text-gray-400 italic">
                                Not assigned
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
