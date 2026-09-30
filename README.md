# City Care Hospital — Queue & Patient Flow Management System

A full-stack client demonstration prototype built to manage patient flow, floor queues, and waiting experiences beside existing hospital management software (HMS).

---

## 🌟 Overview & Product Architecture

Our system does **not** replace the existing hospital HMS (appointments, registration, billing). Instead, it sits beside it to power the floor experience:

$$\text{Appointment (HMS)} \longrightarrow \text{Arrival} \longrightarrow \text{Check-in} \longrightarrow \text{Queue} \longrightarrow \text{Waiting} \longrightarrow \text{Calling} \longrightarrow \text{Consultation} \longrightarrow \text{Completion}$$

---

## 🚀 Key Features Built in Prototype

### 1. 📋 Doctor-Floor Reception Dashboard
- **Hospital**: City Care Hospital
- **Doctor / Room**: Dr. Kumar — Room 2 (Doctor Status: Available)
- **Currently Serving Card**: Prominent display of active patient (`A05 — Sneha Rao`)
- **Next Patients Queue**: Live queue list (`A06 — Arjun Patel`, `A07 — Meena Das`, `A08 — Suresh Reddy`, `A09 — Kavya Sharma`)
- **Queue Action Controls**: `CALL NEXT`, `DELAY`, `SKIP`, `NO SHOW`
- **Today's Statistics**: Total Booked, Waiting, In Consultation, Completed, No Show/Skipped
- **All Today's Appointments**: Full synchronized table for tokens `A01` to `A10`
- **HMS Appointment Import**: Foundation UI for CSV/Excel upload from existing HMS

### 2. 📱 Patient Tracking Page (Mobile Friendly)
- Clean public tracker interface with simulated phone frame mockup option
- Token search: Enter `A07` (or click quick token chips)
- Live details:
  - **YOUR TOKEN**: `A07`
  - **YOUR STATUS**: `WAITING`
  - **NOW SERVING**: `A05` (`Sneha Rao`)
  - **PATIENTS AHEAD**: `1`
  - **Doctor**: `Dr. Kumar`
  - **Room**: `Room 2`
  - **Guidance Message**: *"Please remain in the waiting area. You will be called when it is your turn."*

### 3. 📺 Waiting-Room TV Display
- Designed for large monitors and wall-mounted TV screens
- High-contrast typography readable from across the room
- **NOW SERVING**: Large `A05` token and `Sneha Rao` display
- **NEXT**: Queue list with token badges and appointment times
- Live real-time clock, date, and doctor status indicator

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite
- **Backend**: Node.js, Express, TypeScript (REST API)
- **Database**: PostgreSQL (Embedded WASM PGlite persistence with zero config + standard PostgreSQL server pool support)

---

## ⚡ Quick Start

### 1. Install Dependencies
\`\`\`bash
npm install
cd client && npm install && cd ..
\`\`\`

### 2. Seed Demo Database
\`\`\`bash
npm run seed
\`\`\`

### 3. Start Both Backend & Frontend
\`\`\`bash
npm run dev
\`\`\`

- **Frontend Application**: [http://localhost:3000](http://localhost:3000)
- **Backend REST API**: [http://localhost:5001](http://localhost:5001)
- **API Health Check**: [http://localhost:5001/health](http://localhost:5001/health)
- **Queue Overview API**: [http://localhost:5001/api/queue/overview](http://localhost:5001/api/queue/overview)

---

## 📊 Database Schema

### `doctors`
- `id` (VARCHAR PK)
- `name` (VARCHAR)
- `room` (VARCHAR)
- `delay_status` (VARCHAR)
- `created_at` (TIMESTAMP)

### `patients`
- `id` (SERIAL PK)
- `token` (VARCHAR UNIQUE)
- `patient_name` (VARCHAR)
- `phone` (VARCHAR)
- `doctor_id` (VARCHAR FK)
- `appointment_time` (VARCHAR)
- `status` (ENUM: `BOOKED`, `CHECKED_IN`, `WAITING`, `CALLED`, `IN_CONSULTATION`, `COMPLETED`, `SKIPPED`, `NO_SHOW`)
- `created_at`, `updated_at` (TIMESTAMP)

### `queues`
- `id` (SERIAL PK)
- `doctor_id` (VARCHAR FK)
- `current_patient_id` (INTEGER FK)
- `queue_date` (DATE)
- `queue_state` (VARCHAR)
- `created_at`, `updated_at` (TIMESTAMP)
