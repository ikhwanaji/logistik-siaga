'use server';

import { GoogleGenAI } from '@google/genai'; //
import { AIAnalysisResult } from '@/types';

// Inisialisasi SDK baru
const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

export async function analyzeDonationImage(imageUrl: string) {
  try {
    // 1. Download gambar dari URL (Cloudinary/Firebase) dan ubah ke Base64
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) throw new Error('Gagal mengunduh gambar');

    const arrayBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');

    // 2. Prompt Engineering (Instruksi agar Output JSON sesuai Schema kita)
    const promptText = `
      Analyze this image strictly for a disaster relief logistics application.
      Determine if the image contains valid donation items (food, clothing, medicine, hygiene kits, tents, bedding, tools, etc.).
      
      Rules:
      1. If it contains a person (selfie), animal (pet), landscape, or meme, mark as INVALID.
      2. If it contains boxes, packaging, food, or piles of clothes, mark as VALID.
      3. Return ONLY a JSON object: { "isValid": boolean, "category": string, "reason": "short explanation in Indonesian" }
      4. Do not use Markdown code blocks. Just raw JSON.
`;

    
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
    const cleanJson = responseText.replace(/```json|```/g, '').trim();
    
    return JSON.parse(cleanJson);

  } catch (error) {
    console.error('Gemini SDK Error:', error);
    return null; // Akan ditangani di client sebagai fallback
  }
}
