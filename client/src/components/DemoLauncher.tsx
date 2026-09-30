import React from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  LayoutDashboard,
  Tv,
  Smartphone,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Stethoscope,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export const DemoLauncher: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden">
      
      {/* Background visual accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-hospital-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-5xl mx-auto w-full py-6 sm:py-12 relative z-10 flex-1 flex flex-col justify-center">
        
        {/* Header Branding */}
        <div className="text-center space-y-3 mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-hospital-500/10 border border-hospital-500/20 text-hospital-400 text-xs font-bold uppercase tracking-widest">
            <Building2 className="w-4 h-4" />
            <span>Hospital Operational System</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            City Care Hospital
          </h1>
          <p className="text-base sm:text-xl font-semibold text-slate-400 max-w-2xl mx-auto">
            Patient Flow & Queue Management System
          </p>

          <div className="flex items-center justify-center gap-2 pt-1 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Stethoscope className="w-3.5 h-3.5 text-hospital-400" /> Dr. Kumar — Room 2
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Real-time WebSocket Synchronized
            </span>
          </div>
        </div>

        {/* 3 Real-World Screen Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* 1. RECEPTION DASHBOARD CARD */}
          <div className="bg-slate-800/80 border border-slate-700/80 hover:border-hospital-500/50 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between transition-all hover:scale-[1.02] group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-hospital-600 text-white flex items-center justify-center shadow-lg shadow-hospital-600/30">
                <LayoutDashboard className="w-6 h-6" />
              </div>

              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-hospital-400">
                  Floor Operations
                </span>
                <h2 className="text-xl font-black text-white mt-0.5">
                  RECEPTION
                </h2>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Manage today's appointments, check-ins, walk-ins, calling queue, and doctor delay status.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-700/60 text-[11px] text-slate-400 font-mono">
                <code>/reception</code>
              </div>
            </div>

            <div className="pt-6 flex flex-col gap-2">
              <Link
                to="/reception"
                className="w-full py-3 px-4 rounded-xl bg-hospital-600 hover:bg-hospital-700 active:bg-hospital-800 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-hospital-600/20 flex items-center justify-center gap-2 transition"
              >
                <span>Open Reception</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="/reception"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-slate-400 hover:text-slate-200 text-center flex items-center justify-center gap-1 py-1 font-medium transition"
              >
                <span>Open in New Window</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* 2. WAITING ROOM TV DISPLAY CARD */}
          <div className="bg-slate-800/80 border border-slate-700/80 hover:border-emerald-500/50 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between transition-all hover:scale-[1.02] group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30">
                <Tv className="w-6 h-6" />
              </div>

              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
                  Public Waiting Display
                </span>
                <h2 className="text-xl font-black text-white mt-0.5">
                  WAITING ROOM
                </h2>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  High-contrast, large screen TV display showing currently called token and the next waiting queue.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-700/60 text-[11px] text-slate-400 font-mono">
                <code>/display</code>
              </div>
            </div>

            <div className="pt-6 flex flex-col gap-2">
              <Link
                to="/display"
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition"
              >
                <span>Open Display</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="/display"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-slate-400 hover:text-slate-200 text-center flex items-center justify-center gap-1 py-1 font-medium transition"
              >
                <span>Open in New Window</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* 3. PATIENT TRACKING CARD */}
          <div className="bg-slate-800/80 border border-slate-700/80 hover:border-purple-500/50 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between transition-all hover:scale-[1.02] group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/30">
                <Smartphone className="w-6 h-6" />
              </div>

              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-purple-400">
                  Patient Mobile View
                </span>
                <h2 className="text-xl font-black text-white mt-0.5">
                  PATIENT TRACKING
                </h2>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Track an individual patient's real-time queue position, now serving status, and called alerts.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-700/60 text-[11px] text-slate-400 font-mono">
                <code>/track/A07</code>
              </div>
            </div>

            <div className="pt-6 flex flex-col gap-2">
              <Link
                to="/track/A07"
                className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-purple-600/20 flex items-center justify-center gap-2 transition"
              >
                <span>Open Patient Tracking (A07)</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="/track/A07"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-slate-400 hover:text-slate-200 text-center flex items-center justify-center gap-1 py-1 font-medium transition"
              >
                <span>Open in New Window</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

        </div>

        {/* Multi-Window Demo Instructions */}
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-hospital-400 shrink-0" />
            <span>
              <strong>Client Demo Tip:</strong> Open all three screens in separate windows or tabs to demonstrate real-time queue synchronization.
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
            <span className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300">
              API: 5001
            </span>
            <span className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300">
              WS: /ws
            </span>
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-500 py-4 border-t border-slate-800 relative z-10">
        City Care Hospital • Patient Flow & Queue Management System Prototype
      </footer>

    </div>
  );
};
