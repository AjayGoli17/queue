import { useState, useEffect, useCallback } from 'react';
import type { QueueOverview } from './types';
import { fetchQueueOverview, resetDemoData } from './services/api';
import { wsClient } from './services/websocket';
import { Navigation } from './components/Navigation';
import { ReceptionDashboard } from './components/ReceptionDashboard';
import { PatientTrackingPage } from './components/PatientTrackingPage';
import { WaitingRoomTVDisplay } from './components/WaitingRoomTVDisplay';
import { AlertCircle } from 'lucide-react';

export function App() {
  const [currentView, setCurrentView] = useState<'reception' | 'patient' | 'tv'>('reception');
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

  // 1. Initial Load & Background polling safeguard (every 5 seconds)
  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  // 2. Real-Time WebSocket Synchronization (Instant updates on any queue action)
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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-hospital-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-black text-slate-900">City Care Hospital</h2>
        <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">
          Initializing Queue Management & Patient Flow System...
        </p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${currentView === 'tv' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Top Header Navigation Switcher */}
      <Navigation
        currentView={currentView}
        onViewChange={setCurrentView}
        onRefresh={() => loadData(false)}
        onResetDemo={handleResetDemo}
        isRefreshing={isRefreshing}
      />

      {/* Main Body Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Error Alert Bar */}
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

        {/* View Router */}
        {overview && (
          <>
            {currentView === 'reception' && (
              <ReceptionDashboard overview={overview} onRefresh={() => loadData(true)} />
            )}
            {currentView === 'patient' && (
              <PatientTrackingPage initialToken="A07" />
            )}
            {currentView === 'tv' && (
              <WaitingRoomTVDisplay overview={overview} />
            )}
          </>
        )}
      </main>

    </div>
  );
}

export default App;
