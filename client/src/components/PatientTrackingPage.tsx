import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { PatientTrackingInfo, QueueOverview } from '../types';
import { fetchPatientTracking, fetchQueueOverview } from '../services/api';
import { wsClient } from '../services/websocket';
import {
  Search,
  RotateCw,
  Cross,
  UserRound,
  Briefcase,
  Clock,
  CalendarDays,
  ChevronRight,
  MessageSquare,
  Headset,
  Check,
  ArrowRight,
} from 'lucide-react';

interface PatientTrackingPageProps {
  initialToken?: string;
}

/** Design width of the mobile reference. The UI stays this wide on desktop and is centred. */
const PHONE_WIDTH = 420;

const C = {
  navy: '#0f1b2d',
  teal: '#1f6f63',
  tealSoft: '#e3f3f0',
  muted: '#5b6b82',
  paleBlue: '#e8effb',
  panelBlue: '#eef3fb',
  border: '#e6ebf4',
  page: '#f4f6fb',
};

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 'var(--pt-r)',
  border: `1px solid ${C.border}`,
  boxShadow: '0 1px 2px rgba(15,27,45,0.04), 0 4px 14px rgba(15,27,45,0.04)',
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: C.muted,
};

type SwitcherState = 'waiting' | 'next' | 'called' | 'consult' | 'delayed' | 'completed';

const SWITCHER_ROWS: { key: SwitcherState; label: string }[][] = [
  [
    { key: 'waiting', label: 'Waiting' },
    { key: 'next', label: "You're Next" },
    { key: 'called', label: 'Called' },
  ],
  [
    { key: 'consult', label: 'In Consult' },
    { key: 'delayed', label: 'Delayed' },
    { key: 'completed', label: 'Completed' },
  ],
];

const timeAgo = (from: number | null, now: number): string => {
  if (!from) return '';
  const mins = Math.floor((now - from) / 60000);
  if (mins < 1) return 'Updated just now';
  if (mins < 60) return `Updated ${mins}m ago`;
  return `Updated ${Math.floor(mins / 60)}h ago`;
};

export const PatientTrackingPage: React.FC<PatientTrackingPageProps> = ({ initialToken = 'A07' }) => {
  const { token: urlToken } = useParams<{ token?: string }>();
  const navigate = useNavigate();

  const currentTargetToken = (urlToken || initialToken).trim().toUpperCase();

  const [tokenInput, setTokenInput] = useState<string>(currentTargetToken);
  const [activeToken, setActiveToken] = useState<string>(currentTargetToken);
  const [trackingData, setTrackingData] = useState<PatientTrackingInfo | null>(null);
  const [overview, setOverview] = useState<QueueOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const activeTokenRef = useRef(activeToken);

  activeTokenRef.current = activeToken;

  const loadOverview = () => {
    fetchQueueOverview('dr-kumar')
      .then(setOverview)
      .catch(() => {});
  };

  const handleSearch = async (tokenToFetch?: string) => {
    const query = (tokenToFetch || tokenInput).trim().toUpperCase();
    if (!query) {
      setErrorMessage('Please enter a token (e.g. A07)');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchPatientTracking(query);
      setTrackingData(data);
      setLastUpdated(Date.now());
      setActiveToken(query);
      setTokenInput(query);
      loadOverview();
      if (urlToken !== query) {
        navigate(`/track/${query}`, { replace: true });
      }
    } catch (err: any) {
      setErrorMessage(err.message || `Token "${query}" not found. Please check your token number.`);
      setTrackingData(null);
      setActiveToken(query);
      setTokenInput(query);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentTargetToken) {
      handleSearch(currentTargetToken);
    }
  }, [urlToken]);

  // Real-time WebSocket subscription: re-fetches tracking (and queue) when the queue updates
  useEffect(() => {
    const unsubscribe = wsClient.subscribe(() => {
      if (activeTokenRef.current) {
        fetchPatientTracking(activeTokenRef.current)
          .then((data) => {
            setTrackingData(data);
            setLastUpdated(Date.now());
          })
          .catch(() => {});
        loadOverview();
      }
    });
    return unsubscribe;
  }, []);

  // Tick so "Updated Xm ago" stays current
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const d = trackingData;
  const status = d?.status;

  // Token of the patient directly ahead of this one (the "NEXT" slot); if nobody is ahead, "you" are next.
  const nextToken = useMemo(() => {
    if (!d) return null;
    if (d.status !== 'WAITING') return null;
    if (d.patients_ahead === 0) return d.token;
    const ahead = overview?.next_patients?.[d.patients_ahead - 1];
    return ahead?.token ?? null;
  }, [d, overview]);

  const switcherState: SwitcherState | null = useMemo(() => {
    if (!d) return null;
    if (d.status === 'COMPLETED') return 'completed';
    if (d.status === 'IN_CONSULTATION') return 'consult';
    if (d.status === 'CALLED') return 'called';
    if (d.is_doctor_delayed) return 'delayed';
    if (d.status === 'WAITING' && d.patients_ahead === 0) return 'next';
    return 'waiting';
  }, [d]);

  // Queue progress: Checked in -> Waiting -> Called
  const progressIndex =
    status === 'BOOKED' || !status
      ? -1
      : status === 'CHECKED_IN'
      ? 0
      : status === 'WAITING'
      ? 1
      : status === 'CALLED' || status === 'IN_CONSULTATION' || status === 'COMPLETED'
      ? 2
      : -1;

  const statusPill = (() => {
    switch (status) {
      case 'BOOKED': return 'Booked — check in at reception';
      case 'CHECKED_IN': return 'Checked in';
      case 'WAITING': return d && d.patients_ahead === 0 ? "You're next" : 'Waiting in queue';
      case 'CALLED': return 'Called — please proceed';
      case 'IN_CONSULTATION': return 'In consultation';
      case 'COMPLETED': return 'Consultation completed';
      case 'SKIPPED': return 'Skipped — see reception';
      case 'NO_SHOW': return 'Marked no-show';
      default: return '';
    }
  })();

  const waitLine = (() => {
    if (!d) return '';
    if (d.status === 'WAITING') {
      const ahead = `${d.patients_ahead} patient${d.patients_ahead === 1 ? '' : 's'} ahead`;
      return d.patients_ahead === 0
        ? "You're next in line"
        : `${ahead} • ${d.estimated_wait_text || '—'} estimated wait`;
    }
    return d.estimated_wait_text ? d.estimated_wait_text : d.message;
  })();

  const servingRoom = d?.room ?? '';
  const youSub = d?.status === 'WAITING' ? (d.patients_ahead === 0 ? 'Ready' : 'Waiting') : (status === 'CALLED' ? 'Go in' : 'Ready');

  const posCell = (
    label: string,
    token: string | null,
    sub: string,
    emphasis = false,
  ) => (
    <div
      style={{
        flex: 1,
        textAlign: 'center',
        padding: 'var(--pt-cell-y) 4px',
        borderRadius: 'var(--pt-r-sm)',
        background: emphasis ? C.teal : 'transparent',
        color: emphasis ? '#fff' : C.navy,
      }}
    >
      <div style={{ ...labelStyle, fontSize: 10, color: emphasis ? 'rgba(255,255,255,0.8)' : C.muted }}>{label}</div>
      <div style={{ fontSize: 'var(--pt-pos)', fontWeight: 800, fontFamily: 'inherit', lineHeight: 1.15, marginTop: 'var(--pt-tiny)' }}>
        {token || '—'}
      </div>
      <div style={{ fontSize: 12, fontWeight: 500, marginTop: 2, color: emphasis ? 'rgba(255,255,255,0.85)' : C.muted }}>
        {sub}
      </div>
    </div>
  );

  const arrow = (
    <div style={{ display: 'flex', alignItems: 'center', color: '#b4c0d4' }}>
      <ArrowRight size={16} />
    </div>
  );

  const progressSteps = ['Checked in', 'Waiting', 'Called'];

  return (
    // Outer wrapper: light background, content stays phone-width and centred on any viewport
    <div className="pt-page" style={{ width: '100%', background: C.page, minHeight: '100%' }}>
      <div
        style={{
          width: '100%',
          maxWidth: PHONE_WIDTH,
          margin: '0 auto',
          padding: '0 var(--pt-cx)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--pt-g)',
          color: C.navy,
          boxSizing: 'border-box',
          overflowX: 'hidden',
        }}
      >
        {/* 1. HOSPITAL HEADER */}
        <div style={{ ...cardStyle, padding: 'var(--pt-cy) var(--pt-cx)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 'var(--pt-ico)', height: 'var(--pt-ico)', borderRadius: 'var(--pt-r-sm)', background: C.paleBlue,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.teal, flexShrink: 0,
            }}
          >
            <Cross size={20} strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 'var(--pt-h1)', fontWeight: 700, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {d?.hospital_name || 'City Care Hospital'}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Patient Live Queue</div>
          </div>
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 6, background: C.tealSoft, color: C.teal,
              fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', padding: '5px 10px', borderRadius: 999,
            }}
          >
            <span className="animate-pulse" style={{ width: 7, height: 7, borderRadius: 999, background: C.teal }} />
            LIVE
          </div>
          <div
            style={{
              width: 'var(--pt-avatar)', height: 'var(--pt-avatar)', borderRadius: 999, background: C.paleBlue, color: C.muted,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <UserRound size={18} />
          </div>
        </div>

        {/* TOKEN LOOKUP — only when there is no result to show (preserves existing token search) */}
        {!d && (
          <div style={{ ...cardStyle, padding: 'var(--pt-cy) var(--pt-cx)' }}>
            <div style={{ ...labelStyle, marginBottom: 'var(--pt-sm)' }}>Enter your token</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="e.g. A07"
                maxLength={6}
                style={{
                  flex: 1, minWidth: 0, padding: '10px 14px', borderRadius: 'var(--pt-r-sm)', border: `1px solid ${C.border}`,
                  background: C.panelBlue, fontSize: 18, fontWeight: 700, textAlign: 'center', textTransform: 'uppercase', color: C.navy,
                }}
              />
              <button
                onClick={() => handleSearch()}
                disabled={loading}
                style={{
                  padding: '0 16px', minHeight: 44, borderRadius: 'var(--pt-r-sm)', background: C.teal, color: '#fff', fontWeight: 700, fontSize: 12,
                  display: 'flex', alignItems: 'center', gap: 6, opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? <RotateCw size={16} className="animate-spin" /> : <Search size={16} />}
                CHECK
              </button>
            </div>
          </div>
        )}

        {errorMessage && (
          <div style={{ ...cardStyle, padding: 'var(--pt-cy) var(--pt-cx)', background: '#fff1f2', borderColor: '#fecdd3', color: '#9f1239', fontSize: 13, fontWeight: 500, textAlign: 'center' }}>
            {errorMessage}
          </div>
        )}

        {d && (
          <>
            {/* 2. DEPARTMENT / UPDATE ROW */}
            <div style={{ ...cardStyle, padding: 'var(--pt-cy) var(--pt-cx)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <Briefcase size={16} color={C.teal} style={{ flexShrink: 0 }} />
                <span style={{ ...labelStyle, color: C.navy, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  General Outpatient Triage
                </span>
              </div>
              <span style={{ fontSize: 12, color: C.muted, whiteSpace: 'nowrap' }}>{timeAgo(lastUpdated, now)}</span>
            </div>

            {/* 3. YOUR TOKEN CARD */}
            <div style={{ ...cardStyle, padding: 'var(--pt-tc-t) var(--pt-cx) var(--pt-tc-b)', textAlign: 'center' }}>
              <div style={labelStyle}>Your Token</div>
              <div style={{ fontSize: 'var(--pt-tok)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.02em', marginTop: 'var(--pt-tiny)' }}>
                {d.token}
              </div>
              <div
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8, background: C.tealSoft, color: C.teal,
                  fontSize: 'var(--pt-pill)', fontWeight: 700, padding: 'var(--pt-pill-y) 16px', borderRadius: 999, marginTop: 'var(--pt-sm)',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 999, background: C.teal }} />
                {statusPill}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 'var(--pt-md)', fontSize: 13, color: C.muted }}>
                <Clock size={15} />
                <span>{waitLine}</span>
              </div>
            </div>

            {/* 4. LIVE QUEUE POSITION */}
            <div style={{ ...cardStyle, padding: 'var(--pt-cy) var(--pt-cx)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--pt-sm)' }}>
                <span style={labelStyle}>Live Queue Position</span>
                <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>{d.room} Corridor</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'stretch', gap: 2 }}>
                {posCell('Serving', d.current_serving_token, d.current_serving_token ? servingRoom : 'None active')}
                {arrow}
                {posCell('Next', nextToken, nextToken ? servingRoom : '—')}
                {arrow}
                {posCell('You', d.token, youSub, true)}
              </div>
              <div
                style={{
                  marginTop: 'var(--pt-md)', background: C.panelBlue, borderRadius: 'var(--pt-r-sm)', padding: 'var(--pt-msg-y) 14px',
                  fontSize: 13, color: C.navy, fontWeight: 500, lineHeight: 1.4, textAlign: 'center',
                }}
              >
                {d.message}
              </div>
            </div>

            {/* 5. QUEUE PROGRESS ROW */}
            <div style={{ ...cardStyle, padding: 'var(--pt-cy) var(--pt-cx)', display: 'flex', alignItems: 'center' }}>
              {progressSteps.map((label, i) => {
                const done = i < progressIndex;
                const current = i === progressIndex;
                return (
                  <React.Fragment key={label}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div
                        style={{
                          width: 22, height: 22, borderRadius: 999, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: done || current ? C.teal : '#fff',
                          border: done || current ? `2px solid ${C.teal}` : '2px solid #cfd8e6',
                          color: '#fff',
                          boxShadow: current ? `0 0 0 4px ${C.tealSoft}` : 'none',
                        }}
                      >
                        {done && <Check size={13} strokeWidth={3} />}
                        {current && <span style={{ width: 6, height: 6, borderRadius: 999, background: '#fff' }} />}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: current ? 700 : 500, color: current ? C.navy : C.muted, whiteSpace: 'nowrap' }}>
                        {label}
                      </span>
                    </div>
                    {i < progressSteps.length - 1 && (
                      <div style={{ flex: 1, height: 2, margin: '0 8px', background: i < progressIndex ? C.teal : '#dbe3ef', borderRadius: 2 }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* 6. APPOINTMENT CARD */}
            <div style={{ ...cardStyle, padding: 'var(--pt-cy) var(--pt-cx)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 'var(--pt-ico)', height: 'var(--pt-ico)', borderRadius: 'var(--pt-r-sm)', background: C.paleBlue, color: C.teal,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                <CalendarDays size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'var(--pt-h2)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {d.appointment_time || (d.is_walk_in ? 'Walk-in' : '—')} • {d.doctor_name}
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                  {d.is_walk_in ? 'Walk-in visit' : 'Scheduled appointment'} • {d.room}
                </div>
              </div>
              <ChevronRight size={18} color="#9aa7bd" />
            </div>

            {/* 7. NOTIFICATION / RECEPTION ROW */}
            <div style={{ display: 'flex', gap: 'var(--pt-g)' }}>
              <div style={{ ...cardStyle, flex: 1, padding: 'var(--pt-cy) var(--pt-nx)', display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{ width: 'var(--pt-ico-sm)', height: 'var(--pt-ico-sm)', borderRadius: 10, background: C.paleBlue, color: C.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MessageSquare size={17} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>SMS updates</div>
                  <div style={{ fontSize: 11, color: C.muted }}>Registered number</div>
                </div>
              </div>
              <div style={{ ...cardStyle, flex: 1, padding: 'var(--pt-cy) var(--pt-nx)', display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{ width: 'var(--pt-ico-sm)', height: 'var(--pt-ico-sm)', borderRadius: 10, background: C.paleBlue, color: C.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Headset size={17} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>Reception</div>
                <ArrowRight size={15} color="#9aa7bd" />
              </div>
            </div>

            {/* 8. CLINICAL STATE SWITCHER (read-only; reflects the patient's real state) */}
            <div style={{ background: C.panelBlue, borderRadius: 'var(--pt-r)', padding: 'var(--pt-cy) var(--pt-cx)', border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--pt-sm)' }}>
                <span style={labelStyle}>Clinical State Switcher</span>
                <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>Patient Mode</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--pt-gs)' }}>
                {SWITCHER_ROWS.map((row, r) => (
                  <div key={r} style={{ display: 'flex', gap: 'var(--pt-gs)' }}>
                    {row.map((s) => {
                      const active = switcherState === s.key;
                      return (
                        <div
                          key={s.key}
                          aria-current={active ? 'true' : undefined}
                          style={{
                            flex: 1, textAlign: 'center', padding: 'var(--pt-btn-y) 4px', borderRadius: 'var(--pt-r-sm)', fontSize: 12.5, fontWeight: 600,
                            background: active ? C.teal : '#fff', color: active ? '#fff' : C.navy,
                            border: `1px solid ${active ? C.teal : C.border}`, whiteSpace: 'nowrap',
                          }}
                        >
                          {s.label}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
