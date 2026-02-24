// src/hooks/useGeolocation.ts
// ─────────────────────────────────────────────────────────────────────────────
// GPS + Reverse Geocoding Hook — LogistikSiaga
//
// Gets device GPS coords → converts to human-readable Indonesian address
// using OpenStreetMap Nominatim API (free, no API key needed).
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useCallback } from "react";
import { GeoLocation } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeolocationState {
  location:    GeoLocation | null;
  isLoading:   boolean;
  error:       string | null;
}

interface UseGeolocationReturn extends GeolocationState {
  getCurrentLocation: () => Promise<GeoLocation | null>;
  setLocation:        (loc: GeoLocation) => void;
}

// ─── Nominatim reverse geocoding ─────────────────────────────────────────────

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=id`,
      { headers: { "User-Agent": "LogistikSiaga/1.0" } }
    );
    const data = await res.json();

    // Build Indonesian-style address
    const addr  = data.address;
    const parts = [
      addr.village || addr.suburb || addr.neighbourhood,
      addr.city_district || addr.district,
      addr.city || addr.town || addr.county,
      addr.state,
    ].filter(Boolean);

    return parts.slice(0, 2).join(", ") || data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    // Fallback: formatted coordinates
    return `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? "N" : "S"}, ${Math.abs(lng).toFixed(4)}°${lng >= 0 ? "E" : "W"}`;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGeolocation(): UseGeolocationReturn {
  const [state, setState] = useState<GeolocationState>({
    location:  null,
    isLoading: false,
    error:     null,
  });

  const getCurrentLocation = useCallback(async (): Promise<GeoLocation | null> => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: "GPS tidak tersedia di perangkat ini." }));
      return null;
    }

    setState({ location: null, isLoading: true, error: null });

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;

          // Parallel: reverse geocode
          const name = await reverseGeocode(lat, lng);
          const loc: GeoLocation = { lat, lng, name };

          setState({ location: loc, isLoading: false, error: null });
          resolve(loc);
        },
        (err) => {
          const msg =
            err.code === 1 ? "Izin lokasi ditolak. Aktifkan GPS di pengaturan." :
            err.code === 2 ? "Lokasi tidak tersedia. Coba lagi." :
                             "Timeout mendapatkan lokasi. Coba lagi.";
          setState({ location: null, isLoading: false, error: msg });
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
      );
    });
  }, []);

  const setLocation = useCallback((loc: GeoLocation) => {
    setState({ location: loc, isLoading: false, error: null });
  }, []);

  return { ...state, getCurrentLocation, setLocation };
}