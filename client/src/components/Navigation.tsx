import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Smartphone,
  Tv,
  RotateCw,
  Building2,
  Stethoscope,
  Sparkles,
} from 'lucide-react';

interface NavigationProps {
  currentView: 'reception' | 'patient' | 'tv';
  onViewChange: (view: 'reception' | 'patient' | 'tv') => void;
  onRefresh: () => void;
  onResetDemo: (mode: 'active_demo' | 'all_booked') => void;
  isRefreshing?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onViewChange,
  onRefresh,
  onResetDemo,
  isRefreshing = false,
}) => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm transition">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Hospital Brand & Doctor indicator */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-hospital-600 text-white flex items-center justify-center shadow-md shadow-hospital-600/20 font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
                  City Care Hospital
                </h1>
                <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-hospital-50 text-hospital-700 border border-hospital-200">
                  <Stethoscope className="w-3 h-3" /> Dr. Kumar — Room 2
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Queue & Patient Flow System</p>
            </div>
          </div>

          {/* Center Navigation Switcher */}
          <nav className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold">
            <button
              onClick={() => onViewChange('reception')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg transition-all ${
                currentView === 'reception'
                  ? 'bg-white text-hospital-700 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Reception Dashboard</span>
            </button>

            <button
              onClick={() => onViewChange('patient')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg transition-all ${
                currentView === 'patient'
                  ? 'bg-white text-hospital-700 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Patient Tracking</span>
            </button>

            <button
              onClick={() => onViewChange('tv')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg transition-all ${
                currentView === 'tv'
                  ? 'bg-white text-hospital-700 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Tv className="w-4 h-4" />
              <span>Waiting TV Display</span>
            </button>
          </nav>

          {/* Right Controls: Live Clock & Demo Presets */}
          <div className="flex items-center gap-2">
            <div className="hidden xl:flex items-center gap-2 text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{time}</span>
            </div>

            {/* Demo State Selector Dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition">
                <Sparkles className="w-3.5 h-3.5 text-hospital-600" />
                <span className="hidden sm:inline">Demo State</span>
              </button>
              <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-200 p-2 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="text-[11px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                  Select Demo Scenario
                </div>
                <button
                  onClick={() => onResetDemo('active_demo')}
                  className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-hospital-50 hover:text-hospital-800 transition flex flex-col"
                >
                  <span className="font-semibold text-slate-900">Active Live Flow</span>
                  <span className="text-[10px] text-slate-500">A05 Serving, A06-A09 Waiting</span>
                </button>
                <button
                  onClick={() => onResetDemo('all_booked')}
                  className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-hospital-50 hover:text-hospital-800 transition flex flex-col mt-1"
                >
                  <span className="font-semibold text-slate-900">Morning Initial State</span>
                  <span className="text-[10px] text-slate-500">All 10 Patients Booked</span>
                </button>
              </div>
            </div>

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh Shared State"
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition disabled:opacity-50"
            >
              <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-hospital-600' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
