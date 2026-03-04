import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Dimensions, Image } from 'react-native';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }: any) {
  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <View style={styles.container}>
      {/* Background Gradients */}
      <View style={styles.bgGlowTop} />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Ready to move?</Text>
            <Text style={styles.date}>{currentDate}</Text>
          </View>
          <TouchableOpacity style={styles.profileBtn}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileText}>JD</Text>
            </View>
          </TouchableOpacity>
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
            <Text style={styles.statValue}>12.5</Text>
            <Text style={styles.statLabel}>Week km</Text>
          </View>
          <View style={styles.statBox}>
            <View style={[styles.statIconBadge, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
              <Ionicons name="flame" size={20} color="#10b981" />
            </View>
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>Runs</Text>
          </View>
          <View style={styles.statBox}>
            <View style={[styles.statIconBadge, { backgroundColor: 'rgba(139,92,246,0.1)' }]}>
              <Ionicons name="time" size={20} color="#8b5cf6" />
            </View>
            <Text style={styles.statValue}>5'45"</Text>
            <Text style={styles.statLabel}>Avg Pace</Text>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        {/* Mock recent runs */}
        <TouchableOpacity style={styles.activityCard} activeOpacity={0.7}>
          <View style={styles.activityIconContainer}>
            <LinearGradient
              colors={['rgba(56,189,248,0.2)', 'rgba(56,189,248,0.05)']}
              style={styles.activityIconBg}
            >
              <Ionicons name="walk" size={22} color={colors.primary} />
            </LinearGradient>
          </View>
          <View style={styles.activityInfo}>
            <Text style={styles.activityDate}>Yesterday, 6:30 AM</Text>
            <View style={styles.activityStatsRow}>
              <Text style={styles.activityStatPrime}>5.02 km</Text>
              <Text style={styles.activityStatDivider}>•</Text>
              <Text style={styles.activityStatSecondary}>25:14</Text>
              <Text style={styles.activityStatDivider}>•</Text>
              <Text style={styles.activityStatSecondary}>5'01"/km</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.activityCard} activeOpacity={0.7}>
          <View style={styles.activityIconContainer}>
            <LinearGradient
              colors={['rgba(56,189,248,0.2)', 'rgba(56,189,248,0.05)']}
              style={styles.activityIconBg}
            >
              <Ionicons name="walk" size={22} color={colors.primary} />
            </LinearGradient>
          </View>
          <View style={styles.activityInfo}>
            <Text style={styles.activityDate}>Mon, 10 Feb, 7:00 AM</Text>
            <View style={styles.activityStatsRow}>
              <Text style={styles.activityStatPrime}>3.15 km</Text>
              <Text style={styles.activityStatDivider}>•</Text>
              <Text style={styles.activityStatSecondary}>18:20</Text>
              <Text style={styles.activityStatDivider}>•</Text>
              <Text style={styles.activityStatSecondary}>5'49"/km</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
        
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
