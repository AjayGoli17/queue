import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { QueueOverview } from './types';
import { fetchQueueOverview, resetDemoData } from './services/api';
import { wsClient } from './services/websocket';
import { DemoLauncher } from './components/DemoLauncher';
import { ReceptionDashboard } from './components/ReceptionDashboard';
import { PatientTrackingPage } from './components/PatientTrackingPage';
import { WaitingRoomTVDisplay } from './components/WaitingRoomTVDisplay';

const FALLBACK_OVERVIEW: QueueOverview = {
  hospital_name: 'City Care Hospital',
  doctor: {
    id: 'dr-kumar',
    name: 'Dr. Kumar',
    room: 'Room 2',
    delay_status: 'Available',
    avg_consultation_time: 15,
  },
  current_patient: null,
  next_patients: [],
  all_patients: [],
  stats: {
    total: 0,
    booked: 0,
    checked_in: 0,
    waiting: 0,
    in_consultation: 0,
    completed: 0,
    skipped: 0,
    no_show: 0,
    walk_ins: 0,
    avg_waiting_time_minutes: 15,
  },
  summary: {
    total_appointments: 0,
    checked_in_count: 0,
    completed_count: 0,
    no_show_count: 0,
    skipped_count: 0,
    walk_ins_count: 0,
    avg_waiting_time_minutes: 15,
  },
};

export function App() {
  const [overview, setOverview] = useState<QueueOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const data = await fetchQueueOverview('dr-kumar');
      setOverview(data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching overview:', err);
      setError(err.message || 'Unable to connect to backend server. Please verify the server is running.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // 1. Initial Load & Background polling safeguard (every 5s)
  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  // 2. Real-Time WebSocket Synchronization
  useEffect(() => {
    const unsubscribe = wsClient.subscribe(() => {
      loadData(true);
    });
    return unsubscribe;
  }, [loadData]);

  const handleResetDemo = async (mode: 'active_demo' | 'all_booked') => {
    setIsRefreshing(true);
    try {
      const res = await resetDemoData(mode);
      setOverview(res.overview);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to reset demo data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const activeOverview = overview || FALLBACK_OVERVIEW;

  if (loading && !overview && !error) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="w-12 h-12 border-4 border-hospital-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-black text-white">City Care Hospital</h2>
        <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
          Initializing Queue Management & Patient Flow System...
        </p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* 1. ROOT ROUTE: DEMO LAUNCHER (Section 8) */}
        <Route path="/" element={<DemoLauncher />} />

        {/* 2. RECEPTION DASHBOARD ROUTE: /reception (Section 4) */}
        <Route
          path="/reception"
          element={
            <ReceptionDashboard
              overview={activeOverview}
              onRefresh={() => loadData(false)}
              onResetDemo={handleResetDemo}
              isRefreshing={isRefreshing}
              error={error}
            />
          }
        />

        {/* 3. WAITING ROOM TV DISPLAY ROUTE: /display (Section 5) */}
        <Route
          path="/display"
          element={<WaitingRoomTVDisplay overview={activeOverview} />}
        />

        {/* 4. PATIENT TRACKING ROUTE: /track/:token & /track (Section 6) */}
        <Route
          path="/track/:token"
          element={
            <div className="pt-shell bg-slate-50 text-slate-900">
              <PatientTrackingPage />
            </div>
          }
        />
        <Route path="/track" element={<Navigate to="/track/A07" replace />} />

        {/* 5. CATCH-ALL ROUTE -> Redirect to Launcher */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
