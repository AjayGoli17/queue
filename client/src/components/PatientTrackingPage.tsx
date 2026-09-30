import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { PatientTrackingInfo } from '../types';
import { fetchPatientTracking } from '../services/api';
import { wsClient } from '../services/websocket';
import { StatusBadge } from './StatusBadge';
import {
  Search,
  Building2,
  Stethoscope,
  DoorOpen,
  Info,
  Smartphone,
  RotateCw,
  BellRing,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';

interface PatientTrackingPageProps {
  initialToken?: string;
}

export const PatientTrackingPage: React.FC<PatientTrackingPageProps> = ({ initialToken = 'A07' }) => {
  const { token: urlToken } = useParams<{ token?: string }>();
  const navigate = useNavigate();

  const currentTargetToken = (urlToken || initialToken).trim().toUpperCase();

  const [tokenInput, setTokenInput] = useState<string>(currentTargetToken);
  const [activeToken, setActiveToken] = useState<string>(currentTargetToken);
  const [trackingData, setTrackingData] = useState<PatientTrackingInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mobileFrame, setMobileFrame] = useState<boolean>(false);
  const activeTokenRef = useRef(activeToken);

  activeTokenRef.current = activeToken;

  const handleSearch = async (tokenToFetch?: string) => {
    const query = (tokenToFetch || tokenInput).trim().toUpperCase();
    if (!query) {
      setErrorMessage('Please enter a token (e.g. A07)');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchPatientTracking(query);
      setTrackingData(data);
      setActiveToken(query);
      setTokenInput(query);
      if (urlToken !== query) {
        navigate(`/track/${query}`, { replace: true });
      }
    } catch (err: any) {
      setErrorMessage(err.message || `Token "${query}" not found. Please check your token number.`);
      setTrackingData(null);
      setActiveToken(query);
      setTokenInput(query);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentTargetToken) {
      handleSearch(currentTargetToken);
    }
  }, [urlToken]);

  // Real-time WebSocket subscription: Automatically re-fetches tracking when queue updates
  useEffect(() => {
    const unsubscribe = wsClient.subscribe(() => {
      if (activeTokenRef.current) {
        fetchPatientTracking(activeTokenRef.current)
          .then((data) => setTrackingData(data))
          .catch(() => {});
      }
    });
    return unsubscribe;
  }, []);

  const demoTokens = ['A05', 'A06', 'A07', 'A08', 'A09', 'A10'];
  const isCalled = trackingData?.status === 'CALLED';
  const isDoctorDelayed = trackingData?.is_doctor_delayed;

  const content = (
    <div className="w-full max-w-md mx-auto space-y-5">
      
      {/* Header with Hospital Branding & Back Link */}
      <div className="text-center space-y-1 relative">
        <Link
          to="/"
          className="absolute left-0 top-1 text-slate-400 hover:text-slate-600 p-1 rounded-lg text-xs flex items-center gap-1 font-semibold transition"
          title="Back to Launcher"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Home</span>
        </Link>

        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-hospital-600 text-white shadow-lg shadow-hospital-600/20 mb-1">
          <Building2 className="w-6 h-6" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          City Care Hospital
        </h1>
        <p className="text-xs font-semibold uppercase tracking-wider text-hospital-700">
          Live Patient Queue Tracker
        </p>
      </div>

      {/* TOKEN ENTRY FORM */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
          Enter your token
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="e.g. A07"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-hospital-500 focus:bg-white uppercase text-center"
              maxLength={6}
            />
          </div>
          <button
            onClick={() => handleSearch()}
            disabled={loading}
            className="px-5 py-3 rounded-xl bg-hospital-600 hover:bg-hospital-700 active:bg-hospital-800 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-hospital-600/20 transition flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <RotateCw className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span>CHECK STATUS</span>
          </button>
        </div>

        {/* Quick Demo Token Selector */}
        <div className="pt-1 flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-400">Quick Tokens:</span>
          <div className="flex gap-1.5 flex-wrap">
            {demoTokens.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTokenInput(t);
                  handleSearch(t);
                }}
                className={`px-2 py-0.5 rounded-md font-mono text-xs font-bold transition ${
                  activeToken === t
                    ? 'bg-hospital-600 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ERROR DISPLAY */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium text-center animate-in fade-in">
          {errorMessage}
        </div>
      )}

      {/* TRACKING DETAILS CARD */}
      {trackingData && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md shadow-slate-200/50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
          
          {/* 1. SPECIAL "CALLED" BANNER */}
          {isCalled && (
            <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center space-y-2 animate-bounce">
              <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full">
                <BellRing className="w-4 h-4 text-white animate-spin" />
                <span>YOUR TOKEN HAS BEEN CALLED</span>
              </div>
              <p className="text-sm font-semibold">
                Please proceed immediately to:
              </p>
              <div className="text-xl font-black bg-white text-slate-900 py-2 px-4 rounded-xl shadow-md inline-block">
                {trackingData.doctor_name} — {trackingData.room}
              </div>
            </div>
          )}

          {/* 2. IN CONSULTATION BANNER */}
          {trackingData.status === 'IN_CONSULTATION' && (
            <div className="p-4 bg-emerald-600 text-white text-center font-bold text-sm flex items-center justify-center gap-2">
              <Stethoscope className="w-5 h-5 text-emerald-200" />
              <span>You are currently in consultation with {trackingData.doctor_name} in {trackingData.room}</span>
            </div>
          )}

          {/* 3. COMPLETED BANNER */}
          {trackingData.status === 'COMPLETED' && (
            <div className="p-4 bg-teal-600 text-white text-center font-bold text-sm flex items-center justify-center gap-2">
              <span>✓ Consultation Completed — Thank you for visiting {trackingData.hospital_name}</span>
            </div>
          )}

          {/* 4. DOCTOR DELAY ALERT */}
          {isDoctorDelayed && (
            <div className="p-4 bg-amber-500 text-amber-950 font-semibold text-xs flex items-start gap-2.5 border-b border-amber-600">
              <AlertTriangle className="w-4 h-4 text-amber-950 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{trackingData.doctor_name} is currently delayed.</p>
                <p className="text-[11px] opacity-90 mt-0.5">Approximately 15 minutes. Please remain comfortably in the waiting area.</p>
              </div>
            </div>
          )}

          {/* Top Token & Status Header */}
          <div className="p-6 bg-gradient-to-b from-hospital-50/60 to-transparent border-b border-slate-100 text-center space-y-3">
            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                YOUR TOKEN
              </span>
              <div className="text-5xl font-black text-slate-900 tracking-tight font-mono mt-1">
                {trackingData.token}
              </div>
              <div className="text-base font-bold text-slate-700 mt-1">
                {trackingData.patient_name}
              </div>
            </div>

            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                CURRENT STATUS
              </span>
              <StatusBadge status={trackingData.status} size="lg" />
            </div>
          </div>

          {/* 4-Box Key Metrics Grid: Appointment Time, Estimated Wait, Now Serving, Patients Ahead */}
          <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 border-b border-slate-100 bg-slate-50/50">
            
            {/* Box 1: Scheduled Appointment Time */}
            <div className="p-4 text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                APPOINTMENT TIME
              </span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1">
                {trackingData.appointment_time || (trackingData.is_walk_in ? 'Walk-in' : '—')}
              </div>
              <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                {trackingData.is_walk_in ? 'Registered Walk-in' : 'Scheduled Slot'}
              </div>
            </div>

            {/* Box 2: Estimated Waiting Time */}
            <div className="p-4 text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                ESTIMATED WAIT
              </span>
              <div className={`text-xl sm:text-2xl font-black font-mono mt-1 ${
                trackingData.status === 'CALLED' || trackingData.status === 'IN_CONSULTATION'
                  ? 'text-emerald-600'
                  : trackingData.patients_ahead === 0
                  ? 'text-hospital-600'
                  : 'text-amber-600'
              }`}>
                {trackingData.estimated_wait_text || '—'}
              </div>
              <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                {trackingData.status === 'WAITING'
                  ? `~${trackingData.avg_consultation_time || 15}m per patient`
                  : trackingData.status === 'BOOKED'
                  ? 'Check-in at desk'
                  : 'Active in room'}
              </div>
            </div>

            {/* Box 3: Now Serving */}
            <div className="p-4 text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                NOW SERVING
              </span>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 font-mono mt-1">
                {trackingData.current_serving_token || '—'}
              </div>
              <div className="text-[11px] font-medium text-slate-500 truncate mt-0.5">
                {trackingData.current_serving_name || 'None Active'}
              </div>
            </div>

            {/* Box 4: Patients Ahead */}
            <div className="p-4 text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                PATIENTS AHEAD
              </span>
              <div className="text-xl sm:text-2xl font-black text-hospital-700 font-mono mt-1">
                {trackingData.patients_ahead}
              </div>
              <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                {trackingData.status === 'CALLED'
                  ? 'Called into room!'
                  : trackingData.status === 'IN_CONSULTATION'
                  ? 'Currently in room'
                  : trackingData.patients_ahead === 0
                  ? "You're next in queue!"
                  : `${trackingData.patients_ahead} waiting ahead`}
              </div>
            </div>

          </div>

          {/* Doctor & Room Details */}
          <div className="p-5 space-y-3 bg-white">
            <div className="flex items-center justify-between text-xs py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Doctor</span>
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-hospital-600" />
                {trackingData.doctor_name}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Consultation Room</span>
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <DoorOpen className="w-3.5 h-3.5 text-hospital-600" />
                {trackingData.room}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Hospital</span>
              <span className="font-bold text-slate-900">
                {trackingData.hospital_name}
              </span>
            </div>

            {/* Waiting Area Guidance Message */}
            <div className="pt-2">
              <div className="p-3.5 rounded-xl bg-hospital-50/80 border border-hospital-100 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-hospital-600 shrink-0 mt-0.5" />
                <p className="text-xs text-hospital-900 font-medium leading-relaxed">
                  {trackingData.message}
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Live Update Indicator */}
          <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium text-slate-700">Real-time WebSocket active</span>
            </div>
            <button
              onClick={() => handleSearch()}
              className="text-hospital-600 font-bold hover:underline flex items-center gap-1"
            >
              <RotateCw className="w-3 h-3" /> Refresh
            </button>
          </div>

        </div>
      )}
    </div>
  );

  return (
    <div className="py-4 space-y-4">
      {/* Mobile Framing Switcher Bar */}
      <div className="flex items-center justify-between max-w-md mx-auto px-1">
        <span className="text-xs font-medium text-slate-500">
          Public Patient Tracking Route (<code className="font-mono font-bold">/track/{activeToken}</code>)
        </span>
        <button
          onClick={() => setMobileFrame(!mobileFrame)}
          className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition"
        >
          <Smartphone className="w-3.5 h-3.5 text-hospital-600" />
          <span>{mobileFrame ? 'Full Width View' : 'Phone Frame Mockup'}</span>
        </button>
      </div>

      {mobileFrame ? (
        <div className="max-w-sm mx-auto p-4 bg-slate-900 rounded-[40px] shadow-2xl border-4 border-slate-800 ring-1 ring-slate-950/50">
          {/* Phone Speaker notch */}
          <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-4" />
          <div className="bg-slate-50 rounded-[28px] p-4 min-h-[580px] overflow-y-auto">
            {content}
          </div>
          <div className="w-28 h-1 bg-slate-700 rounded-full mx-auto mt-4" />
        </div>
      ) : (
        content
      )}
    </div>
  );
};
