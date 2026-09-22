import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { TelemetryProvider } from './context/TelemetryContext';
import { SimulationProvider } from './context/SimulationContext';
import { LandingPage } from './pages/LandingPage';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { SatelliteDetailPage } from './pages/SatelliteDetailPage';
import { AlertsPage } from './pages/AlertsPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';

import { ErrorBoundary } from './components/common/ErrorBoundary';

// Standard Shell Layout wrapper for secondary tools
function StandardLayout() {
  return (
    <div className="flex flex-col h-screen w-screen bg-[#020305] text-[#F1F5F9] overflow-hidden font-sans selection:bg-[#00BFFF] selection:text-black">
      <Navbar />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="Mission Control Dashboard Runtime">
      <Router>
        <TelemetryProvider>
          <SimulationProvider>
            <Routes>
              {/* Main Mission Control Dashboard on root and /dashboard */}
              <Route path="/" element={<DashboardPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/landing" element={<LandingPage />} />

              {/* Sub-pages and tools */}
              <Route element={<StandardLayout />}>
                <Route path="/satellite/:id" element={<SatelliteDetailPage />} />
                <Route path="/alerts" element={<AlertsPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Routes>
          </SimulationProvider>
        </TelemetryProvider>
      </Router>
    </ErrorBoundary>
  );
}

