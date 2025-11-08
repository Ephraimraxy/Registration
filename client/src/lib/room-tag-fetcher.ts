import { collection, query, where, getDocs, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { db } from "./firebase";
import type { Room, Tag } from "@shared/schema";

export interface AvailableRoom {
  id: string;
  roomNumber: string;
  wing: string;
  gender: "Male" | "Female";
  availableBeds: number;
  totalBeds: number;
}

export interface AvailableTag {
  id: string;
  tagNumber: string;
}

/**
 * Fetches available rooms filtered by gender
 */
export async function fetchAvailableRooms(gender: "Male" | "Female"): Promise<AvailableRoom[]> {
  try {
    const roomsQuery = query(
      collection(db, "rooms"),
      where("gender", "==", gender),
      where("availableBeds", ">", 0)
    );
    
    const snapshot = await getDocs(roomsQuery);
    
    return snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          roomNumber: data.roomNumber,
          wing: data.wing,
          gender: data.gender as "Male" | "Female",
          availableBeds: data.availableBeds,
          totalBeds: data.totalBeds,
        };
      })
      .sort((a, b) => {
        // Sort by room number for consistency
        return a.roomNumber.localeCompare(b.roomNumber);
      });
  } catch (error) {
    console.error("Error fetching available rooms:", error);
    return [];
  }
}

/**
 * Fetches all available tags
 */
export async function fetchAvailableTags(): Promise<AvailableTag[]> {
  try {
    const tagsQuery = query(
      collection(db, "tags"),
      where("isAssigned", "==", false)
    );
    
    const snapshot = await getDocs(tagsQuery);
    
    return snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          tagNumber: data.tagNumber,
        };
      })
      .sort((a, b) => {
        // Sort by tag number (extract numeric part)
        const aNum = parseInt(a.tagNumber.replace(/\D/g, '')) || 0;
        const bNum = parseInt(b.tagNumber.replace(/\D/g, '')) || 0;
        return aNum - bNum;
      });
  } catch (error) {
    console.error("Error fetching available tags:", error);
    return [];
  }
}

/**
 * Sets up real-time listeners for available rooms and tags
 */
export function setupRoomTagListeners(
  gender: "Male" | "Female" | null,
  onRoomsUpdate: (rooms: AvailableRoom[]) => void,
  onTagsUpdate: (tags: AvailableTag[]) => void
): () => void {
  const unsubscribes: Unsubscribe[] = [];

  if (gender) {
    const roomsQuery = query(
      collection(db, "rooms"),
      where("gender", "==", gender),
      where("availableBeds", ">", 0)
    );
    
    const roomsUnsubscribe = onSnapshot(roomsQuery, (snapshot) => {
      const rooms = snapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            roomNumber: data.roomNumber,
            wing: data.wing,
            gender: data.gender as "Male" | "Female",
            availableBeds: data.availableBeds,
            totalBeds: data.totalBeds,
          };
        })
        .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber));
      onRoomsUpdate(rooms);
    });
    
    unsubscribes.push(roomsUnsubscribe);
  }

  const tagsQuery = query(
    collection(db, "tags"),
    where("isAssigned", "==", false)
  );
  
  const tagsUnsubscribe = onSnapshot(tagsQuery, (snapshot) => {
    const tags = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          tagNumber: data.tagNumber,
        };
      })
      .sort((a, b) => {
        const aNum = parseInt(a.tagNumber.replace(/\D/g, '')) || 0;
        const bNum = parseInt(b.tagNumber.replace(/\D/g, '')) || 0;
        return aNum - bNum;
      });
    onTagsUpdate(tags);
  });
  
  unsubscribes.push(tagsUnsubscribe);

  // Return cleanup function
  return () => {
    unsubscribes.forEach(unsubscribe => unsubscribe());
  };
}

