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
  avg_consultation_time?: number;
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
  is_walk_in?: boolean;
  checked_in_at?: string | null;
  called_at?: string | null;
  completed_at?: string | null;
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
    walk_ins: number;
    avg_waiting_time_minutes: number;
  };
  summary: {
    total_appointments: number;
    checked_in_count: number;
    completed_count: number;
    no_show_count: number;
    skipped_count: number;
    walk_ins_count: number;
    avg_waiting_time_minutes: number;
  };
}

export interface PatientTrackingInfo {
  hospital_name: string;
  token: string;
  patient_name: string;
  status: PatientStatus;
  appointment_time: string;
  is_walk_in?: boolean;
  doctor_name: string;
  room: string;
  delay_status: string;
  is_doctor_delayed: boolean;
  current_serving_token: string | null;
  current_serving_name: string | null;
  current_serving_status: PatientStatus | null;
  patients_ahead: number;
  avg_consultation_time: number;
  estimated_wait_minutes: number;
  estimated_wait_text: string;
  message: string;
}
