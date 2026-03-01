'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import EditNeedsModal from '@/components/admin/EditNeedsModal';
import { Loader2, MapPin, CheckCircle, XCircle, Calendar, CheckSquare, Edit } from 'lucide-react';
import dynamic from 'next/dynamic';
import { verifyReport, rejectReport } from '@/lib/reportsService';

// Load Map secara dynamic agar tidak error window not defined
const ReportMap = dynamic(() => import('@/components/map/ReportMap'), { ssr: false });

type TabType = 'pending' | 'active' | 'history';

export default function AdminReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [actionId, setActionId] = useState<string | null>(null);
  const [editingReport, setEditingReport] = useState<any | null>(null);

  // ─── FETCH DATA BERDASARKAN TAB ───
  const fetchReports = async () => {
    setLoading(true);
    setReports([]); // Clear dulu biar ga flickering
    try {
      let q;
      const reportsRef = collection(db, 'reports');

      if (activeTab === 'pending') {
        // Ambil yang BELUM diapa-apain
        q = query(reportsRef, where('status', '==', 'pending'), orderBy('timestamp', 'desc'));
      } else if (activeTab === 'active') {
        // Ambil yang SEDANG TAMPIL di Home (Verified)
        q = query(reportsRef, where('status', '==', 'verified'), orderBy('timestamp', 'desc'));
      } else {
        // Ambil yang SUDAH SELESAI / DITOLAK (History)
        q = query(reportsRef, where('status', 'in', ['resolved', 'rejected']), orderBy('timestamp', 'desc'));
      }

      const snap = await getDocs(q);
      setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error(error);
      toast.error('Gagal memuat data. Cek Console & Index Firebase.');
    } finally {
      setLoading(false);
    }
  };

  // Refresh saat tab berubah
  useEffect(() => {
    fetchReports();
  }, [activeTab]);

  // ─── ACTIONS ───

  // 1. Verifikasi / Tolak (Untuk Tab Pending)
  const handleModeration = async (id: string, action: 'verify' | 'reject') => {
    if (!confirm(action === 'verify' ? 'Validasi laporan ini?' : 'Tolak laporan ini?')) return;

    setActionId(id);
    try {
      if (action === 'verify') {
        await verifyReport(id);
        toast.success('Laporan Aktif & Muncul di Home ✅');
      } else {
        await rejectReport(id);
        toast.success('Laporan Ditolak ❌');
      }
      // Hapus dari list view saat ini
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      console.error(error);
      toast.error('Gagal update data');
    } finally {
      setActionId(null);
    }
  };

  // 2. Tandai Selesai (Untuk Tab Active)
  const handleResolve = async (id: string) => {
    if (!confirm('Apakah bencana ini sudah surut/selesai? Laporan akan hilang dari Home.')) return;

    setActionId(id);
    try {
      const docRef = doc(db, 'reports', id);
      await updateDoc(docRef, {
        status: 'resolved',
        isPublic: false, // Hilang dari Home
        resolvedAt: serverTimestamp(),
      });

      toast.success('Laporan Ditandai Selesai (Resolved) 🎉');
      // Pindahkan UI secara lokal
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      console.error(error);
      toast.error('Gagal menyelesaikan laporan');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen Laporan</h1>
          <p className="text-sm text-slate-500">Validasi masuk & pantau bencana aktif.</p>
        </div>

        {/* ─── TAB NAVIGATION ─── */}
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <button onClick={() => setActiveTab('pending')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'pending' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
            Menunggu ({activeTab === 'pending' ? reports.length : '...'})
          </button>
          <button onClick={() => setActiveTab('active')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'active' ? 'bg-red-50 text-red-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
            Sedang Aktif
          </button>
          <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-slate-100 text-slate-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
            Riwayat
          </button>
        </div>
      </div>

      {/* ─── MODAL REVISI KEBUTUHAN ─── */}
      {editingReport && (
        <EditNeedsModal
          report={editingReport}
          onClose={() => setEditingReport(null)}
          onSuccess={() => {
            fetchReports(); // Refresh data setelah update
            setEditingReport(null);
          }}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {reports.length === 0 && (
            <div className="col-span-2 py-20 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                <CheckSquare size={32} />
              </div>
              <p className="text-slate-500 font-medium">Tidak ada data di tab ini.</p>
            </div>
          )}

          {reports.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              {/* Gambar Header */}
              <div className="relative h-48 bg-slate-100 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.imageUrl} alt="Bukti" className="w-full h-full object-cover" />

                {/* Badge Status di Foto */}
                <div className="absolute top-4 left-4 flex gap-2">
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-md bg-white/90 ${
                      r.status === 'pending' ? 'text-yellow-700 border-yellow-200' : r.status === 'verified' ? 'text-red-600 border-red-200 animate-pulse' : 'text-green-700 border-green-200'
                    }`}
                  >
                    {r.status === 'pending' ? '⏳ Menunggu' : r.status === 'verified' ? '🔴 LIVE / Aktif' : '✅ Selesai'}
                  </div>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-lg text-slate-800 capitalize">{r.type}</h3>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar size={12} /> {r.timestamp?.seconds ? new Date(r.timestamp.seconds * 1000).toLocaleDateString() : 'Baru saja'}
                  </span>
                </div>

                <p className="text-sm text-slate-600 mb-4 line-clamp-3">{r.description}</p>

                <div className="bg-slate-50 p-3 rounded-xl mb-4 text-xs text-slate-500 space-y-1">
                  <p className="flex items-center gap-2">
                    <MapPin size={14} /> {r.location.name}
                  </p>
                  <p>
                    👤 Pelapor: <span className="font-semibold">{r.reportedBy}</span>
                  </p>
                  {r.aiConfidence && (
                    <p>
                      🤖 AI Score: <b>{Math.round(r.aiConfidence)}%</b>
                    </p>
                  )}
                </div>

                {/* AREA TOMBOL AKSI */}
                <div className="mt-auto pt-4 border-t border-slate-50">
                  {/* TAB 1: PENDING (Verifikasi vs Tolak) */}
                  {activeTab === 'pending' && (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleModeration(r.id, 'reject')}
                        disabled={!!actionId}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-bold text-sm transition-colors"
                      >
                        <XCircle size={16} /> Tolak
                      </button>
                      <button
                        onClick={() => handleModeration(r.id, 'verify')}
                        disabled={!!actionId}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-bold text-sm shadow-lg shadow-blue-200 transition-colors"
                      >
                        {actionId === r.id ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : (
                          <>
                            <CheckCircle size={16} /> Verifikasi
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* TAB 2: ACTIVE (Revisi Needs & Tandai Selesai) */}
                  {activeTab === 'active' && (
                    <div className="flex gap-2">
                      {/* TOMBOL BARU: REVISI KEBUTUHAN */}
                      <button
                        onClick={() => setEditingReport(r)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 font-bold text-sm border border-orange-200 transition-colors"
                      >
                        <Edit size={16} /> Revisi Kebutuhan
                      </button>

                      {/* Tombol Selesai (Existing) */}
                      <button
                        onClick={() => handleResolve(r.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white hover:bg-green-700 font-bold text-sm shadow-lg shadow-green-200 transition-colors"
                      >
                        <CheckSquare size={16} /> Selesai
                      </button>
                    </div>
                  )}

                  {/* TAB 3: HISTORY (Hanya Info) */}
                  {activeTab === 'history' && (
                    <div className="text-center text-xs text-slate-400 font-medium bg-slate-50 py-2 rounded-lg">Laporan diarsipkan pada {r.resolvedAt ? new Date(r.resolvedAt.seconds * 1000).toLocaleDateString() : '-'}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
