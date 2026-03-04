import AsyncStorage from '@react-native-async-storage/async-storage';
import { realtimeDb } from './firebase';
import { ref, push, set } from 'firebase/database';

const PENDING_RUNS_KEY = '@unifit_pending_runs';
const CACHED_ROUTINES_KEY = '@unifit_cached_routines';

export interface PendingRun {
  userId: string;
  userName: string;
  distance: number;
  duration: number;
  averagePace: string;
  route: any[];
  timestamp: number;
  missionId: string | null;
  missionTitle: string | null;
}

export const saveRunOffline = async (run: PendingRun) => {
  try {
    const existingStr = await AsyncStorage.getItem(PENDING_RUNS_KEY);
    const existing: PendingRun[] = existingStr ? JSON.parse(existingStr) : [];
    existing.push(run);
    await AsyncStorage.setItem(PENDING_RUNS_KEY, JSON.stringify(existing));
    console.log(`Saved run offline. Total pending: ${existing.length}`);
  } catch (error) {
    console.error("Failed to save offline run:", error);
  }
};

export const getOfflineRuns = async (): Promise<PendingRun[]> => {
  try {
    const existingStr = await AsyncStorage.getItem(PENDING_RUNS_KEY);
    return existingStr ? JSON.parse(existingStr) : [];
  } catch (error) {
    console.error("Failed to fetch pending offline runs:", error);
    return [];
  }
};

export const syncOfflineRuns = async (): Promise<void> => {
  try {
    const pendingRuns = await getOfflineRuns();
    if (pendingRuns.length === 0) return;

    console.log(`Attempting to sync ${pendingRuns.length} pending runs...`);

    const runsRef = ref(realtimeDb, 'runs');
    const successfulSyncs: number[] = [];

    // Use a basic loop instead of Promise.all to avoid mass hammering if many runs
    for (let i = 0; i < pendingRuns.length; i++) {
        const run = pendingRuns[i];
        try {
            const newRunRef = push(runsRef);
            await set(newRunRef, run);
            successfulSyncs.push(i);
        } catch (e) {
            console.error(`Failed to sync pending run index ${i}:`, e);
            // Continues to try the others
        }
    }

    if (successfulSyncs.length === pendingRuns.length) {
       // Everything succeeded
       await AsyncStorage.removeItem(PENDING_RUNS_KEY);
       console.log('Successfully synced all offline runs!');
    } else if (successfulSyncs.length > 0) {
       // Partial success
       const remaining = pendingRuns.filter((_, idx) => !successfulSyncs.includes(idx));
       await AsyncStorage.setItem(PENDING_RUNS_KEY, JSON.stringify(remaining));
       console.log(`Synced ${successfulSyncs.length}, ${remaining.length} remain.`);
    }

  } catch (error) {
    console.error("Critical error in syncOfflineRuns:", error);
  }
};

// --- Routines Caching ---

export interface CachedRoutinesData {
  missions: any[];
  userRuns: any[];
  timestamp: number;
}

export const cacheRoutinesData = async (missions: any[], userRuns: any[]) => {
  try {
    const data: CachedRoutinesData = {
      missions,
      userRuns,
      timestamp: Date.now()
    };
    await AsyncStorage.setItem(CACHED_ROUTINES_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to cache routines data:", error);
  }
};

export const getCachedRoutinesData = async (): Promise<CachedRoutinesData | null> => {
  try {
    const str = await AsyncStorage.getItem(CACHED_ROUTINES_KEY);
    return str ? JSON.parse(str) : null;
  } catch (error) {
    console.error("Failed to fetch cached routines data:", error);
    return null;
  }
};
