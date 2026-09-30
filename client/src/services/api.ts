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
    throw new Error(errorData.error || `Failed to fetch tracking for token ${token}`);
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
