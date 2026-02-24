
"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useRealtimeReports } from "@/hooks/useRealtimeReports";
import { useAppStore, selectReports, selectIsConnected } from "@/store/useAppStore";
import { upvoteReport } from "@/lib/reportsService";
import { SEVERITY_CONFIG, TYPE_CONFIG } from "@/lib/aiAnalysis";
import { Report } from "@/types";
import {
  Bell, Shield, TrendingUp, Heart, Users,
  MapPin, CheckCircle, ChevronRight, Wifi, WifiOff,
  Zap, Package
} from "lucide-react";

// ─── Map (client-only) ────────────────────────────────────────────────────────
const ReportMap = dynamic(() => import("@/components/map/ReportMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-48 bg-slate-100 rounded-2xl animate-pulse flex items-center justify-center">
      <span className="text-slate-400 text-sm">Memuat peta...</span>
    </div>
  ),
});

// ─── Connection Badge ─────────────────────────────────────────────────────────

function ConnectionBadge({ connected }: { connected: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full transition-all ${
      connected ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
    }`}>
      {connected
        ? <><Wifi size={10} /><span>LIVE</span><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /></>
        : <><WifiOff size={10} /><span>Menghubungkan...</span></>
      }
    </div>
  );
}

// ─── Feed Item Card ───────────────────────────────────────────────────────────

function FeedItem({ report, onUpvote }: { report: Report; onUpvote: (id: string) => void }) {
  const s = SEVERITY_CONFIG[report.severity];
  const t = TYPE_CONFIG[report.type];
  const timeAgo = formatTimeAgo(report.timestamp);

  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm border ${
      report.severity === "kritis" ? "border-red-100" : "border-slate-100"
    }`}>
      {report.severity === "kritis" && (
        <div className="flex items-center gap-1.5 mb-2">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-[10px] text-red-600 font-bold tracking-widest uppercase">Mendesak</span>
        </div>
      )}

      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0 mt-0.5">{t.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
              {s.label}
            </span>
            {report.status === "verified" && (
              <span className="text-[10px] font-semibold text-green-600 flex items-center gap-0.5">
                <CheckCircle size={10} />
                Terverifikasi
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-slate-800 truncate">{t.label}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin size={10} className="text-slate-400 flex-shrink-0" />
            <p className="text-xs text-slate-500 truncate">{report.location.name}</p>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo} · oleh {report.reportedBy}</p>
        </div>

        {/* Upvote */}
        <button
          onClick={() => onUpvote(report.id)}
          className="flex-shrink-0 flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px] justify-center rounded-xl hover:bg-red-50 transition-colors"
        >
          <Heart size={16} className="text-red-400" />
          <span className="text-[10px] font-bold text-red-500">{report.voteCount}</span>
        </button>
      </div>

      {/* Needs tags */}
      {report.needs.length > 0 && (
        <div className="mt-3 flex gap-2 flex-wrap">
          {report.needs.slice(0, 4).map((n) => (
            <span key={n} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
              {n}
            </span>
          ))}
        </div>
      )}

      {/* Image thumbnail */}
      {report.imageUrl && (
        <div className="mt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={report.imageUrl}
            alt="Foto laporan"
            className="w-full h-28 object-cover rounded-xl"
            loading="lazy"
          />
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button className="flex-1 bg-red-50 text-red-600 text-xs font-bold py-2.5 rounded-xl border border-red-100 min-h-[44px]">
          Bantu Sekarang
        </button>
        <button className="flex-1 bg-slate-50 text-slate-600 text-xs font-bold py-2.5 rounded-xl border border-slate-100 min-h-[44px]">
          Lihat Detail
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  // ✅ Start real-time listener — pushes to Zustand store automatically
  useRealtimeReports({ maxItems: 30 });

  // ✅ Read from Zustand store (auto re-renders on Firestore changes)
  const reports     = useAppStore(selectReports);
  const isConnected = useAppStore(selectIsConnected);

  const kritisCount = reports.filter((r) => r.severity === "kritis").length;
  const totalVictims = reports.reduce((sum, r) => sum + (r.voteCount * 3 + 12), 0); // mock calc

  async function handleUpvote(id: string) {
    await upvoteReport(id); // Firestore atomic increment → onSnapshot fires → Zustand updates
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-24">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-white px-5 pt-12 pb-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Selamat Pagi 👋</p>
            <h1 className="text-xl font-bold text-slate-800">Halo, Budi!</h1>
          </div>
          <div className="flex items-center gap-2">
            <ConnectionBadge connected={isConnected} />
            <button className="relative w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center">
              <Bell size={20} className="text-slate-600" />
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                {kritisCount}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* ── Status Card ─────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-500 to-red-700 text-white p-5 shadow-lg shadow-red-200">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-white rounded-full" />
            <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white rounded-full" />
          </div>
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-300 rounded-full animate-pulse" />
                <span className="text-xs font-bold tracking-widest opacity-90">SIAGA AKTIF</span>
              </div>
              <Shield size={18} className="opacity-60" />
            </div>
            <h2 className="text-2xl font-black">Siaga 1 — Banjir</h2>
            <p className="text-sm opacity-80 mt-0.5">Jakarta Timur & Selatan</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                { label: "Laporan",  val: reports.length },
                { label: "Kritis",   val: kritisCount },
                { label: "Dibantu",  val: Math.round(totalVictims / 10) },
              ].map(({ label, val }) => (
                <div key={label} className="bg-white/20 rounded-xl px-2 py-1.5 text-center">
                  <div className="font-black text-lg">{val}</div>
                  <div className="text-[10px] opacity-80">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Live Map ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between border-b border-slate-50">
            <h3 className="font-bold text-slate-800 text-sm">🗺️ Peta Kejadian Live</h3>
            <span className="text-[10px] text-slate-400">{reports.length} titik</span>
          </div>
          <ReportMap
            reports={reports}
            height="220px"
            className="rounded-none"
          />
        </div>

        {/* ── Quick Actions ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <button className="bg-red-500 rounded-2xl p-4 flex flex-col items-center gap-2 shadow-md shadow-red-200 min-h-[100px] justify-center active:scale-95 transition-transform">
            <span className="text-3xl">🆘</span>
            <span className="text-white font-black text-sm text-center leading-tight">Minta<br/>Bantuan</span>
          </button>
          <button className="bg-blue-500 rounded-2xl p-4 flex flex-col items-center gap-2 shadow-md shadow-blue-200 min-h-[100px] justify-center active:scale-95 transition-transform">
            <Package size={32} className="text-white" />
            <span className="text-white font-black text-sm text-center leading-tight">Donasi<br/>Logistik</span>
          </button>
        </div>

        {/* ── Live Feed ────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Zap size={16} className="text-red-500" />
              Laporan Terkini
            </h3>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-slate-400 font-medium">Real-time</span>
            </div>
          </div>

          {/* Loading state */}
          {!isConnected && reports.length === 0 && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse">
                  <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-slate-100 rounded w-1/2 mb-2" />
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {isConnected && reports.length === 0 && (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
              <div className="text-4xl mb-2">🎉</div>
              <p className="font-bold text-slate-700">Tidak ada kejadian saat ini</p>
              <p className="text-xs text-slate-400 mt-1">Semua aman di area Anda</p>
            </div>
          )}

          {/* Feed items — driven by Firestore real-time data */}
          <div className="space-y-3">
            {reports.map((report) => (
              <FeedItem key={report.id} report={report} onUpvote={handleUpvote} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins  = Math.floor(diff / 60_000);
  if (mins < 1)  return "Baru saja";
  if (mins < 60) return `${mins} mnt lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} jam lalu`;
  return `${Math.floor(hrs / 24)} hari lalu`;
}
