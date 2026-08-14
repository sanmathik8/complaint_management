'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, Shuffle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { login as apiLogin, register as apiRegister } from '@/lib/api';

export default function AuthPage() {
    const router = useRouter();
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [showPassword, setShowPassword] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const getStrength = (pass: string) => {
        if (pass.length === 0) return { score: 0, label: '', color: 'bg-slate-200' };
        let score = 0;
        if (pass.length >= 8) score++;
        if (/[A-Z]/.test(pass)) score++;
        if (/[0-9]/.test(pass)) score++;
        if (/[^A-Za-z0-9]/.test(pass)) score++;

        if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
        if (score === 2) return { score: 2, label: 'Fair', color: 'bg-orange-500' };
        if (score === 3) return { score: 3, label: 'Secure', color: 'bg-indigo-500' };
        return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
    };
    const strength = getStrength(password);

    const calligraphyFont = { fontFamily: 'var(--font-cormorant), var(--font-playfair), serif' };

    const hashUsername = async (name: string) => {
        const msgUint8 = new TextEncoder().encode(name.trim().toLowerCase());
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer)).slice(0, 16);
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        // Convert hash to a purely numeric string to hide it from Network Tab & satisfy "No Letters" rule
        return BigInt('0x' + hashHex).toString();
    };

    const generateRandomUsername = () => {
        const symbols = "!@+#$%^&*()";
        const chars = "0123456789" + symbols;
        let result = "";
        for (let i = 0; i < 12; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setUsername(result);
    };

    const getDeviceFingerprint = () => {
        if (typeof window === 'undefined') return '';
        const n = window.navigator;
        const s = window.screen;
        return `${n.userAgent}|${s.width}x${s.height}|${s.colorDepth}|${n.language}`;
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!username || !password) {
            toast.error('Please fill in all fields');
            return;
        }

        if (mode === 'register') {
            if (/[a-zA-Z]/.test(username)) {
                toast.error('Username (Roll No. / ID) must contain ONLY numbers and symbols (!@#$). No letters allowed.');
                return;
            }
            if (password !== confirmPassword) {
                toast.error('Passwords do not match');
                return;
            }
            if (password.length < 10) {
                toast.error('Password must be at least 10 characters');
                return;
            }
            if (!/[A-Z]/.test(password)) {
                toast.error('Password must contain at least one uppercase letter');
                return;
            }
            if (!/[0-9]/.test(password)) {
                toast.error('Password must contain at least one number');
                return;
            }
            if (!/[^A-Za-z0-9]/.test(password)) {
                toast.error('Password must contain at least one symbol');
                return;
            }
        }

        setIsLoading(true);
        try {
            const secureUsername = await hashUsername(username);

            if (mode === 'login') {
                const response = await apiLogin({ username: secureUsername, password });
                toast.success('Login successful!');
                localStorage.setItem('token', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));
                router.push('/dashboard');
            } else {
                const fingerprint = getDeviceFingerprint();
                await apiRegister({
                    username: secureUsername,
                    password,
                    password_confirm: confirmPassword,
                    device_fingerprint: fingerprint
                });
                toast.success('Registration successful! You can now sign in.');
                setMode('login');
                setUsername('');
                setPassword('');
                setConfirmPassword('');
            }
        } catch (error: any) {
            const data = error.response?.data;

            // Priority 1: Handle System-Level/Security Errors (IP Lock, Deletion Delay)
            if (data?.non_field_errors) {
                toast.error(data.non_field_errors[0], {
                    duration: 5000,
                    style: { background: '#FFF1F2', color: '#BE1231', border: '1px solid #FFE4E6' }
                });
                return;
            }

            // Priority 2: Handle Field Validation Errors (Username taken, etc.)
            if (data) {
                const fieldErrors = Object.entries(data)
                    .filter(([key]) => key !== 'non_field_errors')
                    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value[0] : value}`)
                    .join('\n');

                if (fieldErrors) {
                    toast.error(fieldErrors);
                    return;
                }
            }

            toast.error(data?.error || 'Invalid credentials or server error.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#F8F7FF] relative overflow-hidden font-sans antialiased p-4">

            {/* LIGHT DECORATIVE BACKGROUND ELEMENTS */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-purple-100 rounded-full blur-[120px] -z-10" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-indigo-50 rounded-full blur-[120px] -z-10" />

            {/* MAIN PORTAL CARD */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-md md:max-w-lg lg:max-w-xl overflow-hidden rounded-[2rem] md:rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(120,50,255,0.15)] border border-white"
            >
                {/* BACKGROUND IMAGE */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="https://w0.peakpx.com/wallpaper/414/971/HD-wallpaper-school-friends-sitting-on-wall-school-friends-sitting-on-wall-animation.jpg"
                        className="w-full h-full object-cover"
                        alt="Background"
                    />
                    {/* Dark overlay */}
                    <div className="absolute inset-0 bg-purple-950/40" />
                </div>

                {/* CONTENT */}
                <div className="relative z-10 p-6 sm:p-8 md:p-12 flex flex-col items-center">

                    {/* EXIT BUTTON */}
                    <Link
                        href="/"
                        className="absolute top-4 left-4 sm:top-6 sm:left-6 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-md text-white/90 hover:text-white transition-colors text-[9px] sm:text-[10px] font-black uppercase tracking-widest border border-white/20"
                    >
                        Exit
                    </Link>

                    {/* HEADER */}
                    <header className="text-center mt-4 mb-6 sm:mb-8">
                        <motion.h1
                            key={mode}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={calligraphyFont}
                            className="text-4xl sm:text-5xl md:text-6xl text-white italic font-light tracking-tighter"
                        >
                            {mode === 'login' ? 'Welcome' : 'Join Us'}
                        </motion.h1>
                        <p className="text-purple-100/60 text-[9px] sm:text-[11px] italic tracking-widest mt-1 uppercase">
                            Tuning the inner circle
                        </p>
                    </header>

                    {/* MODE TOGGLE */}
                    <div className="flex gap-3 sm:gap-4 mb-6 sm:mb-10 flex-wrap justify-center">
                        {['login', 'register'].map((t) => (
                            <button
                                key={t}
                                onClick={() => setMode(t as any)}
                                className={`px-6 py-2 sm:px-8 sm:py-2.5 rounded-full border text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${mode === t ? 'bg-white text-purple-950 border-white' : 'bg-transparent text-white border-white/30 hover:border-white'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    {/* FORM */}
                    <form className="w-full space-y-3 sm:space-y-4" onSubmit={handleAuth}>
                        <div className="flex flex-col gap-3 sm:gap-4">

                            {/* USERNAME */}
                            <div className="space-y-1">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder={mode === 'register' ? "Anonymous ID (e.g. 123#$!)" : "Username"}
                                        value={username}
                                        onChange={(e) => {
                                            // Block letters as they type
                                            const val = e.target.value.replace(/[a-zA-Z]/g, '');
                                            setUsername(val);
                                        }}
                                        className="w-full bg-black/60 text-white border border-white/20 rounded-xl py-2.5 sm:py-3 px-3 sm:px-4 outline-none focus:bg-black/70 focus:border-white transition-all text-sm font-medium"
                                        required
                                    />
                                </div>
                                {mode === 'register' && (
                                    <div className="flex justify-between items-center px-1">
                                        <p className="text-[9px] text-white/40 uppercase tracking-[0.1em]">
                                            Letters are blocked.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={generateRandomUsername}
                                            className="text-[9px] text-indigo-400 hover:text-white font-black uppercase tracking-widest transition-colors flex items-center gap-1.5"
                                        >
                                            <Shuffle className="w-3 h-3" />
                                            Generate Random ID
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* PASSWORD */}
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-black/60 text-white border border-white/20 rounded-xl py-2.5 sm:py-3 px-3 sm:px-4 outline-none focus:bg-black/70 focus:border-white transition-all text-sm font-medium"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>

                            {/* PASSWORD STRENGTH INDICATOR */}
                            {mode === 'register' && password.length > 0 && (
                                <div className="px-1 space-y-3">
                                    {/* PROGRESS BAR */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Strength</span>
                                            <span className={`text-[10px] font-bold uppercase tracking-widest ${strength.label === 'Strong' ? 'text-emerald-400' : 'text-white/70'}`}>
                                                {strength.label}
                                            </span>
                                        </div>
                                        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(strength.score / 4) * 100}%` }}
                                                className={`h-full ${strength.color} shadow-[0_0_10px_rgba(255,255,255,0.2)]`}
                                            />
                                        </div>
                                    </div>

                                    {/* REQUIREMENTS CHECKLIST */}
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 bg-white/5 p-3 rounded-xl border border-white/5">
                                        {[
                                            { label: '10+ Characters', met: password.length >= 10 },
                                            { label: 'One Uppercase', met: /[A-Z]/.test(password) },
                                            { label: 'One Number', met: /[0-9]/.test(password) },
                                            { label: 'One Symbol', met: /[^A-Za-z0-9]/.test(password) },
                                        ].map((req, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${req.met ? 'bg-emerald-400' : 'bg-white/20'}`} />
                                                <span className={`text-[9px] uppercase tracking-wider ${req.met ? 'text-white/80' : 'text-white/40'}`}>
                                                    {req.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* CONFIRM PASSWORD (register only) */}
                            {mode === 'register' && (
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Confirm Password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-black/60 text-white border border-white/20 rounded-xl py-2.5 sm:py-3 px-3 sm:px-4 outline-none focus:bg-black/70 focus:border-white transition-all text-sm font-medium"
                                    required
                                />
                            )}
                        </div>

                        {/* SUBMIT BUTTON */}
                        <div className="flex justify-center pt-3 sm:pt-4">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-10 sm:px-12 py-3 sm:py-4 bg-purple-900/80 text-white rounded-full font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[10px] sm:text-[11px] hover:bg-purple-800 transition-all shadow-xl active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
                            </button>
                        </div>
                    </form>

                    {/* FOOTER */}
                    <footer className="mt-8 sm:mt-10 flex items-center gap-3 sm:gap-4 w-full">
                        <div className="h-[1px] flex-1 bg-white/20" />
                        <span style={calligraphyFont} className="text-xl sm:text-2xl italic text-white/40">SpeakSafe</span>
                        <div className="h-[1px] flex-1 bg-white/20" />
                    </footer>
                </div>
            </motion.div>
        </div>
    );
}
