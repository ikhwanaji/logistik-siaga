import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  AuthError
} from "firebase/auth";
import { doc, addDoc, updateDoc, increment, getDoc, setDoc, serverTimestamp, collection, } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { UserProfile } from "@/types";
import { useAppStore } from "@/store/useAppStore";

const googleProvider = new GoogleAuthProvider();
type UserActionType = 'create_report' | 'fulfill_donation' | 'verify_report';

// ─── ERROR HANDLING HELPER ───────────────────────────────────────────────────
// Mengubah kode error Firebase yang teknis menjadi pesan bahasa Indonesia
export function getAuthErrorMessage(error: AuthError): string {
  switch (error.code) {
    case "auth/invalid-email":
      return "Format email tidak valid.";
    case "auth/user-disabled":
      return "Akun ini telah dinonaktifkan.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Email atau password salah.";
    case "auth/email-already-in-use":
      return "Email sudah terdaftar. Silakan login.";
    case "auth/weak-password":
      return "Password terlalu lemah (min. 6 karakter).";
    case "auth/too-many-requests":
      return "Terlalu banyak percobaan gagal. Coba lagi nanti.";
    default:
      return "Terjadi kesalahan sistem. Coba lagi.";
  }
}

// ─── AUTH ACTIONS ────────────────────────────────────────────────────────────

// 1. REGISTER EMAIL & PASSWORD
export async function registerWithEmail(email: string, pass: string, name: string) {
  // A. Buat akun di Authentication
  const result = await createUserWithEmailAndPassword(auth, email, pass);
  const user = result.user;

  // B. Update Display Name di Auth Profile
  await updateProfile(user, { displayName: name });

  // C. Buat dokumen User di Firestore (PENTING: Agar role & points tersimpan)
  const newUser: UserProfile = {
    uid: user.uid,
    displayName: name,
    email: user.email || "",
    photoURL: "", // User email biasanya belum ada foto
    role: "user",
    points: 0,
    badges: ["Relawan Baru"],
    createdAt: new Date(),
  };

  await setDoc(doc(db, "users", user.uid), {
    ...newUser,
    createdAt: serverTimestamp()
  });

  return user;
}

// 2. LOGIN EMAIL & PASSWORD
export async function loginWithEmail(email: string, pass: string) {
  const result = await signInWithEmailAndPassword(auth, email, pass);
  return result.user;
}

// 3. GOOGLE LOGIN (Existing)
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const newUser: UserProfile = {
        uid: user.uid,
        displayName: user.displayName || "Pengguna Baru",
        email: user.email || "",
        photoURL: user.photoURL || "",
        role: "user",
        points: 0,
        badges: ["Relawan Baru"],
        createdAt: new Date(),
      };
      
      await setDoc(userRef, {
        ...newUser,
        createdAt: serverTimestamp() 
      });
    }
    return true;
  } catch (error) {
    throw error;
  }
}

// 4. RESET PASSWORD
export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email);
}

// 5. LOGOUT
export async function signOut() {
  await firebaseSignOut(auth);
  useAppStore.getState().setCurrentUser(null);
}

// 6. LISTENER (Session)
export function initAuthListener() {
  onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        useAppStore.getState().setCurrentUser(userData);
      } else {
        // Fallback robust: jika user login tapi doc hilang, kembalikan object basic
        useAppStore.getState().setCurrentUser({
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || "User",
            email: firebaseUser.email || "",
            photoURL: firebaseUser.photoURL || "",
            role: "user",
            points: 0,
            badges: [],
            createdAt: new Date()
        });
      }
    } else {
      useAppStore.getState().setCurrentUser(null);
    }
  });
}

export async function updateUserStats(userId: string, action: UserActionType) {
  const userRef = doc(db, "users", userId);
  
  let pointsToAdd = 0;
  let fieldToIncrement = "";

  switch (action) {
    case 'create_report':
      pointsToAdd = 10;      // Lapor dapat 10 poin
      fieldToIncrement = "reportsCount"; // Asumsi Anda punya field ini nanti (opsional)
      break;
    case 'fulfill_donation': // Donasi selesai
      pointsToAdd = 50;      // Donasi dapat 50 poin
      fieldToIncrement = "donationsCount"; // Field statistik donasi
      break;
    case 'verify_report':
      pointsToAdd = 5;
      break;
  }

  try {
    // Update Atomic (Concurrency Safe)
    await updateDoc(userRef, {
      points: increment(pointsToAdd),
      // Jika Anda ingin menyimpan jumlah donasi di user profile:
      // [fieldToIncrement]: increment(1) 
    });
    
    // Update Local State (Zustand) agar UI berubah instan
    // (Anda perlu memanggil useAppStore.getState().setCurrentUser(...) di komponen UI)
    
    return true;
  } catch (error) {
    console.error("Gagal update stats user:", error);
    return false;
  }
}

// Fungsi baru untuk mencatat donasi uang
export async function recordMonetaryDonation(donationData: any) {
  try {
    await addDoc(collection(db, "monetary_donations"), {
      ...donationData,
      status: 'success', // Di production, ini awalnya 'pending' lalu diupdate webhook
      createdAt: serverTimestamp(),
    });
    
    // Update poin user (Misal: Rp 1.000 = 1 Poin)
    const pointsEarned = Math.floor(donationData.amount / 1000);
    await updateUserStats(donationData.userId, 'fulfill_donation'); // Reuse fungsi stats
    
    return pointsEarned;
  } catch (error) {
    console.error("Error recording donation:", error);
    throw error;
  }
}