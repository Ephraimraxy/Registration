// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, doc, setDoc, getDocs, query, where, Timestamp, addDoc } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { initializeSampleData } from "./db-init";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with long polling to avoid QUIC/proxy issues
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
});

// Initialize Analytics
export const analytics = getAnalytics(app);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Database initialization utilities
export const initializeDatabase = async () => {
  try {
    console.log("Initializing database collections...");
    
    // Ensure all collections exist
    await Promise.all([
      ensureCollectionExists("users"),
      ensureCollectionExists("rooms"),
      ensureCollectionExists("tags"),
      ensureCollectionExists("admin"),
      ensureCollectionExists("specializations"),
      ensureCollectionExists("accessLinks")
    ]);
    
    // Create initial admin document
    await createInitialAdminDocument();
    
    // Initialize default specializations
    await initializeDefaultSpecializations();
    
    // Note: Sample data is not created by default
    // Use initializeSampleData(true) to create sample data if needed
    
    console.log("Database initialization completed successfully!");
    return true;
  } catch (error) {
    console.error("Database initialization failed:", error);
    return false;
  }
};

const ensureCollectionExists = async (collectionName: string) => {
  try {
    // Just check if collection exists, don't create placeholder documents
    const collectionRef = collection(db, collectionName);
    await getDocs(collectionRef);
    console.log(`Collection ${collectionName} is accessible`);
  } catch (error) {
    console.error(`Error accessing collection ${collectionName}:`, error);
  }
};

const createInitialAdminDocument = async () => {
  try {
    const adminRef = doc(db, "admin", "stats");
    const adminSnapshot = await getDocs(query(collection(db, "admin"), where("__name__", "==", "stats")));
    
    if (adminSnapshot.empty) {
      await setDoc(adminRef, {
        totalStudents: 0,
        availableRooms: 0,
        assignedTags: 0,
        availableTags: 0,
        lastUpdated: Timestamp.now(),
        systemInitialized: true,
      });
      console.log("Initial admin document created");
    }
  } catch (error) {
    console.error("Error creating initial admin document:", error);
  }
};

const initializeDefaultSpecializations = async () => {
  try {
    const specializationsRef = collection(db, "specializations");
    const existingSnapshot = await getDocs(specializationsRef);
    
    // Only add if collection is empty
    if (existingSnapshot.empty) {
      const defaultSpecializations = [
        {
          name: "Field Crop Production (Rice, maize Mechanization, etc)",
          description: "Crop production including rice, maize, and mechanization",
          createdAt: Timestamp.now(),
        },
        {
          name: "Vegetable Production in Green house Hydroponics and Open Field",
          description: "Vegetable production using greenhouse, hydroponics, and open field methods",
          createdAt: Timestamp.now(),
        },
        {
          name: "Catfish Farming",
          description: "Aquaculture focusing on catfish production",
          createdAt: Timestamp.now(),
        },
        {
          name: "Poultry Production (Broilers, Layers, Ruminant and Chicken Processing)",
          description: "Poultry production including broilers, layers, ruminant, and chicken processing",
          createdAt: Timestamp.now(),
        },
        {
          name: "Value Addition",
          description: "Value addition and processing of agricultural products",
          createdAt: Timestamp.now(),
        },
      ];
      
      for (const spec of defaultSpecializations) {
        await addDoc(specializationsRef, spec);
      }
      
      console.log("Default specializations initialized");
    }
  } catch (error) {
    console.error("Error initializing default specializations:", error);
  }
};

// Validation utilities
export const validateRegistrationData = (data: any) => {
  const errors: string[] = [];
  
  // Required field validation
  const requiredFields = [
    { field: 'firstName', message: 'First name is required' },
    { field: 'surname', message: 'Surname is required' },
    { field: 'dob', message: 'Date of birth is required' },
    { field: 'gender', message: 'Gender is required' },
    { field: 'phone', message: 'Phone number is required' },
    { field: 'stateOfOrigin', message: 'State of origin is required' },
    { field: 'lga', message: 'LGA is required' }
  ];
  
  requiredFields.forEach(({ field, message }) => {
    if (!data[field]?.trim()) errors.push(message);
  });
  
  // Format validation (only if provided)
  if (data.email && data.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push("Invalid email format");
  }
  
  if (data.nin && data.nin.trim() && !/^\d{11}$/.test(data.nin)) {
    errors.push("NIN must be exactly 11 digits");
  }
  
  if (data.phone && !/^[0-9]{10,11}$/.test(data.phone.replace(/\D/g, ''))) {
    errors.push("Phone number must be 10-11 digits");
  }
  
  if (data.dob && new Date(data.dob) > new Date()) {
    errors.push("Date of birth cannot be in the future");
  }
  
  if (data.gender && !["Male", "Female"].includes(data.gender)) {
    errors.push("Gender must be either Male or Female");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Real-time admin stats update
export const updateAdminStats = async () => {
  try {
    console.log("Starting admin stats update...");
    const [usersSnapshot, roomsSnapshot, tagsSnapshot] = await Promise.all([
      getDocs(collection(db, "users")),
      getDocs(collection(db, "rooms")),
      getDocs(collection(db, "tags"))
    ]);
    
    const stats = {
      totalStudents: usersSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.firstName && data.surname && data.email && !data._placeholder;
      }).length,
      availableRooms: roomsSnapshot.docs.filter(doc => doc.data().availableBeds > 0).length,
      assignedTags: tagsSnapshot.docs.filter(doc => doc.data().isAssigned).length,
      availableTags: tagsSnapshot.docs.filter(doc => !doc.data().isAssigned).length,
    };
    
    console.log("Calculated stats:", stats);
    
    const adminRef = doc(db, "admin", "stats");
    await setDoc(adminRef, {
      ...stats,
      lastUpdated: Timestamp.now(),
    }, { merge: true });
    
    console.log("Admin stats document updated successfully");
    return stats;
  } catch (error) {
    console.error("Error updating admin stats:", error);
    throw error;
  }
};

export default app;
