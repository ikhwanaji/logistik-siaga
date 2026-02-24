'use server';

import { GoogleGenAI } from '@google/genai'; //
import { AIAnalysisResult } from '@/types';

// Inisialisasi SDK baru
const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

export async function analyzeWithGemini(imageUrl: string): Promise<AIAnalysisResult | null> {
  try {
    // 1. Download gambar dari URL (Cloudinary/Firebase) dan ubah ke Base64
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) throw new Error('Gagal mengunduh gambar');

    const arrayBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');

    // 2. Prompt Engineering (Instruksi agar Output JSON sesuai Schema kita)
    const promptText = `
      Kamu adalah asisten ahli bencana alam. Analisis gambar ini.
      Berikan output HANYA dalam format JSON (tanpa markdown code block) dengan skema berikut:
      {
        "type": "flood" | "landslide" | "fire" | "earthquake" | "other",
        "severity": "kritis" | "sedang" | "waspada",
        "description": "Deskripsi singkat 2-3 kalimat bahasa Indonesia tentang visual bencana, ketinggian air (jika banjir), dan kerusakan.",
        "needs": ["3-5 item logistik paling mendesak berdasarkan visual"],
        "confidence": number (0-100)
      }
      
      Panduan Severity:
      - "kritis": Kerusakan bangunan parah, arus deras, atau ancaman nyawa.
      - "sedang": Akses terputus, banjir > 50cm, tapi bangunan aman.
      - "waspada": Genangan rendah atau tanda awal longsor.
    `;

    // 3. Panggil Model dengan SDK Baru (@google/genai)
    // Menggunakan gemini-1.5-flash karena stabil & cepat untuk free tier.
    // Anda bisa menggantinya ke 'gemini-2.0-flash' jika akses sudah tersedia.
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        responseMimeType: 'application/json', // Fitur native untuk memaksa output JSON
      },
      contents: [
        {
          text: promptText,
        },
        {
          inlineData: {
            data: base64Image,
            mimeType: 'image/jpeg', // SDK baru cukup pintar menangani png/jpg dengan mime ini
          },
        },
      ],
    });

    // 4. Parse Hasil (SDK baru mengakses text langsung via .text)
    const responseText = response.text;

    if (!responseText) {
      throw new Error('AI tidak memberikan respon teks.');
    }

    // Bersihkan format markdown jika AI bandel masih ngasih ```json
    const cleanedText = responseText.replace(/```json|```/g, '').trim();
    const data = JSON.parse(cleanedText);

    return {
      type: data.type || 'other',
      severity: data.severity || 'waspada',
      description: data.description || 'Tidak ada deskripsi visual.',
      needs: data.needs || [],
      confidence: data.confidence || 80,
    };
  } catch (error) {
    console.error('Gemini SDK Error:', error);
    return null; // Akan ditangani di client sebagai fallback
  }
}
