'use client';

import { useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot, Timestamp, FirestoreError, where } from 'firebase/firestore'; // Tambah 'where'
import { db } from '@/lib/firebase';
import { useAppStore } from '@/store/useAppStore';
import { Report, FirestoreReport } from '@/types';

// ─── Converter ──────────────────────────────────────────────────────────────
function convertDoc(raw: FirestoreReport & { id: string }): Report {
  const ts = raw.timestamp as Timestamp;
  return {
    ...raw,
    timestamp: ts?.toDate ? ts.toDate() : new Date(),
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface Options {
  maxItems?: number;
}

export function useRealtimeReports({ maxItems = 50 }: Options = {}) {
  const setReports = useAppStore((s) => s.setReports);
  const setIsConnected = useAppStore((s) => s.setIsConnected);

  const isFirstSnapshotRef = useRef(true);

  useEffect(() => {
    const reportsRef = collection(db, 'reports');

    // 🔍 QUERY BARU (PRODUCTION STANDARD)
    // Hanya ambil yg isPublic == true.
    // Laporan dgn AI Score rendah (Shadow ban) otomatis TIDAK AKAN DIAMBIL.
    const q = query(reportsRef, where('isPublic', '==', true), where('status', 'in', ['verified', 'pending']), orderBy('timestamp', 'desc'), limit(maxItems));

    setIsConnected(false);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const reports: Report[] = snapshot.docs.map((doc) =>
          convertDoc({
            ...(doc.data() as FirestoreReport),
            id: doc.id,
          }),
        );

        setReports(reports);
        setIsConnected(true);
        isFirstSnapshotRef.current = false;
      },
      (error: FirestoreError) => {
        console.error('[useRealtimeReports] Firestore error:', error.code, error.message);
        setIsConnected(false);

        // Error Index biasanya muncul di sini karena query baru
        if (error.message.includes('requires an index')) {
          console.error('⚠️ ANDA PERLU MEMBUAT INDEX BARU DI FIREBASE CONSOLE KARENA QUERY BERUBAH (isPublic + timestamp)');
        }
      },
    );

    return () => {
      unsubscribe();
      setIsConnected(false);
    };
  }, [maxItems, setReports, setIsConnected]);
}
