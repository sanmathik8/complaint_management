"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    AlertTriangle, Clock, ChevronRight, ArrowLeft,
    CheckCircle, Filter, RefreshCw, ShieldOff, FileText,
    Flame, AlertCircle,
} from "lucide-react";
import { getMyComplaints, Complaint } from "@/lib/api";

type FilterType = "all" | "escalated" | "overdue" | "critical";

const FILTER_LABELS: Record<FilterType, string> = {
    all: "All Critical",
    escalated: "Escalated",
    overdue: "Overdue",
    critical: "High Severity",
};

export default function AttentionPage() {
    const router = useRouter();
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [status, setStatus] = useState<"loading" | "ready" | "error" | "forbidden">("loading");
    const [errorMsg, setErrorMsg] = useState("");
    const [filter, setFilter] = useState<FilterType>("all");
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async (silent = false) => {
        if (!silent) setStatus("loading");
        else setRefreshing(true);
        try {
            const data = await getMyComplaints();
            setComplaints(data);
            setStatus("ready");
        } catch (err: any) {
            const code = err?.response?.status;
            if (code === 401) {
                router.replace("/login");
            } else if (code === 403) {
                setStatus("forbidden");
            } else {
                setErrorMsg(err?.message || "Failed to load complaints.");
                setStatus("error");
            }
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) { router.replace("/login"); return; }

        const userStr = localStorage.getItem("user");
        if (userStr) {
            const u = JSON.parse(userStr);
            if (!u.is_staff && !u.is_superuser && !u.is_principal) {
                setStatus("forbidden");
                return;
            }
        }

        loadData();
    }, []);

    // Filter logic
    const criticalItems = complaints.filter((c) =>
        c.status === "escalated" ||
        (c.days_until_deadline !== undefined && c.days_until_deadline < 0) ||
        c.severity_display?.toLowerCase() === "critical" ||
        (c.escalation_level !== undefined && c.escalation_level > 0)
    );

    const filtered = criticalItems.filter((c) => {
        if (filter === "escalated") return c.status === "escalated" || (c.escalation_level !== undefined && c.escalation_level > 0);
        if (filter === "overdue") return c.days_until_deadline !== undefined && c.days_until_deadline < 0;
        if (filter === "critical") return c.severity_display?.toLowerCase() === "critical";
        return true;
    });

    const counts: Record<FilterType, number> = {
        all: criticalItems.length,
        escalated: criticalItems.filter((c) => c.status === "escalated" || (c.escalation_level !== undefined && c.escalation_level > 0)).length,
        overdue: criticalItems.filter((c) => c.days_until_deadline !== undefined && c.days_until_deadline < 0).length,
        critical: criticalItems.filter((c) => c.severity_display?.toLowerCase() === "critical").length,
    };

    const getBadgeType = (c: Complaint): { label: string; color: string } => {
        if (c.status === "escalated" || (c.escalation_level !== undefined && c.escalation_level > 0)) {
            return { label: "ESCALATED", color: "bg-rose-100 text-rose-700 border-rose-200" };
        }
        if (c.days_until_deadline !== undefined && c.days_until_deadline < 0) {
            return { label: `OVERDUE ${Math.abs(c.days_until_deadline)}d`, color: "bg-amber-100 text-amber-700 border-amber-200" };
        }
        return { label: "HIGH SEVERITY", color: "bg-orange-100 text-orange-700 border-orange-200" };
    };

    /* ── Loading ── */
    if (status === "loading") {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">
                        Loading critical reports…
                    </p>
                </div>
            </div>
        );
    }

    /* ── Forbidden ── */
    if (status === "forbidden") {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="flex flex-col items-center gap-5 max-w-sm text-center">
                    <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center">
                        <ShieldOff className="text-amber-500" size={28} />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900">Access Restricted</h1>
                    <p className="text-sm text-slate-500">
                        This page is only accessible to administrators and the principal.
                    </p>
                    <button
                        onClick={() => router.replace("/dashboard")}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition"
                    >
                        <ArrowLeft size={16} /> Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    /* ── Error ── */
    if (status === "error") {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="flex flex-col items-center gap-5 max-w-sm text-center">
                    <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center">
                        <AlertCircle className="text-rose-500" size={28} />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900">Something Went Wrong</h1>
                    <p className="text-sm text-slate-500">{errorMsg}</p>
                    <button
                        onClick={() => loadData()}
                        className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white rounded-xl font-semibold text-sm hover:bg-rose-700 transition"
                    >
                        <RefreshCw size={15} /> Retry
                    </button>
                </div>
            </div>
        );
    }

    /* ── Ready ── */
    return (
        <div className="min-h-screen bg-slate-50 pb-16">
            {/* Ambient glow */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/5 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* ── Header ── */}
                <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-indigo-600 transition mb-5"
                    >
                        <ArrowLeft size={14} /> Back to Dashboard
                    </Link>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200">
                                <Flame className="text-white" size={22} />
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                                    Attention Required
                                </h1>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                    Escalated &amp; Overdue Reports
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => loadData(true)}
                            disabled={refreshing}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition shadow-sm disabled:opacity-50"
                        >
                            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
                            Refresh
                        </button>
                    </div>
                </motion.div>

                {/* ── Summary Badges ── */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
                >
                    {(Object.keys(FILTER_LABELS) as FilterType[]).map((key) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`rounded-2xl px-4 py-3 text-left border transition-all shadow-sm ${filter === key
                                    ? "bg-rose-600 border-rose-600 text-white shadow-rose-200"
                                    : "bg-white border-slate-200 text-slate-700 hover:border-rose-200"
                                }`}
                        >
                            <div className={`text-xl font-black ${filter === key ? "text-white" : "text-slate-900"}`}>
                                {counts[key]}
                            </div>
                            <div className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${filter === key ? "text-rose-100" : "text-slate-400"}`}>
                                {FILTER_LABELS[key]}
                            </div>
                        </button>
                    ))}
                </motion.div>

                {/* ── Filter Label ── */}
                <div className="flex items-center gap-2 mb-4 px-1">
                    <Filter size={13} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Showing: {FILTER_LABELS[filter]} ({filtered.length})
                    </span>
                </div>

                {/* ── List ── */}
                <AnimatePresence mode="popLayout">
                    {filtered.length === 0 ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="bg-white rounded-3xl border border-dashed border-slate-200 py-20 flex flex-col items-center justify-center gap-4 text-center"
                        >
                            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center">
                                <CheckCircle className="text-emerald-600" size={26} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900">All Clear!</h3>
                                <p className="text-xs text-slate-400 mt-1">No {FILTER_LABELS[filter].toLowerCase()} reports found.</p>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="space-y-3">
                            {filtered.map((c, i) => {
                                const badge = getBadgeType(c);
                                const isEscalated = c.status === "escalated" || (c.escalation_level !== undefined && c.escalation_level > 0);

                                return (
                                    <motion.div
                                        key={c.complaint_id}
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ delay: i * 0.04 }}
                                        onClick={() => router.push(`/dashboard/complaints/${c.complaint_id}`)}
                                        className="group bg-white rounded-2xl border border-slate-100 hover:border-rose-200 shadow-sm hover:shadow-lg hover:shadow-rose-50 transition-all cursor-pointer relative overflow-hidden"
                                    >
                                        {/* Left accent bar */}
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 transition-opacity ${isEscalated ? "bg-rose-500 opacity-100" : "bg-amber-400 opacity-60 group-hover:opacity-100"}`} />

                                        <div className="pl-5 pr-4 py-4 flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-4 min-w-0">
                                                {/* Icon */}
                                                <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${isEscalated ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"}`}>
                                                    {isEscalated ? (
                                                        <AlertTriangle size={18} className="animate-pulse" />
                                                    ) : (
                                                        <Clock size={18} />
                                                    )}
                                                </div>

                                                {/* Info */}
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                        <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest">
                                                            #{c.tracking_code}
                                                        </span>
                                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${badge.color}`}>
                                                            {badge.label}
                                                        </span>
                                                        {c.status === "reviewing" || c.status === "pending" ? (
                                                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border bg-sky-50 text-sky-600 border-sky-100">
                                                                {c.status}
                                                            </span>
                                                        ) : null}
                                                    </div>

                                                    <h3 className="font-bold text-sm text-slate-900 truncate">{c.category.name}</h3>

                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                                            <FileText size={10} />
                                                            {new Date(c.created_at).toLocaleDateString("en-US", {
                                                                day: "numeric", month: "short", year: "numeric"
                                                            })}
                                                        </span>
                                                        {c.days_until_deadline !== undefined && (
                                                            <span className={`text-[10px] font-bold flex items-center gap-1 ${c.days_until_deadline < 0 ? "text-rose-500" : "text-slate-400"}`}>
                                                                <Clock size={10} />
                                                                {c.days_until_deadline < 0
                                                                    ? `${Math.abs(c.days_until_deadline)}d overdue`
                                                                    : `${c.days_until_deadline}d left`}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Arrow */}
                                            <div className="shrink-0 w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-rose-600 group-hover:text-white group-hover:border-rose-600 transition-all">
                                                <ChevronRight size={16} />
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
}
