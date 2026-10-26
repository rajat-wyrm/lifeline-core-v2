'use client';

import React, { useEffect, useRef } from 'react';
import type { Hospital } from '@/lib/api';

interface LeafletMapProps {
  hospitals: Hospital[];
  selectedHospitalId?: string | null;
  onSelectHospital?: (id: string) => void;
  highlightCoordinates?: { lat: number; lon: number } | null;
}

export default function LeafletMap({
  hospitals,
  selectedHospitalId,
  onSelectHospital,
  highlightCoordinates
}: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ [id: string]: any }>({});

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;

    // Dynamically load leaflet on client
    let isMounted = true;

    import('leaflet').then((L) => {
      if (!isMounted || !mapRef.current) return;

      // Ensure leaflet styles are injected
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (!mapInstanceRef.current) {
        // Initialize map centered at Chandigarh
        const map = L.map(mapRef.current, {
          center: [30.7333, 76.7794],
          zoom: 12,
          zoomControl: true
        });

        // Add CartoDB Dark Matter / OSM tiles for sleek dark UI
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
          maxZoom: 18
        }).addTo(map);

        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;

      // Clear existing markers
      Object.values(markersRef.current).forEach((m: any) => map.removeLayer(m));
      markersRef.current = {};

      // Add Hospital markers
      hospitals.forEach((h) => {
        const icu = h.resources?.['ICU-BED']?.available ?? 0;
        const vent = h.resources?.['VENTILATOR']?.available ?? 0;
        const oxy = h.resources?.['OXYGEN-BED']?.available ?? 0;
        const gen = h.resources?.['GENERAL-BED']?.available ?? 0;

        let pinColor = '#10b981'; // Green
        if (icu === 0) pinColor = '#ef4444'; // Red (no ICU)
        else if (icu < 4) pinColor = '#f59e0b'; // Amber (low ICU)

        const isSelected = selectedHospitalId === h.id;
        const size = isSelected ? 18 : 12;

        const customIcon = L.divIcon({
          className: 'custom-hosp-pin',
          html: `<div style="
            background-color: ${pinColor};
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            border: 2px solid #ffffff;
            box-shadow: 0 0 ${isSelected ? '12px' : '6px'} ${pinColor};
            transition: all 0.2s ease;
          "></div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2]
        });

        const marker = L.marker([h.latitude, h.longitude], { icon: customIcon }).addTo(map);

        const popupContent = `
          <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; min-width: 180px;">
            <div style="font-weight: bold; font-size: 13px; margin-bottom: 4px; color: #1e293b;">
              ${h.name}
            </div>
            <div style="color: #64748b; font-size: 11px; margin-bottom: 6px;">
              ID: ${h.id} • Lat: ${h.latitude.toFixed(4)}, Lon: ${h.longitude.toFixed(4)}
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; background: #f8fafc; padding: 6px; border-radius: 4px; border: 1px solid #e2e8f0;">
              <div><strong>ICU:</strong> <span style="color: ${icu > 0 ? '#16a34a' : '#dc2626'}; font-weight: bold;">${icu}</span></div>
              <div><strong>Vent:</strong> ${vent}</div>
              <div><strong>Oxygen:</strong> ${oxy}</div>
              <div><strong>General:</strong> ${gen}</div>
            </div>
          </div>
        `;
        marker.bindPopup(popupContent);

        marker.on('click', () => {
          if (onSelectHospital) onSelectHospital(h.id);
        });

        markersRef.current[h.id] = marker;
      });

      // Highlight coordinate pin (ambulance or request)
      if (highlightCoordinates) {
        const ambIcon = L.divIcon({
          className: 'custom-amb-pin',
          html: `<div style="
            background-color: #38bdf8;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 3px solid #ffffff;
            box-shadow: 0 0 15px #38bdf8;
            animation: pulse 1.5s infinite;
          "></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
        const ambMarker = L.marker([highlightCoordinates.lat, highlightCoordinates.lon], { icon: ambIcon })
          .addTo(map)
          .bindPopup('<b>Emergency Origin</b><br/>Dispatch Target Point');
        ambMarker.openPopup();
      }
    });

    return () => {
      isMounted = false;
    };
  }, [hospitals, selectedHospitalId, highlightCoordinates, onSelectHospital]);

  return (
    <div className="relative w-full h-full min-h-[500px] rounded-xl overflow-hidden border border-slate-800 shadow-xl bg-slate-900">
      <div ref={mapRef} className="w-full h-full min-h-[500px]" />
      <div className="absolute bottom-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur px-3 py-2 rounded-lg border border-slate-700 text-xs text-slate-300 shadow-lg flex items-center gap-4">
        <span className="font-semibold text-slate-100">ICU Capacity:</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Available (&ge;4)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Low (1-3)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Critical (0)</span>
      </div>
    </div>
  );
}
