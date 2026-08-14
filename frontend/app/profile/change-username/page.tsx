'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Key, ArrowLeft, Loader2, Shield, AlertTriangle, CheckCircle2,
    Eye, EyeOff, Lock
} from 'lucide-react';
import { updateProfile, getProfile, verifyPassword } from '@/lib/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function ChangeUsernamePage() {
    const router = useRouter();
    const [step, setStep] = useState<'verify' | 'change'>('verify');
    const [password, setPassword] = useState('');
    const [newUsername, setNewUsername] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const handleVerifyPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!password) {
            toast.error('Please enter your password');
            return;
        }

        setIsVerifying(true);
        try {
            await verifyPassword(password);
            toast.success('Password verified!');
            setStep('change');
        } catch (error: any) {
            const msg = error.response?.data?.error || 'Incorrect password';
            toast.error(msg);
        } finally {
            setIsVerifying(false);
        }
    };

    const handleChangeUsername = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newUsername.trim()) {
            toast.error('Please enter a new username');
            return;
        }

        // Validate username (numbers and symbols only)
        const usernameRegex = /^[0-9.@+#!$%^&*()\-\[\]{}|;:'",.<>?/`~]+$/;
        if (!usernameRegex.test(newUsername)) {
            toast.error('Username must contain only numbers and symbols (no letters)');
            return;
        }

        setIsUpdating(true);
        try {
            await updateProfile({ username: newUsername });
            toast.success('Username updated successfully!');

            // Refresh user data
            const data = await getProfile();
            localStorage.setItem('user', JSON.stringify(data));

            setTimeout(() => {
                router.push('/profile');
            }, 1500);
        } catch (error: any) {
            const msg = error.response?.data?.username?.[0] || 'Failed to update username';
            toast.error(msg);
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F7FF] p-4 md:p-8 font-sans antialiased">
            <div className="max-w-2xl mx-auto">
                {/* Back Link */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors mb-8 group font-black text-[10px] uppercase tracking-widest"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Profile
                </button>

                {/* Main Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-white shadow-xl shadow-indigo-100/50"
                >
                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[1.5rem] flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-indigo-200">
                            <Key className="w-8 h-8" />
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
                            Change Account ID
                        </h1>
                        <p className="text-slate-500 text-sm">
                            Verify your identity to proceed with this secure operation
                        </p>
                    </div>

                    {/* Security Warning */}
                    <div className="bg-amber-50 border-2 border-amber-100 rounded-2xl p-6 mb-8 flex gap-4">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-black text-sm text-amber-900 mb-1">Security Notice</h3>
                            <p className="text-xs text-amber-700 leading-relaxed">
                                Your Account ID is used for login credentials. Changing it will require you to use the new ID for future logins. Username must contain only numbers and symbols (no letters).
                            </p>
                        </div>
                    </div>

                    {/* Step Indicator */}
                    <div className="flex items-center justify-center gap-4 mb-10">
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${step === 'verify' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'} transition-all`}>
                            <Lock className="w-4 h-4" />
                            <span className="text-xs font-black uppercase tracking-wider">Verify</span>
                        </div>
                        <div className="w-8 h-0.5 bg-slate-200" />
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${step === 'change' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'} transition-all`}>
                            <Key className="w-4 h-4" />
                            <span className="text-xs font-black uppercase tracking-wider">Change</span>
                        </div>
                    </div>

                    {/* Step 1: Password Verification */}
                    {step === 'verify' && (
                        <form onSubmit={handleVerifyPassword} className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block ml-1">
                                    Enter Your Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl py-4 pl-12 pr-12 text-sm font-bold text-slate-700 focus:bg-white focus:border-indigo-600 outline-none transition-all"
                                        placeholder="Enter your current password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isVerifying || !password}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-30 active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
                                {isVerifying ? 'Verifying...' : 'Verify Password'}
                            </button>
                        </form>
                    )}

                    {/* Step 2: Change Username */}
                    {step === 'change' && (
                        <form onSubmit={handleChangeUsername} className="space-y-6">
                            <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-4 mb-6 flex items-center gap-3">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                <span className="text-sm font-black text-emerald-700 uppercase tracking-wider">
                                    Password Verified
                                </span>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block ml-1">
                                    New Account ID
                                </label>
                                <div className="relative">
                                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                                    <input
                                        type="text"
                                        value={newUsername}
                                        onChange={(e) => setNewUsername(e.target.value)}
                                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl py-4 pl-12 pr-4 text-sm font-bold text-slate-700 focus:bg-white focus:border-indigo-600 outline-none transition-all"
                                        placeholder="Enter new username (numbers & symbols only)"
                                        required
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2 ml-1 font-bold italic">
                                    Only numbers and symbols allowed (e.g., 123@#$456)
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStep('verify');
                                        setPassword('');
                                        setNewUsername('');
                                    }}
                                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-slate-200 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpdating || !newUsername}
                                    className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-30 active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                                    {isUpdating ? 'Updating...' : 'Update Username'}
                                </button>
                            </div>
                        </form>
                    )}
                </motion.div>

                {/* Privacy Note */}
                <div className="mt-6 text-center">
                    <p className="text-xs text-slate-400 font-medium flex items-center justify-center gap-2">
                        <Shield className="w-3 h-3" />
                        This action is logged for security purposes
                    </p>
                </div>
            </div>
        </div>
    );
}
