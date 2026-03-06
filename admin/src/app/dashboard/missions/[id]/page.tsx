"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft,
  Activity, 
  MapPin, 
  Clock, 
  Target,
  Calendar,
  Repeat,
  ChevronDown,
  ChevronUp,
  Award,
  Timer,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { auth, realtimeDb } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, get } from 'firebase/database';
import RunDetailModal from '@/components/RunDetailModal';
import { getCurrentPeriodBounds, getPeriodLabel, getTimeUntilReset, getHistoricalPeriods, filterRunsByPeriod } from '@/lib/periodUtils';

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

interface Personnel {
  id: string;
  name: string;
  email: string;
}

interface Run {
  id: string;
  userId: string;
  missionId: string;
  distance: number; // in meters
  duration: number; // in seconds
  averagePace: string;
  timestamp: number;
  route?: { latitude: number; longitude: number }[];
  userName?: string;
  missionTitle?: string;
}

export default function MissionProgress() {
  const router = useRouter();
  const params = useParams();
  const missionId = params?.id as string;
  
  const [loading, setLoading] = useState(true);
  const [mission, setMission] = useState<Mission | null>(null);
  const [assignedUsers, setAssignedUsers] = useState<Personnel[]>([]);
  const [missionRuns, setMissionRuns] = useState<Run[]>([]);
  const [expandedUsers, setExpandedUsers] = useState<string[]>([]);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
       if (user) {
         if (missionId) await fetchData(missionId);
       } else {
         router.push('/');
       }
    });
    return () => unsubscribeAuth();
  }, [missionId]);

  const fetchData = async (id: string) => {
    setLoading(true);
    try {
      // 1. Fetch Mission
      const missionRef = ref(realtimeDb, `missions/${id}`);
      const missionSnap = await get(missionRef);
      if (!missionSnap.exists()) {
        router.push('/dashboard/missions');
        return;
      }
      const missionData = { id: missionSnap.key, ...missionSnap.val() } as Mission;
      setMission(missionData);

      // 2. Fetch Personnel
      // Ensure we only fetch those actually assigned
      const personnelIds = missionData.assignedPersonnel || [];
      const personnelRef = ref(realtimeDb, 'users');
      const personnelSnap = await get(personnelRef);
      const allPersonnel: Personnel[] = [];
      if (personnelSnap.exists()) {
        personnelSnap.forEach((child) => {
          if (personnelIds.includes(child.key)) {
            const val = child.val();
             allPersonnel.push({ 
               id: child.key, 
               ...val,
               name: val.fullName || val.name || '', 
               email: val.email || '',
             } as Personnel);
          }
        });
      }
      setAssignedUsers(allPersonnel);

      // 3. Fetch Runs (All runs then filter by missionId)
      // Note: In a production app with huge data, we map runs by user or mission directly.
      const runsRef = ref(realtimeDb, 'runs');
      const runsSnap = await get(runsRef);
      const allRuns: Run[] = [];
      if (runsSnap.exists()) {
        runsSnap.forEach((child) => {
          const run = child.val();
          if (run.missionId === id) {
            allRuns.push({ id: child.key, ...run } as Run);
          }
        });
      }
      // Sort runs newest first
      allRuns.sort((a, b) => b.timestamp - a.timestamp);
      setMissionRuns(allRuns);

    } catch (error) {
      console.error("Error fetching progress data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (userId: string) => {
    setExpandedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const formatDuration = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', { 
      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' 
    });
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex-1 h-screen bg-[#0a0f1c] flex justify-center items-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!mission) return null;

  return (
    <div className="flex-1 h-screen flex flex-col bg-[#0a0f1c] text-white overflow-hidden relative font-sans">
      <div className="absolute top-0 right-[-100px] w-[600px] h-[600px] bg-primary/5 blur-[150px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="shrink-0 border-b border-slate-800/80 bg-[#111827]/60 backdrop-blur-xl px-8 py-6 z-10 flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/dashboard/missions')}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700 hover:border-slate-600 group"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-white" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{mission.title}</h1>
              <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider border ${
                mission.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {mission.status}
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-1">{mission.description}</p>
          </div>
        </div>

        {/* Mission Stats Ribbon */}
        <div className="flex flex-wrap items-center gap-4 lg:gap-8 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <Target className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Target Dist</p>
              <p className="font-bold text-white">{mission.targetDistance} <span className="text-sm font-normal text-slate-400">km</span></p>
            </div>
          </div>
          
          <div className="w-px h-10 bg-slate-800 hidden lg:block" />
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <Clock className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Target Pace</p>
              <p className="font-bold text-white">{mission.targetPace} <span className="text-sm font-normal text-slate-400">/km</span></p>
            </div>
          </div>

          <div className="w-px h-10 bg-slate-800 hidden lg:block" />

          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <MapPin className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Location</p>
              <p className="font-bold text-white">{mission.location || 'Anywhere'}</p>
            </div>
          </div>

          <div className="w-px h-10 bg-slate-800 hidden lg:block" />

          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
              {mission.routineType === 'once' ? <Calendar className="w-5 h-5 text-orange-400" /> : <Repeat className="w-5 h-5 text-orange-400" />}
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Schedule</p>
              <p className="font-bold text-white capitalize">{mission.routineType} <span className="text-sm font-normal text-slate-400">{mission.routineType === 'once' && mission.deadline ? `(${mission.deadline})` : ''}</span></p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Progress Tracking Area */}
      <main className="flex-1 overflow-y-auto p-8 z-10">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex justify-between items-end mb-2">
            <div>
              <h2 className="text-lg font-bold">Personnel Progress Tracker</h2>
              <p className="text-sm text-slate-400">Total assigned: {assignedUsers.length}</p>
            </div>
          </div>

          {assignedUsers.length === 0 ? (
            <div className="text-center p-12 bg-slate-900/50 border border-slate-800 rounded-2xl">
              <p className="text-slate-400">No personnel currently assigned to this mission.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignedUsers.map(user => {
                const isRecurring = mission.routineType !== 'once';
                const periodBounds = getCurrentPeriodBounds(mission.routineType);
                const periodLabel = getPeriodLabel(mission.routineType);
                const targetKm = mission.targetDistance || 0;

                // All runs for this user on this mission
                const allUserRuns = missionRuns.filter(r => r.userId === user.id);
                
                // Current period runs (filtered for recurring, all for once)
                const periodRuns = isRecurring 
                  ? allUserRuns.filter(r => r.timestamp >= periodBounds.start && r.timestamp < periodBounds.end)
                  : allUserRuns;
                
                const periodMeters = periodRuns.reduce((sum, run) => sum + (run.distance || 0), 0);
                const periodKm = periodMeters / 1000;
                
                let progressPercentage = targetKm > 0 ? (periodKm / targetKm) * 100 : 0;
                if (progressPercentage > 100) progressPercentage = 100;
                const isCompleted = periodKm >= targetKm && targetKm > 0;
                const isStarted = periodKm > 0;
                const attemptCount = periodRuns.length;
                
                const isExpanded = expandedUsers.includes(user.id);

                // Historical periods for recurring
                const history = isRecurring ? getHistoricalPeriods(mission.routineType, mission.createdAt, 5) : [];
                const historyItems = history.map(h => {
                  const hRuns = allUserRuns.filter(r => r.timestamp >= h.bounds.start && r.timestamp < h.bounds.end);
                  const hDist = hRuns.reduce((sum, r) => sum + (r.distance || 0), 0) / 1000;
                  return { ...h, distance: hDist, complete: hDist >= targetKm && targetKm > 0, attempts: hRuns.length };
                }).filter(h => h.attempts > 0 || h.bounds.end < Date.now());

                return (
                  <div key={user.id} className="bg-[#111827]/80 rounded-2xl border border-slate-800/80 overflow-hidden shadow-lg transition-all">
                    {/* Personnel Row Header */}
                    <div 
                      onClick={() => toggleExpand(user.id)}
                      className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-lg text-slate-300 border border-slate-700">
                          {getInitials(user.name)}
                        </div>
                        <div className="flex-1 min-w-0 pr-4">
                          <h3 className="font-bold text-white text-lg truncate">{user.name}</h3>
                          <p className="text-sm text-slate-400 truncate">{user.email}</p>
                        </div>
                      </div>

                      {/* Progress Summary Area */}
                      <div className="flex-1 max-w-sm px-4">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="font-semibold text-slate-400">
                            {isRecurring ? periodLabel : 'Progress'}
                            {isRecurring && attemptCount > 0 ? ` · ${attemptCount} attempt${attemptCount > 1 ? 's' : ''}` : ''}
                          </span>
                          <span className="font-bold text-white">
                            {(Math.round(periodKm * 100) / 100).toFixed(2)} / {targetKm} km
                          </span>
                        </div>
                        <div className="h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                          <div 
                            style={{ width: `${progressPercentage}%` }} 
                            className={`h-full rounded-full transition-all duration-1000 ${
                              isCompleted 
                                ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' 
                                : isStarted 
                                  ? 'bg-primary' 
                                  : 'bg-transparent'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Status & Toggle */}
                      <div className="flex items-center gap-4 pl-4 min-w-[140px] justify-end">
                        {isCompleted ? (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5" />
                            Completed
                          </span>
                        ) : isStarted ? (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                            In Progress
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            Not Started
                          </span>
                        )}
                        <button className="text-slate-500 hover:text-white p-1">
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Run History Area */}
                    {isExpanded && (
                      <div className="bg-slate-900/50 border-t border-slate-800/80 p-5 px-6">
                        {/* Period History Summary (recurring only) */}
                        {isRecurring && historyItems.length > 0 && (
                          <div className="mb-5">
                            <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-3">
                              <Timer className="w-4 h-4 text-purple-400" />
                              Past Periods
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                              {historyItems.slice(0, 5).map((h, idx) => (
                                <div key={idx} className={`p-3 rounded-xl border text-center ${
                                  h.complete 
                                    ? 'bg-emerald-500/5 border-emerald-500/20' 
                                    : 'bg-red-500/5 border-red-500/20'
                                }`}>
                                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">{h.label}</p>
                                  <div className="flex items-center justify-center gap-1">
                                    {h.complete ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                                    <span className={`text-sm font-bold ${h.complete ? 'text-emerald-400' : 'text-red-400'}`}>
                                      {h.distance.toFixed(1)} km
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-4">
                          <Activity className="w-4 h-4 text-primary" />
                          {isRecurring ? 'Current Period Attempts' : 'Historical Attempts'}
                        </h4>
                        
                        {periodRuns.length === 0 ? (
                          <div className="py-6 text-center text-slate-500 text-sm italic">
                            No runs recorded {isRecurring ? 'for this period' : 'for this mission'} yet.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {periodRuns.map((run, idx) => (
                              <div 
                                key={run.id} 
                                className="flex items-center justify-between p-3.5 bg-[#111827] rounded-xl border border-slate-800/80 cursor-pointer hover:border-slate-700 hover:bg-slate-800/40 transition-all"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRun({ ...run, userName: user.name, missionTitle: mission.title });
                                  setModalVisible(true);
                                }}
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                    #{periodRuns.length - idx}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-sm text-slate-200">{formatDate(run.timestamp)}</p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-6 md:gap-10">
                                  <div className="text-right">
                                    <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-0.5">Distance</p>
                                    <p className="font-bold text-emerald-400">{(run.distance / 1000).toFixed(2)} km</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-0.5">Time</p>
                                    <p className="font-bold text-slate-300">{formatDuration(run.duration)}</p>
                                  </div>
                                  <div className="text-right hidden sm:block">
                                    <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-0.5">Pace</p>
                                    <p className="font-bold text-slate-300">{run.averagePace}/km</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <RunDetailModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        run={selectedRun}
      />
    </div>
  );
}
