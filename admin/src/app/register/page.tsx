"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Lock, Mail, User } from 'lucide-react';
import { auth, realtimeDb } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import Link from 'next/link';

export default function Register() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save user details to Realtime Database
      await set(ref(realtimeDb, 'users/' + user.uid), {
        fullName: fullName,
        email: email,
        lastLogin: Date.now(),
        createdAt: Date.now(),
        role: 'admin' // since this is the admin portal
      });
      
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create account.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0f1c] text-slate-200 relative overflow-hidden">
      {/* Background Decorators */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md p-10 z-10">
        <div className="text-center mb-10 flex flex-col items-center">
          <img src="/logo.png" alt="Unifit Logo" className="w-48 mb-6 object-contain drop-shadow-[0_0_20px_rgba(56,189,248,0.4)]" />
          <p className="text-slate-400 text-lg">Create a new administrator account</p>
        </div>

        <div className="bg-[#111827]/80 backdrop-blur-xl rounded-3xl p-8 border border-slate-800 shadow-2xl">
          <form className="space-y-5" onSubmit={handleRegister}>
            {error && (
              <div className="p-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl flex items-center gap-2">
                <div className="w-1 h-full bg-red-400 rounded-full" />
                {error}
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300 ml-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-slate-700/50 rounded-xl focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 text-slate-200 placeholder:text-slate-600 transition-all"
                  placeholder="Juan Dela Cruz"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
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
              <label className="text-sm font-medium text-slate-300 ml-1">Password</label>
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

            <div className="space-y-1.5 pt-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
              {isLoading ? 'Creating Account...' : (
                <>
                  Sign Up
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <div className="text-center mt-4 text-sm text-slate-400">
              Already have an account?{' '}
              <Link href="/" className="text-primary hover:text-primary/80 transition-colors font-medium">
                Sign In
              </Link>
            </div>
          </form>
        </div>
        
        <p className="text-center text-xs text-slate-500 mt-8">
          © 2026 Unifit Administrator Portal. All rights reserved.
        </p>
      </div>
    </div>
  );
}
