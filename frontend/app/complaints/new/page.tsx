'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    Shield, ArrowLeft, Send, AlertTriangle,
    CheckCircle, Lock, Loader2, HelpCircle, ChevronLeft, Image as ImageIcon, X, Search, Clock, Activity
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { getCategories, submitComplaint, createAnonymousSession, getProfile, getSettings, ComplaintCategory, suggestCategory, checkSimilarity } from '@/lib/api';
import toast from 'react-hot-toast';
import MobileNav from '@/components/MobileNav';

export default function NewComplaintPage() {
    const router = useRouter();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [categories, setCategories] = useState<ComplaintCategory[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [content, setContent] = useState('');
    const [severity, setSeverity] = useState(2);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [customCategory, setCustomCategory] = useState('');
    const [sessionHash, setSessionHash] = useState('');
    const [trackingCode, setTrackingCode] = useState('');
    const [step, setStep] = useState(1); // 1: Form, 2: Success
    const [isQuotaReached, setIsQuotaReached] = useState(false);
    const [imageAttachment, setImageAttachment] = useState<string | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const [remainingCooldown, setRemainingCooldown] = useState(0);
    const [quotaReason, setQuotaReason] = useState<'cooldown' | 'daily' | 'weekly' | 'frozen' | null>(null);
    const [timeLeft, setTimeLeft] = useState('');
    const [isThawTomorrow, setIsThawTomorrow] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [settings, setSettings] = useState<any>(null);
    const [suggestedCategory, setSuggestedCategory] = useState<any>(null);
    const [isDuplicate, setIsDuplicate] = useState(false);
    const [duplicateCount, setDuplicateCount] = useState(0);

    // AI Suggestion Logic
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (content.length > 8 && !selectedCategory) {
                try {
                    const res = await suggestCategory(content);

                    // Duplicate Check
                    const dupRes = await checkSimilarity(content);
                    if (dupRes.similar_found) {
                        setIsDuplicate(true);
                        setDuplicateCount(dupRes.count);
                    } else {
                        setIsDuplicate(false);
                    }

                    if (res.category) {
                        setSuggestedCategory(res.category);
                    } else {
                        setSuggestedCategory(null);
                    }
                } catch (e) { console.error(e); }
            }
        }, 800);
        return () => clearTimeout(timer);
    }, [content, selectedCategory]);

    const formatToAMPM = (timeStr: string) => {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':').map(Number);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    };

    const init = React.useCallback(async (silent = false) => {
        try {
            // Login Required - No Guest Users Allowed
            const profile = await getProfile().catch(() => null);
            if (!profile) {
                if (!silent) toast.error('Authentication required to submit a report.');
                router.push('/login?redirect=/complaints/new');
                return;
            }

            // Check if user is an admin - Admins shouldn't file reports
            if (profile.is_superuser || profile.is_principal) {
                if (!silent) toast.error('Administrators cannot file security reports.');
                router.push('/dashboard/announcements/new');
                return;
            }

            const [cats, session, serverSettings] = await Promise.all([
                getCategories(),
                createAnonymousSession(),
                getSettings()
            ]);
            setSettings(serverSettings);
            const sortedCats = cats.sort((a, b) => {
                if (a.slug === 'other') return 1;
                if (b.slug === 'other') return -1;
                return a.name.localeCompare(b.name);
            });
            setCategories(sortedCats);
            setSessionHash(session.session_hash);

            if (session.is_quota_reached || serverSettings.is_frozen) {
                setIsQuotaReached(true);
                setQuotaReason(serverSettings.is_frozen ? 'frozen' : session.quota_reason);
                if (session.remaining_cooldown > 0) {
                    setRemainingCooldown(session.remaining_cooldown);
                }
            } else {
                setIsQuotaReached(false);
                setQuotaReason(null);
            }
        } catch (error) {
            console.error('Initialization error:', error);
        } finally {
            setIsSyncing(false);
        }
    }, [router]);

    // Dynamic Timer Logic
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
                    init(true);
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

            setTimeLeft(`${h}h ${m}s`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [settings?.auto_unfreeze_time, settings?.is_frozen, isSyncing, init]);

    const quickTags = [
        { name: 'WiFi', slug: 'wifi', icon: '📶' },
        { name: 'Mess', slug: 'mess', icon: '🍽️' },
        { name: 'Water', slug: 'water', icon: '🚰' },
        { name: 'Electricity', slug: 'electric-cuts', icon: '🔌' },
        { name: 'Ragging', slug: 'ragging', icon: '😡' }
    ];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsCategoryOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        init();
    }, [init]);

    // Cooldown Ticker
    useEffect(() => {
        if (remainingCooldown <= 0) return;
        const timer = setInterval(() => {
            setRemainingCooldown(prev => {
                if (prev <= 1) {
                    setIsQuotaReached(false);
                    setQuotaReason(null);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [remainingCooldown]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!content || content.length < 50) {
            toast.error('Please provide more details (minimum 50 characters)');
            return;
        }

        if (!selectedCategory) {
            toast.error('Please select a category');
            return;
        }

        if (selectedCategory === 'other' && !customCategory.trim()) {
            toast.error('Please specify the category name');
            return;
        }

        setIsSubmitting(true);
        try {
            const finalContent = selectedCategory === 'other' && customCategory
                ? `[CATEGORY: ${customCategory}]\n\n${content}`
                : content;

            const res = await submitComplaint({
                content: finalContent,
                category_slug: selectedCategory,
                severity,
                session_hash: sessionHash,
                image_attachment: imageAttachment || undefined
            });

            setTrackingCode(res.tracking_code);
            setStep(2);
            toast.success('Complaint submitted successfully!');
        } catch (error: any) {
            const data = error.response?.data;
            const status = error.response?.status;

            if (status === 503) {
                setIsQuotaReached(true);
                setQuotaReason('frozen');
                toast.error(data?.error || 'System is currently frozen due to high volume.');
                return;
            }

            if (status === 429) {
                setIsQuotaReached(true);
                setQuotaReason('cooldown');
                setRemainingCooldown(600);
                toast.error(data?.error || 'Security cooldown active.');
                return;
            }

            const message = data?.error || 'Failed to submit complaint. Please try again.';
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (step === 1 && quotaReason === 'frozen') {
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
                                    Admin • {new Date().toLocaleDateString('en-GB')} • System Frozen
                                </div>
                                <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Vault Lockdown</h1>
                            </div>
                        </div>

                        <div className="space-y-8 mb-12">
                            <p className="text-slate-500 text-sm leading-relaxed font-medium px-4">
                                The Principal is currently reviewing and processing today&apos;s high-volume reports.
                                Submissions are paused to ensure security focus. You can post your complaint once the timer hits zero.
                            </p>

                            <div className="bg-slate-50 border border-slate-100 p-10 rounded-[2.5rem] relative group hover:border-indigo-100 transition-colors">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-5 flex items-center justify-center gap-2">
                                    <Activity className="w-3 h-3 text-indigo-500 animate-pulse" />
                                    Auto-Unfreeze Sequence Active
                                </p>
                                <div className="text-7xl font-black text-slate-900 tracking-tighter mb-3 tabular-nums drop-shadow-sm">
                                    {timeLeft}
                                </div>
                                <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-bold">
                                    <Clock className="w-4 h-4" />
                                    System Thaw (Locked)
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 max-w-sm mx-auto">
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95"
                            >
                                Return to Command Center
                            </button>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                                Secure Transmission • AES-256 Verified
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>
        );
    }

    if (step === 2) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-xl shadow-indigo-100/50 text-center">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 mb-4">Success!</h1>
                    <p className="text-slate-500 mb-8 leading-relaxed">
                        Your complaint has been submitted anonymously. Please save your tracking code to monitor updates.
                    </p>

                    <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100 ring-4 ring-white">
                        <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] mb-2 font-bold">Your Tracking Code</p>
                        <p className="text-4xl font-mono font-black text-indigo-600 select-all">{trackingCode}</p>
                    </div>

                    <div className="flex flex-col gap-4">
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                        >
                            Return to Dashboard
                        </button>
                        <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
                            <Lock className="w-3 h-3" />
                            This code is only shown once for security.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-6 pb-20">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-12">
                    <Link href="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors group">
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-semibold">Dashboard</span>
                    </Link>
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-black text-xl tracking-tighter text-slate-800 uppercase">SpeakSafe</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Main Form */}
                    <div className="lg:col-span-2 space-y-8 bg-white p-8 sm:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <h1 className="text-4xl font-black text-slate-900 tracking-tight">New Complaint</h1>
                                <div className="bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Secure & Anonymous</span>
                                </div>
                            </div>

                            {/* Global Freeze Warning */}
                            {quotaReason === 'frozen' && (
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="bg-rose-50 border-l-4 border-rose-500 p-6 mb-8 rounded-r-3xl shadow-lg shadow-rose-100/50"
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <AlertTriangle className="w-6 h-6 text-rose-600" />
                                        <h4 className="text-sm font-black text-rose-900 uppercase tracking-widest">System Area Locked</h4>
                                    </div>
                                    <p className="text-xs text-rose-800 font-bold leading-relaxed">
                                        The Principal is currently processing today&apos;s high investigative volume.
                                        This area will <span className="underline text-rose-900 font-black">automatically unlock in {timeLeft}</span> (at {formatToAMPM(settings?.auto_unfreeze_time)} {isThawTomorrow ? 'Tomorrow' : 'Today'}).
                                    </p>
                                </motion.div>
                            )}

                            <p className="text-slate-500 leading-relaxed">
                                Submit your concerns anonymously. Your data is encrypted and your identity is never logged.
                            </p>
                        </section>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            {isQuotaReached && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="bg-rose-50 border-2 border-rose-100 rounded-2xl p-6 flex items-start gap-4"
                                >
                                    <AlertTriangle className="w-6 h-6 text-rose-500 flex-shrink-0 mt-1" />
                                    <div>
                                        <h3 className="font-black text-rose-900 text-lg">
                                            {quotaReason === 'cooldown' ? 'Security Cooldown' :
                                                quotaReason === 'weekly' ? 'Weekly Limit Reached' :
                                                    'Daily Limit Reached'}
                                        </h3>
                                        <p className="text-rose-700 text-sm leading-relaxed">
                                            {quotaReason === 'cooldown' ? (
                                                <>
                                                    Please wait <span className="font-bold text-rose-800">{Math.floor(remainingCooldown / 60)}:{(remainingCooldown % 60).toString().padStart(2, '0')}</span> before submitting another report.
                                                </>
                                            ) : quotaReason === 'weekly' ? (
                                                <>
                                                    You have reached your limit of <span className="font-bold text-rose-800">5 reports per week</span>. Please wait for the current week window to pass.
                                                </>
                                            ) : (
                                                <>
                                                    You have reached your limit of <span className="font-bold text-rose-800">2 reports per day</span>. Please wait for 24 hours.
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </motion.div>
                            )}


                            {/* AI Suggestion */}
                            <AnimatePresence>
                                {suggestedCategory && !selectedCategory && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="mb-6 bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex items-center justify-between shadow-sm cursor-pointer hover:bg-indigo-100 transition-colors"
                                        onClick={() => {
                                            setSelectedCategory(suggestedCategory.slug);
                                            setSearchTerm(suggestedCategory.name);
                                            setSuggestedCategory(null);
                                            toast.success('Category applied!');
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm">
                                                {suggestedCategory.icon}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">AI Suggestion</p>
                                                    {suggestedCategory.sentiment === 'urgent' && (
                                                        <span className="bg-rose-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full animate-pulse">
                                                            Urgent
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className="font-bold text-indigo-900 text-sm">Is this regarding {suggestedCategory.name}?</h4>
                                            </div>
                                        </div>
                                        <div className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                            Apply
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Category Selection */}
                            <div className="space-y-4">
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em]">
                                    Category
                                </label>

                                <div className="relative" ref={dropdownRef}>
                                    {/* Search Bar */}
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                            <Search className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Search issue category... (e.g. WiFi, Mess, Water)"
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-50/50 transition-all font-bold text-slate-700"
                                            value={searchTerm}
                                            onChange={(e) => {
                                                setSearchTerm(e.target.value);
                                                setIsCategoryOpen(true);
                                            }}
                                            onFocus={() => setIsCategoryOpen(true)}
                                            disabled={isQuotaReached}
                                        />
                                        {searchTerm && (
                                            <button
                                                type="button"
                                                onClick={() => setSearchTerm('')}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Dropdown Results */}
                                    <AnimatePresence>
                                        {isCategoryOpen && !isQuotaReached && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                                className="absolute z-50 left-0 right-0 mt-2 bg-white border border-slate-200 rounded-3xl shadow-2xl shadow-indigo-200/50 overflow-hidden max-h-[350px] flex flex-col"
                                            >
                                                <div className="p-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Searching {categories.length} Categories</span>
                                                    <button onClick={() => setIsCategoryOpen(false)} className="p-1 hover:bg-white rounded-lg transition-colors">
                                                        <ChevronLeft className="w-4 h-4 text-slate-400 rotate-90" />
                                                    </button>
                                                </div>
                                                <div className="overflow-y-auto p-2 space-y-1 thin-scrollbar">
                                                    {categories
                                                        .filter(cat =>
                                                            cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                            cat.slug.includes(searchTerm.toLowerCase())
                                                        )
                                                        .map((cat, idx) => (
                                                            <motion.button
                                                                key={cat.slug}
                                                                initial={{ opacity: 0, x: -10 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedCategory(cat.slug);
                                                                    setSearchTerm(cat.name);
                                                                    setIsCategoryOpen(false);
                                                                }}
                                                                className={`w-full group flex items-center gap-4 p-4 rounded-2xl transition-all text-left ${selectedCategory === cat.slug
                                                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                                                    : 'hover:bg-indigo-50/50 text-slate-700'
                                                                    }`}
                                                            >
                                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-colors ${selectedCategory === cat.slug ? 'bg-white/20' : 'bg-slate-100 group-hover:bg-white shadow-sm'
                                                                    }`}>
                                                                    {cat.icon || '❓'}
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-sm tracking-tight">{cat.name}</span>
                                                                    <span className={`text-[10px] ${selectedCategory === cat.slug ? 'text-white/60' : 'text-slate-400'}`}>Official Category</span>
                                                                </div>
                                                                {selectedCategory === cat.slug && (
                                                                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center ml-auto">
                                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                                    </div>
                                                                )}
                                                            </motion.button>
                                                        ))}
                                                    {categories.filter(cat => cat.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                                                        <div className="p-12 text-center">
                                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                                <HelpCircle className="w-8 h-8 text-slate-200" />
                                                            </div>
                                                            <p className="text-slate-400 text-sm font-bold">No exact matches found</p>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedCategory('other');
                                                                    setIsCategoryOpen(false);
                                                                }}
                                                                className="mt-3 bg-indigo-50 text-indigo-600 py-2 px-6 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all"
                                                            >
                                                                Use General "Other"
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Quick Tags */}
                                {!selectedCategory && !isCategoryOpen && (
                                    <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-left-2 transition-all duration-500">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2 self-center">Frequent:</span>
                                        {quickTags.map((tag) => (
                                            <button
                                                key={tag.slug}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedCategory(tag.slug);
                                                    setSearchTerm(tag.name);
                                                }}
                                                className="bg-white border border-slate-200 px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:border-indigo-400 hover:bg-indigo-50 transition-all shadow-sm"
                                            >
                                                <span className="text-sm">{tag.icon}</span>
                                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">{tag.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Selected Category Preview */}
                                {selectedCategory && (
                                    <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2">
                                        {categories.filter(c => c.slug === selectedCategory).map(cat => (
                                            <div key={cat.slug} className="bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-full flex items-center gap-2">
                                                <span className="text-lg">{cat.icon}</span>
                                                <span className="text-xs font-black text-indigo-700 uppercase">{cat.name}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedCategory('');
                                                        setSearchTerm('');
                                                    }}
                                                    className="text-indigo-300 hover:text-indigo-600 transition-colors"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {selectedCategory === 'other' && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-4 relative group"
                                    >
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                            <HelpCircle className="w-4 h-4" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="What kind of issue is this? (e.g. Mess Food, Library rules)"
                                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-4 pl-12 pr-4 outline-none focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-50/50 transition-all text-sm font-bold text-slate-700"
                                            value={customCategory}
                                            onChange={(e) => setCustomCategory(e.target.value)}
                                        />
                                    </motion.div>
                                )}
                            </div>

                            {/* Complaint Content */}
                            <div className="space-y-4">
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em]">
                                    Report Details
                                </label>
                                <div className="relative group">
                                    <textarea
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        disabled={isQuotaReached}
                                        className={`w-full border-2 rounded-[1.5rem] p-6 pb-12 min-h-[250px] focus:outline-none transition-all placeholder:text-slate-400 text-slate-700 ${isQuotaReached
                                            ? 'bg-slate-100 border-slate-100 cursor-not-allowed text-slate-400'
                                            : 'bg-slate-50 border-slate-100 focus:border-indigo-600 focus:bg-white'
                                            }`}
                                        placeholder={isQuotaReached ? "Submission limit reached. Please wait for 24 hours." : "Describe the issue. To remain anonymous, avoid using specific names or personal details."}
                                    />

                                    {/* Voice Input Button */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!('webkitSpeechRecognition' in window)) {
                                                toast.error('Voice input not supported in this browser');
                                                return;
                                            }
                                            // @ts-ignore
                                            const recognition = new window.webkitSpeechRecognition();
                                            recognition.continuous = false;
                                            recognition.interimResults = false;
                                            recognition.lang = 'en-US';

                                            toast('Listening...', { icon: '🎙️' });

                                            recognition.onresult = (event: any) => {
                                                const transcript = event.results[0][0].transcript;
                                                setContent(prev => prev + (prev ? ' ' : '') + transcript);
                                                toast.success('Voice captured');
                                            };

                                            recognition.onerror = () => toast.error('Voice input failed');
                                            recognition.start();
                                        }}
                                        className="absolute bottom-4 right-20 p-2 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm group"
                                        title="Use Voice Input"
                                    >
                                        <div className="text-lg">🎙️</div>
                                    </button>

                                    <div className="absolute bottom-5 right-6 text-[10px] font-bold text-slate-400">
                                        {content.length} / 50 min characters
                                    </div>
                                </div>
                            </div>

                            {/* Image Attachment */}
                            <div className="space-y-4">
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em]">
                                    Evidence Attachment (Optional - Max 10KB)
                                </label>
                                <div className="flex flex-col gap-4">
                                    {imagePreview ? (
                                        <div className="relative w-full max-w-[200px] aspect-square rounded-2xl overflow-hidden border-2 border-indigo-100 group animate-in fade-in zoom-in-95">
                                            <img src={imagePreview} alt="Evidence Preview" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => { setImagePreview(null); setImageAttachment(null); }}
                                                className="absolute top-2 right-2 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                            <div className="absolute inset-x-0 bottom-0 bg-black/50 backdrop-blur-sm p-2 text-[8px] text-white text-center font-bold uppercase tracking-widest">
                                                Attachment Ready
                                            </div>
                                        </div>
                                    ) : (
                                        <label className={`relative group cursor-pointer ${isQuotaReached ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                            <div className={`flex flex-col items-center justify-center py-8 px-6 border-2 border-dashed rounded-[1.5rem] transition-all ${isQuotaReached ? 'border-slate-100 bg-slate-50' : 'border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30'}`}>
                                                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                                    <ImageIcon className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" />
                                                </div>
                                                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Add Evidence Image</span>
                                                <span className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">Maximum size: 10KB (Strict Limit)</span>
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                disabled={isQuotaReached}
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;

                                                    if (file.size > 10 * 1024) {
                                                        toast.error('Image is too large! Maximum limit is 10KB.');
                                                        e.target.value = '';
                                                        return;
                                                    }

                                                    const reader = new FileReader();
                                                    reader.onloadend = () => {
                                                        const result = reader.result as string;
                                                        setImagePreview(result);
                                                        setImageAttachment(result);
                                                    };
                                                    reader.readAsDataURL(file);
                                                }}
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-5">
                                <div className="flex justify-between items-end">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em]">
                                        Severity Level
                                    </label>
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${severity === 1 ? 'text-blue-600 bg-blue-50' :
                                        severity === 2 ? 'text-emerald-600 bg-emerald-50' :
                                            severity === 3 ? 'text-amber-600 bg-amber-50' : 'text-rose-600 bg-rose-50'
                                        }`}>
                                        {severity === 1 ? 'Low' : severity === 2 ? 'Medium' : severity === 3 ? 'High' : 'Critical'}
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="4"
                                    step="1"
                                    value={severity}
                                    onChange={(e) => setSeverity(parseInt(e.target.value))}
                                    disabled={isQuotaReached}
                                    className={`w-full h-2.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 ${isQuotaReached ? 'opacity-30 cursor-not-allowed' : ''}`}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting || isQuotaReached}
                                className={`w-full py-5 rounded-[1.5rem] font-bold flex items-center justify-center gap-3 transition-all shadow-xl ${isQuotaReached
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
                                    } disabled:opacity-50`}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>ENCRYPTING & SUBMITTING...</span>
                                    </>
                                ) : isQuotaReached ? (
                                    <>
                                        <AlertTriangle className="w-5 h-5" />
                                        <span>
                                            {quotaReason === 'cooldown'
                                                ? `WAIT ${Math.floor(remainingCooldown / 60)}:${(remainingCooldown % 60).toString().padStart(2, '0')}`
                                                : quotaReason === 'weekly'
                                                    ? 'WEEKLY LIMIT'
                                                    : quotaReason === 'frozen'
                                                        ? 'AREA FROZEN'
                                                        : 'DAILY LIMIT'}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-5 h-5" />
                                        <span>SUBMIT REPORT ANONYMOUSLY</span>
                                    </>
                                )}
                            </button>

                            {/* Limits Explanation */}
                            <div className="flex items-start gap-3 px-4 py-2 opacity-60">
                                <HelpCircle className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                                    Limits exist solely to prevent spam so real complaints are handled faster. Your identity is never stored.
                                </p>
                            </div>
                        </form>
                    </div>

                    {/* Sidebar / Info */}
                    <div className="space-y-6">
                        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 space-y-6">
                            <h3 className="text-lg font-black flex items-center gap-2 text-slate-800">
                                <Lock className="w-5 h-5 text-indigo-600" />
                                Privacy Shield
                            </h3>
                            <ul className="space-y-5">
                                {[
                                    'IP addresses are never logged permanently.',
                                    'Data is secured with AES-256.',
                                    'Metadata is automatically purged.'
                                ].map((text, i) => (
                                    <li key={i} className="flex gap-3 items-start text-sm text-slate-500 font-medium leading-tight">
                                        <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                        {text}
                                    </li>
                                ))}
                            </ul>
                            <div className="pt-2">
                                <Link
                                    href="/privacy-core"
                                    className="text-xs font-black text-indigo-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                                >
                                    How anonymity works <ArrowLeft className="w-3 h-3 rotate-180" />
                                </Link>
                            </div>
                        </div>

                        <div className="bg-indigo-600 rounded-[2rem] p-8 text-white space-y-4 shadow-xl shadow-indigo-100">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <HelpCircle className="w-5 h-5 opacity-80" />
                                Support
                            </h3>
                            <p className="text-sm opacity-90 leading-relaxed font-medium">
                                Not sure what to report? Check our guidelines on staff conduct, safety, and academic integrity.
                            </p>
                            <Link href="/help" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest bg-white/20 px-4 py-2 rounded-full hover:bg-white/30 transition">
                                View Guides <ArrowLeft className="w-4 h-4 rotate-180" />
                            </Link>
                        </div>
                    </div>
                </div>
                <MobileNav />
            </div>
        </div>
    );
}