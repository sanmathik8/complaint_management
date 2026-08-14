'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ShieldCheck, ArrowRight, Scale, Fingerprint,
  EyeOff, ShieldAlert, Lock
} from 'lucide-react';

export default function StunningSpeakSafe() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  React.useEffect(() => {
    setIsLargeScreen(window.innerWidth > 1024);
    const handleResize = () => setIsLargeScreen(window.innerWidth > 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleStart = () => {
  setLoading(true);
  router.push('/login');
};

  return (
    <div className="min-h-screen bg-[#fafbff] text-slate-900 selection:bg-indigo-100 overflow-x-hidden flex flex-col">

      {/* Dynamic Background Elements - Optimized for all screens */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-5%] right-[-5%] w-[300px] md:w-[600px] h-[300px] md:h-[600px] rounded-full bg-indigo-100/30 blur-[80px] md:blur-[120px]" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[200px] md:w-[400px] h-[200px] md:h-[400px] rounded-full bg-blue-100/20 blur-[60px] md:blur-[100px]" />
      </div>

      {/* Clean Header - Responsive Padding */}
      <nav className="relative z-50 flex justify-between items-center px-6 md:px-10 py-6 md:py-10 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="bg-gradient-to-br from-indigo-600 to-blue-500 p-1.5 md:p-2 rounded-xl md:rounded-2xl shadow-xl shadow-indigo-100">
            <ShieldCheck className="w-5 h-5 md:w-7 md:h-7 text-white" />
          </div>
          <span className="font-black text-xl md:text-2xl tracking-tighter text-slate-800 uppercase">
            SpeakSafe
          </span>
        </div>
        <div className="flex items-center gap-2 text-[8px] md:text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] md:tracking-[0.3em]">
          <Lock className="w-3 md:w-3.5 h-3 md:h-3.5" />
          Secure Access
        </div>
      </nav>

      {/* Main Content - Grid adjusts from 1 to 12 columns */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 md:px-8 pt-4 md:pt-10 pb-20 md:pb-32 flex-grow w-full">
        <div className="grid lg:grid-cols-12 gap-10 md:gap-16 items-center">

          {/* Left Column: Typography sizes are fluid */}
          <div className="lg:col-span-6 space-y-6 md:space-y-10 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 md:space-y-6"
            >
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.95] md:leading-[0.9] text-slate-900">
                Truth <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-blue-500 to-indigo-400">
                  Protected.
                </span>
              </h1>
              <p className="text-base md:text-xl text-slate-500 leading-relaxed max-w-md mx-auto lg:mx-0 font-medium">
                Your integrity is our priority. Please observe the protocols to the right before entering the portal.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <button
                onClick={handleStart}
                disabled={loading}
                className="group relative bg-slate-900 text-white px-8 md:px-12 py-4 md:py-6 rounded-xl md:rounded-2xl font-black text-base md:text-lg flex items-center justify-center gap-3 md:gap-4 hover:bg-indigo-600 transition-all shadow-2xl shadow-indigo-100 overflow-hidden w-full md:w-auto mx-auto lg:mx-0"
              >
                {loading ? (
                  <span className="flex items-center gap-3">
                    <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connecting...
                  </span>
                ) : (
                  <>
                    <span className="relative z-10 uppercase tracking-[0.1em] md:tracking-[0.2em]">Enter Portal</span>
                    <ArrowRight className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-2 transition-transform relative z-10" />
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </>
                )}
              </button>
            </motion.div>
          </div>

          {/* Right Column: Cards stack on mobile, align right on desktop */}
          <div className="lg:col-span-6 space-y-4 w-full">
            <div className="flex items-center justify-center lg:justify-start gap-3 mb-4 md:mb-6">
              <ShieldAlert className="w-4 h-4 md:w-5 md:h-5 text-indigo-500" />
              <h2 className="text-[10px] md:text-sm font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-slate-400">Essential Protocol</h2>
            </div>

            {/* Truth Card - Responsive padding & image sizes */}
            <motion.div
              whileHover={{ x: isLargeScreen ? 12 : 0 }}
              className="group bg-white p-4 md:p-5 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-4 md:gap-6 hover:shadow-xl transition-all"
            >
              <div className="h-20 w-20 md:h-28 md:w-28 rounded-[1rem] md:rounded-[1.5rem] overflow-hidden bg-slate-100 shrink-0 shadow-inner">
                <img
                  src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS9xcX0NbnqpVjN4JhfvuWjBNiJlCQd6cTuCQ&s"
                  alt="Truth"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
              </div>
              <div className="min-w-0">
                <h3 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2 truncate">
                  <Scale className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-500" />
                  Speak Only Truth
                </h3>
                <p className="text-slate-400 text-xs md:text-sm mt-0.5 md:mt-1 leading-relaxed italic line-clamp-2 md:line-clamp-none">
                  Accuracy is the foundation of every report.
                </p>
              </div>
            </motion.div>

            {/* Anonymity Card */}
            <motion.div
              whileHover={{ x: isLargeScreen ? 12 : 0 }}
              className="group bg-white p-4 md:p-5 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-4 md:gap-6 hover:shadow-xl transition-all"
            >
              <div className="h-20 w-20 md:h-28 md:w-28 rounded-[1rem] md:rounded-[1.5rem] overflow-hidden bg-slate-100 shrink-0 shadow-inner">
                <img
                  src="https://us.123rf.com/450wm/besputin/besputin2207/besputin220700053/188763782-hide-your-face-behind-a-mask-hide-your-identity-complete-anonymity-flat-vector-illustration.jpg?ver=6"
                  alt="Anonymity"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
              </div>
              <div className="min-w-0">
                <h3 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2 truncate">
                  <EyeOff className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-500" />
                  Stay Anonymous
                </h3>
                <p className="text-slate-400 text-xs md:text-sm mt-0.5 md:mt-1 leading-relaxed italic line-clamp-2 md:line-clamp-none">
                  Keep personal identifiers out of the report body.
                </p>
              </div>
            </motion.div>

            {/* Security Card */}
            <motion.div
              whileHover={{ x: isLargeScreen ? 12 : 0 }}
              className="group bg-white p-4 md:p-5 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-4 md:gap-6 hover:shadow-xl transition-all"
            >
              <div className="h-20 w-20 md:h-28 md:w-28 rounded-[1rem] md:rounded-[1.5rem] overflow-hidden bg-slate-100 shrink-0 shadow-inner">
                <img
                  src="https://static.vecteezy.com/system/resources/previews/002/223/429/non_2x/banner-design-of-mobile-security-system-with-password-and-smart-protection-technology-illustration-concept-be-used-for-landing-page-template-ui-ux-web-mobile-app-poster-banner-website-free-vector.jpg"
                  alt="Security"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
              </div>
              <div className="min-w-0">
                <h3 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2 truncate">
                  <Fingerprint className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-500" />
                  Real Identity
                </h3>
                <p className="text-slate-400 text-xs md:text-sm mt-0.5 md:mt-1 leading-relaxed italic line-clamp-2 md:line-clamp-none">
                  Do not impersonate others. Stay true to yourself.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Footer - Content removed as requested */}
      <footer className="w-full py-8 md:py-10">
        {/* Empty footer area to maintain spacing */}
      </footer>
    </div>
  );
}