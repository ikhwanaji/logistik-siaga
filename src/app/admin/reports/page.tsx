'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { Loader2, MapPin, CheckCircle, XCircle, AlertTriangle, Calendar } from 'lucide-react';
import dynamic from 'next/dynamic';

const ReportMap = dynamic(() => import('@/components/map/ReportMap'), { ssr: false });

export default function AdminReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'reports'), where('status', '==', 'pending'), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('Error fetching reports:', error);
      // Tampilkan error ke user agar mereka tahu (misal: "Index sedang dibuat")
      toast.error('Gagal memuat data. Cek console log.');
    } finally {
      setLoading(false); // 👈 Loading mati apapun yang terjadi
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleModeration = async (id: string, status: 'verified' | 'rejected') => {
    if (!confirm(status === 'verified' ? 'Validasi laporan ini?' : 'Tolak laporan ini?')) return;

    setActionId(id);
    try {
      await updateDoc(doc(db, 'reports', id), {
        status: status,
        moderatedAt: serverTimestamp(),
        moderatedBy: 'Admin',
      });
      toast.success(status === 'verified' ? 'Laporan Divalidasi ✅' : 'Laporan Ditolak ❌');
      fetchReports(); // Refresh list
    } catch (error) {
      toast.error('Gagal update data');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Verifikasi Laporan</h1>
        <button onClick={fetchReports} className="text-sm text-blue-600 hover:underline">
          Refresh Data
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {reports.length === 0 && <p className="text-slate-500 col-span-2 text-center py-10">Tidak ada laporan pending.</p>}

          {reports.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="relative h-48 bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.imageUrl} alt="Bukti" className="w-full h-full object-cover" />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold shadow-sm">{r.severity.toUpperCase()}</div>
              </div>

              <div className="p-5 flex-1">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-lg text-slate-800 capitalize">{r.type}</h3>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar size={12} /> {new Date(r.timestamp.seconds * 1000).toLocaleDateString()}
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
                  <p>
                    🤖 AI Confidence: <span className="font-mono">{r.aiResult?.confidence || 0}%</span>
                  </p>
                </div>

                {/* Map Preview Kecil */}
                <div className="h-32 rounded-xl overflow-hidden mb-4 border border-slate-200">
                  <ReportMap reports={[r]} center={[r.location.lat, r.location.lng]} zoom={13} height="100%" />
                </div>

                <div className="grid grid-cols-2 gap-3 mt-auto">
                  <button
                    onClick={() => handleModeration(r.id, 'rejected')}
                    disabled={!!actionId}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-bold text-sm transition-colors"
                  >
                    <XCircle size={18} /> Tolak (Hoax)
                  </button>
                  <button
                    onClick={() => handleModeration(r.id, 'verified')}
                    disabled={!!actionId}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-bold text-sm shadow-lg shadow-blue-200 transition-colors"
                  >
                    {actionId === r.id ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <>
                        <CheckCircle size={18} /> Verifikasi
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
