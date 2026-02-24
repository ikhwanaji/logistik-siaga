'use client';

import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

// Definisikan tipe Props
interface MapProps {
  center: [number, number];
  onLocationSelect?: (lat: number, lng: number) => void;
}

const customIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png', // Pakai CDN sementara agar gambar muncul
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Component Helper untuk update view
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMapEvents({});
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

export default function Map({ center, onLocationSelect }: MapProps) {
  return (
    <MapContainer
      center={center}
      zoom={15}
      scrollWheelZoom={false}
      style={{ height: '100%', width: '100%', minHeight: '300px' }} // Tambahkan minHeight agar peta terlihat
    >
      <ChangeView center={center} />

      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      <Marker
        position={center}
        icon={customIcon}
        draggable={true}
        eventHandlers={{
          dragend: (e) => {
            // Kita casting e.target sebagai L.Marker untuk mendapatkan method getLatLng
            const marker = e.target as L.Marker;
            const position = marker.getLatLng();
            if (onLocationSelect) {
              onLocationSelect(position.lat, position.lng);
            }
          },
        }}
      >
        <Popup>Lokasi Kejadian</Popup>
      </Marker>
    </MapContainer>
  );
}
