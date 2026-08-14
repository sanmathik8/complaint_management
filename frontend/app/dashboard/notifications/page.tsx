'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Bell, Check, ChevronLeft, Calendar, AlertCircle, MessageSquare,
    Shield, Clock, Loader2, Trash2, ShieldCheck, Zap, Inbox, Trash
} from 'lucide-react';
import {
    getNotifications, markNotificationRead, markAllNotificationsRead,
    deleteAllNotifications, deleteNotification, Notification
} from '@/lib/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import MobileNav from '@/components/MobileNav';

export default function NotificationsPage() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        try {
            const data = await getNotifications();
            setNotifications(data);
        } catch (err) {
            toast.error('Failed to load notifications');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const syncBadge = () => {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('notificationsSync'));
        }
    };

    const handleMarkRead = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await markNotificationRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            syncBadge();
        } catch (err) {
            toast.error('Failed to update');
        }
    };

    const handleDelete = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await deleteNotification(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
            toast.success('Signal purged');
            syncBadge();
        } catch (err) {
            toast.error('Purge failed');
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllNotificationsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            toast.success('All signals cleared');
            syncBadge();
        } catch (error) {
            toast.error('Bulk clearance failed');
        }
    };

    const handleDeleteAll = async () => {
        if (!confirm('This will permanently purge your entire archive. Proceed?')) return;
        try {
            await deleteAllNotifications();
            setNotifications([]);
            toast.success('Archive purged');
            syncBadge();
        } catch (error) {
            toast.error('Purge failed');
        }
    };

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.is_read) {
            await markNotificationRead(notification.id);
            setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
        }

        if (notification.notification_type === 'general') {
            router.push('/dashboard/broadcasts');
        } else if (notification.complaint) {
            router.push(`/dashboard/complaints/${notification.complaint}`);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'reply': return <MessageSquare className="w-5 h-5 text-indigo-500" />;
            case 'status': return <Clock className="w-5 h-5 text-amber-500" />;
            case 'general': return <Bell className="w-5 h-5 text-purple-500" />;
            case 'escalation': return <AlertCircle className="w-5 h-5 text-rose-500" />;
            default: return <Shield className="w-5 h-5 text-slate-400" />;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased pb-24">
            {/* Header */}
            <div className="bg-white border-b border-slate-100 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
                    <Link href="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors group">
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Dashboard</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="hidden md:flex items-center gap-2 px-6 py-2.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-indigo-100/50"
                            >
                                <Check className="w-4 h-4" />
                                Read All
                            </button>
                        )}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100/50">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <h1 className="font-black text-lg sm:text-xl tracking-tight text-slate-900 uppercase">Notifications</h1>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
                {/* Bulk Actions Bar */}
                {notifications.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3">
                            <Zap className="w-4 h-4 text-indigo-600" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {unreadCount} Active Signals
                            </span>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                                onClick={handleMarkAllRead}
                                disabled={unreadCount === 0}
                                className={`flex-1 sm:flex-none px-6 py-3 rounded-2xl transition-all uppercase tracking-widest flex items-center justify-center gap-2 border ${unreadCount > 0
                                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg shadow-indigo-100 hover:bg-indigo-700'
                                    : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-50'}`}
                            >
                                <Check className="w-3.5 h-3.5" />
                                Read All
                            </button>
                            <button
                                onClick={handleDeleteAll}
                                className="px-4 py-3 bg-rose-50 hover:bg-rose-500 text-rose-500 hover:text-white rounded-2xl transition-all border border-rose-100 shadow-sm"
                                title="Purge Archive"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {notifications.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-[2.5rem] border border-slate-100 p-12 sm:p-20 text-center space-y-6 shadow-sm"
                    >
                        <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto text-slate-200 mb-6 border border-slate-100 ring-4 ring-white">
                            <Inbox className="w-10 h-10" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Signal Silence</h2>
                        <p className="text-slate-400 font-bold text-xs max-w-sm mx-auto uppercase tracking-widest leading-relaxed">
                            Your investigative archive is currently empty.
                        </p>
                    </motion.div>
                ) : (
                    <div className="space-y-4">
                        <AnimatePresence mode="popLayout">
                            {notifications.map((notif, idx) => (
                                <motion.div
                                    key={notif.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -100 }}
                                    transition={{ delay: idx * 0.05 }}
                                    onClick={() => handleNotificationClick(notif)}
                                    className={`group relative bg-white border rounded-[2rem] p-6 sm:p-8 transition-all hover:shadow-xl hover:shadow-slate-200/50 cursor-pointer flex flex-col sm:flex-row gap-6 ${notif.is_read ? 'border-slate-100 opacity-60' : 'border-indigo-100 ring-2 ring-indigo-50/50'}`}
                                >
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${notif.is_read ? 'bg-slate-50 border border-slate-100' : 'bg-white shadow-lg shadow-indigo-100/50 border border-indigo-50'}`}>
                                        {getIcon(notif.notification_type)}
                                    </div>

                                    <div className="flex-1 min-w-0 pr-0 sm:pr-12">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                                            <h3 className={`font-black text-base uppercase tracking-tight truncate ${notif.is_read ? 'text-slate-600' : 'text-slate-900'}`}>
                                                {notif.title}
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-3 h-3 text-slate-300" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                                                    {new Date(notif.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-500 font-medium leading-relaxed line-clamp-2 mb-4">
                                            {notif.message}
                                        </p>

                                        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-50">
                                            <button
                                                onClick={(e) => !notif.is_read && handleMarkRead(notif.id, e)}
                                                disabled={notif.is_read}
                                                className={`py-2.5 px-6 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest border ${notif.is_read
                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100 opacity-80 cursor-default'
                                                    : 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-100'}`}
                                                title={notif.is_read ? "Acknowledged" : "Mark as Read"}
                                            >
                                                {notif.is_read ? <ShieldCheck className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                                                {notif.is_read ? 'Acknowledged' : 'Read Signal'}
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(notif.id, e)}
                                                className="py-2.5 px-4 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest border border-rose-100 hover:border-rose-600"
                                                title="Delete Signal"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Purge
                                            </button>
                                        </div>
                                    </div>

                                    {!notif.is_read && (
                                        <div className="hidden sm:block absolute top-1/2 -left-1 -translate-y-1/2">
                                            <div className="w-2 h-8 bg-indigo-600 rounded-full shadow-lg shadow-indigo-200" />
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
            <MobileNav />
        </div>
    );
}