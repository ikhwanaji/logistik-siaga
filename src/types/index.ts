// src/types/index.ts

import { FieldValue, Timestamp } from 'firebase/firestore';

export type ReportSeverity = 'kritis' | 'sedang' | 'waspada';
export type ReportStatus = 'verified' | 'pending' | 'rejected';
export type ReportType = 'flood' | 'landslide' | 'fire' | 'earthquake' | 'other';
export type UserRole = 'user' | 'admin';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role: UserRole;
  points: number;
  badges: string[];
  createdAt: Date;
}


export interface LogisticOffer {
  id: string;
  item: string;
  qty: string;
  category?: string;
  description?: string;
  imageUrl?: string;
  donor: string; 
  donorAvatar?: string;
  location: string;
  // Status diperluas agar support 'pending_delivery'
  status: 'available' | 'claimed' | 'pending_delivery'; 
  targetReportId?: string; // Field kunci untuk progress bar
  createdAt?: Date;
}

export interface GeoLocation {
  lat: number;
  lng: number;
  name: string;
}

export interface FirestoreReport {
  id: string;
  timestamp: Timestamp | FieldValue;
  type: ReportType;
  severity: ReportSeverity;
  description: string;
  location: GeoLocation;
  imageUrl: string;
  status: ReportStatus;
  voteCount: number;
  reportedBy: string;
  needs: string[];
  isPublic: boolean;
  aiConfidence: number;
  needsTargets?: Record<string, number>;
  aiResult?: AIAnalysisResult;
}

export interface Report extends Omit<FirestoreReport, 'timestamp'> {
  timestamp: Date;
}

export type NeedCategory = 'Pangan' | 'Sandang' | 'Medis' | 'Bayi' | 'Infrastruktur';

// Interface LogisticNeed opsional (jika dipakai di komponen UI)
export interface LogisticNeed {
  id: string;
  item: string;
  unit: string;
  location: string;
  collected: number;
  total: number;
  urgent: boolean;
  category: NeedCategory;
  linkedReportId?: string;
}

export interface AIAnalysisResult {
  type: ReportType;
  severity: ReportSeverity;
  description: string;
  needs: string[];
  confidence: number;
}

export interface AppState {
  reports: Report[];
  liveCount: number;
  donatedItems: Record<string, boolean>;
  isConnected: boolean;
  currentUser: UserProfile | null;
  isLoadingAuth: boolean;
  offers: LogisticOffer[];
  setReports: (reports: Report[]) => void;
  setIsConnected: (v: boolean) => void;
  addOptimisticReport: (report: Report) => void;
  toggleDonation: (id: string, points: number) => void;
  setCurrentUser: (user: UserProfile | null) => void;
  setOffers: (offers: LogisticOffer[]) => void;
}