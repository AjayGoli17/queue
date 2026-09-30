import React, { useState, useEffect } from 'react';
import type { QueueOverview } from '../types';
import {
  Building2,
  Stethoscope,
  DoorOpen,
  Maximize2,
  Minimize2,
  AlertTriangle,
} from 'lucide-react';

interface WaitingRoomTVDisplayProps {
  overview: QueueOverview;
}

export const WaitingRoomTVDisplay: React.FC<WaitingRoomTVDisplayProps> = ({ overview }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [time, setTime] = useState<string>('');
  const [date, setDate] = useState<string>('');

  const { hospital_name, doctor, current_patient, next_patients } = overview;
  const isDoctorDelayed = doctor.delay_status.toLowerCase().includes('delay');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setDate(
        now.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="min-h-[85vh] bg-slate-950 text-white rounded-3xl p-6 sm:p-10 shadow-2xl flex flex-col justify-between border-4 border-slate-900 select-none overflow-hidden relative font-sans">
      
      {/* Background glow effects for TV display */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-hospital-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* 1. TV TOP BAR */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800 relative z-10">
        
        {/* Hospital Branding */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-hospital-600 text-white flex items-center justify-center font-black shadow-lg shadow-hospital-500/20 text-2xl">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tight text-white">
              {hospital_name}
            </h1>
            <p className="text-xs sm:text-sm font-semibold tracking-widest text-hospital-400 uppercase mt-0.5">
              Outpatient Department • Waiting Area Display
            </p>
          </div>
        </div>

        {/* Doctor, Room, Status & Clock Area */}
        <div className="flex flex-wrap items-center gap-4">
          
          {/* Doctor & Room */}
          <div className="bg-slate-900/90 border border-slate-700/80 px-4 py-2.5 rounded-2xl flex items-center gap-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm sm:text-base">
              <Stethoscope className="w-5 h-5 text-hospital-400" />
              <span>{doctor.name}</span>
            </div>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1.5 text-hospital-300 font-extrabold text-sm sm:text-base">
              <DoorOpen className="w-5 h-5" />
              <span>{doctor.room}</span>
            </div>
          </div>

          {/* Doctor Status Area */}
          <div className="bg-slate-900/90 border border-slate-700/80 px-4 py-2.5 rounded-2xl flex items-center gap-2.5">
            <span
              className={`w-3.5 h-3.5 rounded-full ${
                isDoctorDelayed
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-emerald-400 animate-pulse'
              }`}
            />
            <div className="text-xs sm:text-sm font-black tracking-wide text-slate-200">
              Doctor Status:{' '}
              <span
                className={
                  isDoctorDelayed
                    ? 'text-amber-400 uppercase font-black'
                    : 'text-emerald-400 uppercase'
                }
              >
                {isDoctorDelayed ? 'DOCTOR DELAYED' : 'AVAILABLE'}
              </span>
            </div>
          </div>

          {/* Live Date & Time */}
          <div className="bg-slate-900/90 border border-slate-700/80 px-4 py-2 rounded-2xl flex flex-col items-end">
            <div className="text-lg font-mono font-black text-white tracking-wider">
              {time}
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">
              {date}
            </div>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-3 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-2xl border border-slate-700 transition"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* DOCTOR DELAY ALERT BANNER (Section 9) */}
      {isDoctorDelayed && (
        <div className="my-4 p-4 rounded-2xl bg-amber-500/20 border-2 border-amber-500/60 flex items-center justify-between text-amber-300 animate-pulse relative z-10">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <span className="text-base sm:text-lg font-black tracking-wide uppercase">
                {doctor.name} — {doctor.room} • DOCTOR DELAYED
              </span>
              <p className="text-xs sm:text-sm font-medium text-amber-200/90">
                Please remain in the waiting area. Consultations will resume shortly.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-block font-mono text-xs font-bold px-3 py-1 bg-amber-500/30 rounded-lg text-amber-300 border border-amber-500/40">
            OPD DELAY NOTICE
          </span>
        </div>
      )}

      {/* 2. MAIN TV CONTENT GRID */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-6 relative z-10 items-stretch">
        
        {/* LEFT / CENTER: HERO NOW SERVING SECTION (7 cols) */}
        <div className="lg:col-span-7 bg-gradient-to-br from-slate-900/90 via-slate-900 to-slate-950 rounded-3xl p-8 sm:p-12 border-2 border-emerald-500/40 shadow-2xl flex flex-col justify-between relative overflow-hidden">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-4 w-4 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500" />
              </span>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black uppercase tracking-widest text-emerald-400">
                NOW SERVING
              </h2>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-black text-xs sm:text-sm px-4 py-1.5 rounded-full uppercase tracking-wider">
              {current_patient?.status === 'CALLED' ? 'TOKEN CALLED' : 'CONSULTATION ACTIVE'}
            </div>
          </div>

          {/* Large Hero Token & Name */}
          <div className="my-8 text-center sm:text-left space-y-4">
            {current_patient ? (
              <>
                <div className="text-7xl sm:text-8xl lg:text-9xl font-black font-mono tracking-tight text-white drop-shadow-[0_10px_20px_rgba(16,185,129,0.3)]">
                  {current_patient.token}
                </div>
                <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-100 tracking-tight">
                  {current_patient.patient_name}
                </div>
                <div className="inline-flex items-center gap-2 text-base sm:text-lg font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-5 py-2 rounded-2xl mt-4">
                  <DoorOpen className="w-6 h-6" />
                  <span>Please proceed to {doctor.room}</span>
                </div>
              </>
            ) : (
              <div className="py-12 text-slate-500 text-center">
                <p className="text-4xl font-black text-slate-400 font-mono">--</p>
                <p className="text-xl font-semibold mt-2">Next Patient Calling Shortly</p>
              </div>
            )}
          </div>

          {/* Doctor & Room Badge at Bottom of Hero */}
          <div className="pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-slate-400 text-sm">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-hospital-400" />
              <span className="font-bold text-slate-200">{doctor.name}</span>
            </div>
            <div className="font-mono font-bold text-emerald-400">
              {doctor.room}
            </div>
          </div>

        </div>

        {/* RIGHT: NEXT PATIENTS QUEUE (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/80 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col justify-between">
          
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-200">
                NEXT
              </h2>
              <span className="text-xs font-bold uppercase tracking-wider text-hospital-400 bg-hospital-950/60 border border-hospital-800/60 px-3 py-1 rounded-full">
                Waiting List
              </span>
            </div>

            {/* List of Next Patients in FIFO order */}
            <div className="mt-5 space-y-3.5">
              {next_patients.length > 0 ? (
                next_patients.slice(0, 4).map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-hospital-500/40 transition group"
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="w-7 h-7 rounded-xl bg-slate-800 text-slate-400 text-xs font-mono font-black flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-2xl sm:text-3xl font-black font-mono text-hospital-400 group-hover:text-hospital-300">
                        {p.token}
                      </span>
                      <span className="text-base sm:text-lg font-bold text-slate-200 pl-1">
                        {p.patient_name}
                      </span>
                    </div>

                    <div className="text-xs font-mono text-slate-400">
                      {p.appointment_time}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-500">
                  <p className="text-base font-semibold">No patients are currently waiting.</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-400 font-medium">
              Please watch this screen. Your token and name will appear when called.
            </p>
          </div>

        </div>

      </main>

      {/* 3. TV BOTTOM TICKER & LIVE ANNOUNCEMENT BAR */}
      <footer className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2 relative z-10">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-300">
            Real-Time Live Queue Synchronization
          </span>
          <span className="text-slate-600">•</span>
          <span>City Care Hospital OPD Floor 1</span>
        </div>
        <div className="font-medium text-slate-400">
          For assistance or priority check-in, please visit the reception desk.
        </div>
      </footer>

    </div>
  );
};
