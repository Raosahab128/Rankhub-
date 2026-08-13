/*
 * RankHub Firebase Configuration
 * Firebase Authentication, Firestore और Storage
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
  updateProfile as firebaseUpdateProfile,
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

/* ============================================================
   FIREBASE CONFIGURATION
============================================================ */

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

/* ============================================================
   ENVIRONMENT VALIDATION
============================================================ */

const requiredEnvVars = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID"
];

for (const key of requiredEnvVars) {
  if (!import.meta.env[key]) {
    throw new Error(
      `Firebase configuration is missing: ${key}. Check your environment variables.`
    );
  }
}

/* ============================================================
   FIREBASE APP
============================================================ */

const app = getApps().length
  ? getApps()[0]
  : initializeApp(firebaseConfig);

/* ============================================================
   FIREBASE SERVICES
============================================================ */

export const auth = getAuth(app);

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});

export const storage = getStorage(app);

/* ============================================================
   CHECK PHONE EXISTS
============================================================ */

export async function checkPhoneExists(mobileNumber) {
  try {
    if (!mobileNumber) {
      return false;
    }

    const usersRef = collection(db, "users");

    const phoneQuery = query(
      usersRef,
      where("mobile", "==", mobileNumber)
    );

    const snapshot = await getDocs(phoneQuery);

    return !snapshot.empty;
  } catch (error) {
    console.error(
      "Error checking phone uniqueness:",
      error
    );

    return false;
  }
}

/* ============================================================
   AUTH EXPORTS
============================================================ */

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword,
  GoogleAuthProvider,
  signInWithPopup,
  firebaseUpdateProfile as updateProfile
};

/* ============================================================
   FIRESTORE EXPORTS
============================================================ */

export {
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
  addDoc
};

/* ============================================================
   STORAGE EXPORTS
============================================================ */

export {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
};

/* ============================================================
   CURRENT USER
============================================================ */

export function getCurrentUser() {
  return new Promise((resolve) => {
    let unsubscribe = null;

    unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (unsubscribe) {
          unsubscribe();
        }

        resolve(user);
      }
    );
  });
}

/* ============================================================
   FIRESTORE LOG LEVEL
============================================================ */

setLogLevel("silent");
