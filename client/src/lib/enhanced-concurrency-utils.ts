import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  runTransaction, 
  writeBatch,
  Timestamp,
  serverTimestamp,
  increment
} from "firebase/firestore";
import { db } from "./firebase";

export interface RoomAssignment {
  roomId: string;
  roomNumber: string;
  wing: string;
  gender: string;
  availableBeds: number;
  bedNumber?: string; // Optional - for individual bed assignment
}

export interface TagAssignment {
  tagId: string;
  tagNumber: string;
  isAssigned: boolean;
}

export interface RegistrationResult {
  success: boolean;
  userData?: any;
  error?: string;
  roomAssignment?: RoomAssignment;
  tagAssignment?: TagAssignment;
}

/**
 * Enhanced room and tag assignment that supports both:
 * 1. Simple bed counting (current system)
 * 2. Individual bed number assignment (new feature)
 */
export async function safeAssignRoomAndTag(
  userData: any,
  maxRetries: number = 3
): Promise<RegistrationResult> {
  let lastError: string = "";
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await runTransaction(db, async (transaction) => {
        // Step 1: Find and reserve a room atomically
        const roomAssignment = await findAndReserveRoom(transaction, userData.gender);
        if (!roomAssignment) {
          throw new Error(`No available rooms for ${userData.gender} students`);
        }

        // Step 2: Find and reserve a tag atomically
        const tagAssignment = await findAndReserveTag(transaction);
        if (!tagAssignment) {
          throw new Error("No available tags");
        }

        // Step 3: Validate user data before creating
        if (!userData.firstName || !userData.surname || !userData.email || !userData.phone) {
          throw new Error("Invalid user data: missing required fields");
        }

        // Step 4: Create user with assignments
        const userRef = doc(collection(db, "users"));
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
          roomNumber: roomAssignment.roomNumber,
          bedNumber: roomAssignment.bedNumber, // Include bed number if available
          tagNumber: tagAssignment.tagNumber,
          wing: roomAssignment.wing,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        // Step 5: Execute all operations atomically
        const roomRef = doc(db, "rooms", roomAssignment.roomId);
        const latestRoomSnap = await transaction.get(roomRef);
        if (!latestRoomSnap.exists()) {
          throw new Error("Selected room no longer exists");
        }
        const latestRoom = latestRoomSnap.data() as any;
        if ((latestRoom.availableBeds ?? 0) <= 0) {
          throw new Error("Selected room just became full. Please retry.");
        }

        // Verify tag still unassigned at commit time
        const tagRef = doc(db, "tags", tagAssignment.tagId);
        const latestTagSnap = await transaction.get(tagRef);
        if (!latestTagSnap.exists()) {
          throw new Error("Selected tag no longer exists");
        }
        const latestTag = latestTagSnap.data() as any;
        if (latestTag.isAssigned) {
          throw new Error("Selected tag was just assigned. Please retry.");
        }

        // Apply updates
        transaction.set(userRef, finalUserData);
        
        // Update room - handle both simple and detailed bed tracking
        if (latestRoom.beds && Array.isArray(latestRoom.beds)) {
          // Individual bed tracking - find and mark specific bed as occupied
          const bedIndex = latestRoom.beds.findIndex((bed: any) => 
            bed.bedNumber === roomAssignment.bedNumber && !bed.isOccupied
          );
          
          if (bedIndex === -1) {
            throw new Error("Selected bed is no longer available");
          }
          
          // Update the specific bed
          const updatedBeds = [...latestRoom.beds];
          updatedBeds[bedIndex] = {
            ...updatedBeds[bedIndex],
            isOccupied: true,
            assignedUserId: userRef.id,
            assignedAt: serverTimestamp(),
          };
          
          transaction.update(roomRef, {
            availableBeds: increment(-1),
            beds: updatedBeds,
            lastAssigned: serverTimestamp(),
          });
        } else {
          // Simple bed counting - just decrement available beds
          transaction.update(roomRef, {
            availableBeds: increment(-1),
            lastAssigned: serverTimestamp(),
          });
        }
        
        transaction.update(tagRef, {
          isAssigned: true,
          assignedUserId: userRef.id,
          assignedAt: serverTimestamp(),
        });

        return {
          userRef,
          userData: finalUserData,
          roomAssignment,
          tagAssignment,
        };
      });

      return {
        success: true,
        userData: result.userData,
        roomAssignment: result.roomAssignment,
        tagAssignment: result.tagAssignment,
      };

    } catch (error: any) {
      lastError = error.message;
      console.warn(`Registration attempt ${attempt} failed:`, error.message);
      
      // If this is the last attempt, return the error
      if (attempt === maxRetries) {
        return {
          success: false,
          error: lastError,
        };
      }
      
      // Wait a bit before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
    }
  }

  return {
    success: false,
    error: lastError,
  };
}

/**
 * Enhanced room finding that supports both individual bed numbers and simple counting
 */
async function findAndReserveRoom(
  transaction: any, 
  gender: string
): Promise<RoomAssignment | null> {
  // Query for rooms with available beds for the specific gender
  const roomsQuery = query(
    collection(db, "rooms"),
    where("gender", "==", gender)
  );
  
  const roomsSnapshot = await getDocs(roomsQuery);
  
  if (roomsSnapshot.empty) {
    return null;
  }

  // Find the first room with available beds
  for (const roomDoc of roomsSnapshot.docs) {
    const roomData = roomDoc.data();
    
    // Double-check availability within transaction
    if (roomData.availableBeds > 0) {
      let bedNumber: string | undefined;
      
      // If individual beds are tracked, find the first available bed
      if (roomData.beds && Array.isArray(roomData.beds)) {
        const availableBed = roomData.beds.find((bed: any) => !bed.isOccupied);
        if (availableBed) {
          bedNumber = availableBed.bedNumber;
        } else {
          // No available beds in this room, skip
          continue;
        }
      }
      
      return {
        roomId: roomDoc.id,
        roomNumber: roomData.roomNumber,
        wing: roomData.wing,
        gender: roomData.gender,
        availableBeds: roomData.availableBeds,
        bedNumber: bedNumber, // Will be undefined for simple bed counting
      };
    }
  }

  return null;
}

/**
 * Finds and reserves a tag atomically within a transaction
 */
async function findAndReserveTag(transaction: any): Promise<TagAssignment | null> {
  // Query for unassigned tags
  const tagsQuery = query(
    collection(db, "tags"),
    where("isAssigned", "==", false)
  );
  
  const tagsSnapshot = await getDocs(tagsQuery);
  
  if (tagsSnapshot.empty) {
    return null;
  }

  // Sort tags by tagNumber to ensure serial assignment
  const availableTags = tagsSnapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(tag => !tag.isAssigned)
    .sort((a, b) => a.tagNumber.localeCompare(b.tagNumber, undefined, { numeric: true }));

  if (availableTags.length === 0) {
    return null;
  }

  // Get the first available tag (lowest number)
  const tag = availableTags[0];
  
  return {
    tagId: tag.id,
    tagNumber: tag.tagNumber,
    isAssigned: tag.isAssigned,
  };
}

/**
 * Validates room and tag availability before starting registration
 * Enhanced to support both bed tracking methods
 */
export async function validateAvailability(gender: string): Promise<{
  hasAvailableRooms: boolean;
  hasAvailableTags: boolean;
  availableRoomCount: number;
  availableTagCount: number;
  availableBeds: Array<{ roomNumber: string; bedNumber?: string; wing: string }>;
}> {
  try {
    // Check room availability
    const roomsQuery = query(
      collection(db, "rooms"),
      where("gender", "==", gender)
    );
    const roomsSnapshot = await getDocs(roomsQuery);
    
    let availableRoomCount = 0;
    const availableBeds: Array<{ roomNumber: string; bedNumber?: string; wing: string }> = [];
    
    for (const roomDoc of roomsSnapshot.docs) {
      const roomData = roomDoc.data();
      if (roomData.availableBeds > 0) {
        availableRoomCount += roomData.availableBeds;
        
        // If individual beds are tracked, list them
        if (roomData.beds && Array.isArray(roomData.beds)) {
          const freeBeds = roomData.beds
            .filter((bed: any) => !bed.isOccupied)
            .map((bed: any) => ({
              roomNumber: roomData.roomNumber,
              bedNumber: bed.bedNumber,
              wing: roomData.wing,
            }));
          availableBeds.push(...freeBeds);
        } else {
          // Simple counting - just add the room
          availableBeds.push({
            roomNumber: roomData.roomNumber,
            wing: roomData.wing,
          });
        }
      }
    }

    // Check tag availability
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
      availableBeds,
    };
  } catch (error) {
    console.error("Error validating availability:", error);
    return {
      hasAvailableRooms: false,
      hasAvailableTags: false,
      availableRoomCount: 0,
      availableTagCount: 0,
      availableBeds: [],
    };
  }
}

/**
 * Gets real-time statistics for the admin dashboard
 * Enhanced to show individual bed information when available
 */
export async function getRegistrationStats(): Promise<{
  totalUsers: number;
  totalRooms: number;
  totalTags: number;
  availableRooms: number;
  availableTags: number;
  maleRooms: number;
  femaleRooms: number;
  maleUsers: number;
  femaleUsers: number;
  detailedBedInfo: boolean; // Whether individual beds are tracked
  totalBeds: number;
  occupiedBeds: number;
}> {
  try {
    // Get all collections
    const [usersSnapshot, roomsSnapshot, tagsSnapshot] = await Promise.all([
      getDocs(collection(db, "users")),
      getDocs(collection(db, "rooms")),
      getDocs(collection(db, "tags")),
    ]);

    const users = usersSnapshot.docs.map(doc => doc.data());
    const rooms = roomsSnapshot.docs.map(doc => doc.data());
    const tags = tagsSnapshot.docs.map(doc => doc.data());

    // Calculate statistics
    const totalUsers = users.length;
    const totalRooms = rooms.length;
    const totalTags = tags.length;

    const availableRooms = rooms.reduce((sum, room) => sum + (room.availableBeds || 0), 0);
    const availableTags = tags.filter(tag => !tag.isAssigned).length;

    const maleRooms = rooms.filter(room => room.gender === 'Male').length;
    const femaleRooms = rooms.filter(room => room.gender === 'Female').length;

    const maleUsers = users.filter(user => user.gender === 'Male').length;
    const femaleUsers = users.filter(user => user.gender === 'Female').length;

    // Check if detailed bed tracking is used
    const detailedBedInfo = rooms.some(room => room.beds && Array.isArray(room.beds));
    
    // Calculate bed statistics
    let totalBeds = 0;
    let occupiedBeds = 0;
    
    if (detailedBedInfo) {
      rooms.forEach(room => {
        if (room.beds && Array.isArray(room.beds)) {
          totalBeds += room.beds.length;
          occupiedBeds += room.beds.filter((bed: any) => bed.isOccupied).length;
        }
      });
    } else {
      totalBeds = rooms.reduce((sum, room) => sum + (room.totalBeds || 0), 0);
      occupiedBeds = totalBeds - availableRooms;
    }

    return {
      totalUsers,
      totalRooms,
      totalTags,
      availableRooms,
      availableTags,
      maleRooms,
      femaleRooms,
      maleUsers,
      femaleUsers,
      detailedBedInfo,
      totalBeds,
      occupiedBeds,
    };
  } catch (error) {
    console.error("Error getting registration stats:", error);
    return {
      totalUsers: 0,
      totalRooms: 0,
      totalTags: 0,
      availableRooms: 0,
      availableTags: 0,
      maleRooms: 0,
      femaleRooms: 0,
      maleUsers: 0,
      femaleUsers: 0,
      detailedBedInfo: false,
      totalBeds: 0,
      occupiedBeds: 0,
    };
  }
}
