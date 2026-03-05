"use client";

import React, { useEffect, useRef } from 'react';
import { X, MapPin, Clock, Zap, Flame, Calendar } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import map components to avoid SSR issues with Leaflet
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
);

interface RunDetailModalProps {
  visible: boolean;
  onClose: () => void;
  run: any | null;
}

export default function RunDetailModal({ visible, onClose, run }: RunDetailModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (visible) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [visible, onClose]);

  if (!visible || !run) return null;

  const hasRoute = run.route && Array.isArray(run.route) && run.route.length > 0;

  // Convert route to Leaflet [lat, lng] format
  const polylinePositions = hasRoute
    ? run.route.map((coord: any) => [coord.latitude, coord.longitude] as [number, number])
    : [];

  // Calculate map center and bounds
  let center: [number, number] = [14.5995, 120.9842]; // Default: Manila
  if (hasRoute) {
    const lats = run.route.map((c: any) => c.latitude);
    const lngs = run.route.map((c: any) => c.longitude);
    center = [
      (Math.min(...lats) + Math.max(...lats)) / 2,
      (Math.min(...lngs) + Math.max(...lngs)) / 2,
    ];
  }

  // Format helpers
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  };

  const formatDuration = (secs: number) => {
    if (!secs) return '--:--';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  };

  const getPace = () => {
    if (run.averagePace && run.averagePace !== '--') return run.averagePace;
    const duration = run.duration || 0;
    const distKm = (run.distance || 0) / 1000;
    if (distKm <= 0 || duration <= 0) return '--';
    const paceS = duration / distKm;
    const pM = Math.floor(paceS / 60);
    const pS = Math.floor(paceS % 60).toString().padStart(2, '0');
    return `${pM}'${pS}"`;
  };

  const distanceKm = ((run.distance || 0) / 1000).toFixed(2);
  const calories = ((run.distance || 0) * 0.06).toFixed(0);

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="bg-[#111827] border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Run Details</h2>
              <p className="text-xs text-slate-400">
                {run.userName || run.name || 'Personnel'} • {formatDate(run.timestamp)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1">
          {/* Map Section */}
          <div className="h-72 w-full bg-slate-900 relative">
            {hasRoute ? (
              <MapContainer
                center={center}
                zoom={15}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
                // @ts-ignore
                whenReady={(mapInstance: any) => {
                  if (polylinePositions.length > 1) {
                    const L = require('leaflet');
                    const bounds = L.latLngBounds(polylinePositions);
                    mapInstance.target.fitBounds(bounds, { padding: [30, 30] });
                  }
                }}
              >
                <TileLayer
                  // @ts-ignore
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                <Polyline
                  // @ts-ignore
                  positions={polylinePositions}
                  pathOptions={{ color: '#38bdf8', weight: 4, opacity: 0.9 }}
                />
              </MapContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-3">
                <MapPin className="w-12 h-12 text-slate-700" />
                <p className="text-slate-500 text-sm">No GPS route data recorded for this run.</p>
              </div>
            )}
          </div>

          {/* Stats Section */}
          <div className="p-6 space-y-6">
            {/* Title Row */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white">
                  {run.missionTitle || 'Outdoor Run'}
                </h3>
                <p className="text-sm text-slate-400 mt-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(run.timestamp)}
                </p>
              </div>
              {run.missionId && (
                <span className="px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full text-xs font-bold uppercase tracking-wider">
                  Mission Run
                </span>
              )}
            </div>

            {/* Big Distance */}
            <div className="text-center py-4">
              <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-2">Distance</p>
              <p className="text-6xl font-extrabold text-white tracking-tight">{distanceKm}</p>
              <p className="text-sm text-primary font-semibold uppercase tracking-wider mt-1">Kilometers</p>
            </div>

            {/* Secondary Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Duration</p>
                </div>
                <p className="text-xl font-bold text-white">{formatDuration(run.duration)}</p>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <Zap className="w-4 h-4 text-slate-500" />
                  <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Avg Pace</p>
                </div>
                <p className="text-xl font-bold text-white">{getPace()} <span className="text-sm text-slate-400 font-normal">/km</span></p>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Calories</p>
                </div>
                <p className="text-xl font-bold text-white">{calories} <span className="text-sm text-slate-400 font-normal">kcal</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
