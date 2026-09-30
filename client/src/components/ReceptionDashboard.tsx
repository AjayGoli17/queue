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
} from 'lucide-react';
import { updatePatientStatus, updateDoctorStatus } from '../services/api';

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
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const handleAction = async (action: 'CALL_NEXT' | 'DELAY' | 'SKIP' | 'NO_SHOW') => {
    setIsUpdating(true);
    try {
      if (action === 'CALL_NEXT') {
        if (next_patients.length > 0) {
          const nextPatient = next_patients[0];
          // If there is currently a patient in consultation, complete them
          if (current_patient) {
            await updatePatientStatus(current_patient.id, 'COMPLETED');
          }
          await updatePatientStatus(nextPatient.id, 'IN_CONSULTATION');
          showToast(`Called Next: ${nextPatient.token} — ${nextPatient.patient_name}`);
        } else {
          showToast('No more waiting patients in queue');
        }
      } else if (action === 'DELAY') {
        const nextStatus = doctor.delay_status === 'Delayed 15m' ? 'Available' : 'Delayed 15m';
        await updateDoctorStatus(doctor.id, nextStatus);
        showToast(`Doctor status updated: ${nextStatus}`);
      } else if (action === 'SKIP') {
        if (current_patient) {
          await updatePatientStatus(current_patient.id, 'SKIPPED');
          showToast(`Marked ${current_patient.token} as SKIPPED`);
        } else if (next_patients.length > 0) {
          await updatePatientStatus(next_patients[0].id, 'SKIPPED');
          showToast(`Skipped ${next_patients[0].token}`);
        }
      } else if (action === 'NO_SHOW') {
        if (current_patient) {
          await updatePatientStatus(current_patient.id, 'NO_SHOW');
          showToast(`Marked ${current_patient.token} as NO SHOW`);
        } else if (next_patients.length > 0) {
          await updatePatientStatus(next_patients[0].id, 'NO_SHOW');
          showToast(`Marked ${next_patients[0].token} as NO SHOW`);
        }
      }
      onRefresh();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePatientStatusChange = async (patientId: number, newStatus: PatientStatus) => {
    try {
      await updatePatientStatus(patientId, newStatus);
      showToast(`Updated status to ${newStatus}`);
      onRefresh();
    } catch (err: any) {
      showToast(`Error updating status: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Action Toast / Feedback Bar */}
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

          {/* Doctor Status & Quick HMS CSV Import Button */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Doctor Status
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      doctor.delay_status.includes('Delay')
                        ? 'bg-amber-500 animate-pulse'
                        : 'bg-emerald-500'
                    }`}
                  />
                  <span className="text-sm font-bold text-slate-800">{doctor.delay_status}</span>
                </div>
              </div>
            </div>

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
            <span className="text-xs font-semibold text-emerald-700">In Consultation</span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">{stats.in_consultation}</span>
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
        
        {/* LEFT / CENTER: CURRENTLY SERVING & ACTION BUTTONS */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* CURRENTLY SERVING CARD */}
          <div className="bg-white rounded-2xl border-2 border-emerald-500/30 p-6 shadow-md shadow-emerald-500/5 relative overflow-hidden">
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
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400">
                <p className="text-base font-semibold text-slate-600">No Patient In Consultation</p>
                <p className="text-xs text-slate-400 mt-1">Click "CALL NEXT" below to call the next patient in queue.</p>
              </div>
            )}

            {/* ACTION BUTTONS (Section 6 & 12) */}
            <div className="mt-6 pt-5 border-t border-slate-200/80">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                Queue Actions
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => handleAction('CALL_NEXT')}
                  disabled={isUpdating}
                  className="col-span-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-hospital-600 hover:bg-hospital-700 active:bg-hospital-800 text-white font-bold text-sm shadow-md shadow-hospital-600/20 transition disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>CALL NEXT</span>
                </button>

                <button
                  onClick={() => handleAction('DELAY')}
                  disabled={isUpdating}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs transition disabled:opacity-50"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>DELAY</span>
                </button>

                <button
                  onClick={() => handleAction('SKIP')}
                  disabled={isUpdating}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-bold text-xs transition disabled:opacity-50"
                >
                  <SkipForward className="w-3.5 h-3.5 text-slate-600" />
                  <span>SKIP</span>
                </button>

                <button
                  onClick={() => handleAction('NO_SHOW')}
                  disabled={isUpdating}
                  className="col-span-2 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs transition disabled:opacity-50"
                >
                  <UserX className="w-3.5 h-3.5 text-rose-600" />
                  <span>NO SHOW</span>
                </button>
              </div>
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

        {/* RIGHT: NEXT PATIENTS QUEUE & ALL TODAY'S PATIENTS TABLE */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* NEXT PATIENTS SECTION */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-hospital-600" />
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                  NEXT PATIENTS
                </h3>
              </div>
              <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                {next_patients.length} in Waiting Queue
              </span>
            </div>

            {next_patients.length > 0 ? (
              <div className="space-y-2.5">
                {next_patients.slice(0, 5).map((patient, index) => (
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
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Appt: {patient.appointment_time}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <StatusBadge status={patient.status} size="sm" />
                      <button
                        onClick={() => handlePatientStatusChange(patient.id, 'IN_CONSULTATION')}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-hospital-50 text-hospital-700 hover:bg-hospital-100 border border-hospital-200 transition"
                      >
                        Call
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-sm font-medium">No patients currently in the waiting line.</p>
              </div>
            )}
          </div>

          {/* ALL TODAY'S APPOINTMENTS TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  Today's HMS Appointments (A01 - A10)
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Synchronized with Doctor Kumar's Schedule
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
                    <th className="px-4 py-3 text-right">Quick Action</th>
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
                            {p.status === 'BOOKED' && (
                              <button
                                onClick={() => handlePatientStatusChange(p.id, 'WAITING')}
                                className="text-[11px] font-bold px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                              >
                                Check In
                              </button>
                            )}
                            {p.status === 'WAITING' && (
                              <button
                                onClick={() => handlePatientStatusChange(p.id, 'IN_CONSULTATION')}
                                className="text-[11px] font-bold px-2 py-1 rounded bg-hospital-100 hover:bg-hospital-200 text-hospital-800 transition"
                              >
                                Call
                              </button>
                            )}
                            {p.status === 'IN_CONSULTATION' && (
                              <button
                                onClick={() => handlePatientStatusChange(p.id, 'COMPLETED')}
                                className="text-[11px] font-bold px-2 py-1 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition"
                              >
                                Complete
                              </button>
                            )}
                            {(p.status === 'COMPLETED' || p.status === 'SKIPPED' || p.status === 'NO_SHOW') && (
                              <button
                                onClick={() => handlePatientStatusChange(p.id, 'WAITING')}
                                className="text-[11px] font-medium text-slate-400 hover:text-slate-600 transition"
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
