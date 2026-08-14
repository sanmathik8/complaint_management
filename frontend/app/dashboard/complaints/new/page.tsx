'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Shield } from 'lucide-react';

export default function NewComplaintRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.push('/complaints/new');
    }, [router]);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-900">
            <div className="flex flex-col items-center gap-6">
                <div className="w-16 h-16 bg-white border border-slate-100 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100/50">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
                <div className="text-center group">
                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] mb-1">Secure Protocol</p>
                    <p className="text-slate-600 font-bold">Redirecting to Private Portal...</p>
                </div>
            </div>
        </div>
    );
}
