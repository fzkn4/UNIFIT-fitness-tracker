import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Dimensions, ActivityIndicator, Alert, Modal, TextInput 
} from 'react-native';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-chart-kit';
import { auth, realtimeDb } from '../lib/firebase';
import { ref, onValue, update } from 'firebase/database';

const { width } = Dimensions.get('window');
const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface FitnessStats {
  age?: string;
  height?: string;
  weight?: string;
  waist?: string;
  hip?: string;
  wrist?: string;
  gender?: string;
  bmiResult?: string;
  bmiClassification?: string;
  interventionPackage?: string;
}

interface WeightHistory {
  year: string;
  month: string;
  weight: number;
}

export default function StatsScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [personnelId, setPersonnelId] = useState<string | null>(null);
  const [stats, setStats] = useState<FitnessStats | null>(null);
  const [weightHistoryList, setWeightHistoryList] = useState<WeightHistory[]>([]);
  
  // Filtering
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  
  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWeightMonth, setNewWeightMonth] = useState(monthOrder[new Date().getMonth()]);
  const [newWeightYear, setNewWeightYear] = useState(new Date().getFullYear().toString());
  const [newWeightValue, setNewWeightValue] = useState("");
  const [savingWeight, setSavingWeight] = useState(false);

  // Tooltip state for chart
  const [tooltipPos, setTooltipPos] = useState<{x: number; y: number; value: number; month: string; visible: boolean}>({
    x: 0, y: 0, value: 0, month: '', visible: false
  });

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setPersonnelId(user.uid);
      const userRef = ref(realtimeDb, `users/${user.uid}`);
      
      const unsubscribe = onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          if (data.fitnessStats) setStats(data.fitnessStats);
          
          let chartData: WeightHistory[] = [];
          if (data.weightHistory) {
             const keys = Object.keys(data.weightHistory);
             chartData = keys.map(k => {
                 const [year, month] = k.split('-');
                 return { year, month, weight: data.weightHistory[k] };
             });
             chartData.sort((a, b) => {
                 if (a.year !== b.year) return parseInt(a.year) - parseInt(b.year);
                 return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
             });
          }
          setWeightHistoryList(chartData);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setLoading(false);
      navigation.replace('Login');
    }
  }, []);

  const availableYears = useMemo(() => {
    if (!weightHistoryList.length) return [];
    const years = new Set(weightHistoryList.map(item => item.year));
    return Array.from(years).sort((a,b) => b.localeCompare(a));
  }, [weightHistoryList]);

  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const filteredChartData = useMemo(() => {
     if (!weightHistoryList.length) return [];
     return weightHistoryList.filter(item => item.year === selectedYear);
  }, [weightHistoryList, selectedYear]);

  const chartDataConfig = useMemo(() => {
    if (filteredChartData.length === 0) return null;
    
    // Decimate labels if too many, to avoid overlap on mobile screen
    const labels = filteredChartData.map(d => d.month);
    const data = filteredChartData.map(d => d.weight);
    
    return {
      labels,
      datasets: [
        {
          data,
          color: (opacity = 1) => `rgba(56, 189, 248, ${opacity})`, // primary color
          strokeWidth: 3
        }
      ]
    };
  }, [filteredChartData]);

  const handleSaveWeight = async () => {
    if (!newWeightMonth || !newWeightYear || !newWeightValue) {
      Alert.alert("Error", "Please enter all weight details.");
      return;
    }
    const wNum = parseFloat(newWeightValue);
    if (isNaN(wNum)) {
      Alert.alert("Error", "Weight must be a valid number.");
      return;
    }
    if (!personnelId) return;

    setSavingWeight(true);
    try {
      const userRef = ref(realtimeDb, `users/${personnelId}`);
      const updates: Record<string, unknown> = {};
      updates[`weightHistory/${newWeightYear}-${newWeightMonth}`] = wNum;
      
      await update(userRef, updates);
      
      setShowAddModal(false);
      setNewWeightValue("");
      Alert.alert("Success", "Weight record added.");
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", err.message || "Failed to save weight.");
    } finally {
      setSavingWeight(false);
    }
  };

  const nextMonth = () => {
      let i = monthOrder.indexOf(newWeightMonth);
      if(i < 11) setNewWeightMonth(monthOrder[i+1]);
  }
  const prevMonth = () => {
      let i = monthOrder.indexOf(newWeightMonth);
      if(i > 0) setNewWeightMonth(monthOrder[i-1]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.bgGlowTop} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Stats</Text>
        <View style={{width: 44}} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Physical Stats Section */}
          <Text style={styles.sectionTitle}>Physical Statistics</Text>
          {!stats ? (
            <View style={styles.emptyCard}>
              <Ionicons name="body-outline" size={32} color={colors.mutedForeground} style={{marginBottom: 8}} />
              <Text style={styles.emptyText}>No stats imported yet.</Text>
            </View>
          ) : (
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Age</Text>
                <Text style={styles.statValue}>{stats.age || '--'}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Gender</Text>
                <Text style={styles.statValue}>{stats.gender || '--'}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Height</Text>
                <Text style={styles.statValue}>{stats.height ? `${stats.height} cm` : '--'}</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: 'rgba(56,189,248,0.1)', borderColor: 'rgba(56,189,248,0.3)' }]}>
                <Text style={[styles.statLabel, { color: colors.primary }]}>Weight</Text>
                <Text style={[styles.statValue, { color: colors.primary }]}>{stats.weight ? `${stats.weight} kg` : '--'}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Waist</Text>
                <Text style={styles.statValue}>{stats.waist ? `${stats.waist} cm` : '--'}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Hip</Text>
                <Text style={styles.statValue}>{stats.hip ? `${stats.hip} cm` : '--'}</Text>
              </View>
              
              {stats.interventionPackage && (
                  <View style={[styles.statBox, { width: '100%', backgroundColor: 'rgba(139,92,246,0.1)', borderColor: 'rgba(139,92,246,0.3)' }]}>
                    <Text style={[styles.statLabel, { color: '#8b5cf6' }]}>Intervention Plan</Text>
                    <Text style={styles.statValue}>{stats.interventionPackage}</Text>
                  </View>
              )}
            </View>
          )}

          {/* Weight Trends Section */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Weight Trends</Text>
            <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addButton}>
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {availableYears.length > 1 && (
            <View style={styles.yearFilterContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {availableYears.map(year => (
                  <TouchableOpacity 
                    key={year} 
                    style={[styles.yearPill, selectedYear === year && styles.yearPillActive]}
                    onPress={() => setSelectedYear(year)}
                  >
                    <Text style={[styles.yearPillText, selectedYear === year && styles.yearPillTextActive]}>{year}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {!chartDataConfig ? (
            <View style={styles.emptyCard}>
              <Ionicons name="bar-chart-outline" size={32} color={colors.mutedForeground} style={{marginBottom: 8}} />
              <Text style={styles.emptyText}>No weight history found for {selectedYear}.</Text>
            </View>
          ) : (
            <View style={styles.chartCard}>
              <LineChart
                data={chartDataConfig}
                width={width - 56}
                height={220}
                yAxisSuffix="kg"
                withDots={true}
                withInnerLines={false}
                withOuterLines={false}
                onDataPointClick={(data: any) => {
                  const isSamePoint = tooltipPos.x === data.x && tooltipPos.y === data.y;
                  setTooltipPos({
                    x: data.x,
                    y: data.y,
                    value: data.value,
                    month: filteredChartData[data.index]?.month || '',
                    visible: isSamePoint ? !tooltipPos.visible : true
                  });
                }}
                decorator={() => {
                  if (!tooltipPos.visible) return null;
                  return (
                    <View style={{
                      position: 'absolute',
                      top: tooltipPos.y - 40,
                      left: tooltipPos.x - 30,
                    }}>
                      <View style={{
                        backgroundColor: '#0f172a',
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: 'rgba(56,189,248,0.4)',
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        alignItems: 'center',
                      }}>
                        <Text style={{color: colors.primary, fontWeight: 'bold', fontSize: 13}}>
                          {tooltipPos.value} kg
                        </Text>
                        <Text style={{color: colors.mutedForeground, fontSize: 10}}>
                          {tooltipPos.month}
                        </Text>
                      </View>
                    </View>
                  );
                }}
                chartConfig={{
                  backgroundColor: 'transparent',
                  backgroundGradientFrom: '#111827',
                  backgroundGradientTo: '#111827',
                  backgroundGradientFromOpacity: 0,
                  backgroundGradientToOpacity: 0,
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
                  style: { borderRadius: 16 },
                  propsForDots: {
                    r: "6",
                    strokeWidth: "2",
                    stroke: colors.primary,
                    fill: "#111827"
                  }
                }}
                bezier
                style={{
                  marginVertical: 8,
                  borderRadius: 16,
                  marginLeft: -15
                }}
              />
            </View>
          )}

          <View style={{height: 40}}/>
        </ScrollView>
      )}

      {/* Add Weight Modal */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Weight Record</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Month</Text>
              <View style={styles.monthSelector}>
                  <TouchableOpacity onPress={prevMonth} style={styles.monthArrow}><Ionicons name="chevron-back" size={20} color="#fff" /></TouchableOpacity>
                  <Text style={styles.monthText}>{newWeightMonth}</Text>
                  <TouchableOpacity onPress={nextMonth} style={styles.monthArrow}><Ionicons name="chevron-forward" size={20} color="#fff" /></TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Year</Text>
              <TextInput 
                style={styles.textInput}
                keyboardType="numeric"
                value={newWeightYear}
                onChangeText={setNewWeightYear}
                placeholder="2026"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Weight (kg)</Text>
              <TextInput 
                style={styles.textInput}
                keyboardType="numeric"
                value={newWeightValue}
                onChangeText={setNewWeightValue}
                placeholder="e.g. 65.5"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            <TouchableOpacity 
              style={[styles.saveBtn, savingWeight && {opacity: 0.7}]} 
              onPress={handleSaveWeight}
              disabled={savingWeight}
            >
              {savingWeight ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save Record</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
    backgroundColor: 'rgba(56,189,248,0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(10,15,28,0.8)',
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 10,
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56,189,248,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
  },
  addButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 4,
  },
  emptyCard: {
    backgroundColor: 'rgba(17,24,39,0.5)',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(51,65,85,0.4)',
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBox: {
    width: (width - 52) / 2, // 2 columns accounting for padding+gap
    backgroundColor: 'rgba(17,24,39,0.7)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(51,65,85,0.6)',
  },
  statLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  yearFilterContainer: {
    marginBottom: 16,
  },
  yearPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(51,65,85,0.3)',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  yearPillActive: {
    backgroundColor: 'rgba(56,189,248,0.15)',
    borderColor: 'rgba(56,189,248,0.4)',
  },
  yearPillText: {
    color: colors.mutedForeground,
    fontWeight: '600',
  },
  yearPillTextActive: {
    color: colors.primary,
  },
  chartCard: {
    backgroundColor: 'rgba(17,24,39,0.7)',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(51,65,85,0.6)',
    alignItems: 'center',
    paddingRight: 30
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#111827',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(51,65,85,0.6)',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: colors.mutedForeground,
    fontSize: 13,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#0a0f1c',
    borderWidth: 1,
    borderColor: 'rgba(51,65,85,0.6)',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 16,
  },
  monthSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#0a0f1c',
      borderWidth: 1,
      borderColor: 'rgba(51,65,85,0.6)',
      borderRadius: 12,
      padding: 6,
  },
  monthArrow: {
      padding: 8,
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderRadius: 8,
  },
  monthText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold'
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
