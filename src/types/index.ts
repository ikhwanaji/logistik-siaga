// src/types/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Shared TypeScript Types — LogistikSiaga
// ─────────────────────────────────────────────────────────────────────────────

import { FieldValue, Timestamp } from "firebase/firestore";

// ─── Firestore Document Shape ─────────────────────────────────────────────────

export type ReportSeverity = "kritis" | "sedang" | "waspada";
export type ReportStatus   = "verified" | "pending" | "rejected";
export type ReportType     = "flood" | "landslide" | "fire" | "earthquake" | "other";

export interface GeoLocation {
  lat:  number;
  lng:  number;
  name: string; // Human-readable address (e.g., "Kampung Melayu, Jakarta Timur")
}

/** Shape stored in Firestore `reports` collection */
export interface FirestoreReport {
  id:          string;
  timestamp:   Timestamp | FieldValue; // serverTimestamp() on write, Timestamp on read
  type:        ReportType;
  severity:    ReportSeverity;
  description: string;
  location:    GeoLocation;
  imageUrl:    string;
  status:      ReportStatus;
  voteCount:   number;
  reportedBy:  string; // display name
  needs:       string[]; // e.g. ["Air Mineral", "Selimut"]
}

/** Client-side version (timestamp already resolved) */
export interface Report extends Omit<FirestoreReport, "timestamp"> {
  timestamp: Date;
}

// ─── Logistics ────────────────────────────────────────────────────────────────

export type NeedCategory = "Pangan" | "Sandang" | "Medis" | "Bayi" | "Infrastruktur";

export interface LogisticNeed {
  id:        string;
  item:      string;
  unit:      string;
  location:  string;
  collected: number;
  total:     number;
  urgent:    boolean;
  category:  NeedCategory;
  linkedReportId?: string; // optional: links to a report
}

export interface LogisticOffer {
  id:       string;
  item:     string;
  qty:      string;
  donor:    string;
  location: string;
  status:   "available" | "claimed";
}

// ─── AI Analysis Result ───────────────────────────────────────────────────────

export interface AIAnalysisResult {
  type:        ReportType;
  severity:    ReportSeverity;
  description: string;
  needs:       string[];
  confidence:  number; // 0–100
}

// ─── Zustand Store ────────────────────────────────────────────────────────────

export interface AppState {
  // Data
  reports:     Report[];
  liveCount:   number;

  donatedItems: Record<string, boolean>;

  // UI State
  isConnected: boolean; // Firestore real-time connection status

  // Actions
  setReports:     (reports: Report[]) => void;
  setIsConnected: (v: boolean) => void;
  addOptimisticReport: (report: Report) => void;

  toggleDonation: (id: string, points: number) => void;
}