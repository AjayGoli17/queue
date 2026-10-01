import { getDatabase } from '../config/database.js';
import { Doctor, Patient, PatientTrackingInfo, QueueOverview, PatientStatus } from '../types/index.js';

export class QueueService {
  static async getQueueOverview(doctorId: string = 'dr-kumar'): Promise<QueueOverview | null> {
    const db = await getDatabase();

    // 1. Get Doctor
    const docRes = await db.query<Doctor>('SELECT * FROM doctors WHERE id = $1', [doctorId]);
    const doctor: Doctor = docRes.rows[0] || {
      id: doctorId,
      name: 'Dr. Kumar',
      room: 'Room 2',
      delay_status: 'Available',
      avg_consultation_time: 15,
    };

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

    // 5. Next Patients in Queue (Strict FIFO: WAITING status ordered by checked_in_at ASC, id ASC)
    const nextPatients = allPatients
      .filter(p => p.status === 'WAITING' && (!currentPatient || p.id !== currentPatient.id))
      .sort((a, b) => {
        if (a.checked_in_at && b.checked_in_at) {
          const timeA = new Date(a.checked_in_at).getTime();
          const timeB = new Date(b.checked_in_at).getTime();
          if (timeA !== timeB) return timeA - timeB;
        } else if (a.checked_in_at) {
          return -1;
        } else if (b.checked_in_at) {
          return 1;
        }
        return a.id - b.id;
      });

    // 6. Compute Dynamic Stats
    const bookedCount = allPatients.filter(p => p.status === 'BOOKED').length;
    const waitingCount = allPatients.filter(p => p.status === 'WAITING').length;
    const inConsultationCount = allPatients.filter(p => p.status === 'IN_CONSULTATION').length;
    const completedCount = allPatients.filter(p => p.status === 'COMPLETED').length;
    const skippedCount = allPatients.filter(p => p.status === 'SKIPPED').length;
    const noShowCount = allPatients.filter(p => p.status === 'NO_SHOW').length;
    const walkInsCount = allPatients.filter(p => p.is_walk_in).length;
    const checkedInCount = allPatients.filter(p => p.status !== 'BOOKED').length;

    // Calculate Average Waiting Time (in minutes)
    let totalWaitMinutes = 0;
    let countedPatients = 0;
    for (const p of allPatients) {
      if (p.checked_in_at && (p.called_at || p.completed_at || (p.status !== 'WAITING' && p.status !== 'BOOKED'))) {
        const start = new Date(p.checked_in_at).getTime();
        const end = new Date(p.called_at || p.completed_at || p.updated_at).getTime();
        const diffMinutes = Math.max(1, Math.round((end - start) / (1000 * 60)));
        totalWaitMinutes += diffMinutes;
        countedPatients++;
      }
    }
    const avgWaitTime = countedPatients > 0 ? Math.round(totalWaitMinutes / countedPatients) : (doctor.avg_consultation_time || 15);

    const stats = {
      total: allPatients.length,
      booked: bookedCount,
      checked_in: checkedInCount,
      waiting: waitingCount,
      in_consultation: inConsultationCount,
      completed: completedCount,
      skipped: skippedCount,
      no_show: noShowCount,
      walk_ins: walkInsCount,
      avg_waiting_time_minutes: avgWaitTime,
    };

    const summary = {
      total_appointments: allPatients.length,
      checked_in_count: checkedInCount,
      completed_count: completedCount,
      no_show_count: noShowCount,
      skipped_count: skippedCount,
      walk_ins_count: walkInsCount,
      avg_waiting_time_minutes: avgWaitTime,
    };

    return {
      hospital_name: 'City Care Hospital',
      doctor,
      current_patient: currentPatient,
      next_patients: nextPatients,
      all_patients: allPatients,
      stats,
      summary,
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
      avg_consultation_time: 15,
    };

    const avgConsultation = doctor.avg_consultation_time || 15;
    const isDoctorDelayed = doctor.delay_status.toLowerCase().includes('delay');

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
        "SELECT * FROM patients WHERE doctor_id = $1 AND status IN ('IN_CONSULTATION', 'CALLED') ORDER BY updated_at DESC LIMIT 1",
        [patient.doctor_id]
      );
      currentServingPatient = curRes.rows[0] || null;
    }

    // Calculate Patients Ahead:
    // Count all patients with status 'WAITING' who are ahead in the queue before this patient
    let patientsAhead = 0;
    if (patient.status === 'WAITING') {
      const waitingRes = await db.query<Patient>(
        "SELECT * FROM patients WHERE doctor_id = $1 AND status = 'WAITING' AND id != $2",
        [patient.doctor_id, patient.id]
      );
      
      const allWaiting = waitingRes.rows;
      const patientCheckIn = patient.checked_in_at ? new Date(patient.checked_in_at).getTime() : Infinity;

      patientsAhead = allWaiting.filter(other => {
        const otherCheckIn = other.checked_in_at ? new Date(other.checked_in_at).getTime() : Infinity;
        if (otherCheckIn < patientCheckIn) return true;
        if (otherCheckIn === patientCheckIn) return other.id < patient.id;
        return false;
      }).length;
    }

    // Calculate Estimated Waiting Time (Sections 2, 3, 4, 5, 6, 8)
    let estimatedWaitMinutes: number | null = null;
    let estimatedWaitText: string | null = null;

    if (patient.status === 'WAITING') {
      if (patientsAhead > 0) {
        estimatedWaitMinutes = patientsAhead * avgConsultation;
        estimatedWaitText = `~${estimatedWaitMinutes} minutes`;
      } else {
        estimatedWaitMinutes = 0;
        estimatedWaitText = "You're next";
      }
    }

    // Appointment time formatting: for walk-in patients, clearly say "Walk-in"
    const displayAppointmentTime = patient.is_walk_in ? 'Walk-in' : (patient.appointment_time || 'Walk-in');

    // Messages
    let message = 'Please remain in the waiting area. You will be called when it is your turn.';
    if (isDoctorDelayed) {
      message = `${doctor.name} is currently delayed (approximately 15 minutes). Please remain in the waiting area.`;
    } else if (patient.status === 'CALLED') {
      message = `YOUR TOKEN HAS BEEN CALLED! Please proceed to ${doctor.name} — ${doctor.room}.`;
    } else if (patient.status === 'IN_CONSULTATION') {
      message = `You're in consultation with ${doctor.name} in ${doctor.room}.`;
    } else if (patient.status === 'COMPLETED') {
      message = 'Consultation Completed. Thank you for visiting City Care Hospital.';
    } else if (patient.status === 'BOOKED') {
      message = 'Your appointment is booked. Please check in with reception upon arrival.';
    } else if (patient.status === 'SKIPPED') {
      message = 'Your token was skipped. Please speak with reception to re-enter the queue.';
    } else if (patient.status === 'NO_SHOW') {
      message = 'Your appointment was marked as no show. Please visit reception for assistance.';
    }

    return {
      hospital_name: 'City Care Hospital',
      token: patient.token,
      patient_name: patient.patient_name,
      status: patient.status,
      appointment_time: displayAppointmentTime,
      is_walk_in: !!patient.is_walk_in,
      doctor_name: doctor.name,
      room: doctor.room,
      delay_status: doctor.delay_status,
      is_doctor_delayed: isDoctorDelayed,
      avg_consultation_time: avgConsultation,
      estimated_wait_text: estimatedWaitText,
      estimated_wait_minutes: estimatedWaitMinutes,
      current_serving_token: currentServingPatient?.token || null,
      current_serving_name: currentServingPatient?.patient_name || null,
      current_serving_status: currentServingPatient?.status || null,
      patients_ahead: patientsAhead,
      message,
    };
  }

  // 1. CHECK IN
  static async checkInPatient(patientId: number): Promise<Patient | null> {
    const db = await getDatabase();
    const res = await db.query<Patient>(
      `UPDATE patients 
       SET status = 'WAITING', checked_in_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      [patientId]
    );
    return res.rows[0] || null;
  }

  // 2. CALL NEXT (FIFO from WAITING queue)
  static async callNext(doctorId: string = 'dr-kumar'): Promise<{ called_patient: Patient | null; message?: string }> {
    const db = await getDatabase();

    // Find next WAITING patient (FIFO: checked_in_at ASC, id ASC)
    const nextRes = await db.query<Patient>(
      `SELECT * FROM patients 
       WHERE doctor_id = $1 AND status = 'WAITING' 
       ORDER BY checked_in_at ASC NULLS LAST, id ASC 
       LIMIT 1`,
      [doctorId]
    );

    if (nextRes.rows.length === 0) {
      return { called_patient: null, message: 'No patients are currently waiting.' };
    }

    const nextPatient = nextRes.rows[0];

    // If there was a previous patient in consultation, complete them
    const queueRes = await db.query('SELECT current_patient_id FROM queues WHERE doctor_id = $1', [doctorId]);
    const currentId = queueRes.rows[0]?.current_patient_id;

    if (currentId && currentId !== nextPatient.id) {
      const curPatientRes = await db.query<Patient>('SELECT status FROM patients WHERE id = $1', [currentId]);
      const curStatus = curPatientRes.rows[0]?.status;
      if (curStatus === 'IN_CONSULTATION') {
        await db.query(
          "UPDATE patients SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
          [currentId]
        );
      }
    }

    // Set next patient to CALLED
    const updateRes = await db.query<Patient>(
      `UPDATE patients 
       SET status = 'CALLED', called_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      [nextPatient.id]
    );

    const calledPatient = updateRes.rows[0];

    // Update queue table
    await db.query(
      `UPDATE queues 
       SET current_patient_id = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE doctor_id = $2`,
      [calledPatient.id, doctorId]
    );

    return { called_patient: calledPatient };
  }

  // 3. START CONSULTATION
  static async startConsultation(patientId: number): Promise<Patient | null> {
    const db = await getDatabase();
    const res = await db.query<Patient>(
      `UPDATE patients 
       SET status = 'IN_CONSULTATION', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      [patientId]
    );
    const updated = res.rows[0] || null;

    if (updated) {
      await db.query(
        'UPDATE queues SET current_patient_id = $1, updated_at = CURRENT_TIMESTAMP WHERE doctor_id = $2',
        [updated.id, updated.doctor_id]
      );
    }
    return updated;
  }

  // 4. COMPLETE CONSULTATION
  static async completeConsultation(patientId: number): Promise<Patient | null> {
    const db = await getDatabase();
    const res = await db.query<Patient>(
      `UPDATE patients 
       SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      [patientId]
    );
    const updated = res.rows[0] || null;

    if (updated) {
      await db.query(
        'UPDATE queues SET current_patient_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE doctor_id = $1 AND current_patient_id = $2',
        [updated.doctor_id, updated.id]
      );
    }
    return updated;
  }

  // 5. SKIP PATIENT
  static async skipPatient(patientId: number): Promise<Patient | null> {
    const db = await getDatabase();
    const res = await db.query<Patient>(
      `UPDATE patients 
       SET status = 'SKIPPED', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      [patientId]
    );
    const updated = res.rows[0] || null;

    if (updated) {
      await db.query(
        'UPDATE queues SET current_patient_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE doctor_id = $1 AND current_patient_id = $2',
        [updated.doctor_id, updated.id]
      );
    }
    return updated;
  }

  // 6. NO SHOW
  static async noShowPatient(patientId: number): Promise<Patient | null> {
    const db = await getDatabase();
    const res = await db.query<Patient>(
      `UPDATE patients 
       SET status = 'NO_SHOW', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      [patientId]
    );
    const updated = res.rows[0] || null;

    if (updated) {
      await db.query(
        'UPDATE queues SET current_patient_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE doctor_id = $1 AND current_patient_id = $2',
        [updated.doctor_id, updated.id]
      );
    }
    return updated;
  }

  // 7. WALK-IN PATIENT
  static async addWalkInPatient(
    patientName: string,
    phone: string = '',
    doctorId: string = 'dr-kumar'
  ): Promise<Patient> {
    const db = await getDatabase();

    // Determine next available token
    const tokenRes = await db.query<Patient>(
      "SELECT token FROM patients WHERE doctor_id = $1 ORDER BY id DESC",
      [doctorId]
    );

    let maxNum = 0;
    for (const row of tokenRes.rows) {
      const match = row.token.match(/A(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    // Ensure doctor exists in doctors table
    await db.query(
      `INSERT INTO doctors (id, name, room, delay_status, avg_consultation_time)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [doctorId, 'Dr. Kumar', 'Room 2', 'Available', 15]
    );

    const nextTokenNumber = maxNum + 1;
    const newToken = `A${nextTokenNumber < 10 ? '0' + nextTokenNumber : nextTokenNumber}`;

    const insertRes = await db.query<Patient>(
      `INSERT INTO patients (token, patient_name, phone, doctor_id, appointment_time, status, is_walk_in, checked_in_at)
       VALUES ($1, $2, $3, $4, 'Walk-in', 'WAITING', TRUE, CURRENT_TIMESTAMP)
       RETURNING *`,
      [newToken, patientName.trim(), phone.trim() || '+91 98765 00000', doctorId]
    );

    return insertRes.rows[0];
  }

  // 8. CSV APPOINTMENT IMPORT
  static async importAppointments(
    rows: Array<{ patient_name: string; phone?: string; appointment_time: string; doctor_name?: string }>,
    doctorId: string = 'dr-kumar'
  ): Promise<{ count: number; imported: Patient[] }> {
    const db = await getDatabase();

    // Ensure doctor exists in doctors table
    await db.query(
      `INSERT INTO doctors (id, name, room, delay_status, avg_consultation_time)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [doctorId, 'Dr. Kumar', 'Room 2', 'Available', 15]
    );

    // Find highest token across ALL patients
    const tokenRes = await db.query<Patient>(
      "SELECT token FROM patients ORDER BY id DESC"
    );

    let maxNum = 0;
    for (const row of tokenRes.rows) {
      const match = row.token.match(/A(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }

    const imported: Patient[] = [];

    for (const row of rows) {
      if (!row.patient_name || !row.appointment_time) continue;
      maxNum++;
      const token = `A${maxNum < 10 ? '0' + maxNum : maxNum}`;
      const phone = row.phone?.trim() || '+91 98765 43200';

      const insertRes = await db.query<Patient>(
        `INSERT INTO patients (token, patient_name, phone, doctor_id, appointment_time, status, is_walk_in)
         VALUES ($1, $2, $3, $4, $5, 'BOOKED', FALSE)
         RETURNING *`,
        [token, row.patient_name.trim(), phone, doctorId, row.appointment_time.trim()]
      );

      imported.push(insertRes.rows[0]);
    }

    return { count: imported.length, imported };
  }

  // 9. Update Doctor Delay Status
  static async updateDoctorStatus(doctorId: string, delayStatus: string): Promise<Doctor | null> {
    const db = await getDatabase();
    const res = await db.query<Doctor>(
      'UPDATE doctors SET delay_status = $1 WHERE id = $2 RETURNING *',
      [delayStatus, doctorId]
    );
    return res.rows[0] || null;
  }

  // 10. Update Doctor Average Consultation Time (Section 2 & 9)
  static async updateDoctorAvgConsultationTime(doctorId: string, avgMinutes: number): Promise<Doctor | null> {
    const db = await getDatabase();
    const res = await db.query<Doctor>(
      'UPDATE doctors SET avg_consultation_time = $1 WHERE id = $2 RETURNING *',
      [avgMinutes, doctorId]
    );
    return res.rows[0] || null;
  }

  // Generic update status
  static async updatePatientStatus(patientId: number, status: PatientStatus): Promise<Patient | null> {
    const db = await getDatabase();
    
    let checkedInClause = '';
    if (status === 'WAITING') {
      checkedInClause = ', checked_in_at = COALESCE(checked_in_at, CURRENT_TIMESTAMP)';
    } else if (status === 'CALLED') {
      checkedInClause = ', called_at = CURRENT_TIMESTAMP';
    } else if (status === 'COMPLETED') {
      checkedInClause = ', completed_at = CURRENT_TIMESTAMP';
    }

    const res = await db.query<Patient>(
      `UPDATE patients 
       SET status = $1, updated_at = CURRENT_TIMESTAMP ${checkedInClause} 
       WHERE id = $2 
       RETURNING *`,
      [status, patientId]
    );

    const updatedPatient = res.rows[0] || null;

    if (updatedPatient) {
      if (status === 'IN_CONSULTATION' || status === 'CALLED') {
        await db.query(
          'UPDATE queues SET current_patient_id = $1, updated_at = CURRENT_TIMESTAMP WHERE doctor_id = $2',
          [updatedPatient.id, updatedPatient.doctor_id]
        );
      } else if (status === 'COMPLETED' || status === 'SKIPPED' || status === 'NO_SHOW') {
        await db.query(
          'UPDATE queues SET current_patient_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE doctor_id = $1 AND current_patient_id = $2',
          [updatedPatient.doctor_id, updatedPatient.id]
        );
      }
    }

    return updatedPatient;
  }

  // 11. Delete all appointments/patients from today's queue
  static async deleteAllPatients(doctorId?: string): Promise<{ count: number }> {
    const db = await getDatabase();
    if (doctorId && doctorId !== 'ALL') {
      const countRes = await db.query('SELECT COUNT(*) FROM patients WHERE doctor_id = $1', [doctorId]);
      const count = parseInt(countRes.rows[0]?.count || '0', 10);
      await db.query('DELETE FROM patients WHERE doctor_id = $1', [doctorId]);
      await db.query('UPDATE queues SET current_patient_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE doctor_id = $1', [doctorId]);
      return { count };
    } else {
      const countRes = await db.query('SELECT COUNT(*) FROM patients');
      const count = parseInt(countRes.rows[0]?.count || '0', 10);
      await db.query('DELETE FROM patients');
      await db.query('UPDATE queues SET current_patient_id = NULL, updated_at = CURRENT_TIMESTAMP');
      return { count };
    }
  }
}
