import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Polyline } from 'react-native-maps';

const { height } = Dimensions.get('window');

interface RunDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  run: any | null;
}

export default function RunDetailsModal({ visible, onClose, run }: RunDetailsModalProps) {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (visible && run && run.route && run.route.length > 0) {
      // Zoom map to fit the route after a short delay to ensure map has mounted
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.fitToCoordinates(run.route, {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
          });
        }
      }, 500);
    }
  }, [visible, run]);

  if (!run) return null;

  const formatActivityDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return '--:--';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  };

  const getRunPace = (run: any) => {
    // Some mock data has `time` instead of `duration`
    if (run.averagePace && run.averagePace !== '--') return run.averagePace;
    const duration = run.duration || run.time || 0;
    const distanceKm = run.distance / 1000;
    
    if (distanceKm <= 0 || duration <= 0) return '--';
    
    const avgPaceSeconds = duration / distanceKm;
    const paceMins = Math.floor(avgPaceSeconds / 60);
    const paceSecs = Math.floor(avgPaceSeconds % 60);
    return `${paceMins}'${paceSecs.toString().padStart(2, '0')}"`;
  };

  // Check if we have valid coordinates array to draw
  const hasRoute = run.route && Array.isArray(run.route) && run.route.length > 0;

  // Initial region for the map if there are coordinates, else try to use the very first one
  const initialRegion = hasRoute ? {
    latitude: run.route[0].latitude,
    longitude: run.route[0].longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  } : undefined;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackground}>
        <View style={styles.modalContent}>
          
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Run Details</Text>
            <View style={{ width: 44 }} /> 
          </View>

          {/* Map Section */}
          <View style={styles.mapContainer}>
            {hasRoute ? (
              <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={initialRegion}
                customMapStyle={mapStyle}
                showsUserLocation={false}
                pitchEnabled={false}
              >
                <Polyline
                  coordinates={run.route}
                  strokeColor="#38bdf8"
                  strokeWidth={5}
                />
              </MapView>
            ) : (
                <View style={styles.noRouteContainer}>
                   <Ionicons name="map-outline" size={48} color={colors.mutedForeground} style={{marginBottom: 16}} />
                   <Text style={styles.noRouteText}>No GPS route data recorded for this run.</Text>
                </View>
            )}
            <LinearGradient
              colors={['transparent', '#111827']}
              style={styles.mapOverlayBottom}
            />
          </View>

          {/* Statistics Section */}
          <View style={styles.detailsContainer}>
            <View style={styles.titleRow}>
               <View>
                 <Text style={styles.runTitle}>{run.missionTitle ? run.missionTitle : 'Outdoor Run'}</Text>
                 <Text style={styles.runDate}>{formatActivityDate(run.timestamp)}</Text>
               </View>
               <View style={styles.iconBadge}>
                  <Ionicons name={run.missionId ? "flag" : "walk"} size={24} color={run.missionId ? "#8b5cf6" : colors.primary} />
               </View>
            </View>

            <View style={styles.statsGrid}>
              
              <View style={styles.statMainBox}>
                <Text style={styles.statMainLabel}>Distance</Text>
                <Text style={styles.statMainValue}>{(run.distance / 1000).toFixed(2)}</Text>
                <Text style={styles.statMainUnit}>Kilometers</Text>
              </View>

              <View style={styles.secondaryStatsContainer}>
                <View style={styles.statMiniBox}>
                   <Ionicons name="time-outline" size={16} color={colors.mutedForeground} />
                   <View style={styles.statMiniTextContainer}>
                      <Text style={styles.statMiniLabel}>Duration</Text>
                      <Text style={styles.statMiniValue}>{formatTime(run.duration || run.time)}</Text>
                   </View>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statMiniBox}>
                   <Ionicons name="speedometer-outline" size={16} color={colors.mutedForeground} />
                   <View style={styles.statMiniTextContainer}>
                      <Text style={styles.statMiniLabel}>Avg Pace</Text>
                      <Text style={styles.statMiniValue}>{getRunPace(run)} /km</Text>
                   </View>
                </View>

                 <View style={styles.statDivider} />

                <View style={styles.statMiniBox}>
                   <Ionicons name="flame-outline" size={16} color="#f97316" />
                   <View style={styles.statMiniTextContainer}>
                      <Text style={styles.statMiniLabel}>Calories</Text>
                      <Text style={styles.statMiniValue}>{(run.distance * 0.06).toFixed(0)} kcal</Text>
                   </View>
                </View>
              </View>

            </View>

          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: height * 0.90,
    backgroundColor: '#111827',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15,23,42,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(51,65,85,0.6)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  mapContainer: {
    height: '55%',
    width: '100%',
    backgroundColor: '#0a0f1c',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapOverlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100, // Gradient fade into the details section
  },
  noRouteContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  noRouteText: {
    color: colors.mutedForeground,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
  },
  detailsContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  runTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  runDate: {
    fontSize: 14,
    color: colors.mutedForeground,
    fontWeight: '500',
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(56,189,248,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
  },
  statsGrid: {
    alignItems: 'center',
  },
  statMainBox: {
    alignItems: 'center',
    marginBottom: 32,
  },
  statMainLabel: {
    fontSize: 14,
    color: colors.mutedForeground,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  statMainValue: {
    fontSize: 64,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 70,
    letterSpacing: -2,
  },
  statMainUnit: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  secondaryStatsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(30,41,59,0.5)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(51,65,85,0.5)',
    width: '100%',
  },
  statMiniBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  statMiniTextContainer: {
    alignItems: 'flex-start',
  },
  statMiniLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  statMiniValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: 'rgba(51,65,85,0.6)',
    alignSelf: 'center',
  }
});

const mapStyle = [
  { "elementType": "geometry", "stylers": [{"color": "#1d2c4d"}] },
  { "elementType": "labels.text.fill", "stylers": [{"color": "#8ec3b9"}] },
  { "elementType": "labels.text.stroke", "stylers": [{"color": "#1a3646"}] },
  { "featureType": "administrative.country", "elementType": "geometry.stroke", "stylers": [{"color": "#4b6878"}] },
  { "featureType": "administrative.land_parcel", "elementType": "labels.text.fill", "stylers": [{"color": "#64779e"}] },
  { "featureType": "landscape.man_made", "elementType": "geometry.stroke", "stylers": [{"color": "#334e87"}] },
  { "featureType": "landscape.natural", "elementType": "geometry", "stylers": [{"color": "#023e58"}] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{"color": "#283d6a"}] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{"color": "#6f9ba5"}] },
  { "featureType": "poi", "elementType": "labels.text.stroke", "stylers": [{"color": "#1d2c4d"}] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{"color": "#304a7d"}] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{"color": "#98a5be"}] },
  { "featureType": "road", "elementType": "labels.text.stroke", "stylers": [{"color": "#1d2c4d"}] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{"color": "#0e1626"}] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{"color": "#4e6d70"}] }
];
