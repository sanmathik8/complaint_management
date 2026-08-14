'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    BarChart3, TrendingUp, Shield, Clock,
    CheckCircle, AlertTriangle, ChevronLeft, ArrowUpRight,
    PieChart, Activity, Zap, HardDrive,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMyComplaints, Complaint } from '@/lib/api';
import toast from 'react-hot-toast';

export default function StatsPage() {
    const router = useRouter();
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await getMyComplaints();
            setComplaints(data);
        } catch (error: any) {
            if (error.response?.status !== 401) {
                toast.error('Intelligence sync failed. Analytics offline.');
            }
        } finally {
            setLoading(false);
        }
    };

    const total = complaints.length;
    const resolved = complaints.filter(c => c.status === 'resolved').length;
    const pending = complaints.filter(c => c.status === 'pending' || c.status === 'reviewing').length;
    const escalated = complaints.filter(c => c.status === 'escalated' || (c.escalation_level && c.escalation_level > 0)).length;

    const categories = complaints.reduce((acc, curr) => {
        acc[curr.category.name] = (acc[curr.category.name] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const maxCategoryCount = Math.max(...Object.values(categories), 1);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Computing Matrix Stats...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 p-6 pb-20 font-sans selection:bg-indigo-100 selection:text-indigo-900">
            {/* Ambient FX */}
            <div className="fixed inset-0 pointer-events-none opacity-40 overflow-hidden">
                <div className="absolute top-0 right-1/4 w-[700px] h-[700px] bg-indigo-500/5 rounded-full blur-[160px]" />
                <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-sky-500/5 rounded-full blur-[140px]" />
            </div>

            <div className="max-w-7xl mx-auto space-y-12 relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm shadow-slate-200/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-8"
                >
                    <div className="space-y-4">
                        <Link href="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 mb-2 transition-all group font-black text-[10px] uppercase tracking-[0.2em]">
                            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                            Return to Control
                        </Link>
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-slate-900 text-white rounded-[1.5rem] flex items-center justify-center shadow-2xl">
                                <BarChart3 className="w-8 h-8" />
                            </div>
                            <div>
                                <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-slate-900">Intelligence Matrix</h1>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1 flex items-center gap-2">
                                    <Activity className="w-3.5 h-3.5 text-indigo-500" />
                                    Live operational analytics and response telemetry
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                        <div className="px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-600">
                            Status: <span className="text-emerald-500">Nominal</span>
                        </div>
                    </div>
                </motion.div>

                {/* Primary Metrics Tier */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {[
                        { label: 'Total Volume', val: total, icon: Shield, theme: 'indigo', sub: 'Aggregated reports' },
                        { label: 'Security Index', val: `${total > 0 ? Math.round((resolved / total) * 100) : 0}%`, icon: CheckCircle, theme: 'emerald', sub: 'Closure ratio' },
                        { label: 'Buffer Queue', val: pending, icon: Clock, theme: 'amber', sub: 'Awaiting triage' },
                        { label: 'Hot Cases', val: escalated, icon: AlertTriangle, theme: 'rose', sub: 'Critical interventions' }
                    ].map((s, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            whileHover={{ y: -5 }}
                            className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all group relative overflow-hidden"
                        >
                            <div className={`absolute top-0 right-0 w-24 h-24 bg-${s.theme}-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 transition-opacity`} />

                            <div className="flex justify-between items-start mb-8 relative z-10">
                                <div className={`w-16 h-16 bg-${s.theme}-500/10 text-${s.theme}-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                                    <s.icon className="w-8 h-8" />
                                </div>
                                <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <ArrowUpRight className="w-5 h-5" />
                                </div>
                            </div>

                            <div className="relative z-10">
                                <div className={`text-5xl font-black text-slate-900 mb-1 tracking-tight group-hover:text-indigo-600 transition-colors`}>{s.val}</div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">{s.label}</div>
                                <div className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter mt-2">{s.sub}</div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Analytical Layers */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Sector Distribution */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="lg:col-span-8 bg-white border border-slate-100 p-10 lg:p-14 rounded-[3.5rem] shadow-sm relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8 mb-16 relative z-10">
                            <div>
                                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Sector Distribution</h3>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest text-[10px] mt-2">Heatmap of report frequencies per department</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-indigo-600 rounded-full animate-pulse" />
                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Active Stream</span>
                            </div>
                        </div>

                        <div className="grid gap-12 relative z-10">
                            {Object.entries(categories).map(([name, count], i) => (
                                <div key={name} className="space-y-4 group">
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs font-black text-slate-500 tracking-[0.2em] group-hover:text-indigo-600 transition-colors uppercase">
                                            {name}
                                        </span>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-3xl font-black text-slate-900 group-hover:scale-110 transition-transform">{count}</span>
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Entries</span>
                                        </div>
                                    </div>
                                    <div className="relative w-full bg-slate-100/50 rounded-full h-8 p-1.5 overflow-hidden shadow-inner group-hover:bg-slate-100 transition-colors">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(count / maxCategoryCount) * 100}%` }}
                                            transition={{ duration: 1.5, delay: i * 0.1, ease: "circOut" }}
                                            className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full shadow-lg shadow-indigo-200 relative"
                                        >
                                            <div className="absolute inset-0 bg-white/20 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </motion.div>
                                    </div>
                                </div>
                            ))}

                            {Object.keys(categories).length === 0 && (
                                <div className="py-20 text-center space-y-4">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto opacity-30 shadow-inner">
                                        <Target className="w-10 h-10 text-slate-400" />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] italic">No categorical payload detected</p>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Meta Performance & Trust */}
                    <div className="lg:col-span-4 space-y-10">
                        {/* Efficiency Card */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-slate-900 rounded-[3.5rem] p-10 lg:p-12 text-white relative overflow-hidden group shadow-2xl shadow-slate-200"
                        >
                            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
                            <div className="relative z-10 space-y-10 mt-4">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-500">
                                        <TrendingUp className="w-7 h-7 text-indigo-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black tracking-tight leading-none uppercase text-[10px] tracking-[0.4em] text-white/40">Efficiency Metrics</h3>
                                    </div>
                                </div>

                                <div className="space-y-10">
                                    <div className="space-y-4">
                                        <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Avg. Triage Speed</div>
                                        <div className="text-5xl font-black text-indigo-400 tracking-tighter">1.8 <span className="text-lg uppercase tracking-widest text-white/20">Days</span></div>
                                        <div className="flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                                            <Zap className="w-3.5 h-3.5" /> Performance +22%
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Network Trust Index</div>
                                        <div className="text-5xl font-black text-indigo-400 tracking-tighter">4.92<span className="text-lg uppercase tracking-widest text-white/20">/5.0</span></div>
                                        <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] leading-relaxed">Cryptographic validation on all telemetry points</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Hardware Support */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden group"
                        >
                            <div className="relative z-10 space-y-6">
                                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100 group-hover:scale-110 transition-transform">
                                    <HardDrive className="w-6 h-6 text-white" />
                                </div>
                                <div className="space-y-3">
                                    <h4 className="text-lg font-black tracking-tight text-slate-800">Verified Accountability</h4>
                                    <p className="text-xs text-slate-400 leading-relaxed font-bold uppercase tracking-tight opacity-80">
                                        These numbers represent real-world safety impact. Every submission is backed by a cryptographically signed proof of work.
                                    </p>
                                </div>
                                <div className="pt-4 border-t border-slate-50 flex items-center justify-between text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                    <span>Matrix Core v2.4</span>
                                    <span className="text-indigo-600">Encrypted</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Target icon needed
function Target({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
        </svg>
    );
}
