'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    ShieldAlert,
    UserX,
    FileText,
    Eye,
    MessageSquareX,
    Copy,
    Lock,
    Info,
    Siren,
    HeartHandshake,
    ArrowLeft,
    CheckCircle2
} from 'lucide-react';

export default function SupportPage() {
    const calligraphyFont = { fontFamily: 'var(--font-cormorant), var(--font-playfair), serif' };

    const rules = [
        {
            title: "Zero Tolerance for False Claims",
            desc: "Submitting knowingly false information is a serious violation. Reports must be factual and honest.",
            icon: ShieldAlert,
            color: "text-red-500",
            bg: "bg-red-50"
        },
        {
            title: "Identity Integrity",
            desc: "Never impersonate other students, staff, or faculty members. You may remain anonymous, but do not claim to be someone else.",
            icon: UserX,
            color: "text-purple-600",
            bg: "bg-purple-50"
        },
        {
            title: "Topic Relevance",
            desc: "Complaints must pertain to campus safety, misconduct, academic integrity, or institutional grievances.",
            icon: FileText,
            color: "text-blue-600",
            bg: "bg-blue-50"
        },
        {
            title: "Evidence & Privacy",
            desc: "Attach proof (screenshots, photos) if available, but please blur unrelated private details or faces of bystanders.",
            icon: Eye,
            color: "text-emerald-600",
            bg: "bg-emerald-50"
        },
        {
            title: "Respectful Language",
            desc: "While documenting issues, avoid using unnecessary abusive language, hate speech, or profanity.",
            icon: MessageSquareX,
            color: "text-amber-600",
            bg: "bg-amber-50"
        },
        {
            title: "No Duplicate Spam",
            desc: "Do not submit the same complaint multiple times. Use your Tracking Code to follow up on existing reports.",
            icon: Copy,
            color: "text-indigo-600",
            bg: "bg-indigo-50"
        },
        {
            title: "Maintain Confidentiality",
            desc: "Protect your own anonymity. Do not share your Tracking Code or Session Hash with anyone else.",
            icon: Lock,
            color: "text-slate-600",
            bg: "bg-slate-100"
        },
        {
            title: "Firsthand Information",
            desc: "Report firsthand experiences or verified facts rather than rumors or unverified hearsay.",
            icon: Info,
            color: "text-cyan-600",
            bg: "bg-cyan-50"
        },
        {
            title: "Emergency Situations",
            desc: "This platform is not for immediate life-threatening emergencies. Call Campus Security or Police for immediate danger.",
            icon: Siren,
            color: "text-rose-600",
            bg: "bg-rose-50"
        },
        {
            title: "Constructive Intent",
            desc: "Use this tool to build a safer, better community. Do not use it solely for personal vendettas or harassment.",
            icon: HeartHandshake,
            color: "text-violet-600",
            bg: "bg-violet-50"
        },
        {
            title: "Escalation Errors",
            desc: "If you see 'Escalation Failed' (Error 500), it typically means the server is momentarily overloaded or maintenance is in progress. Please retry after some time.",
            icon: ShieldAlert,
            color: "text-red-500",
            bg: "bg-red-50"
        },
        {
            title: "Resolution Protocol",
            desc: "Once your issue has been addressed to your satisfaction, please mark the complaint as 'Resolved' in your dashboard to help us prioritize active cases.",
            icon: CheckCircle2,
            color: "text-green-600",
            bg: "bg-green-50"
        }
    ];

    return (
        <div className="min-h-screen w-full bg-[#F8F7FF] relative overflow-hidden font-sans p-6 md:p-12">

            {/* DECORATIVE BG */}
            <div className="fixed top-[-10%] right-[-5%] w-[40%] h-[40%] bg-purple-100 rounded-full blur-[120px] -z-10" />
            <div className="fixed bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-indigo-50 rounded-full blur-[120px] -z-10" />

            <div className="max-w-5xl mx-auto">

                {/* NAV */}
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-stone-500 hover:text-purple-900 transition-colors uppercase tracking-widest text-xs font-bold mb-12"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                </Link>

                {/* HEADER */}
                <header className="mb-16">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={calligraphyFont}
                        className="text-5xl md:text-7xl text-purple-950 italic mb-6 leading-tight"
                    >
                        Guidelines <span className="not-italic text-stone-300">&</span> Protocols
                    </motion.h1>
                    <p className="max-w-2xl text-stone-500 text-lg leading-relaxed">
                        To maintain a safe and trusted environment, all reports are subject to the following community standards.
                        Please review them carefully before submitting a complaint.
                    </p>
                </header>

                {/* RULES GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {rules.map((rule, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="group bg-white/60 backdrop-blur-md border border-white/50 p-6 rounded-3xl hover:shadow-[0_10px_40px_-10px_rgba(120,50,255,0.1)] hover:bg-white transition-all duration-300"
                        >
                            <div className="flex items-start gap-5">
                                <div className={`p-3.5 rounded-2xl ${rule.bg} ${rule.color} group-hover:scale-110 transition-transform`}>
                                    <rule.icon className="w-6 h-6" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-semibold text-purple-950 font-serif tracking-tight">
                                        {rule.title}
                                    </h3>
                                    <p className="text-stone-500 text-sm leading-relaxed">
                                        {rule.desc}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* BOTTOM CTA */}
                <div className="mt-16 flex justify-center">
                    <Link href="/complaints/new">
                        <button className="px-8 py-4 bg-purple-950 text-white rounded-full font-bold uppercase tracking-widest text-xs hover:bg-purple-900 hover:shadow-xl transition-all flex items-center gap-3">
                            <CheckCircle2 className="w-4 h-4" />
                            I Understand - Start Report
                        </button>
                    </Link>
                </div>

                {/* FOOTER */}
                <footer className="mt-24 text-center border-t border-purple-900/5 pt-12">
                    <p className="text-stone-400 text-xs uppercase tracking-widest">
                        SpeakSafe Community Standards • 2026
                    </p>
                </footer>

            </div>
        </div>
    );
}
