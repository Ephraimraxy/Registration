import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCvXKDXftrZMC9iujtEMs8WfGsmLTSDjis",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "test-83215.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://test-83215-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "test-83215",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "test-83215.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "454218401506",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:454218401506:web:e2af14afd147360d4fc0bb",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-QL1BJG7KLW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Analytics (only in production)
let analytics: any = null;
if (typeof window !== 'undefined' && import.meta.env.PROD) {
  analytics = getAnalytics(app);
}

export { analytics };
export default app;
