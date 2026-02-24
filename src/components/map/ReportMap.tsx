// src/components/map/ReportMap.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Leaflet Map Component — LogistikSiaga
//
// IMPORTANT: Leaflet requires client-side rendering only.
// Always import this component with `dynamic(() => import(...), { ssr: false })`
//
// Features:
//   - Renders markers for all reports from Zustand store
//   - Location picker mode (for Report Form)
//   - Custom colored markers based on severity
//   - Popup cards with report details
// ─────────────────────────────────────────────────────────────────────────────

'use client';

import { useEffect, useRef, useState } from 'react';
import { Report, GeoLocation, ReportSeverity } from '@/types';
import { SEVERITY_CONFIG, TYPE_CONFIG } from '@/lib/aiAnalysis';

// ─── Leaflet (loaded client-side only) ───────────────────────────────────────

let L: typeof import('leaflet') | null = null;

// ─── Marker Color by Severity ─────────────────────────────────────────────────

const MARKER_COLORS: Record<ReportSeverity, string> = {
  kritis: '#EF4444', // red-500
  sedang: '#F97316', // orange-500
  waspada: '#EAB308', // yellow-500
};

function createSeverityIcon(severity: ReportSeverity, leaflet: typeof import('leaflet')) {
  const color = MARKER_COLORS[severity];
  const svgIcon = `
    <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z"
        fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="16" cy="15" r="6" fill="white" opacity="0.9"/>
    </svg>
  `;
  return leaflet.divIcon({
    html: svgIcon,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
    className: '',
  });
}

function createPickerIcon(leaflet: typeof import('leaflet')) {
  const svgIcon = `
    <svg width="36" height="44" viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 0C8.059 0 0 8.059 0 18c0 13.5 18 26 18 26s18-12.5 18-26C36 8.059 27.941 0 18 0z"
        fill="#3B82F6" stroke="white" stroke-width="2.5"/>
      <path d="M18 11v7 M14 15h8" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
    </svg>
  `;
  return leaflet.divIcon({
    html: svgIcon,
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    className: '',
  });
}

// ─── Component Props ──────────────────────────────────────────────────────────

interface ReportMapProps {
  /** Reports to render as markers (from Zustand store) */
  reports?: Report[];

  /** Initial center. Defaults to Jakarta. */
  center?: [number, number];
  zoom?: number;

  /**
   * PICKER MODE: Enables clicking on map to select a location.
   * Renders a draggable blue pin.
   */
  pickerMode?: boolean;
  pickerLocation?: GeoLocation | null;
  onLocationPick?: (loc: { lat: number; lng: number }) => void;

  className?: string;
  height?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReportMap({
  reports = [],
  center = [-6.2088, 106.8456], // Jakarta
  zoom = 12,
  pickerMode = false,
  pickerLocation,
  onLocationPick,
  className = '',
  height = '300px',
}: ReportMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<import('leaflet').Map | null>(null);
  const markersRef = useRef<import('leaflet').Marker[]>([]);
  const pickerRef = useRef<import('leaflet').Marker | null>(null);
  const [isReady, setIsReady] = useState(false);

  // ── Initialize map ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    let mounted = true;

    async function initMap() {
      // Dynamically import Leaflet (client-side only)
      const leaflet = await import('leaflet');
      L = leaflet;

      if (!mounted || !mapRef.current) return;

      const map = leaflet.map(mapRef.current, {
        center,
        zoom,
        zoomControl: true,
        attributionControl: false,
      });

      // OpenStreetMap tile layer
      leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

      leafletMapRef.current = map;
      setIsReady(true);

      // Picker mode: click to drop pin
      if (pickerMode && onLocationPick) {
        map.on('click', (e) => {
          onLocationPick({ lat: e.latlng.lat, lng: e.latlng.lng });
        });
      }
    }

    initMap();
    return () => {
      mounted = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render/update report markers ────────────────────────────────────────────
  useEffect(() => {
    if (!isReady || !leafletMapRef.current || !L) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    reports.forEach((report) => {
      if (!report.location?.lat || !report.location?.lng || !L) return;

      const icon = createSeverityIcon(report.severity, L);
      const ts = report.timestamp instanceof Date ? report.timestamp.toLocaleString('id-ID') : 'Baru saja';

      const sConfig = SEVERITY_CONFIG[report.severity];
      const tConfig = TYPE_CONFIG[report.type];

      const popup = L.popup({ maxWidth: 260, className: 'siaga-popup' }).setContent(`
        <div style="font-family: system-ui, sans-serif; padding: 4px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
            <span style="font-size:20px">${tConfig.icon}</span>
            <div>
              <div style="font-weight:800; font-size:13px; color:#1e293b">${tConfig.label}</div>
              <span style="font-size:10px; font-weight:700; padding:2px 8px; border-radius:999px;
                background:${sConfig.bg}; color:${sConfig.text};">${sConfig.label}</span>
            </div>
          </div>
          <p style="font-size:11px; color:#475569; margin:0 0 4px">${report.location.name}</p>
          <p style="font-size:11px; color:#94a3b8; margin:0 0 8px">${ts}</p>
          <div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:8px;">
            ${report.needs
              .slice(0, 3)
              .map((n) => `<span style="font-size:10px; background:#f1f5f9; padding:2px 6px; border-radius:4px">${n}</span>`)
              .join('')}
          </div>
          ${report.status === 'verified' ? `<span style="font-size:10px; color:#16a34a; font-weight:700">✅ Terverifikasi</span>` : `<span style="font-size:10px; color:#f59e0b; font-weight:700">⏳ Menunggu Verifikasi</span>`}
        </div>
      `);

      const marker = L.marker([report.location.lat, report.location.lng], { icon }).addTo(leafletMapRef.current!).bindPopup(popup);

      markersRef.current.push(marker);
    });
  }, [reports, isReady]);

  // ── Update picker pin ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isReady || !leafletMapRef.current || !L || !pickerMode) return;

    if (pickerRef.current) {
      pickerRef.current.remove();
      pickerRef.current = null;
    }

    if (pickerLocation) {
      const icon = createPickerIcon(L);
      const marker = L.marker([pickerLocation.lat, pickerLocation.lng], { icon, draggable: true }).addTo(leafletMapRef.current).bindTooltip('Geser untuk pindahkan lokasi', { permanent: false });

      marker.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        onLocationPick?.({ lat: pos.lat, lng: pos.lng });
      });

      pickerRef.current = marker;
      leafletMapRef.current.panTo([pickerLocation.lat, pickerLocation.lng]);
    }
  }, [pickerLocation, isReady, pickerMode, onLocationPick]);

  return (
    <div className={`relative rounded-2xl overflow-hidden ${className}`} style={{ height }}>
      {/* Loading skeleton */}
      {!isReady && (
        <div className="absolute inset-0 bg-slate-100 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400">Memuat peta...</p>
          </div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
