'use client';

/**
 * MapPicker — mini-carte OpenStreetMap (Leaflet) pour vérifier et AJUSTER
 * la position GPS d'un lieu. Le pin est déplaçable ; chaque déplacement
 * remonte les nouvelles coordonnées via onChange.
 */

import React from 'react';
import 'leaflet/dist/leaflet.css';

interface MapPickerProps {
  lat: number;
  lng: number;
  onChange?: (coords: { lat: number; lng: number }) => void;
  className?: string;
}

const PIN_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">
  <path d="M17 1C8.7 1 2 7.7 2 16c0 10.5 15 27 15 27s15-16.5 15-27C32 7.7 25.3 1 17 1z" fill="#A64B2A" stroke="#FAF9F6" stroke-width="2"/>
  <circle cx="17" cy="16" r="6" fill="#C2A350"/>
</svg>`;

export function MapPicker({ lat, lng, onChange, className = '' }: MapPickerProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<any>(null);
  const markerRef = React.useRef<any>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: [lat, lng],
        zoom: 16,
        zoomControl: true,
        attributionControl: false,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({
        html: PIN_SVG,
        className: '',
        iconSize: [34, 44],
        iconAnchor: [17, 43],
      });

      const marker = L.marker([lat, lng], { icon, draggable: !!onChange }).addTo(map);
      if (onChange) {
        marker.on('dragend', () => {
          const p = marker.getLatLng();
          onChange({ lat: p.lat, lng: p.lng });
        });
        // Tap sur la carte = déplacer le pin
        map.on('click', (e: any) => {
          marker.setLatLng(e.latlng);
          onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
        });
      }

      mapRef.current = map;
      markerRef.current = marker;
      // Corrige le rendu dans les conteneurs animés/cachés
      setTimeout(() => map.invalidateSize(), 200);
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; markerRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Suit les mises à jour externes de coordonnées (recapture GPS)
  React.useEffect(() => {
    if (mapRef.current && markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current.setView([lat, lng]);
    }
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-52 rounded-2xl overflow-hidden border border-awder-sable ${className}`}
      aria-label="Carte pour ajuster la position du lieu"
    />
  );
}
