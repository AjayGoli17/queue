-- PostgreSQL Schema for Hospital Queue & Patient Flow Management System

-- Drop tables if needed for reset
DROP TABLE IF EXISTS queues CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;

-- Doctors Table
CREATE TABLE IF NOT EXISTS doctors (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    room VARCHAR(50) NOT NULL,
    delay_status VARCHAR(50) DEFAULT 'Available',
    avg_consultation_time INTEGER DEFAULT 15,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Patients Table
CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    token VARCHAR(20) NOT NULL UNIQUE,
    patient_name VARCHAR(100) NOT NULL,
    phone VARCHAR(30),
    doctor_id VARCHAR(50) REFERENCES doctors(id) ON DELETE SET NULL,
    appointment_time VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'BOOKED',
    is_walk_in BOOLEAN DEFAULT FALSE,
    checked_in_at TIMESTAMP,
    called_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Queues Table
CREATE TABLE IF NOT EXISTS queues (
    id SERIAL PRIMARY KEY,
    doctor_id VARCHAR(50) REFERENCES doctors(id) ON DELETE CASCADE,
    current_patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
    queue_date DATE DEFAULT CURRENT_DATE,
    queue_state VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_patients_token ON patients(token);
CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);
CREATE INDEX IF NOT EXISTS idx_patients_doctor ON patients(doctor_id);
CREATE INDEX IF NOT EXISTS idx_patients_checked_in_at ON patients(checked_in_at);
CREATE INDEX IF NOT EXISTS idx_queues_doctor ON queues(doctor_id);
