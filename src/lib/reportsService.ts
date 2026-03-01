import { collection, addDoc, updateDoc, doc, increment, serverTimestamp, query, orderBy, limit, getDocs, where, QueryConstraint, getDoc,arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FirestoreReport, Report, ReportSeverity, ReportType, AIAnalysisResult, GeoLocation } from '@/types';

// ─── Collection Reference ─────────────────────────────────────────────────────

const REPORTS_COL = 'reports';
const reportsRef = () => collection(db, REPORTS_COL);

// ─── CREATE ───────────────────────────────────────────────────────────────────

export interface SubmitReportPayload {
  aiResult: AIAnalysisResult;
  location: GeoLocation;
  imageUrl: string;
  reportedBy: string;
  description?: string;
}

export async function submitReport(payload: SubmitReportPayload): Promise<string> {
  const { aiResult, location, imageUrl, reportedBy, description } = payload;

  // 1. LOGIKA SKENARIO 2 (AI Score Threshold)
  // Jika Confidence > 85%, tampilkan langsung (isPublic = true).
  // Sisanya (termasuk < 50% atau ragu-ragu), sembunyikan (isPublic = false) menunggu Admin.
  const isHighConfidence = aiResult.confidence > 85;

  const newReport: Omit<FirestoreReport, 'id'> = {
    timestamp: serverTimestamp(),
    type: aiResult.type,
    severity: aiResult.severity,
    description: description ?? aiResult.description,
    location,
    imageUrl,

    // Status awal selalu pending, tapi visibilitas tergantung AI
    status: 'pending',

    // Field baru untuk Query Cepat di Homepage
    // True = Muncul di Home, False = Hanya muncul di Admin Dashboard
    isPublic: isHighConfidence,

    // Simpan skor asli untuk logika UI (Badge Kuning)
    aiConfidence: aiResult.confidence,

    voteCount: 0,
    reportedBy,
    needs: aiResult.needs,
  };

  const docRef = await addDoc(reportsRef(), newReport);
  return docRef.id;
}

// ─── UPDATE (PERAN ADMIN) ─────────────────────────────────────────────────────

export async function upvoteReport(reportId: string): Promise<void> {
  const docRef = doc(db, REPORTS_COL, reportId);
  await updateDoc(docRef, { voteCount: increment(1) });
}

/**
 * Skenario 3: Admin mengubah status jadi Verified.
 * Efek: Status 'verified' DAN paksa 'isPublic' jadi true (agar muncul di feed).
 */
export async function verifyReport(reportId: string): Promise<void> {
  const docRef = doc(db, REPORTS_COL, reportId);
  await updateDoc(docRef, {
    status: 'verified',
    isPublic: true, // Pastikan tampil public
  });
}

/**
 * Skenario 3: Admin menolak laporan (Hoax/Spam).
 * Efek: Status 'rejected' DAN 'isPublic' jadi false (hilang dari feed).
 */
export async function rejectReport(reportId: string): Promise<void> {
  const docRef = doc(db, REPORTS_COL, reportId);
  await updateDoc(docRef, {
    status: 'rejected',
    isPublic: false, // Sembunyikan/Shadow ban
  });
}

// ─── READ (Untuk SSR/SSG) ────────────────────────────────────────────

export async function fetchReports(options?: { maxItems?: number; severity?: ReportSeverity; type?: ReportType }): Promise<Report[]> {
  const constraints: QueryConstraint[] = [
    // Filter SSR juga harus mematuhi aturan publik
    where('isPublic', '==', true),
    orderBy('timestamp', 'desc'),
    limit(options?.maxItems ?? 20),
  ];

  if (options?.severity) constraints.push(where('severity', '==', options.severity));
  if (options?.type) constraints.push(where('type', '==', options.type));

  const q = query(reportsRef(), ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data() as FirestoreReport;
    const ts = data.timestamp as any;
    return {
      ...data,
      id: doc.id,
      timestamp: ts?.toDate ? ts.toDate() : new Date(),
    } as Report;
  });
}

export async function resolveReport(reportId: string): Promise<void> {
  const docRef = doc(db, 'reports', reportId);
  await updateDoc(docRef, { 
    status: 'resolved', // Status baru: Masalah selesai
    isPublic: false,    // Sembunyikan dari Home
    resolvedAt: serverTimestamp() 
  });
}

export async function getReportById(id: string): Promise<Report | null> {
  try {
    const docRef = doc(db, 'reports', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      let resolvedDate: Date;

      if (data.timestamp instanceof Timestamp) {
        resolvedDate = data.timestamp.toDate();
      } else if (data.timestamp?.seconds) {
        resolvedDate = new Date(data.timestamp.seconds * 1000);
      } else {
        resolvedDate = new Date(data.timestamp || Date.now());
      }

      return {
        id: docSnap.id,
        ...data,
        timestamp: resolvedDate,
      } as Report;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error fetching report:', error);
    return null;
  }
}


export interface LogisticUpdateData {
  needs: string[]; // List nama barang terbaru
  needsTargets: Record<string, number>; // Mapping { "Beras": 100, "Selimut": 50 }
}

export async function updateReportLogistics(reportId: string, data: LogisticUpdateData) {
  try {
    const reportRef = doc(db, 'reports', reportId);
    
    await updateDoc(reportRef, {
      needs: data.needs,           // Update list item (jika ada penambahan)
      needsTargets: data.needsTargets, // Update target angka
      lastLogisticsUpdate: new Date() // Audit trail
    });
    
    return true;
  } catch (error) {
    console.error("Gagal update logistik:", error);
    throw error;
  }
}