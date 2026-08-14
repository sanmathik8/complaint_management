'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Compass, Sparkles, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import { createProfile } from '@/lib/api';

export default function CreateProfilePage() {
    const router = useRouter();
    const [style, setStyle] = useState('Truth-Seeker');
    const [preferences, setPreferences] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const styles = [
        "Truth-Seeker", "Whistleblower", "Guardian", "Observer", "Advocate"
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await createProfile({
                style,
                preferences: { initial_notes: preferences }
            });
            router.push('/dashboard');
        } catch (err: any) {
            setError('Failed to finalize profile. Please ensure all systems are operational.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen w-full flex items-center justify-center bg-slate-50 text-slate-900 p-6 font-sans antialiased selection:bg-indigo-100">
            {/* Background elements */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-100/30 blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-blue-100/20 blur-[100px]" />
            </div>

            <div className="relative z-10 w-full max-w-xl bg-white border border-slate-100 rounded-[3rem] p-10 md:p-14 shadow-2xl shadow-indigo-100/50">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-100 mb-6">
                        <ShieldCheck className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 mb-3">
                        IDENTITY <span className="text-indigo-600 uppercase">PROTOCOL</span>
                    </h1>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] font-sans">Initialize Your Security Profile</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-10">
                    {/* Archetype Selection */}
                    <div className="space-y-4">
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                            Select Your Archetype
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {styles.map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setStyle(s)}
                                    className={`py-4 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${style === s
                                        ? 'bg-indigo-50 border-indigo-600 text-indigo-600 ring-4 ring-indigo-50/50'
                                        : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200 hover:bg-slate-50'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Security Intent */}
                    <div className="space-y-4">
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                            Primary Security Objective
                        </label>
                        <div className="relative">
                            <textarea
                                value={preferences}
                                onChange={(e) => setPreferences(e.target.value)}
                                placeholder="Describe your goals for using SpeakSafe (e.g., 'To ensure financial transparency in the department')..."
                                rows={4}
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-8 text-sm text-slate-800 placeholder-slate-300 focus:border-indigo-600 focus:bg-white transition-all resize-none leading-relaxed font-medium"
                            />
                            <div className="absolute right-6 bottom-6 opacity-20">
                                <Sparkles className="w-5 h-5 text-indigo-600" />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-500 text-[10px] font-black uppercase tracking-widest text-center shadow-inner">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 text-white py-6 rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 group shadow-2xl shadow-indigo-100 active:scale-95 disabled:opacity-50"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                Finalize Initialization
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                            </>
                        )}
                    </button>

                    <p className="text-[10px] text-center text-slate-300 font-bold uppercase tracking-widest leading-relaxed">
                        Data provided during initialization is secured via <br /> Advanced Encryption Standards.
                    </p>
                </form>
            </div>
        </main>
    );
}
