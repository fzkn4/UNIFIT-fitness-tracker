"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, ArrowRight, Lock, Mail } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate network request
    setTimeout(() => {
      if (email === 'admin@unifit.org' && password === 'admin123') {
        router.push('/dashboard');
      } else {
        setError('Invalid credentials. (Hint: admin@unifit.org / admin123)');
        setIsLoading(false);
      }
    }, 600);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0f1c] text-slate-200 relative overflow-hidden">
      {/* Background Decorators */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md p-10 z-10">
        <div className="text-center mb-10 flex flex-col items-center">
          <img src="/logo.png" alt="Unifit Logo" className="w-48 mb-6 object-contain drop-shadow-[0_0_20px_rgba(56,189,248,0.4)]" />
          <p className="text-slate-400 text-lg">Sign in to manage personnel fitness routines</p>
        </div>

        <div className="bg-[#111827]/80 backdrop-blur-xl rounded-3xl p-8 border border-slate-800 shadow-2xl">
          <form className="space-y-5" onSubmit={handleLogin}>
            {error && (
              <div className="p-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl flex items-center gap-2">
                <div className="w-1 h-full bg-red-400 rounded-full" />
                {error}
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-slate-700/50 rounded-xl focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 text-slate-200 placeholder:text-slate-600 transition-all"
                  placeholder="admin@unifit.org"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-sm font-medium text-slate-300">Password</label>
                <a href="#" className="text-xs text-primary hover:text-primary/80 transition-colors">Forgot password?</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-slate-700/50 rounded-xl focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 text-slate-200 placeholder:text-slate-600 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 mt-8 bg-primary hover:bg-[#0284c7] disabled:opacity-70 text-white font-semibold rounded-xl shadow-[0_4px_14px_0_rgba(56,189,248,0.39)] hover:shadow-[0_6px_20px_rgba(56,189,248,0.23)] transition-all duration-200"
            >
              {isLoading ? 'Authenticating...' : (
                <>
                  Sign In
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
        
        <p className="text-center text-xs text-slate-500 mt-8">
          © 2026 Unifit Administrator Portal. All rights reserved.
        </p>
      </div>
    </div>
  );
}
