'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ChevronLeft, Megaphone, Send, AlertCircle,
    Shield, Clock, User, Info, CheckCircle2,
    Zap, Globe, ShieldCheck, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getProfile, createAnnouncement, getAnnouncements, Announcement } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

export default function NewAnnouncementPage() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([]);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const profile = await getProfile();
                if (!profile.is_superuser && !profile.is_principal) {
                    toast.error('Unauthorized Access: Secure handoff rejected.');
                    router.push('/dashboard');
                    return;
                }
                setUser(profile);
                const anns = await getAnnouncements();
                setRecentAnnouncements(anns.slice(0, 5));
            } catch (error) {
                router.push('/login');
            }
        };
        checkAuth();
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            toast.error('Subject and Content required for decryption.');
            return;
        }

        setIsSubmitting(true);
        try {
            await createAnnouncement({ title, content });
            toast.success('Broadcast transmitted successfully!', {
                icon: '🚀',
                duration: 4000
            });
            router.push('/dashboard');
        } catch (error) {
            toast.error('Transmission failed. Check secure connection.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-800 p-6 pb-20 font-sans selection:bg-purple-100 selection:text-purple-900">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none opacity-40 overflow-hidden">
                <div className="absolute top-0 right-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[140px]" />
                <div className="absolute bottom-0 left-1/2 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-5xl mx-auto space-y-12 relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm shadow-slate-200/50"
                >
                    <div className="space-y-4">
                        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-purple-600 mb-2 transition-all group font-black text-[10px] uppercase tracking-[0.2em]">
                            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                            Command Home
                        </button>
                        <div>
                            <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-slate-900">Broadcast Terminal</h1>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2 pl-1 flex items-center gap-2">
                                <Globe className="w-3.5 h-3.5 text-purple-500" />
                                Transmit global notifications to all active sessions
                            </p>
                        </div>
                    </div>
                    <div className="hidden lg:block relative group">
                        <div className="absolute inset-0 bg-purple-600 rounded-[2rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
                        <div className="relative w-24 h-24 bg-purple-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-purple-200 overflow-hidden">
                            <Megaphone className="w-10 h-10 text-white group-hover:rotate-12 transition-transform duration-500" />
                        </div>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Main Form Terminal */}
                    <div className="lg:col-span-8 space-y-8">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white p-10 lg:p-14 rounded-[3.5rem] border border-slate-100 shadow-xl shadow-slate-200/20 relative"
                        >
                            <div className="absolute top-10 right-10 flex items-center gap-2 opacity-50">
                                <Zap className="w-4 h-4 text-amber-500 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Active Link</span>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-10">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] pl-4">Transmission Subject</label>
                                    <div className="relative group/input">
                                        <div className="absolute inset-0 bg-purple-600 rounded-2xl blur opacity-0 group-focus-within/input:opacity-5 transition-opacity" />
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="Transmission Header (e.g. Schedule Override)"
                                            className="relative w-full bg-slate-50/50 border-2 border-slate-100/50 rounded-2xl px-8 py-6 text-slate-900 focus:ring-4 focus:ring-purple-50 focus:border-purple-600 transition-all outline-none font-black text-xl placeholder:text-slate-300"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] pl-4">Payload Content</label>
                                    <div className="relative group/input">
                                        <div className="absolute inset-0 bg-purple-600 rounded-2xl blur opacity-0 group-focus-within/input:opacity-5 transition-opacity" />
                                        <textarea
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            placeholder="Compose your secure transmission payload here..."
                                            rows={10}
                                            className="relative w-full bg-slate-50/50 border-2 border-slate-100/50 rounded-[2.5rem] px-8 py-8 text-slate-900 focus:ring-4 focus:ring-purple-50 focus:border-purple-600 transition-all outline-none font-medium leading-relaxed resize-none placeholder:text-slate-300"
                                        />
                                    </div>
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-slate-900 text-white font-black py-6 rounded-2xl flex items-center justify-center gap-4 hover:bg-purple-600 transition-all shadow-2xl shadow-slate-200 active:scale-[0.98] disabled:opacity-50 group/btn"
                                >
                                    {isSubmitting ? (
                                        <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <ShieldCheck className="w-5 h-5 text-purple-400 group-hover/btn:text-white transition-colors" />
                                            <span className="uppercase text-xs tracking-[0.3em]">Execute Broadcast</span>
                                        </>
                                    )}
                                </motion.button>
                            </form>
                        </motion.div>

                        <div className="bg-white border border-slate-100 p-8 rounded-[2.5rem] flex items-start gap-6 shadow-sm overflow-hidden group">
                            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                <AlertCircle className="w-6 h-6 text-amber-600" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Authority Confirmation</h3>
                                <p className="text-xs text-slate-400 leading-relaxed font-bold uppercase tracking-tighter opacity-70">
                                    This transmission will bypass all filters and reach 100% of the active user base instantly. Verified identity: <span className="text-slate-900">{user?.full_name || 'Protocol Officer'}</span>.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Meta Sidebar */}
                    <div className="lg:col-span-4 space-y-8">
                        {/* History Log */}
                        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                                <History className="w-4 h-4 text-purple-500" /> Transmission Log
                            </h3>

                            <div className="space-y-6">
                                <AnimatePresence mode="popLayout">
                                    {recentAnnouncements.length === 0 ? (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 space-y-4">
                                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto opacity-30">
                                                <Info className="w-6 h-6" />
                                            </div>
                                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic leading-loose">Log currently empty</p>
                                        </motion.div>
                                    ) : (
                                        recentAnnouncements.map((ann, i) => (
                                            <motion.div
                                                key={ann.id}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                onClick={() => router.push('/dashboard/broadcasts')}
                                                className="group p-5 rounded-2xl bg-slate-50/50 hover:bg-white border border-transparent hover:border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-pointer"
                                            >
                                                <h4 className="text-xs font-black text-slate-900 line-clamp-1 group-hover:text-purple-600 transition-colors uppercase tracking-tight">{ann.title}</h4>
                                                <div className="flex items-center justify-between mt-3 text-[9px] font-black text-slate-300 uppercase tracking-widest">
                                                    <span>
                                                        {new Date(ann.is_edited ? ann.updated_at : ann.created_at).toLocaleDateString()}
                                                        {ann.is_edited && <span className="ml-1 opacity-50 lowercase font-medium">(edited)</span>}
                                                    </span>
                                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-purple-400">
                                                        View <ArrowRight className="w-3 h-3" />
                                                    </span>
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Authority Key */}
                        <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden group shadow-2xl shadow-indigo-200">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.2),transparent_70%)]" />
                            <div className="relative z-10 space-y-6">
                                <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Shield className="w-7 h-7 text-purple-400" />
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-xl font-black tracking-tight leading-none">Administrative Credentials Verified</h3>
                                    <p className="text-slate-400 text-xs leading-relaxed font-bold uppercase tracking-widest opacity-80">
                                        Your <span className="text-purple-400">{user?.is_superuser ? 'Super-User' : 'Principal'}</span> role provides terminal access for high-level broadcasts. Your biometric signature is attached to every packet.
                                    </p>
                                </div>
                                <div className="pt-4 border-t border-white/10">
                                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.3em] text-white/40">
                                        <span>Security Rank</span>
                                        <span className="text-purple-400">ALPHA-1</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// History icon needed for this page
function History({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M12 7v5l4 2" />
        </svg>
    );
}
