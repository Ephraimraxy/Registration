import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, Trash2, ChevronLeft, ChevronRight, Loader2, CheckCircle, AlertCircle, X, Shield, Zap, User as UserIcon, Trash, Users, Eye } from "lucide-react";
import type { User } from "@shared/schema";
import { doc, deleteDoc, updateDoc, query, where, collection, getDocs, runTransaction, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

interface StudentTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onViewDetails: (user: User) => void;
}

const ITEMS_PER_PAGE = 10;

export function StudentTable({ users, onEdit, onViewDetails }: StudentTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  
  // Bulk delete state
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState(0);
  const [bulkDeleteStatus, setBulkDeleteStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [bulkDeleteCount, setBulkDeleteCount] = useState(0);
  
  const { toast } = useToast();

  const totalPages = Math.ceil(users.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentUsers = users.slice(startIndex, endIndex);

  const handleDelete = async (user: User) => {
    if (!user.id) return;
    
    const fullName = `${user.firstName} ${user.middleName || ''} ${user.surname}`.trim();
    
    setDeletingUserId(user.id);
    setDeleteStatus('processing');
    setDeleteProgress(0);
    
    try {
      // Use atomic transaction to ensure consistency
      await runTransaction(db, async (transaction) => {
        setDeleteProgress(20);
        
        // Free up the room bed
        if (user.roomNumber) {
          setDeleteProgress(40);
          console.log("Freeing up room:", user.roomNumber);
          const roomsQuery = query(
            collection(db, "rooms"),
            where("roomNumber", "==", user.roomNumber)
          );
          const roomsSnapshot = await getDocs(roomsQuery);
          
          if (!roomsSnapshot.empty) {
            const roomDoc = roomsSnapshot.docs[0];
            const roomData = roomDoc.data();
            console.log("Room found:", roomData.roomNumber, "Current available beds:", roomData.availableBeds);
            transaction.update(roomDoc.ref, {
              availableBeds: roomData.availableBeds + 1,
            });
            console.log("Room updated: available beds will be", roomData.availableBeds + 1);
          } else {
            console.log("No room found with number:", user.roomNumber);
          }
          setDeleteProgress(60);
        }

        // Free up the tag
        if (user.tagNumber) {
          setDeleteProgress(70);
          console.log("Freeing up tag:", user.tagNumber);
          const tagsQuery = query(
            collection(db, "tags"),
            where("tagNumber", "==", user.tagNumber)
          );
          const tagsSnapshot = await getDocs(tagsQuery);
          
          if (!tagsSnapshot.empty) {
            const tagDoc = tagsSnapshot.docs[0];
            const tagData = tagDoc.data();
            console.log("Tag found:", tagData.tagNumber, "Currently assigned:", tagData.isAssigned);
            transaction.update(tagDoc.ref, {
              isAssigned: false,
              assignedUserId: null,
            });
            console.log("Tag updated: isAssigned will be false");
          } else {
            console.log("No tag found with number:", user.tagNumber);
          }
          setDeleteProgress(85);
        }

        // Delete the user
        setDeleteProgress(90);
        transaction.delete(doc(db, "users", user.id));
        setDeleteProgress(100);
      });
      
      setDeleteStatus('success');
      
      toast({
        title: "✅ User Deleted Successfully",
        description: `${fullName} has been removed from the system. Room and tag are now available.`,
        className: "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/20 dark:text-green-400",
      });
      
      // Reset after success
      setTimeout(() => {
        setDeleteStatus('idle');
        setDeleteProgress(0);
      }, 2000);
    } catch (error: any) {
      console.error("Error deleting student:", error);
      setDeleteStatus('error');
      toast({
        title: "❌ Delete Failed",
        description: error.message || "Failed to delete user. Please try again.",
        variant: "destructive",
        className: "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/20 dark:text-red-400",
      });
      
      // Reset after error
      setTimeout(() => {
        setDeleteStatus('idle');
        setDeleteProgress(0);
      }, 3000);
    } finally {
      setDeletingUserId(null);
    }
  };

  // Bulk delete functions
  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUsers);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allUserIds = new Set(users.map(user => user.id));
      setSelectedUsers(allUserIds);
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.size === 0) return;

    setBulkDeleteStatus('processing');
    setBulkDeleteProgress(0);
    setBulkDeleteCount(0);

    try {
      const selectedUsersList = users.filter(user => selectedUsers.has(user.id));
      const totalUsers = selectedUsersList.length;
      let deletedCount = 0;

      // Process users in batches to avoid Firebase limits
      const batchSize = 10;
      for (let i = 0; i < selectedUsersList.length; i += batchSize) {
        const batch = selectedUsersList.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (user) => {
          if (!user.id) return;

          await runTransaction(db, async (transaction) => {
            // Free up the room bed
            if (user.roomNumber) {
              const roomsQuery = query(
                collection(db, "rooms"),
                where("roomNumber", "==", user.roomNumber)
              );
              const roomsSnapshot = await getDocs(roomsQuery);
              
              if (!roomsSnapshot.empty) {
                const roomDoc = roomsSnapshot.docs[0];
                const roomData = roomDoc.data();
                transaction.update(roomDoc.ref, {
                  availableBeds: roomData.availableBeds + 1,
                });
              }
            }

            // Free up the tag
            if (user.tagNumber) {
              const tagsQuery = query(
                collection(db, "tags"),
                where("tagNumber", "==", user.tagNumber)
              );
              const tagsSnapshot = await getDocs(tagsQuery);
              
              if (!tagsSnapshot.empty) {
                const tagDoc = tagsSnapshot.docs[0];
                transaction.update(tagDoc.ref, {
                  isAssigned: false,
                  assignedUserId: null,
                });
              }
            }

            // Delete the user
            transaction.delete(doc(db, "users", user.id));
          });

          deletedCount++;
          setBulkDeleteCount(deletedCount);
          setBulkDeleteProgress((deletedCount / totalUsers) * 100);
        }));
      }

      setBulkDeleteStatus('success');
      setSelectedUsers(new Set());
      
      toast({
        title: "✅ Bulk Delete Successful",
        description: `Successfully deleted ${deletedCount} users and freed up their rooms and tags.`,
        className: "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/20 dark:text-green-400",
      });

      // Reset after success
      setTimeout(() => {
        setBulkDeleteStatus('idle');
        setBulkDeleteProgress(0);
        setBulkDeleteCount(0);
      }, 2000);

    } catch (error: any) {
      console.error("Error in bulk delete:", error);
      setBulkDeleteStatus('error');
      toast({
        title: "❌ Bulk Delete Failed",
        description: error.message || "Failed to delete selected users. Please try again.",
        variant: "destructive",
        className: "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/20 dark:text-red-400",
      });
      
      // Reset after error
      setTimeout(() => {
        setBulkDeleteStatus('idle');
        setBulkDeleteProgress(0);
        setBulkDeleteCount(0);
      }, 3000);
    }
  };

  const getInitials = (firstName: string, surname: string) => {
    const first = firstName?.charAt(0) || '';
    const last = surname?.charAt(0) || '';
    return `${first}${last}`.toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-purple-500", 
      "bg-pink-500", "bg-indigo-500", "bg-red-500", "bg-orange-500"
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (users.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Registered Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">No users registered yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Users Registration</CardTitle>
          {selectedUsers.size > 0 && (
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium transition-colors duration-300 ${
                selectedUsers.size === 0 
                  ? 'text-muted-foreground'
                  : selectedUsers.size <= 5
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : selectedUsers.size <= 15
                  ? 'text-orange-600 dark:text-orange-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {selectedUsers.size} selected
                {selectedUsers.size > 0 && (
                  <span className={`ml-1 ${
                    selectedUsers.size <= 5
                      ? 'text-yellow-500'
                      : selectedUsers.size <= 15
                      ? 'text-orange-500'
                      : 'text-red-500'
                  }`}>
                    {selectedUsers.size <= 5 ? '⚠️' : selectedUsers.size <= 15 ? '🚨' : '🔥'}
                  </span>
                )}
              </span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    disabled={bulkDeleteStatus === 'processing' || selectedUsers.size === 0}
                    className={`transition-all duration-300 ${
                      selectedUsers.size === 0 
                        ? 'opacity-50 cursor-not-allowed'
                        : selectedUsers.size <= 5
                        ? 'bg-yellow-600 hover:bg-yellow-700 border-yellow-600'
                        : selectedUsers.size <= 15
                        ? 'bg-orange-600 hover:bg-orange-700 border-orange-600'
                        : 'bg-red-600 hover:bg-red-700 border-red-600'
                    }`}
                  >
                    {bulkDeleteStatus === 'processing' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Trash className="h-4 w-4 mr-2" />
                    )}
                    Delete Selected
                    {selectedUsers.size > 0 && (
                      <Badge variant="secondary" className={`ml-2 ${
                        selectedUsers.size <= 5
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                          : selectedUsers.size <= 15
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {selectedUsers.size}
                      </Badge>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className={`transition-all duration-300 ${
                  selectedUsers.size === 0 
                    ? 'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700'
                    : selectedUsers.size <= 5
                    ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800'
                    : selectedUsers.size <= 15
                    ? 'border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800'
                    : 'border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800'
                }`}>
                  <AlertDialogHeader>
                    <AlertDialogTitle className={`flex items-center gap-2 ${
                      selectedUsers.size === 0 
                        ? 'text-gray-800 dark:text-gray-200'
                        : selectedUsers.size <= 5
                        ? 'text-yellow-800 dark:text-yellow-200'
                        : selectedUsers.size <= 15
                        ? 'text-orange-800 dark:text-orange-200'
                        : 'text-red-800 dark:text-red-200'
                    }`}>
                      <Trash className={`h-5 w-5 ${
                        selectedUsers.size === 0 
                          ? 'text-gray-600 dark:text-gray-400'
                          : selectedUsers.size <= 5
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : selectedUsers.size <= 15
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-red-600 dark:text-red-400'
                      }`} />
                      Delete Selected Users
                      {selectedUsers.size > 0 && (
                        <Badge variant="secondary" className={`ml-2 ${
                          selectedUsers.size <= 5
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                            : selectedUsers.size <= 15
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                          {selectedUsers.size} selected
                        </Badge>
                      )}
                    </AlertDialogTitle>
                    <AlertDialogDescription className={`${
                      selectedUsers.size === 0 
                        ? 'text-gray-600 dark:text-gray-400'
                        : selectedUsers.size <= 5
                        ? 'text-yellow-700 dark:text-yellow-300'
                        : selectedUsers.size <= 15
                        ? 'text-orange-700 dark:text-orange-300'
                        : 'text-red-700 dark:text-red-300'
                    }`}>
                      {selectedUsers.size === 0 ? (
                        "No users selected for deletion."
                      ) : selectedUsers.size <= 5 ? (
                        `⚠️ You are about to delete ${selectedUsers.size} user${selectedUsers.size === 1 ? '' : 's'}. This action will free up their assigned rooms and tags. This action cannot be undone.`
                      ) : selectedUsers.size <= 15 ? (
                        `🚨 You are about to delete ${selectedUsers.size} users. This is a significant action that will free up their assigned rooms and tags. This action cannot be undone.`
                      ) : (
                        `🔥 DANGER: You are about to delete ${selectedUsers.size} users! This is a massive operation that will free up all their assigned rooms and tags. This action cannot be undone and may impact system performance.`
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className={`${
                      selectedUsers.size === 0 
                        ? 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'
                        : selectedUsers.size <= 5
                        ? 'bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:hover:bg-yellow-900/50'
                        : selectedUsers.size <= 15
                        ? 'bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/30 dark:hover:bg-orange-900/50'
                        : 'bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50'
                    }`}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleBulkDelete}
                      className={`${
                        selectedUsers.size === 0 
                          ? 'bg-gray-600 hover:bg-gray-700 text-white'
                          : selectedUsers.size <= 5
                          ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                          : selectedUsers.size <= 15
                          ? 'bg-orange-600 hover:bg-orange-700 text-white'
                          : 'bg-red-600 hover:bg-red-700 text-white'
                      }`}
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      Delete {selectedUsers.size} User{selectedUsers.size === 1 ? '' : 's'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
        {bulkDeleteStatus === 'processing' && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Deleting users...</span>
              <span>{bulkDeleteCount} / {selectedUsers.size}</span>
            </div>
            <Progress value={bulkDeleteProgress} className="h-2" />
          </div>
        )}
        {bulkDeleteStatus === 'success' && (
          <div className="mt-4 flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Bulk delete completed successfully!</span>
          </div>
        )}
        {bulkDeleteStatus === 'error' && (
          <div className="mt-4 flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Bulk delete failed. Please try again.</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-12">
                  <Checkbox
                    checked={selectedUsers.size === users.length && users.length > 0}
                    onCheckedChange={handleSelectAll}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Gender
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Room
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Tag
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  NIN
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  State
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {currentUsers.map((user) => {
                const fullName = `${user.firstName} ${user.middleName || ''} ${user.surname}`.trim();
                const initials = getInitials(user.firstName, user.surname);
                const avatarColor = getAvatarColor(fullName);
                
                return (
                  <tr 
                    key={user.id} 
                    className={`hover:bg-accent transition-all duration-300 ${
                      deletingUserId === user.id 
                        ? 'bg-orange-50 dark:bg-orange-950/20 border-l-4 border-orange-500 animate-pulse' 
                        : 'hover:shadow-md'
                    } ${selectedUsers.has(user.id) ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`} 
                    data-testid={`row-user-${user.id}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Checkbox
                        checked={selectedUsers.has(user.id)}
                        onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className={`${avatarColor} text-white font-medium`}>
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-foreground" data-testid={`text-name-${user.id}`}>
                            {fullName}
                          </div>
                          <div className="text-sm text-muted-foreground" data-testid={`text-email-${user.id}`}>
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge 
                        variant="secondary" 
                        className={user.gender === 'Male' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400'}
                        data-testid={`badge-gender-${user.id}`}
                      >
                        {user.gender}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground" data-testid={`text-room-${user.id}`}>
                      {user.roomNumber ? (
                        <>
                          {user.roomNumber}
                          {user.bedNumber && (
                            <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">
                              (Bed {user.bedNumber})
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-yellow-600 dark:text-yellow-400 text-xs">
                          {user.roomStatus === 'pending' ? '⏳ Pending' : 'Not assigned'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground" data-testid={`text-tag-${user.id}`}>
                      {user.tagNumber ? (
                        user.tagNumber
                      ) : (
                        <span className="text-yellow-600 dark:text-yellow-400 text-xs">
                          {user.tagStatus === 'pending' ? '⏳ Pending' : 'Not assigned'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-mono" data-testid={`text-nin-${user.id}`}>
                      {user.nin || 'Not provided'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground" data-testid={`text-state-${user.id}`}>
                      {user.stateOfOrigin}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground" data-testid={`text-phone-${user.id}`}>
                      {user.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewDetails(user)}
                          data-testid={`button-view-${user.id}`}
                          className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all duration-300 hover:scale-110"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(user)}
                          data-testid={`button-edit-${user.id}`}
                          className="text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20 transition-all duration-300 hover:scale-110"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={deletingUserId === user.id}
                              data-testid={`button-delete-${user.id}`}
                              className={`transition-all duration-300 hover:scale-110 ${
                                deletingUserId === user.id 
                                  ? 'text-orange-500 hover:text-orange-600' 
                                  : 'text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20'
                              }`}
                            >
                              {deletingUserId === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="max-w-lg bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-red-950/20 dark:via-orange-950/20 dark:to-yellow-950/20 border-2 border-red-200 dark:border-red-800 shadow-2xl">
                            <AlertDialogHeader>
                              <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-full shadow-lg animate-pulse">
                                  <AlertCircle className="h-8 w-8 text-white" />
                                </div>
                                <div>
                                  <AlertDialogTitle className="text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                                    ⚠️ Delete User Warning
                                  </AlertDialogTitle>
                                  <p className="text-sm text-red-600 dark:text-red-400 font-medium mt-1">
                                    This action is irreversible!
                                  </p>
                                </div>
                              </div>
                              
                              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl p-4 border border-red-200 dark:border-red-700">
                                <AlertDialogDescription className="text-base leading-relaxed">
                                  <div className="flex items-start gap-3 mb-3">
                                    <div className="p-1 bg-red-100 dark:bg-red-900/30 rounded-full mt-1">
                                      <UserIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                                    </div>
                                    <div>
                                      <span className="font-bold text-gray-900 dark:text-gray-100">User:</span>
                                      <span className="ml-2 font-semibold text-blue-600 dark:text-blue-400">{fullName}</span>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                                      <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                                      <span className="font-medium">All user data will be permanently deleted</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                      <span>Room and tag will be freed for reassignment</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                      <span>Admin statistics will be updated automatically</span>
                                    </div>
                                  </div>
                                  
                                  <div className="mt-4 p-3 bg-gradient-to-r from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 rounded-lg border border-red-300 dark:border-red-600">
                                    <div className="flex items-center gap-2 text-red-800 dark:text-red-200 font-bold">
                                      <AlertCircle className="h-4 w-4" />
                                      <span>This action cannot be undone!</span>
                                    </div>
                                  </div>
                                </AlertDialogDescription>
                              </div>
                            </AlertDialogHeader>
                            
                            {/* Enhanced Progress Display */}
                            {deletingUserId === user.id && (
                              <div className="space-y-4 py-6">
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                      {deleteStatus === 'processing' && (
                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                          <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
                                        </div>
                                      )}
                                      {deleteStatus === 'success' && (
                                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full animate-pulse">
                                          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                        </div>
                                      )}
                                      {deleteStatus === 'error' && (
                                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                                          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                        </div>
                                      )}
                                      <span className="font-semibold text-foreground">
                                        {deleteStatus === 'processing' && 'Deleting user...'}
                                        {deleteStatus === 'success' && 'User deleted successfully!'}
                                        {deleteStatus === 'error' && 'Delete failed'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Zap className="h-4 w-4 text-blue-500" />
                                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                        {Math.round(deleteProgress)}%
                                      </span>
                                    </div>
                                  </div>
                                  <Progress 
                                    value={deleteProgress} 
                                    className="h-3 bg-blue-100 dark:bg-blue-900/20"
                                  />
                                  <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                                    {deleteProgress < 30 && 'Preparing deletion...'}
                                    {deleteProgress >= 30 && deleteProgress < 60 && 'Freeing up room...'}
                                    {deleteProgress >= 60 && deleteProgress < 85 && 'Freeing up tag...'}
                                    {deleteProgress >= 85 && deleteProgress < 100 && 'Removing user record...'}
                                    {deleteProgress === 100 && 'Complete!'}
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            <AlertDialogFooter className="gap-3 pt-4">
                              <AlertDialogCancel 
                                disabled={deletingUserId === user.id}
                                className="border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800 transition-all duration-200 hover:scale-105"
                              >
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(user)}
                                disabled={deletingUserId === user.id}
                                className="bg-gradient-to-r from-red-500 via-red-600 to-red-700 hover:from-red-600 hover:via-red-700 hover:to-red-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-bold"
                              >
                                {deletingUserId === user.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Deleting...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete User
                                  </>
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 bg-muted border-t border-border flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, users.length)} of {users.length} results
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              
              <span className="flex items-center text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                data-testid="button-next-page"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
