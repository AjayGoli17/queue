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

  const progressSteps = ['Checked in', 'Waiting', 'Called'];

  return (
    <div className="pt-shell">
      <div className="pt-page">
        {/* 1. APP HEADER */}
        <header className="pt-header">
          <div className="pt-header-brand">
            <div className="pt-logo-icon">
              <Cross size={18} strokeWidth={2.5} />
            </div>
            <div>
              <div className="pt-hospital-name">{d?.hospital_name || 'City Care Hospital'}</div>
              <div className="pt-hospital-sub">Patient Live Queue</div>
            </div>
          </div>
          <div className="pt-header-actions">
            <div className="pt-live-badge">
              <span className="pt-live-dot animate-pulse" />
              LIVE
            </div>
            <div className="pt-avatar">
              <UserRound size={16} />
            </div>
          </div>
        </header>

        {/* TOKEN LOOKUP — only when there is no result to show */}
        {!d && (
          <div className="pt-lookup-card">
            <div className="pt-lookup-label">Enter your token</div>
            <div className="pt-lookup-row">
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="e.g. A07"
                maxLength={6}
                className="pt-lookup-input"
              />
              <button
                onClick={() => handleSearch()}
                disabled={loading}
                className="pt-lookup-btn"
              >
                {loading ? <RotateCw size={14} className="animate-spin" /> : <Search size={14} />}
                CHECK
              </button>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="pt-error-banner">
            {errorMessage}
          </div>
        )}

        {d && (
          <>
            {/* 2. DEPARTMENT & UPDATE STRIP */}
            <div className="pt-dept-row">
              <div className="pt-dept-left">
                <Briefcase size={14} className="pt-dept-icon" />
                <span className="pt-dept-title">General Outpatient Triage</span>
              </div>
              <span className="pt-dept-time">{timeAgo(lastUpdated, now)}</span>
            </div>

            {/* 3. HERO TOKEN SECTION (DOMINANT VISUAL ELEMENT) */}
            <div className="pt-hero-section">
              <div className="pt-hero-label">YOUR TOKEN</div>
              <div className="pt-hero-token">{d.token}</div>
              <div className={`pt-status-pill pt-status-${switcherState || 'waiting'}`}>
                <span className="pt-status-dot" />
                <span>{statusPill}</span>
              </div>
              <div className="pt-hero-sub">
                {status === 'CALLED' ? (
                  <span className="pt-hero-direction">
                    Please proceed to <strong>{d.doctor_name}</strong> · <strong>{d.room}</strong>
                  </span>
                ) : (
                  <span className="pt-hero-wait">
                    <Clock size={14} />
                    <span>{waitLine}</span>
                  </span>
                )}
              </div>
            </div>

            {/* 4. LIVE QUEUE POSITION (AIRY 3-COLUMN STRUCTURE) */}
            <div className="pt-queue-pos-card">
              <div className="pt-card-header">
                <span className="pt-card-title">LIVE QUEUE POSITION</span>
                <span className="pt-card-sub">{d.room} Corridor</span>
              </div>
              <div className="pt-pos-grid">
                <div className="pt-pos-col">
                  <span className="pt-pos-label">SERVING</span>
                  <span className="pt-pos-token">{d.current_serving_token || '—'}</span>
                  <span className="pt-pos-sub">{d.current_serving_token ? servingRoom : 'None active'}</span>
                </div>
                <div className="pt-pos-arrow"><ArrowRight size={14} /></div>
                <div className="pt-pos-col">
                  <span className="pt-pos-label">NEXT</span>
                  <span className="pt-pos-token">{nextToken || '—'}</span>
                  <span className="pt-pos-sub">{nextToken ? servingRoom : '—'}</span>
                </div>
                <div className="pt-pos-arrow"><ArrowRight size={14} /></div>
                <div className="pt-pos-col pt-pos-you">
                  <span className="pt-pos-label">YOU</span>
                  <span className="pt-pos-token">{d.token}</span>
                  <span className="pt-pos-sub">{youSub}</span>
                </div>
              </div>
              <div className="pt-pos-msg">
                {d.message}
              </div>
            </div>

            {/* 5. QUEUE PROGRESS STRIP */}
            <div className="pt-progress-strip">
              {progressSteps.map((label, i) => {
                const done = i < progressIndex;
                const current = i === progressIndex;
                return (
                  <React.Fragment key={label}>
                    <div className={`pt-step-item ${done ? 'is-done' : ''} ${current ? 'is-current' : ''}`}>
                      <div className="pt-step-icon">
                        {done ? <Check size={11} strokeWidth={3} /> : current ? <span className="pt-step-dot" /> : null}
                      </div>
                      <span className="pt-step-label">{label}</span>
                    </div>
                    {i < progressSteps.length - 1 && (
                      <div className={`pt-step-line ${i < progressIndex ? 'is-done' : ''}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* 6. APPOINTMENT ROW */}
            <div className="pt-appointment-row">
              <div className="pt-appt-icon">
                <CalendarDays size={18} />
              </div>
              <div className="pt-appt-info">
                <div className="pt-appt-title">
                  {d.appointment_time || (d.is_walk_in ? 'Walk-in' : '—')} · {d.doctor_name}
                </div>
                <div className="pt-appt-sub">
                  {d.is_walk_in ? 'Walk-in visit' : 'Scheduled appointment'} · {d.room}
                </div>
              </div>
              <ChevronRight size={16} className="pt-chevron" />
            </div>

            {/* 7. NOTIFICATION & RECEPTION ACTIONS */}
            <div className="pt-actions-row">
              <div className="pt-action-btn">
                <div className="pt-action-icon">
                  <MessageSquare size={14} />
                </div>
                <div className="pt-action-text">
                  <div className="pt-action-title">SMS updates</div>
                  <div className="pt-action-sub">Registered number</div>
                </div>
              </div>
              <div className="pt-action-btn">
                <div className="pt-action-icon">
                  <Headset size={14} />
                </div>
                <div className="pt-action-text">
                  <div className="pt-action-title">Reception</div>
                  <div className="pt-action-sub">Help desk</div>
                </div>
                <ArrowRight size={13} className="pt-action-arrow" />
              </div>
            </div>

            {/* 8. CLINICAL STATE SWITCHER (SUBORDINATE & COMPACT) */}
            <div className="pt-switcher-panel">
              <div className="pt-switcher-header">
                <span className="pt-switcher-title">CLINICAL STATE SWITCHER</span>
                <span className="pt-switcher-badge">Patient Mode</span>
              </div>
              <div className="pt-switcher-grid">
                {SWITCHER_ROWS.map((row, r) => (
                  <div key={r} className="pt-switcher-row">
                    {row.map((s) => {
                      const active = switcherState === s.key;
                      return (
                        <div
                          key={s.key}
                          aria-current={active ? 'true' : undefined}
                          className={`pt-switcher-btn ${active ? 'is-active' : ''}`}
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
