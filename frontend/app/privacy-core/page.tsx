'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, EyeOff, Server, Lock, ChevronLeft, FileText, Activity } from 'lucide-react';
import MobileNav from '@/components/MobileNav';

export default function PrivacyCorePage() {
    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans antialiased text-slate-800">
            {/* Header */}
            <div className="bg-white border-b border-slate-100 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group text-slate-400 hover:text-indigo-600 transition-colors">
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-xs font-black uppercase tracking-widest">Back to Safe Space</span>
                    </Link>
                    <div className="flex items-center gap-2 text-indigo-900">
                        <Shield className="w-6 h-6 text-indigo-600" />
                        <span className="font-black text-lg tracking-tight">Privacy Core</span>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-6 py-16 space-y-20">
                {/* Hero */}
                <div className="space-y-6 text-center">
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                        How your identity <br />
                        <span className="text-indigo-600">remains hidden.</span>
                    </h1>
                    <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto">
                        Transparency is our defense. Here is exactly what is stored, what is deleted, and what the administration can (and cannot) see.
                    </p>
                </div>

                {/* The Graph */}
                <div className="grid md:grid-cols-2 gap-8">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 space-y-6 shadow-sm">
                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                            <EyeOff className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-black text-slate-800">What Admin Sees</h3>
                        <ul className="space-y-4">
                            {[
                                'The content of your report',
                                'Severity & Category',
                                'Timestamp of submission',
                                'Randomized Session ID (e.g., #8X92)'
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-sm font-bold text-slate-600">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="bg-slate-900 p-8 rounded-[2.5rem] space-y-6 text-white shadow-xl shadow-slate-200">
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white">
                            <Lock className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-black">What is Encrypted</h3>
                        <ul className="space-y-4">
                            {[
                                'Your Message Content (AES-256)',
                                'Your Real IP Address (Abuse logs only)',
                                'Your Browser Metadata',
                                'Your Interaction History'
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-sm font-bold text-slate-400">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Technical breakdown */}
                <div className="space-y-12">
                    <section className="space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <Server className="w-5 h-5 text-indigo-600" />
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Data Retention Policy</h2>
                        </div>
                        <h3 className="text-2xl font-black text-slate-800">Automatic Purging</h3>
                        <p className="text-slate-600 leading-relaxed">
                            We practice data minimization. This means we do not keep data longer than necessary.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                            {[
                                { t: '24 Hours', d: 'IP usage logs for spam protection are wiped daily.' },
                                { t: 'Forever', d: 'Message content remains encrypted at rest on our servers.' },
                                { t: 'Instant', d: 'Deleted reports are hard-deleted. No hidden archives.' }
                            ].map((card, i) => (
                                <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100">
                                    <div className="text-lg font-black text-indigo-600 mb-2">{card.t}</div>
                                    <div className="text-xs font-bold text-slate-400 leading-relaxed uppercase tracking-wide">{card.d}</div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Footer Warning */}
                <div className="p-8 bg-indigo-50 border border-indigo-100 rounded-[2rem] text-center space-y-4">
                    <Activity className="w-8 h-8 text-indigo-600 mx-auto" />
                    <h4 className="font-black text-indigo-900 text-lg">Abuse Prevention</h4>
                    <p className="text-sm text-indigo-800/70 font-medium max-w-lg mx-auto">
                        While we protect anonymity, we track usage patterns to prevent spam (e.g., 5 posts/week limit).
                        This metadata is strictly separated from your report content.
                    </p>
                </div>
            </div>
            <MobileNav />
        </div>
    );
}
