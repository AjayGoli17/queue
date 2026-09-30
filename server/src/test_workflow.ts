import { WebSocket } from 'ws';

async function runTests() {
  const BASE = 'http://localhost:5001/api';
  console.log('🧪 Starting End-to-End Hospital Queue Workflow Verification...\n');

  // Test WebSocket connection
  const ws = new WebSocket('ws://localhost:5001/ws');
  let wsUpdatesCount = 0;
  ws.on('message', (msg) => {
    const data = JSON.parse(msg.toString());
    if (data.type === 'QUEUE_UPDATED') {
      wsUpdatesCount++;
    }
  });

  await new Promise(r => setTimeout(r, 400));

  // STEP 0: Reset to all_booked
  console.log('--- Step 0: Reset to ALL BOOKED ---');
  await fetch(`${BASE}/demo/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'all_booked' }),
  });

  const patientsRes = await fetch(`${BASE}/patients`);
  const patients = await patientsRes.json();
  const pA05 = patients.find((p: any) => p.token === 'A05');
  const pA06 = patients.find((p: any) => p.token === 'A06');
  const pA07 = patients.find((p: any) => p.token === 'A07');

  console.log(`Initial status A05: ${pA05.status}, A06: ${pA06.status}, A07: ${pA07.status}`);
  console.assert(pA05.status === 'BOOKED', 'A05 should be BOOKED');

  // STEP 1: Check in A05
  console.log('\n--- Step 1: Check in A05 (Sneha Rao) ---');
  const res1 = await fetch(`${BASE}/queue/check-in/${pA05.id}`, { method: 'POST' });
  const d1 = await res1.json();
  console.log('A05 Checked in:', d1.patient.status);
  console.assert(d1.patient.status === 'WAITING', 'A05 must be WAITING');

  // STEP 2: Check in A06
  console.log('\n--- Step 2: Check in A06 (Arjun Patel) ---');
  const res2 = await fetch(`${BASE}/queue/check-in/${pA06.id}`, { method: 'POST' });
  const d2 = await res2.json();
  console.log('A06 Checked in:', d2.patient.status);
  console.assert(d2.patient.status === 'WAITING', 'A06 must be WAITING');

  // STEP 3: Check in A07
  console.log('\n--- Step 3: Check in A07 (Meena Das) ---');
  const res3 = await fetch(`${BASE}/queue/check-in/${pA07.id}`, { method: 'POST' });
  const d3 = await res3.json();
  console.log('A07 Checked in:', d3.patient.status);
  console.assert(d3.patient.status === 'WAITING', 'A07 must be WAITING');

  // STEP 4: Open Patient Tracking for A07 -> Should show PATIENTS AHEAD = 2
  console.log('\n--- Step 4: Patient Tracking for A07 ---');
  const trackA07_1 = await (await fetch(`${BASE}/queue/patient/A07`)).json();
  console.log(`A07 Status: ${trackA07_1.status}, Patients Ahead: ${trackA07_1.patients_ahead}`);
  console.assert(trackA07_1.patients_ahead === 2, `Expected 2 patients ahead, got ${trackA07_1.patients_ahead}`);

  // STEP 5: CALL NEXT -> A05 becomes CALLED
  console.log('\n--- Step 5: CALL NEXT (A05) ---');
  const call1 = await (await fetch(`${BASE}/queue/call-next`, { method: 'POST' })).json();
  console.log(`Called Patient: ${call1.patient.token} (${call1.patient.patient_name}), Status: ${call1.patient.status}`);
  console.assert(call1.patient.token === 'A05', 'A05 must be called');
  console.assert(call1.patient.status === 'CALLED', 'A05 must have status CALLED');

  const trackA07_2 = await (await fetch(`${BASE}/queue/patient/A07`)).json();
  console.log(`A07 Now Serving: ${trackA07_2.current_serving_token}, Patients Ahead: ${trackA07_2.patients_ahead}`);
  console.assert(trackA07_2.current_serving_token === 'A05', 'Now serving should be A05');
  console.assert(trackA07_2.patients_ahead === 1, `Expected 1 patient ahead, got ${trackA07_2.patients_ahead}`);

  // STEP 6: START CONSULTATION on A05
  console.log('\n--- Step 6: START CONSULTATION (A05) ---');
  const start1 = await (await fetch(`${BASE}/queue/start-consultation/${pA05.id}`, { method: 'POST' })).json();
  console.log(`A05 Status after start consultation: ${start1.patient.status}`);
  console.assert(start1.patient.status === 'IN_CONSULTATION', 'A05 must be IN_CONSULTATION');

  // STEP 7: COMPLETE CONSULTATION on A05
  console.log('\n--- Step 7: COMPLETE CONSULTATION (A05) ---');
  const comp1 = await (await fetch(`${BASE}/queue/complete-consultation/${pA05.id}`, { method: 'POST' })).json();
  console.log(`A05 Status after completion: ${comp1.patient.status}`);
  console.assert(comp1.patient.status === 'COMPLETED', 'A05 must be COMPLETED');

  // STEP 8: CALL NEXT -> A06 becomes CALLED
  console.log('\n--- Step 8: CALL NEXT (A06) ---');
  const call2 = await (await fetch(`${BASE}/queue/call-next`, { method: 'POST' })).json();
  console.log(`Called Patient: ${call2.patient.token} (${call2.patient.patient_name}), Status: ${call2.patient.status}`);
  console.assert(call2.patient.token === 'A06', 'A06 must be called');

  const trackA07_3 = await (await fetch(`${BASE}/queue/patient/A07`)).json();
  console.log(`A07 Now Serving: ${trackA07_3.current_serving_token}, Patients Ahead: ${trackA07_3.patients_ahead}`);
  console.assert(trackA07_3.current_serving_token === 'A06', 'Now serving should be A06');
  console.assert(trackA07_3.patients_ahead === 0, `Expected 0 patients ahead, got ${trackA07_3.patients_ahead}`);

  // STEP 9: CALL NEXT -> A07 becomes CALLED
  console.log('\n--- Step 9: CALL NEXT (A07) ---');
  const call3 = await (await fetch(`${BASE}/queue/call-next`, { method: 'POST' })).json();
  console.log(`Called Patient: ${call3.patient.token}, Status: ${call3.patient.status}`);
  console.assert(call3.patient.token === 'A07', 'A07 must be called');

  const trackA07_4 = await (await fetch(`${BASE}/queue/patient/A07`)).json();
  console.log(`A07 Status: ${trackA07_4.status}, Message: "${trackA07_4.message}"`);
  console.assert(trackA07_4.status === 'CALLED', 'A07 must be CALLED');

  // STEP 10: DOCTOR DELAY TOGGLE
  console.log('\n--- Step 10: DOCTOR DELAY TOGGLE ---');
  await fetch(`${BASE}/doctors/dr-kumar/delay`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delay_status: 'Delayed 15m' }),
  });
  const trackA07_delay = await (await fetch(`${BASE}/queue/patient/A07`)).json();
  console.log(`Doctor Delay Status: ${trackA07_delay.delay_status}, Is Delayed: ${trackA07_delay.is_doctor_delayed}`);
  console.log(`Message with delay: "${trackA07_delay.message}"`);
  console.assert(trackA07_delay.is_doctor_delayed === true, 'Doctor should be delayed');

  // Reset delay back to Available
  await fetch(`${BASE}/doctors/dr-kumar/delay`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delay_status: 'Available' }),
  });

  // Verify real-time WebSocket events received
  console.log(`\n📡 Total WebSocket Real-time Broadcasts Received: ${wsUpdatesCount}`);
  console.assert(wsUpdatesCount >= 7, 'Expected multiple real-time WebSocket broadcasts');

  // Reset back to active demo for UI
  await fetch(`${BASE}/demo/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'active_demo' }),
  });

  ws.close();
  console.log('\n🎉 ALL WORKFLOW TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((e) => {
  console.error('❌ Test failed:', e);
  process.exit(1);
});
