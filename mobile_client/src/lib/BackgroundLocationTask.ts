import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { getRunState, saveRunState } from './RunStateManager';

export const BACKGROUND_LOCATION_TASK = 'unifit-background-location';

// Haversine formula
function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// MUST be defined at global scope — this runs in a headless JS environment
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background location error:', error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (!locations || locations.length === 0) return;

    try {
      const state = await getRunState();
      if (!state.isRunning) return;

      for (const loc of locations) {
        const { latitude, longitude } = loc.coords;

        // Calculate incremental distance
        if (state.lastLatitude !== null && state.lastLongitude !== null) {
          const dist = getDistanceFromLatLonInMeters(
            state.lastLatitude, state.lastLongitude,
            latitude, longitude
          );
          // Filter out GPS noise: ignore jumps > 100m in a single update  
          if (dist < 100) {
            state.distance += dist;
          }
        }

        state.routeCoordinates.push({ latitude, longitude });
        state.lastLatitude = latitude;
        state.lastLongitude = longitude;
      }

      await saveRunState(state);
    } catch (e) {
      console.error('Error processing background location:', e);
    }
  }
});

export const startBackgroundTracking = async (): Promise<void> => {
  // Request background location permission
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') {
    throw new Error('Foreground location permission not granted');
  }

  const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
  if (bgStatus !== 'granted') {
    console.warn('Background location permission not granted — tracking will pause in background');
  }

  // Check if already running
  const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
  if (isRunning) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 2000,
    distanceInterval: 1,
    deferredUpdatesInterval: 1000,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Unifit — Recording Run',
      notificationBody: 'Your run is being tracked. Tap to return to the app.',
      notificationColor: '#38bdf8',
    },
  });
};

export const stopBackgroundTracking = async (): Promise<void> => {
  try {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
  } catch (e) {
    console.error('Error stopping background tracking:', e);
  }
};
