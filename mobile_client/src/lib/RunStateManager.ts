import AsyncStorage from '@react-native-async-storage/async-storage';

const RUN_STATE_KEY = '@unifit_run_state';

export interface RunState {
  isRunning: boolean;
  startTime: number; // Date.now() when run started
  distance: number; // meters
  movingTime: number; // seconds of actual movement
  lastTimestamp: number; // epoch ms of last GPS update
  routeCoordinates: { latitude: number; longitude: number }[];
  lastLatitude: number | null;
  lastLongitude: number | null;
  missionId: string | null;
  missionTitle: string | null;
}

const DEFAULT_STATE: RunState = {
  isRunning: false,
  startTime: 0,
  distance: 0,
  movingTime: 0,
  lastTimestamp: 0,
  routeCoordinates: [],
  lastLatitude: null,
  lastLongitude: null,
  missionId: null,
  missionTitle: null,
};

export const saveRunState = async (state: RunState): Promise<void> => {
  try {
    await AsyncStorage.setItem(RUN_STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save run state:', e);
  }
};

export const getRunState = async (): Promise<RunState> => {
  try {
    const str = await AsyncStorage.getItem(RUN_STATE_KEY);
    return str ? JSON.parse(str) : { ...DEFAULT_STATE };
  } catch (e) {
    console.error('Failed to get run state:', e);
    return { ...DEFAULT_STATE };
  }
};

export const clearRunState = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(RUN_STATE_KEY, JSON.stringify({ ...DEFAULT_STATE }));
  } catch (e) {
    console.error('Failed to clear run state:', e);
  }
};

export const initRunState = async (missionId: string | null, missionTitle: string | null): Promise<RunState> => {
  const state: RunState = {
    isRunning: true,
    startTime: Date.now(),
    distance: 0,
    movingTime: 0,
    lastTimestamp: Date.now(),
    routeCoordinates: [],
    lastLatitude: null,
    lastLongitude: null,
    missionId,
    missionTitle,
  };
  await saveRunState(state);
  return state;
};
