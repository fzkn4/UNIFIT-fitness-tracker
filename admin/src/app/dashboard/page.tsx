import React from 'react';
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
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default function Dashboard() {
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
            <a href="#" className="flex items-center gap-3 px-4 py-3.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-xl font-medium transition-all group">
              <Users className="w-5 h-5 group-hover:text-primary transition-colors" />
              Personnel List
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-xl font-medium transition-all group">
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
          <a href="/" className="flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-xl font-medium transition-colors group">
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Sign Out
          </a>
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
                <span className="text-3xl font-bold text-white">124</span>
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
                <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-primary">1,452</span>
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
                <span className="text-3xl font-bold text-white">87</span>
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
                <span className="text-3xl font-bold text-white">5'42"</span>
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
                  {[
                    { id: 1, name: 'Alex Johnson', time: 'Today, 06:15 AM', distance: '5.2 km', pace: '5\'12"/km', duration: '27:02', avatar: 'AJ' },
                    { id: 2, name: 'Sarah Miller', time: 'Today, 05:45 AM', distance: '8.4 km', pace: '4\'58"/km', duration: '41:43', avatar: 'SM' },
                    { id: 3, name: 'Michael Chen', time: 'Yesterday, 18:30 PM', distance: '3.1 km', pace: '6\'05"/km', duration: '18:51', avatar: 'MC' },
                    { id: 4, name: 'Emma Davis', time: 'Yesterday, 17:10 PM', distance: '10.0 km', pace: '5\'20"/km', duration: '53:20', avatar: 'ED' },
                  ].map((row) => (
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
