// scripts/seedFirestore.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Seed Firestore with realistic Indonesian demo data
//
// Usage: node scripts/seedFirestore.mjs
//
// Requires: npm install firebase-admin
// Set env: GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync } from "fs";

// ── Init ──────────────────────────────────────────────────────────────────────
const serviceAccount = JSON.parse(readFileSync("./serviceAccountKey.json", "utf8"));

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_REPORTS = [
  {
    type:        "flood",
    severity:    "kritis",
    description: "Banjir setinggi 1.5 meter melanda kawasan padat penduduk. Warga terjebak di lantai 2. Dibutuhkan evakuasi segera dan logistik darurat.",
    location:    { lat: -6.2297, lng: 106.8600, name: "Kampung Melayu, Jakarta Timur" },
    imageUrl:    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Jakarta_Flood_2013.jpg/640px-Jakarta_Flood_2013.jpg",
    status:      "verified",
    voteCount:   24,
    reportedBy:  "Siti Aminah",
    needs:       ["Perahu Karet", "Air Mineral", "Selimut", "Obat-obatan P3K"],
  },
  {
    type:        "flood",
    severity:    "sedang",
    description: "Air mulai menggenangi pemukiman warga. Warga di RT 05 mulai melakukan evakuasi mandiri ke balai desa terdekat.",
    location:    { lat: -6.9748, lng: 107.6301, name: "Bojongsoang, Kabupaten Bandung" },
    imageUrl:    "",
    status:      "pending",
    voteCount:   8,
    reportedBy:  "Ahmad Fauzi",
    needs:       ["Indomie", "Air Mineral", "Popok Bayi", "Susu Formula"],
  },
  {
    type:        "landslide",
    severity:    "kritis",
    description: "Longsor menutup akses jalan utama. Beberapa rumah di lereng mengalami kerusakan parah. Tim SAR belum bisa masuk area.",
    location:    { lat: -6.9422, lng: 107.5980, name: "Cibiru, Bandung Timur" },
    imageUrl:    "",
    status:      "verified",
    voteCount:   31,
    reportedBy:  "Budi Santoso",
    needs:       ["Tenda Darurat", "Selimut", "Makanan Siap Saji", "Obat-obatan"],
  },
  {
    type:        "flood",
    severity:    "waspada",
    description: "Genangan air setinggi 20cm di beberapa titik. Warga diminta siaga dan pantau kondisi secara berkala.",
    location:    { lat: -6.2615, lng: 106.8106, name: "Kemang, Jakarta Selatan" },
    imageUrl:    "",
    status:      "pending",
    voteCount:   5,
    reportedBy:  "Dewi Rahayu",
    needs:       ["Senter", "Air Mineral", "Makanan Ringan"],
  },
  {
    type:        "flood",
    severity:    "kritis",
    description: "Tanggul jebol mengakibatkan banjir bandang. 89 warga terdampak. Posko darurat telah didirikan di SDN 05 Rawajati.",
    location:    { lat: -6.2494, lng: 106.8386, name: "Rawajati, Jakarta Selatan" },
    imageUrl:    "",
    status:      "verified",
    voteCount:   47,
    reportedBy:  "Budi Santoso",
    needs:       ["Genset", "Air Mineral", "Selimut", "Indomie", "Obat-obatan"],
  },
];

const SEED_NEEDS = [
  { item: "Popok Bayi", unit: "Pack", location: "Posko A - Kampung Melayu", collected: 30, total: 50, urgent: true,  category: "Bayi" },
  { item: "Air Mineral Aqua", unit: "Galon", location: "Posko B - Bojongsoang", collected: 85, total: 200, urgent: true, category: "Pangan" },
  { item: "Indomie Goreng", unit: "Kardus", location: "Posko C - Kemang", collected: 67, total: 100, urgent: false, category: "Pangan" },
  { item: "Selimut Polar", unit: "Lembar", location: "Posko A - Kampung Melayu", collected: 20, total: 80, urgent: true, category: "Sandang" },
  { item: "Obat-obatan P3K", unit: "Paket", location: "Posko D - Rawajati", collected: 10, total: 30, urgent: true, category: "Medis" },
];

// ─── Seed Function ────────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Seeding Firestore...\n");
  const batch = db.batch();

  // Reports
  for (const report of SEED_REPORTS) {
    const ref = db.collection("reports").doc();
    batch.set(ref, {
      ...report,
      timestamp: FieldValue.serverTimestamp(),
    });
    console.log(`✅ Report: ${report.location.name} [${report.severity}]`);
  }

  // Needs
  for (const need of SEED_NEEDS) {
    const ref = db.collection("needs").doc();
    batch.set(ref, { ...need, createdAt: FieldValue.serverTimestamp() });
    console.log(`📦 Need: ${need.item} @ ${need.location}`);
  }

  await batch.commit();
  console.log("\n🎉 Seeding complete! Check Firebase Console.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
