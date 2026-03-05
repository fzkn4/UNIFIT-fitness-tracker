import React, { useRef, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface OSMMapViewProps {
  style?: any;
  center?: Coordinate;
  routeCoordinates?: Coordinate[];
  showUserLocation?: boolean;
  followUser?: boolean;
  zoom?: number;
  interactive?: boolean;
  fitRoute?: boolean;
}

export default function OSMMapView({
  style,
  center,
  routeCoordinates = [],
  showUserLocation = false,
  followUser = false,
  zoom = 16,
  interactive = true,
  fitRoute = false,
}: OSMMapViewProps) {
  const webViewRef = useRef<any>(null);

  // Update route when coordinates change (for live tracking)
  useEffect(() => {
    if (webViewRef.current && routeCoordinates.length > 0) {
      const coordsJson = JSON.stringify(
        routeCoordinates.map((c) => [c.latitude, c.longitude])
      );
      webViewRef.current.injectJavaScript(`
        if (window.updateRoute) window.updateRoute(${coordsJson});
        true;
      `);
    }
  }, [routeCoordinates]);

  // Update user location marker
  useEffect(() => {
    if (webViewRef.current && center && showUserLocation) {
      webViewRef.current.injectJavaScript(`
        if (window.updateUserLocation) window.updateUserLocation(${center.latitude}, ${center.longitude});
        true;
      `);
    }
  }, [center, showUserLocation]);

  const initialCenter = center || { latitude: 14.5995, longitude: 120.9842 };
  const initialRouteJson = JSON.stringify(
    routeCoordinates.map((c) => [c.latitude, c.longitude])
  );

  const html = useMemo(() => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        * { margin: 0; padding: 0; }
        html, body, #map { width: 100%; height: 100%; }
        .leaflet-control-attribution { display: none !important; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', {
          zoomControl: false,
          attributionControl: false,
          dragging: ${interactive},
          touchZoom: ${interactive},
          scrollWheelZoom: ${interactive},
          doubleClickZoom: ${interactive},
          boxZoom: false,
          keyboard: false,
        }).setView([${initialCenter.latitude}, ${initialCenter.longitude}], ${zoom});

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
        }).addTo(map);

        var routeLine = null;
        var userMarker = null;

        // Create a pulsing user location marker
        var userIcon = L.divIcon({
          className: 'user-location',
          html: '<div style="position:relative;width:20px;height:20px;"><div style="position:absolute;inset:0;background:rgba(56,189,248,0.3);border-radius:50%;animation:pulse 2s infinite;"></div><div style="position:absolute;top:3px;left:3px;width:14px;height:14px;background:#38bdf8;border-radius:50%;border:3px solid #fff;box-shadow:0 0 10px rgba(56,189,248,0.8);"></div></div><style>@keyframes pulse{0%{transform:scale(1);opacity:1}100%{transform:scale(2.5);opacity:0}}</style>',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        // Start/end markers
        var startIcon = L.divIcon({
          className: 'start-marker',
          html: '<div style="width:12px;height:12px;background:#10b981;border-radius:50%;border:2px solid #fff;box-shadow:0 0 8px rgba(16,185,129,0.6);"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });

        var startMarker = null;

        window.updateRoute = function(coords) {
          if (routeLine) map.removeLayer(routeLine);
          if (coords.length > 0) {
            routeLine = L.polyline(coords, {
              color: '#38bdf8',
              weight: 4,
              opacity: 0.9,
              smoothFactor: 1,
            }).addTo(map);

            // Add start marker on first point
            if (!startMarker && coords.length > 0) {
              startMarker = L.marker(coords[0], { icon: startIcon }).addTo(map);
            }

            ${fitRoute ? `
              map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });
            ` : `
              // Follow the latest point
              var last = coords[coords.length - 1];
              map.setView(last, map.getZoom());
            `}
          }
        };

        window.updateUserLocation = function(lat, lng) {
          if (userMarker) {
            userMarker.setLatLng([lat, lng]);
          } else {
            userMarker = L.marker([lat, lng], { icon: userIcon }).addTo(map);
          }
          ${followUser ? 'map.setView([lat, lng], map.getZoom());' : ''}
        };

        // Initialize with any existing route
        var initialRoute = ${initialRouteJson};
        if (initialRoute.length > 0) {
          window.updateRoute(initialRoute);
        }
        // Always show user marker if showUserLocation is on
        ${showUserLocation ? `
          window.updateUserLocation(${initialCenter.latitude}, ${initialCenter.longitude});
        ` : ''}
      </script>
    </body>
    </html>
  `, []);

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        androidLayerType="hardware"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0a0f1c',
  },
});
