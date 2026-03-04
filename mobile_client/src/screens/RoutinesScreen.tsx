import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Dimensions, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, realtimeDb } from '../lib/firebase';
import { ref, onValue } from 'firebase/database';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const missionsRef = ref(realtimeDb, 'missions');
    const unsubscribe = onValue(missionsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const userMissions: Mission[] = Object.keys(data)
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
        
        userMissions.sort((a, b) => b.createdAt - a.createdAt);
        setMissions(userMissions);
      } else {
        setMissions([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? dateString : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

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
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
            missions.map((mission) => (
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

                {/* Stats Footer & Actions */}
                <View style={styles.missionFooter}>
                  <View style={styles.missionStats}>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Target Dist</Text>
                      <Text style={styles.statValue}>{mission.targetDistance} km</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Expected Pace</Text>
                      <Text style={styles.statValue}>{mission.targetPace}</Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.startButton}
                    onPress={() => navigation.navigate('RunTracker', {
                       missionId: mission.id,
                       missionTitle: mission.title 
                    })}
                  >
                    <Text style={styles.startButtonText}>Start Mission</Text>
                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
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
});
