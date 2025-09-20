import { collection, addDoc, doc, setDoc, getDocs, query, where, Timestamp, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";
import { Room, Tag, InsertRoom, InsertTag } from "@shared/schema";

// No hardcoded sample data - system starts completely empty

// Removed sample data initialization - system starts empty

/**
 * Add a new room to the database
 */
export const addRoom = async (roomData: InsertRoom): Promise<string> => {
  try {
    const roomRef = await addDoc(collection(db, "rooms"), {
      ...roomData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    
    console.log("Room added successfully:", roomRef.id);
    return roomRef.id;
  } catch (error) {
    console.error("Error adding room:", error);
    throw new Error("Failed to add room");
  }
};

/**
 * Add a new tag to the database
 */
export const addTag = async (tagData: InsertTag): Promise<string> => {
  try {
    const tagRef = await addDoc(collection(db, "tags"), {
      ...tagData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    
    console.log("Tag added successfully:", tagRef.id);
    return tagRef.id;
  } catch (error) {
    console.error("Error adding tag:", error);
    throw new Error("Failed to add tag");
  }
};

/**
 * Clear all data from the database
 */
export const clearAllData = async () => {
  try {
    console.log("Clearing all data from database...");
    
    // Clear all users
    const usersSnapshot = await getDocs(collection(db, "users"));
    const userDeletePromises = usersSnapshot.docs.map(docSnapshot => deleteDoc(docSnapshot.ref));
    await Promise.all(userDeletePromises);
    console.log(`Deleted ${usersSnapshot.docs.length} users`);
    
    // Clear all rooms
    const roomsSnapshot = await getDocs(collection(db, "rooms"));
    const roomDeletePromises = roomsSnapshot.docs.map(docSnapshot => deleteDoc(docSnapshot.ref));
    await Promise.all(roomDeletePromises);
    console.log(`Deleted ${roomsSnapshot.docs.length} rooms`);
    
    // Clear all tags
    const tagsSnapshot = await getDocs(collection(db, "tags"));
    const tagDeletePromises = tagsSnapshot.docs.map(docSnapshot => deleteDoc(docSnapshot.ref));
    await Promise.all(tagDeletePromises);
    console.log(`Deleted ${tagsSnapshot.docs.length} tags`);
    
    // Clear admin stats
    const adminRef = doc(db, "admin", "stats");
    await deleteDoc(adminRef);
    console.log("Cleared admin stats");
    
    console.log("All data cleared successfully!");
    return true;
  } catch (error) {
    console.error("Error clearing data:", error);
    return false;
  }
};
