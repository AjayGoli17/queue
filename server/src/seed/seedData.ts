import { getDatabase, initDatabase } from '../config/database.js';

export const DEMO_PATIENTS = [
  { token: 'A01', name: 'Rahul Sharma', phone: '+91 98765 43210', time: '10:00 AM', status: 'COMPLETED', checkInOffset: -60 },
  { token: 'A02', name: 'Priya Reddy', phone: '+91 98765 43211', time: '10:15 AM', status: 'COMPLETED', checkInOffset: -45 },
  { token: 'A03', name: 'Ahmed Khan', phone: '+91 98765 43212', time: '10:30 AM', status: 'COMPLETED', checkInOffset: -30 },
  { token: 'A04', name: 'Ravi Kumar', phone: '+91 98765 43213', time: '10:45 AM', status: 'COMPLETED', checkInOffset: -15 },
  { token: 'A05', name: 'Sneha Rao', phone: '+91 98765 43214', time: '11:00 AM', status: 'IN_CONSULTATION', checkInOffset: -10 },
  { token: 'A06', name: 'Arjun Patel', phone: '+91 98765 43215', time: '11:15 AM', status: 'WAITING', checkInOffset: -8 },
  { token: 'A07', name: 'Meena Das', phone: '+91 98765 43216', time: '11:30 AM', status: 'WAITING', checkInOffset: -6 },
  { token: 'A08', name: 'Suresh Reddy', phone: '+91 98765 43217', time: '11:45 AM', status: 'WAITING', checkInOffset: -4 },
  { token: 'A09', name: 'Kavya Sharma', phone: '+91 98765 43218', time: '12:00 PM', status: 'WAITING', checkInOffset: -2 },
  { token: 'A10', name: 'Vikram Singh', phone: '+91 98765 43219', time: '12:15 PM', status: 'BOOKED', checkInOffset: null },
];

export async function seedDatabase(mode: 'active_demo' | 'all_booked' = 'active_demo') {
  const db = await getDatabase();
  await initDatabase();

  console.log('Seeding database with demo data (mode:', mode, ')...');

  // 1. Seed Doctor with avg_consultation_time = 15 min
  await db.query(
    `INSERT INTO doctors (id, name, room, delay_status, avg_consultation_time)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO UPDATE 
     SET name = EXCLUDED.name, room = EXCLUDED.room, delay_status = EXCLUDED.delay_status, avg_consultation_time = EXCLUDED.avg_consultation_time`,
    ['dr-kumar', 'Dr. Kumar', 'Room 2', 'Available', 15]
  );

  // 2. Clear old demo patients and queue
  await db.query('DELETE FROM queues WHERE doctor_id = $1', ['dr-kumar']);
  await db.query('DELETE FROM patients WHERE doctor_id = $1', ['dr-kumar']);

  // 3. Seed Patients
  let currentServingId: number | null = null;
  const now = Date.now();

  for (const p of DEMO_PATIENTS) {
    const status = mode === 'all_booked' ? 'BOOKED' : p.status;
    let checkedInAt: Date | null = null;

    if (mode === 'active_demo' && p.checkInOffset !== null && status !== 'BOOKED') {
      checkedInAt = new Date(now + p.checkInOffset * 60 * 1000);
    }

    const res = await db.query(
      `INSERT INTO patients (token, patient_name, phone, doctor_id, appointment_time, status, is_walk_in, checked_in_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, token`,
      [p.token, p.name, p.phone, 'dr-kumar', p.time, status, false, checkedInAt]
    );

    if (p.token === 'A05' && mode === 'active_demo') {
      currentServingId = res.rows[0].id;
    }
  }

  // 4. Seed Queue
  await db.query(
    `INSERT INTO queues (doctor_id, current_patient_id, queue_state)
     VALUES ($1, $2, $3)`,
    ['dr-kumar', currentServingId, 'ACTIVE']
  );

  console.log('Database seeded successfully!');
}

if (process.argv[1]?.endsWith('seedData.ts') || process.argv[1]?.endsWith('seedData.js')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}
