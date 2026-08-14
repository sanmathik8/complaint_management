'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    User, Lock, Shield, ArrowLeft, Loader2, Key,
    Mail, ShieldCheck, Eye, EyeOff, LogOut, CheckCircle2, AlertTriangle, Trash2
} from 'lucide-react';
import { getProfile, changePassword, updateProfile, logout as apiLogout, deleteAccount } from '@/lib/api';
import toast from 'react-hot-toast';
import NotificationBell from '@/components/NotificationBell';
import MobileNav from '@/components/MobileNav';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Password change state
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPasswords, setShowPasswords] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // Profile update state
    const [isUpdating, setIsUpdating] = useState(false);
    const [username, setUsername] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = await getProfile();
                setUser(data);
                setUsername(data.username);
            } catch (err) {
                toast.error('Failed to load profile');
                router.push('/login');
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [router]);

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }
        if (newPassword.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }

        setIsChangingPassword(true);
        try {
            await changePassword({
                old_password: oldPassword,
                new_password: newPassword,
                confirm_password: confirmPassword
            });
            toast.success('Password updated successfully');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            const msg = error.response?.data?.old_password?.[0] ||
                error.response?.data?.non_field_errors?.[0] ||
                'Failed to change password';
            toast.error(msg);
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleUpdateUsername = async () => {
        if (!username.trim() || username === user.username) return;
        setIsUpdating(true);
        try {
            await updateProfile({ username });
            toast.success('Username updated successfully');
            const data = await getProfile();
            setUser(data);
            localStorage.setItem('user', JSON.stringify(data));
        } catch (error: any) {
            toast.error(error.response?.data?.username?.[0] || 'Failed to update username');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteAccount = async () => {
        const password = prompt('CRITICAL ACTION: This will permanently delete your account and lock this device for 48 hours.\n\nPlease enter your password to confirm:');
        if (!password) return;

        setIsDeleting(true);
        try {
            await deleteAccount(password);
            toast.success('Account deleted. System lock active for 48 hours.');
            apiLogout();
            router.push('/login');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Verification failed. Cannot execute deletion.');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleLogout = () => {
        apiLogout();
        router.push('/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8F7FF] flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8F7FF] p-4 md:p-8 font-sans antialiased pb-24">
            <div className="max-w-4xl mx-auto">
                {/* Back Link */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors mb-8 group font-black text-[10px] uppercase tracking-widest"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Dashboard
                </button>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    {/* Left Sidebar - Profile Overview */}
                    <div className="md:col-span-4 space-y-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-[2.5rem] p-8 border border-white shadow-xl shadow-indigo-100/50 flex flex-col items-center text-center"
                        >
                            <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] flex items-center justify-center text-white mb-6 shadow-lg shadow-indigo-200 ring-4 ring-indigo-50">
                                <User className="w-10 h-10" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                                Your Profile
                            </h2>
                            <p className="text-indigo-600/60 font-black text-[10px] uppercase tracking-[0.2em] mt-2 mb-6">
                                {user.is_superuser ? 'Main Admin' : (user.is_principal ? 'Principal' : 'Student Account')}
                            </p>

                            <div className="w-full bg-slate-50 rounded-2xl p-4 space-y-3">
                                <div className="flex items-center justify-between text-[11px] font-bold">
                                    <span className="text-slate-400 uppercase tracking-widest">Joined</span>
                                    <span className="text-slate-600">{new Date(user.date_joined).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center justify-between text-[11px] font-bold">
                                    <span className="text-slate-400 uppercase tracking-widest">Status</span>
                                    <span className="text-emerald-600 flex items-center gap-1 uppercase tracking-widest">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                        Verified
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={handleLogout}
                                className="w-full mt-8 py-4 bg-rose-50 text-rose-500 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-rose-500 hover:text-white transition-all active:scale-[0.98]"
                            >
                                <LogOut className="w-4 h-4" />
                                Logout Session
                            </button>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-indigo-600 rounded-[2rem] p-8 text-white space-y-4 shadow-xl shadow-indigo-200"
                        >
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <Shield className="w-5 h-5" />
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-widest">End-to-End Encryption</h3>
                            <p className="text-xs leading-relaxed font-medium opacity-80">
                                Your account uses 2048-bit encryption for all complaint data. Identity obfuscation is active by default.
                            </p>
                        </motion.div>
                    </div>

                    {/* Right Content - Settings */}
                    <div className="md:col-span-8 space-y-6">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-white shadow-xl shadow-indigo-100/50"
                        >
                            <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                                    <User className="w-4 h-4 text-indigo-600" />
                                </div>
                                Account Identity
                            </h3>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block ml-1 text-left">
                                        Account ID (Encrypted)
                                    </label>
                                    <div className="flex gap-3">
                                        <div className="relative flex-1">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                            <input
                                                type="text"
                                                value="••••••••••••••••••••"
                                                disabled
                                                className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl py-4 pl-12 pr-4 text-sm font-bold text-slate-400 outline-none cursor-not-allowed"
                                                placeholder="Protected for anonymity"
                                            />
                                        </div>
                                        <button
                                            onClick={() => router.push('/profile/change-username')}
                                            className="px-8 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2"
                                        >
                                            <Key className="w-4 h-4" />
                                            Change ID
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-indigo-600 mt-2 ml-1 font-bold italic tracking-wide flex items-center gap-1">
                                        <Shield className="w-3 h-3" />
                                        Requires password verification to change
                                    </p>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-white shadow-xl shadow-indigo-100/50"
                        >
                            <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                                <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                                    <Key className="w-4 h-4 text-purple-600" />
                                </div>
                                Security Protocol
                            </h3>

                            <form onSubmit={handlePasswordChange} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block ml-1 text-left">
                                            Current Password
                                        </label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                            <input
                                                type={showPasswords ? "text" : "password"}
                                                value={oldPassword}
                                                onChange={(e) => setOldPassword(e.target.value)}
                                                className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl py-4 pl-12 pr-12 text-sm font-bold text-slate-700 focus:bg-white focus:border-indigo-600 outline-none transition-all"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPasswords(!showPasswords)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600"
                                            >
                                                {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block ml-1 text-left">
                                            New Password
                                        </label>
                                        <input
                                            type={showPasswords ? "text" : "password"}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl py-4 px-4 text-sm font-bold text-slate-700 focus:bg-white focus:border-indigo-600 outline-none transition-all"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block ml-1 text-left">
                                            Confirm New
                                        </label>
                                        <input
                                            type={showPasswords ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl py-4 px-4 text-sm font-bold text-slate-700 focus:bg-white focus:border-indigo-600 outline-none transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <button
                                        type="submit"
                                        disabled={isChangingPassword || !oldPassword || !newPassword}
                                        className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-30 active:scale-95 flex items-center gap-2"
                                    >
                                        {isChangingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                        Initialize Protocol Update
                                    </button>
                                </div>
                            </form>
                        </motion.div>

                        {/* Danger Zone */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-rose-50/50 rounded-[2.5rem] p-8 md:p-10 border border-rose-100 shadow-xl shadow-rose-100/20"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-rose-900 flex items-center gap-3">
                                        <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center">
                                            <AlertTriangle className="w-4 h-4 text-rose-600" />
                                        </div>
                                        Danger Zone
                                    </h3>
                                    <p className="text-xs font-bold text-rose-900/60 uppercase tracking-widest pl-11">
                                        Account Self-Destruct Sequence
                                    </p>
                                </div>
                                <button
                                    onClick={handleDeleteAccount}
                                    disabled={isDeleting}
                                    className="px-10 py-4 bg-rose-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] hover:bg-rose-700 transition-all shadow-xl shadow-rose-200 disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    Delete Account
                                </button>
                            </div>
                            <div className="mt-6 p-4 bg-white/50 border border-rose-100 rounded-2xl">
                                <p className="text-[10px] text-rose-800 font-black uppercase tracking-widest leading-relaxed">
                                    Notice: Deletion is permanent. To prevent institutional harassment, your device IP will be locked from creating a new account for 48 hours after deletion.
                                </p>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
            <MobileNav />
        </div>
    );
}
