'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ChevronLeft, ChevronRight, Search, RefreshCw, Megaphone,
    CheckCircle, Clock, Plus, ArrowRight,
    AlertCircle, Edit2, Trash2, Filter,
    Layers, Inbox, ShieldAlert, Bell, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMyComplaints, getCategories, getProfile, markComplaintAsRead, Complaint, ComplaintCategory } from '@/lib/api';
import toast from 'react-hot-toast';
import NotificationBell from '@/components/NotificationBell';
import MobileNav from '@/components/MobileNav';

export default function ComplaintsListPage() {
    const router = useRouter();
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [categories, setCategories] = useState<ComplaintCategory[]>([]);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Filters & Pagination
    const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'reviewing' | 'replied' | 'response' | 'closed' | 'escalated'>('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');
    const [filterDate, setFilterDate] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                const [p, c, cats] = await Promise.all([
                    getProfile(),
                    getMyComplaints(),
                    getCategories()
                ]);
                setUser(p);
                setComplaints(c);
                setCategories(cats);
            } catch (err: any) {
                if (err.response?.status !== 401) {
                    console.error('Shielded connection error:', err);
                }
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    const loadComplaints = async () => {
        setLoading(true);
        try {
            const cData = await getMyComplaints();
            setComplaints(cData);
            toast.success('Sync complete');
        } catch (error: any) {
            toast.error('Failed to sync history');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm('Are you sure you want to permanently delete this report? This action cannot be undone.')) return;

        try {
            const { deleteComplaint } = await import('@/lib/api');
            await deleteComplaint(id);
            toast.success('Report deleted');
            setComplaints(prev => prev.filter(c => c.complaint_id !== id));
        } catch (err) {
            toast.error('Failed to delete report');
        }
    };

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
        const text = labelSafe[status as keyof typeof labelSafe] || status;

        return (
            <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-full border ${style} tracking-tighter backdrop-blur-md`}>
                {text}
            </span>
        );
    };

    // Filter Logic
    const filteredComplaints = complaints.filter(c => {
        if (activeTab === 'all') {
            // Show everything
        } else if (activeTab === 'replied') {
            // Principal replied to student
            if (c.status !== 'reviewing' || c.has_student_reply) return false;
        } else if (activeTab === 'response') {
            // Student replied to principal
            if (!c.has_student_reply) return false;
        } else if (activeTab === 'escalated') {
            if (!c.escalation_level) return false;
        } else {
            // 'closed' tab maps to 'resolved' status in DB
            const targetStatus = activeTab === 'closed' ? 'resolved' : activeTab;
            if (c.status !== targetStatus) return false;
        }

        const matchesSearch = searchQuery === '' ||
            c.tracking_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.status_display.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCategory = filterCategory === 'all' || c.category.slug === filterCategory;
        const matchesPriority = filterPriority === 'all' || c.severity.toString() === filterPriority;
        const matchesDate = filterDate === '' || new Date(c.created_at).toISOString().split('T')[0] === filterDate;

        return matchesSearch && matchesCategory && matchesPriority && matchesDate;
    });

    const totalPages = Math.ceil(filteredComplaints.length / itemsPerPage);
    const paginatedComplaints = filteredComplaints.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, filterCategory, filterPriority, searchQuery, filterDate]);

    const isInternal = user?.is_superuser || user?.is_principal;

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-800 p-6 pb-36 md:pb-8 font-sans selection:bg-indigo-100 selection:text-indigo-900">
            {/* Background elements */}
            <div className="fixed inset-0 pointer-events-none opacity-40 overflow-hidden">
                <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px]" />
            </div>

            <div className="max-w-6xl mx-auto space-y-10 relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm shadow-slate-200/50"
                >
                    <div className="space-y-3">
                        <div className="flex items-center gap-4">
                            <motion.button
                                whileHover={{ scale: 1.05, x: -2 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => router.push('/dashboard')}
                                className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-md transition-all"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </motion.button>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                                    {isInternal ? 'Reports Vault' : 'Your Submissions'}
                                </h1>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1 pl-1">
                                    {isInternal ? 'Intelligence Oversight' : 'Personal Security Log'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <NotificationBell />

                        <motion.button
                            whileHover={{ rotate: 180 }}
                            transition={{ duration: 0.5 }}
                            onClick={loadComplaints}
                            className="p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:shadow-md transition-all text-slate-400 hover:text-indigo-600"
                            title="Sync Data"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </motion.button>

                        <Link
                            href={isInternal ? "/dashboard/announcements/new" : "/complaints/new"}
                            className={`px-8 py-4 ${isInternal ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'} text-white font-black rounded-2xl transition-all flex items-center gap-3 shadow-xl hover:scale-105 active:scale-95 text-xs uppercase tracking-widest`}
                        >
                            {isInternal ? <Megaphone className="w-4 h-4" /> : <Plus className="w-5 h-5" />}
                            <span>{isInternal ? 'New Broadcast' : 'File Report'}</span>
                        </Link>
                    </div>
                </motion.div>

                {/* Filter Management */}
                <div className="space-y-6">
                    {/* Horizontal Nav Tabs */}
                    <div className="flex p-1.5 bg-white/60 backdrop-blur-md rounded-2xl border border-slate-100 w-full md:w-fit overflow-x-auto scrollbar-hide">
                        {(() => {
                            const studentRepliedCount = complaints.filter(c => c.has_student_reply).length;
                            const adminRepliedCount = complaints.filter(c => c.status === 'reviewing' && !c.has_student_reply).length;
                            const tabs = [
                                { id: 'all', label: 'All', icon: Inbox, badge: null },
                                { id: 'pending', label: 'Pending', icon: Clock, badge: null },
                                { id: 'reviewing', label: 'Active', icon: Search, badge: null },
                                { id: 'replied', label: 'Replied', icon: Bell, badge: adminRepliedCount > 0 ? adminRepliedCount : null },
                                { id: 'response', label: 'Response', icon: ShieldAlert, badge: studentRepliedCount > 0 ? studentRepliedCount : null },
                                { id: 'closed', label: 'Closed', icon: CheckCircle, badge: null },
                            ];
                            return tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`relative flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-tighter transition-all whitespace-nowrap ${activeTab === tab.id
                                        ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                                        : 'text-slate-400 hover:text-slate-600 hover:bg-white'
                                        }`}
                                >
                                    <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-indigo-400' : ''}`} />
                                    {tab.label}
                                    {tab.badge !== null && (
                                        <span className={`ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-black flex items-center justify-center ${activeTab === tab.id
                                            ? 'bg-indigo-500 text-white'
                                            : tab.id === 'replied'
                                                ? 'bg-indigo-600 text-white animate-pulse'
                                                : 'bg-emerald-600 text-white animate-pulse'
                                            }`}>
                                            {tab.badge}
                                        </span>
                                    )}
                                </button>
                            ));
                        })()}
                    </div>

                    {/* Filter Utilities */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                        <div className="lg:col-span-4 relative">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                            <input
                                type="text"
                                placeholder="Search reports..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white border border-slate-100 rounded-[2rem] py-5 pl-14 pr-6 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all font-bold text-sm shadow-sm"
                            />
                        </div>

                        <div className="lg:col-span-3">
                            <div className="relative h-full">
                                <Filter className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                                <select
                                    value={filterCategory}
                                    onChange={(e) => setFilterCategory(e.target.value)}
                                    className="w-full h-full bg-white border border-slate-100 rounded-[2rem] pl-12 pr-6 py-4 appearance-none text-sm font-bold text-slate-700 outline-none cursor-pointer focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500"
                                >
                                    <option value="all">Sectors: All</option>
                                    {categories.map(cat => (
                                        <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="lg:col-span-3">
                            <div className="relative h-full">
                                <Layers className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                                <select
                                    value={filterPriority}
                                    onChange={(e) => setFilterPriority(e.target.value)}
                                    className="w-full h-full bg-white border border-slate-100 rounded-[2rem] pl-12 pr-6 py-4 appearance-none text-sm font-bold text-slate-700 outline-none cursor-pointer focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500"
                                >
                                    <option value="all">Priority: Any</option>
                                    <option value="1">Low</option>
                                    <option value="2">Medium</option>
                                    <option value="3">High</option>
                                    <option value="4">Critical</option>
                                </select>
                            </div>
                        </div>

                        <div className="lg:col-span-2">
                            <div className="relative h-full">
                                <input
                                    type="date"
                                    value={filterDate}
                                    onChange={(e) => setFilterDate(e.target.value)}
                                    className="w-full h-full bg-white border border-slate-100 rounded-[2rem] px-5 py-4 text-sm font-bold text-slate-700 outline-none cursor-pointer focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 min-w-0"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* List Body */}

                <div className="space-y-4">
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-32 bg-white rounded-[2rem] animate-pulse border border-slate-100" />
                            ))}
                        </div>
                    ) : paginatedComplaints.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white py-32 rounded-[3.5rem] border border-dashed border-slate-200 text-center space-y-8 shadow-sm flex flex-col items-center justify-center p-10"
                        >
                            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center">
                                <Inbox className="w-10 h-10 text-slate-200" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                                    No records found
                                </h3>
                                <p className="text-sm text-slate-400 font-bold uppercase tracking-[0.2em]">{activeTab === 'all' ? 'Your vault is currently empty' : 'Try adjusting your security filters'}</p>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="space-y-4">
                            <AnimatePresence mode="popLayout">
                                {paginatedComplaints.map((c, i) => (
                                    <motion.div
                                        key={c.complaint_id}
                                        layout
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                    >
                                        <Link
                                            href={`/dashboard/complaints/${c.complaint_id}`}
                                            className="group relative bg-white p-7 rounded-[2.5rem] border border-slate-100 transition-all flex flex-col md:flex-row md:items-center justify-between gap-8 hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-indigo-200 overflow-hidden"
                                        >
                                            {/* Severity Indicator Line */}
                                            <div className={`absolute left-0 top-0 w-1.5 h-full ${c.severity === 4 ? 'bg-rose-500' : c.severity === 3 ? 'bg-amber-500' : 'bg-transparent'} opacity-60 group-hover:opacity-100 transition-opacity`} />

                                            <div className="flex items-start gap-6">
                                                <div className="w-16 h-16 rounded-3xl bg-slate-50 flex flex-col items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all group-hover:-rotate-3 shrink-0 border border-slate-100 group-hover:border-indigo-100">
                                                    <span className="text-[10px] font-black">{new Date(c.created_at).getDate()}</span>
                                                    <span className="text-[8px] font-bold uppercase tracking-widest">{new Date(c.created_at).toLocaleString('default', { month: 'short' })}</span>
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <span className="text-[10px] font-mono font-black text-slate-300 group-hover:text-indigo-400/50 transition-colors uppercase tracking-widest">{c.tracking_code}</span>
                                                        {getStatusBadge(c.escalation_level && c.escalation_level > 0 ? 'escalated' : c.status)}

                                                    </div>
                                                    <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2 line-clamp-1 group-hover:text-indigo-900 transition-colors">
                                                        {c.category.name}
                                                        {c.severity === 4 && <AlertCircle className="w-5 h-5 text-rose-500 animate-pulse" />}
                                                    </h3>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                        Protected Hash: {c.complaint_id.slice(0, 16)}...
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6 self-end md:self-center">
                                                {isInternal && (
                                                    <div className="flex items-center gap-4 border-r border-slate-100 pr-6">
                                                        {c.status === 'pending' && (
                                                            <motion.button
                                                                whileHover={{ scale: 1.1 }}
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={async (e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    try {
                                                                        const res = await markComplaintAsRead(c.complaint_id);
                                                                        if (res.new_status === 'reviewing') {
                                                                            setComplaints(prev => prev.map(p =>
                                                                                p.complaint_id === c.complaint_id
                                                                                    ? { ...p, status: 'reviewing' }
                                                                                    : p
                                                                            ));
                                                                            toast.success('Investigation Started');
                                                                        }
                                                                    } catch (err) {
                                                                        toast.error('Failed to mark as read');
                                                                    }
                                                                }}
                                                                className="p-3 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all"
                                                                title="Mark as Read"
                                                            >
                                                                <Eye className="w-5 h-5" />
                                                            </motion.button>
                                                        )}
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                router.push(`/dashboard/complaints/${c.complaint_id}`);
                                                            }}
                                                            className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                            title="Inspect"
                                                        >
                                                            <Edit2 className="w-5 h-5" />
                                                        </motion.button>
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={(e) => handleDelete(c.complaint_id, e)}
                                                            className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                            title="Purge"
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </motion.button>
                                                    </div>
                                                )}

                                                <motion.div
                                                    whileHover={{ x: 5 }}
                                                    className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm group-hover:shadow-indigo-200"
                                                >
                                                    <ArrowRight className="w-6 h-6" />
                                                </motion.div>
                                            </div>
                                        </Link>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* Secure Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 pt-4">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 disabled:opacity-30 transition-all shadow-sm"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-1">
                            {(() => {
                                const pages = [];
                                let start = Math.max(1, currentPage - 1);
                                let end = Math.min(totalPages, start + 2);

                                // Adjust start if we're near the end to maintain 3 items
                                if (end === totalPages) {
                                    start = Math.max(1, end - 2);
                                }

                                return (
                                    <AnimatePresence mode="popLayout" initial={false}>
                                        {Array.from({ length: end - start + 1 }, (_, i) => start + i).map(page => (
                                            <motion.button
                                                layout
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{
                                                    opacity: 1,
                                                    scale: currentPage === page ? 1.1 : 1,
                                                    backgroundColor: currentPage === page ? '#0f172a' : '#ffffff',
                                                    color: currentPage === page ? '#ffffff' : '#94a3b8',
                                                    borderColor: currentPage === page ? '#0f172a' : '#f1f5f9'
                                                }}
                                                exit={{ opacity: 0, scale: 0.8 }}
                                                transition={{ layout: { type: "spring", stiffness: 300, damping: 30 } }}
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={`w-10 h-10 rounded-xl text-xs font-black border border-slate-100 flex items-center justify-center shadow-sm relative z-10`}
                                            >
                                                {page}
                                                {currentPage === page && (
                                                    <motion.div
                                                        layoutId="activePageIndicator"
                                                        className="absolute inset-0 rounded-xl bg-slate-900 -z-10"
                                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                    />
                                                )}
                                            </motion.button>
                                        ))}
                                    </AnimatePresence>
                                );
                            })()}
                        </div>

                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 disabled:opacity-30 transition-all shadow-sm"
                        >
                            <ChevronLeft className="w-4 h-4 rotate-180" />
                        </button>
                    </div>
                )}
            </div>
            <MobileNav />
        </div >
    );
}
