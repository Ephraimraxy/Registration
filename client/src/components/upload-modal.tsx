import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { CloudUpload, X, FileSpreadsheet } from "lucide-react";
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

    setIsUploading(true);
    try {
      if (type === 'rooms') {
        const rooms = await parseRoomsExcel(file);
        
        // Check for duplicate room numbers
        for (const room of rooms) {
          const existingRoomQuery = query(
            collection(db, "rooms"),
            where("roomNumber", "==", room.roomNumber)
          );
          const existingRoomSnapshot = await getDocs(existingRoomQuery);
          
          if (!existingRoomSnapshot.empty) {
            throw new Error(`Room ${room.roomNumber} already exists`);
          }
        }
        
        // Use batch write for atomic operation
        const batch = writeBatch(db);
        rooms.forEach(room => {
          const roomRef = doc(collection(db, "rooms"));
          batch.set(roomRef, room);
        });
        await batch.commit();
        
        toast({
          title: "Rooms Uploaded Successfully",
          description: `${rooms.length} rooms have been added to the system.`,
        });
      } else {
        const tags = await parseTagsExcel(file);
        
        // Check for duplicate tag numbers
        for (const tag of tags) {
          const existingTagQuery = query(
            collection(db, "tags"),
            where("tagNumber", "==", tag.tagNumber)
          );
          const existingTagSnapshot = await getDocs(existingTagQuery);
          
          if (!existingTagSnapshot.empty) {
            throw new Error(`Tag ${tag.tagNumber} already exists`);
          }
        }
        
        // Use batch write for atomic operation
        const batch = writeBatch(db);
        tags.forEach(tag => {
          const tagRef = doc(collection(db, "tags"));
          batch.set(tagRef, tag);
        });
        await batch.commit();
        
        toast({
          title: "Tags Uploaded Successfully",
          description: `${tags.length} tags have been added to the system.`,
        });
      }
      
      onClose();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload file. Please check the format and try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Upload {type === 'rooms' ? 'Rooms' : 'Tags'} Excel File</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-upload">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? 'border-primary bg-primary/5' : 'border-border'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          data-testid="dropzone-upload"
        >
          <CloudUpload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">Drag and drop your Excel file here</p>
          <p className="text-sm text-muted-foreground mb-4">or</p>
          <Button 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            data-testid="button-browse-files"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Browse Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileInput}
            className="hidden"
            data-testid="input-file-upload"
          />
        </div>
        
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium text-foreground mb-2">Expected Format:</h4>
            {type === 'rooms' ? (
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Columns:</strong> Wing, Room Number, Gender, Total Beds</p>
                <p><strong>Example:</strong> A, 254, female, 4</p>
                <p><strong>Note:</strong> Wing can be any string (A, EVE, etc.), Room Number is just a number, Gender accepts male/female or Male/Female</p>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Columns:</strong> Tag Number</p>
                <p><strong>Example:</strong> TAG-001</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="flex space-x-3">
          <Button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isUploading}
            className="flex-1"
            data-testid="button-upload-process"
          >
            <CloudUpload className="mr-2 h-4 w-4" />
            {isUploading ? "Processing..." : "Upload & Process"}
          </Button>
          <Button 
            variant="secondary" 
            onClick={onClose}
            disabled={isUploading}
            className="flex-1"
            data-testid="button-cancel-upload"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
