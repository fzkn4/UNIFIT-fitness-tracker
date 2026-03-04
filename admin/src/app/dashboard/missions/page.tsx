"use client";

import React, { useEffect, useState } from 'react';
import { 
  Activity, 
  Users, 
  Map, 
  Settings, 
  LogOut, 
  Search,
  Bell,
  Plus,
  Compass,
  MapPin,
  Clock,
  Target,
  Trash2,
  X,
  Calendar,
  Repeat
} from 'lucide-react';
import { auth, realtimeDb } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, push, onValue, remove, set } from 'firebase/database';

interface Mission {
  id: string;
  title: string;
  description: string;
  location?: string; // Optional location
  targetDistance: number; // in km
  targetPace: string; // e.g., "5'30\""
  status: 'active' | 'draft';
  assignedPersonnel: string[]; // Mock initials for now
  routineType: 'once' | 'daily' | 'weekly' | 'monthly';
  deadline?: string; // e.g YYYY-MM-DD
  adminId: string;
  createdAt: number;
}

interface Personnel {
  id: string;
  name: string;
  email: string;
}

export default function MissionsAndRoutes() {
  const [adminUid, setAdminUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'library'>('active');
  const [missions, setMissions] = useState<Mission[]>([]);
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  
  // Create Mission Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newDistance, setNewDistance] = useState('');
  const [newPace, setNewPace] = useState('');
  const [newStatus, setNewStatus] = useState<'active' | 'draft'>('active');
  const [isRecurring, setIsRecurring] = useState(false);
  const [newRoutine, setNewRoutine] = useState<'once'|'daily'|'weekly'|'monthly'>('once');
  const [newDeadline, setNewDeadline] = useState('');

  // Assign Personnel Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignTargetMission, setAssignTargetMission] = useState<Mission | null>(null);
  const [selectedPersonnelIds, setSelectedPersonnelIds] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
       if (user) {
         setAdminUid(user.uid);
         fetchMissions(user.uid);
         fetchPersonnel(user.uid);
       } else {
         window.location.href = '/';
       }
    });
    return () => unsubscribeAuth();
  }, []);

  const fetchMissions = (uid: string) => {
    const missionsRef = ref(realtimeDb, 'missions');
    onValue(missionsRef, (snapshot) => {
      if (snapshot.exists()) {
        const missionsData = snapshot.val();
        const adminMissions: Mission[] = Object.keys(missionsData)
          .map((key) => ({
            id: key,
            ...missionsData[key],
          }))
          .filter(
            (mission: any) => mission.adminId === uid
          );
        
        // Sort by created date descending
        adminMissions.sort((a, b) => b.createdAt - a.createdAt);
        setMissions(adminMissions);
      } else {
        setMissions([]);
      }
      setLoading(false);
    });
  };

  const fetchPersonnel = (uid: string) => {
    const personnelRef = ref(realtimeDb, 'users');
    onValue(personnelRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const adminPersonnel: Personnel[] = Object.keys(data)
          .map((key) => ({
            id: key,
            ...data[key],
          }))
          .filter((user: any) => user.adminId === uid);
        setPersonnelList(adminPersonnel);
      } else {
        setPersonnelList([]);
      }
    });
  };

  // Derived Stats
  const activeMissionsCount = missions.filter(m => m.status === 'active').length;
  const draftMissionsCount = missions.filter(m => m.status === 'draft').length;
  // Mock sum of personnel
  const totalPersonnelAssigned = missions.reduce((acc, curr) => {
    if (curr.status === 'active' && curr.assignedPersonnel.length > 0) {
      // Very loose mock math based on initial data strings like "+6"
      const extra = curr.assignedPersonnel.find(p => p.startsWith('+')) || '+0';
      return acc + 2 + parseInt(extra.replace('+', '')); 
    }
    return acc;
  }, 0);

  // Filtered List
  const displayMissions = missions.filter(m => 
    activeTab === 'active' ? m.status === 'active' : m.status === 'draft'
  );

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this route?")) {
      try {
        const missionRef = ref(realtimeDb, `missions/${id}`);
        await remove(missionRef);
      } catch (error) {
        console.error("Error deleting mission:", error);
        alert("Failed to delete mission.");
      }
    }
  };

  const handleCreateMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDistance || !newPace || !adminUid) return;

    try {
      const missionsRef = ref(realtimeDb, 'missions');
      const newMissionRef = push(missionsRef);
      
      const newMissionData = {
        title: newTitle,
        description: newDesc,
        location: newLocation ? newLocation.trim() : null,
        targetDistance: parseFloat(newDistance),
        targetPace: newPace,
        status: newStatus,
        assignedPersonnel: [], // Starts with nobody assigned
        routineType: newRoutine,
        deadline: newRoutine === 'once' ? newDeadline : null,
        adminId: adminUid,
        createdAt: Date.now()
      };

      await set(newMissionRef, newMissionData);
      
      setIsModalOpen(false);
      
      // Reset form
      setNewTitle('');
      setNewDesc('');
      setNewLocation('');
      setNewDistance('');
      setNewPace('');
      setNewStatus('active');
      setIsRecurring(false);
      setNewRoutine('once');
      setNewDeadline('');
      
      // Switch to appropriate tab
      setActiveTab(newStatus === 'active' ? 'active' : 'library');
    } catch (error) {
       console.error("Error adding mission:", error);
       alert("Failed to create mission.");
    }
  };

  const openAssignModal = (mission: Mission) => {
    setAssignTargetMission(mission);
    setSelectedPersonnelIds(mission.assignedPersonnel || []);
    setIsAssignModalOpen(true);
  };

  const handleSaveAssignments = async () => {
    if (!assignTargetMission) return;
    try {
      const missionRef = ref(realtimeDb, `missions/${assignTargetMission.id}/assignedPersonnel`);
      await set(missionRef, selectedPersonnelIds);
      setIsAssignModalOpen(false);
      setAssignTargetMission(null);
    } catch (error) {
      console.error("Error saving assignments:", error);
      alert("Failed to save assignments.");
    }
  };

  const getPersonnelInitials = (ids: string[]) => {
    if (!ids) return [];
    return ids.map(id => {
      const person = personnelList.find(p => p.id === id);
      if (person && person.name) {
        // Extract initials (e.g., "Juan Dela Cruz" -> "JD")
        return person.name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase();
      }
      return '??';
    });
  };

  return (
    <div className="flex h-screen bg-[#0a0f1c] text-slate-200 overflow-hidden font-sans">
      {/* Sidebar - Same as Dashboard */}
      <aside className="w-72 bg-[#111827]/80 backdrop-blur-xl border-r border-slate-800/60 flex flex-col shrink-0 relative z-20">
        <div className="p-8 pb-4 flex items-center justify-center">
          <img src="/logo.png" alt="Unifit Logo" className="w-40 object-contain drop-shadow-[0_0_15px_rgba(56,189,248,0.3)]" />
        </div>
        
        <div className="mt-8 px-4 flex-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-4">Menu</p>
          <nav className="space-y-1.5">
            <a href="/dashboard" className="flex items-center gap-3 px-4 py-3.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-xl font-medium transition-all group">
              <Activity className="w-5 h-5 group-hover:text-primary transition-colors" />
              Overview
            </a>
            <a href="/dashboard/personnel" className="flex items-center gap-3 px-4 py-3.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-xl font-medium transition-all group">
              <Users className="w-5 h-5 group-hover:text-primary transition-colors" />
              Personnel List
            </a>
            <a href="/dashboard/missions" className="flex items-center gap-3 px-4 py-3.5 bg-primary/10 text-primary rounded-xl font-medium border border-primary/10 relative overflow-hidden group">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-md"></div>
              <Map className="w-5 h-5" />
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
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[150px] rounded-full pointer-events-none" />
        
        {/* Top Header */}
        <header className="h-20 border-b border-slate-800/60 px-10 flex items-center justify-between bg-[#111827]/40 backdrop-blur-md sticky top-0 z-30 shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Missions & Routes</h1>
            <p className="text-sm text-slate-400 mt-1">Design and assign running routes to your personnel.</p>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Search routes..." 
                className="w-64 pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-full focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 text-sm text-white placeholder:text-slate-600 transition-all"
              />
            </div>
            
            <button className="relative p-2.5 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 rounded-full transition-colors border border-slate-700/50">
              <Bell className="w-5 h-5" />
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10 space-y-8">
          
          <div className="flex justify-between items-end">
            {/* Tabs */}
            <div className="flex bg-slate-900/50 p-1.5 rounded-xl border border-slate-800/80 backdrop-blur-md">
              <button 
                onClick={() => setActiveTab('active')}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'active' 
                    ? 'bg-slate-800 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                Active Missions
              </button>
              <button 
                onClick={() => setActiveTab('library')}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'library' 
                    ? 'bg-slate-800 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                Route Library
              </button>
            </div>
            
            {/* Create Action */}
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 bg-gradient-to-r from-primary to-blue-500 hover:from-[#0284c7] hover:to-blue-600 text-white font-medium rounded-xl flex items-center gap-2 transition-all shadow-[0_4px_20px_rgba(56,189,248,0.4)] hover:shadow-[0_4px_25px_rgba(56,189,248,0.6)] hover:-translate-y-0.5"
            >
              <Plus className="w-5 h-5" />
              Create New Mission
            </button>
          </div>

          {/* Quick Stats Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-800/30 border border-slate-800/80 rounded-2xl p-5 flex items-center gap-5">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <Target className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Total Active Missions</p>
                <p className="text-2xl font-bold text-white">{activeMissionsCount}</p>
              </div>
            </div>
            <div className="bg-slate-800/30 border border-slate-800/80 rounded-2xl p-5 flex items-center gap-5">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <Compass className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Total Routes Saved</p>
                <p className="text-2xl font-bold text-white">{draftMissionsCount}</p>
              </div>
            </div>
            <div className="bg-slate-800/30 border border-slate-800/80 rounded-2xl p-5 flex items-center gap-5">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Personnel on Mission</p>
                <p className="text-2xl font-bold text-white">{totalPersonnelAssigned || 0}</p>
              </div>
            </div>
          </div>

          {/* Grid Layout for Missions/Routes */}
          {loading ? (
             <div className="p-16 flex justify-center items-center">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
             </div>
          ) : displayMissions.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center bg-[#111827]/40 rounded-2xl border border-slate-800/60 mt-8">
              <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4 border border-slate-700">
                <Map className="w-8 h-8 text-slate-500" />
              </div>
              <h3 className="font-bold text-xl text-white mb-2">No {activeTab === 'active' ? 'Active' : 'Saved'} Missions</h3>
              <p className="text-slate-400 max-w-sm">You haven't added any missions to this category yet. Click the create button to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayMissions.map((mission) => (
                <div key={mission.id} className={`bg-[#111827]/60 backdrop-blur-xl rounded-2xl border border-slate-800/80 hover:border-slate-700 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-all group overflow-hidden cursor-pointer flex flex-col ${mission.status === 'draft' ? 'opacity-80 hover:opacity-100 bg-[#111827]/40' : ''}`}>
                  {/* Map Thumbnail Placeholder */}
                  <div className={`h-40 relative overflow-hidden flex items-center justify-center ${mission.status === 'draft' ? 'bg-slate-900/50' : 'bg-slate-900'}`}>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className={`absolute w-[150%] h-[150%] bg-gradient-to-tr ${mission.status === 'active' ? 'from-slate-900 via-primary/10 to-transparent' : 'from-slate-900/50 via-slate-700/10 to-transparent'} mix-blend-overlay`}></div>
                    <MapPin className={`w-10 h-10 z-10 ${mission.status === 'active' ? 'text-primary drop-shadow-[0_0_10px_rgba(56,189,248,0.5)]' : 'text-slate-600'}`} />
                    
                    {/* Status Badge */}
                    <div className={`absolute top-4 right-4 backdrop-blur-md px-3 py-1 rounded-full border z-10 ${mission.status === 'active' ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-slate-800/50 border-slate-700/50'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wider ${mission.status === 'active' ? 'text-emerald-400' : 'text-slate-400'}`}>{mission.status}</span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className={`text-lg font-bold text-white transition-colors ${mission.status === 'active' ? 'group-hover:text-primary' : ''}`}>{mission.title}</h3>
                      <button 
                        onClick={(e) => handleDelete(mission.id, e)}
                        className="text-slate-600 hover:text-red-400 p-1.5 rounded-md hover:bg-red-900/20 transition-colors"
                        title="Delete Mission"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm text-slate-400 mb-4 line-clamp-2">{mission.description}</p>
                    
                    <div className="flex items-center gap-2 mb-6">
                      <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                      <span className="text-xs font-medium text-slate-300 truncate">
                        {mission.location || 'Anywhere'}
                      </span>
                    </div>

                    <div className="mt-auto grid grid-cols-2 gap-4 pb-4 border-b border-slate-800/80">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Target Dist</p>
                        <p className={`text-lg font-bold ${mission.status === 'active' ? 'text-white' : 'text-slate-300'}`}>{mission.targetDistance.toFixed(1)} <span className={`text-sm font-medium ${mission.status === 'active' ? 'text-slate-400' : 'text-slate-500'}`}>km</span></p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Target Pace</p>
                        <p className={`text-lg font-bold ${mission.status === 'active' ? 'text-white' : 'text-slate-300'}`}>{mission.targetPace} <span className={`text-sm font-medium ${mission.status === 'active' ? 'text-slate-400' : 'text-slate-500'}`}>/km</span></p>
                      </div>
                    </div>

                    <div className="pt-4 flex items-center justify-between">
                      {mission.assignedPersonnel && mission.assignedPersonnel.length > 0 ? (
                        <>
                          <button 
                            onClick={() => openAssignModal(mission)}
                            className="flex -space-x-2 hover:opacity-80 transition-opacity"
                            title="Edit Assignments"
                          >
                            {getPersonnelInitials(mission.assignedPersonnel).slice(0, 3).map((initials, idx) => (
                              <div key={idx} className={`w-8 h-8 rounded-full border-2 border-[#111827] flex items-center justify-center text-[10px] font-bold bg-slate-700 text-slate-300`}>
                                {initials}
                              </div>
                            ))}
                            {mission.assignedPersonnel.length > 3 && (
                              <div className="w-8 h-8 rounded-full border-2 border-[#111827] flex items-center justify-center text-[10px] font-bold bg-slate-800 text-slate-400">
                                +{mission.assignedPersonnel.length - 3}
                              </div>
                            )}
                          </button>
                          {mission.routineType === 'once' ? (
                            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                              <Calendar className="w-3.5 h-3.5" />
                              Due: {mission.deadline ? new Date(mission.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date'}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20">
                              <Repeat className="w-3.5 h-3.5" />
                              {mission.routineType.charAt(0).toUpperCase() + mission.routineType.slice(1)} Routine
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="text-xs font-medium text-slate-500">
                            Not assigned
                          </div>
                          {mission.status === 'draft' ? (
                            <button 
                              onClick={() => openAssignModal(mission)}
                              className="text-primary text-xs font-bold uppercase tracking-wider hover:text-[#0284c7] transition-colors"
                            >
                              Assign Now
                            </button>
                          ) : (
                            // Even active missions should be assignable
                            <div className="flex items-center space-x-3">
                              <button 
                                onClick={() => openAssignModal(mission)}
                                className="text-primary text-xs font-bold uppercase tracking-wider hover:text-[#0284c7] transition-colors"
                              >
                                Assign Now
                              </button>
                              {mission.routineType === 'once' ? (
                                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                                  <Calendar className="w-3.5 h-3.5" />
                                  Due: {mission.deadline || 'No date'}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20">
                                  <Repeat className="w-3.5 h-3.5" />
                                  {mission.routineType.charAt(0).toUpperCase() + mission.routineType.slice(1)} Routine
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Mission Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111827] border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="p-8 pb-6 border-b border-slate-800">
              <h3 className="text-xl font-bold text-white">Create New Route</h3>
              <p className="text-sm text-slate-400 mt-1">Design a new training mission and save it to your library.</p>
            </div>
            
            <form onSubmit={handleCreateMission} className="p-8 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Route Name</label>
                <input 
                  required
                  type="text" 
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Morning 5K Sprints" 
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm text-white transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
                <textarea 
                  required
                  rows={2}
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Provide details about the terrain and objectives..." 
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm text-white transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Location <span className="text-slate-500 font-normal">(Optional)</span></label>
                <input 
                  type="text" 
                  value={newLocation}
                  onChange={e => setNewLocation(e.target.value)}
                  placeholder="e.g. Central Park (Leave blank for 'Anywhere')" 
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm text-white transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Target Distance (km)</label>
                  <input 
                    required
                    type="number"
                    step="0.1" 
                    value={newDistance}
                    onChange={e => setNewDistance(e.target.value)}
                    placeholder="e.g. 5.0" 
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm text-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Expected Pace (min/km)</label>
                  <input 
                    required
                    type="text" 
                    value={newPace}
                    onChange={e => setNewPace(e.target.value)}
                    placeholder="e.g. 5'30&quot;" 
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm text-white transition-all"
                  />
                </div>
              </div>

              {/* Scheduling Section */}
              <div className="p-4 bg-slate-800/30 border border-slate-800/80 rounded-xl space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Schedule Type</label>
                  <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700">
                    <button 
                      type="button"
                      onClick={() => {
                        setIsRecurring(false);
                        setNewRoutine('once');
                      }}
                      className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${!isRecurring ? 'bg-slate-700 text-white shadow-sm ring-1 ring-slate-600' : 'text-slate-400 hover:text-white'}`}
                    >
                      <Calendar className="w-4 h-4" />
                      One-Time
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setIsRecurring(true);
                        setNewRoutine('daily');
                      }}
                      className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${isRecurring ? 'bg-slate-700 text-white shadow-sm ring-1 ring-slate-600' : 'text-slate-400 hover:text-white'}`}
                    >
                      <Repeat className="w-4 h-4" />
                      Recurring
                    </button>
                  </div>
                </div>

                {!isRecurring ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Deadline <span className="text-slate-500 font-normal">(Optional)</span></label>
                    <input 
                      type="date" 
                      value={newDeadline}
                      onChange={e => setNewDeadline(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm text-white transition-all [color-scheme:dark]"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Routine Frequency</label>
                    <select 
                      value={newRoutine}
                      onChange={e => setNewRoutine(e.target.value as any)}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm text-white transition-all appearance-none"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Initial Status</label>
                <div className="flex bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                  <button 
                    type="button"
                    onClick={() => setNewStatus('active')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${newStatus === 'active' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    Active Mission
                  </button>
                  <button 
                    type="button"
                    onClick={() => setNewStatus('draft')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${newStatus === 'draft' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    Save as Draft
                  </button>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-slate-300 hover:text-white font-medium rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2.5 bg-primary hover:bg-[#0284c7] text-white font-medium rounded-xl transition-all shadow-[0_4px_15px_rgba(56,189,248,0.3)] hover:shadow-[0_4px_20px_rgba(56,189,248,0.5)]"
                >
                  Save Route
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Personnel Modal */}
      {isAssignModalOpen && assignTargetMission && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] w-full max-w-md rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-bold text-white">Assign Personnel</h3>
                <p className="text-sm text-slate-400">Select personnel for {assignTargetMission.title}</p>
              </div>
              <button 
                onClick={() => {
                  setIsAssignModalOpen(false);
                  setAssignTargetMission(null);
                }}
                className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {personnelList.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p>You don't have any registered personnel yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {personnelList.map(person => (
                    <label 
                      key={person.id} 
                      className={`flex items-center p-3 rounded-xl cursor-pointer border transition-all ${
                        selectedPersonnelIds.includes(person.id)
                          ? 'border-primary bg-primary/10'
                          : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                      }`}
                    >
                      <input 
                        type="checkbox"
                        checked={selectedPersonnelIds.includes(person.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPersonnelIds(prev => [...prev, person.id]);
                          } else {
                            setSelectedPersonnelIds(prev => prev.filter(id => id !== person.id));
                          }
                        }}
                        className="w-5 h-5 rounded border-slate-700 text-primary focus:ring-primary focus:ring-offset-slate-900 bg-slate-800"
                      />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-white">{person.name}</p>
                        <p className="text-xs text-slate-400">{person.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t border-slate-800 bg-slate-900">
              <button 
                onClick={() => {
                  setIsAssignModalOpen(false);
                  setAssignTargetMission(null);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-white bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveAssignments}
                disabled={personnelList.length === 0}
                className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-primary to-[#0284c7] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Assignments
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
