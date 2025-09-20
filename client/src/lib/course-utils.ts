import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { Course, InsertCourse } from "@shared/schema";

/**
 * Add a new course to the database
 */
export const addCourse = async (courseData: InsertCourse): Promise<string> => {
  try {
    const courseRef = await addDoc(collection(db, "courses"), {
      ...courseData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    console.log("Course added successfully:", courseRef.id);
    return courseRef.id;
  } catch (error) {
    console.error("Error adding course:", error);
    throw new Error("Failed to add course");
  }
};

/**
 * Update an existing course
 */
export const updateCourse = async (courseId: string, courseData: Partial<InsertCourse>): Promise<void> => {
  try {
    const courseRef = doc(db, "courses", courseId);
    await updateDoc(courseRef, {
      ...courseData,
      updatedAt: serverTimestamp(),
    });
    
    console.log("Course updated successfully:", courseId);
  } catch (error) {
    console.error("Error updating course:", error);
    throw new Error("Failed to update course");
  }
};

/**
 * Delete a course
 */
export const deleteCourse = async (courseId: string): Promise<void> => {
  try {
    const courseRef = doc(db, "courses", courseId);
    await deleteDoc(courseRef);
    
    console.log("Course deleted successfully:", courseId);
  } catch (error) {
    console.error("Error deleting course:", error);
    throw new Error("Failed to delete course");
  }
};

/**
 * Get all courses from the database
 */
export const getAllCourses = async (): Promise<Course[]> => {
  try {
    const coursesQuery = query(
      collection(db, "courses"),
      orderBy("createdAt", "desc")
    );
    
    const coursesSnapshot = await getDocs(coursesQuery);
    const courses: Course[] = [];
    
    coursesSnapshot.forEach((doc) => {
      const data = doc.data();
      courses.push({
        id: doc.id,
        courseCode: data.courseCode,
        courseName: data.courseName,
        description: data.description || "",
        instructor: data.instructor,
        duration: data.duration,
        maxStudents: data.maxStudents,
        isActive: data.isActive !== false, // Default to true if not set
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      });
    });
    
    console.log(`Retrieved ${courses.length} courses`);
    return courses;
  } catch (error) {
    console.error("Error getting courses:", error);
    throw new Error("Failed to get courses");
  }
};

/**
 * Toggle course active status
 */
export const toggleCourseStatus = async (courseId: string, isActive: boolean): Promise<void> => {
  try {
    const courseRef = doc(db, "courses", courseId);
    await updateDoc(courseRef, {
      isActive,
      updatedAt: serverTimestamp(),
    });
    
    console.log(`Course ${courseId} status updated to ${isActive ? 'active' : 'inactive'}`);
  } catch (error) {
    console.error("Error toggling course status:", error);
    throw new Error("Failed to toggle course status");
  }
};
