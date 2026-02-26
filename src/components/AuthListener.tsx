'use client'; // Wajib, karena kita pakai useEffect

import { useEffect } from 'react';
import { initAuthListener } from '@/lib/authService';

export default function AuthListener() {
  useEffect(() => {
    // Panggil fungsi listener dari authService.ts
    // Fungsi ini akan memantau perubahan status login (Login/Logout/Refresh)
    // dan otomatis mengupdate Zustand Store.
    initAuthListener();

    // (Opsional) Jika initAuthListener mengembalikan fungsi unsubscribe,
    // bisa di-return di sini untuk cleanup.
    // Tapi untuk Auth Listener global, biasanya dibiarkan aktif terus.
  }, []);

  return null; // Komponen ini "hantu", tidak merender UI apa-apa
}
