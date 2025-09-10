import React from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  FileSpreadsheet, 
  Upload, 
  Database,
  Zap,
  TrendingUp
} from "lucide-react";

interface UploadProgressPopupProps {
  isOpen: boolean;
  onClose: () => void;
  progress: number;
  status: 'idle' | 'parsing' | 'validating' | 'uploading' | 'success' | 'error';
  uploadedCount: number;
  totalCount: number;
  currentFile: File | null;
  type: 'rooms' | 'tags';
  error?: string;
}

export function UploadProgressPopup({
  isOpen,
  onClose,
  progress,
  status,
  uploadedCount,
  totalCount,
  currentFile,
  type,
  error
}: UploadProgressPopupProps) {
  
  const getStatusIcon = () => {
    switch (status) {
      case 'parsing':
      case 'validating':
      case 'uploading':
        return <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-6 w-6 text-red-600" />;
      default:
        return <Upload className="h-6 w-6 text-gray-600" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'parsing':
        return '📊 Parsing Excel file...';
      case 'validating':
        return '🔍 Validating data...';
      case 'uploading':
        return '🚀 Uploading to database...';
      case 'success':
        return '✅ Upload completed successfully!';
      case 'error':
        return '❌ Upload failed';
      default:
        return '⏳ Preparing upload...';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'parsing':
      case 'validating':
      case 'uploading':
        return 'from-blue-500 to-indigo-600';
      case 'success':
        return 'from-green-500 to-emerald-600';
      case 'error':
        return 'from-red-500 to-pink-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getProgressColor = () => {
    if (status === 'error') return 'bg-red-500';
    if (status === 'success') return 'bg-green-500';
    return 'bg-gradient-to-r from-blue-500 to-indigo-600';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-blue-950 border-2 border-blue-200 dark:border-blue-700 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r ${getStatusColor()} mb-4 shadow-lg`}>
            {getStatusIcon()}
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {type === 'rooms' ? '🏠 Room Data Upload' : '🏷️ Tag Data Upload'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Processing your Excel file with real-time progress tracking
          </p>
        </div>

        {/* File Information */}
        {currentFile && (
          <Card className="mb-6 border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:border-blue-700 dark:from-blue-950/30 dark:to-indigo-950/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600">
                  <FileSpreadsheet className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">
                    📄 {currentFile.name}
                  </h3>
                  <div className="flex items-center gap-4 mt-2">
                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      📊 {(currentFile.size / 1024).toFixed(1)} KB
                    </Badge>
                    <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                      📋 {type === 'rooms' ? 'Room Data' : 'Tag Data'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress Section */}
        <Card className="mb-6 border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 dark:border-purple-700 dark:from-purple-950/30 dark:to-pink-950/30">
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Status and Count */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon()}
                  <span className="font-bold text-lg text-gray-800 dark:text-gray-200">
                    {getStatusText()}
                  </span>
                </div>
                {totalCount > 0 && (
                  <div className="flex items-center gap-3">
                    <Badge className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold text-lg">
                      <TrendingUp className="mr-2 h-4 w-4" />
                      {uploadedCount} / {totalCount}
                    </Badge>
                    <Badge className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg">
                      <Zap className="mr-2 h-4 w-4" />
                      {Math.round(progress)}%
                    </Badge>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Overall Progress
                  </span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {Math.round(progress)}% Complete
                  </span>
                </div>
                <div className="relative">
                  <Progress 
                    value={progress} 
                    className="h-4 bg-gray-200 dark:bg-gray-700"
                  />
                  <div 
                    className={`absolute top-0 left-0 h-4 rounded-full transition-all duration-500 ${getProgressColor()}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Detailed Progress */}
              {totalCount > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-xl border border-blue-200 dark:border-blue-700">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {uploadedCount}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      ✅ Processed
                    </div>
                  </div>
                  <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-xl border border-orange-200 dark:border-orange-700">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {totalCount - uploadedCount}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      ⏳ Remaining
                    </div>
                  </div>
                  <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-xl border border-green-200 dark:border-green-700">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {totalCount}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      📊 Total Items
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Success Message */}
        {status === 'success' && (
          <Card className="mb-6 border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 dark:border-green-700 dark:from-green-950/30 dark:to-emerald-950/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 text-green-700 dark:text-green-300">
                <div className="p-3 rounded-full bg-gradient-to-br from-green-500 to-emerald-600">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-xl">
                    🎉 Upload Successful!
                  </h3>
                  <p className="text-green-600 dark:text-green-400 mt-1">
                    ✨ Successfully uploaded {totalCount} {type} to the database
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Message */}
        {status === 'error' && error && (
          <Card className="mb-6 border-2 border-red-300 bg-gradient-to-r from-red-50 to-pink-50 dark:border-red-700 dark:from-red-950/30 dark:to-pink-950/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 text-red-700 dark:text-red-300">
                <div className="p-3 rounded-full bg-gradient-to-br from-red-500 to-pink-600">
                  <AlertCircle className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-xl">
                    ❌ Upload Failed
                  </h3>
                  <p className="text-red-600 dark:text-red-400 mt-1">
                    🔍 {error}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {status === 'success' 
              ? '✨ This popup will close automatically in a few seconds'
              : status === 'error'
              ? '🔄 Please try again or contact support if the issue persists'
              : '⏳ Please wait while we process your data...'
            }
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
