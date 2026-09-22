import React, { useState } from 'react';
import { ConsoleNavbar } from './ConsoleNavbar';
import { SatelliteList } from './SatelliteList';
import { SatelliteHealth } from './SatelliteHealth';
import { TelemetryCharts } from './TelemetryCharts';
import { AnomalyDetection } from './AnomalyDetection';
import { AIPrediction } from './AIPrediction';
import { MissionAlerts } from './MissionAlerts';
import { GroundStationCard } from './GroundStationCard';
import { DigitalTwinView } from './DigitalTwinView';
import { SpaceVisualization } from './SpaceVisualization';
import { AlertsPage } from '../../pages/AlertsPage';
import { HistoryPage } from '../../pages/HistoryPage';

export const MissionControl: React.FC = () => {
  const [activeView, setActiveView] = useState<
    'mission-control' | 'satellites' | 'telemetry' | 'anomalies' | 'prediction' | 'reports' | 'digital-twin'
  >('mission-control');

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#030303] text-[#eaf2fb] font-sans selection:bg-[#4dd8e6] selection:text-black">
      {/* 1. Thin Premium Top Navigation */}
      <ConsoleNavbar activeView={activeView} setActiveView={setActiveView} />

      {/* Main Console Content Body */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto space-y-6">
        {/* VIEW 1: MISSION CONTROL OVERVIEW */}
        {activeView === 'mission-control' && (
          <div className="space-y-6 animate-fade-in">
            {/* 3-Column Aerospace Layout Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
              {/* Left Column (3 cols): Satellite Selector List & Ground Station */}
              <div className="lg:col-span-3 space-y-6 animate-slide-in stagger-1">
                <SatelliteList />
                <GroundStationCard />
              </div>

              {/* Center Column (6 cols): 3D Space View & Live Telemetry Charts */}
              <div className="lg:col-span-6 space-y-6 animate-slide-in stagger-2">
                <SpaceVisualization />
                <TelemetryCharts />
              </div>

              {/* Right Column (3 cols): Satellite Health & AI Anomaly / Prediction */}
              <div className="lg:col-span-3 space-y-6 animate-slide-in stagger-3">
                <SatelliteHealth />
                <AnomalyDetection />
                <AIPrediction />
                <MissionAlerts />
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: SATELLITES FLEET VIEW */}
        {activeView === 'satellites' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-4 animate-slide-in stagger-1">
                <SatelliteList />
              </div>
              <div className="lg:col-span-8 animate-slide-in stagger-2">
                <SpaceVisualization />
              </div>
            </div>
            <div className="animate-slide-in stagger-3">
              <TelemetryCharts />
            </div>
          </div>
        )}

        {/* VIEW 3: TELEMETRY STREAM VIEW */}
        {activeView === 'telemetry' && (
          <div className="space-y-6 animate-fade-in">
            <div className="animate-slide-in stagger-1">
              <TelemetryCharts />
            </div>
            <div className="animate-slide-in stagger-2">
              <SatelliteHealth />
            </div>
          </div>
        )}

        {/* VIEW 4: ANOMALIES VIEW */}
        {activeView === 'anomalies' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 animate-fade-in">
            <div className="lg:col-span-4 space-y-6 animate-slide-in stagger-1">
              <AnomalyDetection />
              <AIPrediction />
            </div>
            <div className="lg:col-span-8 animate-slide-in stagger-2">
              <AlertsPage />
            </div>
          </div>
        )}

        {/* VIEW 5: AI FAILURE PREDICTION VIEW */}
        {activeView === 'prediction' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 animate-fade-in">
            <div className="lg:col-span-6 space-y-6 animate-slide-in stagger-1">
              <AIPrediction />
              <AnomalyDetection />
            </div>
            <div className="lg:col-span-6 space-y-6 animate-slide-in stagger-2">
              <SatelliteHealth />
              <GroundStationCard />
            </div>
          </div>
        )}

        {/* VIEW 6: DIGITAL TWIN VIEW */}
        {activeView === 'digital-twin' && <DigitalTwinView />}

        {/* VIEW 7: REPORTS VIEW */}
        {activeView === 'reports' && <HistoryPage />}
      </main>
    </div>
  );
};
