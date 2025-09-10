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

    try {
      let items: any[] = [];
      
      // Parse Excel file
      if (type === 'rooms') {
        items = await parseRoomsExcel(file);
      } else {
        items = await parseTagsExcel(file);
      }
      
      setTotalCount(items.length);
      setUploadProgress(30);
      setUploadStatus('validating');
      
      // Check for duplicates
      const duplicateChecks = items.map(async (item, index) => {
        const progress = 30 + (index / items.length) * 20;
        setUploadProgress(progress);
        
        if (type === 'rooms') {
          const existingRoomQuery = query(
            collection(db, "rooms"),
            where("roomNumber", "==", item.roomNumber)
          );
          const existingRoomSnapshot = await getDocs(existingRoomQuery);
          
          if (!existingRoomSnapshot.empty) {
            throw new Error(`Room ${item.roomNumber} already exists`);
          }
        } else {
          const existingTagQuery = query(
            collection(db, "tags"),
            where("tagNumber", "==", item.tagNumber)
          );
          const existingTagSnapshot = await getDocs(existingTagQuery);
          
          if (!existingTagSnapshot.empty) {
            throw new Error(`Tag ${item.tagNumber} already exists`);
          }
        }
      });
      
      await Promise.all(duplicateChecks);
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
        description: `${items.length} ${type} have been added to the system.`,
      });
      
      // Auto close after success
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (error: any) {
      console.error("Upload error:", error);
      setUploadStatus('error');
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
      <DialogContent className="max-w-lg">
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
        </DialogHeader>
        
        {/* File Upload Area */}
        {!isUploading && (
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
              dragActive 
                ? 'border-primary bg-primary/5 scale-[1.02]' 
                : 'border-border hover:border-primary/50 hover:bg-primary/2'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            data-testid="dropzone-upload"
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 rounded-full bg-primary/10">
                <CloudUpload className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-lg font-medium text-foreground mb-1">
                  Drop your Excel file here
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  or click to browse files
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-browse-files"
                  className="px-6"
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Choose File
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
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-8 w-8 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{currentFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(currentFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Progress Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon()}
                  <span className="font-medium text-foreground">{getStatusText()}</span>
                </div>
                {totalCount > 0 && (
                  <Badge variant="secondary" className="px-3 py-1">
                    {uploadedCount} / {totalCount}
                  </Badge>
                )}
              </div>
              
              <Progress value={uploadProgress} className="h-2" />
              
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{Math.round(uploadProgress)}% complete</span>
                {totalCount > 0 && (
                  <span>{uploadedCount} of {totalCount} {type} processed</span>
                )}
              </div>
            </div>

            {/* Success Message */}
            {uploadStatus === 'success' && (
              <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">
                      Successfully uploaded {totalCount} {type}!
                    </span>
                  </div>
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                    This window will close automatically in a few seconds.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Error Message */}
            {uploadStatus === 'error' && (
              <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">Upload failed</span>
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    Please check the file format and try again.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        
        {/* Format Instructions */}
        {!isUploading && (
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Expected Format
              </h4>
              {type === 'rooms' ? (
                <div className="text-sm text-muted-foreground space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium text-foreground">Columns:</p>
                      <p>Wing, Room Number, Gender, Total Beds</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Example:</p>
                      <p>A, 254, female, 4</p>
                    </div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs">
                      <strong>Note:</strong> Wing can be any string (A, EVE, etc.), 
                      Room Number is just a number, Gender accepts male/female or Male/Female
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium text-foreground">Columns:</p>
                      <p>Tag Number</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Example:</p>
                      <p>TAG-001</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Action Buttons */}
        <div className="flex space-x-3">
          {!isUploading ? (
            <>
              <Button 
                onClick={() => fileInputRef.current?.click()} 
                className="flex-1"
                data-testid="button-upload-process"
              >
                <CloudUpload className="mr-2 h-4 w-4" />
                Upload & Process
              </Button>
              <Button 
                variant="secondary" 
                onClick={onClose}
                className="flex-1"
                data-testid="button-cancel-upload"
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button 
              variant="secondary" 
              onClick={onClose}
              disabled={uploadStatus === 'success'}
              className="w-full"
              data-testid="button-close-upload"
            >
              {uploadStatus === 'success' ? 'Closing...' : 'Cancel Upload'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
