// src/lib/aiAnalysis.ts
// ─────────────────────────────────────────────────────────────────────────────
// AI Analysis Service — LogistikSiaga
//
// Powered by Google Gemini 1.5 Flash via Server Actions.
// ─────────────────────────────────────────────────────────────────────────────

import { AIAnalysisResult, ReportType, ReportSeverity } from '@/types';
import { analyzeWithGemini } from '@/app/actions/analyze-gemini'; // Import Server Action

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalysisStep {
  label: string;
  duration: number;
}

// Kita percepat durasi animasi UI karena Gemini Flash cukup cepat
export const ANALYSIS_STEPS: AnalysisStep[] = [
  { label: 'Mengunggah ke Vision AI...', duration: 500 },
  { label: 'Mendeteksi objek & kerusakan...', duration: 1500 },
  { label: 'Menilai tingkat keparahan...', duration: 1000 },
  { label: 'Menyusun kebutuhan logistik...', duration: 800 },
  { label: 'Finalisasi laporan...', duration: 500 },
];

// ─── Main Analysis Function ───────────────────────────────────────────────────

/**
 * Calls Gemini AI to analyze the image.
 * Uses a simulated progress stepper for better UX while waiting for the server.
 */
export async function analyzeDisasterImage(imageUrl: string, onStepComplete?: (stepIndex: number, label: string) => void): Promise<AIAnalysisResult> {
  // 1. Jalankan Analisis Gemini (Background Process)
  // Kita panggil ini tanpa 'await' dulu agar animasi UI bisa jalan berbarengan
  const analysisPromise = analyzeWithGemini(imageUrl);

  // 2. Jalankan Animasi Loading UI (Agar user tidak bosan)
  // Ini akan jalan beriringan dengan proses fetch ke Gemini
  for (let i = 0; i < ANALYSIS_STEPS.length; i++) {
    const step = ANALYSIS_STEPS[i];

    // Cek apakah Gemini sudah selesai lebih cepat?
    // (Opsional, tapi untuk MVP hackathon, sequence fix lebih mulus)
    onStepComplete?.(i, step.label);
    await delay(step.duration);
  }

  // 3. Tunggu hasil Akhir
  try {
    const result = await analysisPromise;

    if (!result) {
      throw new Error('Gagal mendapatkan respon dari AI');
    }

    return result;
  } catch (error) {
    console.error('AI Analysis Failed, falling back to basic result', error);

    // Fallback aman jika API Error / Kuota Habis (PENTING untuk Demo)
    return {
      type: 'other',
      severity: 'waspada',
      description: 'Gagal menganalisis gambar secara otomatis. Silakan isi deskripsi secara manual.',
      needs: ['Bantuan Umum'],
      confidence: 0,
    };
  }
}

// ─── Severity Label Helpers ───────────────────────────────────────────────────
// (Bagian ini tidak berubah, tetap sama seperti sebelumnya)

export const SEVERITY_CONFIG: Record<ReportSeverity, { bg: string; text: string; dot: string; label: string; ring: string }> = {
  kritis: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', label: 'KRITIS', ring: 'ring-red-300' },
  sedang: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500', label: 'SEDANG', ring: 'ring-orange-300' },
  waspada: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-400', label: 'WASPADA', ring: 'ring-yellow-300' },
};

export const TYPE_CONFIG: Record<ReportType, { icon: string; label: string }> = {
  flood: { icon: '🌊', label: 'Banjir' },
  landslide: { icon: '⛰️', label: 'Longsor' },
  fire: { icon: '🔥', label: 'Kebakaran' },
  earthquake: { icon: '📳', label: 'Gempa Bumi' },
  other: { icon: '⚠️', label: 'Lainnya' },
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}
