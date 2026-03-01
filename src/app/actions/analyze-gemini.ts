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
      PERAN:
  Kamu adalah ahli manajemen bencana dan logistik darurat dari BNPB Indonesia. Tugasmu adalah menganalisis gambar laporan warga secara objektif untuk menentukan prioritas bantuan.

  INSTRUKSI UTAMA:
  1. Analisis gambar secara visual. Deteksi jenis bencana, tingkat kerusakan, dan kondisi lingkungan.
  2. Jika gambar TIDAK relevan dengan bencana (misal: foto selfie, hewan lucu, screenshot game, atau pemandangan normal), setel "confidence" ke 0 dan "type" ke "other".
  3. Berikan output HANYA dalam format JSON murni sesuai skema di bawah.

  PANDUAN SEVERITY (TINGKAT KEPARAHAN):
  - "kritis": 
    * Banjir > 1 meter (setinggi dada orang dewasa/atap rumah).
    * Bangunan runtuh total/rata dengan tanah.
    * Kebakaran api besar yang sedang menyala.
    * Adanya korban luka atau orang terjebak terlihat di foto.
  - "sedang": 
    * Banjir 50cm - 1 meter (setinggi lutut/pinggang).
    * Bangunan retak parah atau atap hilang sebagian, tapi masih berdiri.
    * Pohon tumbang menghalangi jalan utama.
  - "waspada": 
    * Genangan air < 50cm (mata kaki).
    * Retakan kecil pada bangunan.
    * Tanda-tanda awal tanah bergerak.

  OUTPUT SCHEMA (JSON):
  {
    "type": "flood" | "landslide" | "fire" | "earthquake" | "other",
    "severity": "kritis" | "sedang" | "waspada",
    "description": "Deskripsi singkat (maks 25 kata) bahasa Indonesia. Fokus pada FAKTA visual: ketinggian air, material bangunan (kayu/beton), dan akses jalan.",
    "needs": [
      "Sebutkan 3-5 item spesifik. Contoh: 'Perahu Karet' (bukan 'Alat transport'), 'Susu Bayi' (bukan 'Makanan'), 'Terpal' (bukan 'Alat tidur'). Hindari 'Uang tunai'."
    ],
    "confidence": number (0-100, berikan < 40 jika gambar buram/tidak jelas/tidak relevan)
  }
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
      confidence: typeof data.confidence === 'number' ? data.confidence : 0,  
    };
  } catch (error) {
    console.error('Gemini SDK Error:', error);
    return null; // Akan ditangani di client sebagai fallback
  }
}


