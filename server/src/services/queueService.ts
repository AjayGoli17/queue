import { getDatabase } from '../config/database.js';
import { Doctor, Patient, PatientTrackingInfo, QueueOverview, PatientStatus } from '../types/index.js';

export class QueueService {
  static async getQueueOverview(doctorId: string = 'dr-kumar'): Promise<QueueOverview | null> {
    const db = await getDatabase();

    // 1. Get Doctor
    const docRes = await db.query<Doctor>('SELECT * FROM doctors WHERE id = $1', [doctorId]);
    if (docRes.rows.length === 0) {
      return null;
    }
    const doctor = docRes.rows[0];

    // 2. Get Queue
    const queueRes = await db.query('SELECT * FROM queues WHERE doctor_id = $1 LIMIT 1', [doctorId]);
    const queue = queueRes.rows[0];

    // 3. Get All Patients for doctor
    const patientsRes = await db.query<Patient>(
      'SELECT * FROM patients WHERE doctor_id = $1 ORDER BY id ASC',
      [doctorId]
    );
    const allPatients = patientsRes.rows;

    // 4. Current Serving Patient
    let currentPatient: Patient | null = null;
    if (queue && queue.current_patient_id) {
      currentPatient = allPatients.find(p => p.id === queue.current_patient_id) || null;
    }
    if (!currentPatient) {
      currentPatient = allPatients.find(p => p.status === 'IN_CONSULTATION' || p.status === 'CALLED') || null;
    }

    // 5. Next Patients in Queue (Waiting / Checked In)
    const nextPatients = allPatients.filter(
      p => (p.status === 'WAITING' || p.status === 'CHECKED_IN') && (!currentPatient || p.id !== currentPatient.id)
    );

    // 6. Compute Stats
    const stats = {
      total: allPatients.length,
      booked: allPatients.filter(p => p.status === 'BOOKED').length,
      checked_in: allPatients.filter(p => p.status === 'CHECKED_IN').length,
      waiting: allPatients.filter(p => p.status === 'WAITING').length,
      in_consultation: allPatients.filter(p => p.status === 'IN_CONSULTATION').length,
      completed: allPatients.filter(p => p.status === 'COMPLETED').length,
      skipped: allPatients.filter(p => p.status === 'SKIPPED').length,
      no_show: allPatients.filter(p => p.status === 'NO_SHOW').length,
    };

    return {
      hospital_name: 'City Care Hospital',
      doctor,
      current_patient: currentPatient,
      next_patients: nextPatients,
      all_patients: allPatients,
      stats,
    };
  }

  static async getPatientTracking(token: string): Promise<PatientTrackingInfo | null> {
    const db = await getDatabase();
    const formattedToken = token.trim().toUpperCase();

    // Find Patient
    const patientRes = await db.query<Patient>(
      'SELECT * FROM patients WHERE UPPER(token) = $1 LIMIT 1',
      [formattedToken]
    );

    if (patientRes.rows.length === 0) {
      return null;
    }

    const patient = patientRes.rows[0];

    // Find Doctor
    const docRes = await db.query<Doctor>('SELECT * FROM doctors WHERE id = $1', [patient.doctor_id]);
    const doctor = docRes.rows[0] || {
      id: 'dr-kumar',
      name: 'Dr. Kumar',
      room: 'Room 2',
      delay_status: 'Available',
    };

    // Find Queue & Current Serving Patient
    const queueRes = await db.query('SELECT * FROM queues WHERE doctor_id = $1 LIMIT 1', [patient.doctor_id]);
    const queue = queueRes.rows[0];

    let currentServingPatient: Patient | null = null;
    if (queue && queue.current_patient_id) {
      const curRes = await db.query<Patient>('SELECT * FROM patients WHERE id = $1', [queue.current_patient_id]);
      currentServingPatient = curRes.rows[0] || null;
    }
    if (!currentServingPatient) {
      const curRes = await db.query<Patient>(
        "SELECT * FROM patients WHERE doctor_id = $1 AND status IN ('IN_CONSULTATION', 'CALLED') LIMIT 1",
        [patient.doctor_id]
      );
      currentServingPatient = curRes.rows[0] || null;
    }

    // Calculate Patients Ahead:
    // Count patients with status WAITING / CALLED whose id is less than this patient's id
    let patientsAhead = 0;
    if (patient.status === 'WAITING' || patient.status === 'CHECKED_IN') {
      const aheadRes = await db.query(
        "SELECT COUNT(*) as count FROM patients WHERE doctor_id = $1 AND status IN ('WAITING', 'CALLED') AND id < $2",
        [patient.doctor_id, patient.id]
      );
      patientsAhead = parseInt(aheadRes.rows[0]?.count || '0', 10);
    }

    let message = 'Please remain in the waiting area. You will be called when it is your turn.';
    if (patient.status === 'IN_CONSULTATION') {
      message = 'Please proceed to Room ' + doctor.room + '. Doctor is ready for your consultation.';
    } else if (patient.status === 'CALLED') {
      message = 'Your token has been called! Please proceed to ' + doctor.room + '.';
    } else if (patient.status === 'COMPLETED') {
      message = 'Your consultation has been completed. Thank you for visiting City Care Hospital.';
    } else if (patient.status === 'BOOKED') {
      message = 'Your appointment is booked. Please check in with reception upon arrival.';
    }

    return {
      hospital_name: 'City Care Hospital',
      token: patient.token,
      patient_name: patient.patient_name,
      status: patient.status,
      appointment_time: patient.appointment_time,
      doctor_name: doctor.name,
      room: doctor.room,
      current_serving_token: currentServingPatient?.token || null,
      current_serving_name: currentServingPatient?.patient_name || null,
      patients_ahead: patientsAhead,
      message,
    };
  }

  static async updatePatientStatus(patientId: number, status: PatientStatus): Promise<Patient | null> {
    const db = await getDatabase();
    const res = await db.query<Patient>(
      'UPDATE patients SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, patientId]
    );

    const updatedPatient = res.rows[0] || null;

    if (updatedPatient && (status === 'IN_CONSULTATION' || status === 'CALLED')) {
      await db.query(
        'UPDATE queues SET current_patient_id = $1, updated_at = CURRENT_TIMESTAMP WHERE doctor_id = $2',
        [updatedPatient.id, updatedPatient.doctor_id]
      );
    }

    return updatedPatient;
  }

  static async updateDoctorStatus(doctorId: string, delayStatus: string): Promise<Doctor | null> {
    const db = await getDatabase();
    const res = await db.query<Doctor>(
      'UPDATE doctors SET delay_status = $1 WHERE id = $2 RETURNING *',
      [delayStatus, doctorId]
    );
    return res.rows[0] || null;
  }
}
