"use client";

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth, realtimeDb } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, update } from 'firebase/database';
import { 
  Activity, ArrowLeft, Upload, FileText, User, Calendar, X, 
  ChevronLeft, Weight, ActivitySquare, Plus, CheckCircle2, AlertCircle, Save
} from 'lucide-react';
import mammoth from 'mammoth';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts';

interface FitnessStats {
  age?: string;
  height?: string;
  weight?: string;
  waist?: string;
  hip?: string;
  wrist?: string;
  gender?: string;
  dateTaken?: string;
  bmiResult?: string;
  interventionPackage?: string;
}

interface WeightHistory {
  month: string;
  year: string;
  weight: number;
}

interface Personnel {
  id: string;
  fullName: string;
  email: string;
  createdAt: number;
  role: string;
  adminId: string;
  fitnessStats?: FitnessStats;
  weightHistory?: Record<string, number>; // e.g. "2025-Jan": 61, "2025-Feb": 61
  weightHistoryList?: WeightHistory[]; // For chart
}

const parseDocxTableText = (text: string) => {
  const stats: FitnessStats = {};
  const weightHistory: Record<string, number> = {};
  
  // Extract Stats using Regex based on the raw text
  const ageMatch = text.match(/Age:\s*(\d+)/i);
  if (ageMatch) stats.age = ageMatch[1];

  const heightMatch = text.match(/Height:\s*([\d.]+)\s*cm/i);
  if (heightMatch) stats.height = heightMatch[1];

  // We take the current active weight
  const weightMatch = text.match(/Weight:\s*([\d.]+)\s*kg/i);
  if (weightMatch) stats.weight = weightMatch[1];

  const waistMatch = text.match(/Waist:\s*([\d.]+)\s*cm/i);
  if (waistMatch) stats.waist = waistMatch[1];

  const hipMatch = text.match(/Hip:\s*([\d.]+)\s*cm/i);
  if (hipMatch) stats.hip = hipMatch[1];

  const wristMatch = text.match(/Wrist:\s*([\d.]+)\s*cm/i);
  if (wristMatch) stats.wrist = wristMatch[1];

  const genderMatch = text.match(/Gender:\s*(Female|Male)/i);
  if (genderMatch) stats.gender = genderMatch[1];

  const dateMatch = text.match(/Date Taken:\s*([A-Za-z]+\s+\d{1,2},\s*\d{4})/i);
  if (dateMatch) stats.dateTaken = dateMatch[1];

  const bmiMatch = text.match(/BMI Result:\s*([\d.]+)/i);
  if (bmiMatch) stats.bmiResult = bmiMatch[1];

  const interventionMatch = text.match(/Intervention Package:\s*PACKAGE\s*[“"']?([A-Z])[”"']?/i);
  if (interventionMatch) stats.interventionPackage = "Package " + interventionMatch[1];

  // The DOCX output from mammoth gives us the raw text. Let's make a better heuristic to parse the multiline grid
  // We notice:
  // "MONTH"
  // "Jan", "Feb"...
  // "WEIGHT (kg)" -> weights
  // "2025" or another year
  // "WEIGHT (kg)"... -> next year
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  let currentYear = new Date().getFullYear().toString();
  let isParsingMonths = false;
  let monthBuf: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.match(/^20\d\d$/)) {
      currentYear = line;
    }

    if (line === "MONTH") {
      isParsingMonths = true;
      monthBuf = [];
      continue;
    }

    if (isParsingMonths) {
      if (line === "WEIGHT (kg)") {
        // Find the next block of weights, they usually follow immediately.
        // We will read weights until we hit a year marker or end of file/next table
        let wIdx = i + 1;
        let tempWeights: string[] = [];
        let extractedYear = "";
        
        while (wIdx < lines.length) {
          let str = lines[wIdx];
          
          if (str === "WEIGHT (kg)") {
            // Reached another block before finding a year, break and process
            break;
          }
          
          if (str.match(/^20\d\d$/)) {
            // Reached a new year marker indicating the year for the preceding weights!
            extractedYear = str;
            wIdx++;
            break;
          }

          if (str.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i)) {
             // Hit the next section or something else entirely.
             break;
          }

          tempWeights.push(str);
          wIdx++;
        }
        
        const yearToUse = extractedYear || currentYear;
        // Map the buffered weights to the month indexes for this year
        for (let m = 0; m < monthBuf.length; m++) {
            if (m < tempWeights.length) {
                const possibleWeight = tempWeights[m].replace(/kg/gi, '').trim();
                const wNum = parseFloat(possibleWeight);
                weightHistory[`${yearToUse}-${monthBuf[m]}`] = !isNaN(wNum) ? wNum : 0;
            } else {
                // If weight wasn't provided for this month, explicitly record it as 0 kg
                weightHistory[`${yearToUse}-${monthBuf[m]}`] = 0;
            }
        }
        
        i = wIdx - 1; // Advance main loop to avoid re-parsing
      } else {
        // Collect month strings, keeping only valid short months (Jan, Feb, etc.)
        const monthMatch = line.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
        if (monthMatch) {
            monthBuf.push(monthMatch[1].substring(0,3)); // Normalize casing
        }
      }
    }
  }

  return { stats, weightHistory };
};

const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function PersonnelProfile() {
  const params = useParams();
  const router = useRouter();
  const personnelId = params.id as string;
  
  const [adminUid, setAdminUid] = useState<string | null>(null);
  const [personnel, setPersonnel] = useState<Personnel | null>(null);
  const [loading, setLoading] = useState(true);
  
  // File Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  // Add Weight Modal State
  const [showAddWeightModal, setShowAddWeightModal] = useState(false);
  const [newWeightMonth, setNewWeightMonth] = useState(monthOrder[new Date().getMonth()]);
  const [newWeightYear, setNewWeightYear] = useState(new Date().getFullYear().toString());
  const [newWeightValue, setNewWeightValue] = useState("");
  const [savingWeight, setSavingWeight] = useState(false);

  const handleSaveWeight = async () => {
    if (!newWeightMonth || !newWeightYear || !newWeightValue) {
      setImportError("Please enter all weight details.");
      setShowAddWeightModal(false);
      return;
    }
    const wNum = parseFloat(newWeightValue);
    if (isNaN(wNum)) {
      setImportError("Weight must be a valid number.");
      setShowAddWeightModal(false);
      return;
    }

    setSavingWeight(true);
    setImportError(null);
    setImportSuccess(false);

    try {
      const userRef = ref(realtimeDb, `users/${personnelId}`);
      // Simple update by directly updating the specific path inside weightHistory
      const updates: Record<string, unknown> = {};
      updates[`weightHistory/${newWeightYear}-${newWeightMonth}`] = wNum;
      
      await update(userRef, updates);
      
      setImportSuccess(true);
      setTimeout(() => setImportSuccess(false), 3000);
      setShowAddWeightModal(false);
      setNewWeightValue("");
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        setImportError(err.message || "Failed to save weight.");
      } else {
        setImportError("Failed to save weight.");
      }
    } finally {
      setSavingWeight(false);
    }
  };

  const availableYears = useMemo(() => {
    if (!personnel?.weightHistoryList) return [];
    const years = new Set(personnel.weightHistoryList.map(item => item.year));
    // Sort years descending
    return Array.from(years).sort((a,b) => b.localeCompare(a));
  }, [personnel?.weightHistoryList]);

  const filteredChartData = useMemo(() => {
     if (!personnel?.weightHistoryList) return [];
     return personnel.weightHistoryList.filter(item => item.year === selectedYear);
  }, [personnel?.weightHistoryList, selectedYear]);

  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAdminUid(user.uid);
        fetchPersonnelData(user.uid, personnelId);
      } else {
        router.push('/');
      }
    });
    return () => unsubscribeAuth();
  }, [personnelId, router]);

  const fetchPersonnelData = (uid: string, pid: string) => {
    const userRef = ref(realtimeDb, `users/${pid}`);
    onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        // Verify this user actually belongs to this admin
        if (data.adminId === uid && data.role === 'user') {
          
          // Transform weight history to array for chart
          let chartData: WeightHistory[] = [];
          if (data.weightHistory) {
             const keys = Object.keys(data.weightHistory);
             chartData = keys.map(k => {
                 const [year, month] = k.split('-');
                 return { year, month, weight: data.weightHistory[k] };
             });
             // Sort chronologically
             chartData.sort((a, b) => {
                 if (a.year !== b.year) return parseInt(a.year) - parseInt(b.year);
                 return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
             });
          }

          setPersonnel({
            id: pid,
            ...data,
            weightHistoryList: chartData
          });
        } else {
          // Unauthorized or not an assigned user
          setPersonnel(null);
        }
      } else {
        setPersonnel(null);
      }
      setLoading(false);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      setImportError("Please upload a .docx file");
      return;
    }

    setImporting(true);
    setImportError(null);
    setImportSuccess(false);

    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // Use mammoth to extract raw text
      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = result.value;
      
      const { stats, weightHistory } = parseDocxTableText(text);

      if (Object.keys(stats).length === 0) {
        throw new Error("Could not parse physical stats from the document.");
      }

      // Merge historical weights to avoid overwriting all past data completely?
      // For now we just replace the ones parsed.
      const userRef = ref(realtimeDb, `users/${personnelId}`);
      
      const updates: Record<string, unknown> = {
          fitnessStats: stats
      };
      
      if (Object.keys(weightHistory).length > 0) {
          // We do an object spread to keep existing records that weren't parsed in this doc
          updates.weightHistory = {
              ...(personnel?.weightHistory || {}),
              ...weightHistory
          };
      }

      await update(userRef, updates);
      
      setImportSuccess(true);
      setTimeout(() => setImportSuccess(false), 3000);
      
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        setImportError(err.message || "Failed to parse document");
      } else {
        setImportError("Failed to parse document");
      }
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-[#0a0f1c] text-white items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!personnel) {
    return (
      <div className="flex flex-col h-screen bg-[#0a0f1c] text-white items-center justify-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Personnel Not Found</h2>
        <p className="text-slate-400 mb-6">This user does not exist or is not assigned to your unit.</p>
        <button onClick={() => router.push('/dashboard/personnel')} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Directory
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0a0f1c] text-slate-200 overflow-x-hidden font-sans">
      <main className="flex-1 flex flex-col relative z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 blur-[150px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-600/5 blur-[150px] rounded-full pointer-events-none" />
        
        {/* Header */}
        <header className="px-10 py-6 border-b border-slate-800/60 flex items-center justify-between bg-[#111827]/40 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => router.push('/dashboard/personnel')}
              className="p-2.5 bg-slate-800/50 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors border border-slate-700/50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                {personnel.fullName}'s Profile
                {personnel.fitnessStats?.bmiResult && (
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/20">
                    BMI: {personnel.fitnessStats.bmiResult}
                  </span>
                )}
              </h1>
              <p className="text-sm text-slate-400 mt-1">{personnel.email}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <input 
              type="file" 
              accept=".docx" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
            />
            <button 
              onClick={() => setShowAddWeightModal(true)}
              className="px-5 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-medium rounded-xl flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Weight
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="px-5 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-medium rounded-xl flex items-center gap-2 transition-all"
            >
              {importing ? (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {importing ? 'Importing...' : 'Import BMI Form'}
            </button>
          </div>
        </header>

        {/* Status Messages */}
        {importSuccess && (
          <div className="mx-10 mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400 animate-in slide-in-from-top-4">
            <CheckCircle2 className="w-5 h-5" />
            <p className="font-medium">Form imported and stats updated successfully!</p>
          </div>
        )}
        
        {importError && (
          <div className="mx-10 mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 animate-in slide-in-from-top-4">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="font-medium">{importError}</p>
            <button onClick={() => setImportError(null)} className="ml-auto p-1 hover:bg-red-500/20 rounded-md">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Stats & Info */}
          <div className="lg:col-span-1 space-y-8">
            {/* User Card */}
            <div className="bg-[#111827]/60 backdrop-blur-xl rounded-3xl border border-slate-800/80 p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[40px] group-hover:bg-primary/20 transition-colors" />
              
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-3xl font-bold text-slate-300 border-2 border-slate-600 shadow-xl mb-6 relative">
                  {personnel.fullName.substring(0, 2).toUpperCase()}
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full border-4 border-[#111827] flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-1">{personnel.fullName}</h2>
                <p className="text-slate-400 mb-6">{personnel.email}</p>
                
                <div className="w-full h-px bg-slate-800/80 mb-6"></div>
                
                <div className="w-full flex items-center justify-between text-sm">
                  <span className="text-slate-500 flex items-center gap-2"><Calendar className="w-4 h-4" /> Joined</span>
                  <span className="text-slate-300 font-medium">{formatDate(personnel.createdAt)}</span>
                </div>
                {personnel.fitnessStats?.dateTaken && (
                  <div className="w-full flex items-center justify-between text-sm mt-4">
                    <span className="text-slate-500 flex items-center gap-2"><FileText className="w-4 h-4" /> Last Form Date</span>
                    <span className="text-slate-300 font-medium">{personnel.fitnessStats.dateTaken}</span>
                  </div>
                )}
              </div>
            </div>

            {/* BMI Stats Grid */}
            <div className="bg-[#111827]/60 backdrop-blur-xl rounded-3xl border border-slate-800/80 p-8 shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <ActivitySquare className="w-5 h-5 text-primary" />
                Physical Statistics
              </h3>
              
              {!personnel.fitnessStats ? (
                <div className="text-center py-6">
                  <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-50" />
                  <p className="text-slate-400 text-sm">No physical stats available. Please import a BMI Monitoring Form.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                    <p className="text-xs text-slate-500 mb-1">Age</p>
                    <p className="text-xl font-bold text-white">{personnel.fitnessStats.age || '--'}</p>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                    <p className="text-xs text-slate-500 mb-1">Gender</p>
                    <p className="text-lg font-bold text-white">{personnel.fitnessStats.gender || '--'}</p>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                    <p className="text-xs text-slate-500 mb-1">Height</p>
                    <p className="text-xl font-bold text-white">{personnel.fitnessStats.height ? `${personnel.fitnessStats.height} cm` : '--'}</p>
                  </div>
                  <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20">
                    <p className="text-xs text-primary/80 mb-1 font-medium">Weight</p>
                    <p className="text-xl font-bold text-primary">{personnel.fitnessStats.weight ? `${personnel.fitnessStats.weight} kg` : '--'}</p>
                  </div>
                  
                  <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                    <p className="text-xs text-slate-500 mb-1">Waist</p>
                    <p className="text-lg font-bold text-white">{personnel.fitnessStats.waist ? `${personnel.fitnessStats.waist} cm` : '--'}</p>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                    <p className="text-xs text-slate-500 mb-1">Hip</p>
                    <p className="text-lg font-bold text-white">{personnel.fitnessStats.hip ? `${personnel.fitnessStats.hip} cm` : '--'}</p>
                  </div>
                  
                  {personnel.fitnessStats.interventionPackage && (
                    <div className="col-span-2 bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20 mt-2">
                      <p className="text-xs text-blue-400 mb-1 font-medium">Intervention Plan</p>
                      <p className="text-lg font-bold text-white">{personnel.fitnessStats.interventionPackage}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Chart & History */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-[#111827]/60 backdrop-blur-xl rounded-3xl border border-slate-800/80 p-8 shadow-2xl block h-full">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <Weight className="w-6 h-6 text-primary" />
                    Weight Trends
                  </h3>
                  <p className="text-slate-400 text-sm">Monthly progression history based on monitoring records.</p>
                </div>

                {availableYears.length > 1 && (
                  <select 
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="bg-[#0f172a] border border-slate-700 hover:border-slate-500 transition-colors text-slate-300 text-sm rounded-xl focus:ring-primary focus:border-primary block p-2.5 outline-none font-medium cursor-pointer"
                  >
                    {availableYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                )}
              </div>

              {!personnel.weightHistoryList || personnel.weightHistoryList.length === 0 ? (
                <div className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
                  <Activity className="w-16 h-16 text-slate-700 mb-4" />
                  <p className="text-slate-400 font-medium">No weight history data available.</p>
                  <p className="text-slate-500 text-sm mt-2 text-center max-w-sm">Import a BMI Monitoring Form to populate the weight history chart.</p>
                </div>
              ) : (
                <div className="h-[450px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      key={selectedYear}
                      data={filteredChartData}
                      margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis 
                        dataKey="month" 
                        stroke="#64748b" 
                        fontSize={12} 
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis 
                        stroke="#64748b" 
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        dx={-10}
                        domain={['dataMin - 2', 'dataMax + 2']}
                        tickFormatter={(val) => `${val}kg`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0f172a', 
                          border: '1px solid #1e293b',
                          borderRadius: '12px',
                          color: '#f8fafc',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                        }}
                        itemStyle={{ color: '#38bdf8', fontWeight: 'bold' }}
                        labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                        formatter={(value: unknown) => {
                          const numValue = typeof value === 'number' ? value : Number(value);
                          return [`${numValue} kg`, 'Weight'];
                        }}
                        labelFormatter={(label, data) => {
                          if (data && data.length > 0) {
                            return `${label} ${data[0].payload.year}`;
                          }
                          return label;
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="weight" 
                        stroke="#38bdf8" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorWeight)" 
                        activeDot={{ r: 6, fill: '#0ea5e9', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

        </div>
        
        {/* Add Weight Modal */}
        {showAddWeightModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="bg-[#111827] border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Add Weight Record</h3>
                <button 
                  onClick={() => setShowAddWeightModal(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Month</label>
                    <select 
                      value={newWeightMonth}
                      onChange={(e) => setNewWeightMonth(e.target.value)}
                      className="w-full bg-[#0a0f1c] border border-slate-700/80 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    >
                      {monthOrder.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Year</label>
                    <input 
                      type="number" 
                      value={newWeightYear}
                      onChange={(e) => setNewWeightYear(e.target.value)}
                      className="w-full bg-[#0a0f1c] border border-slate-700/80 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                      placeholder="e.g. 2026"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Weight (kg)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.1"
                      value={newWeightValue}
                      onChange={(e) => setNewWeightValue(e.target.value)}
                      className="w-full bg-[#0a0f1c] border border-slate-700/80 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all pl-12"
                      placeholder="Enter weight in kg"
                    />
                    <Weight className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-slate-900/50 rounded-b-3xl flex items-center justify-end gap-3">
                <button 
                  onClick={() => setShowAddWeightModal(false)}
                  className="px-5 py-2.5 text-slate-300 font-medium hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveWeight}
                  disabled={savingWeight}
                  className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingWeight ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Record
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
