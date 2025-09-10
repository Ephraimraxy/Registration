import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Edit, Trash2, ChevronLeft, ChevronRight, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { User } from "@shared/schema";
import { doc, deleteDoc, updateDoc, query, where, collection, getDocs, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

interface StudentTableProps {
  users: User[];
  onEdit: (user: User) => void;
}

const ITEMS_PER_PAGE = 10;

export function StudentTable({ users, onEdit }: StudentTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  const totalPages = Math.ceil(users.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentUsers = users.slice(startIndex, endIndex);

  const handleDelete = async (user: User) => {
    if (!user.id) return;
    
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
          setDeleteProgress(60);
        }

        // Free up the tag
        if (user.tagNumber) {
          setDeleteProgress(70);
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
          setDeleteProgress(85);
        }

        // Delete the user
        setDeleteProgress(90);
        transaction.delete(doc(db, "users", user.id));
        setDeleteProgress(100);
      });
      
      setDeleteStatus('success');
      toast({
        title: "User Deleted",
        description: "User record has been deleted successfully.",
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
        title: "Delete Failed",
        description: error.message || "Failed to delete user. Please try again.",
        variant: "destructive",
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
        <CardTitle>Registered Students</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
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
                  <tr key={user.id} className="hover:bg-accent transition-colors" data-testid={`row-user-${user.id}`}>
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
                      {user.roomNumber || 'Not assigned'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground" data-testid={`text-tag-${user.id}`}>
                      {user.tagNumber || 'Not assigned'}
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
                          onClick={() => onEdit(user)}
                          data-testid={`button-edit-${user.id}`}
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
                            >
                              {deletingUserId === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {fullName}? This action cannot be undone.
                                The user's room and tag will be made available for reassignment.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            
                            {/* Progress Display */}
                            {deletingUserId === user.id && (
                              <div className="space-y-3 py-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {deleteStatus === 'processing' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                                    {deleteStatus === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                                    {deleteStatus === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                                    <span className="text-sm font-medium">
                                      {deleteStatus === 'processing' && 'Deleting user...'}
                                      {deleteStatus === 'success' && 'User deleted successfully!'}
                                      {deleteStatus === 'error' && 'Delete failed'}
                                    </span>
                                  </div>
                                  <span className="text-sm text-muted-foreground">
                                    {Math.round(deleteProgress)}%
                                  </span>
                                </div>
                                <Progress value={deleteProgress} className="h-2" />
                              </div>
                            )}
                            
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={deletingUserId === user.id}>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(user)}
                                disabled={deletingUserId === user.id}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {deletingUserId === user.id ? (
                                  <div className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Deleting...
                                  </div>
                                ) : (
                                  'Delete'
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
