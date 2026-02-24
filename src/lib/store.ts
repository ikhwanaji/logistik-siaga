import { create } from 'zustand';
import { USER, NEEDS_DATA } from '@/lib/data';

interface AppState {
  // User Data
  user: typeof USER;
  notifications: number;

  // Logic Donasi
  donatedItems: Record<number, boolean>; // ID item yang sudah didonasikan
  toggleDonation: (itemId: number, points: number) => void;

  // Logic Notifikasi
  clearNotifications: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: USER,
  notifications: 3,
  donatedItems: {},

  toggleDonation: (itemId, points) =>
    set((state) => {
      const isDonating = !state.donatedItems[itemId];
      return {
        donatedItems: { ...state.donatedItems, [itemId]: isDonating },
        user: {
          ...state.user,
          // Tambah poin jika donasi, kurangi jika batal
          points: state.user.points + (isDonating ? points : -points),
        },
      };
    }),

  clearNotifications: () => set({ notifications: 0 }),
}));
