// src/lib/reportsService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Firestore Reports Service — LogistikSiaga
//
// All direct Firestore operations are here. Components/hooks import
// from this file — never call Firestore directly in UI code.
// ─────────────────────────────────────────────────────────────────────────────

import { collection, addDoc, updateDoc, doc, increment, serverTimestamp, query, orderBy, limit, getDocs, where, QueryConstraint, getDoc, Timestamp } from 'firebase/firestore';
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
  description?: string; // user can override AI description
}

/**
 * Saves a new disaster report to Firestore.
 * Returns the new document ID.
 */
export async function submitReport(payload: SubmitReportPayload): Promise<string> {
  const { aiResult, location, imageUrl, reportedBy, description } = payload;

  const newReport: Omit<FirestoreReport, 'id'> = {
    timestamp: serverTimestamp(),
    type: aiResult.type,
    severity: aiResult.severity,
    description: description ?? aiResult.description,
    location,
    imageUrl,
    status: 'pending', // awaits community verification
    voteCount: 0,
    reportedBy,
    needs: aiResult.needs,
  };

  const docRef = await addDoc(reportsRef(), newReport);
  return docRef.id;
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

/**
 * Upvote a report (atomic increment — safe for concurrent updates)
 */
export async function upvoteReport(reportId: string): Promise<void> {
  const docRef = doc(db, REPORTS_COL, reportId);
  await updateDoc(docRef, { voteCount: increment(1) });
}

/**
 * Mark a report as verified (admin/moderator action)
 */
export async function verifyReport(reportId: string): Promise<void> {
  const docRef = doc(db, REPORTS_COL, reportId);
  await updateDoc(docRef, { status: 'verified' });
}

// ─── READ (one-time, for SSR/SSG) ────────────────────────────────────────────

/**
 * Fetch reports once (non-realtime). Useful for SSR initial data.
 */
export async function fetchReports(options?: { maxItems?: number; severity?: ReportSeverity; type?: ReportType }): Promise<Report[]> {
  const constraints: QueryConstraint[] = [orderBy('timestamp', 'desc'), limit(options?.maxItems ?? 20)];

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

export async function getReportById(id: string): Promise<Report | null> {
  try {
    const docRef = doc(db, 'reports', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();

      // KONVERSI TIMESTAMP PENTING DI SINI 👇
      let resolvedDate: Date;

      if (data.timestamp instanceof Timestamp) {
        // Jika formatnya Firestore Timestamp, gunakan .toDate()
        resolvedDate = data.timestamp.toDate();
      } else if (data.timestamp?.seconds) {
        // Jika formatnya objek { seconds: ... }, buat Date manual
        resolvedDate = new Date(data.timestamp.seconds * 1000);
      } else {
        // Fallback ke Date sekarang atau format string/date biasa
        resolvedDate = new Date(data.timestamp || Date.now());
      }

      return {
        id: docSnap.id,
        ...data,
        timestamp: resolvedDate, // ✅ Sekarang pasti objek Date JS valid
      } as Report;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error fetching report:', error);
    return null;
  }
}
