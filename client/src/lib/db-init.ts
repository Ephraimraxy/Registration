import { collection, addDoc, doc, setDoc, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

// Sample data for initialization
const sampleRooms = [
  { wing: "A", roomNumber: "A101", gender: "Male", totalBeds: 4, availableBeds: 4 },
  { wing: "A", roomNumber: "A102", gender: "Male", totalBeds: 4, availableBeds: 4 },
  { wing: "A", roomNumber: "A103", gender: "Male", totalBeds: 4, availableBeds: 4 },
  { wing: "A", roomNumber: "A201", gender: "Female", totalBeds: 4, availableBeds: 4 },
  { wing: "A", roomNumber: "A202", gender: "Female", totalBeds: 4, availableBeds: 4 },
  { wing: "A", roomNumber: "A203", gender: "Female", totalBeds: 4, availableBeds: 4 },
  { wing: "B", roomNumber: "B101", gender: "Male", totalBeds: 4, availableBeds: 4 },
  { wing: "B", roomNumber: "B102", gender: "Male", totalBeds: 4, availableBeds: 4 },
  { wing: "B", roomNumber: "B201", gender: "Female", totalBeds: 4, availableBeds: 4 },
  { wing: "B", roomNumber: "B202", gender: "Female", totalBeds: 4, availableBeds: 4 },
];

const sampleTags = Array.from({ length: 100 }, (_, i) => ({
  tagNumber: `TAG${String(i + 1).padStart(3, '0')}`,
  isAssigned: false,
}));

export const initializeSampleData = async () => {
  try {
    console.log("Initializing sample data...");

    // Check if rooms already exist
    const roomsSnapshot = await getDocs(collection(db, "rooms"));
    if (roomsSnapshot.empty) {
      console.log("Creating sample rooms...");
      await Promise.all(sampleRooms.map(room => addDoc(collection(db, "rooms"), room)));
      console.log(`Created ${sampleRooms.length} sample rooms`);
    } else {
      console.log("Rooms already exist, skipping...");
    }

    // Check if tags already exist
    const tagsSnapshot = await getDocs(collection(db, "tags"));
    if (tagsSnapshot.empty) {
      console.log("Creating sample tags...");
      await Promise.all(sampleTags.map(tag => addDoc(collection(db, "tags"), tag)));
      console.log(`Created ${sampleTags.length} sample tags`);
    } else {
      console.log("Tags already exist, skipping...");
    }

    // Initialize admin stats
    const adminRef = doc(db, "admin", "stats");
    const adminSnapshot = await getDocs(query(collection(db, "admin"), where("__name__", "==", "stats")));
    
    if (adminSnapshot.empty) {
      await setDoc(adminRef, {
        totalStudents: 0,
        availableRooms: sampleRooms.length,
        assignedTags: 0,
        availableTags: sampleTags.length,
        lastUpdated: Timestamp.now(),
        systemInitialized: true,
      });
      console.log("Admin stats initialized");
    }

    console.log("Sample data initialization completed successfully!");
    return true;
  } catch (error) {
    console.error("Sample data initialization failed:", error);
    return false;
  }
};
