import { getDatabase } from '../config/database.js';
import { Doctor, Patient, PatientTrackingInfo, QueueOverview, PatientStatus } from '../types/index.js';

export class QueueService {
  /**
   * Helper to ensure the doctor and their queue record exist in the database.
   */
  static async ensureDoctorAndQueue(doctorId: string = 'dr-kumar'): Promise<Doctor> {
    const db = await getDatabase();
    await db.query(
      `INSERT INTO doctors (id, name, room, delay_status, avg_consultation_time)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [doctorId, 'Dr. Kumar', 'Room 2', 'Available', 15]
    );

    await db.query(
      `INSERT INTO queues (doctor_id, current_patient_id, queue_state)
       VALUES ($1, NULL, 'ACTIVE')
       ON CONFLICT DO NOTHING`,
      [doctorId]
    );

    const docRes = await db.query<Doctor>('SELECT * FROM doctors WHERE id = $1', [doctorId]);
    return (
      docRes.rows[0] || {
        id: doctorId,
        name: 'Dr. Kumar',
        room: 'Room 2',
        delay_status: 'Available',
        avg_consultation_time: 15,
      }
    );
  }

  static async getQueueOverview(doctorId: string = 'dr-kumar'): Promise<QueueOverview | null> {
    const db = await getDatabase();
    const doctor = await QueueService.ensureDoctorAndQueue(doctorId);

    // Get Queue
    const queueRes = await db.query('SELECT * FROM queues WHERE doctor_id = $1 LIMIT 1', [doctorId]);
    const queue = queueRes.rows[0];

    // Get All Patients for doctor
    const patientsRes = await db.query<Patient>(
      'SELECT * FROM patients WHERE doctor_id = $1 ORDER BY id ASC',
      [doctorId]
    );
    const allPatients = patientsRes.rows;

    // Current Serving Patient
    let currentPatient: Patient | null = null;
    if (queue && queue.current_patient_id) {
      const match = allPatients.find(p => p.id === queue.current_patient_id);
      if (match && (match.status === 'CALLED' || match.status === 'IN_CONSULTATION')) {
        currentPatient = match;
      }
    }
    if (!currentPatient) {
      const activeServing = allPatients
        .filter(p => p.status === 'IN_CONSULTATION' || p.status === 'CALLED')
        .sort((a, b) => {
          const timeA = new Date(a.called_at || a.updated_at || a.created_at || 0).getTime();
          const timeB = new Date(b.called_at || b.updated_at || b.created_at || 0).getTime();
          return timeB - timeA;
        });
      currentPatient = activeServing[0] || null;
    }

    // Active Queue Patients: WAITING, CHECKED_IN, and BOOKED
    // FIFO Order: WAITING first (by checked_in_at ASC, id ASC), then CHECKED_IN, then BOOKED
    const activeQueueStatuses = ['WAITING', 'CHECKED_IN', 'BOOKED'];
    const nextPatients = allPatients
      .filter(p => activeQueueStatuses.includes(p.status) && (!currentPatient || p.id !== currentPatient.id))
      .sort((a, b) => {
        const priorityOrder: Record<string, number> = { WAITING: 1, CHECKED_IN: 2, BOOKED: 3 };
        const orderA = priorityOrder[a.status] || 99;
        const orderB = priorityOrder[b.status] || 99;
        if (orderA !== orderB) return orderA - orderB;

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

    // Compute Dynamic Stats
    const bookedCount = allPatients.filter(p => p.status === 'BOOKED').length;
    const checkedInCount = allPatients.filter(p => p.status === 'CHECKED_IN').length;
    const waitingCount = allPatients.filter(p => p.status === 'WAITING' || p.status === 'CHECKED_IN' || p.status === 'BOOKED').length;
    const inConsultationCount = allPatients.filter(p => p.status === 'IN_CONSULTATION').length;
    const calledCount = allPatients.filter(p => p.status === 'CALLED').length;
    const completedCount = allPatients.filter(p => p.status === 'COMPLETED').length;
    const skippedCount = allPatients.filter(p => p.status === 'SKIPPED').length;
    const noShowCount = allPatients.filter(p => p.status === 'NO_SHOW').length;
    const walkInsCount = allPatients.filter(p => p.is_walk_in).length;

    // Average Waiting Time Calculation
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
      called: calledCount,
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
    const doctorId = patient.doctor_id || 'dr-kumar';
    const doctor = await QueueService.ensureDoctorAndQueue(doctorId);

    const avgConsultation = doctor.avg_consultation_time || 15;
    const isDoctorDelayed = (doctor.delay_status || '').toLowerCase().includes('delay');

    // Find Queue & Current Serving Patient
    const queueRes = await db.query('SELECT * FROM queues WHERE doctor_id = $1 LIMIT 1', [doctorId]);
    const queue = queueRes.rows[0];

    let currentServingPatient: Patient | null = null;
    if (queue && queue.current_patient_id) {
      const curRes = await db.query<Patient>('SELECT * FROM patients WHERE id = $1', [queue.current_patient_id]);
      currentServingPatient = curRes.rows[0] || null;
    }
    if (!currentServingPatient) {
      const curRes = await db.query<Patient>(
        "SELECT * FROM patients WHERE doctor_id = $1 AND status IN ('IN_CONSULTATION', 'CALLED') ORDER BY updated_at DESC LIMIT 1",
        [doctorId]
      );
      currentServingPatient = curRes.rows[0] || null;
    }

    // Calculate Patients Ahead:
    // Count all active patients ahead in the queue before this patient
    const activeQueueStatuses = ['WAITING', 'CHECKED_IN', 'BOOKED'];
    let patientsAhead = 0;

    if (activeQueueStatuses.includes(patient.status)) {
      const waitingRes = await db.query<Patient>(
        "SELECT * FROM patients WHERE doctor_id = $1 AND status IN ('WAITING', 'CHECKED_IN', 'BOOKED') AND id != $2",
        [doctorId, patient.id]
      );
      
      const allWaiting = waitingRes.rows;
      const priorityOrder: Record<string, number> = { WAITING: 1, CHECKED_IN: 2, BOOKED: 3 };
      const myPriority = priorityOrder[patient.status] || 99;
      const patientCheckIn = patient.checked_in_at ? new Date(patient.checked_in_at).getTime() : Infinity;

      patientsAhead = allWaiting.filter(other => {
        const otherPriority = priorityOrder[other.status] || 99;
        if (otherPriority < myPriority) return true;
        if (otherPriority > myPriority) return false;

        const otherCheckIn = other.checked_in_at ? new Date(other.checked_in_at).getTime() : Infinity;
        if (otherCheckIn < patientCheckIn) return true;
        if (otherCheckIn === patientCheckIn) return other.id < patient.id;
        return false;
      }).length;
    }

    // Calculate Estimated Waiting Time
    let estimatedWaitMinutes: number | null = null;
    let estimatedWaitText: string | null = null;

    if (activeQueueStatuses.includes(patient.status)) {
      if (patientsAhead > 0) {
        estimatedWaitMinutes = patientsAhead * avgConsultation;
        estimatedWaitText = `~${estimatedWaitMinutes} minutes`;
      } else {
        estimatedWaitMinutes = 0;
        estimatedWaitText = "You're next";
      }
    }

    const displayAppointmentTime = patient.is_walk_in ? 'Walk-in' : (patient.appointment_time || 'Walk-in');

    // Dynamic Guidance Messages
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

  // 2. CALL NEXT (FIFO from active queue)
  static async callNext(doctorId: string = 'dr-kumar'): Promise<{ called_patient: Patient | null; message?: string }> {
    const db = await getDatabase();
    await QueueService.ensureDoctorAndQueue(doctorId);

    // Find next patient (FIFO: WAITING first, then CHECKED_IN, then BOOKED)
    const nextRes = await db.query<Patient>(
      `SELECT * FROM patients 
       WHERE doctor_id = $1 AND status IN ('WAITING', 'CHECKED_IN', 'BOOKED') 
       ORDER BY CASE WHEN status = 'WAITING' THEN 1 WHEN status = 'CHECKED_IN' THEN 2 ELSE 3 END,
                checked_in_at ASC NULLS LAST, id ASC 
       LIMIT 1`,
      [doctorId]
    );

    if (nextRes.rows.length === 0) {
      return { called_patient: null, message: 'No patients are currently waiting.' };
    }

    const nextPatient = nextRes.rows[0];

    // If there was a previous patient in consultation or called, complete them
    const queueRes = await db.query('SELECT current_patient_id FROM queues WHERE doctor_id = $1', [doctorId]);
    const currentId = queueRes.rows[0]?.current_patient_id;

    if (currentId && currentId !== nextPatient.id) {
      const curPatientRes = await db.query<Patient>('SELECT status FROM patients WHERE id = $1', [currentId]);
      const curStatus = curPatientRes.rows[0]?.status;
      if (curStatus === 'IN_CONSULTATION' || curStatus === 'CALLED') {
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
    await QueueService.ensureDoctorAndQueue(doctorId);

    // Determine next available token
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
  ): Promise<{ count: number; imported: Patient[]; errors?: string[] }> {
    const db = await getDatabase();
    await QueueService.ensureDoctorAndQueue(doctorId);

    console.log(`[CSV IMPORT] request received for doctor: ${doctorId}, rows: ${rows.length}`);

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
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      if (!row.patient_name || !row.patient_name.trim()) {
        errors.push(`Row ${rowNum}: missing Patient Name`);
        continue;
      }

      if (!row.appointment_time || !row.appointment_time.trim()) {
        errors.push(`Row ${rowNum}: missing Appointment Time`);
        continue;
      }

      try {
        maxNum++;
        const token = `A${maxNum < 10 ? '0' + maxNum : maxNum}`;
        const phone = row.phone?.trim() || '+91 98765 00000';
        const appointmentTime = row.appointment_time.trim();

        const insertRes = await db.query<Patient>(
          `INSERT INTO patients (token, patient_name, phone, doctor_id, appointment_time, status, is_walk_in)
           VALUES ($1, $2, $3, $4, $5, 'BOOKED', FALSE)
           RETURNING *`,
          [token, row.patient_name.trim(), phone, doctorId, appointmentTime]
        );

        if (insertRes.rows[0]) {
          imported.push(insertRes.rows[0]);
        }
      } catch (err: any) {
        console.error(`[CSV IMPORT] Error inserting row ${rowNum}:`, err);
        errors.push(`Row ${rowNum}: ${err.message || 'Database insert failed'}`);
      }
    }

    if (imported.length === 0 && errors.length > 0) {
      throw new Error(`Import failed: ${errors.join(', ')}`);
    }

    return { count: imported.length, imported, errors: errors.length > 0 ? errors : undefined };
  }

  // 9. Update Doctor Delay Status
  static async updateDoctorStatus(doctorId: string, delayStatus: string): Promise<Doctor | null> {
    const db = await getDatabase();
    await QueueService.ensureDoctorAndQueue(doctorId);
    const res = await db.query<Doctor>(
      'UPDATE doctors SET delay_status = $1 WHERE id = $2 RETURNING *',
      [delayStatus, doctorId]
    );
    return res.rows[0] || null;
  }

  // 10. Update Doctor Average Consultation Time
  static async updateDoctorAvgConsultationTime(doctorId: string, avgMinutes: number): Promise<Doctor | null> {
    const db = await getDatabase();
    await QueueService.ensureDoctorAndQueue(doctorId);
    const res = await db.query<Doctor>(
      'UPDATE doctors SET avg_consultation_time = $1 WHERE id = $2 RETURNING *',
      [avgMinutes, doctorId]
    );
    return res.rows[0] || null;
  }

  // 11. Update Patient Status
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
      const doctorId = updatedPatient.doctor_id || 'dr-kumar';
      await QueueService.ensureDoctorAndQueue(doctorId);

      if (status === 'IN_CONSULTATION' || status === 'CALLED') {
        // Complete any previously called or in consultation patient for this doctor
        await db.query(
          `UPDATE patients 
           SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
           WHERE doctor_id = $1 AND id != $2 AND status IN ('CALLED', 'IN_CONSULTATION')`,
          [doctorId, updatedPatient.id]
        );

        await db.query(
          'UPDATE queues SET current_patient_id = $1, updated_at = CURRENT_TIMESTAMP WHERE doctor_id = $2',
          [updatedPatient.id, doctorId]
        );
      } else if (status === 'COMPLETED' || status === 'SKIPPED' || status === 'NO_SHOW') {
        await db.query(
          'UPDATE queues SET current_patient_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE doctor_id = $1 AND current_patient_id = $2',
          [doctorId, updatedPatient.id]
        );
      }
    }

    return updatedPatient;
  }

  // 12. Delete all appointments
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
