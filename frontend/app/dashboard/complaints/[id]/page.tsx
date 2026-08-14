'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
    Clock, CheckCircle, AlertTriangle, MessageSquare, Shield, FileText, User,
    ChevronLeft, AlertCircle, Eye, Calendar, Send, Loader2, Pencil, Trash2, X, Save, ArrowRight,
    Terminal, HardDrive, History, Lock, Activity, XCircle, Check, ThumbsUp, Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getComplaintDetail, Complaint, replyToComplaint, studentReplyToComplaint, resolveComplaint, updateComplaint, deleteComplaint, escalateComplaint, updateDeadline, markComplaintAsRead, upvoteComplaint } from '@/lib/api';
import toast from 'react-hot-toast';
import MobileNav from '@/components/MobileNav';

export default function ComplaintDetailPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const [complaint, setComplaint] = useState<Complaint | null>(null);
    const [loading, setLoading] = useState(true);
    const [replyContent, setReplyContent] = useState('');
    const [isReplying, setIsReplying] = useState(false);
    const [studentReplyContent, setStudentReplyContent] = useState('');
    const [isStudentReplying, setIsStudentReplying] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEscalating, setIsEscalating] = useState(false);



    useEffect(() => {
        if (typeof window !== 'undefined') {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                setIsAdmin(user.is_staff || user.is_superuser || user.is_principal);
                setIsSuperAdmin(user.is_superuser);
            }
        }

        const fetchComplaint = async () => {
            try {
                const id = Array.isArray(params.id) ? params.id[0] : params.id;
                const code = searchParams.get('code');
                if (!id) return;
                const data = await getComplaintDetail(id, code || undefined);
                setComplaint(data);

                if (data.status === 'pending' && (
                    JSON.parse(localStorage.getItem('user') || '{}').is_staff ||
                    JSON.parse(localStorage.getItem('user') || '{}').is_principal
                )) {
                    markComplaintAsRead(data.complaint_id).then(res => {
                        if (res.new_status === 'reviewing') {
                            setComplaint(prev => prev ? ({ ...prev, status: 'reviewing', status_display: 'Under Review' }) : null);
                            toast('Review Started', { icon: '👁️' });
                        }
                    }).catch(() => { });
                }
            } catch (error: any) {
                if (error.response?.status === 401) return;
                if (error.response?.status === 404 || error.response?.status === 403) {
                    toast.error('Access Denied: You cannot view this encrypted record.');
                } else {
                    toast.error('Failed to decrypt record details');
                }
            } finally {
                setLoading(false);
            }
        };

        if (params.id) fetchComplaint();
    }, [params.id, router, searchParams]);

    const handleResolve = async () => {
        if (!complaint) return;
        if (!confirm('Resolve this case? All verified actions will be archived.')) return;
        try {
            const code = searchParams.get('code');
            await resolveComplaint(complaint.complaint_id, code || undefined);
            toast.success('Case marked as CLOSED');
            const updated = await getComplaintDetail(complaint.complaint_id, code || undefined);
            setComplaint(updated);
        } catch (err) {
            toast.error('Resolution failed');
        }
    };

    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyContent.trim()) return;
        setIsReplying(true);
        try {
            await replyToComplaint(complaint?.complaint_id!, replyContent);
            toast.success('Reply sent successfully');
            setReplyContent('');
            const data = await getComplaintDetail(complaint?.complaint_id!);
            setComplaint(data);
        } catch (error) {
            toast.error('Failed to send reply');
        } finally {
            setIsReplying(false);
        }
    };

    const handleStudentReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentReplyContent.trim() || !complaint) return;
        setIsStudentReplying(true);
        try {
            await studentReplyToComplaint(complaint.complaint_id, studentReplyContent);
            toast.success('Your reply has been sent to the principal!');
            setStudentReplyContent('');
            const data = await getComplaintDetail(complaint.complaint_id);
            setComplaint(data);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to send reply');
        } finally {
            setIsStudentReplying(false);
        }
    };

    const handleEditUpdate = async () => {
        if (!editContent.trim()) return;
        setIsUpdating(true);
        try {
            const id = complaint?.complaint_id!;
            const code = searchParams.get('code');
            await updateComplaint(id, { content: editContent }, code || undefined);
            toast.success('Changes saved');
            setEditMode(false);
            const data = await getComplaintDetail(id, code || undefined);
            setComplaint(data);
        } catch (error: any) {
            toast.error(error.response?.data?.[0] || 'Update failed');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Permanent purge of this record? This cannot be undone.')) return;
        setIsDeleting(true);
        try {
            const id = complaint?.complaint_id!;
            const code = searchParams.get('code');
            await deleteComplaint(id, code || undefined);
            toast.success('Report deleted');
            router.push('/dashboard');
        } catch (error) {
            toast.error('Purge failed');
            setIsDeleting(false);
        }
    };

    const handleUpvote = async () => {
        if (isAdmin) return;
        try {
            await upvoteComplaint(complaint?.complaint_id!);
            toast.success('Support added!');
            const data = await getComplaintDetail(complaint?.complaint_id!, searchParams.get('code') || undefined);
            setComplaint(data);
        } catch (e: any) {
            toast.error(e.response?.data?.status === 'already upvoted' ? 'You already upvoted this' : 'Action failed');
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return <Clock className="w-5 h-5 text-amber-500 animate-pulse" />;
            case 'reviewing': return <Eye className="w-5 h-5 text-sky-500" />;
            case 'resolved': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
            default: return <AlertCircle className="w-5 h-5 text-slate-400" />;
        }
    };

    const getSeverityBadge = (severity: string) => {
        const styles = {
            low: 'bg-slate-50 text-slate-500 border-slate-100',
            medium: 'bg-sky-50 text-sky-600 border-sky-100',
            high: 'bg-amber-50 text-amber-600 border-amber-100',
            critical: 'bg-rose-50 text-rose-600 border-rose-100 shadow-sm shadow-rose-100'
        };
        const style = styles[severity.toLowerCase() as keyof typeof styles] || styles.low;
        return (
            <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full border ${style} tracking-widest`}>
                {severity}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-black text-xs uppercase tracking-widest animate-pulse">Loading Details...</p>
            </div>
        );
    }

    if (!complaint) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-24 h-24 bg-white shadow-2xl rounded-[2.5rem] flex items-center justify-center mb-8 border border-slate-100 ring-8 ring-indigo-50/50"
                >
                    <Lock className="w-10 h-10 text-indigo-600" />
                </motion.div>
                <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Access Restricted</h1>
                <p className="text-slate-500 mb-10 max-w-sm font-bold uppercase tracking-wider text-xs leading-relaxed">
                    Identity mismatch or expired session detected. Secure connection could not be established.
                </p>
                <Link href="/dashboard" className="px-10 py-5 bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-slate-200">
                    Go Back Home
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 p-6 pb-32 font-sans selection:bg-indigo-100 selection:text-indigo-900">
            {/* Background elements */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-40">
                <div className="absolute top-0 right-[5%] w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[140px]" />
                <div className="absolute bottom-[10%] left-[5%] w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-6xl mx-auto space-y-8 relative z-10">
                {/* Header Actions */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white/60 backdrop-blur-md p-6 rounded-[2rem] border border-white/50 shadow-sm"
                >
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-3 text-slate-400 hover:text-indigo-600 transition-colors group font-black text-[10px] uppercase tracking-[0.2em]"
                    >
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        Back to Dashboard
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-full shadow-lg shadow-indigo-100 ring-4 ring-indigo-50">
                            <Shield className="w-4 h-4" />
                            <span className="text-[10px] font-black tracking-widest uppercase">Secure Report</span>
                        </div>
                        <div className="h-6 w-[1px] bg-slate-100 mx-2" />
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest font-mono select-all">Report ID: {complaint.complaint_id.slice(0, 12)}</span>
                    </div>
                </motion.div>

                {/* Main Content Dashboard */}
                <div className="bg-white border border-slate-100 rounded-[3.5rem] shadow-sm overflow-hidden ring-1 ring-slate-100">
                    {/* Visual Status Banner */}
                    <div className="bg-[#1e293b] p-10 lg:p-14 border-b border-indigo-900/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative overflow-hidden">
                        <div className="absolute inset-0 pointer-events-none opacity-20">
                            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.2),transparent_70%)]" />
                            <div className="absolute -bottom-1/2 -left-1/4 w-[50%] h-full bg-indigo-600/10 rounded-full blur-[100px]" />
                        </div>

                        <div className="relative z-10 space-y-4">
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-3 px-4 py-2 bg-indigo-500/20 backdrop-blur-xl border border-indigo-500/30 rounded-xl group hover:bg-indigo-500/30 transition-all cursor-pointer"
                                    onClick={() => {
                                        navigator.clipboard.writeText(complaint.tracking_code);
                                        toast.success('Tracking Code Copied!');
                                    }}
                                >
                                    <span className="font-mono text-[12px] font-black tracking-[0.2em] text-indigo-300 select-all uppercase">
                                        {complaint.tracking_code}
                                    </span>
                                    <Copy className="w-3.5 h-3.5 text-indigo-400 group-hover:text-white transition-colors" />
                                </div>
                                {complaint.is_edited && (
                                    <span className="px-3 py-1.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">
                                        Modifed
                                    </span>
                                )}
                                {(complaint.escalation_level ?? 0) > 0 && (
                                    <span className="px-3 py-1.5 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-rose-900/20">
                                        Critical x{complaint.escalation_level}
                                    </span>
                                )}
                            </div>
                            <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight flex items-center gap-4">
                                <span className="text-5xl lg:text-6xl filter drop-shadow-lg">{complaint.category.icon}</span>
                                {complaint.category.name} Report
                            </h1>
                        </div>

                        <div className="relative z-10 flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-3 bg-white/5 backdrop-blur-xl p-2 rounded-[2rem] border border-white/10">
                                {getSeverityBadge(complaint.severity_display)}
                                <div className="px-5 py-2.5 bg-white text-slate-900 rounded-[1.5rem] flex items-center gap-3 shadow-2xl">
                                    {getStatusIcon(complaint.status)}
                                    <span className="text-xs font-black uppercase tracking-tight">{complaint.status === 'resolved' ? 'Closed' : complaint.status_display}</span>
                                </div>
                            </div>

                            {/* Upvote Button */}
                            {!isAdmin && (
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleUpvote}
                                    className="px-5 py-2.5 bg-slate-800 text-white rounded-[1.5rem] flex items-center gap-2 shadow-2xl border border-slate-700 hover:bg-slate-700 transition-colors"
                                >
                                    <ThumbsUp className="w-4 h-4 text-emerald-400" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{complaint.upvote_count || 0} Upvotes</span>
                                </motion.button>
                            )}

                            <div className="flex flex-wrap items-center gap-4">
                                {/* Student Resolution Feedback */}
                                {/* Student Resolution Feedback - Mobile First Redesign */}
                                {!isAdmin && complaint.status !== 'resolved' && (
                                    <div className="w-full md:w-auto mt-4 md:mt-0">
                                        <div className="flex flex-col md:flex-row items-center gap-4 bg-white/5 backdrop-blur-md p-2 rounded-[2rem] border border-white/10 md:pr-6">
                                            <div className="hidden md:block w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                                <ThumbsUp className="w-5 h-5 text-emerald-400" />
                                            </div>
                                            <div className="text-center md:text-left hidden md:block">
                                                <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest leading-none">Issue Solved?</p>
                                                <p className="text-[9px] font-bold text-emerald-400/60 uppercase tracking-tight mt-0.5">Confirm Resolution</p>
                                            </div>

                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={handleResolve}
                                                className="w-full md:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 font-black uppercase text-[10px] tracking-[0.2em] transition-all"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                                <span>Change Status to Fixed</span>
                                            </motion.button>
                                        </div>
                                    </div>
                                )}

                                {isAdmin && isSuperAdmin && (
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                        className="w-12 h-12 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl flex items-center justify-center transition-all shadow-xl shadow-rose-900/20 disabled:opacity-50"
                                        title="Delete Report"
                                    >
                                        {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-6 h-6" />}
                                    </motion.button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
                        {/* Investigation Board */}
                        <div className="lg:col-span-8 p-10 lg:p-14 border-r border-slate-100 flex flex-col h-full bg-white">
                            <div className="space-y-16 flex-1">
                                <section>
                                    <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 mb-8 flex items-center gap-3">
                                        <Terminal className="w-4 h-4 text-indigo-600" /> Report Content
                                    </h2>

                                    {editMode ? (
                                        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                                            <textarea
                                                value={editContent}
                                                onChange={(e) => setEditContent(e.target.value)}
                                                className="w-full bg-slate-50 border-2 border-indigo-100 rounded-[2.5rem] p-10 min-h-[300px] text-slate-700 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all font-medium leading-relaxed shadow-inner"
                                            />
                                            <div className="flex justify-end gap-3">
                                                <button
                                                    onClick={() => setEditMode(false)}
                                                    className="px-10 py-4 bg-slate-100 hover:bg-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                >
                                                    Discard
                                                </button>
                                                <button
                                                    onClick={handleEditUpdate}
                                                    disabled={isUpdating || !editContent.trim()}
                                                    className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-2xl shadow-indigo-100 disabled:opacity-50"
                                                >
                                                    {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                    Save Changes
                                                </button>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <div className="relative group">
                                            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-[2.5rem] blur opacity-5 group-hover:opacity-10 transition duration-1000 group-hover:duration-200" />
                                            <div className="relative bg-[#f1f5f9]/50 backdrop-blur-sm rounded-[2.5rem] p-12 border border-slate-100 leading-relaxed text-slate-800 font-medium whitespace-pre-wrap text-[17px] shadow-sm break-words">
                                                {complaint.content || <em className="text-slate-400 opacity-50 select-none tracking-widest uppercase text-[10px] font-black">Null Payload</em>}

                                                {!isAdmin && complaint.status === 'pending' && (
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => {
                                                            setEditMode(true);
                                                            setEditContent(complaint.content || '');
                                                        }}
                                                        className="absolute top-8 right-8 w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:shadow-xl transition-all border border-slate-50"
                                                    >
                                                        <Pencil className="w-5 h-5" />
                                                    </motion.button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </section>

                                {/* Communication Stream */}
                                <section className="space-y-12">
                                    <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 mb-10 flex items-center gap-3">
                                        <History className="w-4 h-4 text-indigo-600" /> Update History
                                    </h2>

                                    <div className="space-y-10 relative pl-4">
                                        <div className="absolute left-10 top-2 bottom-2 w-[2px] bg-indigo-50" />

                                        {/* Actions & Replies */}
                                        <AnimatePresence mode="popLayout">
                                            {complaint.actions?.map((action, idx) => {
                                                const hasNotes = action.notes && action.notes !== 'Encrypted reply';
                                                const isReply = action.action_type === 'reply';
                                                const isStudentReply = action.action_type === 'student_reply';
                                                const isResolution = action.action_type === 'status_changed' || action.action_type === 'resolved';

                                                return (
                                                    <motion.div
                                                        key={idx}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: idx * 0.1 }}
                                                        className="flex gap-8 relative z-10"
                                                    >
                                                        <div className={`w-12 h-12 rounded-3xl bg-white border-4 ${isStudentReply ? 'border-amber-100' : isReply ? 'border-indigo-100' : isResolution ? 'border-emerald-100' : 'border-slate-50'} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                                                            <div className={`w-8 h-8 rounded-2xl flex items-center justify-center transition-all ${isStudentReply ? 'bg-amber-500 text-white shadow-xl shadow-amber-100' : isReply ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' :
                                                                isResolution ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-100' :
                                                                    'bg-slate-100 text-slate-400'
                                                                }`}>
                                                                {isStudentReply ? <User className="w-4 h-4" /> : isReply ? <MessageSquare className="w-4 h-4" /> : isResolution ? <Check className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                                                            </div>
                                                        </div>
                                                        <div className="pt-1.5 flex-1 space-y-3">
                                                            <div className="flex items-center gap-4">
                                                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isStudentReply ? 'text-amber-600' : isReply ? 'text-indigo-600' : isResolution ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                                    {/* @ts-ignore */}
                                                                    {isStudentReply ? 'Student' : isReply ? (action.performed_by_name || 'Principal') : isResolution ? 'Done' : action.action_type}
                                                                </span>
                                                                <div className="w-1 h-1 bg-slate-200 rounded-full" />
                                                                <span className="text-[10px] text-slate-300 font-black tracking-widest">{new Date(action.created_at).toLocaleString()}</span>
                                                            </div>

                                                            {hasNotes ? (
                                                                <div className={`border-2 rounded-[2rem] p-8 text-slate-800 font-medium leading-relaxed shadow-sm hover:shadow-md transition-shadow ${isStudentReply ? 'bg-amber-50/50 border-amber-100' :
                                                                    isReply ? 'bg-white border-indigo-50/50' : 'bg-emerald-50/30 border-emerald-50'
                                                                    }`}>
                                                                    {action.notes || 'No notes'}
                                                                </div>
                                                            ) : (
                                                                <div className="text-[10px] text-slate-500 font-black tracking-widest uppercase bg-slate-100 px-4 py-1.5 rounded-full w-fit border border-slate-200">
                                                                    Update
                                                                </div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </AnimatePresence>
                                    </div>
                                </section>
                            </div>

                            {/* Internal Responder Console */}
                            {isAdmin && complaint.status !== 'resolved' && (
                                <section className="mt-20 pt-16 border-t border-slate-100 bg-[#f8fafc]/50 -mx-10 lg:-mx-14 px-10 lg:px-14 pb-14 rounded-b-[3.5rem]">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-14 h-14 bg-slate-900 rounded-3xl flex items-center justify-center shadow-2xl">
                                            <Send className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Answer student</h3>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Reply here</p>
                                        </div>
                                    </div>
                                    <form onSubmit={handleReply} className="space-y-6">
                                        <textarea
                                            value={replyContent}
                                            onChange={(e) => setReplyContent(e.target.value)}
                                            placeholder="Type your official response here..."
                                            className="w-full bg-white border-2 border-slate-200 rounded-[2.5rem] p-10 min-h-[200px] focus:outline-none focus:border-indigo-600 shadow-sm transition-all font-medium leading-relaxed"
                                        />
                                        <div className="flex justify-end">
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                type="submit"
                                                disabled={isReplying || !replyContent.trim()}
                                                className="bg-slate-900 text-white font-black py-5 px-12 rounded-2xl flex items-center gap-4 shadow-2xl shadow-slate-300 disabled:opacity-50 uppercase text-xs tracking-[0.3em]"
                                            >
                                                {isReplying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
                                                Send Response
                                            </motion.button>
                                        </div>
                                    </form>
                                </section>
                            )}

                            {/* Student Reply Box — shown when principal has replied and complaint isn't resolved */}
                            {!isAdmin && complaint.status !== 'resolved' && complaint.has_new_reply && (
                                <section className="mt-16 pt-14 border-t border-amber-100 bg-amber-50/30 -mx-10 lg:-mx-14 px-10 lg:px-14 pb-14 rounded-b-[3.5rem]">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-14 h-14 bg-amber-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-amber-100">
                                            <MessageSquare className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Reply to Principal</h3>
                                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-1">Principal has responded — add your follow-up</p>
                                        </div>
                                    </div>
                                    <form onSubmit={handleStudentReply} className="space-y-6">
                                        <textarea
                                            value={studentReplyContent}
                                            onChange={(e) => setStudentReplyContent(e.target.value)}
                                            placeholder="Type your follow-up message here..."
                                            className="w-full bg-white border-2 border-amber-200 rounded-[2.5rem] p-10 min-h-[180px] focus:outline-none focus:border-amber-400 shadow-sm transition-all font-medium leading-relaxed"
                                        />
                                        <div className="flex justify-end">
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                type="submit"
                                                disabled={isStudentReplying || !studentReplyContent.trim()}
                                                className="bg-amber-500 hover:bg-amber-600 text-white font-black py-5 px-12 rounded-2xl flex items-center gap-4 shadow-2xl shadow-amber-100 disabled:opacity-50 uppercase text-xs tracking-[0.3em] transition-all"
                                            >
                                                {isStudentReplying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                                Send Reply
                                            </motion.button>
                                        </div>
                                    </form>
                                </section>
                            )}
                        </div>

                        {/* Metadata Inspector Sidebar */}
                        <div className="lg:col-span-4 bg-[#f8fafc] p-10 lg:p-14 space-y-12">
                            <aside>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-8">Visual Evidence</h4>
                                {complaint.image_attachment ? (
                                    <div className="space-y-6">
                                        <motion.div
                                            whileHover={{ scale: 1.02 }}
                                            className="relative group rounded-[2.5rem] overflow-hidden border-2 border-white shadow-2xl ring-1 ring-slate-100"
                                        >
                                            <img
                                                src={complaint.image_attachment}
                                                alt="Evidence"
                                                className="w-full aspect-[4/5] object-cover cursor-pointer"
                                                onClick={() => window.open(complaint.image_attachment, '_blank')}
                                            />
                                            <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/20 transition-all flex items-center justify-center">
                                                <button className="bg-white/90 backdrop-blur-md p-4 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-2xl">
                                                    <Eye className="w-6 h-6 text-indigo-600" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    </div>
                                ) : (
                                    <div className="p-12 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm border-dashed flex flex-col items-center justify-center text-center space-y-4">
                                        <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200">
                                            <HardDrive className="w-8 h-8" />
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-loose">No Visual Data Provided</p>
                                    </div>
                                )}
                            </aside>

                            <aside className="space-y-10">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Submission Info</h4>
                                <div className="space-y-8">
                                    <div className="flex items-center gap-6 group">
                                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-slate-400 shadow-md border border-slate-50 group-hover:text-indigo-600 transition-colors">
                                            <Calendar className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Submitted On</div>
                                            <div className="text-sm font-black text-slate-700">{new Date(complaint.submission_date).toLocaleDateString(undefined, { dateStyle: 'long' })}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 group">
                                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-md border border-slate-50">
                                            <Clock className="w-6 h-6 text-amber-500" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-3 mb-1">
                                                Target Date
                                            </div>
                                            <div className="text-sm font-black text-amber-600">
                                                Goal: Must be fixed by {(() => {
                                                    const date = new Date(complaint.submission_date);
                                                    date.setDate(date.getDate() + 7);
                                                    return date.toLocaleDateString(undefined, { dateStyle: 'medium' });
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </aside>

                        </div>
                    </div>
                </div>
                <MobileNav />
            </div>
        </div>
    );
}
