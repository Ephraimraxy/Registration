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
          bedNumber: null, // Will be assigned later if needed
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
  
  for (const roomDoc of roomsSnapshot.docs) {
    const roomData = roomDoc.data();
    if (roomData.availableBeds > 0) {
      return {
        roomId: roomDoc.id,
        roomNumber: roomData.roomNumber,
        wing: roomData.wing,
      };
    }
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
  
  const tagDoc = tagsSnapshot.docs[0];
  const tag = tagDoc.data();
  
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
    
    for (const userDoc of pendingUsersSnapshot.docs) {
      const userData = userDoc.data();
      
      // Find a room for this user's gender
      const suitableRoom = availableRooms.find(room => 
        room.data().gender === userData.gender && room.data().availableBeds > 0
      );
      
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
              
              // Update user
              transaction.update(userDoc.ref, {
                roomNumber: roomData.roomNumber,
                wing: roomData.wing,
                roomStatus: "assigned",
                updatedAt: serverTimestamp(),
              });
            }
          }
        });
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
    
    for (let i = 0; i < Math.min(pendingUsersSnapshot.size, availableTags.length); i++) {
      const userDoc = pendingUsersSnapshot.docs[i];
      const tagDoc = availableTags[i];
      
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
