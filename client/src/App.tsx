import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { QueueOverview } from './types';
import { fetchQueueOverview, resetDemoData } from './services/api';
import { wsClient } from './services/websocket';
import { DemoLauncher } from './components/DemoLauncher';
import { Navigation } from './components/Navigation';
import { ReceptionDashboard } from './components/ReceptionDashboard';
import { PatientTrackingPage } from './components/PatientTrackingPage';
import { WaitingRoomTVDisplay } from './components/WaitingRoomTVDisplay';
import { AlertCircle } from 'lucide-react';

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
      setError(err.message || 'Failed to connect to backend server');
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

  if (loading && !overview) {
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
            <div className="min-h-screen bg-slate-50 text-slate-900">
              <Navigation
                onRefresh={() => loadData(false)}
                onResetDemo={handleResetDemo}
                isRefreshing={isRefreshing}
              />
              <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {error && (
                  <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{error}</span>
                    </div>
                    <button
                      onClick={() => loadData(false)}
                      className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition"
                    >
                      Retry
                    </button>
                  </div>
                )}
                {overview && (
                  <ReceptionDashboard overview={overview} onRefresh={() => loadData(true)} />
                )}
              </main>
            </div>
          }
        />

        {/* 3. WAITING ROOM TV DISPLAY ROUTE: /display (Section 5) */}
        <Route
          path="/display"
          element={
            overview ? (
              <WaitingRoomTVDisplay overview={overview} />
            ) : (
              <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
                Loading Display...
              </div>
            )
          }
        />

        {/* 4. PATIENT TRACKING ROUTE: /track/:token & /track (Section 6) */}
        <Route
          path="/track/:token"
          element={
            <div className="min-h-screen bg-slate-50 text-slate-900 py-6 px-4">
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
