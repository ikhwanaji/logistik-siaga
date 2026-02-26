'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useRealtimeReports } from '@/hooks/useRealtimeReports';
import { useAppStore } from '@/store/useAppStore';
import { upvoteReport } from '@/lib/reportsService';
import { SEVERITY_CONFIG, TYPE_CONFIG } from '@/lib/aiAnalysis';
import { Report } from '@/types';
import { toast } from 'sonner';
import { Bell, Shield, Zap, Package, MapPin, CheckCircle, Heart, Wifi, WifiOff, ChevronRight, Inbox } from 'lucide-react';

// ─── Dynamic Map ──────────────────────────────────────────────────────────────
const ReportMap = dynamic(() => import('@/components/map/ReportMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-48 bg-slate-100 animate-pulse flex flex-col items-center justify-center gap-2 text-slate-400">
      <MapPin size={24} className="animate-bounce" />
      <span className="text-xs font-medium">Memuat peta live...</span>
    </div>
  ),
});

// ─── Sub-Component: Connection Badge ──────────────────────────────────────────
function ConnectionBadge({ connected }: { connected: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full transition-all border ${connected ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
      {connected ? (
        <>
          <Wifi size={10} />
          <span>LIVE</span>
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
        </>
      ) : (
        <>
          <WifiOff size={10} />
          <span>Connecting...</span>
        </>
      )}
    </div>
  );
}

// ─── Sub-Component: Notification Dropdown ─────────────────────────────────────
function NotificationDropdown({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  const notifications: any[] = []; // Mock

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute top-12 right-0 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
        <div className="px-4 py-3 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-700 text-xs">Notifikasi</h3>
          <span className="text-[10px] text-slate-400">Tandai dibaca</span>
        </div>
        <div className="max-h-75 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3 text-slate-300">
                <Inbox size={24} />
              </div>
              <p className="text-xs font-bold text-slate-600">Belum ada notifikasi</p>
              <p className="text-[10px] text-slate-400 mt-1">Info penting seputar bencana dan aktivitas akun akan muncul di sini.</p>
            </div>
          ) : (
            notifications.map((n) => <div key={n.id}>Item</div>)
          )}
        </div>
      </div>
    </>
  );
}

// ─── Sub-Component: Feed Item ─────────────────────────────────────────────────
function FeedItem({ report, onUpvote, hasVoted }: { report: Report; onUpvote: (id: string) => void; hasVoted: boolean }) {
  const router = useRouter();
  const s = SEVERITY_CONFIG[report.severity];
  const t = TYPE_CONFIG[report.type];

  const formatTimeAgo = (dateStr: Date | string) => {
    const date = new Date(dateStr);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Baru saja';
    if (mins < 60) return `${mins} mnt lalu`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} jam lalu`;
    return `${Math.floor(hrs / 24)} hari lalu`;
  };

  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm border transition-colors ${report.severity === 'kritis' ? 'border-red-100 bg-red-50/10' : 'border-slate-100'}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl bg-slate-50 p-1.5 rounded-xl">{t.icon}</span>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h4 className="font-bold text-slate-800 text-sm">{t.label}</h4>
              {report.severity === 'kritis' && <span className="animate-pulse bg-red-100 text-red-600 text-[9px] font-bold px-1.5 py-0.5 rounded border border-red-200">SOS</span>}
            </div>
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              {formatTimeAgo(report.timestamp)} • oleh {report.reportedBy}
            </p>
          </div>
        </div>
        <div className={`text-[10px] font-bold px-2 py-1 rounded-full ${s.bg} ${s.text}`}>{s.label}</div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3 bg-slate-50 p-2 rounded-lg">
        <MapPin size={14} className="text-slate-400" />
        <span className="truncate font-medium">{report.location.name}</span>
      </div>

      {report.imageUrl && (
        <div className="relative mb-3 group overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={report.imageUrl} alt="Bukti Laporan" className="w-full h-32 object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
          <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      {report.needs.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {report.needs.slice(0, 3).map((n) => (
            <span key={n} className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded-full font-medium shadow-sm">
              {n}
            </span>
          ))}
          {report.needs.length > 3 && <span className="text-[10px] text-slate-400 px-1 py-1">+ {report.needs.length - 3} lainnya</span>}
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
        <button
          onClick={() => onUpvote(report.id)}
          disabled={hasVoted}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all active:scale-95 ${
            hasVoted ? 'bg-red-50 text-red-500 border border-red-100 cursor-default' : 'bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-500'
          }`}
        >
          <Heart size={16} className={hasVoted ? 'fill-red-500' : ''} />
          <span className="text-xs font-bold">{report.voteCount}</span>
        </button>

        <button onClick={() => router.push('/needs')} className="flex-1 bg-red-600 text-white text-xs font-bold py-2.5 rounded-xl shadow-md shadow-red-200 active:scale-95 transition-transform hover:bg-red-700">
          Bantu Sekarang
        </button>

        <button onClick={() => router.push(`/report/${report.id}`)} className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 active:scale-95 transition-all">
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();

  // 1. Data & Store
  useRealtimeReports({ maxItems: 30 });
  const { reports, isConnected, currentUser } = useAppStore();

  // 2. Local States
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [votedReportIds, setVotedReportIds] = useState<Set<string>>(new Set());

  // 3. Computed Stats
  const kritisCount = reports.filter((r) => r.severity === 'kritis').length;
  const totalVictims = reports.reduce((sum, r) => sum + (r.voteCount * 2 + 5), 0);

  // 4. Load Voted IDs (REVISI LOGIC: BERDASARKAN USER UID)
  useEffect(() => {
    // Jika tidak ada user, reset voted
    if (!currentUser?.uid) {
      setVotedReportIds(new Set());
      return;
    }

    // Gunakan Key Unik per User: 'votedReports_UID123'
    const userStorageKey = `votedReports_${currentUser.uid}`;
    const storedVotes = localStorage.getItem(userStorageKey);

    if (storedVotes) {
      setVotedReportIds(new Set(JSON.parse(storedVotes)));
    } else {
      setVotedReportIds(new Set()); // Reset jika user ini belum pernah vote di device ini
    }
  }, [currentUser]); // Dependency currentUser: akan re-run setiap user login/logout

  // 5. Handle Upvote (Single Vote Logic per User)
  const handleUpvote = async (id: string) => {
    if (!currentUser) {
      toast.error('Silakan login untuk memberikan dukungan.');
      router.push('/login');
      return;
    }

    if (votedReportIds.has(id)) {
      toast.info('Anda sudah mendukung laporan ini.');
      return;
    }

    if (navigator.vibrate) navigator.vibrate(50);

    // Optimistic Update
    const newSet = new Set(votedReportIds);
    newSet.add(id);
    setVotedReportIds(newSet);

    // SIMPAN KE LOCALSTORAGE DENGAN KEY UNIK
    const userStorageKey = `votedReports_${currentUser.uid}`;
    localStorage.setItem(userStorageKey, JSON.stringify(Array.from(newSet)));

    // Call Backend
    try {
      await upvoteReport(id);
      toast.success('Dukungan terkirim! ❤️');
    } catch (error) {
      // Revert if failed
      newSet.delete(id);
      setVotedReportIds(newSet);
      localStorage.setItem(userStorageKey, JSON.stringify(Array.from(newSet)));
      toast.error('Gagal mengirim dukungan.');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-28">
      {/* ── HEADER ── */}
      <div className="bg-white px-5 pt-14 pb-4 shadow-sm sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium mb-0.5">Selamat Pagi 👋</p>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">Halo, {currentUser?.displayName?.split(' ')[0] || 'Kawan'}!</h1>
          </div>
          <div className="flex items-center gap-3">
            <ConnectionBadge connected={isConnected} />
            <div className="relative">
              <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="relative w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 active:scale-95 transition-all">
                <Bell size={20} className="text-slate-600" />
                {kritisCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center border border-white">{kritisCount}</span>}
              </button>
              <NotificationDropdown isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* ── STATUS CARD (SIAGA) ── */}
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-red-600 to-red-800 text-white p-6 shadow-xl shadow-red-200">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-white rounded-full mix-blend-overlay" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full mix-blend-overlay blur-2xl" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 bg-red-900/30 px-2 py-1 rounded-lg backdrop-blur-sm border border-white/10">
                <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold tracking-widest uppercase opacity-90">SIAGA 1</span>
              </div>
              <Shield size={20} className="opacity-70" />
            </div>
            <h2 className="text-2xl font-black mb-1">Status Waspada</h2>
            <p className="text-sm text-red-100 mb-4 font-medium">Beberapa area membutuhkan evakuasi.</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 text-center border border-white/10">
                <div className="font-black text-xl">{reports.length}</div>
                <div className="text-[9px] uppercase tracking-wide opacity-70">Laporan</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 text-center border border-white/10">
                <div className="font-black text-xl text-yellow-300">{kritisCount}</div>
                <div className="text-[9px] uppercase tracking-wide opacity-70">Kritis</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 text-center border border-white/10">
                <div className="font-black text-xl">{totalVictims}</div>
                <div className="text-[9px] uppercase tracking-wide opacity-70">Terdampak</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── LIVE MAP ── */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between border-b border-slate-50 bg-slate-50/50">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <MapPin size={16} className="text-red-500" />
              Peta Sebaran
            </h3>
            <span className="text-[10px] font-bold bg-white px-2 py-1 rounded-full border border-slate-200 text-slate-500">{reports.length} Titik</span>
          </div>
          <div className="relative">
            <ReportMap reports={reports} height="200px" className="rounded-none" />
            <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          </div>
        </div>

        {/* ── QUICK ACTIONS ── */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => router.push('/report')} className="group relative overflow-hidden bg-red-500 rounded-3xl p-5 flex flex-col items-center gap-3 shadow-lg shadow-red-200 active:scale-95 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-red-400 to-red-600 opacity-100 group-hover:opacity-90 transition-opacity" />
            <div className="relative w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
              <Zap size={28} className="text-white fill-white" />
            </div>
            <div className="relative text-center">
              <span className="block text-white font-black text-sm leading-tight">
                Minta
                <br />
                Bantuan
              </span>
              <span className="text-[9px] text-red-100 mt-1 block">Sinyal SOS</span>
            </div>
          </button>
          <button onClick={() => router.push('/needs')} className="group relative overflow-hidden bg-blue-600 rounded-3xl p-5 flex flex-col items-center gap-3 shadow-lg shadow-blue-200 active:scale-95 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-700 opacity-100 group-hover:opacity-90 transition-opacity" />
            <div className="relative w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
              <Package size={28} className="text-white" />
            </div>
            <div className="relative text-center">
              <span className="block text-white font-black text-sm leading-tight">
                Donasi
                <br />
                Logistik
              </span>
              <span className="text-[9px] text-blue-100 mt-1 block">Kirim Bantuan</span>
            </div>
          </button>
        </div>

        {/* ── LIVE FEED SECTION ── */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Laporan Terkini</h3>
              <p className="text-xs text-slate-400">Update kejadian real-time</p>
            </div>
            {isConnected && (
              <div className="flex items-center gap-1.5 bg-green-50 px-2 py-1 rounded-lg border border-green-100">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] text-green-700 font-bold">LIVE</span>
              </div>
            )}
          </div>

          {isConnected && reports.length === 0 && (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center">
              <div className="text-5xl mb-4 grayscale opacity-50">🎉</div>
              <h4 className="font-bold text-slate-700">Situasi Aman</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto">Belum ada laporan bencana masuk di area pantauan Anda.</p>
            </div>
          )}

          <div className="space-y-4">
            {reports.map((report) => (
              <FeedItem key={report.id} report={report} onUpvote={handleUpvote} hasVoted={votedReportIds.has(report.id)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
