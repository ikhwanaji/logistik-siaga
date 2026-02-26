// src/store/useAppStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { AppState, Report, UserProfile } from '@/types';

export const useAppStore = create<AppState>()(
  devtools(
    (set) => ({
      // ── Initial State ───────────────────────────────────────────────────────
      reports: [],
      offers: [],
      liveCount: 0,
      isConnected: false,
      donatedItems: {},

      // Auth State (Default Loading harus TRUE agar tidak flickering)
      currentUser: null,
      isLoadingAuth: true,

      // ── Actions ─────────────────────────────────────────────────────────────

      setReports: (reports: Report[]) => set({ reports, liveCount: reports.length }, false, 'setReports'),
      
      setOffers: (offers) => set({ offers }, false, "setOffers"),

      setIsConnected: (v: boolean) => set({ isConnected: v }, false, 'setIsConnected'),

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
                [id]: !currentStatus,
              },
            };
          },
          false,
          'toggleDonation',
        ),

      // ACTION PENTING: Mengubah user dan mematikan loading
      setCurrentUser: (user: UserProfile | null) => set({ currentUser: user, isLoadingAuth: false }, false, 'setCurrentUser'),
    }),
    { name: 'LogistikSiagaStore' },
  ),
);

// Selectors
export const selectReports = (s: AppState) => s.reports;
export const selectLiveCount = (s: AppState) => s.liveCount;
export const selectIsConnected = (s: AppState) => s.isConnected;
export const selectKritisReports = (s: AppState) => s.reports.filter((r) => r.severity === 'kritis');
