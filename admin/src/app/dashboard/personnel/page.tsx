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
  ChevronRight,
  UserPlus,
  Copy,
  Check,
  Trash2,
  X
} from 'lucide-react';
import { auth, realtimeDb } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, remove, set } from 'firebase/database';

interface Personnel {
  id: string;
  fullName: string;
  email: string;
  createdAt: number;
}

export default function PersonnelList() {
  const [adminUid, setAdminUid] = useState<string | null>(null);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAdminUid(user.uid);
        fetchPersonnel(user.uid);
      } else {
        window.location.href = '/';
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const fetchPersonnel = (uid: string) => {
    const usersRef = ref(realtimeDb, 'users');
    onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const adminPersonnel: Personnel[] = Object.keys(usersData)
          .map((key) => ({
            id: key,
            ...usersData[key],
          }))
          .filter(
            (user: any) => user.role === 'user' && user.adminId === uid
          );
        
        // Sort by created date descending
        adminPersonnel.sort((a, b) => b.createdAt - a.createdAt);
        setPersonnel(adminPersonnel);
      } else {
        setPersonnel([]);
      }
      setLoading(false);
    });
  };

  const handleCopyCode = () => {
    if (adminUid) {
      navigator.clipboard.writeText(adminUid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRemovePersonnel = async (personnelId: string) => {
    if (window.confirm('Are you sure you want to remove this personnel? They will no longer be linked to your account.')) {
      try {
        // We unset the adminId rather than deleting the user, as we can't delete auth without Admin SDK
        const userAdminIdRef = ref(realtimeDb, `users/${personnelId}/adminId`);
        await set(userAdminIdRef, null);
      } catch (error) {
        console.error("Error removing personnel:", error);
        alert("Failed to remove personnel.");
      }
    }
  };

  const filteredPersonnel = personnel.filter(p => 
    p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
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
            <a href="/dashboard/personnel" className="flex items-center gap-3 px-4 py-3.5 bg-primary/10 text-primary rounded-xl font-medium border border-primary/10 relative overflow-hidden group">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-md"></div>
              <Users className="w-5 h-5" />
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
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[150px] rounded-full pointer-events-none" />
        
        {/* Top Header */}
        <header className="h-20 border-b border-slate-800/60 px-10 flex items-center justify-between bg-[#111827]/40 backdrop-blur-md sticky top-0 z-30 shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Personnel Management</h1>
            <p className="text-sm text-slate-400 mt-1">Manage and invite personnel to your organizational unit.</p>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Search personnel..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Your Personnel</h2>
              <p className="text-slate-400 text-sm">You currently manage <span className="text-primary font-bold">{personnel.length}</span> personnel.</p>
            </div>
            <button 
              onClick={() => setIsInviteModalOpen(true)}
              className="px-5 py-2.5 bg-primary hover:bg-[#0284c7] text-white font-medium rounded-xl flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(56,189,248,0.3)] hover:shadow-[0_0_20px_rgba(56,189,248,0.5)]"
            >
              <UserPlus className="w-4 h-4" />
              Invite Personnel
            </button>
          </div>

          {/* Personnel Table */}
          <section className="bg-[#111827]/60 backdrop-blur-xl rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-10 flex justify-center items-center">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : personnel.length === 0 ? (
                <div className="p-16 flex flex-col items-center justify-center text-center border-t border-slate-800/80 bg-slate-900/30">
                  <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-blue-500/20">
                    <Users className="w-8 h-8 text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-lg text-white mb-2">No Personnel Found</h3>
                  <p className="text-slate-400 max-w-sm">You haven't added any personnel to your unit yet. Use the Invite Personnel button to get started.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 bg-slate-900/40">
                      <th className="px-8 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                      <th className="px-8 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Email Address</th>
                      <th className="px-8 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Date Joined</th>
                      <th className="px-8 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-sm">
                    {filteredPersonnel.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-800/30 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 border border-slate-600 shadow-sm">
                              {user.fullName.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="font-medium text-slate-200 group-hover:text-white transition-colors">{user.fullName}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-slate-400">{user.email}</td>
                        <td className="px-8 py-5 text-slate-400">{formatDate(user.createdAt)}</td>
                        <td className="px-8 py-5 text-right">
                          <button 
                            onClick={() => handleRemovePersonnel(user.id)}
                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                            title="Remove Personnel"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111827] border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setIsInviteModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="p-8">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-primary/20">
                <UserPlus className="w-6 h-6 text-primary" />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">Invite Personnel</h3>
              <p className="text-sm text-slate-400 mb-6">
                Share this unique Admin Invite Code with your personnel. They must enter this code during registration on the mobile app to be linked to your unit.
              </p>
              
              <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-1 mb-6">
                <div className="flex items-center p-3 gap-3">
                  <span className="flex-1 font-mono text-primary text-center tracking-wider text-sm overflow-x-auto whitespace-nowrap scrollbar-hide">
                    {adminUid || 'Loading...'}
                  </span>
                  <button 
                    onClick={handleCopyCode}
                    disabled={!adminUid}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors flex items-center justify-center border border-slate-600/50"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
                <div className="text-blue-400 shrink-0 mt-0.5"><Activity className="w-4 h-4" /></div>
                <p className="text-xs text-blue-200/80 leading-relaxed">
                  Only users who register specifically using this exact code will appear in your personnel list. Keep this code secure.
                </p>
              </div>
            </div>
            
            <div className="p-4 bg-slate-900 border-t border-slate-800/80 flex justify-end">
              <button 
                onClick={() => setIsInviteModalOpen(false)}
                className="px-4 py-2 bg-primary hover:bg-[#0284c7] text-white font-medium rounded-lg transition-colors text-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
