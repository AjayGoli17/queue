import { Router, Request, Response } from 'express';
import { QueueService } from '../services/queueService.js';
import { seedDatabase } from '../seed/seedData.js';
import { getDatabase } from '../config/database.js';
import { wsService } from '../services/websocketService.js';

const router = Router();

// GET /api/queue/overview?doctor_id=dr-kumar
router.get('/queue/overview', async (req: Request, res: Response) => {
  try {
    const doctorId = (req.query.doctor_id as string) || 'dr-kumar';
    const overview = await QueueService.getQueueOverview(doctorId);
    if (!overview) {
      return res.status(404).json({ error: 'Doctor or queue not found' });
    }
    return res.json(overview);
  } catch (error: any) {
    console.error('[API /queue/overview] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to retrieve queue overview.' });
  }
});

// GET /api/queue/patient/:token
router.get('/queue/patient/:token', async (req: Request, res: Response) => {
  try {
    const token = req.params.token;
    if (!token || !token.trim()) {
      return res.status(400).json({ error: 'Token parameter is required.' });
    }
    const tracking = await QueueService.getPatientTracking(token);
    if (!tracking) {
      return res.status(404).json({ error: `Patient with token "${token.toUpperCase()}" not found.` });
    }
    return res.json(tracking);
  } catch (error: any) {
    console.error('[API /queue/patient/:token] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to retrieve patient tracking status.' });
  }
});

// POST /api/queue/check-in/:id
router.post('/queue/check-in/:id', async (req: Request, res: Response) => {
  try {
    const patientId = parseInt(req.params.id, 10);
    const updated = await QueueService.checkInPatient(patientId);
    if (!updated) {
      return res.status(404).json({ error: 'Patient not found.' });
    }
    wsService.broadcastQueueUpdate(updated.doctor_id);
    return res.json({ success: true, patient: updated });
  } catch (error: any) {
    console.error('[API /queue/check-in/:id] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to check in patient.' });
  }
});

// POST /api/queue/call-next
router.post('/queue/call-next', async (req: Request, res: Response) => {
  try {
    const doctorId = (req.body?.doctor_id as string) || 'dr-kumar';
    const result = await QueueService.callNext(doctorId);
    if (!result.called_patient) {
      return res.status(400).json({ error: result.message || 'No patients are currently waiting.' });
    }
    wsService.broadcastQueueUpdate(doctorId);
    return res.json({ success: true, patient: result.called_patient });
  } catch (error: any) {
    console.error('[API /queue/call-next] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to call next patient.' });
  }
});

// POST /api/queue/start-consultation/:id
router.post('/queue/start-consultation/:id', async (req: Request, res: Response) => {
  try {
    const patientId = parseInt(req.params.id, 10);
    const updated = await QueueService.startConsultation(patientId);
    if (!updated) {
      return res.status(404).json({ error: 'Patient not found.' });
    }
    wsService.broadcastQueueUpdate(updated.doctor_id);
    return res.json({ success: true, patient: updated });
  } catch (error: any) {
    console.error('[API /queue/start-consultation/:id] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to start consultation.' });
  }
});

// POST /api/queue/complete-consultation/:id
router.post('/queue/complete-consultation/:id', async (req: Request, res: Response) => {
  try {
    const patientId = parseInt(req.params.id, 10);
    const updated = await QueueService.completeConsultation(patientId);
    if (!updated) {
      return res.status(404).json({ error: 'Patient not found.' });
    }
    wsService.broadcastQueueUpdate(updated.doctor_id);
    return res.json({ success: true, patient: updated });
  } catch (error: any) {
    console.error('[API /queue/complete-consultation/:id] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to complete consultation.' });
  }
});

// POST /api/queue/skip/:id
router.post('/queue/skip/:id', async (req: Request, res: Response) => {
  try {
    const patientId = parseInt(req.params.id, 10);
    const updated = await QueueService.skipPatient(patientId);
    if (!updated) {
      return res.status(404).json({ error: 'Patient not found.' });
    }
    wsService.broadcastQueueUpdate(updated.doctor_id);
    return res.json({ success: true, patient: updated });
  } catch (error: any) {
    console.error('[API /queue/skip/:id] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to skip patient.' });
  }
});

// POST /api/queue/no-show/:id
router.post('/queue/no-show/:id', async (req: Request, res: Response) => {
  try {
    const patientId = parseInt(req.params.id, 10);
    const updated = await QueueService.noShowPatient(patientId);
    if (!updated) {
      return res.status(404).json({ error: 'Patient not found.' });
    }
    wsService.broadcastQueueUpdate(updated.doctor_id);
    return res.json({ success: true, patient: updated });
  } catch (error: any) {
    console.error('[API /queue/no-show/:id] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to mark patient as no-show.' });
  }
});

// POST /api/queue/walk-in
router.post('/queue/walk-in', async (req: Request, res: Response) => {
  try {
    const { patient_name, phone, doctor_id } = req.body || {};
    if (!patient_name || !patient_name.trim()) {
      return res.status(400).json({ error: 'Patient Name is required.' });
    }
    const doctorId = doctor_id || 'dr-kumar';
    const walkInPatient = await QueueService.addWalkInPatient(patient_name, phone, doctorId);
    wsService.broadcastQueueUpdate(doctorId);
    return res.json({ success: true, patient: walkInPatient });
  } catch (error: any) {
    console.error('[API /queue/walk-in] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to register walk-in patient.' });
  }
});

// POST /api/queue/import-appointments
router.post('/queue/import-appointments', async (req: Request, res: Response) => {
  try {
    const { appointments, doctor_id } = req.body || {};
    if (!Array.isArray(appointments) || appointments.length === 0) {
      return res.status(400).json({ success: false, error: 'No appointments provided for import.' });
    }
    const doctorId = doctor_id || 'dr-kumar';
    const result = await QueueService.importAppointments(appointments, doctorId);
    wsService.broadcastQueueUpdate(doctorId);
    return res.json({
      success: true,
      count: result.count,
      message: `${result.count} appointments imported successfully.`,
      imported: result.imported,
      errors: result.errors,
    });
  } catch (error: any) {
    console.error('[API /queue/import-appointments] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to import appointments' });
  }
});

// GET /api/patients
router.get('/patients', async (_req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const result = await db.query('SELECT * FROM patients ORDER BY id ASC');
    return res.json(result.rows);
  } catch (error: any) {
    console.error('[API /patients] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch patients.' });
  }
});

// GET /api/doctors
router.get('/doctors', async (_req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const result = await db.query('SELECT * FROM doctors ORDER BY id ASC');
    return res.json(result.rows);
  } catch (error: any) {
    console.error('[API /doctors] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch doctors.' });
  }
});

// PATCH & POST & PUT /api/patients/:id/status
const handlePatientStatusUpdate = async (req: Request, res: Response) => {
  try {
    const patientId = parseInt(req.params.id, 10);
    const { status } = req.body || {};
    if (!status) {
      return res.status(400).json({ error: 'Status is required.' });
    }
    const updated = await QueueService.updatePatientStatus(patientId, status);
    if (!updated) {
      return res.status(404).json({ error: 'Patient not found.' });
    }
    wsService.broadcastQueueUpdate(updated.doctor_id);
    return res.json(updated);
  } catch (error: any) {
    console.error(`[API /patients/:id/status] Error:`, error);
    return res.status(500).json({ error: error.message || 'Failed to update patient status.' });
  }
};

router.patch('/patients/:id/status', handlePatientStatusUpdate);
router.post('/patients/:id/status', handlePatientStatusUpdate);
router.put('/patients/:id/status', handlePatientStatusUpdate);

// PATCH /api/doctors/:id/delay
router.patch('/doctors/:id/delay', async (req: Request, res: Response) => {
  try {
    const doctorId = req.params.id;
    const { delay_status } = req.body || {};
    if (!delay_status) {
      return res.status(400).json({ error: 'delay_status is required.' });
    }
    const updated = await QueueService.updateDoctorStatus(doctorId, delay_status);
    wsService.broadcastQueueUpdate(doctorId);
    return res.json(updated);
  } catch (error: any) {
    console.error('[API /doctors/:id/delay] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to update doctor delay status.' });
  }
});

// PATCH /api/doctors/:id/consultation-time
router.patch('/doctors/:id/consultation-time', async (req: Request, res: Response) => {
  try {
    const doctorId = req.params.id;
    const { avg_consultation_time } = req.body || {};
    if (typeof avg_consultation_time !== 'number' || avg_consultation_time <= 0) {
      return res.status(400).json({ error: 'Valid avg_consultation_time number is required.' });
    }
    const updated = await QueueService.updateDoctorAvgConsultationTime(doctorId, avg_consultation_time);
    wsService.broadcastQueueUpdate(doctorId);
    return res.json(updated);
  } catch (error: any) {
    console.error('[API /doctors/:id/consultation-time] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to update doctor consultation time.' });
  }
});

// POST /api/demo/reset
router.post('/demo/reset', async (req: Request, res: Response) => {
  try {
    const mode = req.body?.mode === 'all_booked' ? 'all_booked' : 'active_demo';
    await seedDatabase(mode);
    const overview = await QueueService.getQueueOverview('dr-kumar');
    wsService.broadcastQueueUpdate('dr-kumar');
    return res.json({ message: `Database reset to ${mode} mode`, overview });
  } catch (error: any) {
    console.error('[API /demo/reset] Error resetting demo state:', error);
    return res.status(500).json({ error: error.message || 'Failed to reset demo state.' });
  }
});

// DELETE /api/queue/all
router.delete('/queue/all', async (req: Request, res: Response) => {
  try {
    const doctorId = (req.query.doctor_id as string) || (req.body?.doctor_id as string);
    const result = await QueueService.deleteAllPatients(doctorId);
    wsService.broadcastQueueUpdate(doctorId || 'dr-kumar');
    return res.json({ success: true, count: result.count, message: `All ${result.count} appointments removed.` });
  } catch (error: any) {
    console.error('[API /queue/all] Error deleting appointments:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete appointments.' });
  }
});

// POST /api/queue/clear
router.post('/queue/clear', async (req: Request, res: Response) => {
  try {
    const doctorId = (req.body?.doctor_id as string) || (req.query.doctor_id as string);
    const result = await QueueService.deleteAllPatients(doctorId);
    wsService.broadcastQueueUpdate(doctorId || 'dr-kumar');
    return res.json({ success: true, count: result.count, message: `All ${result.count} appointments removed.` });
  } catch (error: any) {
    console.error('[API /queue/clear] Error clearing appointments:', error);
    return res.status(500).json({ error: error.message || 'Failed to clear appointments.' });
  }
});

export default router;
