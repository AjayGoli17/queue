import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { QueueOverview, PatientStatus, Patient } from '../types';
import { CsvImportModal } from './CsvImportModal';
import { WalkInModal } from './WalkInModal';
import {
  Cross,
  Plus,
  FileUp,
  Search,
  Monitor,
  Settings,
  ChevronDown,
  RotateCcw,
  RotateCw,
  Sparkles,
  X,
  User,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import {
  completeConsultation,
  updateDoctorStatus,
  updateDoctorAvgConsultationTime,
  updatePatientStatus,
  deleteAllAppointments,
} from '../services/api';

interface ReceptionDashboardProps {
  overview: QueueOverview;
  onRefresh: () => void;
  onResetDemo?: (mode: 'active_demo' | 'all_booked') => void;
  isRefreshing?: boolean;
  error?: string | null;
}

type FilterStatus =
  | 'ALL'
  | 'BOOKED'
  | 'CHECKED_IN'
  | 'WAITING'
  | 'CALLED'
  | 'IN_CONSULTATION'
  | 'COMPLETED'
  | 'MISSED'
  | 'WALK_IN';

const fmtTime = (iso?: string | null): string =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';

const STATUS_PILL: Record<PatientStatus, { label: string; cls: string }> = {
  BOOKED: { label: 'Booked', cls: 'bg-slate-100 text-slate-600 border border-slate-200/80' },
  CHECKED_IN: { label: 'Checked In', cls: 'bg-sky-50 text-sky-700 border border-sky-200/80' },
  WAITING: { label: 'Waiting', cls: 'bg-teal-50 text-teal-800 border border-teal-200/80' },
  CALLED: { label: 'Called', cls: 'bg-blue-50 text-blue-700 border border-blue-200/80 font-bold' },
  IN_CONSULTATION: { label: 'In Consultation', cls: 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-bold' },
  COMPLETED: { label: 'Completed', cls: 'bg-slate-100 text-slate-500 border border-slate-200/80' },
  SKIPPED: { label: 'Skipped', cls: 'bg-amber-50 text-amber-800 border border-amber-200/80' },
  NO_SHOW: { label: 'No-show', cls: 'bg-rose-50 text-rose-700 border border-rose-200/80' },
};

const StatusPill: React.FC<{ status: PatientStatus }> = ({ status }) => {
  const meta = STATUS_PILL[status] || { label: status, cls: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${meta.cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {meta.label}
    </span>
  );
};

export const ReceptionDashboard: React.FC<ReceptionDashboardProps> = ({
  overview,
  onRefresh,
  onResetDemo,
  isRefreshing = false,
  error = null,
}) => {
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<FilterStatus>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>('TODAY');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { doctor, current_patient, next_patients, all_patients, stats } = overview;

  const showToast = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  // 1. CALL Action (WAITING -> CALLED)
  const handleCall = async (patientId: number, token?: string) => {
    setIsUpdating(true);
    try {
      await updatePatientStatus(patientId, 'CALLED');
      showToast(`Called: ${token || `Patient #${patientId}`}`);
      onRefresh();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // 2. COMPLETE Action (CALLED -> COMPLETED)
  const handleComplete = async (patientId: number, token?: string) => {
    setIsUpdating(true);
    try {
      await completeConsultation(patientId);
      showToast(`Completed: ${token || `Patient #${patientId}`}`);
      onRefresh();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // 3. DELETE ALL Action
  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const res = await deleteAllAppointments(selectedDoctor === 'ALL' ? undefined : selectedDoctor);
      showToast(res.message || 'All appointments removed from queue.');
      setIsDeleteModalOpen(false);
      onRefresh();
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Failed to delete appointments'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleDoctorDelay = async () => {
    setIsUpdating(true);
    try {
      const isCurrentlyDelayed = doctor.delay_status.toLowerCase().includes('delay');
      const nextStatus = isCurrentlyDelayed ? 'Available' : 'Delayed 15m';
      await updateDoctorStatus(doctor.id, nextStatus);
      showToast(`Doctor status updated: ${nextStatus}`);
      onRefresh();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConsultationTimeChange = async (minutes: number) => {
    setIsUpdating(true);
    try {
      await updateDoctorAvgConsultationTime(doctor.id, minutes);
      showToast(`Average consultation time updated to ${minutes} min`);
      onRefresh();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // 4 Statistics
  const bookedCount = stats?.booked ?? all_patients.filter((p) => p.status === 'BOOKED').length;
  const checkedInCount = stats?.checked_in ?? all_patients.filter((p) => p.status === 'CHECKED_IN').length;
  const waitingCount = stats?.waiting ?? all_patients.filter((p) => p.status === 'WAITING').length;
  const completedCount = stats?.completed ?? all_patients.filter((p) => p.status === 'COMPLETED').length;

  // Filter Patients
  const q = search.trim().toLowerCase();
  const filteredPatients = useMemo(() => {
    return all_patients.filter((p) => {
      // 1. Search Query
      const matchesSearch =
        !q ||
        p.token.toLowerCase().includes(q) ||
        p.patient_name.toLowerCase().includes(q) ||
        (p.phone && p.phone.includes(q));

      // 2. Doctor Filter
      const matchesDoctor =
        selectedDoctor === 'ALL' ||
        p.doctor_id === selectedDoctor ||
        doctor.id === selectedDoctor;

      // 3. Status Filter (Default 'ALL' shows active queue, excluding COMPLETED)
      let matchesStatus = true;
      if (selectedStatus === 'ALL') matchesStatus = p.status !== 'COMPLETED';
      else if (selectedStatus === 'BOOKED') matchesStatus = p.status === 'BOOKED';
      else if (selectedStatus === 'CHECKED_IN') matchesStatus = p.status === 'CHECKED_IN';
      else if (selectedStatus === 'WAITING') matchesStatus = p.status === 'WAITING';
      else if (selectedStatus === 'CALLED') matchesStatus = p.status === 'CALLED' || p.status === 'IN_CONSULTATION';
      else if (selectedStatus === 'IN_CONSULTATION') matchesStatus = p.status === 'IN_CONSULTATION';
      else if (selectedStatus === 'COMPLETED') matchesStatus = p.status === 'COMPLETED';
      else if (selectedStatus === 'MISSED') matchesStatus = p.status === 'NO_SHOW' || p.status === 'SKIPPED';
      else if (selectedStatus === 'WALK_IN') matchesStatus = p.is_walk_in === true;

      return matchesSearch && matchesDoctor && matchesStatus;
    });
  }, [all_patients, q, selectedDoctor, selectedStatus, doctor.id]);

  const apptLabel = (p: Patient) =>
    p.is_walk_in ? `Walk-in (${fmtTime(p.checked_in_at || p.created_at)})` : p.appointment_time || '10:00 AM';

  const nextPatientId = next_patients[0]?.id;

  return (
    <div className="h-screen h-[100dvh] max-h-[100dvh] w-full overflow-hidden flex flex-col bg-[#f8fafc] text-[#0f172a] font-sans antialiased">
      {/* Action Toast Feedback */}
      {actionFeedback && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Sparkles className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* TOP HEADER */}
      <header className="shrink-0 bg-white border-b border-slate-200/90 px-4 sm:px-6 py-2.5 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#0f766e] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Cross className="w-4 h-4" strokeWidth={2.8} />
          </div>
          <div>
            <div className="text-sm font-extrabold tracking-tight text-slate-900 leading-tight">
              {overview.hospital_name || 'CITY CARE HOSPITAL'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
            Reception
          </span>

          <Link
            to="/display"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-md hover:bg-slate-100 transition"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Waiting Room TV</span>
          </Link>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh queue"
            title="Refresh queue"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 p-1.5 rounded-md hover:bg-slate-100 transition disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings and Demo options"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 p-1.5 rounded-md hover:bg-slate-100 transition"
          >
            <Settings className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
              <User className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-semibold text-slate-700 hidden md:inline">Reception Staff</span>
          </div>
        </div>
      </header>

      {/* ERROR BANNER */}
      {error && (
        <div className="shrink-0 bg-rose-50 border-b border-rose-200 px-6 py-1.5 text-xs font-semibold text-rose-800">
          {error}
        </div>
      )}

      {/* DASHBOARD CONTENT CONTAINER */}
      <main className="flex-1 min-h-0 flex flex-col px-4 sm:px-6 py-2.5 sm:py-3.5 gap-2.5 sm:gap-3 overflow-hidden max-w-[1440px] w-full mx-auto">
        {/* 1. RECEPTION HEADER & IMPORT CSV */}
        <section className="shrink-0 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-tight">
              Reception
            </h1>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Manage today's patient queue
            </p>
          </div>

          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="inline-flex items-center gap-2 bg-[#0f766e] hover:bg-[#0d655e] active:bg-[#0a534d] text-white text-xs sm:text-sm font-bold px-4 py-2 sm:py-2.5 rounded-lg shadow-sm transition shrink-0"
          >
            <FileUp className="w-4 h-4" />
            <span>Import CSV</span>
          </button>
        </section>

        {/* 2. TODAY STATISTICS (4 Interactive Filter Cards) */}
        <section className="shrink-0">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            TODAY
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
            {/* BOOKED */}
            <button
              type="button"
              onClick={() => setSelectedStatus(selectedStatus === 'BOOKED' ? 'ALL' : 'BOOKED')}
              className={`text-left border rounded-xl p-2.5 sm:p-3 shadow-sm flex flex-col justify-between transition cursor-pointer ${
                selectedStatus === 'BOOKED'
                  ? 'bg-teal-50/60 border-teal-600 ring-2 ring-teal-600/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="text-[11px] font-bold tracking-wide uppercase text-slate-500">
                BOOKED
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">
                {bookedCount}
              </div>
            </button>

            {/* CHECKED IN */}
            <button
              type="button"
              onClick={() => setSelectedStatus(selectedStatus === 'CHECKED_IN' ? 'ALL' : 'CHECKED_IN')}
              className={`text-left border rounded-xl p-2.5 sm:p-3 shadow-sm flex flex-col justify-between transition cursor-pointer ${
                selectedStatus === 'CHECKED_IN'
                  ? 'bg-teal-50/60 border-teal-600 ring-2 ring-teal-600/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="text-[11px] font-bold tracking-wide uppercase text-slate-500">
                CHECKED IN
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">
                {checkedInCount}
              </div>
            </button>

            {/* WAITING */}
            <button
              type="button"
              onClick={() => setSelectedStatus(selectedStatus === 'WAITING' ? 'ALL' : 'WAITING')}
              className={`text-left border rounded-xl p-2.5 sm:p-3 shadow-sm flex flex-col justify-between transition cursor-pointer ${
                selectedStatus === 'WAITING'
                  ? 'bg-teal-50/60 border-teal-600 ring-2 ring-teal-600/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="text-[11px] font-bold tracking-wide uppercase text-slate-500">
                WAITING
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#0f766e] mt-0.5">
                {waitingCount}
              </div>
            </button>

            {/* COMPLETED */}
            <button
              type="button"
              onClick={() => setSelectedStatus(selectedStatus === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
              className={`text-left border rounded-xl p-2.5 sm:p-3 shadow-sm flex flex-col justify-between transition cursor-pointer ${
                selectedStatus === 'COMPLETED'
                  ? 'bg-teal-50/60 border-teal-600 ring-2 ring-teal-600/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="text-[11px] font-bold tracking-wide uppercase text-slate-500">
                COMPLETED
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">
                {completedCount}
              </div>
            </button>
          </div>
        </section>

        {/* 3. QUEUE HEADER & FILTERS */}
        <section className="shrink-0 space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
              QUEUE
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                title="Delete all appointments from today's queue"
                className="inline-flex items-center gap-1.5 bg-white border border-rose-200 hover:bg-rose-50 hover:border-rose-300 text-rose-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-xs transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden sm:inline">Delete All</span>
              </button>
              <button
                onClick={() => setIsWalkInModalOpen(true)}
                className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-slate-600 stroke-[2.5]" />
                <span>+ Add Patient</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-[170px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patients..."
                className="w-full bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 pl-8 pr-3 py-1.5 rounded-lg outline-none focus:border-teal-600 shadow-sm"
              />
            </div>

            {/* Doctor Filter */}
            <div className="relative">
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                aria-label="Filter by doctor"
                className="bg-white border border-slate-200 text-xs font-semibold text-slate-700 rounded-lg pl-3 pr-7 py-1.5 outline-none focus:border-teal-600 shadow-sm cursor-pointer appearance-none"
              >
                <option value="ALL">Doctor: All</option>
                <option value="dr-kumar">{doctor.name} ({doctor.room})</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as FilterStatus)}
                aria-label="Filter by status"
                className="bg-white border border-slate-200 text-xs font-semibold text-slate-700 rounded-lg pl-3 pr-7 py-1.5 outline-none focus:border-teal-600 shadow-sm cursor-pointer appearance-none"
              >
                <option value="ALL">Status: All</option>
                <option value="WAITING">Status: Waiting</option>
                <option value="CALLED">Status: Called</option>
                <option value="BOOKED">Status: Booked</option>
                <option value="CHECKED_IN">Status: Checked In</option>
                <option value="COMPLETED">Status: Completed</option>
                <option value="MISSED">Status: No-show / Skipped</option>
                <option value="WALK_IN">Status: Walk-ins</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Date Filter */}
            <div className="relative">
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                aria-label="Filter by date"
                className="bg-white border border-slate-200 text-xs font-semibold text-slate-700 rounded-lg pl-3 pr-7 py-1.5 outline-none focus:border-teal-600 shadow-sm cursor-pointer appearance-none"
              >
                <option value="TODAY">Date: Today</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </section>

        {/* 4. PATIENT TABLE (Fixed Header + Flexible Scrollable Patient Rows) */}
        <section className="flex-1 min-h-0 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
          {/* FIXED TABLE HEADER */}
          <div className="shrink-0 bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-2 grid grid-cols-[70px_minmax(0,2fr)_minmax(0,1.4fr)_100px_130px_140px] gap-3 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 select-none">
            <div>TOKEN</div>
            <div>PATIENT</div>
            <div>DOCTOR</div>
            <div>TIME</div>
            <div>STATUS</div>
            <div className="text-right">ACTION</div>
          </div>

          {/* SCROLLABLE PATIENT LIST */}
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100">
            {filteredPatients.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 text-xs font-medium">
                {all_patients.length === 0
                  ? "No appointments for today."
                  : "No patients match the selected filter or search query."}
              </div>
            ) : (
              filteredPatients.map((p) => {
                const isNext = nextPatientId === p.id && p.status === 'WAITING';
                const isServing = current_patient?.id === p.id;

                return (
                  <div
                    key={p.id}
                    className={`px-4 sm:px-6 py-2.5 sm:py-3 grid grid-cols-[70px_minmax(0,2fr)_minmax(0,1.4fr)_100px_130px_140px] gap-3 items-center hover:bg-slate-50/80 transition text-xs ${
                      isServing ? 'bg-teal-50/40' : ''
                    }`}
                  >
                    {/* Token */}
                    <div className="font-mono font-black text-sm text-slate-900">
                      {p.token}
                    </div>

                    {/* Patient Name */}
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="font-bold text-slate-900 truncate">{p.patient_name}</span>
                      {p.is_walk_in && (
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0">
                          Walk-in
                        </span>
                      )}
                      {isNext && (
                        <span className="bg-[#0f766e] text-white text-[9.5px] font-extrabold px-1.5 py-0.5 rounded shrink-0">
                          NEXT
                        </span>
                      )}
                    </div>

                    {/* Doctor */}
                    <div className="text-slate-600 font-medium truncate">
                      {doctor.name}
                    </div>

                    {/* Time */}
                    <div className="text-slate-600 font-medium whitespace-nowrap">
                      {apptLabel(p)}
                    </div>

                    {/* Status */}
                    <div>
                      <StatusPill status={p.status} />
                    </div>

                    {/* Action: ONLY CALL (Waiting), COMPLETE (Called), — (Completed) */}
                    <div className="flex items-center justify-end">
                      {p.status === 'CALLED' || p.status === 'IN_CONSULTATION' ? (
                        <button
                          onClick={() => handleComplete(p.id, p.token)}
                          disabled={isUpdating}
                          className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold px-3 py-1 rounded-md shadow-xs transition disabled:opacity-50 whitespace-nowrap"
                        >
                          Complete
                        </button>
                      ) : p.status === 'COMPLETED' ? (
                        <span className="text-slate-400 font-medium text-sm pr-2 select-none">—</span>
                      ) : (
                        <button
                          onClick={() => handleCall(p.id, p.token)}
                          disabled={isUpdating}
                          className="bg-[#0f766e] hover:bg-[#0d655e] active:bg-[#0a534d] text-white text-xs font-bold px-3.5 py-1 rounded-md shadow-xs transition disabled:opacity-50 whitespace-nowrap"
                        >
                          Call
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      {/* SETTINGS & DEMO MODAL */}
      {settingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="bg-white w-full max-w-md p-5 rounded-2xl border border-slate-200 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Queue & Doctor Settings</h3>
              <button
                onClick={() => setSettingsOpen(false)}
                aria-label="Close settings"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Doctor Status */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Doctor Delay Status
              </label>
              <div className="mt-1.5 flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-900">{doctor.name} ({doctor.room})</div>
                  <div className="text-xs text-slate-500">
                    Current: <span className="font-semibold text-teal-800">{doctor.delay_status}</span>
                  </div>
                </div>
                <button
                  onClick={handleToggleDoctorDelay}
                  disabled={isUpdating}
                  className="bg-white border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-800 px-3 py-1.5 rounded-lg shadow-xs transition"
                >
                  Toggle Delay
                </button>
              </div>
            </div>

            {/* Avg Consultation Time */}
            <div>
              <label htmlFor="settings-avg-time" className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Average Consultation Time
              </label>
              <select
                id="settings-avg-time"
                value={doctor.avg_consultation_time || 15}
                onChange={(e) => handleConsultationTimeChange(Number(e.target.value))}
                disabled={isUpdating}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 outline-none"
              >
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes (Default)</option>
                <option value={20}>20 minutes</option>
                <option value={30}>30 minutes</option>
              </select>
            </div>

            {/* Demo Scenarios */}
            {onResetDemo && (
              <div className="pt-2 border-t border-slate-100">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Demo Scenarios
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setSettingsOpen(false);
                      onResetDemo('all_booked');
                    }}
                    className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold p-2.5 rounded-xl transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Morning State</span>
                  </button>
                  <button
                    onClick={() => {
                      setSettingsOpen(false);
                      onResetDemo('active_demo');
                    }}
                    className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold p-2.5 rounded-xl transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Active Queue</span>
                  </button>
                </div>
              </div>
            )}

            {/* Delete All Action in Settings */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-rose-700">Delete All Appointments</div>
                <div className="text-[11px] text-slate-500">Clear today's queue completely</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSettingsOpen(false);
                  setIsDeleteModalOpen(true);
                }}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold rounded-lg transition cursor-pointer"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ALL CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-md p-6 rounded-2xl border border-slate-200 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  Delete all appointments?
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  This will remove all appointments from today's queue. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAll}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-lg shadow-sm transition disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onSuccess={(importedCount) => {
          showToast(`Imported ${importedCount} appointments successfully.`);
          onRefresh();
        }}
      />

      {/* Add / Walk-In Patient Modal */}
      <WalkInModal
        isOpen={isWalkInModalOpen}
        onClose={() => setIsWalkInModalOpen(false)}
        onSuccess={(token, name) => {
          showToast(`Added Patient: ${token} — ${name}`);
          onRefresh();
        }}
      />
    </div>
  );
};
