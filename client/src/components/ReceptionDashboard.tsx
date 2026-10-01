import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { QueueOverview, PatientStatus, Patient } from '../types';
import { CsvImportModal } from './CsvImportModal';
import { WalkInModal } from './WalkInModal';
import {
  Sparkles,
  Cross,
  Monitor,
  LayoutPanelLeft,
  Settings,
  Megaphone,
  CheckCircle2,
  CalendarDays,
  UserPlus,
  Search,
  MoreHorizontal,
  MoreVertical,
  ChevronDown,
  Stethoscope,
  FileUp,
  Hourglass,
  RotateCw,
  RotateCcw,
  Home,
  X,
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
  onResetDemo?: (mode: 'active_demo' | 'all_booked') => void;
  isRefreshing?: boolean;
  error?: string | null;
}

type FilterCategory = 'ALL' | 'BOOKED' | 'WAITING' | 'CALLED' | 'COMPLETED' | 'MISSED' | 'WALK_IN';

const FILTERS: { key: FilterCategory; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'BOOKED', label: 'Booked' },
  { key: 'WAITING', label: 'Waiting' },
  { key: 'CALLED', label: 'Called' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'MISSED', label: 'No-show' },
  { key: 'WALK_IN', label: 'Walk-ins' },
];

const matchesFilter = (p: Patient, f: FilterCategory): boolean => {
  switch (f) {
    case 'ALL': return true;
    case 'BOOKED': return p.status === 'BOOKED';
    case 'WAITING': return p.status === 'WAITING';
    case 'CALLED': return p.status === 'CALLED' || p.status === 'IN_CONSULTATION';
    case 'COMPLETED': return p.status === 'COMPLETED';
    case 'MISSED': return p.status === 'NO_SHOW' || p.status === 'SKIPPED';
    case 'WALK_IN': return p.is_walk_in === true;
  }
};

const fmtTime = (iso?: string | null): string =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';

const STATUS_PILL: Record<PatientStatus, { label: string; cls: string }> = {
  BOOKED: { label: 'Booked', cls: 'bg-slate-100 text-slate-600' },
  CHECKED_IN: { label: 'Checked in', cls: 'bg-sky-50 text-sky-700' },
  WAITING: { label: 'Waiting', cls: 'bg-[#e3f1ee] text-[#2a6a60]' },
  CALLED: { label: 'Called', cls: 'bg-blue-50 text-blue-700' },
  IN_CONSULTATION: { label: 'In consultation', cls: 'bg-emerald-50 text-emerald-700' },
  COMPLETED: { label: 'Completed', cls: 'bg-slate-100 text-slate-500' },
  SKIPPED: { label: 'Skipped', cls: 'bg-amber-50 text-amber-700' },
  NO_SHOW: { label: 'No-show', cls: 'bg-rose-50 text-rose-700' },
};

const StatusPill: React.FC<{ status: PatientStatus }> = ({ status }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${STATUS_PILL[status].cls}`}>
    <span className="w-1.5 h-1.5 rounded-full bg-current" />
    {STATUS_PILL[status].label}
  </span>
);

const card = 'bg-white rounded-2xl border border-[#e6eaf2] shadow-[0_1px_2px_rgba(15,27,45,0.04),0_6px_16px_rgba(15,27,45,0.04)]';
const eyebrow = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5b6b82]';

export const ReceptionDashboard: React.FC<ReceptionDashboardProps> = ({
  overview,
  onRefresh,
  onResetDemo,
  isRefreshing = false,
  error = null,
}) => {
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterCategory>(
    overview.stats.waiting > 0 ? 'WAITING' : 'ALL'
  );
  const [search, setSearch] = useState('');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [rowMenu, setRowMenu] = useState<number | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { doctor, current_patient, next_patients, all_patients, stats } = overview;

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
  const nextPatient = next_patients[0] ?? null;
  const hasWaitingPatients = next_patients.length > 0;

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateLine = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });

  const q = search.trim().toLowerCase();
  const filteredPatients = all_patients.filter(
    (p) =>
      matchesFilter(p, selectedFilter) &&
      (!q || p.token.toLowerCase().includes(q) || p.patient_name.toLowerCase().includes(q))
  );
  const count = (f: FilterCategory) => all_patients.filter((p) => matchesFilter(p, f)).length;

  const apptLabel = (p: Patient) =>
    p.is_walk_in ? `Walk-in (${fmtTime(p.checked_in_at || p.created_at)})` : p.appointment_time;

  const doctorStatus = (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${isDoctorDelayed ? 'text-amber-700' : 'text-[#2a6a60]'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isDoctorDelayed ? 'bg-amber-500' : 'bg-[#2a6a60]'}`} />
      {isDoctorDelayed ? 'Delayed (15m)' : 'Available'}
    </span>
  );

  const navItem = (active: boolean) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
      active ? 'bg-[#d3e9e4] text-[#1f4f48]' : 'text-slate-700 hover:bg-slate-100'
    }`;

  const btnSoft =
    'inline-flex items-center justify-center gap-2 rounded-xl bg-[#e8effb] hover:bg-[#dce6f8] text-[#1f2f4a] text-sm font-medium px-3.5 py-2 min-h-[40px] transition disabled:opacity-50';

  return (
    <div className="min-h-screen bg-[#f3f5fa] text-[#0f1b2d] lg:pl-[280px]">
      {/* Toast */}
      {actionFeedback && (
        <div className="fixed bottom-6 right-4 sm:right-6 z-50 max-w-[calc(100vw-2rem)] bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-medium">
          <Sparkles className="w-4 h-4 text-[#7fd1c4] shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* SIDEBAR (desktop / tablet landscape) */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[280px] flex-col bg-white border-r border-[#e6eaf2] px-5 py-6 overflow-y-auto">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#d3e9e4] text-[#1f4f48] flex items-center justify-center shrink-0">
            <Cross className="w-5 h-5" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-bold leading-tight">CITY CARE HOSPITAL</div>
            <div className="text-[11px] font-semibold tracking-[0.12em] text-[#2a6a60]">RECEPTION</div>
          </div>
        </div>

        <div className={`${eyebrow} mt-8 mb-2 px-1`}>Operations</div>
        <nav className="space-y-1">
          <Link to="/reception" className={navItem(true)}>
            <LayoutPanelLeft className="w-5 h-5" /> Reception
          </Link>
          <Link to="/display" className={navItem(false)}>
            <Monitor className="w-5 h-5" /> Waiting Room TV
          </Link>
        </nav>

        <div className="border-t border-[#e6eaf2] mt-6 pt-5">
          <div className={`${eyebrow} mb-2 px-1`}>Queue today</div>
          <div className="grid grid-cols-3 bg-[#eef3fb] rounded-xl py-3 divide-x divide-[#d9e2f1] text-center">
            <div>
              <div className="text-lg font-bold text-[#2a6a60]">{stats.waiting}</div>
              <div className="text-xs text-[#5b6b82]">Waiting</div>
            </div>
            <div>
              <div className="text-lg font-bold">{current_patient?.token ?? '—'}</div>
              <div className="text-xs text-[#5b6b82]">Serving</div>
            </div>
            <div>
              <div className="text-lg font-bold">{nextPatient?.token ?? '—'}</div>
              <div className="text-xs text-[#5b6b82]">Next</div>
            </div>
          </div>
        </div>

        <div className="border-t border-[#e6eaf2] mt-5 pt-4 px-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs font-bold uppercase tracking-wide truncate">{doctor.name}</div>
              <div className="text-sm text-[#5b6b82]">{doctor.room}</div>
            </div>
            <span className={`rounded-full px-2.5 py-1 ${isDoctorDelayed ? 'bg-amber-50' : 'bg-[#e3f1ee]'}`}>{doctorStatus}</span>
          </div>
        </div>

        <button onClick={() => setSettingsOpen(true)} className={`${navItem(false)} mt-auto`}>
          <Settings className="w-5 h-5" /> Settings
        </button>
      </aside>

      {/* TOP BAR (below lg: compact navigation) */}
      <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-[#e6eaf2] px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#d3e9e4] text-[#1f4f48] flex items-center justify-center shrink-0">
          <Cross className="w-4 h-4" strokeWidth={2.5} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold leading-tight truncate">CITY CARE HOSPITAL</div>
          <div className="text-[10px] font-semibold tracking-[0.12em] text-[#2a6a60]">RECEPTION</div>
        </div>
        <Link to="/display" className="inline-flex items-center gap-1.5 rounded-lg bg-[#eef3fb] px-3 py-2 text-xs font-medium min-h-[40px]">
          <Monitor className="w-4 h-4" /> <span className="hidden sm:inline">Waiting Room TV</span><span className="sm:hidden">TV</span>
        </Link>
        <button onClick={() => setSettingsOpen(true)} aria-label="Settings" className="rounded-lg bg-[#eef3fb] p-2.5 min-h-[40px]">
          <Settings className="w-4 h-4" />
        </button>
      </header>

      <main className="mx-auto w-full max-w-[1320px] px-4 sm:px-6 lg:px-8 py-5 lg:py-6 space-y-5 lg:space-y-6 min-w-0">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">{error}</div>
        )}

        {/* MAIN HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight">RECEPTION</h1>
            <span className="rounded-full bg-[#e3f1ee] text-[#2a6a60] text-xs font-medium px-3 py-1">Outpatient Queue</span>
          </div>
          <div className={`${card} rounded-full px-4 py-2 flex items-center gap-3 text-sm`}>
            <span className="font-medium">{doctor.name} · {doctor.room}</span>
            <span className="w-px h-4 bg-[#dbe3ef]" />
            {doctorStatus}
          </div>
        </div>

        {/* GREETING */}
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{greeting}, Reception</h2>
            <div className="flex items-center gap-2 text-sm text-[#5b6b82] mt-1">
              <CalendarDays className="w-4 h-4" /> {dateLine} · General Outpatient
            </div>
          </div>
          <button onClick={() => setIsWalkInModalOpen(true)} className={`${card} inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] text-sm font-medium hover:bg-slate-50 transition`}>
            <UserPlus className="w-4 h-4" /> + Walk-in
          </button>
        </div>

        {/* NOW SERVING + NEXT PATIENT */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-start">
          {/* NOW SERVING */}
          <section className={`${card} p-5 sm:p-7 flex flex-col min-h-[300px]`}>
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-md bg-[#e3f1ee] text-[#2a6a60] text-[11px] font-semibold uppercase tracking-[0.12em] px-3 py-1.5">Now serving</span>
              {current_patient && (
                <span className="rounded-full bg-[#eef3fb] text-xs text-[#3b4a63] px-3 py-1.5 inline-flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2a6a60]" />
                  {current_patient.status === 'CALLED' ? 'Called — awaiting arrival' : 'In consultation'}
                </span>
              )}
            </div>

            {current_patient ? (
              <>
                <div className="text-5xl sm:text-6xl font-extrabold tracking-tight mt-5">{current_patient.token}</div>
                <div className="text-xl font-medium mt-2">{current_patient.patient_name}</div>
                <div className="text-sm text-[#5b6b82] mt-1">
                  {doctor.name} · {doctor.room} ·{' '}
                  {current_patient.status === 'CALLED'
                    ? `Called ${fmtTime(current_patient.called_at)}`
                    : `Started ${fmtTime(current_patient.updated_at || current_patient.called_at)}`}
                </div>

                <div className="mt-auto pt-6">
                  {current_patient.status === 'CALLED' ? (
                    <div className="space-y-3">
                      <button
                        onClick={() => handleStartConsultation(current_patient.id, current_patient.token)}
                        disabled={isUpdating}
                        className="w-full min-h-[52px] rounded-xl bg-[#2f7167] hover:bg-[#295f57] text-white text-base font-medium inline-flex items-center justify-center gap-2 transition disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-5 h-5" /> Start Consultation
                      </button>
                      <div className="flex items-center justify-center gap-6 text-sm text-[#3b4a63]">
                        <button onClick={() => handleSkip(current_patient.id, current_patient.token)} disabled={isUpdating} className="px-3 py-2 min-h-[40px] hover:text-[#0f1b2d]">Skip</button>
                        <button onClick={() => handleNoShow(current_patient.id, current_patient.token)} disabled={isUpdating} className="px-3 py-2 min-h-[40px] hover:text-[#0f1b2d]">No-show</button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <button
                        onClick={() => handleCompleteConsultation(current_patient.id, current_patient.token)}
                        disabled={isUpdating}
                        className="w-full min-h-[52px] rounded-xl border border-[#b7cfca] bg-white hover:bg-[#f2f8f6] text-[#1f4f48] text-base font-medium inline-flex items-center justify-center gap-2 transition disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-5 h-5 text-[#2f7167]" /> Complete Consultation
                      </button>
                      <div className="flex justify-center">
                        <button onClick={() => handleSkip(current_patient.id, current_patient.token)} disabled={isUpdating} className="text-sm text-[#5b6b82] hover:text-[#0f1b2d] px-3 py-2 min-h-[40px]">
                          End / Skip consultation
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
                <div className="text-lg font-semibold text-[#3b4a63]">No patient in room</div>
                <p className="text-sm text-[#5b6b82] mt-1">
                  {hasWaitingPatients ? 'Use Call Next to bring in the next waiting patient.' : 'No patients are currently waiting.'}
                </p>
              </div>
            )}
          </section>

          {/* NEXT PATIENT */}
          <section className={`${card} p-5 sm:p-7 flex flex-col min-h-[300px]`}>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="rounded-md bg-[#eef3fb] text-[#3b4a63] text-[11px] font-semibold uppercase tracking-[0.12em] px-3 py-1.5">Next patient</span>
              {nextPatient && (
                <span className="text-xs font-medium text-[#3b4a63]">
                  {nextPatient.is_walk_in ? 'Walk-in' : `Appt: ${nextPatient.appointment_time}`}
                  {nextPatient.checked_in_at ? ` · Arrived ${fmtTime(nextPatient.checked_in_at)}` : ''}
                </span>
              )}
            </div>

            {nextPatient ? (
              <>
                <div className="text-5xl sm:text-6xl font-extrabold tracking-tight mt-5">{nextPatient.token}</div>
                <div className="text-xl font-medium mt-2">{nextPatient.patient_name}</div>
                <div className="text-sm text-[#5b6b82] mt-1">
                  General Triage · {apptLabel(nextPatient)}
                  {nextPatient.checked_in_at ? ` · Arrived ${fmtTime(nextPatient.checked_in_at)}` : ''}
                </div>

                <div className="mt-auto pt-6 space-y-3">
                  <button
                    onClick={handleCallNext}
                    disabled={isUpdating}
                    className="w-full min-h-[56px] rounded-xl bg-[#2f7167] hover:bg-[#295f57] active:bg-[#235048] text-white text-lg font-semibold inline-flex items-center justify-center gap-3 shadow-[0_6px_16px_rgba(47,113,103,0.3)] transition disabled:opacity-50"
                  >
                    <Megaphone className="w-5 h-5" /> CALL NEXT ({nextPatient.token})
                  </button>
                  <div className="flex items-center justify-center gap-6 text-sm text-[#3b4a63]">
                    <button onClick={() => handleSkip(nextPatient.id, nextPatient.token)} disabled={isUpdating} className="px-3 py-2 min-h-[40px] hover:text-[#0f1b2d]">Skip</button>
                    <button onClick={() => handleNoShow(nextPatient.id, nextPatient.token)} disabled={isUpdating} className="px-3 py-2 min-h-[40px] hover:text-[#0f1b2d]">No-show</button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
                <div className="text-lg font-semibold text-[#3b4a63]">No one waiting</div>
                <p className="text-sm text-[#5b6b82] mt-1">Add a walk-in or check in a booked patient to fill the queue.</p>
                <button disabled className="mt-5 w-full min-h-[56px] rounded-xl bg-slate-100 text-slate-400 text-lg font-semibold cursor-not-allowed">CALL NEXT</button>
              </div>
            )}
          </section>
        </div>

        {/* TODAY'S QUEUE */}
        <section className={`${card} overflow-hidden`}>
          <div className="p-5 sm:p-6 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-semibold leading-tight">Today's Queue</h3>
              <span className="rounded-full bg-[#eef3fb] text-xs text-[#3b4a63] px-3 py-1.5 whitespace-nowrap">{stats.waiting} waiting</span>
            </div>
            <div className="flex gap-1 bg-[#eef3fb] rounded-xl p-1 overflow-x-auto shrink-0 max-w-full order-last xl:order-none">
              {FILTERS.map((f) => {
                const active = selectedFilter === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setSelectedFilter(f.key)}
                    className={`rounded-lg px-3 py-1.5 min-h-[40px] text-sm whitespace-nowrap transition ${
                      active ? 'bg-white text-[#2a6a60] font-semibold shadow-sm' : 'text-[#3b4a63] hover:bg-white/60'
                    }`}
                  >
                    {f.label} ({count(f.key)})
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-3 ml-auto basis-full sm:basis-auto sm:flex-none min-w-0">
              <label className="flex items-center gap-2 bg-[#eef3fb] rounded-xl px-3 min-h-[44px] flex-1 sm:w-[280px] min-w-0">
                <Search className="w-4 h-4 text-[#5b6b82] shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search patient or token..."
                  className="bg-transparent outline-none text-sm w-full min-w-0"
                />
              </label>
              <button onClick={() => setIsWalkInModalOpen(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-[#d3e9e4] hover:bg-[#c5e0da] text-[#1f4f48] text-sm font-medium px-4 min-h-[44px] whitespace-nowrap transition">
                + Walk-in
              </button>
            </div>
          </div>

          {/* Column header (md and up) */}
          <div className="hidden xl:grid grid-cols-[90px_minmax(0,1.6fr)_minmax(0,1.3fr)_minmax(0,1fr)_190px] gap-4 bg-[#eef1fb] px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#3b4a63]">
            <div>Token</div><div>Patient</div><div>Appointment</div><div>Status</div><div className="text-right">Action</div>
          </div>

          <div className="divide-y divide-[#eef1f6]">
            {filteredPatients.length === 0 && (
              <div className="py-10 text-center text-sm text-[#5b6b82]">No patients match this filter or search.</div>
            )}
            {filteredPatients.map((p) => {
              const isNext = nextPatient?.id === p.id;
              const hasMenu = p.status === 'WAITING' || p.status === 'CALLED';
              return (
                <div
                  key={p.id}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] xl:grid-cols-[90px_minmax(0,1.6fr)_minmax(0,1.3fr)_minmax(0,1fr)_190px] items-center gap-x-4 gap-y-3 px-4 sm:px-6 py-4 xl:py-5"
                >
                  <div className={`text-lg font-bold ${p.is_walk_in ? 'text-[#2a6a60]' : ''}`}>{p.token}</div>

                  <div className="min-w-0 xl:contents">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base font-medium truncate">{p.patient_name}</span>
                      {isNext && <span className="rounded bg-[#2f7167] text-white text-[10px] font-bold px-1.5 py-0.5 shrink-0">NEXT</span>}
                      {p.is_walk_in && <span className="rounded bg-[#e8effb] text-[#3b4a63] text-[11px] px-1.5 py-0.5 shrink-0">Walk-in</span>}
                    </div>
                    <div className="text-sm text-[#5b6b82] xl:text-[#3b4a63] xl:mt-0 mt-0.5">{apptLabel(p)}</div>
                  </div>

                  <div className="justify-self-end xl:justify-self-start"><StatusPill status={p.status} /></div>

                  <div className="col-span-3 xl:col-span-1 flex items-center justify-end gap-2 relative">
                    {p.status === 'BOOKED' && (
                      <button onClick={() => handleCheckIn(p.id, p.token, p.patient_name)} disabled={isUpdating} className="rounded-lg bg-[#2f7167] hover:bg-[#295f57] text-white text-sm font-medium px-4 min-h-[40px] transition disabled:opacity-50">Check in</button>
                    )}
                    {p.status === 'WAITING' && isNext && (
                      <button onClick={handleCallNext} disabled={isUpdating} className="rounded-lg bg-[#2f7167] hover:bg-[#295f57] text-white text-sm font-medium px-4 min-h-[40px] transition disabled:opacity-50">Call</button>
                    )}
                    {p.status === 'CALLED' && (
                      <button onClick={() => handleStartConsultation(p.id, p.token)} disabled={isUpdating} className="rounded-lg bg-[#2f7167] hover:bg-[#295f57] text-white text-sm font-medium px-4 min-h-[40px] transition disabled:opacity-50">Start</button>
                    )}
                    {p.status === 'IN_CONSULTATION' && (
                      <button onClick={() => handleCompleteConsultation(p.id, p.token)} disabled={isUpdating} className="rounded-lg border border-[#b7cfca] text-[#1f4f48] text-sm font-medium px-4 min-h-[40px] hover:bg-[#f2f8f6] transition disabled:opacity-50">Complete</button>
                    )}
                    {(p.status === 'COMPLETED' || p.status === 'SKIPPED' || p.status === 'NO_SHOW') && (
                      <button onClick={() => handleRequeue(p.id, p.token)} disabled={isUpdating} className="text-sm text-[#3b4a63] hover:text-[#0f1b2d] px-3 min-h-[40px]">Re-queue</button>
                    )}
                    <div className="w-9 flex justify-center">
                      {hasMenu && (
                        <>
                          <button onClick={() => setRowMenu(rowMenu === p.id ? null : p.id)} aria-label={`More actions for ${p.token}`} className="p-2 rounded-lg hover:bg-slate-100 text-[#5b6b82]">
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                          {rowMenu === p.id && (
                            <>
                              <div className="fixed inset-0 z-30" onClick={() => setRowMenu(null)} />
                              <div className="absolute right-0 top-full mt-1 z-40 w-40 bg-white rounded-xl border border-[#e6eaf2] shadow-xl p-1.5 text-sm">
                                <button onClick={() => { setRowMenu(null); handleSkip(p.id, p.token); }} className="w-full text-left rounded-lg px-3 py-2.5 hover:bg-slate-50">Skip</button>
                                <button onClick={() => { setRowMenu(null); handleNoShow(p.id, p.token); }} className="w-full text-left rounded-lg px-3 py-2.5 hover:bg-rose-50 text-rose-700">No-show</button>
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* BOTTOM OPERATIONAL BAR */}
        <section className={`${card} px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3`}>
          <div className="flex items-center gap-3 text-sm">
            <Stethoscope className="w-5 h-5 text-[#3b4a63]" />
            <span className="font-medium">{doctor.name} · {doctor.room}</span>
            <span className="w-px h-4 bg-[#dbe3ef]" />
            {doctorStatus}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setIsCsvModalOpen(true)} className={btnSoft}><FileUp className="w-4 h-4" /> Import CSV</button>
            <button
              onClick={handleToggleDoctorDelay}
              disabled={isUpdating}
              title="Toggle doctor delay"
              className={`${btnSoft} ${isDoctorDelayed ? '!bg-amber-100 !text-amber-900 hover:!bg-amber-200' : ''}`}
            >
              <Hourglass className="w-4 h-4" /> Doctor Delay
            </button>
            <div className="relative">
              <button onClick={() => setMoreOpen(!moreOpen)} className={btnSoft}>
                <MoreVertical className="w-4 h-4" /> More <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {moreOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMoreOpen(false)} />
                  <div className="absolute right-0 bottom-full mb-2 z-40 w-72 bg-white rounded-xl border border-[#e6eaf2] shadow-xl p-2 text-sm">
                    <button onClick={() => { setMoreOpen(false); onRefresh(); }} disabled={isRefreshing} className="w-full flex items-center gap-2 text-left rounded-lg px-3 py-2.5 hover:bg-slate-50">
                      <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh queue
                    </button>
                    {onResetDemo && (
                      <>
                        <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#5b6b82]">Demo scenarios</div>
                        <button onClick={() => { setMoreOpen(false); onResetDemo('all_booked'); }} className="w-full flex items-center gap-2 text-left rounded-lg px-3 py-2.5 hover:bg-slate-50">
                          <RotateCcw className="w-4 h-4" /> Morning state (all booked)
                        </button>
                        <button onClick={() => { setMoreOpen(false); onResetDemo('active_demo'); }} className="w-full flex items-center gap-2 text-left rounded-lg px-3 py-2.5 hover:bg-slate-50">
                          <RotateCcw className="w-4 h-4" /> Mid-day live queue
                        </button>
                      </>
                    )}
                    <Link to="/" className="flex items-center gap-2 rounded-lg px-3 py-2.5 hover:bg-slate-50">
                      <Home className="w-4 h-4" /> Demo launcher
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* SETTINGS: average consultation time (existing setting) */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40" onClick={() => setSettingsOpen(false)}>
          <div className={`${card} w-full max-w-sm p-5`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">Settings</h3>
              <button onClick={() => setSettingsOpen(false)} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <label htmlFor="avg-consultation-time" className={eyebrow}>Average consultation time</label>
            <select
              id="avg-consultation-time"
              value={doctor.avg_consultation_time || 15}
              onChange={(e) => handleConsultationTimeChange(Number(e.target.value))}
              disabled={isUpdating}
              className="mt-2 w-full rounded-xl border border-[#e6eaf2] bg-[#eef3fb] px-3 min-h-[44px] text-sm"
            >
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes (Default)</option>
              <option value={20}>20 minutes</option>
              <option value={30}>30 minutes</option>
            </select>
            <p className="text-xs text-[#5b6b82] mt-2">Used to estimate patient wait times.</p>
          </div>
        </div>
      )}

      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onSuccess={(count) => {
          showToast(`Imported ${count} appointments from HMS.`);
          onRefresh();
        }}
      />
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
