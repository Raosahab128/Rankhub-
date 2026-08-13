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
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";

import {
  setLogLevel,
  initializeFirestore,
  query,
  where,
  orderBy,
  limit,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  addDoc
} from "firebase/firestore";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "firebase/storage";


// ============================================================
// FIRESTORE CONNECTION WARNING SUPPRESSION
// ============================================================

// Firestore offline/connection warnings को suppress करता है
// ताकि preview में unnecessary error overlay न आए।

const originalConsoleError = console.error;

console.error = function (...args) {
  const isFirestoreError = args.some((arg) => {

    if (typeof arg === "string") {
      return (
        arg.includes(
          "Could not reach Cloud Firestore backend"
        ) ||
        arg.includes("[code=unavailable]")
      );
    }

    if (arg instanceof Error) {
      return (
        arg.message.includes(
          "Could not reach Cloud Firestore backend"
        ) ||
        arg.message.includes("[code=unavailable]")
      );
    }

    return false;
  });

  if (isFirestoreError) {
    return;
  }

  originalConsoleError.apply(console, args);
};


// ============================================================
// FIREBASE CONFIGURATION
// ============================================================

// Firebase configuration environment variables से आती है।

const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY,

  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,

  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID,

  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,

  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,

  appId:
    import.meta.env.VITE_FIREBASE_APP_ID,

  measurementId:
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};


// ============================================================
// ENVIRONMENT VARIABLE VALIDATION
// ============================================================

const requiredEnvVars = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID"
];

requiredEnvVars.forEach((key) => {

  if (!import.meta.env[key]) {
    throw new Error(
      `Firebase configuration is missing: ${key}. Check your environment variables.`
    );
  }

});


// ============================================================
// FIREBASE INITIALIZATION
// ============================================================

// Firebase को केवल एक बार initialize करता है।

const app =
  !getApps().length
    ? initializeApp(firebaseConfig)
    : getApps()[0];


// ============================================================
// FIREBASE SERVICES
// ============================================================

// Authentication
export const auth = getAuth(app);


// Firestore
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true
  }
);


// Firebase Storage
export const storage = getStorage(app);


// ============================================================
// CHECK PHONE EXISTS
// ============================================================

/**
 * Check करता है कि mobile number पहले से users collection
 * में मौजूद है या नहीं।
 */
export async function checkPhoneExists(
  mobileNumber
) {
  try {

    const usersRef =
      collection(db, "users");

    const q =
      query(
        usersRef,
        where(
          "mobile",
          "==",
          mobileNumber
        )
      );

    const querySnapshot =
      await getDocs(q);

    return !querySnapshot.empty;

  } catch (error) {

    console.error(
      "Error checking phone uniqueness:",
      error
    );

    return false;
  }
}


// ============================================================
// FIREBASE AUTH + FIRESTORE + STORAGE EXPORTS
// ============================================================

export {
  // Authentication
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword,

  // IMPORTANT:
  // signup.html में updateProfile इस्तेमाल होता है।
  updateProfile,

  GoogleAuthProvider,
  signInWithPopup,

  // Firestore
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

  // Storage
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
};


// ============================================================
// FIRESTORE LOG LEVEL
// ============================================================

// Firestore connection warnings को silent करता है।

setLogLevel("silent");


// ============================================================
// GET CURRENT USER
// ============================================================

/**
 * Current Firebase user को safely return करता है।
 *
 * localStorage पर depend नहीं करता।
 */
export const getCurrentUser = () => {

  return new Promise((resolve) => {

    const unsubscribe =
      onAuthStateChanged(
        auth,
        (user) => {

          unsubscribe();

          resolve(user);
        }
      );

  });

};
