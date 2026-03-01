'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useFirebaseUpload } from '@/hooks/useFirebaseUpload';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useAppStore } from '@/store/useAppStore';
import { analyzeDisasterImage, ANALYSIS_STEPS, SEVERITY_CONFIG, TYPE_CONFIG } from '@/lib/aiAnalysis';
import { submitReport } from '@/lib/reportsService';
import { updateUserStats } from '@/lib/authService';

import { AIAnalysisResult, Report } from '@/types';
import { Camera, Upload, Loader2, CheckCircle, X, Zap, Send, ImagePlus, Navigation, RefreshCw, XCircle } from 'lucide-react';

// ─── Map Picker (client-only) ─────────────────────────────────────────────────
const ReportMap = dynamic(() => import('@/components/map/ReportMap'), {
  ssr: false,
  loading: () => <div className="h-40 bg-slate-100 rounded-2xl animate-pulse" />,
});

// ─── Helper: Convert DataURL to File ──────────────────────────────────────────
function dataURLtoFile(dataurl: string, filename: string) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

// ─── Step types ───────────────────────────────────────────────────────────────
type Step = 'capture' | 'uploading' | 'analyzing' | 'form' | 'submitting' | 'done';

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepBar({ step }: { step: Step }) {
  const steps: Step[] = ['capture', 'uploading', 'analyzing', 'form'];
  const idx = steps.indexOf(step);
  return (
    <div className="flex items-center gap-1 px-5 py-3 bg-white border-b border-slate-100">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-1 flex-1">
          <div className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${i <= idx ? 'bg-red-500' : 'bg-slate-100'}`} />
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ReportPage() {
  const router = useRouter();
  const { currentUser, isLoadingAuth, addOptimisticReport, setCurrentUser } = useAppStore();

  const [step, setStep] = useState<Step>('capture');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [analysisStep, setAnalysisStep] = useState(-1);
  const [description, setDescription] = useState('');
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload, progress: uploadProgress, downloadUrl, error: uploadError } = useFirebaseUpload();
  const { location, isLoading: isLocating, error: geoError, getCurrentLocation, setLocation } = useGeolocation();

  // 1. Proteksi Halaman
  useEffect(() => {
    if (!isLoadingAuth && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, isLoadingAuth, router]);

  // 2. Camera Logic (Start/Stop)
  const startCamera = useCallback(async () => {
    try {
      setStreamError(false);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Pakai kamera belakang
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      console.error('Camera access denied:', err);
      setStreamError(true);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  }, []);

  useEffect(() => {
    if (step === 'capture') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera(); 
  }, [step, startCamera, stopCamera]);

  // 3. Capture Photo from Video Stream
  const handleCapturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/jpeg');
        const file = dataURLtoFile(dataUrl, `capture-${Date.now()}.jpg`);

        processFile(file, dataUrl);
      }
    }
  };

  // 4. Handle File Select (Gallery)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const localUrl = URL.createObjectURL(file);
      processFile(file, localUrl);
    }
  };

  // 5. Common Processing Logic (Upload & Analyze)
  const processFile = async (file: File, localPreviewUrl: string) => {
    stopCamera();
    setPreviewUrl(localPreviewUrl);
    setStep('uploading');
    setAiError(null); 
    const url = await upload(file);
    if (!url) {
      setStep('capture'); 
      return;
    }

    setStep('analyzing');
    setAnalysisStep(-1);

    const result = await analyzeDisasterImage(url, (stepIdx) => {
      setAnalysisStep(stepIdx);
    });

    if (!result) {
      setAiError('Gagal menganalisis gambar.');
      setStep('capture');
      return;
    }

    // ─── 🛡️ GATEKEEPER LOGIC  ───
    const isIrrelevant = result.type === 'other';
    const isLowConfidence = result.confidence < 40;

    if (isIrrelevant || isLowConfidence) {
      setAiError('Gambar tidak terdeteksi sebagai bencana alam (Bukan Relevan). Mohon upload foto kejadian asli.');
      setStep('capture'); 
      return;
    }

    // ─── LOLOS GATEKEEPER ───
    setAiResult(result);
    setDescription(result.description);
    setStep('form');

    if (!location) {
      getCurrentLocation();
    }
  };

  // ─── Handle Map Pin Drop ────────────────────────────────────────────────────
  const handleMapPick = useCallback(
    async (coords: { lat: number; lng: number }) => {
      setLocation({
        lat: coords.lat,
        lng: coords.lng,
        name: `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`,
      });
      // Trigger reverse geocode
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json&accept-language=id`, { headers: { 'User-Agent': 'LogistikSiaga/1.0' } });
      const data = await res.json();
      const addr = data.address;
      const name = [addr.village || addr.suburb, addr.city || addr.town].filter(Boolean).join(', ') || data.display_name;
      setLocation({ lat: coords.lat, lng: coords.lng, name });
    },
    [setLocation],
  );

  // ─── Submit Report ──────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!aiResult || !location || !downloadUrl || !currentUser) return;

    setStep('submitting');
    const realReporterName = currentUser.displayName || 'Warga Sipil';

    const optimisticReport: Report = {
      id: `optimistic-${Date.now()}`,
      timestamp: new Date(),
      type: aiResult.type,
      severity: aiResult.severity,
      description,
      location,
      imageUrl: downloadUrl,
      status: 'pending',
      voteCount: 0,
      reportedBy: realReporterName,
      needs: aiResult.needs,
      isPublic: false,
      aiConfidence: aiResult.confidence,
    };
    addOptimisticReport(optimisticReport);

    try {
      const id = await submitReport({
        aiResult,
        location,
        imageUrl: downloadUrl,
        reportedBy: realReporterName,
        description,
      });

      if (currentUser.uid) {
        try {
          await updateUserStats(currentUser.uid, 'create_report');
          setCurrentUser({ ...currentUser, points: (currentUser.points || 0) + 10 });
        } catch (statsErr) {
          console.error('Gagal update poin:', statsErr);
        }
      }

      setSubmittedId(id);
      setStep('done');
    } catch (err) {
      console.error('[ReportPage] Submit failed:', err);
      setStep('form');
    }
  }, [aiResult, location, downloadUrl, description, addOptimisticReport, currentUser, setCurrentUser]);

  
  const reset = () => {
    setStep('capture');
    setPreviewUrl(null);
    setAiResult(null);
    setAiError(null); 
    setAnalysisStep(-1);
    setDescription('');
    setSubmittedId(null);
  };

  if (isLoadingAuth || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-red-500" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-0 shadow-sm">
        <div className="flex items-center justify-between pb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">📋 Buat Laporan</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Pelapor: <span className="font-bold text-slate-600">{currentUser.displayName}</span>
            </p>
          </div>
          {step !== 'done' && step !== 'capture' && (
            <button onClick={reset} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
              <X size={16} className="text-slate-500" />
            </button>
          )}
        </div>
        {step !== 'done' && <StepBar step={step} />}
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* ── STEP: DONE ──────────────────────────────────────────────────── */}
        {step === 'done' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center mt-4 animate-in zoom-in-95">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={40} className="text-green-500" />
            </div>
            <h2 className="text-xl font-black text-slate-800">Laporan Terkirim!</h2>
            <div className="flex items-center justify-center gap-1.5 mt-2 mb-4 bg-yellow-50 py-1 px-3 rounded-full w-fit mx-auto">
              <span className="text-lg">⭐</span>
              <span className="text-xs font-bold text-yellow-700">+10 Poin Reputasi</span>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-left mb-4">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-1">ID Laporan</p>
              <p className="font-mono font-bold text-slate-800 text-sm">#{submittedId?.slice(0, 12).toUpperCase()}</p>
            </div>
            {aiResult && (
              <div className="flex gap-2 justify-center mb-6">
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${SEVERITY_CONFIG[aiResult.severity].bg} ${SEVERITY_CONFIG[aiResult.severity].text}`}>{SEVERITY_CONFIG[aiResult.severity].label}</span>
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-700">
                  {TYPE_CONFIG[aiResult.type].icon} {TYPE_CONFIG[aiResult.type].label}
                </span>
              </div>
            )}
            <button onClick={reset} className="w-full bg-red-500 text-white font-bold py-4 rounded-2xl text-sm min-h-[56px] shadow-lg shadow-red-200">
              + Buat Laporan Baru
            </button>
            <button onClick={() => router.push('/home')} className="w-full text-slate-500 font-bold py-4 rounded-2xl text-sm mt-2">
              Kembali ke Beranda
            </button>
          </div>
        )}
        {step === 'capture' && (
          <>
            <div className="relative bg-black rounded-2xl overflow-hidden shadow-lg border border-slate-800" style={{ aspectRatio: '4/3' }}>
              {/* VIDEO STREAM */}
              {!streamError ? (
                <>
                  <video ref={videoRef} autoPlay playsInline muted onLoadedMetadata={() => setIsStreaming(true)} className={`w-full h-full object-cover transition-opacity duration-500 ${isStreaming ? 'opacity-100' : 'opacity-0'}`} />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Loading Spinner */}
                  {!isStreaming && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/50">
                      <Loader2 size={32} className="animate-spin text-white" />
                      <p className="text-xs">Membuka Kamera...</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/50">
                  <Camera size={48} className="text-slate-700" />
                  <p className="text-sm font-medium">Kamera tidak aktif</p>
                  <button onClick={startCamera} className="text-xs bg-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-slate-700">
                    <RefreshCw size={12} /> Coba Lagi
                  </button>
                </div>
              )}

              {/* UI OVERLAY */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-lg">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-white text-[10px] font-bold tracking-wide">LIVE VISION</span>
                </div>
                {/* Corner Brackets */}
                {['top-4 right-4 border-t-2 border-r-2', 'bottom-4 left-4 border-b-2 border-l-2', 'bottom-4 right-4 border-b-2 border-r-2'].map((cls, i) => (
                  <div key={i} className={`absolute w-8 h-8 border-white/70 rounded-sm ${cls}`} />
                ))}
              </div>

              {/* SHUTTER BUTTON */}
              {isStreaming && (
                <div className="absolute bottom-4 inset-x-0 flex justify-center pointer-events-auto">
                  <button onClick={handleCapturePhoto} className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center bg-white/20 backdrop-blur-sm active:scale-95 transition-transform">
                    <div className="w-12 h-12 bg-white rounded-full shadow-sm" />
                  </button>
                </div>
              )}
            </div>

            {/* Hidden Input Gallery */}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            {aiError && (
              <div className="mt-2 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-in slide-in-from-top-2">
                <div className="bg-red-100 p-2 rounded-full text-red-600 flex-shrink-0">
                  <XCircle size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-red-800">Foto Ditolak</h4>
                  <p className="text-xs text-red-600 mt-1 leading-relaxed">{aiError}</p>
                </div>
              </div>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-white border-2 border-dashed border-slate-200 text-slate-600 font-bold py-4 rounded-2xl text-sm flex items-center justify-center gap-2 min-h-[56px] hover:border-red-300 hover:text-red-500 transition-colors"
            >
              <ImagePlus size={18} />
              Atau Pilih dari Galeri
            </button>

            <div className="bg-blue-50 rounded-2xl p-4 flex items-start gap-3 border border-blue-100">
              <Zap size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-blue-700">Analisis Otomatis</p>
                <p className="text-[10px] text-blue-600 mt-1 leading-relaxed">Arahkan kamera ke lokasi bencana. AI akan otomatis mendeteksi situasi dan mengisi laporan.</p>
              </div>
            </div>
          </>
        )}

        {/* ── STEP: UPLOADING ─────────────────────────────────────────────── */}
        {step === 'uploading' && (
          <>
            {previewUrl && (
              <div className="relative rounded-2xl overflow-hidden shadow-lg" style={{ aspectRatio: '4/3' }}>
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
                  <Upload size={32} className="text-white animate-bounce" />
                  <p className="text-white font-bold text-sm">Mengupload Foto...</p>
                </div>
              </div>
            )}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between text-xs font-semibold text-slate-600 mb-2">
                <span>Progress</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="bg-slate-100 rounded-full h-3 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          </>
        )}

        {/* ── STEP: ANALYZING ─────────────────────────────────────────────── */}
        {step === 'analyzing' && (
          <>
            {previewUrl && (
              <div className="relative rounded-2xl overflow-hidden shadow-lg" style={{ aspectRatio: '4/3' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px]">
                  <div className="text-white text-center">
                    <div className="text-4xl mb-2 animate-pulse">🔍</div>
                    <p className="font-bold text-sm">Gemini AI Menganalisis...</p>
                  </div>
                </div>
              </div>
            )}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-700 text-sm mb-3">Langkah Analisis</h3>
              <div className="space-y-3">
                {ANALYSIS_STEPS.map((s, i) => (
                  <div key={i} className={`flex items-center gap-2.5 transition-all duration-300 ${i <= analysisStep ? 'opacity-100' : 'opacity-30'}`}>
                    {i < analysisStep ? (
                      <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                    ) : i === analysisStep ? (
                      <Loader2 size={16} className="text-blue-500 animate-spin flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-slate-200 flex-shrink-0" />
                    )}
                    <span className={`text-xs font-medium ${i <= analysisStep ? 'text-slate-700' : 'text-slate-400'}`}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── STEP: FORM ──────────────────────────────────────────────────── */}
        {(step === 'form' || step === 'submitting') && aiResult && (
          <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-4">
            {/* AI filled banner */}
            <div className="bg-green-50 border border-green-200 rounded-2xl p-3 flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle size={16} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-green-800">Data Terisi Otomatis</p>
                <p className="text-[10px] text-green-600">AI Confidence: {aiResult.confidence}%</p>
              </div>
            </div>

            {/* Photo thumbnail */}
            {previewUrl && (
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Foto laporan" className="w-full h-40 object-cover" />
              </div>
            )}

            {/* Type & Severity */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Jenis Bencana</label>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xl">{TYPE_CONFIG[aiResult.type].icon}</span>
                  <span className="font-bold text-slate-800 text-sm">{TYPE_CONFIG[aiResult.type].label}</span>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Status</label>
                <div className="mt-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${SEVERITY_CONFIG[aiResult.severity].bg} ${SEVERITY_CONFIG[aiResult.severity].text}`}>{SEVERITY_CONFIG[aiResult.severity].label}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">📝 Deskripsi</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={step === 'submitting'}
                className="w-full text-sm text-slate-800 mt-2 outline-none bg-transparent resize-none min-h-[90px] leading-relaxed disabled:opacity-50"
                placeholder="Deskripsikan situasi..."
              />
            </div>

            {/* Needs tags */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2 block">🆘 Kebutuhan</label>
              <div className="flex flex-wrap gap-2">
                {aiResult.needs.map((n) => (
                  <span key={n} className="text-xs bg-red-50 text-red-600 border border-red-100 px-3 py-1.5 rounded-full font-medium">
                    {n}
                  </span>
                ))}
              </div>
            </div>

            {/* Location picker */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
              <div className="px-4 pt-4 pb-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">📍 Lokasi</label>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs font-semibold text-slate-700 flex-1 mr-2 truncate">{location?.name ?? 'Menentukan lokasi...'}</p>
                  <button
                    onClick={getCurrentLocation}
                    disabled={isLocating || step === 'submitting'}
                    className="flex items-center gap-1.5 bg-blue-50 text-blue-600 text-xs font-bold px-3 py-2 rounded-xl min-h-[36px] flex-shrink-0 disabled:opacity-50"
                  >
                    {isLocating ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
                    GPS
                  </button>
                </div>
                {geoError && <p className="text-xs text-red-500 mt-1">{geoError}</p>}
              </div>

              <div className="px-3 pb-3">
                <ReportMap pickerMode pickerLocation={location} onLocationPick={handleMapPick} center={location ? [location.lat, location.lng] : undefined} height="160px" className="rounded-xl border border-slate-200" />
                <p className="text-[10px] text-slate-400 text-center mt-2">Geser pin di peta untuk koreksi</p>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!location || step === 'submitting'}
              className="w-full bg-red-600 text-white font-black py-4 rounded-2xl text-sm shadow-lg shadow-red-200 flex items-center justify-center gap-2 min-h-[56px] disabled:opacity-60 disabled:shadow-none transition-all active:scale-95"
            >
              {step === 'submitting' ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Mengirim Laporan...
                </>
              ) : (
                <>
                  <Send size={18} /> Kirim Laporan Darurat
                </>
              )}
            </button>

            <p className="text-[10px] text-center text-slate-400 pb-4">Dengan mengirim, Anda menjamin kebenaran data ini.</p>
          </div>
        )}
      </div>
    </div>
  );
}
