// src/store/useAppStore.ts
// ─────────────────────────────────────────────────────────────────────────────
// Zustand Global Store — LogistikSiaga
//
// This store is the single source of truth for the app.
// Firebase's onSnapshot writes INTO this store, so all components
// that consume it re-render automatically when new data arrives.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { AppState, Report } from '@/types';

export const useAppStore = create<AppState>()(
  devtools(
    (set) => ({
      // ── Initial State ───────────────────────────────────────────────────────
      reports: [],
      liveCount: 0,
      isConnected: false,
      donatedItems: {},
      // ── Actions ─────────────────────────────────────────────────────────────

      /** Called by onSnapshot listener in useRealtimeReports hook */
      setReports: (reports: Report[]) => set({ reports, liveCount: reports.length }, false, 'setReports'),

      setIsConnected: (v: boolean) => set({ isConnected: v }, false, 'setIsConnected'),

      /**
       * Optimistic update: add a report locally BEFORE Firestore confirms.
       * This makes the UI feel instant. Firestore's onSnapshot will then
       * overwrite this with the server-confirmed version.
       */
      addOptimisticReport: (report: Report) =>
        set(
          (state) => ({
            reports: [report, ...state.reports],
            liveCount: state.liveCount + 1,
          }),
          false,
          'addOptimisticReport',
        ),

      toggleDonation: (id: string, points: number) =>
        set(
          (state) => {
            const currentStatus = state.donatedItems[id] || false;
            return {
              donatedItems: {
                ...state.donatedItems,
                [id]: !currentStatus, // Switch true/false
              },
              // (Opsional) Jika nanti ada sistem poin user, update di sini:
              // userPoints: state.userPoints + (currentStatus ? -points : points)
            };
          },
          false,
          'toggleDonation',
        ),
    }),
    { name: 'LogistikSiagaStore' },
  ),
);

// ─── Typed Selectors (use these in components for performance) ────────────────

export const selectReports = (s: AppState) => s.reports;
export const selectLiveCount = (s: AppState) => s.liveCount;
export const selectIsConnected = (s: AppState) => s.isConnected;
export const selectKritisReports = (s: AppState) => s.reports.filter((r) => r.severity === 'kritis');
