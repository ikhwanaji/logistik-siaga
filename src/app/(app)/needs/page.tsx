'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore'; // Gunakan store global
import { Icons } from '@/components/ui/custom-icons';
import { toast } from 'sonner'; // Import toast
import { useRealtimeReports } from '@/hooks/useRealtimeReports'; // Pastikan listener aktif

// Tipe data sementara untuk UI needs yang digenerate dari Reports
interface DerivedNeed {
  id: string;
  item: string;
  location: string;
  reportId: string;
  collected: number;
  total: number;
  urgent: boolean;
  category: string;
}

export default function LogisticsPage() {
  // 1. Aktifkan listener realtime (agar data selalu fresh dari Firestore)
  useRealtimeReports();

  const [tab, setTab] = useState<'needs' | 'offers'>('needs');
  const [search, setSearch] = useState('');

  // 2. Ambil data Reports & Logic Donasi dari Zustand
  const { reports, donatedItems, toggleDonation } = useAppStore();

  // 3. TRANSFORMASI DATA: Ubah Reports menjadi daftar Needs
  // Kita ambil semua 'needs' array dari setiap report dan jadikan item donasi
  const activeNeeds: DerivedNeed[] = reports.flatMap((report) =>
    report.needs.map((needItem, index) => ({
      id: `${report.id}_${index}`, // ID unik kombinasi report + index item
      reportId: report.id,
      item: needItem,
      location: report.location.name,
      // Simulasi progress donasi (randomize sedikit agar terlihat real untuk demo hackathon)
      // Di real production, ini harusnya field tersendiri di database 'needs'
      collected: Math.floor(report.voteCount * 2),
      total: 50,
      urgent: report.severity === 'kritis',
      category: 'Logistik Darurat',
    })),
  );

  // Filter pencarian
  const filteredNeeds = activeNeeds.filter((n) => n.item.toLowerCase().includes(search.toLowerCase()) || n.location.toLowerCase().includes(search.toLowerCase()));

  // Mock data Offers (Penawaran) - Bisa tetap statis atau buat collection baru di Firestore nanti
  const OFFERS_DATA = [
    { id: 'off1', item: 'Indomie Goreng', qty: '5 Kardus', donor: 'PT. Indofood Tbk', location: 'Siap Kirim', status: 'available' },
    { id: 'off2', item: 'Air Mineral', qty: '50 Galon', donor: 'Siti Aminah', location: 'Menteng, Jakarta Pusat', status: 'available' },
  ];

  // Handler Donasi dengan Toast
  const handleDonate = (id: string, item: string) => {
    const isAlreadyDonated = donatedItems[id];

    toggleDonation(id, 50); // Logic Zustand lama

    if (!isAlreadyDonated) {
      toast.success('Terima Kasih, Orang Baik!', {
        description: `Komitmen donasi untuk "${item}" telah dicatat.`,
        duration: 3000,
      });
    } else {
      toast.info('Donasi Dibatalkan', {
        description: 'Anda membatalkan komitmen donasi ini.',
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-24">
      {/* HEADER */}
      <div className="bg-white px-5 pt-12 pb-4 shadow-sm">
        <h1 className="text-xl font-bold text-slate-800">📦 Marketplace Logistik</h1>

        {/* Search Bar */}
        <div className="mt-3 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Icons.Search />
          </span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari barang kebutuhan..." className="w-full pl-10 pr-4 py-3 bg-slate-100 rounded-xl text-sm outline-none min-h-[44px]" />
        </div>

        {/* Tabs */}
        <div className="flex mt-3 gap-0 bg-slate-100 rounded-xl p-1">
          {[
            ['needs', 'Dibutuhkan'],
            ['offers', 'Tersedia'],
          ].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id as any)} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 min-h-[44px] ${tab === id ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'}`}>
              {id === 'needs' ? '🆘 ' : '✅ '} {label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT LIST */}
      <div className="px-4 py-4 space-y-3">
        {tab === 'needs' ? (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500 font-medium">{filteredNeeds.length} kebutuhan aktif</p>
              <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-1 rounded-full animate-pulse">🔴 Live Real-time</span>
            </div>

            {filteredNeeds.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">Belum ada kebutuhan logistik yang dilaporkan.</div>}

            {filteredNeeds.map((item) => {
              // Hitung persentase (simulasi)
              const pct = Math.min(100, Math.round((item.collected / item.total) * 100));
              const isDonated = donatedItems[item.id];

              return (
                <div key={item.id} className={`bg-white rounded-2xl p-4 shadow-sm border ${item.urgent ? 'border-red-100' : 'border-slate-100'}`}>
                  {item.urgent && (
                    <div className="flex items-center gap-1 mb-2">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-[10px] text-red-600 font-bold uppercase tracking-wide">Mendesak</span>
                    </div>
                  )}

                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-800 text-sm">{item.item}</h4>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">📍 {item.location}</p>
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full mt-1 inline-block">{item.category}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-700">
                        {item.collected}
                        <span className="text-slate-400">/{item.total}</span>
                      </p>
                      <p className="text-[10px] text-slate-400">Unit</p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Terkumpul</span>
                      <span className={`font-bold ${pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-orange-500' : 'text-red-500'}`}>{pct}%</span>
                    </div>
                    <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${pct >= 80 ? 'bg-green-400' : pct >= 50 ? 'bg-orange-400' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <button
                    onClick={() => handleDonate(item.id, item.item)}
                    className={`mt-3 w-full py-3 rounded-xl text-xs font-bold transition-all duration-200 min-h-[44px] text-white active:scale-95 ${
                      isDonated ? 'bg-green-500 shadow-md shadow-green-200' : 'bg-red-500 hover:bg-red-600 shadow-md shadow-red-200'
                    }`}
                  >
                    {isDonated ? '✅ Donasi Tercatat (+50 Poin)' : '❤️ Donasikan Sekarang'}
                  </button>
                </div>
              );
            })}
          </>
        ) : (
          /* TAB: OFFERS (Tersedia) - Tetap Statis untuk MVP / Demo Hackathon */
          <>
            <p className="text-xs text-slate-500 font-medium">{OFFERS_DATA.length} penawaran tersedia</p>
            {OFFERS_DATA.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{item.item}</h4>
                    <p className="text-xs text-blue-600 font-semibold mt-0.5">{item.qty}</p>
                    <p className="text-xs text-slate-400 mt-1">👤 {item.donor}</p>
                    <p className="text-xs text-slate-400">📍 {item.location}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${item.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {item.status === 'available' ? 'Tersedia' : 'Diambil'}
                  </span>
                </div>
                {item.status === 'available' && (
                  <button onClick={() => toast.success('Permintaan Klaim Terkirim!')} className="mt-3 w-full bg-blue-500 text-white py-3 rounded-xl text-xs font-bold min-h-[44px] active:scale-95 transition-transform">
                    Klaim untuk Posko
                  </button>
                )}
              </div>
            ))}

            <button className="w-full border-2 border-dashed border-blue-300 text-blue-500 font-bold py-4 rounded-2xl text-sm flex items-center justify-center gap-2 min-h-[56px] hover:bg-blue-50 transition-colors">
              <Icons.Plus />
              Tambah Penawaran Donasi
            </button>
          </>
        )}
      </div>
    </div>
  );
}
