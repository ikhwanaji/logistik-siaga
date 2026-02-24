"use client";

import { useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useFirebaseUpload } from "@/hooks/useFirebaseUpload";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useAppStore } from "@/store/useAppStore";
import { analyzeDisasterImage, ANALYSIS_STEPS, SEVERITY_CONFIG, TYPE_CONFIG } from "@/lib/aiAnalysis";
import { submitReport } from "@/lib/reportsService";
import { AIAnalysisResult, GeoLocation, Report } from "@/types";
import {
  Camera, Upload, MapPin, Loader2, CheckCircle,
  AlertTriangle, ChevronRight, X, Zap, Send,
  ImagePlus, Navigation
} from "lucide-react";

// ─── Map Picker (client-only) ─────────────────────────────────────────────────
const ReportMap = dynamic(() => import("@/components/map/ReportMap"), {
  ssr: false,
  loading: () => (
    <div className="h-40 bg-slate-100 rounded-2xl animate-pulse" />
  ),
});

// ─── Step types ───────────────────────────────────────────────────────────────
type Step = "capture" | "uploading" | "analyzing" | "form" | "submitting" | "done";

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepBar({ step }: { step: Step }) {
  const steps: Step[] = ["capture", "uploading", "analyzing", "form"];
  const idx = steps.indexOf(step);
  return (
    <div className="flex items-center gap-1 px-5 py-3 bg-white border-b border-slate-100">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-1 flex-1">
          <div className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
            i <= idx ? "bg-red-500" : "bg-slate-100"
          }`} />
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ReportPage() {
  const [step, setStep]             = useState<Step>("capture");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [aiResult, setAiResult]     = useState<AIAnalysisResult | null>(null);
  const [analysisStep, setAnalysisStep] = useState(-1);
  const [description, setDescription]  = useState("");
  const [submittedId, setSubmittedId]   = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const { upload, progress: uploadProgress, isUploading, downloadUrl, error: uploadError } = useFirebaseUpload();
  const { location, isLoading: isLocating, error: geoError, getCurrentLocation, setLocation } = useGeolocation();
  const addOptimisticReport = useAppStore((s) => s.addOptimisticReport);

  // ─── STEP 1: File Selected → Upload ────────────────────────────────────────
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setStep("uploading");

    // Upload to Firebase Storage
    const url = await upload(file);
    if (!url) return; // upload hook handles error state

    // Start AI analysis with the real URL
    setStep("analyzing");
    setAnalysisStep(-1);

    const result = await analyzeDisasterImage(url, (stepIdx) => {
      setAnalysisStep(stepIdx);
    });

    setAiResult(result);
    setDescription(result.description);
    setStep("form");

    // Auto-get GPS while AI is running
    if (!location) {
      getCurrentLocation();
    }
  }, [upload, location, getCurrentLocation]);

  // ─── Handle Map Pin Drop ────────────────────────────────────────────────────
  const handleMapPick = useCallback(async (coords: { lat: number; lng: number }) => {
    // Simple fallback name while reverse geocoding resolves
    setLocation({
      lat:  coords.lat,
      lng:  coords.lng,
      name: `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`,
    });
    // Trigger reverse geocode
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json&accept-language=id`,
      { headers: { "User-Agent": "LogistikSiaga/1.0" } }
    );
    const data = await res.json();
    const addr  = data.address;
    const name  = [addr.village || addr.suburb, addr.city || addr.town].filter(Boolean).join(", ")
      || data.display_name;
    setLocation({ lat: coords.lat, lng: coords.lng, name });
  }, [setLocation]);

  // ─── STEP 3: Submit to Firestore ───────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!aiResult || !location || !downloadUrl) return;

    setStep("submitting");

    // Optimistic update → instant UI feedback
    const optimisticReport: Report = {
      id:          `optimistic-${Date.now()}`,
      timestamp:   new Date(),
      type:        aiResult.type,
      severity:    aiResult.severity,
      description,
      location,
      imageUrl:    downloadUrl,
      status:      "pending",
      voteCount:   0,
      reportedBy:  "Budi Santoso",
      needs:       aiResult.needs,
    };
    addOptimisticReport(optimisticReport);

    try {
      const id = await submitReport({
        aiResult,
        location,
        imageUrl:    downloadUrl,
        reportedBy:  "Budi Santoso",
        description,
      });
      setSubmittedId(id);
      setStep("done");
    } catch (err) {
      console.error("[ReportPage] Submit failed:", err);
      setStep("form"); // allow retry
    }
  }, [aiResult, location, downloadUrl, description, addOptimisticReport]);

  // ─── Reset ─────────────────────────────────────────────────────────────────
  const reset = () => {
    setStep("capture");
    setPreviewUrl(null);
    setAiResult(null);
    setAnalysisStep(-1);
    setDescription("");
    setSubmittedId(null);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-0 shadow-sm">
        <div className="flex items-center justify-between pb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">📋 Buat Laporan</h1>
            <p className="text-xs text-slate-400 mt-0.5">Foto → AI → Firestore</p>
          </div>
          {step !== "done" && step !== "capture" && (
            <button onClick={reset} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
              <X size={16} className="text-slate-500" />
            </button>
          )}
        </div>
        {step !== "done" && <StepBar step={step} />}
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* ── STEP: DONE ──────────────────────────────────────────────────── */}
        {step === "done" && (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center mt-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={40} className="text-green-500" />
            </div>
            <h2 className="text-xl font-black text-slate-800">Laporan Terkirim!</h2>
            <p className="text-slate-500 text-sm mt-2 mb-4">
              Tim relawan akan merespons dalam 15 menit.
            </p>
            <div className="bg-slate-50 rounded-xl p-4 text-left mb-4">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-1">ID Laporan</p>
              <p className="font-mono font-bold text-slate-800 text-sm">#{submittedId?.slice(0, 12).toUpperCase()}</p>
            </div>
            {aiResult && (
              <div className="flex gap-2 justify-center mb-6">
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${SEVERITY_CONFIG[aiResult.severity].bg} ${SEVERITY_CONFIG[aiResult.severity].text}`}>
                  {SEVERITY_CONFIG[aiResult.severity].label}
                </span>
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-700">
                  {TYPE_CONFIG[aiResult.type].icon} {TYPE_CONFIG[aiResult.type].label}
                </span>
              </div>
            )}
            <button onClick={reset}
              className="w-full bg-red-500 text-white font-bold py-4 rounded-2xl text-sm min-h-[56px]">
              + Buat Laporan Baru
            </button>
          </div>
        )}

        {/* ── STEP: CAPTURE ───────────────────────────────────────────────── */}
        {step === "capture" && (
          <>
            {/* Camera viewfinder */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative bg-slate-900 rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
              style={{ aspectRatio: "4/3" }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950" />
              {/* Corner brackets */}
              {["top-4 left-4 border-t-2 border-l-2",
                "top-4 right-4 border-t-2 border-r-2",
                "bottom-4 left-4 border-b-2 border-l-2",
                "bottom-4 right-4 border-b-2 border-r-2"
              ].map((cls, i) => (
                <div key={i} className={`absolute w-8 h-8 border-red-400 rounded-sm ${cls}`} />
              ))}
              {/* Center reticle */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-white/50">
                  <div className="w-20 h-20 rounded-full border-2 border-white/20 flex items-center justify-center">
                    <Camera size={36} />
                  </div>
                  <p className="text-sm font-medium">Tap untuk ambil foto</p>
                </div>
              </div>
              {/* LIVE badge */}
              <div className="absolute bottom-4 left-4 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-400 text-xs font-bold">CAMERA</span>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect}
            />

            <button
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.removeAttribute("capture");
                  fileInputRef.current.click();
                }
              }}
              className="w-full bg-white border-2 border-dashed border-slate-200 text-slate-600 font-bold py-4 rounded-2xl text-sm flex items-center justify-center gap-2 min-h-[56px] hover:border-red-300 hover:text-red-500 transition-colors"
            >
              <ImagePlus size={18} />
              Pilih dari Galeri
            </button>

            <div className="bg-blue-50 rounded-2xl p-4 flex items-start gap-3">
              <Zap size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-blue-700">AI Vision Aktif</p>
                <p className="text-xs text-blue-600 mt-0.5">
                  Foto akan diupload ke Firebase Storage, lalu dianalisis AI untuk
                  mendeteksi jenis bencana, severity, dan kebutuhan mendesak secara otomatis.
                </p>
              </div>
            </div>
          </>
        )}

        {/* ── STEP: UPLOADING ─────────────────────────────────────────────── */}
        {step === "uploading" && (
          <>
            {previewUrl && (
              <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: "4/3" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3">
                  <Upload size={32} className="text-white animate-bounce" />
                  <p className="text-white font-bold text-sm">Mengupload ke Firebase Storage...</p>
                </div>
              </div>
            )}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between text-xs font-semibold text-slate-600 mb-2">
                <span>Upload Progress</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              {uploadError && (
                <p className="text-red-500 text-xs mt-2 font-medium">⚠️ {uploadError}</p>
              )}
            </div>
          </>
        )}

        {/* ── STEP: ANALYZING ─────────────────────────────────────────────── */}
        {step === "analyzing" && (
          <>
            {previewUrl && (
              <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: "4/3" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="text-4xl mb-2 animate-pulse">🔍</div>
                    <p className="font-bold text-sm">AI Vision Menganalisis...</p>
                  </div>
                </div>
              </div>
            )}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-bold text-slate-700 text-sm mb-3">Langkah Analisis AI</h3>
              <div className="space-y-2">
                {ANALYSIS_STEPS.map((s, i) => (
                  <div key={i} className={`flex items-center gap-2.5 transition-all duration-300 ${
                    i <= analysisStep ? "opacity-100" : "opacity-30"
                  }`}>
                    {i < analysisStep
                      ? <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                      : i === analysisStep
                      ? <Loader2 size={16} className="text-blue-500 animate-spin flex-shrink-0" />
                      : <div className="w-4 h-4 rounded-full border-2 border-slate-200 flex-shrink-0" />
                    }
                    <span className={`text-xs font-medium ${
                      i <= analysisStep ? "text-slate-700" : "text-slate-400"
                    }`}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── STEP: FORM ──────────────────────────────────────────────────── */}
        {(step === "form" || step === "submitting") && aiResult &&(
          <>
            {/* AI filled banner */}
            <div className="bg-green-50 border border-green-200 rounded-2xl p-3 flex items-center gap-2">
              <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-green-700">Diisi otomatis oleh AI</p>
                <p className="text-[10px] text-green-600">Keyakinan: {aiResult.confidence}% — Periksa dan koreksi jika diperlukan</p>
              </div>
            </div>

            {/* Photo thumbnail + info */}
            {previewUrl && (
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Foto laporan" className="w-full h-40 object-cover" />
                <div className="p-3 flex items-center gap-2">
                  <CheckCircle size={14} className="text-green-500" />
                  <span className="text-xs text-green-700 font-semibold">Foto berhasil diupload ke Firebase Storage</span>
                </div>
              </div>
            )}

            {/* Type & Severity */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-green-100">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Jenis Bencana</label>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xl">{TYPE_CONFIG[aiResult.type].icon}</span>
                  <span className="font-bold text-slate-800 text-sm">{TYPE_CONFIG[aiResult.type].label}</span>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-green-100">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Tingkat Keparahan</label>
                <div className="mt-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${SEVERITY_CONFIG[aiResult.severity].bg} ${SEVERITY_CONFIG[aiResult.severity].text}`}>
                    {SEVERITY_CONFIG[aiResult.severity].label}
                  </span>
                </div>
              </div>
            </div>

            {/* Description (editable) */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-green-100">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                📝 Deskripsi Situasi
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-sm text-slate-800 mt-2 outline-none bg-transparent resize-none min-h-[90px] leading-relaxed"
                placeholder="Deskripsikan situasi lebih detail..."
              />
            </div>

            {/* Needs tags from AI */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2 block">
                🆘 Kebutuhan Teridentifikasi
              </label>
              <div className="flex flex-wrap gap-2">
                {aiResult.needs.map((n) => (
                  <span key={n} className="text-xs bg-red-50 text-red-600 border border-red-100 px-3 py-1.5 rounded-full font-medium">
                    {n}
                  </span>
                ))}
              </div>
            </div>

            {/* Location picker */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 pt-4 pb-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">📍 Lokasi Kejadian</label>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs font-semibold text-slate-700 flex-1 mr-2">
                    {location?.name ?? "Belum ditentukan"}
                  </p>
                  <button
                    onClick={getCurrentLocation}
                    disabled={isLocating}
                    className="flex items-center gap-1.5 bg-blue-50 text-blue-600 text-xs font-bold px-3 py-2 rounded-xl min-h-[44px] flex-shrink-0 disabled:opacity-50"
                  >
                    {isLocating
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Navigation size={14} />
                    }
                    GPS
                  </button>
                </div>
                {geoError && <p className="text-xs text-red-500 mt-1">{geoError}</p>}
              </div>

              {/* Map picker */}
              <div className="px-3 pb-3">
                <p className="text-[10px] text-slate-400 mb-2">Atau tap pada peta untuk pilih lokasi:</p>
                <ReportMap
                  pickerMode
                  pickerLocation={location}
                  onLocationPick={handleMapPick}
                  center={location ? [location.lat, location.lng] : undefined}
                  height="180px"
                  className="rounded-xl"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!location || step === "submitting"}
              className="w-full bg-red-500 text-white font-black py-4 rounded-2xl text-sm shadow-lg shadow-red-200 flex items-center justify-center gap-2 min-h-[56px] disabled:opacity-60 disabled:shadow-none transition-all"
            >
              {step === "submitting"
                ? <><Loader2 size={18} className="animate-spin" /> Menyimpan ke Firestore...</>
                : <><Send size={18} /> Kirim Laporan Darurat</>
              }
            </button>

            {!location && (
              <p className="text-xs text-center text-slate-400">
                ⚠️ Aktifkan GPS atau pilih lokasi pada peta untuk melanjutkan
              </p>
            )}
          </>
        )}

      </div>
    </div>
  );
}
