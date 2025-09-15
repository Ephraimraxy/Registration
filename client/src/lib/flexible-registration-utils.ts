import { 
  collection, 
  doc, 
  runTransaction, 
  serverTimestamp, 
  increment, 
  query, 
  where, 
  getDocs,
  onSnapshot,
  updateDoc
} from "firebase/firestore";
import { db } from "./firebase";

export interface FlexibleRegistrationResult {
  success: boolean;
  userData?: any;
  roomAssignment?: {
    roomId: string;
    roomNumber: string;
    wing: string;
  };
  tagAssignment?: {
    tagId: string;
    tagNumber: string;
  };
  error?: string;
  pendingAssignments?: {
    room: boolean;
    tag: boolean;
  };
}

export interface RoomAssignment {
  roomId: string;
  roomNumber: string;
  wing: string;
}

export interface TagAssignment {
  tagId: string;
  tagNumber: string;
}

/**
 * Generate a bed number for a room
 * Format: 001, 002, 003, etc.
 */
function generateBedNumber(roomNumber: string): string {
  // For now, generate a simple sequential number
  // In a real system, you might want to track used bed numbers per room
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  const bedNum = ((timestamp + random) % 999) + 1;
  return bedNum.toString().padStart(3, '0');
}

/**
 * Flexible room and tag assignment that allows partial assignments
 * Users can be registered with just room, just tag, or both
 */
export async function flexibleAssignRoomAndTag(
  userData: any,
  maxRetries: number = 3
): Promise<FlexibleRegistrationResult> {
  let lastError: string = "";
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await runTransaction(db, async (transaction) => {
        // Step 1: Try to find and reserve a room
        let roomAssignment: RoomAssignment | null = null;
        let roomStatus = "pending" as const;
        
        try {
          roomAssignment = await findAndReserveRoom(transaction, userData.gender);
          if (roomAssignment) {
            roomStatus = "assigned";
          }
        } catch (error) {
          console.log("No room available, will be pending:", error);
        }

        // Step 2: Try to find and reserve a tag
        let tagAssignment: TagAssignment | null = null;
        let tagStatus = "pending" as const;
        
        try {
          tagAssignment = await findAndReserveTag(transaction);
          if (tagAssignment) {
            tagStatus = "assigned";
          }
        } catch (error) {
          console.log("No tag available, will be pending:", error);
        }

        // Step 3: Validate user data
        if (!userData.firstName || !userData.surname || !userData.email || !userData.phone) {
          throw new Error("Invalid user data: missing required fields");
        }

        // Step 4: Create user with available assignments
        const userRef = doc(collection(db, "users"));
        
        // Generate bed number if room is assigned
        let bedNumber = null;
        if (roomAssignment) {
          // Try to get bed numbers from room data, otherwise generate
          const roomRef = doc(db, "rooms", roomAssignment.roomId);
          const roomSnap = await transaction.get(roomRef);
          if (roomSnap.exists()) {
            const roomData = roomSnap.data();
            if (roomData.bedNumbers && roomData.bedNumbers.length > 0) {
              // Use the first available bed number from the room's bed numbers
              const availableBedIndex = roomData.totalBeds - roomData.availableBeds;
              bedNumber = roomData.bedNumbers[availableBedIndex] || generateBedNumber(roomAssignment.roomNumber);
            } else {
              bedNumber = generateBedNumber(roomAssignment.roomNumber);
            }
          } else {
            bedNumber = generateBedNumber(roomAssignment.roomNumber);
          }
        }
        
        const finalUserData = {
          firstName: userData.firstName?.trim() || "",
          surname: userData.surname?.trim() || "",
          middleName: userData.middleName?.trim() || "",
          dob: userData.dob || "",
          gender: userData.gender || "",
          phone: userData.phone?.trim() || "",
          email: userData.email?.trim() || "",
          nin: userData.nin?.trim() || "",
          stateOfOrigin: userData.stateOfOrigin?.trim() || "",
          lga: userData.lga?.trim() || "",
          roomNumber: roomAssignment?.roomNumber || null,
          bedNumber: bedNumber,
          tagNumber: tagAssignment?.tagNumber || null,
          roomStatus,
          tagStatus,
          wing: roomAssignment?.wing || null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        // Step 5: Execute all operations atomically
        transaction.set(userRef, finalUserData);

        // Update room if assigned
        if (roomAssignment) {
          const roomRef = doc(db, "rooms", roomAssignment.roomId);
          const latestRoomSnap = await transaction.get(roomRef);
          if (latestRoomSnap.exists()) {
            const latestRoom = latestRoomSnap.data() as any;
            if ((latestRoom.availableBeds ?? 0) > 0) {
              transaction.update(roomRef, {
                availableBeds: increment(-1),
                lastAssigned: serverTimestamp(),
              });
            }
          }
        }

        // Update tag if assigned
        if (tagAssignment) {
          const tagRef = doc(db, "tags", tagAssignment.tagId);
          const latestTagSnap = await transaction.get(tagRef);
          if (latestTagSnap.exists()) {
            const latestTag = latestTagSnap.data() as any;
            if (!latestTag.isAssigned) {
              transaction.update(tagRef, {
                isAssigned: true,
                assignedUserId: userRef.id,
                assignedAt: serverTimestamp(),
              });
            }
          }
        }

        return {
          userRef,
          userData: finalUserData,
          roomAssignment,
          tagAssignment,
          pendingAssignments: {
            room: !roomAssignment,
            tag: !tagAssignment,
          },
        };
      });

      return {
        success: true,
        userData: result.userData,
        roomAssignment: result.roomAssignment,
        tagAssignment: result.tagAssignment,
        pendingAssignments: result.pendingAssignments,
      };

    } catch (error: any) {
      lastError = error.message;
      console.error(`Registration attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        return {
          success: false,
          error: lastError,
        };
      }
    }
  }

  return {
    success: false,
    error: lastError,
  };
}

async function findAndReserveRoom(transaction: any, gender: string): Promise<RoomAssignment | null> {
  const roomsQuery = query(
    collection(db, "rooms"),
    where("gender", "==", gender)
  );
  const roomsSnapshot = await getDocs(roomsQuery);
  
  // Sort rooms by occupancy priority:
  // 1. Rooms that are partially filled (not empty, not full) - highest priority
  // 2. Empty rooms - medium priority  
  // 3. Full rooms - lowest priority (shouldn't be selected anyway)
  const sortedRooms = roomsSnapshot.docs
    .map(doc => ({ doc, data: doc.data() }))
    .filter(({ data }) => data.availableBeds > 0) // Only rooms with available beds
    .sort((a, b) => {
      const aOccupancy = a.data.totalBeds - a.data.availableBeds; // Occupied beds
      const bOccupancy = b.data.totalBeds - b.data.availableBeds; // Occupied beds
      
      // Prioritize rooms with more occupants (room completion strategy)
      if (aOccupancy !== bOccupancy) {
        return bOccupancy - aOccupancy; // Higher occupancy first
      }
      
      // If same occupancy, prioritize by room number for consistency
      return a.data.roomNumber.localeCompare(b.data.roomNumber);
    });
  
  // Return the first available room (highest priority)
  if (sortedRooms.length > 0) {
    const { doc: roomDoc, data: roomData } = sortedRooms[0];
    return {
      roomId: roomDoc.id,
      roomNumber: roomData.roomNumber,
      wing: roomData.wing,
    };
  }
  
  return null;
}

async function findAndReserveTag(transaction: any): Promise<TagAssignment | null> {
  const tagsQuery = query(
    collection(db, "tags"),
    where("isAssigned", "==", false)
  );
  const tagsSnapshot = await getDocs(tagsQuery);
  
  if (tagsSnapshot.empty) {
    return null;
  }
  
  // Sort tags by tag number to ensure sequential assignment (001, 002, 003, etc.)
  const sortedTags = tagsSnapshot.docs
    .map(doc => ({ doc, data: doc.data() }))
    .sort((a, b) => {
      // Extract numeric part from tag number for proper sorting
      const aNum = parseInt(a.data.tagNumber.replace(/\D/g, '')) || 0;
      const bNum = parseInt(b.data.tagNumber.replace(/\D/g, '')) || 0;
      return aNum - bNum; // Ascending order (001, 002, 003...)
    });
  
  const tagDoc = sortedTags[0].doc;
  const tag = sortedTags[0].data;
  
  return {
    tagId: tagDoc.id,
    tagNumber: tag.tagNumber,
  };
}

/**
 * Monitors for available resources and assigns them to pending users
 */
export function startPendingAssignmentMonitor() {
  // Monitor for available rooms
  const roomsUnsubscribe = onSnapshot(
    query(collection(db, "rooms")),
    async (roomsSnapshot) => {
      const availableRooms = roomsSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.availableBeds > 0;
      });

      if (availableRooms.length > 0) {
        await assignPendingRooms(availableRooms);
      }
    }
  );

  // Monitor for available tags
  const tagsUnsubscribe = onSnapshot(
    query(collection(db, "tags"), where("isAssigned", "==", false)),
    async (tagsSnapshot) => {
      if (tagsSnapshot.size > 0) {
        await assignPendingTags(tagsSnapshot.docs);
      }
    }
  );

  return () => {
    roomsUnsubscribe();
    tagsUnsubscribe();
  };
}

async function assignPendingRooms(availableRooms: any[]) {
  try {
    // Get users with pending room assignments
    const pendingUsersQuery = query(
      collection(db, "users"),
      where("roomStatus", "==", "pending")
    );
    const pendingUsersSnapshot = await getDocs(pendingUsersQuery);
    
    // Group pending users by gender
    const pendingUsersByGender = pendingUsersSnapshot.docs.reduce((acc, doc) => {
      const userData = doc.data();
      const gender = userData.gender;
      if (!acc[gender]) {
        acc[gender] = [];
      }
      acc[gender].push(doc);
      return acc;
    }, {} as Record<string, any[]>);
    
    // Process each gender group separately
    for (const [gender, userDocs] of Object.entries(pendingUsersByGender)) {
      // Filter and sort rooms for this gender using room-completion strategy
      const suitableRooms = availableRooms
        .filter(room => room.data().gender === gender && room.data().availableBeds > 0)
        .sort((a, b) => {
          const aOccupancy = a.data().totalBeds - a.data().availableBeds; // Occupied beds
          const bOccupancy = b.data().totalBeds - b.data().availableBeds; // Occupied beds
          
          // Prioritize rooms with more occupants (room completion strategy)
          if (aOccupancy !== bOccupancy) {
            return bOccupancy - aOccupancy; // Higher occupancy first
          }
          
          // If same occupancy, prioritize by room number for consistency
          return a.data().roomNumber.localeCompare(b.data().roomNumber);
        });
      
      // Assign users to rooms using room-completion strategy
      for (const userDoc of userDocs) {
        const suitableRoom = suitableRooms.find(room => room.data().availableBeds > 0);
        
        if (suitableRoom) {
          await runTransaction(db, async (transaction) => {
            const roomRef = doc(db, "rooms", suitableRoom.id);
            const roomSnap = await transaction.get(roomRef);
            
            if (roomSnap.exists()) {
              const roomData = roomSnap.data();
              if (roomData.availableBeds > 0) {
                // Update room
                transaction.update(roomRef, {
                  availableBeds: increment(-1),
                  lastAssigned: serverTimestamp(),
                });
                
                // Generate bed number using room's bed numbers if available
                let bedNumber = generateBedNumber(roomData.roomNumber);
                if (roomData.bedNumbers && roomData.bedNumbers.length > 0) {
                  const availableBedIndex = roomData.totalBeds - roomData.availableBeds;
                  bedNumber = roomData.bedNumbers[availableBedIndex] || generateBedNumber(roomData.roomNumber);
                }
                
                // Update user
                transaction.update(userDoc.ref, {
                  roomNumber: roomData.roomNumber,
                  bedNumber: bedNumber,
                  wing: roomData.wing,
                  roomStatus: "assigned",
                  updatedAt: serverTimestamp(),
                });
              }
            }
          });
        }
      }
    }
  } catch (error) {
    console.error("Error assigning pending rooms:", error);
  }
}

async function assignPendingTags(availableTags: any[]) {
  try {
    // Get users with pending tag assignments
    const pendingUsersQuery = query(
      collection(db, "users"),
      where("tagStatus", "==", "pending")
    );
    const pendingUsersSnapshot = await getDocs(pendingUsersQuery);
    
    // Sort available tags by tag number to ensure sequential assignment
    const sortedTags = availableTags
      .map(tag => ({ tag, data: tag.data() }))
      .sort((a, b) => {
        // Extract numeric part from tag number for proper sorting
        const aNum = parseInt(a.data.tagNumber.replace(/\D/g, '')) || 0;
        const bNum = parseInt(b.data.tagNumber.replace(/\D/g, '')) || 0;
        return aNum - bNum; // Ascending order (001, 002, 003...)
      });
    
    for (let i = 0; i < Math.min(pendingUsersSnapshot.size, sortedTags.length); i++) {
      const userDoc = pendingUsersSnapshot.docs[i];
      const tagDoc = sortedTags[i].tag;
      
      await runTransaction(db, async (transaction) => {
        const tagRef = doc(db, "tags", tagDoc.id);
        const tagSnap = await transaction.get(tagRef);
        
        if (tagSnap.exists()) {
          const tagData = tagSnap.data();
          if (!tagData.isAssigned) {
            // Update tag
            transaction.update(tagRef, {
              isAssigned: true,
              assignedUserId: userDoc.id,
              assignedAt: serverTimestamp(),
            });
            
            // Update user
            transaction.update(userDoc.ref, {
              tagNumber: tagData.tagNumber,
              tagStatus: "assigned",
              updatedAt: serverTimestamp(),
            });
          }
        }
      });
    }
  } catch (error) {
    console.error("Error assigning pending tags:", error);
  }
}

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
