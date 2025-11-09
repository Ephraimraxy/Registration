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
 * If allowCrossGender is true and gender is Male, also includes Female rooms
 */
export async function fetchAvailableRooms(gender: "Male" | "Female", allowCrossGender: boolean = false): Promise<AvailableRoom[]> {
  try {
    let rooms: AvailableRoom[] = [];
    
    // Fetch rooms for the selected gender
    const roomsQuery = query(
      collection(db, "rooms"),
      where("gender", "==", gender),
      where("availableBeds", ">", 0)
    );
    
    const snapshot = await getDocs(roomsQuery);
    rooms = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        roomNumber: data.roomNumber,
        wing: data.wing,
        gender: data.gender as "Male" | "Female",
        availableBeds: data.availableBeds,
        totalBeds: data.totalBeds,
      };
    });
    
    // If allowCrossGender is true and gender is Male, also fetch Female rooms
    if (allowCrossGender && gender === "Male") {
      const femaleRoomsQuery = query(
        collection(db, "rooms"),
        where("gender", "==", "Female"),
        where("availableBeds", ">", 0)
      );
      
      const femaleSnapshot = await getDocs(femaleRoomsQuery);
      const femaleRooms = femaleSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          roomNumber: data.roomNumber,
          wing: data.wing,
          gender: data.gender as "Male" | "Female",
          availableBeds: data.availableBeds,
          totalBeds: data.totalBeds,
        };
      });
      rooms = [...rooms, ...femaleRooms];
    }
    
    return rooms.sort((a, b) => {
      // Sort by room number for consistency
      return a.roomNumber.localeCompare(b.roomNumber);
    });
  } catch (error: any) {
    // If index error, fallback to fetching all rooms and filtering client-side
    if (error?.code === "failed-precondition" || error?.message?.includes("index")) {
      console.warn("Firestore index not found. Falling back to client-side filtering. Please create the index:", error);
      try {
        // Fetch all rooms and filter client-side
        const allRoomsQuery = query(collection(db, "rooms"));
        const snapshot = await getDocs(allRoomsQuery);
        
        let rooms = snapshot.docs
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
          .filter(room => {
            if (room.availableBeds <= 0) return false;
            if (room.gender === gender) return true;
            // Include female rooms for males if cross-gender is allowed
            if (allowCrossGender && gender === "Male" && room.gender === "Female") return true;
            return false;
          })
          .sort((a, b) => {
            return a.roomNumber.localeCompare(b.roomNumber);
          });
        
        return rooms;
      } catch (fallbackError) {
        console.error("Error in fallback room fetch:", fallbackError);
        return [];
      }
    }
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
 * If allowCrossGender is true and gender is Male, also includes Female rooms
 */
export function setupRoomTagListeners(
  gender: "Male" | "Female" | null,
  onRoomsUpdate: (rooms: AvailableRoom[]) => void,
  onTagsUpdate: (tags: AvailableTag[]) => void,
  allowCrossGender: boolean = false
): () => void {
  const unsubscribes: Unsubscribe[] = [];

  if (gender) {
    try {
      // Set up listener for primary gender
      const roomsQuery = query(
        collection(db, "rooms"),
        where("gender", "==", gender),
        where("availableBeds", ">", 0)
      );
      
      // Use fallback approach if cross-gender is needed (simpler and more reliable)
      if (allowCrossGender && gender === "Male") {
        // Use fallback to get all rooms and filter
        const allRoomsQuery = query(collection(db, "rooms"));
        const fallbackUnsubscribe = onSnapshot(allRoomsQuery, (snapshot) => {
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
            .filter(room => {
              if (room.availableBeds <= 0) return false;
              // Include both Male and Female rooms for Male users when cross-gender is allowed
              return room.gender === "Male" || room.gender === "Female";
            })
            .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber));
          onRoomsUpdate(rooms);
        });
        unsubscribes.push(fallbackUnsubscribe);
      } else {
        // Normal query for single gender
        const roomsUnsubscribe = onSnapshot(
          roomsQuery,
          (snapshot) => {
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
          },
        (error: any) => {
          // If index error, fallback to fetching all rooms and filtering client-side
          if (error?.code === "failed-precondition" || error?.message?.includes("index")) {
            console.warn("Firestore index not found for real-time listener. Using fallback.");
            const allRoomsQuery = query(collection(db, "rooms"));
            const fallbackUnsubscribe = onSnapshot(allRoomsQuery, (snapshot) => {
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
                .filter(room => {
                  if (room.availableBeds <= 0) return false;
                  if (room.gender === gender) return true;
                  // Include female rooms for males if cross-gender is allowed
                  if (allowCrossGender && gender === "Male" && room.gender === "Female") return true;
                  return false;
                })
                .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber));
              onRoomsUpdate(rooms);
            });
            unsubscribes.push(fallbackUnsubscribe);
          } else {
            console.error("Error in rooms listener:", error);
            onRoomsUpdate([]);
          }
        }
      );
      
      unsubscribes.push(roomsUnsubscribe);
    } catch (error: any) {
      // Fallback if query creation fails
      if (error?.code === "failed-precondition" || error?.message?.includes("index")) {
        console.warn("Firestore index not found. Using fallback listener.");
        const allRoomsQuery = query(collection(db, "rooms"));
        const fallbackUnsubscribe = onSnapshot(allRoomsQuery, (snapshot) => {
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
            .filter(room => {
              if (room.availableBeds <= 0) return false;
              if (room.gender === gender) return true;
              // Include female rooms for males if cross-gender is allowed
              if (allowCrossGender && gender === "Male" && room.gender === "Female") return true;
              return false;
            })
            .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber));
          onRoomsUpdate(rooms);
        });
        unsubscribes.push(fallbackUnsubscribe);
      }
    }
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

