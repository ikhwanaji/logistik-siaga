'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getReportById } from '@/lib/reportsService';
import { Report } from '@/types';
import { SEVERITY_CONFIG, TYPE_CONFIG } from '@/lib/aiAnalysis';
import { Loader2, ArrowLeft, MapPin, Calendar, User, Shield, Package } from 'lucide-react';
import dynamic from 'next/dynamic';

const ReportMap = dynamic(() => import('@/components/map/ReportMap'), {
  ssr: false,
  loading: () => <div className="h-48 bg-slate-100 animate-pulse rounded-xl" />,
});

export default function ReportDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (typeof id === 'string') {
        const data = await getReportById(id);
        setReport(data);
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-red-500" size={32} />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <h2 className="font-bold text-slate-800">Laporan Tidak Ditemukan</h2>
        <p className="text-sm text-slate-500 mt-2">Laporan ini mungkin sudah dihapus atau ID salah.</p>
        <button onClick={() => router.back()} className="mt-4 text-red-600 font-bold text-sm">
          Kembali
        </button>
      </div>
    );
  }

  const s = SEVERITY_CONFIG[report.severity];
  const t = TYPE_CONFIG[report.type];

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header Image & Nav */}
      <div className="relative h-72 bg-slate-200">
        <img src={report.imageUrl} alt="Detail Bencana" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />

        {/* Back Button */}
        <button onClick={() => router.back()} className="absolute top-12 left-5 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-all">
          <ArrowLeft size={20} />
        </button>

        {/* Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${s.bg} ${s.text} bg-opacity-90`}>{s.label}</span>
            <span className="flex items-center gap-1 text-[10px] bg-black/40 px-2 py-1 rounded-md backdrop-blur-sm">
              <Calendar size={10} /> {new Date(report.timestamp).toLocaleDateString('id-ID')}
            </span>
          </div>
          <h1 className="text-2xl font-black leading-tight mb-1">
            {t.label} di {report.location.name}
          </h1>
        </div>
      </div>

      <div className="px-5 py-6 space-y-6">
        {/* Reporter Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
            <User size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Dilaporkan oleh</p>
            <p className="text-sm font-bold text-slate-800">{report.reportedBy}</p>
          </div>
          {report.status === 'verified' && (
            <div className="ml-auto flex items-center gap-1 text-green-600 bg-green-50 px-3 py-1 rounded-full">
              <Shield size={12} />
              <span className="text-[10px] font-bold">Terverifikasi</span>
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <h3 className="font-bold text-slate-800 mb-2 text-sm">Deskripsi Kejadian</h3>
          <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">{report.description}</p>
        </div>

        {/* Needs */}
        <div>
          <h3 className="font-bold text-slate-800 mb-3 text-sm flex items-center gap-2">
            <Package size={16} className="text-red-500" />
            Kebutuhan Mendesak
          </h3>
          <div className="flex flex-wrap gap-2">
            {report.needs.map((need) => (
              <span key={need} className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-100">
                {need}
              </span>
            ))}
          </div>
        </div>

        {/* Location Map */}
        <div>
          <h3 className="font-bold text-slate-800 mb-3 text-sm flex items-center gap-2">
            <MapPin size={16} className="text-blue-500" />
            Lokasi Kejadian
          </h3>
          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
            <ReportMap reports={[report]} height="200px" center={[report.location.lat, report.location.lng]} zoom={15} />
          </div>
          <p className="text-xs text-slate-400 mt-2 text-center">
            {report.location.lat}, {report.location.lng}
          </p>
        </div>
      </div>
    </div>
  );
}
