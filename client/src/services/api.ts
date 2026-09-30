import type { PatientTrackingInfo, QueueOverview, PatientStatus, Patient, Doctor } from '../types';

const API_BASE = '/api';

export async function fetchQueueOverview(doctorId: string = 'dr-kumar'): Promise<QueueOverview> {
  const res = await fetch(`${API_BASE}/queue/overview?doctor_id=${doctorId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch queue overview: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchPatientTracking(token: string): Promise<PatientTrackingInfo> {
  const res = await fetch(`${API_BASE}/queue/patient/${encodeURIComponent(token.trim().toUpperCase())}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Patient not found.`);
  }
  return res.json();
}

export async function checkInPatient(patientId: number): Promise<{ success: boolean; patient: Patient }> {
  const res = await fetch(`${API_BASE}/queue/check-in/${patientId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to check in patient`);
  }
  return res.json();
}

export async function callNextPatient(doctorId: string = 'dr-kumar'): Promise<{ success: boolean; patient: Patient }> {
  const res = await fetch(`${API_BASE}/queue/call-next`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doctor_id: doctorId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `No patients are currently waiting.`);
  }
  return res.json();
}

export async function startConsultation(patientId: number): Promise<{ success: boolean; patient: Patient }> {
  const res = await fetch(`${API_BASE}/queue/start-consultation/${patientId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to start consultation`);
  }
  return res.json();
}

export async function completeConsultation(patientId: number): Promise<{ success: boolean; patient: Patient }> {
  const res = await fetch(`${API_BASE}/queue/complete-consultation/${patientId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to complete consultation`);
  }
  return res.json();
}

export async function skipPatient(patientId: number): Promise<{ success: boolean; patient: Patient }> {
  const res = await fetch(`${API_BASE}/queue/skip/${patientId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to skip patient`);
  }
  return res.json();
}

export async function noShowPatient(patientId: number): Promise<{ success: boolean; patient: Patient }> {
  const res = await fetch(`${API_BASE}/queue/no-show/${patientId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to mark no-show`);
  }
  return res.json();
}

export async function addWalkInPatient(
  patientName: string,
  phone: string,
  doctorId: string = 'dr-kumar'
): Promise<{ success: boolean; patient: Patient }> {
  const res = await fetch(`${API_BASE}/queue/walk-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient_name: patientName, phone, doctor_id: doctorId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to register walk-in patient`);
  }
  return res.json();
}

export async function importAppointmentsCsv(
  appointments: Array<{ patient_name: string; phone?: string; appointment_time: string; doctor_name?: string }>,
  doctorId: string = 'dr-kumar'
): Promise<{ success: boolean; count: number; message: string; imported: Patient[] }> {
  const res = await fetch(`${API_BASE}/queue/import-appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appointments, doctor_id: doctorId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Unable to import this file. Please check the required columns.`);
  }
  return res.json();
}

export async function updatePatientStatus(patientId: number, status: PatientStatus): Promise<Patient> {
  const res = await fetch(`${API_BASE}/patients/${patientId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    throw new Error(`Failed to update patient status: ${res.statusText}`);
  }
  return res.json();
}

export async function updateDoctorStatus(doctorId: string, delayStatus: string): Promise<Doctor> {
  const res = await fetch(`${API_BASE}/doctors/${doctorId}/delay`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delay_status: delayStatus }),
  });
  if (!res.ok) {
    throw new Error(`Failed to update doctor status: ${res.statusText}`);
  }
  return res.json();
}

export async function updateDoctorAvgConsultationTime(doctorId: string, avgMinutes: number): Promise<Doctor> {
  const res = await fetch(`${API_BASE}/doctors/${doctorId}/consultation-time`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ avg_consultation_time: avgMinutes }),
  });
  if (!res.ok) {
    throw new Error(`Failed to update average consultation time: ${res.statusText}`);
  }
  return res.json();
}

export async function resetDemoData(mode: 'active_demo' | 'all_booked' = 'active_demo'): Promise<{ message: string; overview: QueueOverview }> {
  const res = await fetch(`${API_BASE}/demo/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
  });
  if (!res.ok) {
    throw new Error(`Failed to reset demo data: ${res.statusText}`);
  }
  return res.json();
}
