import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CloudUpload, X, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { parseRoomsExcel, parseRoomsExcelRangeFormat, parseTagsExcel, parseUsersExcel } from "@/lib/excel-utils";
import { collection, addDoc, getDocs, query, where, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { UploadProgressPopup } from "./upload-progress-popup";
import { flexibleAssignRoomAndTag } from "@/lib/flexible-registration-utils";

interface UploadModalProps {
  type: 'rooms' | 'tags' | 'users';
  onClose: () => void;
}

export function UploadModal({ type, onClose }: UploadModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'parsing' | 'validating' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadedCount, setUploadedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [showProgressPopup, setShowProgressPopup] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [roomFormat, setRoomFormat] = useState<'standard' | 'range' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (type === 'rooms') {
        setCurrentFile(file);
        setRoomFormat(null); // Reset format to show selection
      } else {
        processFile(file);
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (type === 'rooms') {
        setCurrentFile(file);
        setRoomFormat(null); // Reset format to show selection
      } else {
        processFile(file);
      }
    }
  };

  const processFile = async (file: File, selectedFormat?: 'standard' | 'range') => {
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an Excel file (.xlsx or .xls)",
        variant: "destructive",
      });
      return;
    }

    // For rooms, check if format selection is needed
    if (type === 'rooms' && !selectedFormat && roomFormat === null) {
      setCurrentFile(file);
      setRoomFormat(null); // Will trigger format selection dialog
      return;
    }

    setCurrentFile(file);
    setIsUploading(true);
    setUploadStatus('parsing');
    setUploadProgress(10);
    setUploadedCount(0);
    setTotalCount(0);
    setUploadError('');
    setShowProgressPopup(true);

    try {
      let items: any[] = [];
      let existingItemsCount = 0;
      
      // Parse Excel file
      if (type === 'rooms') {
        const format = selectedFormat || roomFormat || 'standard';
        if (format === 'range') {
          items = await parseRoomsExcelRangeFormat(file);
        } else {
          items = await parseRoomsExcel(file);
        }
      } else if (type === 'tags') {
        items = await parseTagsExcel(file);
      } else {
        items = await parseUsersExcel(file);
      }
      
      setTotalCount(items.length);
      setUploadProgress(30);
      setUploadStatus('validating');
      
      // Check for duplicates and filter out existing items
      const duplicateChecks = items.map(async (item, index) => {
        const progress = 30 + (index / items.length) * 20;
        setUploadProgress(progress);
        
        if (type === 'rooms') {
          const existingRoomQuery = query(
            collection(db, "rooms"),
            where("roomNumber", "==", item.roomNumber)
          );
          const existingRoomSnapshot = await getDocs(existingRoomQuery);
          
          return {
            item,
            exists: !existingRoomSnapshot.empty,
            existingData: existingRoomSnapshot.empty ? null : existingRoomSnapshot.docs[0].data()
          };
        } else if (type === 'tags') {
          const existingTagQuery = query(
            collection(db, "tags"),
            where("tagNumber", "==", item.tagNumber)
          );
          const existingTagSnapshot = await getDocs(existingTagQuery);
          
          return {
            item,
            exists: !existingTagSnapshot.empty,
            existingData: existingTagSnapshot.empty ? null : existingTagSnapshot.docs[0].data()
          };
        } else {
          // For users, check by email if provided, otherwise check by phone + name combination
          let exists = false;
          let existingData = null;
          
          if (item.email) {
            const existingUserQuery = query(
              collection(db, "users"),
              where("email", "==", item.email)
            );
            const existingUserSnapshot = await getDocs(existingUserQuery);
            exists = !existingUserSnapshot.empty;
            if (exists) {
              existingData = existingUserSnapshot.docs[0].data();
            }
          } else {
            // If no email, check by phone + firstName + surname combination
            const existingUserQuery = query(
              collection(db, "users"),
              where("phone", "==", item.phone)
            );
            const existingUserSnapshot = await getDocs(existingUserQuery);
            const matchingUsers = existingUserSnapshot.docs.filter(doc => {
              const data = doc.data();
              return data.firstName === item.firstName && data.surname === item.surname;
            });
            exists = matchingUsers.length > 0;
            if (exists) {
              existingData = matchingUsers[0].data();
            }
          }
          
          return {
            item,
            exists,
            existingData
          };
        }
      });
      
      const duplicateResults = await Promise.all(duplicateChecks);
      
      // Filter out existing items and show summary
      const newItems = duplicateResults.filter(result => !result.exists).map(result => result.item);
      const existingItems = duplicateResults.filter(result => result.exists);
      existingItemsCount = existingItems.length;
      
      console.log(`Found ${existingItemsCount} existing ${type}, ${newItems.length} new ${type} to upload`);
      
      // Show detailed summary if there are existing items
      if (existingItemsCount > 0 && newItems.length > 0) {
        const existingNumbers = existingItems.map(result => {
          if (type === 'rooms') return (result.item as any).roomNumber;
          if (type === 'tags') return (result.item as any).tagNumber;
          return 'N/A';
        }).join(', ');
        
        toast({
          title: "Partial Upload",
          description: `Found ${existingItemsCount} existing ${type} (skipped). Will upload ${newItems.length} new ${type}.`,
          variant: "default",
        });
      }
      
      if (newItems.length === 0) {
        toast({
          title: "No New Items to Upload",
          description: `All ${type} in this file already exist in the system. Existing items are not updated - only new ones are added.`,
          variant: "destructive",
        });
        return;
      }
      
      // Update items to only include new ones
      items.length = 0;
      items.push(...newItems);
      setUploadProgress(50);
      setUploadStatus('uploading');
      
      if (type === 'users') {
        // For users, we need to process them individually to assign rooms/tags
        for (let i = 0; i < items.length; i++) {
          const userData = items[i];
          
          // Look up room ID if room number is specified
          if (userData.selectedRoomNumber) {
            const roomQuery = query(
              collection(db, "rooms"),
              where("roomNumber", "==", userData.selectedRoomNumber)
            );
            const roomSnapshot = await getDocs(roomQuery);
            if (!roomSnapshot.empty) {
              userData.selectedRoomId = roomSnapshot.docs[0].id;
            } else {
              console.warn(`Room number ${userData.selectedRoomNumber} not found for user ${userData.email}`);
              delete userData.selectedRoomNumber;
            }
          }
          
          // Look up tag ID if tag number is specified
          if (userData.selectedTagNumber) {
            const tagQuery = query(
              collection(db, "tags"),
              where("tagNumber", "==", userData.selectedTagNumber)
            );
            const tagSnapshot = await getDocs(tagQuery);
            if (!tagSnapshot.empty) {
              userData.selectedTagId = tagSnapshot.docs[0].id;
            } else {
              console.warn(`Tag number ${userData.selectedTagNumber} not found for user ${userData.email}`);
              delete userData.selectedTagNumber;
            }
          }
          
          // Remove the temporary fields
          delete userData.selectedRoomNumber;
          delete userData.selectedTagNumber;
          
          // Use flexibleAssignRoomAndTag to create user with room/tag assignment
          try {
            const result = await flexibleAssignRoomAndTag(userData);
            if (result.success) {
              setUploadedCount(i + 1);
              const progress = 50 + ((i + 1) / items.length) * 40;
              setUploadProgress(progress);
            } else {
              console.error(`Failed to register user ${userData.email}:`, result.error);
            }
          } catch (error: any) {
            console.error(`Error registering user ${userData.email}:`, error);
          }
        }
      } else {
        // For rooms and tags, upload in batches
        const batchSize = 10;
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
          batches.push(items.slice(i, i + batchSize));
        }
        
        for (let i = 0; i < batches.length; i++) {
          const batch = writeBatch(db);
          const currentBatch = batches[i];
          
          currentBatch.forEach(item => {
            const itemRef = doc(collection(db, type));
            batch.set(itemRef, item);
          });
          
          await batch.commit();
          
          const uploaded = (i + 1) * batchSize;
          const actualUploaded = Math.min(uploaded, items.length);
          setUploadedCount(actualUploaded);
          
          const progress = 50 + ((i + 1) / batches.length) * 40;
          setUploadProgress(progress);
        }
      }
      
      setUploadProgress(100);
      setUploadStatus('success');
      
      toast({
        title: `${type === 'rooms' ? 'Rooms' : type === 'tags' ? 'Tags' : 'Users'} Uploaded Successfully`,
        description: `${items.length} new ${type} added to the system. ${existingItemsCount} ${type} were already existing.`,
      });
      
      // Auto close after success
      setTimeout(() => {
      onClose();
      }, 2000);
      
    } catch (error: any) {
      console.error("Upload error:", error);
      setUploadStatus('error');
      setUploadError(error.message || "Failed to upload file. Please check the format and try again.");
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload file. Please check the format and try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'parsing':
      case 'validating':
      case 'uploading':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <CloudUpload className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (uploadStatus) {
      case 'parsing':
        return 'Parsing Excel file...';
      case 'validating':
        return 'Validating data...';
      case 'uploading':
        return 'Uploading to database...';
      case 'success':
        return 'Upload completed successfully!';
      case 'error':
        return 'Upload failed';
      default:
        return 'Ready to upload';
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" aria-describedby="upload-description">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Upload {type === 'rooms' ? 'Rooms' : type === 'tags' ? 'Tags' : 'Users'} Excel File
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-upload">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p id="upload-description" className="text-sm text-muted-foreground">
            Upload an Excel file to add {type === 'rooms' ? 'room data' : type === 'tags' ? 'tag data' : 'user registrations'} to the system. 
            The file will be validated and processed automatically.
          </p>
        </DialogHeader>
        
        {/* File Upload Area */}
        {!isUploading && (
          <div
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
              dragActive 
                ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 scale-[1.02] shadow-lg' 
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gradient-to-br hover:from-blue-50/50 hover:to-indigo-50/50 dark:hover:from-blue-950/10 dark:hover:to-indigo-950/10 hover:shadow-md'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          data-testid="dropzone-upload"
        >
            <div className="flex flex-col items-center space-y-6">
              <div className={`p-6 rounded-full transition-all duration-300 ${
                dragActive 
                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg scale-110' 
                  : 'bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30'
              }`}>
                <CloudUpload className={`h-10 w-10 transition-colors duration-300 ${
                  dragActive ? 'text-white' : 'text-blue-600 dark:text-blue-400'
                }`} />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {type === 'rooms' ? '🏠 Upload Room Data' : type === 'tags' ? '🏷️ Upload Tag Data' : '👥 Upload User Data'}
                </h3>
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                  Drop your Excel file here
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  or click the button below to browse files
                </p>
          <Button 
            onClick={() => fileInputRef.current?.click()}
            data-testid="button-browse-files"
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
                  <FileSpreadsheet className="mr-2 h-5 w-5" />
                  Choose Excel File
          </Button>
              </div>
            </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileInput}
            className="hidden"
            data-testid="input-file-upload"
          />
        </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-6">
            {/* File Info */}
            {currentFile && (
              <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:border-blue-800 dark:from-blue-950/20 dark:to-indigo-950/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600">
                      <FileSpreadsheet className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-lg text-gray-800 dark:text-gray-200">{currentFile.name}</p>
                      <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                        📊 {(currentFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Progress Section */}
            <div className="space-y-6 p-6 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-900/50 dark:to-blue-950/20 rounded-2xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon()}
                  <span className="font-bold text-lg text-gray-800 dark:text-gray-200">{getStatusText()}</span>
                </div>
                {totalCount > 0 && (
                  <Badge className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm">
                    📈 {uploadedCount} / {totalCount}
                  </Badge>
                )}
              </div>
              
              <div className="space-y-3">
                <Progress value={uploadProgress} className="h-3 bg-gray-200 dark:bg-gray-700" />
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-blue-600 dark:text-blue-400">
                    🎯 {Math.round(uploadProgress)}% complete
                  </span>
                  {totalCount > 0 && (
                    <span className="text-indigo-600 dark:text-indigo-400">
                      ⚡ {uploadedCount} of {totalCount} {type} processed
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Success Message */}
            {uploadStatus === 'success' && (
              <Card className="border-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 text-white">
                    <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm">
                      <CheckCircle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <span className="font-bold text-lg">
                        🎉 Successfully uploaded {totalCount} {type}!
                      </span>
                      <p className="text-sm text-white/90 mt-1">
                        ✨ This window will close automatically in a few seconds.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error Message */}
            {uploadStatus === 'error' && (
              <Card className="border-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 text-white">
                    <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm">
                      <AlertCircle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <span className="font-bold text-lg">❌ Upload failed</span>
                      <p className="text-sm text-white/90 mt-1">
                        🔍 Please check the file format and try again.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        
        {/* Format Selection Dialog for Rooms */}
        {type === 'rooms' && currentFile && roomFormat === null && !isUploading && (
          <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 dark:border-purple-800 dark:from-purple-950/20 dark:to-pink-950/20">
            <CardContent className="p-6">
              <h4 className="font-bold text-lg mb-4 text-gray-900 dark:text-gray-100">
                Select Room Import Format
              </h4>
              <div className="space-y-3">
                <Button
                  onClick={() => {
                    setRoomFormat('standard');
                    processFile(currentFile, 'standard');
                  }}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
                >
                  Standard Format
                </Button>
                <p className="text-xs text-muted-foreground">
                  Columns: Wing, Room Number, Gender, Total Beds, Bed Numbers (optional)
                </p>
                <Button
                  onClick={() => {
                    setRoomFormat('range');
                    processFile(currentFile, 'range');
                  }}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white"
                >
                  Range Format
                </Button>
                <p className="text-xs text-muted-foreground">
                  Columns: Room Range (e.g., RA1-RA64), Gender, Beds Per Room, Wing (optional)
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Format Instructions */}
        {!isUploading && roomFormat !== null && (
          <Card className="border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 dark:border-amber-800 dark:from-amber-950/20 dark:to-yellow-950/20">
            <CardContent className="p-6">
              <h4 className="font-bold text-lg text-amber-800 dark:text-amber-200 mb-4 flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                📋 Expected Format
              </h4>
              {type === 'rooms' ? (
                <div className="text-sm space-y-4">
                  {roomFormat === 'range' ? (
                    <>
                      <p className="font-semibold text-amber-800 dark:text-amber-200">Range Format:</p>
                      <ul className="list-disc list-inside space-y-2 text-amber-700 dark:text-amber-300">
                        <li><strong>Room Range</strong> (required): e.g., "RA1-RA64", "201-234", "D&D 120"</li>
                        <li><strong>Gender</strong> (required): "Male" or "Female"</li>
                        <li><strong>Beds Per Room</strong> (required): Number of beds in each room (e.g., 1, 3, 4)</li>
                        <li><strong>Wing</strong> (optional): Wing designation (e.g., "RA", "RE", "A", "B")</li>
                      </ul>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                        💡 Ranges will be automatically expanded into individual rooms. Example: "RA1-RA64" with 1 bed per room creates 64 rooms (RA1, RA2, ..., RA64).
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-amber-800 dark:text-amber-200">Standard Format:</p>
                      <ul className="list-disc list-inside space-y-2 text-amber-700 dark:text-amber-300">
                        <li><strong>Wing</strong> (required): Room wing designation</li>
                        <li><strong>Room Number</strong> (required): Room number</li>
                        <li><strong>Gender</strong> (required): "Male" or "Female"</li>
                        <li><strong>Total Beds</strong> (required): Number of beds in the room</li>
                        <li><strong>Bed Numbers</strong> (optional): Comma-separated bed numbers or "RESERVED" for VIP rooms</li>
                      </ul>
                    </>
                  )}
                </div>
              ) : type === 'users' ? (
                <div className="text-sm space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-amber-200 dark:border-amber-700">
                      <p className="font-bold text-amber-700 dark:text-amber-300 mb-2">📊 Required Columns:</p>
                      <p className="text-gray-700 dark:text-gray-300 font-mono text-xs">
                        First Name, Surname, Date of Birth, Gender, Phone, State of Origin, LGA
                      </p>
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-amber-200 dark:border-amber-700">
                      <p className="font-bold text-amber-700 dark:text-amber-300 mb-2">📊 Optional Columns:</p>
                      <p className="text-gray-700 dark:text-gray-300 font-mono text-xs">
                        Middle Name, Email, NIN, Room Number, Tag Number, VIP
                      </p>
                    </div>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl border border-blue-200 dark:border-blue-700">
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                      <strong>💡 Note:</strong> All required fields must be filled. Phone must be at least 10 digits. Email and NIN are optional.
                    </p>
                    <p className="text-sm text-purple-700 dark:text-purple-300 mb-2">
                      <strong>🏠 Room/Tag Assignment:</strong> If Room Number or Tag Number is specified, the system will try to assign them. Otherwise, rooms and tags will be assigned automatically or marked as pending.
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      <strong>👑 VIP Status:</strong> Set VIP column to "true", "yes", "1", or "vip" for VIP users (they get priority for VIP rooms).
                    </p>
                  </div>
                </div>
              ) : type === 'rooms' ? (
                <div className="text-sm space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-amber-200 dark:border-amber-700">
                      <p className="font-bold text-amber-700 dark:text-amber-300 mb-2">📊 Columns:</p>
                      <p className="text-gray-700 dark:text-gray-300 font-mono">Wing, Room Number, Gender, Total Beds</p>
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-amber-200 dark:border-amber-700">
                      <p className="font-bold text-amber-700 dark:text-amber-300 mb-2">💡 Examples:</p>
                      <p className="text-gray-700 dark:text-gray-300 font-mono mb-1">Regular: A, 254, female, 4</p>
                      <p className="text-purple-700 dark:text-purple-300 font-mono">VIP: B, 101, male, 2, RESERVED</p>
                    </div>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl border border-blue-200 dark:border-blue-700">
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                      <strong>💡 Note:</strong> Wing can be any string (A, EVE, etc.), 
                      Room Number is just a number, Gender accepts male/female or Male/Female
                    </p>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      <strong>👑 VIP Rooms:</strong> Use "RESERVED" in Bed Numbers column for VIP rooms (1-2 beds only)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-sm space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-amber-200 dark:border-amber-700">
                      <p className="font-bold text-amber-700 dark:text-amber-300 mb-2">📊 Columns:</p>
                      <p className="text-gray-700 dark:text-gray-300 font-mono">Tag Number</p>
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-amber-200 dark:border-amber-700">
                      <p className="font-bold text-amber-700 dark:text-amber-300 mb-2">💡 Example:</p>
                      <p className="text-gray-700 dark:text-gray-300 font-mono">TAG-001</p>
                    </div>
                  </div>
              </div>
            )}
          </CardContent>
        </Card>
        )}
        
        {/* Action Buttons */}
        <div className="flex space-x-4">
          {!isUploading ? (
            <>
          <Button 
            onClick={() => fileInputRef.current?.click()} 
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            data-testid="button-upload-process"
          >
                <CloudUpload className="mr-2 h-5 w-5" />
                🚀 Upload & Process
          </Button>
          <Button 
            variant="secondary" 
            onClick={onClose}
                className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            data-testid="button-cancel-upload"
          >
                ❌ Cancel
              </Button>
            </>
          ) : (
            <Button 
              variant="secondary" 
              onClick={onClose}
              disabled={uploadStatus === 'success'}
              className="w-full bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
              data-testid="button-close-upload"
            >
              {uploadStatus === 'success' ? '✨ Closing...' : '❌ Cancel Upload'}
          </Button>
          )}
        </div>
      </DialogContent>
      
      {/* Upload Progress Popup */}
      <UploadProgressPopup
        isOpen={showProgressPopup}
        onClose={() => setShowProgressPopup(false)}
        progress={uploadProgress}
        status={uploadStatus}
        uploadedCount={uploadedCount}
        totalCount={totalCount}
        currentFile={currentFile}
        type={type}
        error={uploadError}
      />
    </Dialog>
  );
}
