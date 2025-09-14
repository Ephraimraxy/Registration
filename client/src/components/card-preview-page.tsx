import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Printer, User, MapPin, Phone, Mail, Calendar, Hash, Building, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface User {
  id?: string;
  firstName: string;
  surname: string;
  middleName?: string;
  dob: string;
  gender: string;
  phone: string;
  email: string;
  stateOfOrigin: string;
  lga: string;
  roomNumber?: number;
  tagNumber?: string;
  registrationDate?: string;
}

interface CardPreviewPageProps {
  user: User;
  onBack: () => void;
  onPrint?: (type: 'full' | 'summary') => void;
}

export function CardPreviewPage({ user, onBack, onPrint }: CardPreviewPageProps) {
  const [printType, setPrintType] = useState<'full' | 'summary'>('full');
  const { toast } = useToast();

  const handlePrint = () => {
    if (onPrint) {
      onPrint(printType);
    } else {
      // Default print functionality
      window.print();
    }
    toast({
      title: "Print Ready",
      description: `Printing ${printType === 'full' ? 'full details' : 'summary'} card...`,
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getGenderColor = (gender: string) => {
    return gender.toLowerCase() === 'male' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200';
  };

  const getGenderIcon = (gender: string) => {
    return gender.toLowerCase() === 'male' ? '👨' : '👩';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={onBack}
            variant="outline"
            className="mb-6 bg-white/90 backdrop-blur-sm border-blue-300 hover:bg-blue-50 dark:bg-gray-800/90 dark:border-blue-600 dark:hover:bg-blue-950/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            ← Back to Registration
          </Button>
          
          <div className="text-center bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 dark:from-blue-600/20 dark:via-indigo-600/20 dark:to-purple-600/20 rounded-2xl p-8 border border-blue-200/50 dark:border-blue-700/50">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4 drop-shadow-lg">
              🎓 Student ID Card Preview
            </h1>
            <p className="text-lg text-gray-700 dark:text-gray-300 font-medium">
              ✨ Review your registration details before printing
            </p>
            <div className="mt-4 flex justify-center gap-4">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium">Professional Design</span>
              </div>
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                <span className="text-sm font-medium">Print Ready</span>
              </div>
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-sm font-medium">Multiple Formats</span>
              </div>
            </div>
          </div>
        </div>

        {/* Print Options */}
        <Card className="mb-6 border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 dark:border-amber-800 dark:from-amber-950/20 dark:to-yellow-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-amber-800 dark:text-amber-200 mb-2">
                  🖨️ Print Options
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Choose what information to include on your ID card
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => setPrintType('summary')}
                  variant={printType === 'summary' ? 'default' : 'outline'}
                  className={`px-6 ${
                    printType === 'summary' 
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white' 
                      : 'border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-950/20'
                  }`}
                >
                  📄 Summary
                </Button>
                <Button
                  onClick={() => setPrintType('full')}
                  variant={printType === 'full' ? 'default' : 'outline'}
                  className={`px-6 ${
                    printType === 'full' 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white' 
                      : 'border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-950/20'
                  }`}
                >
                  📋 Full Details
                </Button>
                <Button
                  onClick={handlePrint}
                  className="px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print Card
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ID Card */}
        <div className="print:bg-white print:shadow-none">
          <Card className="border-4 border-gradient-to-r from-blue-500 to-indigo-500 bg-white shadow-2xl print:shadow-none">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white print:bg-blue-600">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    🏛️ Student ID Card
                  </CardTitle>
                  <p className="text-blue-100 mt-1">Official Registration Document</p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-blue-100">Registration Date</div>
                  <div className="font-bold">{formatDate(user.registrationDate || new Date().toISOString())}</div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-8">
              {printType === 'summary' ? (
                /* Summary View */
                <div className="space-y-6">
                  <div className="flex items-center justify-center mb-8">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                      {user.firstName.charAt(0)}{user.surname.charAt(0)}
                    </div>
                  </div>
                  
                  <div className="text-center space-y-4">
                    <h2 className="text-3xl font-bold text-gray-800">
                      {user.firstName} {user.middleName} {user.surname}
                    </h2>
                    
                    <div className="flex justify-center gap-8">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 text-blue-600 mb-1">
                          <Building className="h-5 w-5" />
                          <span className="font-semibold">Room</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-800">
                          {user.roomNumber || 'TBD'}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 text-green-600 mb-1">
                          <Tag className="h-5 w-5" />
                          <span className="font-semibold">Tag</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-800">
                          {user.tagNumber || 'TBD'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Full Details View */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                        {user.firstName.charAt(0)}{user.surname.charAt(0)}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                          {user.firstName} {user.middleName} {user.surname}
                        </h2>
                        <Badge className={`mt-2 ${getGenderColor(user.gender)}`}>
                          {getGenderIcon(user.gender)} {user.gender}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        <div>
                          <div className="text-sm text-gray-500">Date of Birth</div>
                          <div className="font-semibold">{formatDate(user.dob)}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-green-600" />
                        <div>
                          <div className="text-sm text-gray-500">Phone Number</div>
                          <div className="font-semibold">{user.phone}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <IdCard className="h-5 w-5 text-amber-600" />
                        <div>
                          <div className="text-sm text-gray-500">National ID (NIN)</div>
                          <div className="font-semibold">{user.nin || 'Not provided'}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-purple-600" />
                        <div>
                          <div className="text-sm text-gray-500">Email Address</div>
                          <div className="font-semibold">{user.email}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-orange-600" />
                        <div>
                          <div className="text-sm text-gray-500">State of Origin</div>
                          <div className="font-semibold">{user.stateOfOrigin}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-orange-600" />
                        <div>
                          <div className="text-sm text-gray-500">Local Government Area</div>
                          <div className="font-semibold">{user.lga}</div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl border border-blue-200 dark:border-blue-700">
                        <div className="flex items-center gap-2 text-blue-600 mb-2">
                          <Building className="h-5 w-5" />
                          <span className="font-semibold">Room & Bed</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-800">
                          {user.roomNumber || 'TBD'}
                          {user.bedNumber && (
                            <span className="text-sm text-blue-600 ml-2">
                              (Bed {user.bedNumber})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-xl border border-green-200 dark:border-green-700">
                        <div className="flex items-center gap-2 text-green-600 mb-2">
                          <Tag className="h-5 w-5" />
                          <span className="font-semibold">Tag Number</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-800">
                          {user.tagNumber || 'TBD'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 dark:text-gray-400">
          <p className="text-sm">
            This is a preview of your student ID card. Use the print button above to generate a printable version.
          </p>
        </div>
      </div>
    </div>
  );
}
