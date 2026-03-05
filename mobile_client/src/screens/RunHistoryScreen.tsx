import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Dimensions, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, realtimeDb } from '../lib/firebase';
import { ref, onValue } from 'firebase/database';
import RunDetailsModal from '../components/RunDetailsModal';

export default function RunHistoryScreen({ navigation }: any) {
  const [runs, setRuns] = useState<any[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
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
      <View style={styles.bgGlowTop} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Run History</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.listHeaderRow}>
          <Text style={styles.listTitle}>All Completed Runs</Text>
          <Text style={styles.listCount}>{runs.length} Runs</Text>
        </View>

        {loadingRuns ? (
          <View style={styles.centerStage}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : runs.length === 0 ? (
          <View style={styles.emptyContainer}>
             <Ionicons name="footsteps-outline" size={48} color={colors.mutedForeground} style={{marginBottom: 16}} />
             <Text style={styles.emptyText}>Your personal run log is empty.</Text>
             <Text style={styles.emptySubText}>Head over to the home screen and hit start to begin your journey.</Text>
          </View>
        ) : (
          runs.map(run => (
            <TouchableOpacity 
              key={run.id} 
              style={styles.activityCard} 
              activeOpacity={0.7} 
              onPress={() => {
                setSelectedRun(run);
                setModalVisible(true);
              }}
            >
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

      </ScrollView>

      <RunDetailsModal 
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        run={selectedRun}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bgGlowTop: {
    position: 'absolute',
    top: -150,
    left: 0,
    right: 0,
    height: 300,
    backgroundColor: colors.primary,
    opacity: 0.1,
    borderRadius: 300,
    transform: [{ scaleX: 1.5 }],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  listCount: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30,41,59,0.5)',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(51,65,85,0.5)',
    marginBottom: 12,
  },
  activityIconContainer: {
    marginRight: 16,
  },
  activityIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
  },
  activityInfo: {
    flex: 1,
  },
  activityDate: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  activityStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activityStatPrime: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  activityStatSecondary: {
    color: colors.mutedForeground,
    fontSize: 14,
    fontWeight: '500',
  },
  activityStatDivider: {
    color: 'rgba(148,163,184,0.3)',
    fontSize: 12,
  },
  centerStage: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: 'rgba(17,24,39,0.5)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(51,65,85,0.3)',
    marginTop: 20,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubText: {
    color: colors.mutedForeground,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  }
});
