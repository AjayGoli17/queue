import { Router, Request, Response } from 'express';
import { QueueService } from '../services/queueService.js';
import { seedDatabase } from '../seed/seedData.js';
import { getDatabase } from '../config/database.js';

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
    console.error('Error fetching queue overview:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET /api/queue/patient/:token
router.get('/queue/patient/:token', async (req: Request, res: Response) => {
  try {
    const token = req.params.token;
    const tracking = await QueueService.getPatientTracking(token);
    if (!tracking) {
      return res.status(404).json({ error: `Patient with token "${token.toUpperCase()}" not found.` });
    }
    return res.json(tracking);
  } catch (error: any) {
    console.error('Error fetching patient tracking:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET /api/patients
router.get('/patients', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const result = await db.query('SELECT * FROM patients ORDER BY id ASC');
    return res.json(result.rows);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET /api/doctors
router.get('/doctors', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const result = await db.query('SELECT * FROM doctors ORDER BY id ASC');
    return res.json(result.rows);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// PATCH /api/patients/:id/status
router.patch('/patients/:id/status', async (req: Request, res: Response) => {
  try {
    const patientId = parseInt(req.params.id, 10);
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    const updated = await QueueService.updatePatientStatus(patientId, status);
    if (!updated) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// PATCH /api/doctors/:id/delay
router.patch('/doctors/:id/delay', async (req: Request, res: Response) => {
  try {
    const doctorId = req.params.id;
    const { delay_status } = req.body;
    if (!delay_status) {
      return res.status(400).json({ error: 'delay_status is required' });
    }
    const updated = await QueueService.updateDoctorStatus(doctorId, delay_status);
    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// POST /api/demo/reset
router.post('/demo/reset', async (req: Request, res: Response) => {
  try {
    const mode = req.body.mode === 'all_booked' ? 'all_booked' : 'active_demo';
    await seedDatabase(mode);
    const overview = await QueueService.getQueueOverview('dr-kumar');
    return res.json({ message: `Database reset to ${mode} mode`, overview });
  } catch (error: any) {
    console.error('Error resetting demo state:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
