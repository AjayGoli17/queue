import type { PatientTrackingInfo, QueueOverview, PatientStatus, Patient, Doctor } from '../types';

const API_BASE = '/api';

/**
 * Robust fetch wrapper with development error logging as specified:
 * logs endpoint, HTTP method, status, response body, and backend error message.
 */
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const method = options.method || 'GET';
  const url = `${API_BASE}${endpoint}`;

  try {
    const res = await fetch(url, options);

    if (!res.ok) {
      let errorBody: any = null;
      let errorText = '';
      try {
        errorBody = await res.json();
        errorText = errorBody.error || errorBody.message || JSON.stringify(errorBody);
      } catch {
        errorText = await res.text().catch(() => '');
      }

      console.error(`[API ERROR] ${method} ${url}`, {
        endpoint,
        method,
        status: res.status,
        statusText: res.statusText,
        responseBody: errorBody || errorText,
        backendErrorMessage: errorText || res.statusText,
      });

      const message = errorText || `Request failed with status ${res.status} (${res.statusText})`;
      const error: any = new Error(message);
      error.status = res.status;
      error.responseBody = errorBody;
      throw error;
    }

    return await res.json();
  } catch (err: any) {
    if (!err.status) {
      console.error(`[API NETWORK ERROR] ${method} ${url}:`, err);
    }
    throw err;
  }
}

export async function fetchQueueOverview(doctorId: string = 'dr-kumar'): Promise<QueueOverview> {
  return apiRequest<QueueOverview>(`/queue/overview?doctor_id=${encodeURIComponent(doctorId)}`);
}

export async function fetchPatientTracking(token: string): Promise<PatientTrackingInfo> {
  return apiRequest<PatientTrackingInfo>(`/queue/patient/${encodeURIComponent(token.trim().toUpperCase())}`);
}

export async function checkInPatient(patientId: number): Promise<{ success: boolean; patient: Patient }> {
  return apiRequest<{ success: boolean; patient: Patient }>(`/queue/check-in/${patientId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function callNextPatient(doctorId: string = 'dr-kumar'): Promise<{ success: boolean; patient: Patient }> {
  return apiRequest<{ success: boolean; patient: Patient }>('/queue/call-next', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doctor_id: doctorId }),
  });
}

export async function startConsultation(patientId: number): Promise<{ success: boolean; patient: Patient }> {
  return apiRequest<{ success: boolean; patient: Patient }>(`/queue/start-consultation/${patientId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function completeConsultation(patientId: number): Promise<{ success: boolean; patient: Patient }> {
  return apiRequest<{ success: boolean; patient: Patient }>(`/queue/complete-consultation/${patientId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function skipPatient(patientId: number): Promise<{ success: boolean; patient: Patient }> {
  return apiRequest<{ success: boolean; patient: Patient }>(`/queue/skip/${patientId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function noShowPatient(patientId: number): Promise<{ success: boolean; patient: Patient }> {
  return apiRequest<{ success: boolean; patient: Patient }>(`/queue/no-show/${patientId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function addWalkInPatient(
  patientName: string,
  phone: string,
  doctorId: string = 'dr-kumar'
): Promise<{ success: boolean; patient: Patient }> {
  return apiRequest<{ success: boolean; patient: Patient }>('/queue/walk-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient_name: patientName, phone, doctor_id: doctorId }),
  });
}

export async function importAppointmentsCsv(
  appointments: Array<{ patient_name: string; phone?: string; appointment_time: string; doctor_name?: string }>,
  doctorId: string = 'dr-kumar'
): Promise<{ success: boolean; count: number; message: string; imported: Patient[]; errors?: string[] }> {
  return apiRequest<{ success: boolean; count: number; message: string; imported: Patient[]; errors?: string[] }>(
    '/queue/import-appointments',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointments, doctor_id: doctorId }),
    }
  );
}

export async function updatePatientStatus(patientId: number, status: PatientStatus): Promise<Patient> {
  return apiRequest<Patient>(`/patients/${patientId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

export async function updateDoctorStatus(doctorId: string, delayStatus: string): Promise<Doctor> {
  return apiRequest<Doctor>(`/doctors/${doctorId}/delay`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delay_status: delayStatus }),
  });
}

export async function updateDoctorAvgConsultationTime(doctorId: string, avgMinutes: number): Promise<Doctor> {
  return apiRequest<Doctor>(`/doctors/${doctorId}/consultation-time`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ avg_consultation_time: avgMinutes }),
  });
}

export async function resetDemoData(mode: 'active_demo' | 'all_booked' = 'active_demo'): Promise<{ message: string; overview: QueueOverview }> {
  return apiRequest<{ message: string; overview: QueueOverview }>('/demo/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
  });
}

export async function deleteAllAppointments(doctorId?: string): Promise<{ success: boolean; count: number; message: string }> {
  const query = doctorId && doctorId !== 'ALL' ? `?doctor_id=${encodeURIComponent(doctorId)}` : '';
  return apiRequest<{ success: boolean; count: number; message: string }>(`/queue/all${query}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
}
