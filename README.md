# City Care Hospital — Queue & Patient Flow Management System

A full-stack, real-time client demonstration prototype designed to manage patient flow, floor queues, and waiting experiences beside existing hospital management software (HMS).

---

## 🏥 Hospital System Concept & Separation of Concerns

$$\text{Existing HMS (Appointments \& Billing)} \xrightarrow{\text{Export Today's CSV / Walk-in Arrival}} \mathbf{\text{Queue \& Patient Flow System}} \longrightarrow \text{Real-time Display \& Mobile Tracking}$$

- **Existing HMS**: Remains the hospital's single source of truth for appointments, registration, and billing.
- **Our Queue System**: Takes over as soon as patients arrive, managing Check-in, Queueing, Waiting Room TV displays, Mobile Patient Tracking, Calling, and Consultation completion.

---

## ✨ Client Demo Features

### 1. 📋 Floor Reception Dashboard
- **`+ WALK-IN PATIENT`**: Instant walk-in registration generating the next available token (e.g. `A11`), assigning `WAITING` status, and placing the patient into the active FIFO queue.
- **`IMPORT APPOINTMENTS`**: Batch import today's appointments exported from existing HMS via CSV (`Patient Name`, `Phone`, `Doctor`, `Appointment Time`) with automatic token assignment and `BOOKED` status.
- **Queue Controls**: `CALL NEXT`, `START CONSULTATION`, `COMPLETE CONSULTATION`, `SKIP`, `NO SHOW`, and `DELAY`.
- **Dynamic Stats**: Total Booked, Checked In, Waiting, In Consultation, Completed, No Show/Skipped, Walk-Ins.
- **Today's Summary**: Live overview card showing total appointments, check-ins, completed consultations, walk-in count, and average waiting time.
- **Filterable Table**: Quick filters for `All`, `Booked`, `Waiting`, `Called`, `In Consultation`, `Completed`, `No Show / Skipped`, and `Walk-ins`.

### 2. 📱 Patient Tracking Page (Mobile Friendly)
- Real-time token status lookup with phone frame preview option.
- Displays:
  - **`YOUR TOKEN`**: `A07`
  - **`STATUS`**: `WAITING`
  - **`NOW SERVING`**: `A06`
  - **`PATIENTS AHEAD`**: `0`
  - **`DOCTOR`**: `Dr. Kumar — Room 2`
  - **`HOSPITAL`**: `City Care Hospital`
- **CALLED Announcement Banner**: Prominently flashes when called into the doctor's room.
- **Doctor Delay Notice**: Displays alert when the doctor is marked as delayed.

### 3. 📺 Waiting-Room TV Display
- High-contrast, large typography designed for distance visibility on TV monitors.
- **NOW SERVING**: Large token, patient name, doctor, and room number.
- **NEXT**: Waiting queue list ordered by arrival time.
- **Doctor Delay Alert Banner**: Full-width notice displayed when doctor delay is active.

### 4. ⚡ Live Real-Time Multi-Screen Synchronization (WebSockets)
- Built on WebSockets (`/ws`) for instant synchronization across all open browser windows without manual page refreshing.

### 5. 🔄 Demo Reset Menu
- Clearly separated dropdown menu to quickly reset to:
  - **Morning State (All Booked: A01 - A10)** for fresh check-in walkthroughs.
  - **Mid-Day Live Queue Flow (A05 In Consultation, A06-A09 Waiting)**.

---

## 🧪 Automated End-to-End Verification Test

Run the full automated test suite verifying all 12 steps of the client demonstration flow:

\`\`\`bash
npm test
\`\`\`

---

## 🚀 Quick Start

### 1. Start Both Backend & Frontend
\`\`\`bash
npm run dev
\`\`\`

- **Frontend Application**: [http://localhost:3000](http://localhost:3000)
- **Backend API & WebSockets**: [http://localhost:5001](http://localhost:5001)

### 2. Recommended 3-Window Client Demonstration:
1. **Window 1**: Open [http://localhost:3000](http://localhost:3000) (Reception Dashboard)
2. **Window 2**: Open [http://localhost:3000](http://localhost:3000) $\rightarrow$ switch to **Waiting TV Display**
3. **Window 3**: Open [http://localhost:3000](http://localhost:3000) $\rightarrow$ switch to **Patient Tracking** (enter `A07`)
4. Trigger actions on Reception (Check In, Call Next, Start Consultation, Complete Consultation, + Walk-In, Delay) and observe Window 2 and Window 3 update in real-time!
