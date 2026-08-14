'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HelpCircle,
    Search,
    ChevronDown,
    ChevronRight,
    MessageCircle,
    ShieldCheck,
    Clock,
    FileText,
    ArrowLeft,
    Lock,
    Activity,
    AlertCircle
} from 'lucide-react';
import { getSettings, ComplaintSettings } from '@/lib/api';
import MobileNav from '@/components/MobileNav';
import toast from 'react-hot-toast';

export default function HelpPage() {
    const calligraphyFont = { fontFamily: 'var(--font-cormorant), var(--font-playfair), serif' };
    const [searchQuery, setSearchQuery] = useState('');
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [settings, setSettings] = useState<ComplaintSettings | null>(null);
    const [timeLeft, setTimeLeft] = useState('');

    // Dynamic Timer Logic
    useEffect(() => {
        const updateTimer = () => {
            const now = new Date();
            const target = new Date();

            if (settings?.auto_unfreeze_time) {
                const [hours, minutes] = settings.auto_unfreeze_time.split(':').map(Number);
                target.setHours(hours, minutes, 0, 0);
                if (now >= target) {
                    target.setDate(target.getDate() + 1);
                }
            } else {
                target.setHours(24, 0, 0, 0);
            }

            const diff = target.getTime() - now.getTime();
            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);
            setTimeLeft(`${h}h ${m}m ${s}s`);
        };
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [settings?.auto_unfreeze_time]);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const s = await getSettings();
                setSettings(s);
            } catch (err) {
                console.error("Failed to fetch settings", err);
            }
        };
        fetchSettings();
        const poll = setInterval(fetchSettings, 5000);
        return () => clearInterval(poll);
    }, []);

    // FAQ DATA
    const faqs = [
        {
            category: "General",
            question: "Is my identity truly anonymous?",
            answer: "Yes. SpeakSafe uses a double-blind encryption system. Your student identity is verified upon login to prevent spam, but it is cryptographically decoupled from your complaint submission. Admins only see a randomly generated 'Tracking Code' and 'Session Hash', never your name."
        },
        {
            category: "General",
            question: "Can I check the status of my complaint?",
            answer: "Absolutely. When you submit a complaint, you receive a unique Tracking Code. Use this code on the 'Check Status' page to see real-time updates without logging in, ensuring your continued privacy."
        },
        {
            category: "Submission",
            question: "What kind of proof should I attach?",
            answer: "You can attach images (JPG/PNG). We recommend screenshotting relevant messages or taking photos of the incident. Please blur out faces of bystanders or sensitive personal info unrelated to the case."
        },
        {
            category: "Submission",
            question: "What if I lose my Tracking Code?",
            answer: "For security reasons, Tracking Codes cannot be recovered once lost. This ensures that no one—not even admins—can trace a report back to you. We strongly recommend saving your code immediately."
        },
        {
            category: "Process",
            question: "Why is the system sometimes 'Frozen'?",
            answer: "To ensure every report gets the attention it deserves, the Principal may temporarily 'Freeze' the intake vault if volume is exceptionally high. This allows the administrative team to clear the backlog before accepting new reports. The system automatically unfreezes at the scheduled reset time."
        },
        {
            category: "Process",
            question: "How long does a review take?",
            answer: "Initial review typically happens within 24-48 hours. Complex investigations may take up to 10 days. If a deadline is missed, the system automatically escalates the priority."
        },
        {
            category: "Safety",
            question: "What if I am in immediate danger?",
            answer: "This platform is for reporting non-emergency grievances. If you or someone else is in immediate physical danger, please contact Campus Security or local emergency services immediately."
        }
    ];

    const filteredFaqs = faqs.filter(f =>
        f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen w-full bg-[#F8F7FF] relative overflow-hidden font-sans p-6 md:p-12 pb-24">

            {/* DECORATIVE BACKGROUND */}
            <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-100/50 rounded-full blur-[120px] -z-10" />
            <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-50/50 rounded-full blur-[120px] -z-10" />

            <div className="max-w-4xl mx-auto">

                {/* NAV */}
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-stone-500 hover:text-purple-900 transition-colors uppercase tracking-widest text-xs font-bold mb-8 md:mb-12"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                </Link>

                {/* HEADER */}
                <header className="text-center mb-10 md:mb-16">
                    {settings?.is_frozen && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-rose-50 border border-rose-100 p-4 rounded-2xl mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-2xl mx-auto"
                        >
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center shadow-lg shadow-rose-200 shrink-0">
                                    <Lock className="w-5 h-5 text-white" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest leading-none mb-1">Vault Lockdown</p>
                                    <p className="text-xs font-bold text-rose-900">System is currently frozen.</p>
                                </div>
                            </div>
                            <div className="text-right w-full sm:w-auto flex flex-row sm:flex-col justify-between sm:justify-center items-center sm:items-end border-t sm:border-t-0 border-rose-100 pt-3 sm:pt-0 mt-2 sm:mt-0">
                                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest leading-none mb-0 sm:mb-1">Unfreezes In</p>
                                <p className="text-xs font-black text-rose-900 tabular-nums">{timeLeft}</p>
                            </div>
                        </motion.div>
                    )}

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center justify-center p-3 md:p-4 bg-white shadow-xl rounded-2xl mb-6 text-purple-900"
                    >
                        <HelpCircle className="w-6 h-6 md:w-8 md:h-8" />
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={calligraphyFont}
                        className="text-4xl md:text-7xl text-purple-950 italic mb-6 leading-tight"
                    >
                        How can we <span className="not-italic font-light text-purple-900/40">help?</span>
                    </motion.h1>
                </header>

                {/* FAQ LIST */}
                <div className="space-y-4">
                    {filteredFaqs.length > 0 ? (
                        filteredFaqs.map((faq, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="bg-white/60 backdrop-blur-sm border border-white/60 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow duration-300"
                            >
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full px-5 py-4 md:px-6 md:py-5 text-left flex items-start md:items-center justify-between gap-4"
                                >
                                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                                        <span className="self-start px-2 py-1 bg-purple-50 text-purple-900 text-[10px] font-bold uppercase tracking-wider rounded-md border border-purple-100/50 shrink-0">
                                            {faq.category}
                                        </span>
                                        <h3 className="text-base md:text-lg font-medium text-purple-950 leading-snug">
                                            {faq.question}
                                        </h3>
                                    </div>
                                    <div className={`p-1 rounded-full bg-white shadow-sm border border-stone-100 text-stone-400 transition-transform duration-300 shrink-0 mt-0.5 md:mt-0 ${openFaq === i ? 'rotate-180 bg-purple-950 text-white border-purple-950' : ''}`}>
                                        <ChevronDown className="w-4 h-4" />
                                    </div>
                                </button>

                                <AnimatePresence>
                                    {openFaq === i && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden bg-white/50"
                                        >
                                            <div className="px-5 pb-5 md:px-6 md:pb-6 pt-2 text-sm md:text-base text-stone-500 leading-relaxed border-t border-purple-50">
                                                {faq.answer}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))
                    ) : (
                        <div className="text-center py-12 text-stone-400">
                            <p>No results found for "{searchQuery}"</p>
                        </div>
                    )}
                </div>

                {/* QUICK LINKS GRID */}
                <div className="mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                    {[
                        { title: "Complaint Guide", icon: FileText, desc: "See step-by-step instructions", link: "/support" }
                    ].map((item, i) => (
                        <Link href={item.link} key={i}>
                            <motion.div
                                whileHover={{ y: -5 }}
                                className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-stone-50 hover:shadow-xl hover:border-purple-100 transition-all cursor-pointer h-full"
                            >
                                <div className="p-3 bg-purple-50 w-fit rounded-xl text-purple-900 mb-4">
                                    <item.icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-stone-800 mb-1">{item.title}</h3>
                                <p className="text-sm text-stone-500">{item.desc}</p>
                            </motion.div>
                        </Link>
                    ))}
                </div>



            </div>
            <MobileNav />
        </div>
    );
}
