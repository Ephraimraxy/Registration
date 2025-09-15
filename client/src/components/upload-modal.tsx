import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CloudUpload, X, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { parseRoomsExcel, parseTagsExcel } from "@/lib/excel-utils";
import { collection, addDoc, getDocs, query, where, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { UploadProgressPopup } from "./upload-progress-popup";

interface UploadModalProps {
  type: 'rooms' | 'tags';
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
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an Excel file (.xlsx or .xls)",
        variant: "destructive",
      });
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
        items = await parseRoomsExcel(file);
      } else {
        items = await parseTagsExcel(file);
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
        } else {
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
        }
      });
      
      const duplicateResults = await Promise.all(duplicateChecks);
      
      // Filter out existing items and show summary
      const newItems = duplicateResults.filter(result => !result.exists).map(result => result.item);
      existingItemsCount = duplicateResults.filter(result => result.exists).length;
      
      console.log(`Found ${existingItemsCount} existing ${type}, ${newItems.length} new ${type} to upload`);
      
      if (newItems.length === 0) {
        toast({
          title: "No New Items to Upload",
          description: `All ${type} in this file already exist in the system.`,
          variant: "destructive",
        });
        return;
      }
      
      // Update items to only include new ones
      items.length = 0;
      items.push(...newItems);
      setUploadProgress(50);
      setUploadStatus('uploading');
      
      // Upload in batches for better progress tracking
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
      
      setUploadProgress(100);
      setUploadStatus('success');
      
      toast({
        title: `${type === 'rooms' ? 'Rooms' : 'Tags'} Uploaded Successfully`,
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
              Upload {type === 'rooms' ? 'Rooms' : 'Tags'} Excel File
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-upload">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p id="upload-description" className="text-sm text-muted-foreground">
            Upload an Excel file to add {type === 'rooms' ? 'room data' : 'tag data'} to the system. 
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
                  {type === 'rooms' ? '🏠 Upload Room Data' : '🏷️ Upload Tag Data'}
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
              <Card className="border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 dark:border-green-700 dark:from-green-950/30 dark:to-emerald-950/30 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 text-green-700 dark:text-green-300">
                    <div className="p-2 rounded-full bg-gradient-to-br from-green-500 to-emerald-600">
                      <CheckCircle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <span className="font-bold text-lg">
                        🎉 Successfully uploaded {totalCount} {type}!
                      </span>
                      <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                        ✨ This window will close automatically in a few seconds.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error Message */}
            {uploadStatus === 'error' && (
              <Card className="border-2 border-red-300 bg-gradient-to-r from-red-50 to-pink-50 dark:border-red-700 dark:from-red-950/30 dark:to-pink-950/30 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 text-red-700 dark:text-red-300">
                    <div className="p-2 rounded-full bg-gradient-to-br from-red-500 to-pink-600">
                      <AlertCircle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <span className="font-bold text-lg">❌ Upload failed</span>
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        🔍 Please check the file format and try again.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        
        {/* Format Instructions */}
        {!isUploading && (
          <Card className="border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 dark:border-amber-800 dark:from-amber-950/20 dark:to-yellow-950/20">
            <CardContent className="p-6">
              <h4 className="font-bold text-lg text-amber-800 dark:text-amber-200 mb-4 flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                📋 Expected Format
              </h4>
              {type === 'rooms' ? (
                <div className="text-sm space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-amber-200 dark:border-amber-700">
                      <p className="font-bold text-amber-700 dark:text-amber-300 mb-2">📊 Columns:</p>
                      <p className="text-gray-700 dark:text-gray-300 font-mono">Wing, Room Number, Gender, Total Beds</p>
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-amber-200 dark:border-amber-700">
                      <p className="font-bold text-amber-700 dark:text-amber-300 mb-2">💡 Example:</p>
                      <p className="text-gray-700 dark:text-gray-300 font-mono">A, 254, female, 4</p>
                    </div>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl border border-blue-200 dark:border-blue-700">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>💡 Note:</strong> Wing can be any string (A, EVE, etc.), 
                      Room Number is just a number, Gender accepts male/female or Male/Female
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
