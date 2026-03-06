import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { Platform, PermissionsAndroid } from 'react-native';
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
        const locTimestamp = loc.timestamp || Date.now();

        // Calculate incremental distance
        if (state.lastLatitude !== null && state.lastLongitude !== null) {
          const dist = getDistanceFromLatLonInMeters(
            state.lastLatitude, state.lastLongitude,
            latitude, longitude
          );
          // Filter out GPS noise: ignore jumps > 100m in a single update  
          if (dist < 100) {
            state.distance += dist;
            
            // Track moving time: if moved > 1m, count the time interval as moving
            if (dist > 1 && state.lastTimestamp > 0) {
              const timeDelta = (locTimestamp - state.lastTimestamp) / 1000; // seconds
              // Cap at 30s to filter out gaps from deferred updates
              if (timeDelta > 0 && timeDelta < 30) {
                state.movingTime += timeDelta;
              }
            }
          }
        }

        state.routeCoordinates.push({ latitude, longitude });
        state.lastLatitude = latitude;
        state.lastLongitude = longitude;
        state.lastTimestamp = locTimestamp;
      }

      await saveRunState(state);
    } catch (e) {
      console.error('Error processing background location:', e);
    }
  }
});

export const startBackgroundTracking = async (): Promise<void> => {
  // Request foreground location permission
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') {
    throw new Error('Foreground location permission not granted');
  }

  // Request background location permission
  const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
  if (bgStatus !== 'granted') {
    console.warn('Background location permission not granted — tracking will pause in background');
  }

  // Android 13+ (API 33): Request POST_NOTIFICATIONS permission for the foreground service notification
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: 'Notification Permission',
          message: 'Unifit needs notification access to show your active run status.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.warn('POST_NOTIFICATIONS permission denied — notification banner may not appear');
      }
    } catch (e) {
      console.warn('Error requesting notification permission:', e);
    }
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
      killServiceOnDestroy: false,
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
