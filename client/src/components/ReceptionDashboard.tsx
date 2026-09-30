import React, { useState } from 'react';
import type { QueueOverview, PatientStatus } from '../types';
import { StatusBadge } from './StatusBadge';
import { CsvImportModal } from './CsvImportModal';
import { WalkInModal } from './WalkInModal';
import {
  UserCheck,
  Clock,
  Users,
  Phone,
  FileSpreadsheet,
  AlertTriangle,
  Play,
  SkipForward,
  UserX,
  Stethoscope,
  DoorOpen,
  Sparkles,
  CalendarCheck,
  CheckCircle2,
  Hourglass,
  Check,
  UserPlus,
  Activity,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import {
  checkInPatient,
  callNextPatient,
  startConsultation,
  completeConsultation,
  skipPatient,
  noShowPatient,
  updateDoctorStatus,
  updateDoctorAvgConsultationTime,
  updatePatientStatus,
} from '../services/api';

interface ReceptionDashboardProps {
  overview: QueueOverview;
  onRefresh: () => void;
}

type FilterCategory = 'ALL' | 'BOOKED' | 'WAITING' | 'CALLED' | 'IN_CONSULTATION' | 'COMPLETED' | 'NO_SHOW' | 'WALK_IN';

export const ReceptionDashboard: React.FC<ReceptionDashboardProps> = ({ overview, onRefresh }) => {
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterCategory>('ALL');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const { hospital_name, doctor, current_patient, next_patients, all_patients, stats, summary } = overview;

  const showToast = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  // 1. Check In Patient
  const handleCheckIn = async (patientId: number, token: string, name: string) => {
    setIsUpdating(true);
    try {
      await checkInPatient(patientId);
      showToast(`Checked In: ${token} — ${name} (Added to Waiting Queue)`);
      onRefresh();
    } catch (err: any) {
      showToast(`Error checking in: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // 2. CALL NEXT
  const handleCallNext = async () => {
    setIsUpdating(true);
    try {
      const res = await callNextPatient(doctor.id);
      if (res.patient) {
        showToast(`🔔 CALLED NEXT: ${res.patient.token} — ${res.patient.patient_name}`);
      }
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'No patients are currently waiting.');
    } finally {
      setIsUpdating(false);
    }
  };

  // 3. START CONSULTATION
  const handleStartConsultation = async (patientId: number, token: string) => {
    setIsUpdating(true);
    try {
      await startConsultation(patientId);
      showToast(`Consultation Started: ${token}`);
      onRefresh();
    } catch (err: any) {
      showToast(`Error starting consultation: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // 4. COMPLETE CONSULTATION
  const handleCompleteConsultation = async (patientId: number, token: string) => {
    setIsUpdating(true);
    try {
      await completeConsultation(patientId);
      showToast(`Consultation Completed: ${token}`);
      onRefresh();
    } catch (err: any) {
      showToast(`Error completing consultation: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // 5. SKIP
  const handleSkip = async (patientId: number, token: string) => {
    setIsUpdating(true);
    try {
      await skipPatient(patientId);
      showToast(`Marked ${token} as SKIPPED`);
      onRefresh();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // 6. NO SHOW
  const handleNoShow = async (patientId: number, token: string) => {
    setIsUpdating(true);
    try {
      await noShowPatient(patientId);
      showToast(`Marked ${token} as NO SHOW`);
      onRefresh();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // 7. Toggle Doctor Delay
  const handleToggleDoctorDelay = async () => {
    setIsUpdating(true);
    try {
      const isCurrentlyDelayed = doctor.delay_status.toLowerCase().includes('delay');
      const nextStatus = isCurrentlyDelayed ? 'Available' : 'Delayed 15m';
      await updateDoctorStatus(doctor.id, nextStatus);
      showToast(`Doctor status updated: ${nextStatus}`);
      onRefresh();
    } catch (err: any) {
      showToast(`Error updating doctor status: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Re-queue helper
  const handleRequeue = async (patientId: number, token: string) => {
    setIsUpdating(true);
    try {
      await updatePatientStatus(patientId, 'WAITING');
      showToast(`Re-queued: ${token} (Added back to waiting line)`);
      onRefresh();
    } catch (err: any) {
      showToast(`Error re-queuing: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // 8. Update Average Consultation Time
  const handleConsultationTimeChange = async (minutes: number) => {
    setIsUpdating(true);
    try {
      await updateDoctorAvgConsultationTime(doctor.id, minutes);
      showToast(`Average consultation time updated to ${minutes} min`);
      onRefresh();
    } catch (err: any) {
      showToast(`Error updating consultation time: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const isDoctorDelayed = doctor.delay_status.toLowerCase().includes('delay');
  const hasWaitingPatients = next_patients.length > 0;

  // Filtered Patients List (Section 4)
  const filteredPatients = all_patients.filter((p) => {
    if (selectedFilter === 'ALL') return true;
    if (selectedFilter === 'BOOKED') return p.status === 'BOOKED';
    if (selectedFilter === 'WAITING') return p.status === 'WAITING';
    if (selectedFilter === 'CALLED') return p.status === 'CALLED';
    if (selectedFilter === 'IN_CONSULTATION') return p.status === 'IN_CONSULTATION';
    if (selectedFilter === 'COMPLETED') return p.status === 'COMPLETED';
    if (selectedFilter === 'NO_SHOW') return p.status === 'NO_SHOW' || p.status === 'SKIPPED';
    if (selectedFilter === 'WALK_IN') return p.is_walk_in === true;
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Bar */}
      {actionFeedback && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-medium border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Sparkles className="w-4 h-4 text-hospital-400" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* TOP HEADER SECTION */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-hospital-700 bg-hospital-50 border border-hospital-200 px-2.5 py-0.5 rounded-md">
                Floor Reception Console
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-medium">Outpatient Department (OPD)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {hospital_name}
            </h2>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="flex items-center gap-1.5 text-base font-bold text-slate-800">
                <Stethoscope className="w-5 h-5 text-hospital-600" />
                <span>{doctor.name}</span>
              </div>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                <DoorOpen className="w-4 h-4 text-slate-500" />
                <span>{doctor.room}</span>
              </div>
            </div>
          </div>

          {/* Action Toolbar: + Walk-In, Import CSV, Doctor Delay Toggle, Avg Consultation Time */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Average Consultation Time Setting */}
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl shadow-sm">
              <Clock className="w-4 h-4 text-hospital-600 shrink-0" />
              <div className="flex flex-col">
                <label htmlFor="avg-consultation-time" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Avg Consultation Time
                </label>
                <select
                  id="avg-consultation-time"
                  value={doctor.avg_consultation_time || 15}
                  onChange={(e) => handleConsultationTimeChange(Number(e.target.value))}
                  disabled={isUpdating}
                  className="text-xs sm:text-sm font-bold text-slate-800 bg-transparent border-0 p-0 pr-1 focus:ring-0 cursor-pointer font-sans outline-none"
                >
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes (Default)</option>
                  <option value={20}>20 minutes</option>
                  <option value={30}>30 minutes</option>
                </select>
              </div>
            </div>

            {/* + WALK-IN PATIENT BUTTON (Section 3) */}
            <button
              onClick={() => setIsWalkInModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-hospital-600 hover:bg-hospital-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-hospital-600/20 transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ WALK-IN PATIENT</span>
            </button>

            {/* IMPORT APPOINTMENTS BUTTON (Section 2) */}
            <button
              onClick={() => setIsCsvModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm shadow-sm transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-hospital-300" />
              <span>IMPORT APPOINTMENTS</span>
            </button>

            {/* Doctor Delay Status Toggle (Section 9) */}
            <button
              onClick={handleToggleDoctorDelay}
              disabled={isUpdating}
              className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border transition text-left shadow-sm ${
                isDoctorDelayed
                  ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                  : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
              }`}
              title="Click to toggle doctor delay status"
            >
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Doctor Status
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isDoctorDelayed
                        ? 'bg-amber-500 animate-ping'
                        : 'bg-emerald-500 animate-pulse'
                    }`}
                  />
                  <span className="text-xs sm:text-sm font-bold">
                    {isDoctorDelayed ? 'DOCTOR DELAYED (15m)' : 'AVAILABLE'}
                  </span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* DYNAMIC DASHBOARD STATISTICS CARDS (Section 5) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Total Booked</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{stats.total}</span>
            <span className="text-[10px] text-slate-400">Appts</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-sky-700 uppercase">Checked In</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-sky-700">{stats.checked_in}</span>
            <span className="text-[10px] text-sky-600">Total</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-amber-700 uppercase">Waiting</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-700">{stats.waiting}</span>
            <span className="text-[10px] text-amber-600">In Line</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-emerald-700 uppercase">In Room</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-700">
              {stats.in_consultation + (current_patient?.status === 'CALLED' ? 1 : 0)}
            </span>
            <span className="text-[10px] text-emerald-600">Active</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-teal-700 uppercase">Completed</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-teal-700">{stats.completed}</span>
            <span className="text-[10px] text-teal-600">Done</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-rose-700 uppercase">No Show</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-rose-700">{stats.no_show + stats.skipped}</span>
            <span className="text-[10px] text-rose-600">Missed</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-purple-700 uppercase">Walk-Ins</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-purple-700">{stats.walk_ins}</span>
            <span className="text-[10px] text-purple-600">Added</span>
          </div>
        </div>
      </div>

      {/* CORE QUEUE MANAGEMENT ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT: CURRENTLY SERVING & ACTION CONSOLE (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* CURRENTLY SERVING CARD */}
          <div className="bg-white rounded-2xl border-2 border-emerald-500/40 p-6 shadow-md shadow-emerald-500/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full pointer-events-none" />
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <h3 className="text-xs font-black uppercase tracking-widest text-emerald-800">
                  CURRENTLY SERVING
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
                Room 2
              </span>
            </div>

            {current_patient ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight font-mono">
                      {current_patient.token}
                    </div>
                    <div className="text-xl font-bold text-slate-800 mt-1">
                      {current_patient.patient_name}
                    </div>
                    {current_patient.is_walk_in && (
                      <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                        Walk-In Patient
                      </span>
                    )}
                  </div>
                  <StatusBadge status={current_patient.status} size="md" />
                </div>

                <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Appt: {current_patient.appointment_time}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{current_patient.phone}</span>
                  </div>
                </div>

                {/* CONTEXTUAL ACTION BUTTONS */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                    Active Patient Actions
                  </div>

                  {current_patient.status === 'CALLED' && (
                    <div className="space-y-2">
                      <button
                        onClick={() => handleStartConsultation(current_patient.id, current_patient.token)}
                        disabled={isUpdating}
                        className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>START CONSULTATION</span>
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleSkip(current_patient.id, current_patient.token)}
                          disabled={isUpdating}
                          className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                        >
                          <SkipForward className="w-3.5 h-3.5 text-slate-600" />
                          <span>SKIP</span>
                        </button>

                        <button
                          onClick={() => handleNoShow(current_patient.id, current_patient.token)}
                          disabled={isUpdating}
                          className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                        >
                          <UserX className="w-3.5 h-3.5 text-rose-600" />
                          <span>NO SHOW</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {current_patient.status === 'IN_CONSULTATION' && (
                    <div className="space-y-2">
                      <button
                        onClick={() => handleCompleteConsultation(current_patient.id, current_patient.token)}
                        disabled={isUpdating}
                        className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        <span>COMPLETE CONSULTATION</span>
                      </button>

                      <button
                        onClick={() => handleSkip(current_patient.id, current_patient.token)}
                        disabled={isUpdating}
                        className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                      >
                        <SkipForward className="w-3.5 h-3.5 text-slate-500" />
                        <span>End / Skip Consultation</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400">
                <p className="text-base font-semibold text-slate-600">No Patient In Room</p>
                <p className="text-xs text-slate-400 mt-1">
                  {hasWaitingPatients
                    ? 'Click "CALL NEXT" below to call the next waiting patient.'
                    : 'No patients are currently waiting in the queue.'}
                </p>
              </div>
            )}

            {/* CALL NEXT BUTTON */}
            <div className="mt-5 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Queue Calling Control
                </span>
                <span className="text-xs font-medium text-slate-500">
                  {next_patients.length} Waiting
                </span>
              </div>

              <button
                onClick={handleCallNext}
                disabled={isUpdating || !hasWaitingPatients}
                className={`w-full py-3.5 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2.5 shadow-md transition ${
                  hasWaitingPatients
                    ? 'bg-hospital-600 hover:bg-hospital-700 active:bg-hospital-800 text-white shadow-hospital-600/25'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                <span>CALL NEXT PATIENT</span>
              </button>

              {!hasWaitingPatients && (
                <p className="text-[11px] text-slate-400 text-center mt-2 font-medium">
                  No patients are currently waiting.
                </p>
              )}
            </div>
          </div>

          {/* SECTION 6: TODAY'S SUMMARY CARD */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-hospital-600" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  TODAY'S SUMMARY
                </h4>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Live Data
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Total Appointments</span>
                <span className="font-bold text-slate-900 font-mono">{summary.total_appointments}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Checked In</span>
                <span className="font-bold text-sky-700 font-mono">{summary.checked_in_count}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Completed</span>
                <span className="font-bold text-teal-700 font-mono">{summary.completed_count}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">No Show / Skipped</span>
                <span className="font-bold text-rose-700 font-mono">{summary.no_show_count + summary.skipped_count}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Walk-Ins</span>
                <span className="font-bold text-purple-700 font-mono">{summary.walk_ins_count}</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500 font-medium flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-hospital-600" /> Average Wait Time
                </span>
                <span className="font-bold text-hospital-700 font-mono bg-hospital-50 px-2 py-0.5 rounded">
                  ~{summary.avg_waiting_time_minutes} mins
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: NEXT PATIENTS QUEUE & FILTERABLE TODAY'S PATIENTS TABLE (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* NEXT PATIENTS SECTION (FIFO Queue) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-hospital-600" />
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                  NEXT PATIENTS (FIFO WAITING QUEUE)
                </h3>
              </div>
              <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                {next_patients.length} in Waiting Queue
              </span>
            </div>

            {next_patients.length > 0 ? (
              <div className="space-y-2.5">
                {next_patients.map((patient, index) => (
                  <div
                    key={patient.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-hospital-100 text-hospital-800 font-mono font-bold text-xs flex items-center justify-center">
                        #{index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-slate-900">
                            {patient.token}
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="font-bold text-sm text-slate-800">
                            {patient.patient_name}
                          </span>
                          {patient.is_walk_in && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                              Walk-in
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Appt: {patient.appointment_time}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={patient.status} size="sm" />
                      {index === 0 && (
                        <button
                          onClick={handleCallNext}
                          disabled={isUpdating}
                          className="text-xs font-bold px-3 py-1 rounded-lg bg-hospital-600 text-white hover:bg-hospital-700 shadow-sm transition"
                        >
                          Call Next
                        </button>
                      )}
                      <button
                        onClick={() => handleSkip(patient.id, patient.token)}
                        disabled={isUpdating}
                        className="text-xs font-semibold px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                      >
                        Skip
                      </button>
                      <button
                        onClick={() => handleNoShow(patient.id, patient.token)}
                        disabled={isUpdating}
                        className="text-xs font-semibold px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition"
                      >
                        No Show
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-sm font-medium">No patients are currently waiting.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Click "+ WALK-IN PATIENT" or check in booked patients below to populate the queue.
                </p>
              </div>
            )}
          </div>

          {/* SECTION 4: TODAY'S PATIENTS WITH SIMPLE FILTERS */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 space-y-3 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                    TODAY'S PATIENTS ({all_patients.length})
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Integrated view of hospital appointments and floor walk-ins
                  </p>
                </div>
              </div>

              {/* Simple Filter Pills (Section 4) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {(['ALL', 'BOOKED', 'WAITING', 'CALLED', 'IN_CONSULTATION', 'COMPLETED', 'NO_SHOW', 'WALK_IN'] as FilterCategory[]).map(
                  (filter) => (
                    <button
                      key={filter}
                      onClick={() => setSelectedFilter(filter)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition whitespace-nowrap ${
                        selectedFilter === filter
                          ? 'bg-hospital-600 text-white shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {filter === 'ALL'
                        ? 'All'
                        : filter === 'IN_CONSULTATION'
                        ? 'In Consultation'
                        : filter === 'NO_SHOW'
                        ? 'No Show / Skipped'
                        : filter === 'WALK_IN'
                        ? 'Walk-ins'
                        : filter.charAt(0) + filter.slice(1).toLowerCase()}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="overflow-x-auto max-h-[480px]">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-100/80 text-slate-600 font-bold uppercase text-[11px] border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3">Token</th>
                    <th className="px-4 py-3">Patient Name</th>
                    <th className="px-4 py-3">Appt Time</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Queue Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPatients.length > 0 ? (
                    filteredPatients.map((p) => {
                      const isCurrent = current_patient?.id === p.id;
                      return (
                        <tr
                          key={p.id}
                          className={`hover:bg-slate-50/80 transition ${
                            isCurrent ? 'bg-emerald-50/40 font-medium' : ''
                          }`}
                        >
                          <td className="px-4 py-3 font-mono font-bold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <span>{p.token}</span>
                              {p.is_walk_in && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 bg-purple-100 text-purple-700 rounded">
                                  W
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {p.patient_name}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {p.appointment_time}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={p.status} size="sm" />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* BOOKED -> CHECK IN */}
                              {p.status === 'BOOKED' && (
                                <button
                                  onClick={() => handleCheckIn(p.id, p.token, p.patient_name)}
                                  disabled={isUpdating}
                                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-hospital-600 hover:bg-hospital-700 text-white shadow-sm transition"
                                >
                                  CHECK IN
                                </button>
                              )}

                              {/* WAITING */}
                              {p.status === 'WAITING' && (
                                <button
                                  onClick={handleCallNext}
                                  disabled={isUpdating}
                                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-hospital-50 hover:bg-hospital-100 text-hospital-800 border border-hospital-200 transition"
                                >
                                  Call Next
                                </button>
                              )}

                              {/* CALLED */}
                              {p.status === 'CALLED' && (
                                <button
                                  onClick={() => handleStartConsultation(p.id, p.token)}
                                  disabled={isUpdating}
                                  className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
                                >
                                  Start Consultation
                                </button>
                              )}

                              {/* IN CONSULTATION */}
                              {p.status === 'IN_CONSULTATION' && (
                                <button
                                  onClick={() => handleCompleteConsultation(p.id, p.token)}
                                  disabled={isUpdating}
                                  className="text-xs font-bold px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition"
                                >
                                  Complete
                                </button>
                              )}

                              {/* COMPLETED / SKIPPED / NO SHOW -> RE-QUEUE */}
                              {(p.status === 'COMPLETED' || p.status === 'SKIPPED' || p.status === 'NO_SHOW') && (
                                <button
                                  onClick={() => handleRequeue(p.id, p.token)}
                                  disabled={isUpdating}
                                  className="text-[11px] font-medium text-slate-500 hover:text-slate-800 underline transition"
                                >
                                  Re-queue
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No patients matching filter "{selectedFilter}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

      {/* CSV Import Modal (Section 2) */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onSuccess={(count) => {
          showToast(`Imported ${count} appointments from HMS.`);
          onRefresh();
        }}
      />

      {/* Walk-In Modal (Section 3) */}
      <WalkInModal
        isOpen={isWalkInModalOpen}
        onClose={() => setIsWalkInModalOpen(false)}
        onSuccess={(token, name) => {
          showToast(`Registered Walk-In: ${token} — ${name}`);
          onRefresh();
        }}
      />
    </div>
  );
};
