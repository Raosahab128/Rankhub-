/*
 * RankHub Firebase Configuration
 * यह file Firebase को initialize करती है ताकि Authentication,
 * Firestore और Storage की services इस्तेमाल की जा सकें।
 */

import { initializeApp, getApps } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  sendPasswordResetEmail,
  updatePassword,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { setLogLevel, initializeFirestore, getFirestore, query, where, orderBy, limit, doc, getDoc, setDoc, updateDoc, collection, getDocs, addDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";


// Intercept and suppress Firestore offline/connection warnings to prevent preview error overlay
const originalConsoleError = console.error;
console.error = function(...args) {
  const isFirestoreError = args.some(arg => {
    if (typeof arg === 'string') return arg.includes('Could not reach Cloud Firestore backend') || arg.includes('[code=unavailable]');
    if (arg instanceof Error) return arg.message.includes('Could not reach Cloud Firestore backend') || arg.message.includes('[code=unavailable]');
    return false;
  });
  if (isFirestoreError) return;
  originalConsoleError.apply(console, args);
};

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validate configuration
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

requiredEnvVars.forEach((key) => {
  if (!import.meta.env[key]) {
    throw new Error(`Firebase configuration is missing: ${key}. Check your environment variables.`);
  }
});

// Initialize Firebase (prevent duplicate initialization)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Authentication, Firestore, और Storage services को export किया जाता है।
export const auth = getAuth(app);
export const db = initializeFirestore(app, { experimentalForceLongPolling: true });
export const storage = getStorage(app);

// Firestore से user का result history load करता है।
export async function checkPhoneExists(mobileNumber) {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('mobile', '==', mobileNumber));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking phone uniqueness:', error);
    return false; // Error assuming safe to proceed or should be handled
  }
}

export { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  sendPasswordResetEmail,
  updatePassword,
  GoogleAuthProvider,
  signInWithPopup,
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
};

// Suppress Firestore connection warnings in preview
setLogLevel("silent");

// Helper to get current user robustly without relying on localStorage
export const getCurrentUser = () => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};
