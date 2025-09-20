import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Edit, Trash2, BookOpen, Users, Clock, User, ToggleLeft, ToggleRight, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Course, InsertCourse } from "@shared/schema";
import { addCourse, updateCourse, deleteCourse, getAllCourses, toggleCourseStatus } from "@/lib/course-utils";

export function AttendancePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<InsertCourse>({
    courseCode: "",
    courseName: "",
    description: "",
    instructor: "",
    duration: 0,
    maxStudents: undefined,
    isActive: true,
  });

  // Load courses on component mount
  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setIsLoading(true);
      const coursesData = await getAllCourses();
      setCourses(coursesData);
    } catch (error) {
      toast({
        title: "Error loading courses",
        description: "Failed to load courses. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setLocation("/admin");
  };

  const handleAddCourse = () => {
    setFormData({
      courseCode: "",
      courseName: "",
      description: "",
      instructor: "",
      duration: 0,
      maxStudents: undefined,
      isActive: true,
    });
    setEditingCourse(null);
    setShowAddDialog(true);
  };

  const handleEditCourse = (course: Course) => {
    setFormData({
      courseCode: course.courseCode,
      courseName: course.courseName,
      description: course.description || "",
      instructor: course.instructor,
      duration: course.duration,
      maxStudents: course.maxStudents,
      isActive: course.isActive,
    });
    setEditingCourse(course);
    setShowAddDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.courseCode.trim() || !formData.courseName.trim() || !formData.instructor.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (formData.duration <= 0) {
      toast({
        title: "Validation Error",
        description: "Duration must be greater than 0.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      if (editingCourse) {
        await updateCourse(editingCourse.id, formData);
        toast({
          title: "Course Updated",
          description: "Course has been updated successfully.",
        });
      } else {
        await addCourse(formData);
        toast({
          title: "Course Added",
          description: "New course has been added successfully.",
        });
      }
      
      setShowAddDialog(false);
      setEditingCourse(null);
      await loadCourses();
    } catch (error) {
      toast({
        title: "Error",
        description: editingCourse ? "Failed to update course." : "Failed to add course.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCourse = async (course: Course) => {
    if (window.confirm(`Are you sure you want to delete "${course.courseName}"?`)) {
      try {
        await deleteCourse(course.id);
        toast({
          title: "Course Deleted",
          description: "Course has been deleted successfully.",
        });
        await loadCourses();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete course.",
          variant: "destructive",
        });
      }
    }
  };

  const handleToggleStatus = async (course: Course) => {
    try {
      await toggleCourseStatus(course.id, !course.isActive);
      toast({
        title: "Status Updated",
        description: `Course has been ${!course.isActive ? 'activated' : 'deactivated'}.`,
      });
      await loadCourses();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update course status.",
        variant: "destructive",
      });
    }
  };

  const formatDuration = (duration: number) => {
    if (duration < 60) {
      return `${duration} minutes`;
    } else if (duration < 1440) {
      const hours = Math.floor(duration / 60);
      const minutes = duration % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours} hours`;
    } else {
      const days = Math.floor(duration / 1440);
      const hours = Math.floor((duration % 1440) / 60);
      return hours > 0 ? `${days}d ${hours}h` : `${days} days`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-indigo-950 dark:to-purple-950 p-4">
      <div className="max-w-7xl mx-auto">
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
            <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl shadow-lg">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Course Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage courses and attendance for registered students
              </p>
            </div>
          </div>
        </div>

        {/* Add Course Button */}
        <div className="mb-8">
          <Button
            onClick={handleAddCourse}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add New Course
          </Button>
        </div>

        {/* Courses Table */}
        <Card className="border-2 border-indigo-200 dark:border-indigo-700 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30">
            <CardTitle className="flex items-center gap-2 text-indigo-800 dark:text-indigo-200">
              <BookOpen className="h-6 w-6" />
              Available Courses ({courses.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-400">Loading courses...</span>
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  No courses found
                </h3>
                <p className="text-gray-500 dark:text-gray-500 mb-4">
                  Get started by adding your first course.
                </p>
                <Button onClick={handleAddCourse} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Course
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-800">
                      <TableHead className="font-semibold">Course Code</TableHead>
                      <TableHead className="font-semibold">Course Name</TableHead>
                      <TableHead className="font-semibold">Instructor</TableHead>
                      <TableHead className="font-semibold">Duration</TableHead>
                      <TableHead className="font-semibold">Max Students</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courses.map((course) => (
                      <TableRow key={course.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <TableCell className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                          {course.courseCode}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-gray-100">
                              {course.courseName}
                            </div>
                            {course.description && (
                              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {course.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span>{course.instructor}</span>
                        </TableCell>
                        <TableCell className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span>{formatDuration(course.duration)}</span>
                        </TableCell>
                        <TableCell>
                          {course.maxStudents ? (
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-gray-500" />
                              <span>{course.maxStudents}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">No limit</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={course.isActive ? "default" : "secondary"}
                            className={course.isActive 
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
                              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                            }
                          >
                            {course.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(course)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                            >
                              {course.isActive ? (
                                <ToggleRight className="h-4 w-4" />
                              ) : (
                                <ToggleLeft className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditCourse(course)}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/20"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCourse(course)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Course Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-950 border-2 border-indigo-200 dark:border-indigo-700 shadow-2xl">
            <DialogHeader className="bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 -m-6 mb-4 p-6 rounded-t-lg border-b border-indigo-200 dark:border-indigo-700">
              <DialogTitle className="text-xl font-bold text-indigo-800 dark:text-indigo-200 flex items-center gap-2">
                <div className="p-2 bg-indigo-500 rounded-lg">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                {editingCourse ? "Edit Course" : "Add New Course"}
              </DialogTitle>
              <DialogDescription className="text-indigo-700 dark:text-indigo-300 mt-2">
                {editingCourse ? "Update course information below." : "Fill in the course details below."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 bg-white/50 dark:bg-gray-800/50 rounded-lg p-6 border border-indigo-100 dark:border-indigo-800">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="courseCode" className="text-indigo-700 dark:text-indigo-300 font-semibold">
                    Course Code *
                  </Label>
                  <Input
                    id="courseCode"
                    value={formData.courseCode}
                    onChange={(e) => setFormData({ ...formData, courseCode: e.target.value })}
                    placeholder="e.g., CS101, MATH201"
                    className="border-indigo-200 dark:border-indigo-700 focus:border-indigo-500 dark:focus:border-indigo-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="courseName" className="text-indigo-700 dark:text-indigo-300 font-semibold">
                    Course Name *
                  </Label>
                  <Input
                    id="courseName"
                    value={formData.courseName}
                    onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
                    placeholder="e.g., Introduction to Programming"
                    className="border-indigo-200 dark:border-indigo-700 focus:border-indigo-500 dark:focus:border-indigo-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-indigo-700 dark:text-indigo-300 font-semibold">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the course..."
                  className="border-indigo-200 dark:border-indigo-700 focus:border-indigo-500 dark:focus:border-indigo-400"
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="instructor" className="text-indigo-700 dark:text-indigo-300 font-semibold">
                    Instructor *
                  </Label>
                  <Input
                    id="instructor"
                    value={formData.instructor}
                    onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                    placeholder="e.g., Dr. John Smith"
                    className="border-indigo-200 dark:border-indigo-700 focus:border-indigo-500 dark:focus:border-indigo-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-indigo-700 dark:text-indigo-300 font-semibold">
                    Duration (minutes) *
                  </Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                    placeholder="e.g., 120"
                    min="1"
                    className="border-indigo-200 dark:border-indigo-700 focus:border-indigo-500 dark:focus:border-indigo-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxStudents" className="text-indigo-700 dark:text-indigo-300 font-semibold">
                  Maximum Students (Optional)
                </Label>
                <Input
                  id="maxStudents"
                  type="number"
                  value={formData.maxStudents || ""}
                  onChange={(e) => setFormData({ ...formData, maxStudents: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="e.g., 30 (leave empty for no limit)"
                  min="1"
                  className="border-indigo-200 dark:border-indigo-700 focus:border-indigo-500 dark:focus:border-indigo-400"
                />
              </div>

              <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-700 dark:text-blue-300">
                  <strong>Duration:</strong> Enter duration in minutes. For example: 60 minutes = 1 hour, 120 minutes = 2 hours, 1440 minutes = 1 day.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter className="gap-3">
              <Button
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>{editingCourse ? "Updating..." : "Adding..."}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    <span>{editingCourse ? "Update Course" : "Add Course"}</span>
                  </div>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
