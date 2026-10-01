import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { QueueOverview } from '../types';
import { generateQr } from '../utils/qr';
import {
  Plus,
  Info,
  Clock,
  User,
  Megaphone,
  ListOrdered,
  ArrowRight,
  Wifi,
  Coffee,
  Headset,
  Users,
  Repeat,
  Volume2,
} from 'lucide-react';

interface WaitingRoomTVDisplayProps {
  overview: QueueOverview;
}

/**
 * Fluid sizing: every size below is expressed through `u()`, which multiplies a CSS unit
 * (--u) that grows/shrinks with the viewport (limited by both width and height), so the
 * layout fills any TV / monitor / tablet while keeping the reference proportions.
 */
const u = (n: number) => `calc(var(--u) * ${n})`;
/** Queue rows per page and seconds each page is shown (existing TV only showed 4 rows, no rotation) */
const PAGE_SIZE = 10;
const PAGE_ROTATE_MS = 10000;

const C = {
  navy: '#0f1b2d',
  teal: '#1f6f63',
  tealDeep: '#17584e',
  muted: '#5b6b82',
  paleBlue: '#e8effb',
  rowBg: '#eef3fb',
  rowNext: '#e3ebf9',
  border: '#dbe4f1',
};

const pad2 = (n: number) => String(n).padStart(2, '0');

export const WaitingRoomTVDisplay: React.FC<WaitingRoomTVDisplayProps> = ({ overview }) => {
  const [now, setNow] = useState<Date>(new Date());
  const [page, setPage] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  const { hospital_name, doctor, current_patient, next_patients, stats } = overview;
  const isDoctorDelayed = doctor.delay_status.toLowerCase().includes('delay');
  const delayMinutes = doctor.delay_status.match(/(\d+)/)?.[1];
  const avgConsultation = doctor.avg_consultation_time || 15;

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Track when fresh data last arrived (App re-sets `overview` on every poll / websocket update)
  useEffect(() => {
    setLastUpdate(Date.now());
  }, [overview]);

  // Fullscreen: press "F" or double-click (the old on-screen controls are not part of the TV design)
  useEffect(() => {
    const toggle = () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
      else document.exitFullscreen().catch(() => {});
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

  // Pagination + automatic rotation
  const totalPages = Math.max(1, Math.ceil(next_patients.length / PAGE_SIZE));
  useEffect(() => {
    if (totalPages <= 1) {
      setPage(0);
      return;
    }
    const t = setInterval(() => setPage((p) => (p + 1) % totalPages), PAGE_ROTATE_MS);
    return () => clearInterval(t);
  }, [totalPages]);
  const safePage = Math.min(page, totalPages - 1);
  const pageStart = safePage * PAGE_SIZE;
  const visible = next_patients.slice(pageStart, pageStart + PAGE_SIZE);

  // Tracking QR (points at the existing /track route of this same app)
  const trackUrl = `${window.location.origin}/track`;
  const qr = useMemo(() => {
    try {
      return generateQr(trackUrl);
    } catch {
      return null;
    }
  }, [trackUrl]);

  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const dateStr = now
    .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    .toUpperCase();
  const utcStr = `UTC ${pad2(now.getUTCHours())}:${pad2(now.getUTCMinutes())}`;

  const ageSec = Math.max(0, Math.floor((now.getTime() - lastUpdate) / 1000));
  const isStale = ageSec > 20;
  const updatedText = ageSec < 60 ? 'Updated just now' : `Updated ${Math.floor(ageSec / 60)}m ago`;

  const serviceLine = (p: { is_walk_in?: boolean; appointment_time: string }) =>
    `${p.is_walk_in ? 'Walk-in' : `Appt ${p.appointment_time}`} • ${doctor.room}`;

  const estWait = (globalIdx: number) => (globalIdx === 0 ? 'Next' : `~ ${globalIdx * avgConsultation} min`);

  return (
    <div
      className="fixed inset-0 flex flex-col select-none font-sans overflow-hidden max-[899px]:overflow-y-auto"
      style={
        {
          // fluid unit: limited by width (1280 ref) and height (1100 ref) so it fits any screen; floored so phones stay readable (they scroll)
          '--u': 'max(0.62px, min(calc(100vw / 1280), calc(100vh / 1100)))',
          background: '#fafbfe',
          color: C.navy,
        } as React.CSSProperties
      }
    >
      {/* 1. TOP NAVIGATION */}
      <header
        className="flex items-center justify-between shrink-0 bg-white"
        style={{ minHeight: u(58), padding: `${u(8)} ${u(20)}`, borderBottom: `1px solid ${C.border}` }}
      >
        <Link to="/" className="flex items-center" style={{ gap: u(12) }} title="Return to launcher">
          <div className="flex items-center justify-center" style={{ width: u(30), height: u(30), borderRadius: u(5), background: C.teal }}>
            <Plus className="text-white" style={{ width: u(17), height: u(17) }} strokeWidth={3} />
          </div>
          <div>
            <div className="font-bold leading-tight" style={{ fontSize: u(17) }}>City Care Hospital</div>
            <div className="font-semibold uppercase leading-tight" style={{ fontSize: u(10.5), color: C.muted, letterSpacing: '0.08em' }}>
              Patient Flow Orchestrator
            </div>
          </div>
        </Link>

        <div className="hidden min-[700px]:block" style={{ background: C.paleBlue, padding: u(6), borderRadius: u(7) }}>
          <div className="font-semibold text-white whitespace-nowrap" style={{ background: C.teal, fontSize: u(17), padding: `${u(7)} ${u(16)}`, borderRadius: u(5) }}>
            Waiting Room TV
          </div>
        </div>

        <div className="flex items-center" style={{ gap: u(16) }}>
          <div
            className="hidden min-[560px]:flex items-center font-bold rounded-full whitespace-nowrap"
            style={{ background: C.paleBlue, fontSize: u(12), padding: `${u(6)} ${u(12)}`, gap: u(7) }}
          >
            <span className="rounded-full" style={{ width: u(8), height: u(8), background: isStale ? '#d97706' : C.tealDeep }} />
            {isStale ? 'Reconnecting — showing last data' : 'Live Queue Sync Active'}
          </div>
          <div className="text-right leading-tight">
            <div className="font-bold" style={{ fontSize: u(14) }}>Ward Triage Center</div>
            <div className="font-medium" style={{ fontSize: u(12.5), color: C.muted }}>{utcStr}</div>
          </div>
          <div className="rounded-full flex items-center justify-center" style={{ width: u(36), height: u(36), background: C.teal }}>
            <User className="text-white" style={{ width: u(17), height: u(17) }} />
          </div>
        </div>
      </header>

      {/* 2. MAIN TITLE / CLOCK */}
      <div className="flex items-center justify-between shrink-0 flex-wrap" style={{ padding: `${u(22)} ${u(48)} 0`, gap: u(12) }}>
        <div className="flex items-center" style={{ gap: u(16) }}>
          <div className="flex items-center justify-center shrink-0" style={{ width: u(50), height: u(50), borderRadius: u(9), background: C.teal }}>
            <div className="bg-white flex items-center justify-center" style={{ width: u(23), height: u(23), borderRadius: u(4) }}>
              <Plus style={{ width: u(17), height: u(17), color: C.teal }} strokeWidth={4} />
            </div>
          </div>
          <div>
            <div className="flex items-end flex-wrap" style={{ gap: u(8) }}>
              <h1 className="font-extrabold uppercase leading-none" style={{ fontSize: u(35), letterSpacing: '-0.01em' }}>
                {hospital_name}
              </h1>
              <span
                className="font-bold uppercase"
                style={{ fontSize: u(10.5), background: C.paleBlue, color: C.tealDeep, padding: `${u(3)} ${u(7)}`, borderRadius: u(3), letterSpacing: '0.08em', marginBottom: u(3) }}
              >
                Display Ward
              </span>
            </div>
            <div className="font-semibold uppercase" style={{ fontSize: u(12.5), color: C.muted, letterSpacing: '0.16em', marginTop: u(8) }}>
              Patient Queue Orchestrator • Central Lounge
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center justify-end" style={{ gap: u(14) }}>
            <span
              className="flex items-center font-bold uppercase rounded-full"
              style={{ fontSize: u(12.5), background: C.paleBlue, padding: `${u(5)} ${u(12)}`, letterSpacing: '0.06em', gap: u(7) }}
            >
              <span className="rounded-full" style={{ width: u(8), height: u(8), background: C.tealDeep }} />
              Live Feed
            </span>
            <span className="font-extrabold leading-none" style={{ fontSize: u(38) }}>{timeStr}</span>
          </div>
          <div className="font-semibold" style={{ fontSize: u(12.5), color: C.muted, letterSpacing: '0.12em', marginTop: u(8) }}>
            {dateStr}
          </div>
        </div>
      </div>

      {/* 3. OPERATIONAL ADVISORY */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{ margin: `${u(22)} ${u(48)} 0`, minHeight: u(50), background: '#e6eefb', borderRadius: u(9), padding: `${u(8)} ${u(18)}`, fontSize: u(14.5), gap: u(16) }}
      >
        <div className="flex items-center min-w-0" style={{ gap: u(14) }}>
          <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: u(30), height: u(30), background: '#d3deef' }}>
            <Info style={{ width: u(17), height: u(17), color: C.tealDeep }} />
          </div>
          <div>
            <span className="font-extrabold uppercase" style={{ color: C.tealDeep, letterSpacing: '0.06em', fontSize: u(13.5) }}>
              Operational Advisory:
            </span>{' '}
            <span className="font-bold">{doctor.name} • Consultation {doctor.room}</span>{' '}
            <span style={{ color: C.muted }}>
              —{' '}
              {isDoctorDelayed
                ? `Doctor delayed${delayMinutes ? ` approximately ${delayMinutes} minutes` : ''}. Please expect a short delay.`
                : 'Doctor available. Consultations are running on schedule.'}
            </span>
          </div>
        </div>
        <div className="hidden min-[700px]:flex items-center shrink-0 font-medium whitespace-nowrap" style={{ fontSize: u(12.5), color: C.muted, gap: u(6) }}>
          <Clock style={{ width: u(14), height: u(14) }} />
          {updatedText}
        </div>
      </div>

      {/* 4. MAIN TWO-COLUMN AREA (stacks on narrow screens) */}
      <main
        className="flex-1 min-[900px]:min-h-0 grid grid-cols-1 min-[900px]:grid-cols-[475fr_678fr]"
        style={{ margin: `${u(22)} ${u(48)} 0`, gap: u(32) }}
      >
        {/* LEFT COLUMN */}
        <div className="flex flex-col min-[900px]:min-h-0" style={{ gap: u(22) }}>
          {/* 4A. NOW SERVING */}
          <section
            className="flex flex-col flex-1 min-[900px]:min-h-0 bg-white"
            style={{ borderRadius: u(11), padding: u(30), boxShadow: '0 2px 8px rgba(15,27,45,0.06)', gap: u(10) }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center font-extrabold uppercase" style={{ fontSize: u(19), letterSpacing: '0.14em', color: C.tealDeep, gap: u(9) }}>
                <Megaphone style={{ width: u(23), height: u(23) }} />
                Now Serving
              </div>
              <span
                className="font-extrabold uppercase"
                style={{ fontSize: u(10.5), background: '#cfe8e2', color: C.tealDeep, padding: `${u(5)} ${u(10)}`, borderRadius: u(3), letterSpacing: '0.1em' }}
              >
                {current_patient?.status === 'CALLED' ? 'Active Call' : 'In Consultation'}
              </span>
            </div>

            <div className="flex-1 min-[900px]:min-h-0 flex flex-col items-center justify-center text-center" style={{ padding: `${u(6)} 0` }}>
              {current_patient ? (
                <>
                  <div className="font-extrabold" style={{ fontSize: u(104), lineHeight: 1, letterSpacing: '-0.02em' }}>
                    {current_patient.token}
                  </div>
                  <div className="font-semibold max-w-full truncate" style={{ fontSize: u(30), marginTop: u(16) }}>
                    {current_patient.patient_name}
                  </div>
                  <div className="font-medium uppercase" style={{ fontSize: u(12.5), color: C.muted, letterSpacing: '0.14em', marginTop: u(10) }}>
                    {current_patient.is_walk_in ? 'Walk-in' : `Appt ${current_patient.appointment_time}`} •{' '}
                    {current_patient.status === 'CALLED' ? 'Token called' : 'Consultation in progress'}
                  </div>
                </>
              ) : (
                <>
                  <div className="font-extrabold" style={{ fontSize: u(104), lineHeight: 1, color: '#b7c2d3' }}>--</div>
                  <div className="font-semibold" style={{ fontSize: u(26), marginTop: u(16), color: C.muted }}>
                    Next Patient Calling Shortly
                  </div>
                </>
              )}
            </div>

            <div style={{ background: C.paleBlue, borderRadius: u(7), padding: u(20) }}>
              <div className="flex items-start justify-between">
                <span className="font-bold uppercase" style={{ fontSize: u(10.5), color: C.tealDeep, letterSpacing: '0.14em' }}>
                  Please proceed to
                </span>
                <ArrowRight style={{ width: u(17), height: u(17), color: C.muted }} />
              </div>
              <div className="flex items-center justify-between flex-wrap" style={{ marginTop: u(8), gap: u(8) }}>
                <span className="font-extrabold uppercase leading-none" style={{ fontSize: u(34), color: C.tealDeep }}>{doctor.room}</span>
                <span className="font-semibold" style={{ fontSize: u(17) }}>{doctor.name}</span>
              </div>
              <div className="font-medium" style={{ fontSize: u(12), color: C.muted, marginTop: u(10) }}>
                Outpatient Department • Floor 1
              </div>
            </div>
          </section>

          {/* 5. QUEUE STATUS */}
          <section className="shrink-0" style={{ background: C.paleBlue, borderRadius: u(11), padding: `${u(20)} ${u(24)}` }}>
            <div className="flex items-center justify-between">
              <span className="font-extrabold uppercase" style={{ fontSize: u(10.5), color: C.muted, letterSpacing: '0.14em' }}>Queue Status</span>
              <span className="flex items-center font-semibold" style={{ fontSize: u(11.5), color: C.muted, gap: u(6) }}>
                <span className="rounded-full" style={{ width: u(7), height: u(7), background: C.tealDeep }} />
                Queue updating live
              </span>
            </div>
            <div className="flex" style={{ gap: u(12), marginTop: u(10) }}>
              {[
                { v: stats.waiting, l: 'Patients Waiting' },
                { v: current_patient ? 1 : 0, l: 'Currently Serving' },
                { v: visible.length, l: 'Patients Shown' },
              ].map((x) => (
                <div key={x.l} className="flex-1 bg-white text-center" style={{ borderRadius: u(5), padding: `${u(10)} ${u(6)}` }}>
                  <div className="font-extrabold leading-none" style={{ fontSize: u(42), color: C.tealDeep }}>{pad2(x.v)}</div>
                  <div className="font-semibold uppercase" style={{ fontSize: u(10.5), color: C.muted, letterSpacing: '0.06em', marginTop: u(7), lineHeight: 1.25 }}>
                    {x.l}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* 4B. NEXT IN LINE */}
        <section
          className="flex flex-col min-[900px]:min-h-0 bg-white"
          style={{ borderRadius: u(11), padding: `${u(28)} ${u(32)} ${u(24)}`, boxShadow: '0 2px 8px rgba(15,27,45,0.06)' }}
        >
          <div className="flex items-center justify-between shrink-0 flex-wrap" style={{ gap: u(10) }}>
            <div className="flex items-center font-extrabold uppercase" style={{ fontSize: u(21), gap: u(10) }}>
              <ListOrdered style={{ width: u(23), height: u(23), color: C.tealDeep }} />
              Next in Line
            </div>
            <div className="flex items-center" style={{ gap: u(8) }}>
              {[`${next_patients.length} in queue`, `Page ${safePage + 1} of ${totalPages}`].map((t) => (
                <span
                  key={t}
                  className="font-extrabold uppercase rounded-full"
                  style={{ fontSize: u(10.5), background: '#d9e6f7', color: C.muted, padding: `${u(6)} ${u(12)}`, letterSpacing: '0.08em' }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="flex-1 min-[900px]:min-h-0 flex flex-col" style={{ marginTop: u(18), gap: u(3) }}>
            {visible.length > 0 ? (
              visible.map((p, i) => {
                const g = pageStart + i;
                const isNext = g === 0;
                const pill = isNext ? 'Next' : p.is_walk_in ? 'Walk-in' : 'Waiting';
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between min-[900px]:min-h-0"
                    style={{
                      flex: '1 1 auto',
                      minHeight: u(40),
                      maxHeight: u(64),
                      padding: `0 ${u(14)}`,
                      borderRadius: u(5),
                      background: isNext ? C.rowNext : C.rowBg,
                      border: `1px solid ${C.border}`,
                      gap: u(12),
                    }}
                  >
                    <div className="flex items-center min-w-0" style={{ gap: u(14) }}>
                      <div
                        className="bg-white flex items-center justify-center font-extrabold shrink-0"
                        style={{ width: u(64), height: u(36), fontSize: u(22), borderRadius: u(5) }}
                      >
                        {p.token}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center" style={{ gap: u(8) }}>
                          <span
                            className="font-extrabold uppercase shrink-0"
                            style={{
                              fontSize: u(9.5),
                              padding: `${u(3)} ${u(7)}`,
                              borderRadius: u(3),
                              letterSpacing: '0.08em',
                              background: isNext ? C.teal : '#d6def0',
                              color: isNext ? '#fff' : C.muted,
                            }}
                          >
                            {pill}
                          </span>
                          <span className="font-semibold truncate" style={{ fontSize: u(18), lineHeight: 1.2 }}>{p.patient_name}</span>
                        </div>
                        <div className="font-medium truncate" style={{ fontSize: u(12), lineHeight: 1.2, color: C.muted, marginTop: u(3) }}>
                          {serviceLine(p)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold whitespace-nowrap" style={{ fontSize: u(18), lineHeight: 1.2, color: isNext ? C.tealDeep : C.navy }}>
                        {estWait(g)}
                      </div>
                      <div className="font-medium" style={{ fontSize: u(10.5), lineHeight: 1.2, color: C.muted }}>Est. Call</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex-1 flex items-center justify-center text-center font-semibold" style={{ fontSize: u(19), color: C.muted }}>
                No patients are currently waiting.
              </div>
            )}
          </div>

          {/* page progress */}
          <div className="shrink-0 rounded-full" style={{ marginTop: u(16), height: u(4), background: '#e1e8f3' }}>
            <div
              className="rounded-full h-full"
              style={{ width: `${((safePage + 1) / totalPages) * 100}%`, background: C.tealDeep, transition: 'width 0.6s ease' }}
            />
          </div>
        </section>
      </main>

      {/* 6 + 7. QR / MOBILE TRACKING  +  HELP DESK */}
      <div
        className="shrink-0 grid grid-cols-1 min-[900px]:grid-cols-[1fr_auto] items-stretch"
        style={{ margin: `${u(24)} ${u(48)} 0`, gap: u(32) }}
      >
        <section className="flex items-center" style={{ gap: u(24) }}>
          <div className="flex flex-col items-center shrink-0" style={{ background: C.paleBlue, borderRadius: u(7), padding: `${u(14)} ${u(22)}` }}>
            <div className="bg-white" style={{ width: u(96), height: u(96), padding: u(4) }}>
              {qr && (
                <svg viewBox={`-1 -1 ${qr.length + 2} ${qr.length + 2}`} width="100%" height="100%" shapeRendering="crispEdges">
                  <rect x="-1" y="-1" width={qr.length + 2} height={qr.length + 2} fill="#fff" />
                  {qr.map((row, y) =>
                    row.map((dark, x) => (dark ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={C.navy} /> : null))
                  )}
                </svg>
              )}
            </div>
            <div className="font-bold uppercase" style={{ fontSize: u(10.5), color: C.muted, letterSpacing: '0.08em', marginTop: u(12) }}>
              Scan on phone
            </div>
          </div>

          <div className="min-w-0">
            <div className="font-extrabold uppercase" style={{ fontSize: u(11.5), color: C.tealDeep, letterSpacing: '0.1em' }}>
              Comfort &amp; Free Movement
            </div>
            <div className="font-bold" style={{ fontSize: u(19), marginTop: u(6) }}>Track Your Live Token Position via Mobile</div>
            <p className="font-medium" style={{ fontSize: u(13.5), lineHeight: 1.45, color: '#3a4a60', marginTop: u(8), maxWidth: u(520) }}>
              Scan the QR code or visit <span style={{ color: C.tealDeep }}>{window.location.host}/track</span> on your mobile
              browser and enter your token. You are free to step over to the cafeteria or courtyard; your position updates
              live on your phone.
            </p>
            <div className="flex items-center flex-wrap" style={{ gap: `${u(6)} ${u(20)}`, marginTop: u(10), fontSize: u(12.5) }}>
              <span className="flex items-center font-medium" style={{ gap: u(6) }}>
                <Wifi style={{ width: u(16), height: u(16), color: C.tealDeep }} />
                Free Hospital Wi-Fi: <b>CityCare_Guest</b>
              </span>
              <span className="flex items-center font-medium" style={{ gap: u(6) }}>
                <Coffee style={{ width: u(16), height: u(16), color: C.tealDeep }} />
                Cafeteria: Ground Floor Atrium
              </span>
            </div>
          </div>
        </section>

        <section className="flex flex-col justify-between min-[900px]:w-[calc(var(--u)*380)]" style={{ background: C.paleBlue, borderRadius: u(9), padding: u(20), gap: u(10) }}>
          <div>
            <div className="flex items-center" style={{ gap: u(12) }}>
              <div className="bg-white flex items-center justify-center shrink-0" style={{ width: u(36), height: u(36), borderRadius: u(7) }}>
                <Headset style={{ width: u(19), height: u(19), color: C.tealDeep }} />
              </div>
              <div>
                <div className="font-bold" style={{ fontSize: u(14) }}>Need Assistance?</div>
                <div className="font-medium" style={{ fontSize: u(12), color: C.muted }}>Ward Help Desk • Reception B</div>
              </div>
            </div>
            <p className="font-medium" style={{ fontSize: u(12), lineHeight: 1.45, color: C.muted, marginTop: u(12) }}>
              If you feel acute pain or require wheelchair assistance, alert staff immediately at Counter 1 or press the
              emergency call button.
            </p>
          </div>
          <div className="flex items-center justify-between" style={{ paddingTop: u(10), borderTop: `1px solid ${C.border}` }}>
            <span className="font-bold uppercase" style={{ fontSize: u(10.5), color: C.muted, letterSpacing: '0.06em' }}>Emergency Extension</span>
            <span className="font-extrabold" style={{ fontSize: u(14), color: C.tealDeep }}>Dial #202</span>
          </div>
        </section>
      </div>

      {/* 8. BOTTOM STATUS BAR */}
      <div
        className="shrink-0 flex items-center justify-between flex-wrap font-bold uppercase"
        style={{ margin: `${u(18)} ${u(48)} ${u(16)}`, fontSize: u(12.5), color: C.tealDeep, letterSpacing: '0.1em', gap: `${u(6)} ${u(20)}` }}
      >
        <span className="flex items-center" style={{ gap: u(8) }}>
          <Users style={{ width: u(16), height: u(16) }} />
          <span style={{ color: C.navy }}>{stats.waiting} Patients waiting in wing</span>
        </span>
        <span className="flex items-center" style={{ gap: u(8), color: C.muted }}>
          <Repeat style={{ width: u(14), height: u(14) }} />
          {totalPages > 1
            ? `Page ${safePage + 1} of ${totalPages} • Rotating automatically`
            : 'Live queue • Updating automatically'}
        </span>
        <span className="flex items-center" style={{ gap: u(8) }}>
          <Volume2 style={{ width: u(16), height: u(16) }} />
          Please wait for your token to be announced
        </span>
      </div>

      {/* 9. FOOTER */}
      <footer
        className="shrink-0 flex items-center justify-between flex-wrap"
        style={{ minHeight: u(44), padding: `${u(10)} ${u(20)}`, background: '#f0f4fb', fontSize: u(11.5), color: C.muted, gap: u(8) }}
      >
        <span>City Care Hospital Operational Management System • Clinical Flow v4.8</span>
        <span>FIFO Protocol • Clinical Safety Governance Standard</span>
      </footer>
    </div>
  );
};
