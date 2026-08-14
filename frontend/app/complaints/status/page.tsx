'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Shield, Search, Clock,
    CheckCircle, MessageSquare, AlertCircle,
    Loader2, Lock, Eye, ArrowUpRight, ChevronLeft
} from 'lucide-react';
import Link from 'next/link';
import { checkComplaintStatus, Complaint, getProfile } from '@/lib/api';
import toast from 'react-hot-toast';
import MobileNav from '@/components/MobileNav';

export default function ComplaintStatusPage() {
    const router = useRouter();
    const [trackingCode, setTrackingCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [complaint, setComplaint] = useState<Complaint | null>(null);

    React.useEffect(() => {
        const checkAuth = async () => {
            const profile = await getProfile().catch(() => null);
            if (!profile) {
                toast.error('Authentication required to track reports.');
                router.push('/login?redirect=/complaints/status');
            }
        };
        checkAuth();
    }, [router]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!trackingCode.trim()) {
            toast.error('Please enter a tracking code');
            return;
        }

        setIsLoading(true);
        setComplaint(null);
        try {
            const res = await checkComplaintStatus(trackingCode);
            setComplaint(res);
        } catch (error: any) {
            console.error('Search error:', error);
            const message = error.response?.status === 404
                ? 'Invalid tracking code. Please check and try again.'
                : 'Failed to fetch status. Please try again.';
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return <Clock className="w-5 h-5 text-amber-500" />;
            case 'reviewing': return <Eye className="w-5 h-5 text-sky-500" />;
            case 'resolved': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
            default: return <AlertCircle className="w-5 h-5 text-slate-400" />;
        }
    };

    const getSeverityColor = (severity: number) => {
        switch (severity) {
            case 1: return 'text-blue-600 bg-blue-50 border-blue-100';
            case 2: return 'text-emerald-600 bg-emerald-50 border-emerald-100';
            case 3: return 'text-amber-600 bg-amber-50 border-amber-100';
            case 4: return 'text-rose-600 bg-rose-50 border-rose-100';
            default: return 'text-slate-600 bg-slate-50 border-slate-100';
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-6 pb-20 font-sans antialiased">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 md:mb-12">
                    <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors group">
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-bold tracking-tight hidden sm:inline">Return Home</span>
                        <span className="text-sm font-bold tracking-tight sm:hidden">Home</span>
                    </Link>
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                            <Shield className="w-4 h-4 md:w-5 md:h-5 text-white" />
                        </div>
                        <span className="font-black text-lg md:text-xl tracking-tighter text-slate-800 uppercase">SpeakSafe</span>
                    </div>
                </div>

                <div className="max-w-2xl mx-auto text-center mb-8 md:mb-12">
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 mb-4">View your report</h1>
                    <p className="text-slate-500 leading-relaxed font-medium text-sm md:text-base">
                        Enter your code to see if your report is fixed.
                    </p>
                </div>

                {/* Search Bar */}
                <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-10 md:mb-16 relative">
                    <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                        <Search className="w-5 h-5 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        value={trackingCode}
                        onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                        placeholder="YT-XXXX-XXXX"
                        className="w-full bg-white border-2 border-slate-100 rounded-[2rem] py-4 md:py-5 pl-14 pr-24 md:pr-32 focus:outline-none focus:border-indigo-600 shadow-xl shadow-indigo-100/30 transition-all font-mono text-lg md:text-xl tracking-widest placeholder:text-slate-300 placeholder:text-xs md:placeholder:text-sm placeholder:tracking-normal placeholder:font-sans"
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="absolute right-2 md:right-2.5 top-2 md:top-2.5 bottom-2 md:bottom-2.5 bg-indigo-600 text-white px-5 md:px-8 rounded-[1.5rem] font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-200 text-sm md:text-base"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'CHECK'}
                    </button>
                </form>

                {/* Result Card */}
                {complaint && (
                    <div className="max-w-2xl mx-auto animate-in fade-in duration-500 slide-in-from-bottom-4">
                        <div className="bg-white border border-slate-100 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-2xl shadow-indigo-100/50 space-y-8 relative overflow-hidden">
                            {/* Decorative Background */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50" />

                            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-50 pb-8">
                                <div className="space-y-1">
                                    <div className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black">Type</div>
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-2xl">{complaint.category.icon}</span>
                                        <span className="text-lg md:text-xl font-bold text-slate-800">{complaint.category.name}</span>
                                    </div>
                                </div>
                                <div className="space-y-1 sm:text-right">
                                    <div className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black">Latest Status</div>
                                    <div className="flex items-center sm:justify-end gap-2 text-indigo-600">
                                        {getStatusIcon(complaint.status)}
                                        <span className="text-lg md:text-xl font-black uppercase tracking-tight">{complaint.status_display}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <div className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black">Severity</div>
                                    <span className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getSeverityColor(complaint.severity)}`}>
                                        {complaint.severity_display}
                                    </span>
                                </div>
                                <div className="space-y-1 sm:text-right">
                                    <div className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black">Date Sent</div>
                                    <div className="text-slate-600 font-bold">{new Date(complaint.submission_date).toLocaleDateString(undefined, { dateStyle: 'long' })}</div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black">Progress</div>
                                <div className="relative">
                                    <div className="w-full h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                        <div
                                            className="h-full bg-indigo-600 rounded-full transition-all duration-1000"
                                            style={{ width: complaint.status === 'resolved' ? '100%' : complaint.status === 'reviewing' ? '60%' : '20%' }}
                                        />
                                    </div>
                                    <div className="flex justify-between mt-2 text-[9px] text-slate-400 font-black uppercase tracking-widest">
                                        <span>Sent</span>
                                        <span>Fixing</span>
                                        <span>Fixed</span>
                                    </div>
                                </div>
                            </div>

                            {complaint.response_deadline && (
                                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                                        <div className="text-sm font-medium">
                                            <span className="text-slate-500">Should be fixed by </span>
                                            <span className="text-amber-700 font-bold block md:inline">{new Date(complaint.response_deadline).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                                        </div>
                                    </div>
                                    <div className="text-[10px] font-black text-amber-600/50 uppercase tracking-widest self-end md:self-auto">
                                        {complaint.days_until_deadline} days left
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 border-t border-slate-50 flex flex-col sm:flex-row gap-4">
                                <Link
                                    href={`/dashboard/complaints/${complaint.complaint_id}?code=${trackingCode}`}
                                    className="flex-1 py-4 px-6 bg-indigo-600 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 group hover:bg-indigo-700 shadow-lg shadow-indigo-100"
                                >
                                    <MessageSquare className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                                    <span>View Chat & Updates</span>
                                    <ArrowUpRight className="w-4 h-4 opacity-50" />
                                </Link>
                            </div>
                        </div>

                        <div className="mt-8 text-center pb-8 md:pb-0">
                            <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1.5 font-bold uppercase tracking-widest">
                                <Lock className="w-3 h-3" />
                                Tracking session secured via daily hashing protocol
                            </p>
                        </div>
                    </div>
                )}

                {/* Info Boxes */}
                {!complaint && !isLoading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-3xl mx-auto">
                        <div className="p-6 md:p-8 rounded-[2rem] bg-white border border-slate-100 shadow-sm space-y-4">
                            <h3 className="font-extrabold flex items-center gap-2 text-slate-800">
                                <Lock className="w-5 h-5 text-indigo-600" />
                                Security Protocol
                            </h3>
                            <p className="text-sm text-slate-500 leading-relaxed font-medium">
                                Tracking codes are the only way to access your report progress as we do not store any identifying account data.
                            </p>
                        </div>
                        <div className="p-6 md:p-8 rounded-[2rem] bg-indigo-600 text-white shadow-xl shadow-indigo-100 space-y-4">
                            <h3 className="font-extrabold flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-indigo-100" />
                                Response Center
                            </h3>
                            <p className="text-sm text-indigo-100 leading-relaxed font-medium">
                                Authorized investigators may send anonymous follow-up questions to clarify details of your submission.
                            </p>
                        </div>
                    </div>
                )}
            </div>
            <MobileNav />
        </div>
    );
}
