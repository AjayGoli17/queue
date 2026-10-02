import React, { useState, useEffect, useMemo } from 'react';
import type { QueueOverview } from '../types';
import { generateQr } from '../utils/qr';
import {
  Cross,
  Megaphone,
  ListOrdered,
  QrCode,
  Volume2,
} from 'lucide-react';

interface WaitingRoomTVDisplayProps {
  overview: QueueOverview;
}

export const WaitingRoomTVDisplay: React.FC<WaitingRoomTVDisplayProps> = ({ overview }) => {
  const [now, setNow] = useState<Date>(() => new Date());

  const { hospital_name, doctor, current_patient, next_patients, stats } = overview;
  const avgConsultation = doctor.avg_consultation_time || 15;

  // Live clock updating every second
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fullscreen keyboard shortcut ('F') and double-click
  useEffect(() => {
    const toggle = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'f') toggle();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('dblclick', toggle);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('dblclick', toggle);
    };
  }, []);

  // Display at least 15 real queue records simultaneously when available (or all real ones if fewer)
  const visiblePatients = useMemo(() => {
    return next_patients.slice(0, 15);
  }, [next_patients]);

  const queueCount = stats?.waiting ?? next_patients.length;

  // Tracking QR code URL pointing to the patient tracking route
  const trackUrl = useMemo(() => `${window.location.origin}/track`, []);
  const qr = useMemo(() => {
    try {
      return generateQr(trackUrl);
    } catch {
      return null;
    }
  }, [trackUrl]);

  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const estWait = (index: number) => {
    if (index === 0) return '~8 min';
    return `~${(index + 1) * avgConsultation} min`;
  };

  return (
    <div className="tv-shell">
      {/* 1. COMPACT TV HEADER */}
      <header className="tv-header">
        <div className="tv-header-brand">
          <div className="tv-logo-badge">
            <Cross size={20} strokeWidth={3} />
          </div>
          <div>
            <div className="tv-hospital-title">{hospital_name || 'CITY CARE HOSPITAL'}</div>
            <div className="tv-hospital-sub">Patient Queue Orchestrator</div>
          </div>
        </div>

        <div className="tv-header-right">
          <div className="tv-room-badge">
            WAITING ROOM
          </div>
          <div className="tv-live-pill">
            <span className="tv-status-dot animate-pulse" />
            LIVE
          </div>
          <div className="tv-clock-display">
            <div className="tv-clock-time">{timeStr}</div>
            <div className="tv-clock-dept">General Outpatient Triage</div>
          </div>
        </div>
      </header>

      {/* 2. CORE QUEUE INFORMATION (40% LEFT / 60% RIGHT SPLIT) */}
      <main className="tv-main-grid">
        {/* LEFT: NOW SERVING (40% width, dominant token) */}
        <section className="tv-serving-card">
          <div className="tv-card-head">
            <div className="tv-section-title">
              <Megaphone size={18} />
              <span>NOW SERVING</span>
            </div>
            <span className="tv-serving-badge">
              {current_patient?.status === 'CALLED'
                ? 'Active Call'
                : current_patient?.status === 'IN_CONSULTATION'
                ? 'In Consultation'
                : 'Waiting'}
            </span>
          </div>

          <div className="tv-serving-body">
            {current_patient ? (
              <>
                <div className="tv-serving-token">
                  {current_patient.token}
                </div>
                <div className="tv-serving-name">
                  {current_patient.patient_name}
                </div>
                <div className="tv-serving-meta">
                  {current_patient.is_walk_in
                    ? `Walk-in Visit · ${doctor.name} · ${doctor.room}`
                    : `Appointment · ${current_patient.appointment_time} · ${doctor.name} · ${doctor.room}`}
                </div>
                <div className="tv-serving-status-pill">
                  <span className="tv-status-dot animate-pulse" />
                  <span>{current_patient.status === 'CALLED' ? 'CALLED — PLEASE PROCEED' : 'IN CONSULTATION'}</span>
                </div>
              </>
            ) : (
              <>
                <div className="tv-serving-token is-empty">
                  --
                </div>
                <div className="tv-serving-name is-empty">
                  Next Patient Calling Shortly
                </div>
                <div className="tv-serving-meta">
                  {doctor.name} · {doctor.room} · General Outpatient Triage
                </div>
                <div className="tv-serving-status-pill is-waiting">
                  <span className="tv-status-dot" />
                  <span>PLEASE REMAIN SEATED</span>
                </div>
              </>
            )}
          </div>
        </section>

        {/* RIGHT: NEXT IN LINE (60% width, shows up to 15 tokens simultaneously) */}
        <section className="tv-queue-card">
          <div className="tv-card-head">
            <div className="tv-section-title">
              <ListOrdered size={18} />
              <span>NEXT IN LINE</span>
            </div>
            <span className="tv-queue-count-badge">
              {queueCount} IN QUEUE
            </span>
          </div>

          <div className="tv-table-head">
            <span>TOKEN</span>
            <span>PATIENT</span>
            <span>APPT TIME</span>
            <span style={{ textAlign: 'right' }}>EST. WAIT</span>
          </div>

          <div className="tv-table-body">
            {visiblePatients.length > 0 ? (
              visiblePatients.map((p, idx) => (
                <div key={p.id} className={`tv-queue-row ${idx === 0 ? 'is-first' : ''}`}>
                  <span className="tv-row-token">{p.token}</span>
                  <span className="tv-row-patient">
                    {p.patient_name}
                    {p.is_walk_in && (
                      <span className="tv-walkin-tag">
                        WALK-IN
                      </span>
                    )}
                  </span>
                  <span className="tv-row-time">
                    {p.is_walk_in ? 'Walk-in' : p.appointment_time}
                  </span>
                  <span className="tv-row-wait">
                    {estWait(idx)}
                  </span>
                </div>
              ))
            ) : (
              <div className="tv-empty-queue">
                No patients currently waiting in queue.
              </div>
            )}
          </div>
        </section>
      </main>

      {/* 3. MIDDLE QUEUE STATUS BAR */}
      <div className="tv-status-bar">
        <span>QUEUE STATUS</span>
        <span className="tv-status-count">{queueCount} PATIENTS WAITING</span>
        <div className="tv-status-live">
          <span className="tv-status-dot animate-pulse" />
          <span>LIVE UPDATES</span>
        </div>
      </div>

      {/* 4. SUPPORTING INFORMATION (TRACK TOKEN & ANNOUNCEMENT) */}
      <div className="tv-bottom-grid">
        {/* TRACK YOUR TOKEN */}
        <div className="tv-track-card">
          <div className="tv-qr-box">
            {qr ? (
              <svg viewBox={`-1 -1 ${qr.length + 2} ${qr.length + 2}`} width="100%" height="100%" shapeRendering="crispEdges">
                <rect x="-1" y="-1" width={qr.length + 2} height={qr.length + 2} fill="#fff" />
                {qr.map((row, y) =>
                  row.map((dark, x) => (dark ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#0f172a" /> : null))
                )}
              </svg>
            ) : (
              <div className="tv-qr-fallback">
                <QrCode className="tv-fallback-icon" />
              </div>
            )}
          </div>
          <div className="tv-track-info">
            <div className="tv-info-title">TRACK YOUR TOKEN</div>
            <div className="tv-info-sub">
              Scan QR code with your mobile camera to view your live queue position.
            </div>
          </div>
        </div>

        {/* ANNOUNCEMENT GUIDANCE */}
        <div className="tv-notice-card">
          <div className="tv-notice-icon-box">
            <Volume2 className="tv-speaker-icon" />
          </div>
          <div className="tv-notice-info">
            <div className="tv-info-title">PLEASE WAIT FOR YOUR TOKEN TO BE ANNOUNCED</div>
            <div className="tv-info-sub">
              Queue position updates automatically. Please proceed to the room when your token is called.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
