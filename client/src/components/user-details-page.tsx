import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle, 
  Download, 
  ArrowLeft, 
  UserPlus, 
  IdCard, 
  Eye, 
  Printer,
  FileText,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Bed,
  Tag,
  User
} from "lucide-react";
import { generateUserDetailsPDF } from "@/lib/pdf-utils";
import { useToast } from "@/hooks/use-toast";
import { User as UserType } from "@shared/schema";

interface UserDetailsPageProps {
  user: UserType;
  onBack: () => void;
}

export function UserDetailsPage({ user, onBack }: UserDetailsPageProps) {
  const [printType, setPrintType] = useState<'full' | 'summary'>('full');

  const handleDownload = () => {
    try {
      generateUserDetailsPDF(user, printType);
      toast({
        title: "PDF Downloaded",
        description: `User ${printType === 'full' ? 'full details' : 'summary'} have been downloaded successfully!`,
      });
    } catch (error: any) {
      toast({
        title: "Download Failed", 
        description: error.message || "Failed to download PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const fullName = `${user.firstName} ${user.middleName || ''} ${user.surname}`.trim();
  const initials = `${user.firstName?.charAt(0) || ''}${user.surname?.charAt(0) || ''}`.toUpperCase();

  const getGenderIcon = (gender: string) => {
    return gender.toLowerCase() === 'male' ? '👨' : '👩';
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-purple-500", 
      "bg-pink-500", "bg-indigo-500", "bg-red-500", "bg-orange-500"
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={onBack}
            variant="outline"
            className="mb-6 bg-white/90 backdrop-blur-sm border-blue-300 hover:bg-blue-50 dark:bg-gray-800/90 dark:border-blue-600 dark:hover:bg-blue-950/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            ← Back to Admin Dashboard
          </Button>
          
          <div className="text-center bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 dark:from-blue-600/20 dark:via-indigo-600/20 dark:to-purple-600/20 rounded-2xl p-8 border border-blue-200/50 dark:border-blue-700/50">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full shadow-lg">
                <User className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4 drop-shadow-lg">
              👤 User Details
            </h1>
            <p className="text-lg text-gray-700 dark:text-gray-300 font-medium">
              ✨ View and manage user information
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <Button
            onClick={handleDownload}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            <Download className="mr-2 h-4 w-4" />
            Download {printType === 'full' ? 'Full Details' : 'Summary'} PDF
          </Button>
          <Button
            onClick={handlePrint}
            variant="outline"
            className="border-blue-300 hover:bg-blue-50 dark:border-blue-600 dark:hover:bg-blue-950/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print {printType === 'full' ? 'Full Details' : 'Summary'}
          </Button>
        </div>

        {/* Print Type Toggle */}
        <div className="flex flex-col items-center mb-8">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 font-medium">
            📄 Select view type for download/print:
          </p>
          <Tabs value={printType} onValueChange={(value) => setPrintType(value as 'full' | 'summary')} className="w-full max-w-md">
            <TabsList className="grid w-full grid-cols-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg">
              <TabsTrigger value="full" className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                <FileText className="h-4 w-4" />
                Full Details
              </TabsTrigger>
              <TabsTrigger value="summary" className="flex items-center gap-2 data-[state=active]:bg-green-500 data-[state=active]:text-white">
                <Eye className="h-4 w-4" />
                Summary
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content */}
        <Tabs value={printType} onValueChange={(value) => setPrintType(value as 'full' | 'summary')}>
          <TabsContent value="full" className="space-y-6">
            {/* Full Details Card */}
            <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-xl border-2 border-blue-200 dark:border-blue-700">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                <CardTitle className="text-2xl font-bold text-blue-800 dark:text-blue-200 flex items-center gap-3">
                  <IdCard className="h-6 w-6" />
                  Complete User Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Personal Information */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarFallback className={`${getAvatarColor(fullName)} text-white font-bold text-lg`}>
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{fullName}</h3>
                        <Badge 
                          variant="secondary" 
                          className={user.gender === 'Male' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400'}
                        >
                          {getGenderIcon(user.gender)} {user.gender}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Email</span>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Phone</span>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{user.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <IdCard className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">National ID (NIN)</span>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {user.nin || 'Not provided'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Date of Birth</span>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {user.dob ? new Date(user.dob).toLocaleDateString() : 'Not provided'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Location & Assignment */}
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">State of Origin</span>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{user.stateOfOrigin}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Local Government Area</span>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{user.lga}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Bed className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Room & Bed Assignment</span>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {user.roomNumber ? (
                              <>
                                {user.roomNumber}
                                {user.bedNumber && (
                                  <span className="text-sm text-indigo-600 dark:text-indigo-400 ml-2">
                                    (Bed {user.bedNumber})
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-yellow-600 dark:text-yellow-400">
                                {user.roomStatus === 'pending' ? '⏳ Pending Assignment' : 'Not assigned'}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Tag className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Tag Assignment</span>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {user.tagNumber ? (
                              user.tagNumber
                            ) : (
                              <span className="text-yellow-600 dark:text-yellow-400">
                                {user.tagStatus === 'pending' ? '⏳ Pending Assignment' : 'Not assigned'}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary" className="space-y-6">
            {/* Summary Card */}
            <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-xl border-2 border-green-200 dark:border-green-700">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
                <CardTitle className="text-2xl font-bold text-green-800 dark:text-green-200 flex items-center gap-3">
                  <Eye className="h-6 w-6" />
                  User Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="text-center space-y-6">
                  <div className="flex justify-center">
                    <Avatar className="h-24 w-24">
                      <AvatarFallback className={`${getAvatarColor(fullName)} text-white font-bold text-2xl`}>
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  
                  <div>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{fullName}</h3>
                    <Badge 
                      variant="secondary" 
                      className={user.gender === 'Male' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400'}
                    >
                      {getGenderIcon(user.gender)} {user.gender}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                    <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
                      <Bed className="h-6 w-6 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">Room & Bed</p>
                      <p className="font-bold text-gray-900 dark:text-gray-100">
                        {user.roomNumber ? (
                          <>
                            {user.roomNumber}
                            {user.bedNumber && (
                              <span className="text-sm text-blue-600 dark:text-blue-400 ml-1">
                                (Bed {user.bedNumber})
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-yellow-600 dark:text-yellow-400">
                            {user.roomStatus === 'pending' ? '⏳ Pending Assignment' : 'Not assigned'}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="bg-pink-50 dark:bg-pink-950/20 rounded-lg p-4">
                      <Tag className="h-6 w-6 text-pink-600 dark:text-pink-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">Tag</p>
                      <p className="font-bold text-gray-900 dark:text-gray-100">
                        {user.tagNumber ? (
                          user.tagNumber
                        ) : (
                          <span className="text-yellow-600 dark:text-yellow-400">
                            {user.tagStatus === 'pending' ? '⏳ Pending Assignment' : 'Not assigned'}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Location</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {user.lga}, {user.stateOfOrigin}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
