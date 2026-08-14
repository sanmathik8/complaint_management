'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Bell, Check, Inbox, Zap, ArrowRight,
    ShieldCheck, Trash2, Clock
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
    getNotifications, markNotificationRead, markAllNotificationsRead,
    deleteAllNotifications, Notification
} from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const router = useRouter();

    const fetchNotifications = async () => {
        try {
            const data = await getNotifications();
            setNotifications(data);
        } catch (err) {
            console.error('Failed to sync incoming signals');
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 15000); // Increased frequency to 15s

        const handleGlobalSync = () => fetchNotifications();
        window.addEventListener('notificationsSync', handleGlobalSync);

        return () => {
            clearInterval(interval);
            window.removeEventListener('notificationsSync', handleGlobalSync);
        };
    }, []);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="relative">
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/dashboard/notifications')}
                className="relative w-12 h-12 rounded-2xl border border-slate-100 bg-white text-slate-400 hover:text-indigo-600 hover:shadow-lg hover:shadow-indigo-50 transition-all flex items-center justify-center"
            >
                <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'animate-pulse' : ''}`} />
                <AnimatePresence>
                    {unreadCount > 0 && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white shadow-lg"
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>
        </div>
    );
}
