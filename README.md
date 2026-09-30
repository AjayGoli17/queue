# City Care Hospital — Queue & Patient Flow Management System

A full-stack, real-time client demonstration prototype built to manage patient flow, floor queues, and waiting experiences beside existing hospital management software (HMS).

---

## 🌟 Primary Goal & Architecture

$$\text{Appointment (HMS)} \longrightarrow \text{Arrival} \longrightarrow \text{Check-in} \longrightarrow \text{Queue} \longrightarrow \text{Waiting} \longrightarrow \text{Calling} \longrightarrow \text{Consultation} \longrightarrow \text{Completion}$$

### Core Patient Lifecycle:
$$\text{BOOKED} \xrightarrow{\text{Check-In}} \text{WAITING} \xrightarrow{\text{Call Next}} \text{CALLED} \xrightarrow{\text{Start}} \text{IN\_CONSULTATION} \xrightarrow{\text{Complete}} \text{COMPLETED}$$
$$\text{WAITING / CALLED} \xrightarrow{\text{Skip}} \text{SKIPPED} \qquad \text{WAITING / CALLED} \xrightarrow{\text{No Show}} \text{NO\_SHOW}$$

---

## ⚡ Prompt 2 End-to-End Features

### 1. 📋 Real-Time Reception Queue Controls
- **Check-In**: Turn `BOOKED` patients into `WAITING` with automatic entry into FIFO queue with timestamp.
- **Predictable FIFO Queue**: Next patient is strictly determined by arrival/check-in order.
- **CALL NEXT**: Calls the next waiting patient, sets status to `CALLED`, assigns them to the consultation room, and broadcasts instant real-time updates to all connected screens.
- **Consultation Workflow**:
  - `START CONSULTATION` $\rightarrow$ `IN_CONSULTATION`
  - `COMPLETE CONSULTATION` $\rightarrow$ `COMPLETED` (clears room, ready for next patient)
- **Skip & No-Show**: Moves patients out of the active queue while retaining their historical records in the database.
- **Doctor Delay Toggle**: One-click delay status switch (`Available` $\leftrightarrow$ `DOCTOR DELAYED`).

### 2. 📱 Live Patient Tracking Page
- Calculates exact **`PATIENTS AHEAD`** position in real-time from the database.
- **Token Called Banner**: When called, shows prominent announcement:
  > **YOUR TOKEN HAS BEEN CALLED**  
  > Please proceed to: **Dr. Kumar — Room 2**
- **Doctor Delay Alert**: Displays notice when the doctor is delayed:
  > **Dr. Kumar is currently delayed.**  
  > Please remain in the waiting area.

### 3. 📺 Waiting-Room TV Display
- **Now Serving**: High-visibility hero banner for the current token & patient name.
- **Next List**: Real-time waiting list ordered by queue arrival time.
- **Doctor Delayed Banner**: Full-width notice displayed across the top when doctor delay is active.

### 4. ⚡ Live Real-Time Synchronization (WebSockets)
- Backend broadcasts real-time `QUEUE_UPDATED` events over WebSocket (`/ws`).
- All open windows (Reception, TV Display, Patient Mobile Tracker) synchronize instantly with zero page reloads.

---

## 🧪 Automated End-to-End Verification Test

To run the complete automated test suite verifying all 10 steps of the Section 12 lifecycle:

\`\`\`bash
npm test
\`\`\`

**Verified Steps in Test Suite:**
1. Reset to `ALL BOOKED`
2. Check in `A05 (Sneha Rao)` $\rightarrow$ `WAITING`
3. Check in `A06 (Arjun Patel)` $\rightarrow$ `WAITING`
4. Check in `A07 (Meena Das)` $\rightarrow$ `WAITING`
5. Verify `A07` tracking $\rightarrow$ `PATIENTS AHEAD = 2`
6. Click `CALL NEXT` $\rightarrow$ `A05` becomes `CALLED`; `A07` tracking $\rightarrow$ `PATIENTS AHEAD = 1`
7. `START CONSULTATION` $\rightarrow$ `A05` becomes `IN_CONSULTATION`
8. `COMPLETE CONSULTATION` $\rightarrow$ `A05` becomes `COMPLETED`
9. Click `CALL NEXT` $\rightarrow$ `A06` becomes `CALLED`; `A07` tracking $\rightarrow$ `NOW SERVING = A06`, `PATIENTS AHEAD = 0`
10. Click `CALL NEXT` $\rightarrow$ `A07` becomes `CALLED`; `A07` tracking $\rightarrow$ `CALLED` banner
11. Toggle Doctor Delay $\rightarrow$ `DOCTOR DELAYED` alert on all screens
12. 11+ real-time WebSocket broadcasts delivered without errors.

---

## 🚀 Quick Start

### 1. Start Server & Client
\`\`\`bash
npm run dev
\`\`\`

- **Frontend Application**: [http://localhost:3000](http://localhost:3000)
- **Backend API & WebSockets**: [http://localhost:5001](http://localhost:5001)

### 2. Multi-Window Live Demo Setup:
- **Window 1**: Open [http://localhost:3000](http://localhost:3000) on **Reception Dashboard**
- **Window 2**: Open [http://localhost:3000](http://localhost:3000) on **Waiting TV Display**
- **Window 3**: Open [http://localhost:3000](http://localhost:3000) on **Patient Tracking** (enter `A07`)
- Perform actions on Reception (Check In, Call Next, Start Consultation, Complete Consultation, Delay) and watch all 3 screens update in real-time!
