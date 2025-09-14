import { 
  collection, 
  query, 
  where, 
  getDocs
} from "firebase/firestore";
import { db } from "./firebase";

export async function validateAvailability(gender: string) {
  try {
    const roomsQuery = query(
      collection(db, "rooms"),
      where("gender", "==", gender)
    );
    const roomsSnapshot = await getDocs(roomsQuery);
    
    let availableRoomCount = 0;
    for (const roomDoc of roomsSnapshot.docs) {
      const roomData = roomDoc.data();
      if (roomData.availableBeds > 0) {
        availableRoomCount += roomData.availableBeds;
      }
    }

    const tagsQuery = query(
      collection(db, "tags"),
      where("isAssigned", "==", false)
    );
    const tagsSnapshot = await getDocs(tagsQuery);
    const availableTagCount = tagsSnapshot.size;

    return {
      hasAvailableRooms: availableRoomCount > 0,
      hasAvailableTags: availableTagCount > 0,
      availableRoomCount,
      availableTagCount,
    };
  } catch (error) {
    console.error("Error validating availability:", error);
    return {
      hasAvailableRooms: false,
      hasAvailableTags: false,
      availableRoomCount: 0,
      availableTagCount: 0,
    };
  }
}
