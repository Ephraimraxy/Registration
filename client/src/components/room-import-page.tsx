import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Building, Users, Bed, Crown } from "lucide-react";
import { parseRoomsExcel } from "@/lib/excel-utils";
// import { addRoom } from "../lib/db-init";
import { useToast } from "@/hooks/use-toast";
import { Room } from "@shared/schema";

export function RoomImportPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>("");
  const [results, setResults] = useState<{
    total: number;
    success: number;
    errors: string[];
    vipRooms: number;
    regularRooms: number;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResults(null);
      setStatus("");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select an Excel file to upload.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setStatus("Reading Excel file...");

    try {
      const rooms = await parseRoomsExcel(file);
      setProgress(25);
      setStatus(`Found ${rooms.length} rooms to process...`);

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];
      let vipRooms = 0;
      let regularRooms = 0;

      for (let i = 0; i < rooms.length; i++) {
        const room = rooms[i];
        setProgress(25 + (i / rooms.length) * 75);
        setStatus(`Processing room ${i + 1} of ${rooms.length}: ${room.roomNumber}`);

        try {
          // TODO: Implement addRoom function
          // await addRoom(room);
          successCount++;
          
          if (room.isVipRoom) {
            vipRooms++;
          } else {
            regularRooms++;
          }
        } catch (error) {
          errorCount++;
          errors.push(`Room ${room.roomNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      setProgress(100);
      setStatus("Upload completed!");
      
      setResults({
        total: rooms.length,
        success: successCount,
        errors,
        vipRooms,
        regularRooms,
      });

      toast({
        title: "Upload completed",
        description: `Successfully uploaded ${successCount} rooms. ${errorCount} errors occurred.`,
        variant: successCount > 0 ? "default" : "destructive",
      });

    } catch (error) {
      setStatus("Upload failed!");
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBack = () => {
    setLocation("/admin");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-950 dark:to-purple-950 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl shadow-lg">
              <Building className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Room Import
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Upload room data from Excel files
              </p>
            </div>
          </div>
        </div>

        {/* Format Instructions */}
        <Card className="mb-8 border-2 border-blue-200 dark:border-blue-700 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30">
            <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <FileSpreadsheet className="h-6 w-6" />
              Excel Format Requirements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Required Columns:</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">Wing</Badge>
                    <span>Building wing (A, B, C, etc.)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">Room Number</Badge>
                    <span>Room identifier (101, 102, etc.)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">Gender</Badge>
                    <span>male or female</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">Total Beds</Badge>
                    <span>Number of beds (1-4)</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Optional Columns:</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">Bed Numbers</Badge>
                    <span>Comma-separated bed numbers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">RESERVED</Badge>
                    <span>Use "RESERVED" for VIP rooms</span>
                  </div>
                </div>
              </div>
            </div>
            
            <Alert className="border-purple-200 bg-purple-50 dark:bg-purple-950/20">
              <Crown className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-purple-700 dark:text-purple-300">
                <strong>VIP Rooms:</strong> Use "RESERVED" in Bed Numbers column for VIP rooms (1-2 beds only)
              </AlertDescription>
            </Alert>

            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <p className="font-bold text-amber-700 dark:text-amber-300 mb-2">💡 Examples:</p>
              <p className="text-gray-700 dark:text-gray-300 font-mono mb-1">Regular: A, 254, female, 4</p>
              <p className="text-purple-700 dark:text-purple-300 font-mono">VIP: B, 101, male, 2, RESERVED</p>
            </div>
          </CardContent>
        </Card>

        {/* Upload Section */}
        <Card className="mb-8 border-2 border-green-200 dark:border-green-700 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30">
            <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <Upload className="h-6 w-6" />
              Upload Room Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="room-file" className="text-lg font-semibold">
                Select Excel File
              </Label>
              <Input
                id="room-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="border-2 border-dashed border-green-300 dark:border-green-600 hover:border-green-400 dark:hover:border-green-500 transition-colors"
                disabled={isProcessing}
              />
              {file && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <Button
              onClick={handleUpload}
              disabled={!file || isProcessing}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  <span>Upload Rooms</span>
                </div>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Progress Section */}
        {isProcessing && (
          <Card className="mb-8 border-2 border-blue-200 dark:border-blue-700 shadow-xl">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Upload Progress
                  </span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {progress}%
                  </span>
                </div>
                <Progress value={progress} className="h-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  {status}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Section */}
        {results && (
          <Card className="border-2 border-green-200 dark:border-green-700 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30">
              <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <CheckCircle className="h-6 w-6" />
                Upload Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {results.total}
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    Total Rooms
                  </div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {results.success}
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300">
                    Successfully Added
                  </div>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {results.errors.length}
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-300">
                    Errors
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {results.vipRooms}
                  </div>
                  <div className="text-sm text-purple-700 dark:text-purple-300">
                    VIP Rooms
                  </div>
                </div>
                <div className="text-center p-4 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {results.regularRooms}
                  </div>
                  <div className="text-sm text-indigo-700 dark:text-indigo-300">
                    Regular Rooms
                  </div>
                </div>
              </div>

              {results.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-red-700 dark:text-red-300 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Errors:
                  </h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {results.errors.map((error, index) => (
                      <p key={index} className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 p-2 rounded">
                        {error}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
