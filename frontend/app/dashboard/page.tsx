'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    FileText, AlertCircle, Clock, CheckCircle, Plus, Search, Megaphone,
    Shield, User, AlertTriangle, ChevronRight, Copy, ArrowRight, TrendingUp,
    ShieldCheck, Bell, Activity, Target, X, Edit2, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
    getMyComplaints, getProfile, getAnnouncements, getDashboardStats,
    getSettings, updateSettings, Complaint, Announcement, ComplaintSettings, getDailyBriefing
} from '@/lib/api';
import NotificationBell from '@/components/NotificationBell';
import MobileNav from '@/components/MobileNav';

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [settings, setLocalSettings] = useState<ComplaintSettings | null>(null);
    const [tempLimit, setTempLimit] = useState('');
    const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        resolved: 0,
        overdue: 0,
    });

    const handleUpdateSettings = async (updates: Partial<ComplaintSettings>) => {
        if (!settings) return;
        try {
            const updated = await updateSettings(settings.id, updates);
            setLocalSettings(updated);

            if (updates.is_frozen !== undefined) {
                toast.success(updated.is_frozen ? 'System Security Locked' : 'System Defrosted: Submissions Active');
            }
            if (updates.global_max_daily !== undefined) {
                toast.success(`Report Limit Changed: ${updated.global_max_daily}`);
            }
            if (updates.auto_unfreeze_time !== undefined) {
                toast.success(`Reset Time Scheduled: ${formatToAMPM(updated.auto_unfreeze_time)}`);
            }
        } catch (error) {
            toast.error('Failed to update system protocols');
        }
    };

    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [notificationCount, setNotificationCount] = useState(0);
    const [dailyStats, setDailyStats] = useState<any[]>([]);
    const [timeLeft, setTimeLeft] = useState('');
    const [isThawTomorrow, setIsThawTomorrow] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [tempTime, setTempTime] = useState('');
    const [isUpdatingTime, setIsUpdatingTime] = useState(false);
    const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);

    const formatToAMPM = (timeStr: string) => {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':').map(Number);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    };

    const loadDashboard = React.useCallback(async (silent = false) => {
        const token = localStorage.getItem('token');
        if (!token) { router.push('/login'); return; }

        if (!silent) setLoading(true);
        try {
            const [userData, complaintsData, announcementsData, serverSettings] = await Promise.all([
                getProfile(),
                getMyComplaints(),
                getAnnouncements(),
                getSettings()
            ]);

            setUser(userData);
            setComplaints(complaintsData);
            setAnnouncements(announcementsData);
            setLocalSettings(serverSettings);

            if (userData.is_superuser || userData.is_principal || userData.is_staff) {
                const serverStats = await getDashboardStats();
                setStats({
                    total: serverStats.total,
                    pending: serverStats.pending,
                    resolved: serverStats.resolved,
                    overdue: serverStats.overdue
                });
                setDailyStats(serverStats.daily_stats || []);
                setTempLimit(serverSettings.global_max_daily.toString());
            } else {
                setStats({
                    total: complaintsData.length,
                    pending: complaintsData.filter(c => c.status === 'pending' || c.status === 'reviewing').length,
                    resolved: complaintsData.filter(c => c.status === 'resolved').length,
                    overdue: 0
                });
            }

            const activeAnnouncements = announcementsData.filter(a => a.is_active).length;
            setNotificationCount(activeAnnouncements);
        } catch (error: any) {
            if (error.response?.status !== 401) {
                console.error('Failed to sync dashboard session:', error);
            } else {
                router.push('/login');
            }
        } finally {
            if (!silent) setLoading(false);
            setIsSyncing(false);
        }
    }, [router]);

    // Timer logic for system unfreeze
    useEffect(() => {
        const updateTimer = () => {
            const now = new Date();
            const target = new Date();

            if (settings?.auto_unfreeze_time) {
                const [hours, minutes] = settings.auto_unfreeze_time.split(':').map(Number);
                const resetToday = new Date();
                resetToday.setHours(hours, minutes, 0, 0);

                if (now >= resetToday && settings.is_frozen && !isSyncing) {
                    setIsSyncing(true);
                    loadDashboard(true);
                }

                target.setHours(hours, minutes, 0, 0);
                if (now >= target) {
                    target.setDate(target.getDate() + 1);
                    setIsThawTomorrow(true);
                } else {
                    setIsThawTomorrow(false);
                }
            } else {
                target.setHours(24, 0, 0, 0);
                setIsThawTomorrow(true);
            }

            const diff = target.getTime() - now.getTime();
            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft(`${h}h ${m}m ${s}s`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [settings?.auto_unfreeze_time, settings?.is_frozen, isSyncing, loadDashboard]);

    useEffect(() => {
        if (settings?.auto_unfreeze_time) {
            setTempTime(settings.auto_unfreeze_time.substring(0, 5));
        }
    }, [settings?.auto_unfreeze_time]);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    const getStatusBadge = (status: string) => {
        const config = {
            pending: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
            reviewing: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
            resolved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
            escalated: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
        };
        const labelSafe = {
            pending: 'Pending',
            reviewing: 'Reviewing',
            resolved: 'Closed',
            escalated: 'Escalated',
        };
        const style = config[status as keyof typeof config] || config.pending;
        const label = labelSafe[status as keyof typeof labelSafe] || status;

        return (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border backdrop-blur-sm ${style}`}>
                {label}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-4"
                >
                    <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-medium animate-pulse">Loading dashboard...</p>
                </motion.div>
            </div>
        );
    }

    const isInternal = user?.is_superuser || user?.is_principal;

    if (!isInternal && settings?.is_frozen) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
                {/* Subtle Ambient Glows */}
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-100 rounded-full blur-[120px] opacity-50" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-rose-100 rounded-full blur-[120px] opacity-50" />

                <div className="max-w-xl w-full relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white border border-slate-200 rounded-[3.5rem] p-10 md:p-14 text-center shadow-2xl shadow-slate-200/50 overflow-hidden"
                    >
                        <div className="relative mb-12">
                            <motion.div
                                animate={{ y: [0, -8, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="w-24 h-24 bg-rose-50 rounded-[2rem] flex items-center justify-center mx-auto shadow-xl shadow-rose-100 border border-rose-100"
                            >
                                <Lock className="w-10 h-10 text-rose-500" />
                            </motion.div>
                            <div className="mt-8 space-y-3">
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-[0.2em] border border-rose-100">
                                    {new Date().toLocaleDateString('en-GB')} • System Paused
                                </div>
                                <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">System Paused</h1>
                            </div>
                        </div>

                        <div className="space-y-8 mb-12">
                            <p className="text-slate-500 text-sm leading-relaxed font-medium px-4">
                                The Principal is currently reviewing and processing today&apos;s high-volume reports.
                                Submissions are paused to ensure security focus. You can access the dashboard once the timer hits zero.
                            </p>

                            <div className="bg-slate-50 border border-slate-100 p-10 rounded-[2.5rem] relative group hover:border-indigo-100 transition-colors">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-5 flex items-center justify-center gap-2">
                                    <Activity className="w-3 h-3 text-indigo-500 animate-pulse" />
                                    Starting again in
                                </p>
                                <div className="text-7xl font-black text-slate-900 tracking-tighter mb-3 tabular-nums drop-shadow-sm">
                                    {timeLeft}
                                </div>
                                <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-bold">
                                    <Clock className="w-4 h-4" />
                                    Next opening: {formatToAMPM(settings?.auto_unfreeze_time || '00:00')} {isThawTomorrow ? '(Tomorrow)' : '(Today)'}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 max-w-sm mx-auto">
                            <button
                                onClick={() => router.push('/profile')}
                                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95"
                            >
                                View My Profile
                            </button>
                            <button
                                onClick={() => {
                                    localStorage.removeItem('token');
                                    router.push('/login');
                                }}
                                className="w-full py-5 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 hover:border-slate-300 transition-all shadow-lg shadow-slate-100 active:scale-95"
                            >
                                Logout
                            </button>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                                Safe and Private
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans pb-36 md:pb-8 selection:bg-indigo-100 selection:text-indigo-900">
            {/* Ambient Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px]" />
                <div className="absolute top-[20%] -left-[10%] w-[30%] h-[30%] bg-purple-500/5 rounded-full blur-[100px]" />
            </div>

            <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200/50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2"
                    >
                        <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                            <ShieldCheck className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
                            SpeakSafe
                        </span>
                    </motion.div>

                    <div className="flex-1 max-w-md mx-8 hidden md:block">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                            <input
                                type="text"
                                placeholder="Quick search reports..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-100/50 border border-slate-200/50 rounded-2xl py-2.5 pl-11 pr-4 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 focus:bg-white outline-none transition-all font-medium"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <NotificationBell />
                        <div className="h-6 w-[1px] bg-slate-200 mx-1" />
                        <Link href="/profile" className="flex items-center gap-3 group">
                            <div className="w-10 h-10 border border-slate-200 rounded-2xl flex items-center justify-center bg-white group-hover:bg-indigo-50 group-hover:border-indigo-200 transition-all shadow-sm group-hover:shadow-md overflow-hidden p-0.5">
                                <div className="w-full h-full rounded-[0.8rem] bg-slate-50 flex items-center justify-center text-slate-500 group-hover:text-indigo-600">
                                    <User className="w-5 h-5" />
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="relative z-10 p-4 md:p-6 max-w-7xl mx-auto space-y-6">
                {/* Hero Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`relative overflow-hidden rounded-[2rem] border ${isInternal ? 'bg-slate-900 border-slate-800 shadow-2xl shadow-slate-900/10' : 'bg-white border-slate-100 shadow-sm'}`}
                >
                    {isInternal && (
                        <div className="absolute inset-0 pointer-events-none opacity-50">
                            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-600/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/4" />
                        </div>
                    )}

                    <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="space-y-3 text-center md:text-left">
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${isInternal ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                                <Activity className="w-3 h-3" />
                                Live Status
                            </div>
                            <div>
                                <h1 className={`text-3xl md:text-4xl font-black tracking-tight ${isInternal ? 'text-white' : 'text-slate-900'}`}>
                                    Welcome, {user?.is_principal ? 'Principal' : (user?.full_name?.split(' ')[0] || 'User')}
                                </h1>
                                <p className={`mt-2 text-base font-medium max-w-xl ${isInternal ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {isInternal
                                        ? 'Your dashboard is ready. Manage reports and send updates here.'
                                        : 'A safe place for your voice. All your reports are private and secure.'}
                                </p>
                            </div>
                        </div>

                        {isInternal ? (
                            <button
                                onClick={() => router.push('/dashboard/announcements/new')}
                                className="group relative bg-white text-slate-900 font-bold py-3.5 px-8 rounded-2xl flex items-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-white/10"
                            >
                                <Megaphone className="w-5 h-5 text-indigo-600 transition-transform group-hover:rotate-12" />
                                Broadcast Announcement
                                <div className="absolute inset-0 rounded-2xl ring-2 ring-white/20 ring-offset-2 ring-offset-slate-900 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        ) : (
                            <button
                                onClick={() => router.push('/complaints/new')}
                                disabled={settings?.is_frozen}
                                className={`group font-bold py-3.5 px-8 rounded-2xl flex items-center gap-3 transition-all ${settings?.is_frozen ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 active:scale-95 shadow-2xl shadow-indigo-500/20'}`}
                            >
                                {settings?.is_frozen ? (
                                    <Lock className="w-5 h-5 text-slate-300" />
                                ) : (
                                    <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
                                )}
                                {settings?.is_frozen ? 'System Locked' : 'File New Report'}
                            </button>
                        )}
                    </div>
                </motion.div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Total Reports */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0 }}
                        className="group bg-white p-5 rounded-3xl border border-slate-100 hover:border-indigo-200 transition-all hover:shadow-xl hover:shadow-slate-200/40 relative overflow-hidden"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <FileText className="w-5 h-5" />
                            </div>

                        </div>
                        <div className="space-y-1">
                            <div className="text-2xl font-black text-slate-900 tracking-tight">{stats.total || 0}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Reports</div>
                        </div>
                    </motion.div>

                    {/* Active */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="group bg-white p-5 rounded-3xl border border-slate-100 hover:border-amber-200 transition-all hover:shadow-xl hover:shadow-slate-200/40 relative overflow-hidden"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                                <Clock className="w-5 h-5" />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-slate-50 text-slate-400">
                                In Progress
                            </span>
                        </div>
                        <div className="space-y-1">
                            <div className="text-2xl font-black text-slate-900 tracking-tight">{stats.pending || 0}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fixing</div>
                        </div>
                    </motion.div>

                    {/* Closed */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="group bg-white p-5 rounded-3xl border border-slate-100 hover:border-emerald-200 transition-all hover:shadow-xl hover:shadow-slate-200/40 relative overflow-hidden"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <CheckCircle className="w-5 h-5" />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-slate-50 text-slate-400">
                                Completed
                            </span>
                        </div>
                        <div className="space-y-1">
                            <div className="text-2xl font-black text-slate-900 tracking-tight">{stats.resolved || 0}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fixed Reports</div>
                        </div>
                    </motion.div>
                </div>


                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Recent Activity */}
                    <div className="lg:col-span-8 space-y-5">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-900">
                                    <Activity className="w-4 h-4" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-slate-900 tracking-tight">Recent Activity</h2>
                                    <p className="text-[10px] font-medium text-slate-400">Latest report updates</p>
                                </div>
                            </div>
                            <Link
                                href="/dashboard/complaints"
                                className="group text-xs font-bold text-indigo-600 flex items-center gap-1 hover:text-indigo-700 transition-colors"
                            >
                                View full history
                                <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                            </Link>
                        </div>

                        <div className="space-y-3">
                            <AnimatePresence mode="popLayout">
                                {(() => {
                                    const filtered = complaints.filter(c =>
                                        c.tracking_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        c.category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        c.status_display.toLowerCase().includes(searchQuery.toLowerCase())
                                    );

                                    if (filtered.length === 0) {
                                        return (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="bg-white/50 backdrop-blur-sm py-12 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center p-8"
                                            >
                                                <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                                    <Search className="w-6 h-6 text-slate-300" />
                                                </div>
                                                <h3 className="text-base font-bold text-slate-900">No matching reports</h3>
                                                <p className="text-slate-400 text-xs mt-1 max-w-xs">We couldn't find any reports matching your search.</p>
                                            </motion.div>
                                        );
                                    }

                                    return filtered.slice(0, 4).map((c, i) => {
                                        const isEscalated = c.status === 'escalated' || (c.severity as any) === 'critical' || (c as any).escalation_level > 0;
                                        return (
                                            <motion.div
                                                key={c.complaint_id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                                onClick={() => router.push(`/dashboard/complaints/${c.complaint_id}`)}
                                                className={`group relative p-4 rounded-3xl border transition-all cursor-pointer flex items-center justify-between shadow-sm hover:shadow-lg ${isEscalated
                                                    ? 'bg-rose-50 border-rose-500 shadow-rose-100 hover:shadow-rose-200 hover:bg-rose-100'
                                                    : 'bg-white border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 hover:shadow-indigo-500/5'
                                                    }`}
                                            >
                                                {isEscalated && (
                                                    <div className="absolute -top-2 -right-2 bg-rose-600 text-white p-1.5 rounded-full shadow-lg animate-pulse">
                                                        <AlertTriangle className="w-3 h-3" />
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:rotate-3 ${isEscalated ? 'bg-rose-200 text-rose-600' : 'bg-slate-50 text-slate-400 group-hover:bg-white group-hover:text-indigo-600'
                                                        }`}>
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[9px] font-mono font-black transition-colors uppercase tracking-widest ${isEscalated ? 'text-rose-600' : 'text-slate-400 group-hover:text-indigo-400'
                                                                }`}>{c.tracking_code}</span>
                                                            {getStatusBadge(c.status)}
                                                        </div>
                                                        <h3 className={`font-extrabold text-sm tracking-tight ${isEscalated ? 'text-rose-900' : 'text-slate-800'
                                                            }`}>{c.category.name}</h3>
                                                        <p className={`text-[9px] font-bold uppercase tracking-tighter ${isEscalated ? 'text-rose-400' : 'text-slate-400'
                                                            }`}>
                                                            {new Date(c.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                            <span className="mx-2">•</span>
                                                            Ref: {c.complaint_id.slice(0, 8)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all group-hover:scale-110 ${isEscalated
                                                        ? 'border-rose-200 text-rose-400 group-hover:bg-rose-600 group-hover:text-white group-hover:border-rose-600'
                                                        : 'border-slate-100 text-slate-300 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600'
                                                        }`}>
                                                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    });
                                })()}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Right Column: Components */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Critical Attention (Principal Only) */}
                        {isInternal && (
                            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden mb-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shadow-sm shadow-rose-100">
                                        <AlertTriangle className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <h2 className="text-lg font-black text-slate-900 tracking-tight">Attention Required</h2>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Escalated & Overdue</p>
                                            </div>
                                            <Link href="/dashboard/attention" className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors whitespace-nowrap">
                                                View All <ChevronRight className="w-3.5 h-3.5" />
                                            </Link>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                const toastId = toast.loading('Generating Executive Briefing...');
                                                try {
                                                    const briefing = await getDailyBriefing();
                                                    toast.dismiss(toastId);
                                                    // Show briefing in a custom toast or alert for now
                                                    toast.custom((t) => (
                                                        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
                                                            <div className="flex-1 w-0 p-6">
                                                                <div className="flex items-start">
                                                                    <div className="flex-shrink-0 pt-0.5">
                                                                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-xl">🤖</div>
                                                                    </div>
                                                                    <div className="ml-4 flex-1">
                                                                        <p className="text-sm font-black text-indigo-900 uppercase tracking-wide">Daily Executive Briefing</p>
                                                                        <p className="mt-1 text-xs text-slate-500 font-bold">{briefing.date}</p>
                                                                        <div className="mt-3 space-y-2">
                                                                            <p className="text-sm text-slate-700 leading-relaxed font-medium">{briefing.ai_summary}</p>
                                                                            <div className="flex items-center gap-2 mt-4">
                                                                                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-md uppercase">Sentiment: {briefing.sentiment}</span>
                                                                                <span className="bg-rose-100 text-rose-600 text-[10px] font-bold px-2 py-1 rounded-md uppercase">Critical: {briefing.critical_reports}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex border-l border-gray-200">
                                                                <button
                                                                    onClick={() => toast.dismiss(t.id)}
                                                                    className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none"
                                                                >
                                                                    Close
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ), { duration: 8000 });
                                                } catch (e) {
                                                    toast.error('Failed to generate briefing');
                                                }
                                            }}
                                            className="absolute top-6 right-6 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors shadow-lg shadow-indigo-200"
                                        >
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {(() => {
                                        // Filter for escalated or overdue complaints
                                        const criticalItems = complaints.filter(c =>
                                            c.status === 'escalated' ||
                                            (c.days_until_deadline !== undefined && c.days_until_deadline < 0) ||
                                            c.severity_display?.toLowerCase() === 'critical'
                                        );

                                        if (criticalItems.length === 0) {
                                            return (
                                                <div className="text-center py-10 opacity-60 border border-slate-100 border-dashed rounded-2xl bg-slate-50/50">
                                                    <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                                        <CheckCircle className="w-5 h-5" />
                                                    </div>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">All caught up!</p>
                                                    <p className="text-[9px] text-slate-300 font-medium mt-1">No pending critical issues</p>
                                                </div>
                                            );
                                        }

                                        return criticalItems.slice(0, 4).map((c, i) => (
                                            <motion.div
                                                key={c.complaint_id}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                onClick={() => router.push(`/dashboard/complaints/${c.complaint_id}`)}
                                                className="group flex items-center justify-between p-4 rounded-2xl bg-white border border-rose-100 hover:border-rose-300 hover:shadow-lg hover:shadow-rose-100/50 transition-all cursor-pointer relative overflow-hidden"
                                            >
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <div className="flex items-center gap-3 pl-2">
                                                    <div className={`shrink-0 w-2 h-2 rounded-full ${c.status === 'escalated' ? 'bg-rose-600 animate-pulse' : 'bg-amber-500'}`} />
                                                    <div className="overflow-hidden">
                                                        <h3 className="font-bold text-xs text-slate-900 tracking-tight line-clamp-1">{c.category.name}</h3>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-[9px] font-mono font-black text-slate-400 uppercase">#{c.tracking_code}</span>
                                                            <span className="text-[9px] font-bold text-rose-500 flex items-center gap-1">
                                                                {c.status === 'escalated'
                                                                    ? '• ESCALATED'
                                                                    : `• OVERDUE ${Math.abs(c.days_until_deadline)} DAY(S)`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-rose-500 transition-colors shrink-0" />
                                            </motion.div>
                                        ));
                                    })()}
                                </div>
                            </div>
                        )}


                        {/* System Control for Principal */}
                        {/* System Control for Principal */}
                        {isInternal ? (
                            settings && (
                                <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm space-y-8 relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-slate-900 opacity-20 group-hover:opacity-100 transition-opacity" />

                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${settings.is_frozen ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                            <AlertCircle className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-900 tracking-tight">System Controls</h3>
                                            <div className="flex items-center gap-2">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    Status: <span className={settings.is_frozen ? 'text-rose-500' : 'text-emerald-500'}>{settings.is_frozen ? 'LOCKED' : 'ACTIVE'}</span>
                                                </p>
                                                {settings.is_frozen && (
                                                    <div className="flex flex-col items-start gap-1">
                                                        <span className="text-[9px] font-mono font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 animate-pulse">
                                                            RESET: {timeLeft}
                                                        </span>
                                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                                                            Complaints again will be accepted by {formatToAMPM(settings.auto_unfreeze_time)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 space-y-5">
                                            <div className="flex items-center justify-between group/toggle">
                                                <div className="space-y-1">
                                                    <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">Allow new reports</span>
                                                    <p className="text-[10px] text-slate-400 font-bold leading-relaxed flex items-center gap-1.5">
                                                        <span className={`w-1.5 h-1.5 rounded-full ${settings.is_frozen ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                                                        {settings.is_frozen
                                                            ? "System is currently frozen. No new reports can be filed."
                                                            : "System is open. Students can submit reports normally."}
                                                    </p>
                                                </div>
                                                <div className="relative inline-block w-11 mr-2 align-middle select-none transition-transform group-hover/toggle:scale-105">
                                                    <input
                                                        type="checkbox"
                                                        id="system-freeze-toggle"
                                                        checked={settings.is_frozen}
                                                        onChange={(e) => handleUpdateSettings({ is_frozen: e.target.checked })}
                                                        className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-2 appearance-none cursor-pointer transition-all duration-300 ease-in-out transform checked:translate-x-5 checked:border-indigo-600 border-slate-300"
                                                        style={{ top: '2px', left: '2px' }}
                                                    />
                                                    <label htmlFor="system-freeze-toggle" className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-300 ${settings.is_frozen ? 'bg-indigo-600' : 'bg-slate-200'}`}></label>
                                                </div>
                                            </div>

                                            <div className="pt-6 border-t border-slate-100">
                                                <div className="flex items-center justify-between">
                                                    <div className="space-y-1">
                                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Scheduled Reset</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${settings.is_frozen ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300'}`} />
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                                                                Current: <span className="text-indigo-600 font-extrabold">{formatToAMPM(settings.auto_unfreeze_time)}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2">
                                                        <AnimatePresence mode="wait">
                                                            {!isTimePickerOpen ? (
                                                                <motion.button
                                                                    key="edit-btn"
                                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                                    animate={{ opacity: 1, scale: 1 }}
                                                                    exit={{ opacity: 0, scale: 0.9 }}
                                                                    onClick={() => setIsTimePickerOpen(true)}
                                                                    className="px-4 py-2 bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all active:scale-95 flex items-center gap-2"
                                                                >
                                                                    <Clock className="w-3.5 h-3.5" />
                                                                    Set Time
                                                                </motion.button>
                                                            ) : (
                                                                <motion.div
                                                                    key="picker-controls"
                                                                    initial={{ opacity: 0, x: 20 }}
                                                                    animate={{ opacity: 1, x: 0 }}
                                                                    exit={{ opacity: 0, x: 20 }}
                                                                    className="flex items-center gap-2"
                                                                >
                                                                    <input
                                                                        type="time"
                                                                        value={tempTime}
                                                                        onChange={(e) => setTempTime(e.target.value)}
                                                                        className="bg-white border-2 border-indigo-100 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 transition-all cursor-pointer shadow-sm w-28"
                                                                    />
                                                                    <button
                                                                        onClick={() => {
                                                                            setTempTime(settings.auto_unfreeze_time?.substring(0, 5) || "00:00");
                                                                            setIsTimePickerOpen(false);
                                                                        }}
                                                                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                                        title="Cancel"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                    {tempTime !== settings.auto_unfreeze_time?.substring(0, 5) && (
                                                                        <button
                                                                            onClick={async () => {
                                                                                setIsUpdatingTime(true);
                                                                                await handleUpdateSettings({ auto_unfreeze_time: tempTime });
                                                                                setIsUpdatingTime(false);
                                                                                setIsTimePickerOpen(false);
                                                                            }}
                                                                            disabled={isUpdatingTime}
                                                                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                                                                            title="Save Changes"
                                                                        >
                                                                            <CheckCircle className="w-4 h-4" />
                                                                        </button>
                                                                    )}
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Automatic Freeze</span>
                                                <div className="relative inline-block w-12 mr-2 align-middle select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={settings.enable_auto_freeze}
                                                        onChange={(e) => handleUpdateSettings({ enable_auto_freeze: e.target.checked })}
                                                        className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-300 ease-in-out transform checked:translate-x-6 checked:border-indigo-500 border-slate-300"
                                                        style={{ top: '2px', left: '2px' }}
                                                    />
                                                    <div className={`block overflow-hidden h-7 rounded-full cursor-pointer transition-colors duration-300 ${settings.enable_auto_freeze ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                                                {settings.enable_auto_freeze
                                                    ? "System will automatically freeze when daily limit is reached."
                                                    : "Automation disabled. System will remain open regardless of limit."}
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Daily Intake Limit</label>
                                            <div
                                                onClick={() => {
                                                    setTempLimit(settings.global_max_daily.toString());
                                                    setIsLimitModalOpen(true);
                                                }}
                                                className="relative group cursor-pointer"
                                            >
                                                <div className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-black text-slate-900 group-hover:border-slate-300 transition-all flex justify-between items-center">
                                                    <span>{settings.global_max_daily}</span>
                                                    <div className="bg-white p-1.5 rounded-lg text-slate-300 group-hover:text-indigo-600 transition-colors">
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </div>
                                                </div>
                                                <div className="absolute right-14 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase tracking-wider pointer-events-none">Reports</div>
                                            </div>
                                            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest pl-2">
                                                {2 - (settings.daily_limit_changes || 0)} edits remaining today
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )
                        ) : (
                            /* Support / Quick Info (Students Only) */
                            <div className="space-y-6">
                                {settings?.is_frozen && (
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="bg-rose-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-rose-200 relative overflow-hidden group"
                                    >
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                                        <div className="flex items-center gap-3 relative z-10">
                                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                                <Lock className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="font-black tracking-tight">System Paused</h3>
                                                <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Paused for today</p>
                                            </div>
                                        </div>
                                        <div className="mt-6 space-y-4 relative z-10">
                                            <p className="text-xs font-bold leading-relaxed text-white/90">
                                                The Principal is currently reviewing and processing today's high-volume reports.
                                                Submissions are paused to ensure security focus. You can post your complaint once the timer hits zero.
                                            </p>
                                            <div className="bg-white/10 border border-white/20 p-5 rounded-3xl group-hover:bg-white/20 transition-colors">
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50 mb-2">Auto-Unfreeze Sequence Active</p>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <Clock className="w-5 h-5 text-white/50" />
                                                        <span className="text-xl font-black">{timeLeft}</span>
                                                    </div>
                                                    <span className="text-[10px] font-bold bg-white/20 px-3 py-1 rounded-full uppercase tracking-widest">Complaints again will be accepted by {formatToAMPM(settings.auto_unfreeze_time)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}


                            </div>
                        )}
                    </div>
                </div >

                {/* Trending Alert (Mockup) */}
                <div className="mb-8 p-6 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 rounded-3xl flex items-center justify-between shadow-sm relative overflow-hidden group">
                    {/* Decorative background */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-200/20 rounded-full blur-[50px] pointer-events-none group-hover:bg-orange-300/20 transition-all duration-700" />

                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center animate-[bounce_2s_infinite] shadow-lg shadow-orange-100">
                            <span className="text-xl">🔥</span>
                        </div>
                        <div>
                            <h4 className="font-black text-orange-900 text-sm uppercase tracking-widest flex items-center gap-2">
                                Trending Alert
                                <span className="bg-orange-200 text-orange-800 text-[8px] px-2 py-0.5 rounded-full">Live</span>
                            </h4>
                            <p className="text-xs text-orange-800/80 font-bold mt-1">High volume of reports detected in "Mess" category today.</p>
                        </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-orange-400 group-hover:translate-x-1 transition-transform" />
                </div>

                {/* Limit Edit Modal */}
                <AnimatePresence>
                    {
                        isLimitModalOpen && settings && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-10">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setIsLimitModalOpen(false)}
                                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                    className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white p-8 space-y-6"
                                >
                                    <div className="text-center space-y-2">
                                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Update Limit</h3>
                                        <p className="text-xs font-medium text-slate-400">Set the maximum daily complaints allowed.</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="relative">
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                autoFocus
                                                value={tempLimit}
                                                onChange={(e) => setTempLimit(e.target.value.replace(/\D/g, ''))}
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 text-2xl font-black text-center focus:border-indigo-600 focus:bg-white transition-all outline-none"
                                            />
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mt-3">Reports / 24hrs</div>
                                        </div>

                                        <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-start gap-3">
                                            <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                                            <p className="text-[10px] text-indigo-700 font-medium leading-relaxed">
                                                You have <span className="font-black">{2 - (settings.daily_limit_changes || 0)} changes</span> remaining for today. This action cannot be undone.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setIsLimitModalOpen(false)}
                                            className="py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => {
                                                handleUpdateSettings({ global_max_daily: parseInt(tempLimit) || 0 });
                                                setIsLimitModalOpen(false);
                                            }}
                                            className="py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-200"
                                        >
                                            Save Limit
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        )
                    }
                </AnimatePresence >

                <MobileNav />

            </main >
        </div >
    );
}