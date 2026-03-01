import { AIAnalysisResult, ReportType, ReportSeverity } from '@/types';
import { analyzeWithGemini } from '@/app/actions/analyze-gemini';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalysisStep {
  label: string;
  duration: number;
}

export const ANALYSIS_STEPS: AnalysisStep[] = [
  { label: 'Mengunggah ke Vision AI...', duration: 500 },
  { label: 'Mendeteksi objek & kerusakan...', duration: 1500 },
  { label: 'Menilai tingkat keparahan...', duration: 1000 },
  { label: 'Menyusun kebutuhan logistik...', duration: 800 },
  { label: 'Finalisasi laporan...', duration: 500 },
];

// ─── Main Analysis Function ───────────────────────────────────────────────────

export async function analyzeDisasterImage(imageUrl: string, onStepComplete?: (stepIndex: number, label: string) => void): Promise<AIAnalysisResult> {
  // 1. Jalankan Analisis Gemini (Server Action)
  const analysisPromise = analyzeWithGemini(imageUrl);

  // 2. Jalankan Animasi Loading UI
  for (let i = 0; i < ANALYSIS_STEPS.length; i++) {
    const step = ANALYSIS_STEPS[i];
    onStepComplete?.(i, step.label);
    await delay(step.duration);
  }

  // 3. Tunggu hasil Akhir & Handle Error
  try {
    const result = await analysisPromise;

    if (!result) {
      throw new Error('Hasil analisis kosong (null) dari server.');
    }

    return result;
  } catch (error) {
    console.error('AI Analysis Client Error:', error);

    // Fallback jika API Gagal / Kuota Habis
    // Kita set confidence 0 agar form tidak otomatis terisi data ngawur
    return {
      type: 'other',
      severity: 'waspada',
      description: 'Gagal menganalisis gambar. Pastikan koneksi internet stabil atau isi manual.',
      needs: ['Bantuan Umum'],
      confidence: 0,
    };
  }
}

// ─── Constants & Utils (Tidak Berubah) ────────────────────────────────────────

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

function delay(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}
