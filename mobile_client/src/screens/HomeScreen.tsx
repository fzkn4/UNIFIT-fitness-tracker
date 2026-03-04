import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Dimensions, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, realtimeDb } from '../lib/firebase';
import { ref, onValue, get } from 'firebase/database';
import { signOut } from 'firebase/auth';
import { useNetInfo } from '@react-native-community/netinfo';
import { syncOfflineRuns } from '../lib/OfflineSyncManager';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }: any) {
  const netInfo = useNetInfo();
  
  const [userName, setUserName] = useState('User');
  const [initials, setInitials] = useState('U');
  const [runs, setRuns] = useState<any[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut(auth);
              navigation.replace('Login');
            } catch (error) {
              console.error("Error signing out:", error);
            }
          }
        }
      ]
    );
  };

  // Background Sync when network returns
  useEffect(() => {
    if (netInfo.isConnected && netInfo.isInternetReachable !== false) {
      syncOfflineRuns();
    }
  }, [netInfo.isConnected, netInfo.isInternetReachable]);

  const onRefresh = useCallback(async () => {
    if (!netInfo.isConnected) {
      Alert.alert("Offline", "You cannot manually refresh while offline. Your new runs are safely saved locally.");
      return;
    }

    setRefreshing(true);
    const user = auth.currentUser;
    if (user) {
      try {
        const runsRef = ref(realtimeDb, 'runs');
        const snapshot = await get(runsRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          const userRuns: any[] = Object.keys(data)
            .map(key => ({
              id: key,
              ...data[key]
            }))
            .filter(run => run.userId === user.uid);
          
          userRuns.sort((a, b) => b.timestamp - a.timestamp);
          setRuns(userRuns);
        } else {
          setRuns([]);
        }
      } catch (error) {
        console.error("Error refreshing runs:", error);
      }
    }
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      // Set User Info
      const name = user.displayName || 'User';
      setUserName(name);
      setInitials(name.substring(0, 2).toUpperCase());

      // Fetch user's runs
      const runsRef = ref(realtimeDb, 'runs');
      const unsubscribe = onValue(runsRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const userRuns: any[] = Object.keys(data)
            .map(key => ({
              id: key,
              ...data[key]
            }))
            .filter(run => run.userId === user.uid);
          
          userRuns.sort((a, b) => b.timestamp - a.timestamp);
          setRuns(userRuns);
        } else {
          setRuns([]);
        }
        setLoadingRuns(false);
      });

      return () => unsubscribe();
    } else {
      setLoadingRuns(false);
    }
  }, []);

  // Calculate Weekly Stats (last 7 days)

  // Calculate Weekly Stats (last 7 days)
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weeklyRuns = runs.filter(r => r.timestamp > oneWeekAgo);
  
  const weekDistance = weeklyRuns.reduce((sum, r) => sum + r.distance, 0);
  const weekRunCount = weeklyRuns.length;
  
  // Calculate Average Pace for the week (weighted by time/distance to be accurate, but simplified here)
  let avgPaceStr = '--';
  if (weeklyRuns.length > 0) {
    const totalSeconds = weeklyRuns.reduce((sum, r) => sum + (r.duration || 0), 0);
    if (weekDistance > 0 && totalSeconds > 0) {
      const avgPaceSeconds = totalSeconds / (weekDistance / 1000); // distance is in meters
      const paceMins = Math.floor(avgPaceSeconds / 60);
      const paceSecs = Math.floor(avgPaceSeconds % 60);
      avgPaceStr = `${paceMins}'${paceSecs.toString().padStart(2, '0')}"`;
    }
  }

  const formatActivityDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getRunPace = (run: any) => {
    if (run.averagePace && run.averagePace !== '--') return run.averagePace;
    const duration = run.duration || run.time || 0;
    const distanceKm = run.distance / 1000;
    
    if (distanceKm <= 0 || duration <= 0) return '--';
    
    const avgPaceSeconds = duration / distanceKm;
    const paceMins = Math.floor(avgPaceSeconds / 60);
    const paceSecs = Math.floor(avgPaceSeconds % 60);
    return `${paceMins}'${paceSecs.toString().padStart(2, '0')}"`;
  };

  return (
    <View style={styles.container}>
      {/* Background Gradients */}
      <View style={styles.bgGlowTop} />
      
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
        {/* Offline Banner */}
        {netInfo.isConnected === false && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline" size={16} color="#f59e0b" />
            <Text style={styles.offlineBannerText}>
              Offline Mode. Runs will be saved locally.
            </Text>
          </View>
        )}

        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Ready to move?</Text>
            <Text style={styles.date}>{currentDate}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={24} color="#ef4444" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileBtn}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileText}>{initials}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Start Run Action Card */}
        <TouchableOpacity 
          style={styles.recordCardTouch} 
          onPress={() => navigation.navigate('RunTracker')}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#0284c7', '#38bdf8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.recordCard}
          >
            <View style={styles.recordCardInner}>
              <View style={styles.recordTextContainer}>
                <Text style={styles.recordTitle}>Start a Run</Text>
                <Text style={styles.recordSubtitle}>Track your pace, distance & route.</Text>
              </View>
              <View style={styles.playButton}>
                <Ionicons name="play" size={28} color="#0284c7" style={{ marginLeft: 4 }} />
              </View>
            </View>
            
            {/* Decorative Map Pattern in background */}
            <Ionicons name="map" size={140} color="rgba(255,255,255,0.1)" style={styles.cardBgIcon} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Assigned Routines Card */}
        <TouchableOpacity 
          style={[styles.recordCardTouch, { shadowColor: '#8b5cf6' }]} 
          onPress={() => navigation.navigate('Routines')}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#7c3aed', '#8b5cf6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.recordCard}
          >
            <View style={styles.recordCardInner}>
              <View style={styles.recordTextContainer}>
                <Text style={styles.recordTitle}>My Routines</Text>
                <Text style={styles.recordSubtitle}>View and start missions assigned by your admin.</Text>
              </View>
              <View style={styles.playButton}>
                <Ionicons name="list" size={28} color="#7c3aed" />
              </View>
            </View>
            
            {/* Decorative Pattern in background */}
            <Ionicons name="compass" size={140} color="rgba(255,255,255,0.1)" style={styles.cardBgIcon} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Weekly Stats Summary */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <View style={styles.statIconBadge}>
              <Ionicons name="footsteps" size={20} color={colors.primary} />
            </View>
            <Text style={styles.statValue}>{(Math.round((weekDistance / 1000) * 100) / 100).toFixed(2)}</Text>
            <Text style={styles.statLabel}>Week km</Text>
          </View>
          <View style={styles.statBox}>
            <View style={[styles.statIconBadge, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
              <Ionicons name="flame" size={20} color="#10b981" />
            </View>
            <Text style={styles.statValue}>{weekRunCount}</Text>
            <Text style={styles.statLabel}>Runs</Text>
          </View>
          <View style={styles.statBox}>
            <View style={[styles.statIconBadge, { backgroundColor: 'rgba(139,92,246,0.1)' }]}>
              <Ionicons name="time" size={20} color="#8b5cf6" />
            </View>
            <Text style={styles.statValue}>{avgPaceStr}</Text>
            <Text style={styles.statLabel}>Avg Pace</Text>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {runs.length > 0 ? (
            <TouchableOpacity onPress={() => navigation.navigate('RunHistory')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        
        {loadingRuns ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : runs.length === 0 ? (
          <View style={{ padding: 20, alignItems: 'center', backgroundColor: 'rgba(17,24,39,0.5)', borderRadius: 20 }}>
             <Ionicons name="footsteps-outline" size={32} color={colors.mutedForeground} style={{marginBottom: 8}} />
             <Text style={{color: colors.mutedForeground, fontSize: 14}}>No running activity found yet.</Text>
          </View>
        ) : (
          runs.slice(0, 5).map(run => (
            <TouchableOpacity key={run.id} style={styles.activityCard} activeOpacity={0.7}>
              <View style={styles.activityIconContainer}>
                <LinearGradient
                  colors={run.missionId ? ['rgba(139,92,246,0.2)', 'rgba(139,92,246,0.05)'] : ['rgba(56,189,248,0.2)', 'rgba(56,189,248,0.05)']}
                  style={[styles.activityIconBg, run.missionId ? { borderColor: 'rgba(139,92,246,0.3)' } : null]}
                >
                  <Ionicons name={run.missionId ? "flag" : "walk"} size={22} color={run.missionId ? "#8b5cf6" : colors.primary} />
                </LinearGradient>
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityDate}>
                  {run.missionTitle ? run.missionTitle : formatActivityDate(run.timestamp)}
                  {run.missionTitle ? <Text style={{fontSize: 12, color: colors.mutedForeground, fontWeight: 'normal'}}> • {formatActivityDate(run.timestamp)}</Text> : null}
                </Text>
                <View style={styles.activityStatsRow}>
                  <Text style={styles.activityStatPrime}>{(Math.round((run.distance / 1000) * 100) / 100).toFixed(2)} km</Text>
                  <Text style={styles.activityStatDivider}>•</Text>
                  <Text style={styles.activityStatSecondary}>{formatTime(run.duration || run.time)}</Text>
                  <Text style={styles.activityStatDivider}>•</Text>
                  <Text style={styles.activityStatSecondary}>{getRunPace(run)}/km</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))
        )}
        
        {/* Bottom padding spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1c',
  },
  offlineBanner: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    marginTop: 10,
  },
  offlineBannerText: {
    color: '#f59e0b',
    fontSize: 13,
    fontWeight: '600',
  },
  bgGlowTop: {
    position: 'absolute',
    top: -150,
    left: width / 2 - 200,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(56,189,248,0.15)',
  },
  scrollContent: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  date: {
    fontSize: 15,
    color: colors.mutedForeground,
    marginTop: 4,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoutBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBtn: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(56,189,248,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  recordCardTouch: {
    marginBottom: 32,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  recordCard: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  recordCardInner: {
    padding: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  recordTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  recordTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  recordSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  cardBgIcon: {
    position: 'absolute',
    right: -20,
    bottom: -30,
    transform: [{ rotate: '-15deg' }],
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 36,
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.7)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(51,65,85,0.6)',
    alignItems: 'center',
  },
  statIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(56,189,248,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontWeight: '500',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  activityCard: {
    backgroundColor: 'rgba(17,24,39,0.6)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(51,65,85,0.4)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIconContainer: {
    marginRight: 16,
  },
  activityIconBg: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.2)',
  },
  activityInfo: {
    flex: 1,
  },
  activityDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
  },
  activityStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityStatPrime: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  activityStatDivider: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginHorizontal: 6,
  },
  activityStatSecondary: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
});
