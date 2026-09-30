import React, { useState } from 'react';
import type { QueueOverview, PatientStatus } from '../types';
import { StatusBadge } from './StatusBadge';
import { CsvImportModal } from './CsvImportModal';
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
} from 'lucide-react';
import {
  checkInPatient,
  callNextPatient,
  startConsultation,
  completeConsultation,
  skipPatient,
  noShowPatient,
  updateDoctorStatus,
  updatePatientStatus,
} from '../services/api';

interface ReceptionDashboardProps {
  overview: QueueOverview;
  onRefresh: () => void;
}

export const ReceptionDashboard: React.FC<ReceptionDashboardProps> = ({ overview, onRefresh }) => {
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const { hospital_name, doctor, current_patient, next_patients, all_patients, stats } = overview;

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

  const isDoctorDelayed = doctor.delay_status.toLowerCase().includes('delay');
  const hasWaitingPatients = next_patients.length > 0;

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

          {/* Doctor Status Toggle & HMS CSV Import Button */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleToggleDoctorDelay}
              disabled={isUpdating}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition text-left shadow-sm ${
                isDoctorDelayed
                  ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                  : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
              }`}
              title="Click to toggle doctor delay status"
            >
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Doctor Status (Click to Toggle)
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isDoctorDelayed
                        ? 'bg-amber-500 animate-ping'
                        : 'bg-emerald-500 animate-pulse'
                    }`}
                  />
                  <span className="text-sm font-bold">
                    {isDoctorDelayed ? 'DOCTOR DELAYED (15m)' : 'AVAILABLE'}
                  </span>
                </div>
              </div>
            </button>

            <button
              onClick={() => setIsCsvModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm shadow-sm transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-hospital-300" />
              <span>Import HMS Appointments</span>
            </button>
          </div>
        </div>
      </div>

      {/* TODAY'S STATISTICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Booked</span>
            <CalendarCheck className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{stats.total}</span>
            <span className="text-xs text-slate-500">Appointments</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700">Waiting in Queue</span>
            <Hourglass className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700">{stats.waiting}</span>
            <span className="text-xs text-amber-600">Patients</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">In Consultation / Called</span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">
              {stats.in_consultation + (current_patient?.status === 'CALLED' ? 1 : 0)}
            </span>
            <span className="text-xs text-emerald-600">Active</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-teal-700">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-teal-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-teal-700">{stats.completed}</span>
            <span className="text-xs text-teal-600">Finished</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700">No Show / Skipped</span>
            <UserX className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-700">
              {stats.no_show + stats.skipped}
            </span>
            <span className="text-xs text-rose-600">Missed</span>
          </div>
        </div>
      </div>

      {/* CORE QUEUE MANAGEMENT ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT: CURRENTLY SERVING & ACTIVE ACTIONS (5 cols) */}
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

                {/* CONTEXTUAL ACTION BUTTONS FOR ACTIVE PATIENT */}
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

            {/* CALL NEXT BUTTON SECTION (Section 3) */}
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

          {/* SECTION 11: CSV / EXCEL IMPORT FOUNDATION CARD */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-hospital-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  IMPORT TODAY'S APPOINTMENTS
                </h4>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Import today's appointments from the hospital's existing HMS.
            </p>
            <button
              onClick={() => setIsCsvModalOpen(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-hospital-600" />
              <span>Upload CSV</span>
            </button>
          </div>
        </div>

        {/* RIGHT: NEXT PATIENTS QUEUE & ALL TODAY'S APPOINTMENTS TABLE (7 cols) */}
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
                <p className="text-xs text-slate-400 mt-1">Check in BOOKED patients from the table below to add them to the waiting queue.</p>
              </div>
            )}
          </div>

          {/* ALL TODAY'S APPOINTMENTS TABLE (A01 - A10) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  Today's HMS Appointments (A01 - A10)
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Source of Truth from Hospital HMS • Click Check In when patient arrives
                </p>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700">
                Total: {all_patients.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-100/70 text-slate-600 font-bold uppercase text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Token</th>
                    <th className="px-4 py-3">Patient Name</th>
                    <th className="px-4 py-3">Appt Time</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Queue Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {all_patients.map((p) => {
                    const isCurrent = current_patient?.id === p.id;
                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-slate-50/80 transition ${
                          isCurrent ? 'bg-emerald-50/40 font-medium' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">
                          {p.token}
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
                            {/* 1. BOOKED PATIENT -> CHECK IN */}
                            {p.status === 'BOOKED' && (
                              <button
                                onClick={() => handleCheckIn(p.id, p.token, p.patient_name)}
                                disabled={isUpdating}
                                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-hospital-600 hover:bg-hospital-700 text-white shadow-sm transition"
                              >
                                CHECK IN
                              </button>
                            )}

                            {/* 2. WAITING PATIENT */}
                            {p.status === 'WAITING' && (
                              <button
                                onClick={handleCallNext}
                                disabled={isUpdating}
                                className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-hospital-50 hover:bg-hospital-100 text-hospital-800 border border-hospital-200 transition"
                              >
                                Call Next
                              </button>
                            )}

                            {/* 3. CALLED PATIENT */}
                            {p.status === 'CALLED' && (
                              <button
                                onClick={() => handleStartConsultation(p.id, p.token)}
                                disabled={isUpdating}
                                className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
                              >
                                Start Consultation
                              </button>
                            )}

                            {/* 4. IN CONSULTATION */}
                            {p.status === 'IN_CONSULTATION' && (
                              <button
                                onClick={() => handleCompleteConsultation(p.id, p.token)}
                                disabled={isUpdating}
                                className="text-xs font-bold px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition"
                              >
                                Complete
                              </button>
                            )}

                            {/* 5. COMPLETED / SKIPPED / NO SHOW -> RE-QUEUE OPTION */}
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
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
      />
    </div>
  );
};
