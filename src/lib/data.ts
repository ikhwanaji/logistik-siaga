// ─── MOCK DATA ────────────────────────────────────────────────────────────────
export const USER = { name: 'Budi Santoso', avatar: 'BS', points: 1240 };

export const FEED_ITEMS = [
  { id: 1, type: 'flood', severity: 'kritis', location: 'Kampung Melayu, Jakarta Timur', time: '3 mnt lalu', verified: true, needs: ['Air Mineral', 'Selimut', 'Obat-obatan'], reporter: 'Siti Aminah', victims: 47 },
  { id: 2, type: 'landslide', severity: 'sedang', location: 'Bojongsoang, Bandung', time: '18 mnt lalu', verified: true, needs: ['Indomie', 'Tenda Darurat'], reporter: 'Ahmad Fauzi', victims: 23 },
  { id: 3, type: 'flood', severity: 'waspada', location: 'Kemang, Jakarta Selatan', time: '32 mnt lalu', verified: false, needs: ['Popok Bayi', 'Susu Formula'], reporter: 'Dewi Rahayu', victims: 12 },
  { id: 4, type: 'flood', severity: 'kritis', location: 'Rawajati, Jakarta Selatan', time: '1 jam lalu', verified: true, needs: ['Genset', 'Air Mineral'], reporter: 'Budi Santoso', victims: 89 },
];

export const NEEDS_DATA = [
  { id: 1, item: 'Popok Bayi', unit: '50 Pack', location: 'Posko A - Kampung Melayu', collected: 30, total: 50, urgent: true, category: 'Bayi' },
  { id: 2, item: 'Air Mineral Aqua', unit: '200 Galon', location: 'Posko B - Bojongsoang', collected: 85, total: 200, urgent: true, category: 'Pangan' },
  { id: 3, item: 'Indomie Goreng', unit: '100 Kardus', location: 'Posko C - Kemang', collected: 67, total: 100, urgent: false, category: 'Pangan' },
  { id: 4, item: 'Selimut Polar', unit: '80 Lembar', location: 'Posko A - Kampung Melayu', collected: 20, total: 80, urgent: true, category: 'Sandang' },
  { id: 5, item: 'Obat-obatan P3K', unit: '30 Paket', location: 'Posko D - Rawajati', collected: 10, total: 30, urgent: true, category: 'Medis' },
  { id: 6, item: 'Susu Formula Bayi', unit: '40 Kaleng', location: 'Posko B - Bojongsoang', collected: 18, total: 40, urgent: false, category: 'Bayi' },
];

export const OFFERS_DATA = [
  { id: 1, item: 'Indomie Goreng', qty: '5 Kardus', donor: 'PT. Indofood Tbk', location: 'Siap Kirim', status: 'available' },
  { id: 2, item: 'Air Mineral', qty: '50 Galon', donor: 'Siti Aminah', location: 'Menteng, Jakarta Pusat', status: 'available' },
  { id: 3, item: 'Selimut Baru', qty: '20 Lembar', donor: 'Masjid Al-Ikhlas', location: 'Kebayoran Baru', status: 'claimed' },
  { id: 4, item: 'Obat-obatan', qty: '10 Paket P3K', donor: 'Klinik Sehat', location: 'Pancoran', status: 'available' },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
export const severityConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  kritis: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', label: 'KRITIS' },
  sedang: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500', label: 'SEDANG' },
  waspada: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-400', label: 'WASPADA' },
};

export const typeIcon: Record<string, string> = { flood: '🌊', landslide: '⛰️', fire: '🔥', earthquake: '📳' };
