import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Smartphone,
  Tv,
  RotateCw,
  Building2,
  Stethoscope,
  RotateCcw,
  ChevronDown,
  Home,
} from 'lucide-react';

interface NavigationProps {
  onRefresh?: () => void;
  onResetDemo?: (mode: 'active_demo' | 'all_booked') => void;
  isRefreshing?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  onRefresh,
  onResetDemo,
  isRefreshing = false,
}) => {
  const [time, setTime] = useState<string>('');
  const [isDemoMenuOpen, setIsDemoMenuOpen] = useState(false);
  const location = useLocation();

  const isReception = location.pathname === '/reception';
  const isDisplay = location.pathname === '/display';
  const isTracking = location.pathname.startsWith('/track');

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
            <Link to="/" className="w-10 h-10 rounded-xl bg-hospital-600 text-white flex items-center justify-center shadow-md shadow-hospital-600/20 font-bold hover:bg-hospital-700 transition">
              <Building2 className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Link to="/" className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight hover:text-hospital-600 transition">
                  City Care Hospital
                </Link>
                <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-hospital-50 text-hospital-700 border border-hospital-200">
                  <Stethoscope className="w-3 h-3" /> Dr. Kumar — Room 2
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Queue & Patient Flow System</p>
            </div>
          </div>

          {/* Center Navigation Switcher */}
          <nav className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold">
            <Link
              to="/reception"
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg transition-all ${
                isReception
                  ? 'bg-white text-hospital-700 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Reception Dashboard</span>
            </Link>

            <Link
              to="/track/A07"
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg transition-all ${
                isTracking
                  ? 'bg-white text-hospital-700 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Patient Tracking</span>
            </Link>

            <Link
              to="/display"
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg transition-all ${
                isDisplay
                  ? 'bg-white text-hospital-700 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Tv className="w-4 h-4" />
              <span>Waiting TV Display</span>
            </Link>
          </nav>

          {/* Right Controls: Home, Live Clock & Reset Demo Menu */}
          <div className="flex items-center gap-2">
            <Link
              to="/"
              title="Demo Launcher"
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition"
            >
              <Home className="w-4 h-4" />
            </Link>

            <div className="hidden xl:flex items-center gap-2 text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{time}</span>
            </div>

            {/* DEMO RESET DROPDOWN MENU (Section 10) */}
            {onResetDemo && (
              <div className="relative">
                <button
                  onClick={() => setIsDemoMenuOpen(!isDemoMenuOpen)}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Reset Demo</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {isDemoMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsDemoMenuOpen(false)} />
                    <div className="absolute right-0 mt-1 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 p-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="text-[11px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                        Demo Scenarios (Reset Database)
                      </div>
                      
                      <button
                        onClick={() => {
                          onResetDemo('all_booked');
                          setIsDemoMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-hospital-50 hover:text-hospital-800 transition flex flex-col mt-1 border border-transparent hover:border-hospital-200"
                      >
                        <span className="font-bold text-slate-900">Morning State (All Booked)</span>
                        <span className="text-[11px] text-slate-500 mt-0.5">
                          Reset tokens A01-A10 to BOOKED for fresh check-in walkthrough.
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          onResetDemo('active_demo');
                          setIsDemoMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-hospital-50 hover:text-hospital-800 transition flex flex-col mt-1.5 border border-transparent hover:border-hospital-200"
                      >
                        <span className="font-bold text-slate-900">Mid-Day Live Queue Flow</span>
                        <span className="text-[11px] text-slate-500 mt-0.5">
                          A05 In Consultation, A06-A09 Waiting in Queue.
                        </span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Refresh Button */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                title="Refresh Shared State"
                className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition disabled:opacity-50"
              >
                <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-hospital-600' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
