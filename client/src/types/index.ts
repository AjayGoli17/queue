export type PatientStatus =
  | 'BOOKED'
  | 'CHECKED_IN'
  | 'WAITING'
  | 'CALLED'
  | 'IN_CONSULTATION'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'NO_SHOW';

export interface Doctor {
  id: string;
  name: string;
  room: string;
  delay_status: string;
  created_at?: string;
}

export interface Patient {
  id: number;
  token: string;
  patient_name: string;
  phone: string;
  doctor_id: string;
  appointment_time: string;
  status: PatientStatus;
  created_at?: string;
  updated_at?: string;
}

export interface QueueOverview {
  hospital_name: string;
  doctor: Doctor;
  current_patient: Patient | null;
  next_patients: Patient[];
  all_patients: Patient[];
  stats: {
    total: number;
    booked: number;
    checked_in: number;
    waiting: number;
    in_consultation: number;
    completed: number;
    skipped: number;
    no_show: number;
  };
}

export interface PatientTrackingInfo {
  hospital_name: string;
  token: string;
  patient_name: string;
  status: PatientStatus;
  appointment_time: string;
  doctor_name: string;
  room: string;
  current_serving_token: string | null;
  current_serving_name: string | null;
  patients_ahead: number;
  message: string;
}
