import { collection, addDoc, doc, setDoc, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

// No hardcoded sample data - system starts completely empty

// Removed sample data initialization - system starts empty

/**
 * Clear all data from the database
 */
export const clearAllData = async () => {
  try {
    console.log("Clearing all data from database...");
    
    // Clear all users
    const usersSnapshot = await getDocs(collection(db, "users"));
    const userDeletePromises = usersSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(userDeletePromises);
    console.log(`Deleted ${usersSnapshot.docs.length} users`);
    
    // Clear all rooms
    const roomsSnapshot = await getDocs(collection(db, "rooms"));
    const roomDeletePromises = roomsSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(roomDeletePromises);
    console.log(`Deleted ${roomsSnapshot.docs.length} rooms`);
    
    // Clear all tags
    const tagsSnapshot = await getDocs(collection(db, "tags"));
    const tagDeletePromises = tagsSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(tagDeletePromises);
    console.log(`Deleted ${tagsSnapshot.docs.length} tags`);
    
    // Clear admin stats
    const adminRef = doc(db, "admin", "stats");
    await adminRef.delete();
    console.log("Cleared admin stats");
    
    console.log("All data cleared successfully!");
    return true;
  } catch (error) {
    console.error("Error clearing data:", error);
    return false;
  }
};
