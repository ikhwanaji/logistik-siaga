'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import dynamic from 'next/dynamic';
import { AlertTriangle, PackageOpen, Users, Activity, ArrowUpRight, Clock } from 'lucide-react';

const AdminMap = dynamic(() => import('@/components/map/ReportMap'), {
  ssr: false,
  loading: () => <div className="h-96 bg-slate-100 animate-pulse rounded-2xl" />,
});

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    pendingReports: 0,
    incomingLogistics: 0,
    activeVolunteers: 0,
    totalDonations: 0, // dalam unit barang
  });
  const [recentReports, setRecentReports] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      // 1. Hitung Laporan Pending (Perlu Verifikasi)
      const qReports = query(collection(db, 'reports'), where('status', '==', 'pending'));
      const snapReports = await getDocs(qReports);

      // 2. Hitung Barang Incoming (Perlu Check-in)
      const qLogistics = query(collection(db, 'logistic_offers'), where('status', '==', 'pending_delivery'));
      const snapLogistics = await getDocs(qLogistics);

      // 3. Ambil Laporan Terbaru
      const qRecent = query(collection(db, 'reports'), orderBy('timestamp', 'desc'), limit(5));
      const snapRecent = await getDocs(qRecent);

      setStats({
        pendingReports: snapReports.size,
        incomingLogistics: snapLogistics.size,
        activeVolunteers: 120, // Dummy (bisa query collection users)
        totalDonations: 4500, // Dummy
      });

      setRecentReports(snapRecent.docs.map((d) => ({ id: d.id, ...d.data() })));
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard Operasional</h1>
        <p className="text-slate-500">Ringkasan aktivitas real-time logistik bencana.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Laporan Baru" value={stats.pendingReports} icon={<AlertTriangle className="text-orange-500" />} desc="Menunggu verifikasi" alert={stats.pendingReports > 0} />
        <StatCard title="Barang Masuk" value={stats.incomingLogistics} icon={<PackageOpen className="text-blue-500" />} desc="Perlu check-in di posko" alert={stats.incomingLogistics > 0} />
        <StatCard title="Relawan Aktif" value={stats.activeVolunteers} icon={<Users className="text-green-500" />} desc="Siap dikerahkan" />
        <StatCard title="Total Donasi" value={stats.totalDonations} icon={<Activity className="text-purple-500" />} desc="Unit barang tersalurkan" />
      </div>

      {/* ✅ TAMBAHAN: PETA SEBARAN (GLOBAL VIEW) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">🗺️ Peta Sebaran Bencana Global</h3>
        </div>
        <div className="h-96 w-full">
          {/* Tampilkan semua laporan terbaru di peta */}
          <AdminMap
            reports={recentReports} // Idealnya gunakan state khusus 'allReports'
            center={[-6.2, 106.816666]} // Default Jakarta
            zoom={10}
            height="100%"
            className="rounded-none"
          />
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Laporan Masuk Terkini</h3>
          <button className="text-xs font-bold text-blue-600 flex items-center gap-1">
            Lihat Semua <ArrowUpRight size={14} />
          </button>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-6 py-3">Jenis Bencana</th>
              <th className="px-6 py-3">Lokasi</th>
              <th className="px-6 py-3">Pelapor</th>
              <th className="px-6 py-3">Waktu</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recentReports.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-bold text-slate-700 capitalize">{r.type}</td>
                <td className="px-6 py-4 text-slate-500 truncate max-w-[200px]">{r.location.name}</td>
                <td className="px-6 py-4">{r.reportedBy}</td>
                <td className="px-6 py-4 text-slate-400 flex items-center gap-2">
                  <Clock size={14} />
                  {r.timestamp?.seconds ? new Date(r.timestamp.seconds * 1000).toLocaleTimeString() : 'Baru saja'}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${r.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{r.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, desc, alert }: any) {
  return (
    <div className={`bg-white p-6 rounded-2xl shadow-sm border transition-all ${alert ? 'border-red-200 ring-2 ring-red-100' : 'border-slate-100'}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-slate-50 rounded-xl">{icon}</div>
        {alert && <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />}
      </div>
      <h3 className="text-3xl font-black text-slate-800 mb-1">{value}</h3>
      <p className="text-sm font-bold text-slate-600">{title}</p>
      <p className="text-xs text-slate-400 mt-1">{desc}</p>
    </div>
  );
}
