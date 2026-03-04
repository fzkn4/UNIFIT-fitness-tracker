import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, realtimeDb } from '../lib/firebase';
import { ref, onValue, get } from 'firebase/database';

const { width } = Dimensions.get('window');

interface Mission {
  id: string;
  title: string;
  description: string;
  location?: string;
  targetDistance: number;
  targetPace: string;
  status: 'active' | 'draft';
  assignedPersonnel: string[];
  routineType: 'once' | 'daily' | 'weekly' | 'monthly';
  deadline?: string;
  adminId: string;
  createdAt: number;
}

export default function RoutinesScreen({ navigation }: any) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [userRuns, setUserRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const missionsRef = ref(realtimeDb, 'missions');
    const unsubscribeMissions = onValue(missionsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const activeMissions: Mission[] = Object.keys(data)
          .map((key) => ({
            id: key,
            ...data[key],
          }))
          .filter(
            (mission: Mission) =>
              mission.status === 'active' &&
              mission.assignedPersonnel &&
              mission.assignedPersonnel.includes(user.uid)
          );
        
        activeMissions.sort((a, b) => b.createdAt - a.createdAt);
        setMissions(activeMissions);
      } else {
        setMissions([]);
      }
      setLoading(false);
    });

    const runsRef = ref(realtimeDb, 'runs');
    const unsubscribeRuns = onValue(runsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const runs: any[] = Object.keys(data)
          .map(key => ({
            id: key,
            ...data[key]
          }))
          .filter(run => run.userId === user.uid);
        setUserRuns(runs);
      } else {
        setUserRuns([]);
      }
    });

    return () => {
      unsubscribeMissions();
      unsubscribeRuns();
    };
  }, []);

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? dateString : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const fetchMissionData = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const missionsRef = ref(realtimeDb, 'missions');
      const missionsSnapshot = await get(missionsRef);
      if (missionsSnapshot.exists()) {
        const data = missionsSnapshot.val();
        const activeMissions: Mission[] = Object.keys(data)
          .map((key) => ({ id: key, ...data[key] }))
          .filter(
            (mission: Mission) =>
              mission.status === 'active' &&
              mission.assignedPersonnel &&
              mission.assignedPersonnel.includes(user.uid)
          );
        activeMissions.sort((a, b) => b.createdAt - a.createdAt);
        setMissions(activeMissions);
      } else {
        setMissions([]);
      }

      const runsRef = ref(realtimeDb, 'runs');
      const runsSnapshot = await get(runsRef);
      if (runsSnapshot.exists()) {
        const data = runsSnapshot.val();
        const runs: any[] = Object.keys(data)
          .map(key => ({ id: key, ...data[key] }))
          .filter(run => run.userId === user.uid);
        setUserRuns(runs);
      } else {
        setUserRuns([]);
      }
    } catch (error) {
      console.error("Error fetching routine data:", error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMissionData();
    setRefreshing(false);
  }, []);

  return (
    <View style={styles.container}>
      {/* Background Gradients */}
      <View style={styles.bgGlowTop} />
      
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Routines</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loaderText}>Fetching your routines...</Text>
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {missions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="map-outline" size={48} color={colors.mutedForeground} />
              </View>
              <Text style={styles.emptyTitle}>No Routines Assigned</Text>
              <Text style={styles.emptyDesc}>
                You currently have no active running routines. Check back later when your admin assigns a new mission!
              </Text>
            </View>
          ) : (
            missions.map((mission) => {
              // Calculate cumulative progress
              const missionRuns = userRuns.filter(r => r.missionId === mission.id);
              const cumulativeDistanceMeters = missionRuns.reduce((sum, r) => sum + (r.distance || 0), 0);
              const cumulativeDistanceKm = cumulativeDistanceMeters / 1000;
              const targetKm = mission.targetDistance || 0;
              
              let progressPercentage = targetKm > 0 ? (cumulativeDistanceKm / targetKm) * 100 : 0;
              if (progressPercentage > 100) progressPercentage = 100;
              const isCompleted = cumulativeDistanceKm >= targetKm && targetKm > 0;
              const isStarted = cumulativeDistanceKm > 0;

              return (
                <View key={mission.id} style={styles.missionCard}>
                  
                  {/* Header Row */}
                  <View style={styles.missionHeader}>
                    <Text style={styles.missionTitle}>{mission.title}</Text>
                    
                    {/* Badge */}
                    {mission.routineType === 'once' ? (
                       <View style={[styles.badgeContainer, { backgroundColor: 'rgba(56,189,248,0.1)', borderColor: 'rgba(56,189,248,0.3)' }]}>
                          <Ionicons name="calendar-outline" size={12} color={colors.primary} />
                          <Text style={[styles.badgeText, { color: colors.primary }]}>
                            Due: {mission.deadline ? formatDate(mission.deadline) : 'No date'}
                          </Text>
                       </View>
                    ) : (
                      <View style={[styles.badgeContainer, { backgroundColor: 'rgba(139,92,246,0.1)', borderColor: 'rgba(139,92,246,0.3)' }]}>
                          <Ionicons name="repeat-outline" size={12} color="#8b5cf6" />
                          <Text style={[styles.badgeText, { color: "#8b5cf6" }]}>
                            {mission.routineType.charAt(0).toUpperCase() + mission.routineType.slice(1)}
                          </Text>
                       </View>
                    )}
                  </View>

                  {/* Location */}
                  <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
                    <Text style={styles.locationText}>{mission.location || 'Anywhere'}</Text>
                  </View>

                  <Text style={styles.missionDesc} numberOfLines={2}>
                    {mission.description}
                  </Text>

                  {/* Progress Bar Container */}
                  <View style={styles.progressContainer}>
                    <View style={styles.progressHeaderRow}>
                      <Text style={styles.progressTextLabel}>Progress</Text>
                      <Text style={styles.progressTextValue}>
                        {(Math.round(cumulativeDistanceKm * 100) / 100).toFixed(2)} / {targetKm} km
                      </Text>
                    </View>
                    <View style={styles.progressBarBackground}>
                      <View 
                        style={[
                          styles.progressBarFill, 
                          { width: `${progressPercentage}%` },
                          isCompleted ? { backgroundColor: '#10b981' } : {} 
                        ]} 
                      />
                    </View>
                  </View>

                  {/* Stats Footer & Actions */}
                  <View style={styles.missionFooter}>
                    <View style={styles.missionStats}>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Target Dist</Text>
                        <Text style={styles.statValue}>{targetKm} km</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Expected Pace</Text>
                        <Text style={styles.statValue}>{mission.targetPace || '--'}</Text>
                      </View>
                    </View>
                    
                    {isCompleted ? (
                      <View style={[styles.startButton, { backgroundColor: 'rgba(16,185,129,0.2)' }]}>
                         <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                         <Text style={[styles.startButtonText, { color: '#10b981' }]}>Completed</Text>
                      </View>
                    ) : (
                      <TouchableOpacity 
                        style={[styles.startButton, isStarted ? { backgroundColor: '#f59e0b' } : {}]}
                        onPress={() => navigation.navigate('RunTracker', {
                           missionId: mission.id,
                           missionTitle: mission.title 
                        })}
                      >
                        <Text style={styles.startButtonText}>
                          {isStarted ? "Continue" : "Start"}
                        </Text>
                        <Ionicons name="arrow-forward" size={16} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
          
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1c',
  },
  bgGlowTop: {
    position: 'absolute',
    top: -150,
    left: width / 2 - 200,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(56,189,248,0.10)',
    zIndex: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(17,24,39,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(51,65,85,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    marginTop: 16,
    color: colors.mutedForeground,
    fontSize: 16,
    fontWeight: '500',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(51,65,85,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  emptyDesc: {
    fontSize: 15,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 22,
  },
  missionCard: {
    backgroundColor: 'rgba(17,24,39,0.6)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(51,65,85,0.4)',
  },
  missionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  missionTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginRight: 10,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  locationText: {
    fontSize: 13,
    color: colors.mutedForeground,
    fontWeight: '500',
  },
  missionDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 20,
    marginBottom: 20,
  },
  missionFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(51,65,85,0.4)',
    paddingTop: 16,
  },
  missionStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  startButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  progressTextLabel: {
    fontSize: 13,
    color: colors.mutedForeground,
    fontWeight: '600',
  },
  progressTextValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: 'rgba(51,65,85,0.6)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
});
