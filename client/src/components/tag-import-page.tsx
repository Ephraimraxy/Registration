import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Tag, Users } from "lucide-react";
import { parseTagsExcel } from "@/lib/excel-utils";
import { addTag } from "@/lib/db-init";
import { useToast } from "@/hooks/use-toast";
import { Tag as TagType } from "@shared/schema";

export function TagImportPage() {
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
      const tags = await parseTagsExcel(file);
      setProgress(25);
      setStatus(`Found ${tags.length} tags to process...`);

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < tags.length; i++) {
        const tag = tags[i];
        setProgress(25 + (i / tags.length) * 75);
        setStatus(`Processing tag ${i + 1} of ${tags.length}: ${tag.tagNumber}`);

        try {
          await addTag(tag);
          successCount++;
        } catch (error) {
          errorCount++;
          errors.push(`Tag ${tag.tagNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      setProgress(100);
      setStatus("Upload completed!");
      
      setResults({
        total: tags.length,
        success: successCount,
        errors,
      });

      toast({
        title: "Upload completed",
        description: `Successfully uploaded ${successCount} tags. ${errorCount} errors occurred.`,
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 dark:from-gray-900 dark:via-purple-950 dark:to-pink-950 p-4">
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
            <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg">
              <Tag className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Tag Import
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Upload tag data from Excel files
              </p>
            </div>
          </div>
        </div>

        {/* Format Instructions */}
        <Card className="mb-8 border-2 border-purple-200 dark:border-purple-700 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30">
            <CardTitle className="flex items-center gap-2 text-purple-800 dark:text-purple-200">
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
                    <Badge variant="outline" className="font-mono">Tag Number</Badge>
                    <span>Unique tag identifier (001, 002, etc.)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">Description</Badge>
                    <span>Tag description or purpose</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Optional Columns:</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">Color</Badge>
                    <span>Tag color (red, blue, green, etc.)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">Priority</Badge>
                    <span>Priority level (high, medium, low)</span>
                  </div>
                </div>
              </div>
            </div>
            
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
              <Tag className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700 dark:text-blue-300">
                <strong>Tag Numbers:</strong> Should be sequential (001, 002, 003...) for proper assignment order
              </AlertDescription>
            </Alert>

            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <p className="font-bold text-amber-700 dark:text-amber-300 mb-2">💡 Example:</p>
              <p className="text-gray-700 dark:text-gray-300 font-mono">001, Student Tag, blue, high</p>
            </div>
          </CardContent>
        </Card>

        {/* Upload Section */}
        <Card className="mb-8 border-2 border-green-200 dark:border-green-700 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30">
            <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <Upload className="h-6 w-6" />
              Upload Tag Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="tag-file" className="text-lg font-semibold">
                Select Excel File
              </Label>
              <Input
                id="tag-file"
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
                  <span>Upload Tags</span>
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
                    Total Tags
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
