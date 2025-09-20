import { z } from "zod";

// User schema for student registration
export const userSchema = z.object({
  id: z.string(),
  firstName: z.string().min(1, "First name is required"),
  surname: z.string().min(1, "Surname is required"),
  middleName: z.string().optional(),
  dob: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["Male", "Female"]),
  phone: z.string().min(10, "Valid phone number is required"),
  email: z.string().email("Valid email is required"),
  nin: z.string().length(11, "NIN must be exactly 11 digits").regex(/^\d{11}$/, "NIN must contain only numbers"),
  stateOfOrigin: z.string().min(1, "State of origin is required"),
  lga: z.string().min(1, "LGA is required"),
  roomNumber: z.string().optional(),
  bedNumber: z.string().optional(),
  tagNumber: z.string().optional(),
  roomStatus: z.enum(["assigned", "pending"]).optional(),
  tagStatus: z.enum(["assigned", "pending"]).optional(),
  isVip: z.boolean().optional(), // VIP status for special room assignment
  createdAt: z.date(),
});

export const insertUserSchema = userSchema.omit({
  id: true,
  roomNumber: true,
  tagNumber: true,
  createdAt: true,
});

// Room schema
export const roomSchema = z.object({
  id: z.string(),
  wing: z.string(),
  roomNumber: z.string(),
  gender: z.enum(["Male", "Female"]),
  totalBeds: z.number().positive(),
  availableBeds: z.number().min(0),
  bedNumbers: z.array(z.string()).optional(), // Individual bed numbers (001, 002, 003, etc.)
  isVipRoom: z.boolean().optional(), // VIP/Reserved room for special persons
});

export const insertRoomSchema = roomSchema.omit({
  id: true,
});

// Tag schema
export const tagSchema = z.object({
  id: z.string(),
  tagNumber: z.string(),
  isAssigned: z.boolean().default(false),
  assignedUserId: z.string().optional(),
});

export const insertTagSchema = tagSchema.omit({
  id: true,
});

// Course schema for attendance management
export const courseSchema = z.object({
  id: z.string(),
  courseCode: z.string().min(1, "Course code is required"),
  courseName: z.string().min(1, "Course name is required"),
  description: z.string().optional(),
  instructor: z.string().min(1, "Instructor name is required"),
  duration: z.number().positive("Duration must be positive"),
  maxStudents: z.number().positive("Max students must be positive").optional(),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertCourseSchema = courseSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Statistics schema for admin dashboard
export const statsSchema = z.object({
  totalStudents: z.number(),
  availableRooms: z.number(),
  assignedTags: z.number(),
  availableTags: z.number(),
});

export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Room = z.infer<typeof roomSchema>;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Tag = z.infer<typeof tagSchema>;
export type InsertTag = z.infer<typeof insertTagSchema>;
export type Course = z.infer<typeof courseSchema>;
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Stats = z.infer<typeof statsSchema>;
