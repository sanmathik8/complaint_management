'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PlusCircle, HelpCircle, User, Search } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MobileNav() {
    const pathname = usePathname();
    const [isStaff, setIsStaff] = React.useState(false);

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                setIsStaff(user.is_staff || user.is_superuser || user.is_principal);
            }
        }
    }, []);

    const navItems = [
        { icon: Home, label: 'Home', href: '/dashboard' },
        ...(!isStaff ? [
            { icon: Search, label: 'Track', href: '/complaints/status' },
            { icon: PlusCircle, label: 'New', href: '/complaints/new', primary: true },
            { icon: HelpCircle, label: 'Help', href: '/help' },
        ] : []),
        { icon: User, label: 'Profile', href: '/profile' },
    ];

    return (
        <div className="fixed bottom-6 left-6 right-6 z-[100] md:hidden">
            <motion.nav
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-white/80 backdrop-blur-2xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2.5rem] px-4 py-3 flex items-center justify-between relative overflow-hidden"
            >
                {/* Glassy Background highlight */}
                <div className="absolute inset-0 bg-gradient-to-t from-indigo-50/50 to-transparent pointer-events-none" />

                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    if (item.primary) {
                        return (
                            <Link key={item.href} href={item.href} className="relative -top-4">
                                <motion.div
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-900/40 border-4 border-white"
                                >
                                    <Icon className="w-6 h-6" />
                                </motion.div>
                            </Link>
                        );
                    }

                    return (
                        <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1 flex-1 relative z-10">
                            <motion.div
                                whileTap={{ scale: 0.8 }}
                                className={`p-2 rounded-xl transition-colors ${isActive ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : ''}`} />
                            </motion.div>
                            <span className={`text-[8px] font-black uppercase tracking-widest ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </motion.nav>
        </div>
    );
}
