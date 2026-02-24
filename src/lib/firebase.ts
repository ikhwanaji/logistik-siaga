
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getFirestore,
  Firestore,
  connectFirestoreEmulator,
} from "firebase/firestore";
import {
  getStorage,
  FirebaseStorage,
  connectStorageEmulator,
} from "firebase/storage";
import { getAuth, Auth, connectAuthEmulator } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// ─── Config (from .env.local) ─────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// ─── Singleton pattern (safe for Next.js HMR) ────────────────────────────────
const app: FirebaseApp = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

const db: Firestore      = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);
const auth: Auth         = getAuth(app);

// ─── Local Emulator (dev only) ───────────────────────────────────────────────
// Uncomment when running: firebase emulators:start
//
// if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
//   connectFirestoreEmulator(db, "localhost", 8080);
//   connectStorageEmulator(storage, "localhost", 9199);
//   connectAuthEmulator(auth, "http://localhost:9099");
// }
const analytics = getAnalytics(app);

export { app, db, storage, auth };
