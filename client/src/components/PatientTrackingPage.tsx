import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { PatientTrackingInfo, QueueOverview } from '../types';
import { fetchPatientTracking, fetchQueueOverview } from '../services/api';
import { wsClient } from '../services/websocket';
import { Clock, Search } from 'lucide-react';

interface PatientTrackingPageProps {
  initialToken?: string;
}

const DoctorAvatarIcon = ({ className = 'w-11 h-11' }: { className?: string }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Head */}
    <circle cx="24" cy="13" r="7" />
    {/* Shoulders */}
    <path d="M9 39c0-7.732 6.716-14 15-14s15 6.268 15 14" />
    {/* Stethoscope */}
    <path d="M19 25.5v3.5a5 5 0 0 0 10 0v-3.5" />
    <path d="M29 32v2.5a3 3 0 0 0 3 3h1.5" />
    <circle cx="34.5" cy="37.5" r="2" fill="currentColor" />
  </svg>
);

export const PatientTrackingPage: React.FC<PatientTrackingPageProps> = ({ initialToken = 'A07' }) => {
  const { token: urlToken } = useParams<{ token?: string }>();
  const navigate = useNavigate();

  const currentTargetToken = (urlToken || initialToken).trim().toUpperCase();

  const [tokenInput, setTokenInput] = useState<string>(currentTargetToken);
  const [trackingData, setTrackingData] = useState<PatientTrackingInfo | null>(null);
  const [overview, setOverview] = useState<QueueOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const activeTokenRef = useRef(currentTargetToken);

  useEffect(() => {
    activeTokenRef.current = currentTargetToken;
  }, [currentTargetToken]);

  const handleSearch = async (tokenToFetch?: string) => {
    const query = (tokenToFetch || tokenInput || 'A07').trim().toUpperCase();
    if (!query) {
      setErrorMessage('Please enter a token (e.g. A07)');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchPatientTracking(query);
      setTrackingData(data);
      setTokenInput(query);
      if (urlToken !== query) {
        navigate(`/track/${query}`, { replace: true });
      }
    } catch (err: any) {
      setErrorMessage(err.message || `Token "${query}" not found.`);
      setTrackingData(null);
      setTokenInput(query);
    } finally {
      setLoading(false);
    }
  };

  // Load Overview to help user pick valid tokens if token not found
  useEffect(() => {
    fetchQueueOverview('dr-kumar')
      .then(setOverview)
      .catch(() => {});
  }, []);

  // Fetch token on mount or URL change
  useEffect(() => {
    if (urlToken) {
      handleSearch(urlToken);
    } else if (overview && overview.all_patients.length > 0) {
      const defaultToken =
        overview.current_patient?.token ||
        overview.next_patients[0]?.token ||
        overview.all_patients[0]?.token ||
        'A07';
      handleSearch(defaultToken);
    } else {
      handleSearch(initialToken);
    }
  }, [urlToken]);

  // Real-time WebSocket subscription
  useEffect(() => {
    const unsubscribe = wsClient.subscribe(() => {
      if (activeTokenRef.current) {
        fetchPatientTracking(activeTokenRef.current)
          .then((data) => setTrackingData(data))
          .catch(() => {});
      }
      fetchQueueOverview('dr-kumar')
        .then(setOverview)
        .catch(() => {});
    });
    return unsubscribe;
  }, []);

  const d = trackingData;

  // Determine the status line and wait time display
  const getStatusDetails = () => {
    if (!d) return { statusText: "YOU'RE NEXT", waitText: '~ 5 min wait' };

    switch (d.status) {
      case 'CALLED':
        return {
          statusText: 'PLEASE PROCEED',
          waitText: d.room ? `Dr. Kumar is ready in ${d.room}` : 'Your doctor is ready for you',
        };
      case 'IN_CONSULTATION':
        return {
          statusText: 'IN CONSULTATION',
          waitText: d.room ? `In session · ${d.room}` : 'Currently with doctor',
        };
      case 'COMPLETED':
        return {
          statusText: 'VISIT COMPLETE',
          waitText: 'Thank you for visiting',
        };
      case 'SKIPPED':
        return {
          statusText: 'TOKEN SKIPPED',
          waitText: 'Please see the reception desk',
        };
      case 'NO_SHOW':
        return {
          statusText: 'MARKED NO-SHOW',
          waitText: 'Please see the reception desk',
        };
      case 'WAITING':
      case 'CHECKED_IN':
      case 'BOOKED':
      default: {
        const ahead = d.patients_ahead ?? 0;
        const isNext = ahead === 0;

        let rawMins = 5;
        if (d.estimated_wait_minutes) {
          rawMins = d.estimated_wait_minutes;
        } else {
          const avg = d.avg_consultation_time || 15;
          rawMins = isNext ? Math.max(5, Math.round(avg / 3)) : ahead * avg;
        }

        const waitFormatted = `~ ${rawMins} min wait`;

        if (isNext) {
          return {
            statusText: "YOU'RE NEXT",
            waitText: waitFormatted,
          };
        } else if (ahead === 1) {
          return {
            statusText: '1 PATIENT AHEAD',
            waitText: waitFormatted,
          };
        } else {
          return {
            statusText: `${ahead} PATIENTS AHEAD`,
            waitText: waitFormatted,
          };
        }
      }
    }
  };

  const { statusText, waitText } = getStatusDetails();

  return (
    <div className="min-h-screen h-[100dvh] w-full bg-[#F0F4F8] flex items-center justify-center p-0 md:p-6 select-none overflow-hidden font-sans antialiased text-[#102A43]">
      {/* 
        Container:
        - Mobile (< 768px): Full viewport width/height, 100dvh, padding, matching reference screenshot exactly
        - Desktop (>= 768px): Compact 360px mobile preview shell, height 640px-760px, rounded corners, shadow
      */}
      <div className="w-full h-full md:w-[360px] md:max-w-[360px] md:h-[min(750px,calc(100dvh-40px))] md:min-h-[630px] md:max-h-[760px] bg-[#FAFBFC] md:rounded-[32px] md:border md:border-[#E3E8ED] md:shadow-2xl md:shadow-slate-200/70 flex flex-col justify-between px-6 py-6 sm:px-7 sm:py-7 md:px-5.5 md:py-5 box-border overflow-hidden">
        
        {/* ==================================================
            1. TOP HEADER
            ================================================== */}
        <header className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 md:gap-2.5">
            {/* Teal rounded square with white medical cross */}
            <div className="w-[44px] h-[44px] md:w-[38px] md:h-[38px] rounded-[13px] md:rounded-[11px] bg-[#087F73] text-white flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 md:w-5 md:h-5">
                <path d="M9 4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V9h4.5a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H15v4.5a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V15H4.5a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1H9V4.5z" />
              </svg>
            </div>
            <div>
              <div className="text-[19px] sm:text-[20px] md:text-[18px] font-bold text-[#102A43] tracking-tight leading-tight">
                {d?.hospital_name || 'City Care Hospital'}
              </div>
              <div className="text-[14px] sm:text-[15px] md:text-[13px] font-medium text-[#627D98] leading-tight mt-0.5">
                Queue Tracking
              </div>
            </div>
          </div>

          {/* LIVE indicator pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 md:px-2.5 md:py-0.5 bg-[#E6F7F2] text-[#087F73] rounded-full text-[12px] md:text-[11px] font-bold tracking-wider uppercase">
            <span className="w-2 h-2 md:w-1.5 md:h-1.5 rounded-full bg-[#087F73]" />
            <span>LIVE</span>
          </div>
        </header>

        {/* ==================================================
            2. TOKEN AREA (Hero Focus)
            ================================================== */}
        {loading && !d ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <div className="w-8 h-8 md:w-6 md:h-6 border-3 border-[#087F73] border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-[14px] md:text-[13px] font-medium text-[#627D98]">Loading queue status...</span>
          </div>
        ) : !d ? (
          /* Token Search / Fallback State */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-2 py-6">
            <div className="text-[14px] md:text-[13px] font-bold uppercase tracking-[0.16em] text-[#627D98] mb-3">
              Enter Your Token
            </div>
            <div className="w-full max-w-[260px] md:max-w-[230px] space-y-3">
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="e.g. A07"
                className="w-full text-center text-2xl md:text-xl font-black tracking-wider py-2.5 px-3 bg-white border border-[#E3E8ED] rounded-xl focus:outline-none focus:border-[#087F73] uppercase text-[#102A43] placeholder:text-slate-300"
              />
              <button
                onClick={() => handleSearch()}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#087F73] hover:bg-[#066a60] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Search size={14} />
                <span>Track Token</span>
              </button>
              {errorMessage && (
                <p className="text-[12px] md:text-[11px] text-rose-600 font-medium mt-2 leading-tight">{errorMessage}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-4 sm:py-6 md:py-3 my-auto">
            {/* Small uppercase label */}
            <div className="text-[15px] sm:text-[16px] md:text-[13px] font-semibold tracking-[0.18em] uppercase text-[#627D98] mb-1">
              YOUR TOKEN
            </div>

            {/* Giant hero token */}
            <div className="text-[78px] sm:text-[84px] md:text-[62px] font-black text-[#102A43] tracking-[-0.03em] leading-none my-1 font-sans">
              {d.token}
            </div>

            {/* Soft mint-green pill with clock icon */}
            <div className="inline-flex items-center justify-center gap-2.5 md:gap-2 px-6 sm:px-7 py-3 sm:py-3.5 md:px-5 md:py-2.5 bg-[#E6F7F2] text-[#087F73] rounded-full mt-3 sm:mt-4 md:mt-2.5 mb-2.5 sm:mb-3 md:mb-2">
              <Clock className="w-[22px] h-[22px] md:w-[18px] md:h-[18px] text-[#087F73] shrink-0" strokeWidth={2.4} />
              <span className="text-[16px] sm:text-[17px] md:text-[15px] font-extrabold uppercase tracking-[0.06em] text-[#087F73]">
                {statusText}
              </span>
            </div>

            {/* Estimated wait time */}
            <div className="text-[20px] sm:text-[22px] md:text-[18px] font-medium text-[#627D98] mt-1">
              {waitText}
            </div>
          </div>
        )}

        {/* ==================================================
            3. LOWER SECTION: Divider, Now Serving, Doctor & Live Footer
            ================================================== */}
        {d && (
          <div className="shrink-0">
            {/* Divider 1 */}
            <div className="w-full border-t border-[#E3E8ED] my-4 sm:my-5 md:my-3.5" />

            {/* NOW SERVING ROW */}
            <div className="flex items-center justify-between py-0.5">
              <span className="text-[15px] sm:text-[16px] md:text-[13.5px] font-bold uppercase tracking-[0.16em] text-[#627D98]">
                NOW SERVING
              </span>
              <span className="text-[28px] sm:text-[30px] md:text-[26px] font-black text-[#102A43] leading-none font-sans">
                {d.current_serving_token || '—'}
              </span>
            </div>

            {/* Divider 2 */}
            <div className="w-full border-t border-[#E3E8ED] my-4 sm:my-5 md:my-3.5" />

            {/* DOCTOR & APPOINTMENT INFORMATION */}
            <div className="flex items-start gap-4 md:gap-3 py-1">
              <DoctorAvatarIcon className="w-11 h-11 md:w-9 md:h-9 text-[#627D98] shrink-0 mt-0.5" />
              <div>
                <div className="text-[20px] sm:text-[22px] md:text-[18px] font-bold text-[#102A43] leading-tight">
                  {d.doctor_name || 'Dr. Kumar'}
                </div>
                <div className="text-[16px] sm:text-[17px] md:text-[14.5px] font-medium text-[#627D98] leading-tight mt-1 md:mt-0.5">
                  General Medicine · {d.room || 'Room 2'}
                </div>
                <div className="flex items-center gap-2 text-[16px] sm:text-[17px] md:text-[14.5px] font-medium text-[#627D98] mt-3 md:mt-2">
                  <Clock className="w-[19px] h-[19px] md:w-[16px] md:h-[16px] text-[#627D98] shrink-0" strokeWidth={2.2} />
                  <span>Today · {d.appointment_time || '11:30 AM'}</span>
                </div>
              </div>
            </div>

            {/* BOTTOM LIVE MESSAGE */}
            <footer className="w-full h-[42px] md:h-[38px] bg-[#E6F7F2] rounded-2xl md:rounded-xl flex items-center justify-center gap-2 text-[14px] sm:text-[15px] md:text-[13px] font-medium text-[#087F73] mt-5 sm:mt-6 md:mt-4">
              <span className="w-2 h-2 md:w-1.5 md:h-1.5 rounded-full bg-[#087F73]" />
              <span>Queue updates are live</span>
            </footer>
          </div>
        )}

      </div>
    </div>
  );
};
