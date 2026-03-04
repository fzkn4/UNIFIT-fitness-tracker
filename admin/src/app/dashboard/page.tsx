"use client";

import React, { useEffect, useState } from 'react';
import { 
  Activity, 
  Users, 
  Map, 
  Target, 
  TrendingUp, 
  Settings, 
  LogOut, 
  Search,
  Bell,
  ChevronRight
} from 'lucide-react';
// Metadata cannot be exported from a Client Component
// export const metadata: Metadata = {
//   title: 'Dashboard',
// };

import { auth, realtimeDb } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';

export default function Dashboard() {
  const [personnelCount, setPersonnelCount] = useState(0);
  const [totalDistance, setTotalDistance] = useState(0);
  const [avgPace, setAvgPace] = useState('--');
  const [complianceRate, setComplianceRate] = useState(0);
  const [recentRuns, setRecentRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Fetch personnel linked to this admin
        const usersRef = ref(realtimeDb, 'users');
        const runsRef = ref(realtimeDb, 'runs');

        onValue(usersRef, (usersSnapshot) => {
          if (usersSnapshot.exists()) {
            const usersData = usersSnapshot.val();
            const adminPersonnel = Object.keys(usersData)
              .map(key => ({ id: key, ...usersData[key] }))
              .filter((u: any) => u.role === 'user' && u.adminId === user.uid);
            
            setPersonnelCount(adminPersonnel.length);

            // Fetch Runs
            onValue(runsRef, (runsSnapshot) => {
              if (runsSnapshot.exists()) {
                const runsData = runsSnapshot.val();
                let allRuns = Object.keys(runsData).map(key => ({ id: key, ...runsData[key] }));

                // Filter runs by personnel and last 7 days for distance
                const personnelIds = adminPersonnel.map(p => p.id);
                const filteredRuns = allRuns.filter((run: any) => personnelIds.includes(run.userId));
                
                const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
                const weekRuns = filteredRuns.filter((run: any) => run.timestamp > sevenDaysAgo);

                // 1. Total Distance (Week)
                const distanceSum = weekRuns.reduce((sum, run) => sum + (run.distance || 0), 0);
                setTotalDistance(distanceSum / 1000); // in km

                // 2. Average Pace (All time)
                const totalDistAll = filteredRuns.reduce((sum, run) => sum + (run.distance || 0), 0);
                const totalDurAll = filteredRuns.reduce((sum, run) => sum + (run.duration || 0), 0);
                if (totalDistAll > 0) {
                  const paceSecs = totalDurAll / (totalDistAll / 1000);
                  const pMins = Math.floor(paceSecs / 60);
                  const pSecs = Math.floor(paceSecs % 60).toString().padStart(2, '0');
                  setAvgPace(`${pMins}'${pSecs}"`);
                } else {
                  setAvgPace('--');
                }

                // 3. Compliance Rate (All time)
                if (adminPersonnel.length > 0) {
                  const uniqueRunners = new Set(filteredRuns.map((r: any) => r.userId));
                  setComplianceRate(Math.round((uniqueRunners.size / adminPersonnel.length) * 100));
                } else {
                  setComplianceRate(0);
                }

                // 4. Transform Recent Runs for Table
                const sortedRuns = filteredRuns.sort((a: any, b: any) => b.timestamp - a.timestamp).slice(0, 10);
                const tableData = sortedRuns.map(run => {
                  const u = adminPersonnel.find(p => p.id === run.userId);
                  const distKm = (run.distance / 1000);
                  let currPaceSecs = distKm > 0 ? (run.duration / distKm) : 0;
                  const currPMins = Math.floor(currPaceSecs / 60);
                  const currPSecs = Math.floor(currPaceSecs % 60).toString().padStart(2, '0');
                  const durationMins = Math.floor(run.duration / 60);
                  const durationSecs = Math.floor(run.duration % 60).toString().padStart(2, '0');

                  return {
                    id: run.id,
                    name: u?.fullName || 'Unknown User',
                    avatar: u?.fullName ? u.fullName.substring(0, 2).toUpperCase() : '??',
                    time: new Date(run.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                    distance: `${distKm.toFixed(2)} km`,
                    pace: `${currPMins}'${currPSecs}"/km`,
                    duration: `${durationMins}:${durationSecs}`
                  };
                });
                
                setRecentRuns(tableData);
              } else {
                setTotalDistance(0);
                setAvgPace('--');
                setComplianceRate(0);
                setRecentRuns([]);
              }
              setLoading(false);
            });
          } else {
            setLoading(false);
          }
        });
      } else {
        window.location.href = '/';
      }
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <div className="flex h-screen bg-[#0a0f1c] text-slate-200 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-[#111827]/80 backdrop-blur-xl border-r border-slate-800/60 flex flex-col shrink-0 relative z-20">
        <div className="p-8 pb-4 flex items-center justify-center">
          <img src="/logo.png" alt="Unifit Logo" className="w-40 object-contain drop-shadow-[0_0_15px_rgba(56,189,248,0.3)]" />
        </div>
        
        <div className="mt-8 px-4 flex-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-4">Menu</p>
          <nav className="space-y-1.5">
            <a href="#" className="flex items-center gap-3 px-4 py-3.5 bg-primary/10 text-primary rounded-xl font-medium border border-primary/10 relative overflow-hidden group">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-md"></div>
              <Activity className="w-5 h-5" />
              Overview
            </a>
            <a href="/dashboard/personnel" className="flex items-center gap-3 px-4 py-3.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-xl font-medium transition-all group">
              <Users className="w-5 h-5 group-hover:text-primary transition-colors" />
              Personnel List
            </a>
            <a href="/dashboard/missions" className="flex items-center gap-3 px-4 py-3.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-xl font-medium transition-all group">
              <Map className="w-5 h-5 group-hover:text-primary transition-colors" />
              Missions & Routes
            </a>
          </nav>

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-10 mb-4 px-4">System</p>
          <nav className="space-y-1.5">
            <a href="#" className="flex items-center gap-3 px-4 py-3.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-xl font-medium transition-all group">
              <Settings className="w-5 h-5 group-hover:text-primary transition-colors" />
              Settings
            </a>
          </nav>
        </div>

        <div className="p-6 border-t border-slate-800/60 mt-auto">
          <button onClick={() => auth.signOut()} className="flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-xl font-medium transition-colors w-full group">
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative z-10 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[150px] rounded-full pointer-events-none" />
        
        {/* Top Header */}
        <header className="h-20 border-b border-slate-800/60 px-10 flex items-center justify-between bg-[#111827]/40 backdrop-blur-md sticky top-0 z-30 shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard Overview</h1>
            <p className="text-sm text-slate-400 mt-1">Organization fitness metrics at a glance.</p>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Search personnel..." 
                className="w-64 pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-full focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 text-sm text-white placeholder:text-slate-600 transition-all"
              />
            </div>
            
            <button className="relative p-2.5 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 rounded-full transition-colors border border-slate-700/50">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-primary rounded-full ring-2 ring-[#0a0f1c]" />
            </button>
            
            <div className="flex items-center gap-3 pl-6 border-l border-slate-800">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-blue-600 p-[2px]">
                <div className="w-full h-full bg-[#111827] rounded-full flex items-center justify-center text-sm font-bold text-white">
                  AD
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-10 space-y-8">
          
          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-[#111827]/60 backdrop-blur-xl p-6 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition-colors shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all">
                <Users className="w-20 h-20 text-blue-400" />
              </div>
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <span className="text-sm font-medium text-slate-400">Total Personnel</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">{personnelCount}</span>
              </div>
            </div>

            <div className="bg-[#111827]/60 backdrop-blur-xl p-6 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition-colors shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all">
                <Map className="w-20 h-20 text-primary" />
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-primary/20">
                <Map className="w-6 h-6 text-primary" />
              </div>
              <span className="text-sm font-medium text-slate-400">Total Distance (Week)</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-primary">
                  {loading ? '...' : totalDistance.toFixed(1)}
                </span>
                <span className="text-sm font-medium text-slate-400">km</span>
              </div>
            </div>

            <div className="bg-[#111827]/60 backdrop-blur-xl p-6 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition-colors shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all">
                <Target className="w-20 h-20 text-emerald-400" />
              </div>
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-emerald-400" />
              </div>
              <span className="text-sm font-medium text-slate-400">Compliance Rate</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">
                  {loading ? '...' : complianceRate}
                </span>
                <span className="text-sm font-medium text-slate-400">%</span>
              </div>
            </div>

            <div className="bg-[#111827]/60 backdrop-blur-xl p-6 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition-colors shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all">
                <TrendingUp className="w-20 h-20 text-purple-400" />
              </div>
              <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
              <span className="text-sm font-medium text-slate-400">Avg Pace</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">
                  {loading ? '...' : avgPace}
                </span>
                <span className="text-sm font-medium text-slate-400">/km</span>
              </div>
            </div>
          </div>

          {/* Recent Activity Table */}
          <section className="bg-[#111827]/60 backdrop-blur-xl rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl">
            <div className="px-8 py-6 border-b border-slate-800/80 flex justify-between items-center bg-slate-900/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="font-semibold text-lg text-white tracking-tight">Live Run Logs</h3>
              </div>
              <button className="text-sm text-primary font-medium hover:text-white transition-colors flex items-center gap-1 group">
                View All Directory
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-900/40">
                    <th className="px-8 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Personnel</th>
                    <th className="px-8 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Date & Time</th>
                    <th className="px-8 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Distance</th>
                    <th className="px-8 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Avg Pace</th>
                    <th className="px-8 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-sm">
                  {loading ? (
                     <tr>
                       <td colSpan={5} className="px-8 py-8 text-center text-slate-500">Loading recent runs...</td>
                     </tr>
                  ) : recentRuns.length === 0 ? (
                     <tr>
                       <td colSpan={5} className="px-8 py-8 text-center text-slate-500">No recent runs recorded by your personnel.</td>
                     </tr>
                  ) : recentRuns.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-800/30 transition-colors group cursor-pointer">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 border border-slate-700">
                            {row.avatar}
                          </div>
                          <span className="font-medium text-slate-200 group-hover:text-white transition-colors">{row.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-slate-400">{row.time}</td>
                      <td className="px-8 py-5 text-right font-medium text-primary">{row.distance}</td>
                      <td className="px-8 py-5 text-right text-slate-400">{row.pace}</td>
                      <td className="px-8 py-5 text-right text-slate-400">{row.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
