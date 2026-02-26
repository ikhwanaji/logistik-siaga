'use client';

import { useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot, Timestamp, FirestoreError } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAppStore } from '@/store/useAppStore';
import { Report, FirestoreReport } from '@/types';

// ─── Converter: raw Firestore doc → typed Report ──────────────────────────────
function convertDoc(raw: FirestoreReport & { id: string }): Report {
  const ts = raw.timestamp as Timestamp;
  return {
    ...raw,
    timestamp: ts?.toDate ? ts.toDate() : new Date(),
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface Options {
  maxItems?: number; // default 50
}

export function useRealtimeReports({ maxItems = 50 }: Options = {}) {
  const setReports = useAppStore((s) => s.setReports);
  const setIsConnected = useAppStore((s) => s.setIsConnected);

  // Track if first snapshot has arrived (for loading state)
  const isFirstSnapshotRef = useRef(true);

  useEffect(() => {
    const reportsRef = collection(db, 'reports');
    const q = query(reportsRef, orderBy('timestamp', 'desc'), limit(maxItems));

    setIsConnected(false); // mark as connecting

    const unsubscribe = onSnapshot(
      q,
      // ── Success handler ───────────────────────────────────────────────────
      (snapshot) => {
        const reports: Report[] = snapshot.docs.map((doc) =>
          convertDoc({
            ...(doc.data() as FirestoreReport), 
            id: doc.id, // 
          }),
        );

        setReports(reports);
        setIsConnected(true);
        isFirstSnapshotRef.current = false;
      },
      // ── Error handler ─────────────────────────────────────────────────────
      (error: FirestoreError) => {
        console.error('[useRealtimeReports] Firestore error:', error.code, error.message);
        setIsConnected(false);

        // Retry logic for permission errors (e.g., user not yet authed)
        if (error.code === 'permission-denied') {
          console.warn('[useRealtimeReports] Check Firestore security rules.');
        }
      },
    );

    // ── Cleanup on unmount ─────────────────────────────────────────────────
    return () => {
      unsubscribe();
      setIsConnected(false);
    };
  }, [maxItems, setReports, setIsConnected]);
}
