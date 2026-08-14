'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Megaphone, Calendar, ChevronLeft, Plus, Shield, Search,
    Globe, User, ArrowRight, Bell, Edit2, Trash2, X, Send, Loader2
} from 'lucide-react';
import {
    getAnnouncements, getProfile, updateAnnouncement,
    deleteAnnouncement, Announcement
} from '@/lib/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import MobileNav from '@/components/MobileNav';

export default function BroadcastsPage() {
    const router = useRouter();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    const handleDeleteAnnouncement = async (id: number) => {
        if (!confirm('This will permanently purge this transmission from the archives. Proceed?')) return;
        try {
            await deleteAnnouncement(id);
            setAnnouncements(prev => prev.filter(a => a.id !== id));
            toast.success('Signal Purged');
        } catch (err) {
            toast.error('Purge Failed');
        }
    };

    const handleUpdateAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingAnnouncement) return;

        setIsUpdating(true);
        try {
            const updated = await updateAnnouncement(editingAnnouncement.id, {
                title: editingAnnouncement.title,
                content: editingAnnouncement.content
            });
            setAnnouncements(prev => prev.map(a => a.id === updated.id ? updated : a));
            setEditingAnnouncement(null);
            toast.success('Transmission Updated');
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.detail || 'Update Failed');
        } finally {
            setIsUpdating(false);
        }
    };


    useEffect(() => {
        const fetchData = async () => {
            try {
                const [anns, profile] = await Promise.all([
                    getAnnouncements(),
                    getProfile()
                ]);
                setAnnouncements(anns);
                setUser(profile);
            } catch (error) {
                console.error('Failed to load broadcasts', error);
                toast.error('Intelligence sync failed. Could not retrieve broadcasts.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filteredAnnouncements = announcements.filter(a =>
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const isInternal = user?.is_superuser || user?.is_principal;

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-4 border-indigo-100 border-t-purple-600 rounded-full animate-spin"></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Scanning Airwaves...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-800 p-6 pb-20 font-sans selection:bg-purple-100 selection:text-purple-900">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none opacity-40 overflow-hidden">
                <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[140px]" />
                <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-5xl mx-auto space-y-10 relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm shadow-slate-200/50"
                >
                    <div className="space-y-4">
                        <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-slate-400 hover:text-purple-600 mb-2 transition-all group font-black text-[10px] uppercase tracking-[0.2em]">
                            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                            Dash Home
                        </button>
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 bg-purple-600 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-purple-200">
                                <Megaphone className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-black tracking-tight text-slate-900">Broadcast Hub</h1>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1 flex items-center gap-2">
                                    <Globe className="w-3 h-3 text-purple-400" /> System-Wide Intelligence Feed
                                </p>
                            </div>
                        </div>
                    </div>

                    {isInternal && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => router.push('/dashboard/announcements/new')}
                            className="bg-slate-900 text-white font-black py-4 px-8 rounded-2xl flex items-center gap-3 shadow-2xl shadow-indigo-100 transition-all uppercase text-[10px] tracking-[0.2em]"
                        >
                            <Plus className="w-4 h-4 text-purple-400" />
                            New Transmission
                        </motion.button>
                    )}
                </motion.div>

                {/* Filter / Search Bar */}
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-purple-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Filter archives by topic or keyword..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white border border-slate-100 rounded-[2rem] py-5 px-14 text-sm font-bold focus:outline-none focus:border-purple-500 focus:ring-8 focus:ring-purple-500/5 transition-all shadow-sm"
                        />
                    </div>
                </div>

                {/* Content Grid */}
                <div className="space-y-6">
                    <AnimatePresence mode="popLayout">
                        {filteredAnnouncements.length > 0 ? (
                            filteredAnnouncements.map((ann, i) => (
                                <motion.div
                                    key={ann.id}
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                >
                                    <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-purple-500/10 hover:border-purple-100 transition-all relative overflow-hidden group border-b-8 border-b-transparent hover:border-b-purple-500">
                                        <div className="absolute top-10 right-10 opacity-0 group-hover:opacity-10 transition-opacity">
                                            <Bell className="w-24 h-24 text-purple-600 -rotate-12" />
                                        </div>

                                        <div className="relative z-10 space-y-8">
                                            <div className="flex flex-wrap items-center justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${ann.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                                        {ann.is_active ? 'Live Signal' : 'Archived'}
                                                    </span>
                                                    <div className="h-4 w-[1px] bg-slate-100" />
                                                    <span className="text-[10px] text-slate-400 font-black flex items-center gap-2 uppercase tracking-widest">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {new Date(ann.is_edited ? ann.updated_at : ann.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                                        {ann.is_edited && <span className="text-slate-300 normal-case tracking-normal ml-1">(edited)</span>}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <h2 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight group-hover:text-purple-600 transition-colors">{ann.title}</h2>
                                                <div className="text-slate-600 text-[15px] leading-relaxed font-medium whitespace-pre-wrap max-w-4xl opacity-80 group-hover:opacity-100 transition-all">
                                                    {ann.content}
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-8 border-t border-slate-50">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-purple-100 group-hover:text-purple-600 transition-all border border-slate-100">
                                                        <Shield className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Authorized Source</div>
                                                        <div className="text-xs font-black text-slate-700 flex items-center gap-2">
                                                            {ann.author_name}
                                                            {ann.author_name?.toLowerCase().includes('principal') || ann.author_name?.toLowerCase().includes('admin') ? (
                                                                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {isInternal && (
                                                        <div className="flex items-center gap-2 pr-4 border-r border-slate-100 mr-2">
                                                            <motion.button
                                                                whileHover={{ scale: 1.1 }}
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={() => setEditingAnnouncement(ann)}
                                                                className="p-3 bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all"
                                                                title="Edit Intelligence"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </motion.button>
                                                            <motion.button
                                                                whileHover={{ scale: 1.1 }}
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={() => handleDeleteAnnouncement(ann.id)}
                                                                className="p-3 bg-rose-50 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl transition-all"
                                                                title="Purge Signal"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </motion.button>
                                                        </div>
                                                    )}
                                                    <div className="hidden sm:block">
                                                        <motion.div whileHover={{ x: 5 }} className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-50 text-slate-300 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-sm">
                                                            <ArrowRight className="w-6 h-6" />
                                                        </motion.div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white py-32 rounded-[4rem] border border-dashed border-slate-200 text-center flex flex-col items-center justify-center gap-6 shadow-sm"
                            >
                                <div className="relative">
                                    <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-2xl animate-pulse" />
                                    <div className="relative w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 border border-slate-100">
                                        <Megaphone className="w-10 h-10 opacity-30" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Channel Silent</h3>
                                    <p className="text-xs text-slate-400 font-black uppercase tracking-[0.2em]">No active transmissions matching your search</p>
                                </div>
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="px-8 py-3 bg-slate-50 hover:bg-slate-100 text-slate-500 font-black rounded-xl text-[10px] uppercase tracking-widest transition-all"
                                >
                                    Clear Filters
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Edit Modal Overlay */}
            <AnimatePresence>
                {editingAnnouncement && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-10">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setEditingAnnouncement(null)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-white"
                        >
                            <div className="p-8 sm:p-12 space-y-8">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Edit Announcement</h2>
                                    <button
                                        onClick={() => setEditingAnnouncement(null)}
                                        className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-600 transition-all"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <form onSubmit={handleUpdateAnnouncement} className="space-y-6">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Subject</label>
                                        <input
                                            type="text"
                                            value={editingAnnouncement.title}
                                            onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, title: e.target.value })}
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:border-purple-600 focus:bg-white transition-all outline-none"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Message</label>
                                        <textarea
                                            value={editingAnnouncement.content}
                                            onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, content: e.target.value })}
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] px-6 py-6 text-sm font-medium leading-relaxed resize-none focus:border-purple-600 focus:bg-white transition-all outline-none"
                                            rows={8}
                                            required
                                        />
                                    </div>

                                    <div className="pt-4">
                                        <button
                                            type="submit"
                                            disabled={isUpdating}
                                            className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-purple-600 transition-all shadow-xl disabled:opacity-50"
                                        >
                                            {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                                <>
                                                    <Send className="w-5 h-5" />
                                                    <span className="uppercase text-xs tracking-widest">Update Announcement</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            <MobileNav />
        </div>
    );
}
