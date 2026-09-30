# City Care Hospital — Queue & Patient Flow Management System

A full-stack, real-time client demonstration prototype designed to manage patient flow, floor queues, and waiting experiences beside existing hospital management software (HMS).

---

## 🌐 Real-World Screen Routes & Demo URLs

The application gives the three real-world hospital interfaces their own dedicated URLs while sharing a single backend, PostgreSQL database, and WebSocket connection:

| Screen | Route | URL | Purpose |
| :--- | :--- | :--- | :--- |
| **Demo Launcher** | `/` | [http://localhost:3000/](http://localhost:3000/) | Client demonstration portal & screen launcher |
| **Reception Dashboard** | `/reception` | [http://localhost:3000/reception](http://localhost:3000/reception) | Doctor-floor queue control console for reception staff |
| **Waiting Room TV Display** | `/display` | [http://localhost:3000/display](http://localhost:3000/display) | Clean, high-visibility display for waiting area monitors |
| **Patient Mobile Tracker** | `/track/:token` | [http://localhost:3000/track/A07](http://localhost:3000/track/A07) | Live mobile tracking for an individual patient |

---

## 🏥 Hospital System Concept & Separation of Concerns

$$\text{Existing HMS (Appointments \& Billing)} \xrightarrow{\text{Export Today's CSV / Walk-in Arrival}} \mathbf{\text{Queue \& Patient Flow System}} \longrightarrow \text{Real-time Display \& Mobile Tracking}$$

- **Existing HMS**: Remains the hospital's single source of truth for appointments, registration, and billing.
- **Our Queue System**: Takes over as soon as patients arrive, managing Check-in, Queueing, Waiting Room TV displays, Mobile Patient Tracking, Calling, and Consultation completion.

---

## ✨ Features by Screen

### 1. 📋 Floor Reception Dashboard (`/reception`)
- **`+ WALK-IN PATIENT`**: Instant walk-in registration generating the next available token (e.g. `A11`), assigning `WAITING` status, and placing the patient into the active FIFO queue.
- **`IMPORT APPOINTMENTS`**: Batch import today's appointments exported from existing HMS via CSV (`Patient Name`, `Phone`, `Doctor`, `Appointment Time`) with automatic token assignment and `BOOKED` status.
- **Queue Controls**: `CALL NEXT`, `START CONSULTATION`, `COMPLETE CONSULTATION`, `SKIP`, `NO SHOW`, and `DOCTOR DELAY`.
- **Dynamic Stats Bar**: Total Booked, Checked In, Waiting, In Consultation, Completed, No Show/Skipped, Walk-Ins.
- **Today's Summary**: Live overview card showing total appointments, check-ins, completed consultations, walk-in count, and average waiting time.
- **Filterable Table**: Quick filters for `All`, `Booked`, `Waiting`, `Called`, `In Consultation`, `Completed`, `No Show / Skipped`, and `Walk-ins`.
- **Demo Reset Menu**: Quickly reset to **Morning State (All 10 Booked: A01 - A10)** or **Mid-Day Live Queue Flow**.

### 2. 📺 Waiting-Room TV Display (`/display`)
- Designed specifically for large monitors and wall-mounted TV screens in waiting areas.
- **NOW SERVING**: Very large token number, patient name, doctor, and room number.
- **NEXT**: Waiting queue list ordered by arrival time.
- **Doctor Delay Alert Banner**: Full-width notice displayed across the screen when doctor delay is active (`DR. KUMAR — DELAYED / PLEASE REMAIN IN THE WAITING AREA`).
- Clean, display-only layout with zero admin clutter, zero forms, and fullscreen toggle.

### 3. 📱 Patient Tracking Page (`/track/:token`)
- Dynamic route loading any patient token directly from the URL (e.g. `/track/A07`, `/track/A05`, `/track/A06`).
- Displays:
  - **`CITY CARE HOSPITAL`**
  - **`YOUR TOKEN`**: `A07`
  - **`STATUS`**: `WAITING`
  - **`NOW SERVING`**: `A06`
  - **`PATIENTS AHEAD`**: `0` (or `1`, `2`)
  - **`DOCTOR`**: `Dr. Kumar — Room 2`
- **When Called**: Flashes prominent announcement:
  > 🔔 **YOUR TOKEN HAS BEEN CALLED**  
  > Please proceed to: **Dr. Kumar — Room 2**
- **When Doctor is Delayed**:
  > ⚠️ **Dr. Kumar is currently delayed.**  
  > Approximately 15 minutes. Please remain in the waiting area.
- **When Completed**:
  > ✅ **Consultation completed. Thank you for visiting City Care Hospital.**

### 4. ⚡ Live Real-Time Multi-Screen Synchronization (WebSockets)
- Backend broadcasts real-time `QUEUE_UPDATED` events over WebSocket (`/ws`).
- Open all three screens simultaneously and watch them update instantly without manual refreshing!

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

### 2. 3-Window Client Demonstration Setup:
1. **Window 1 (Receptionist)**: Open [http://localhost:3000/reception](http://localhost:3000/reception)
2. **Window 2 (Waiting TV Display)**: Open [http://localhost:3000/display](http://localhost:3000/display)
3. **Window 3 (Patient Phone)**: Open [http://localhost:3000/track/A07](http://localhost:3000/track/A07)
4. Trigger actions on Reception (Check In, Call Next, Start Consultation, Complete Consultation, + Walk-In, Delay) and observe Window 2 and Window 3 update in **sub-millisecond real time** without refreshing!
