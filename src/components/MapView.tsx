'use client';

import { useEffect, useRef } from 'react';
import { Facility } from '@/lib/types';

interface MapViewProps {
  facilities: Facility[];
  selectedId?: string;
  onSelectFacility: (id: string) => void;
}

// We'll load Leaflet dynamically since it requires window
export default function MapView({ facilities, selectedId, onSelectFacility }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined' || !mapRef.current) return;

    // Load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Load Leaflet JS
    const loadLeaflet = async () => {
      if (!(window as any).L) {
        await new Promise<void>((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = () => resolve();
          document.body.appendChild(script);
        });
      }

      const L = (window as any).L;

      // Initialize map if not already done
      if (!mapInstanceRef.current && mapRef.current) {
        // Center on Chicago
        const chicagoLat = 41.8781;
        const chicagoLng = -87.6298;

        mapInstanceRef.current = L.map(mapRef.current).setView([chicagoLat, chicagoLng], 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
        }).addTo(mapInstanceRef.current);
      }

      // Clear existing markers
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      // Add markers for each facility
      facilities.forEach((facility) => {
        const isSelected = facility.id === selectedId;
        
        // Create custom icon
        const iconHtml = `
          <div style="
            width: ${isSelected ? '36px' : '28px'};
            height: ${isSelected ? '36px' : '28px'};
            background: ${isSelected ? '#2563eb' : '#3b82f6'};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: ${isSelected ? '14px' : '12px'};
            font-weight: bold;
            transform: translate(-50%, -50%);
          ">
            ${facility.programs.some(p => p.enrollmentStatus === 'open') ? '✓' : '•'}
          </div>
        `;

        const icon = L.divIcon({
          html: iconHtml,
          className: 'custom-marker',
          iconSize: [isSelected ? 36 : 28, isSelected ? 36 : 28],
          iconAnchor: [isSelected ? 18 : 14, isSelected ? 18 : 14],
        });

        const marker = L.marker([facility.latitude, facility.longitude], { icon })
          .addTo(mapInstanceRef.current);

        // Create popup content
        const hasOpenEnrollment = facility.programs.some(p => p.enrollmentStatus === 'open');
        const lowestCost = Math.min(...facility.programs.map(p => p.costAmount || Infinity));
        const costDisplay = lowestCost === Infinity ? 'Contact' : 
          lowestCost === 0 ? 'Free' : `From $${lowestCost.toLocaleString()}/mo`;

        const popupContent = `
          <div style="min-width: 200px;">
            <div style="font-weight: 600; margin-bottom: 4px;">${facility.name}</div>
            <div style="font-size: 12px; color: #666; margin-bottom: 8px;">${facility.neighborhood}</div>
            <div style="font-size: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
              <span style="
                padding: 2px 8px;
                border-radius: 12px;
                background: ${hasOpenEnrollment ? '#dcfce7' : '#f3f4f6'};
                color: ${hasOpenEnrollment ? '#166534' : '#6b7280'};
              ">
                ${hasOpenEnrollment ? 'Enrolling' : 'Waitlist/Closed'}
              </span>
              <span style="color: #374151; font-weight: 500;">${costDisplay}</span>
            </div>
            <div style="font-size: 11px; color: #9ca3af; margin-top: 6px;">
              ${facility.programs.length} program${facility.programs.length > 1 ? 's' : ''} • ${facility.distanceMiles?.toFixed(1)} mi
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);
        marker.on('click', () => {
          onSelectFacility(facility.id);
        });

        markersRef.current.push(marker);
      });

      // Fit bounds if we have facilities
      if (facilities.length > 0) {
        const bounds = L.latLngBounds(
          facilities.map((f) => [f.latitude, f.longitude])
        );
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    };

    loadLeaflet();

    return () => {
      // Cleanup markers but keep map instance
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    };
  }, [facilities, selectedId, onSelectFacility]);

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-lg overflow-hidden border border-gray-200">
      <div ref={mapRef} className="w-full h-full" />
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md px-3 py-2 text-xs z-[1000]">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px]">✓</div>
          <span>Currently enrolling</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px]">•</div>
          <span>Waitlist / Closed</span>
        </div>
      </div>
    </div>
  );
}
