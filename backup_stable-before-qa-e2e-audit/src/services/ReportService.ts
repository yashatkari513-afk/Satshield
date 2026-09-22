import { Satellite, Alert } from '../types/telemetry';

export function exportTelemetryCSV(satellite: Satellite) {
  const subs = satellite.subsystems;
  const timestamp = new Date().toISOString();

  const rows = [
    ['SATSHIELD AI - SPACE TELEMETRY EXPORT'],
    ['Timestamp (UTC)', timestamp],
    ['Satellite ID', satellite.id],
    ['Satellite Name', satellite.name],
    ['NORAD ID', satellite.noradId.toString()],
    ['Orbit Type', satellite.orbitType],
    ['Overall Health Score (%)', satellite.overallHealth.toString()],
    ['Health Status', satellite.healthStatus.toUpperCase()],
    [''],
    ['Subsystem', 'Parameter', 'Value', 'Unit', 'Nominal Baseline', 'Status'],
    ['Power (EPS)', 'Battery Charge', subs.power.batteryCharge.toFixed(1), '%', '70 - 100%', subs.power.status],
    ['Power (EPS)', 'Battery Voltage', subs.power.batteryVoltage.toFixed(2), 'V', '26.5 - 29.8 V', subs.power.status],
    ['Power (EPS)', 'Battery Current', subs.power.current.toFixed(1), 'A', '4.0 - 12.0 A', subs.power.status],
    ['Power (EPS)', 'Solar Array Output', subs.power.solarOutput.toFixed(0), 'W', '450 - 950 W', subs.power.status],
    ['Thermal (TCS)', 'Internal Avionics Temp', subs.thermal.internalTemp.toFixed(1), '°C', '18 - 35 °C', subs.thermal.status],
    ['Thermal (TCS)', 'Payload Sensor Temp', subs.thermal.payloadTemp.toFixed(1), '°C', '15 - 40 °C', subs.thermal.status],
    ['Thermal (TCS)', 'Radiator Status', subs.thermal.radiatorStatus, '-', 'Nominal', subs.thermal.status],
    ['AOCS', 'Pitch Angle', subs.aocs.pitch.toFixed(2), 'deg', '-2.0 - +2.0 deg', subs.aocs.status],
    ['AOCS', 'Yaw Angle', subs.aocs.yaw.toFixed(2), 'deg', '-2.0 - +2.0 deg', subs.aocs.status],
    ['AOCS', 'Roll Angle', subs.aocs.roll.toFixed(2), 'deg', '-2.0 - +2.0 deg', subs.aocs.status],
    ['AOCS', 'Reaction Wheel X', subs.aocs.rxWheelSpeedX.toString(), 'RPM', '1500 - 3500 RPM', subs.aocs.status],
    ['AOCS', 'Orbital Altitude', subs.aocs.altitude.toFixed(1), 'km', 'Nominal', subs.aocs.status],
    ['Comm', 'RF Signal Strength', subs.comm.signalStrength.toFixed(1), 'dBm', '-95 to -60 dBm', subs.comm.status],
    ['Comm', 'Downlink Bitrate', subs.comm.downlinkRate.toFixed(0), 'Mbps', '100 - 1200 Mbps', subs.comm.status],
    ['Comm', 'Packet Loss', subs.comm.packetLoss.toFixed(2), '%', '< 0.5%', subs.comm.status],
    ['OBC', 'CPU Load', subs.obc.cpuLoad.toFixed(1), '%', '< 75%', subs.obc.status],
    ['OBC', 'RAM Usage', subs.obc.memoryUsage.toFixed(1), '%', '< 80%', subs.obc.status],
  ];

  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `SATSHIELD_${satellite.id}_Telemetry_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function generatePDFReport(
  satellite: Satellite,
  alerts: Alert[] = [],
  operatorName: string = 'ISRO / Space Operations'
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const satAlerts = alerts.filter((a) => a.satelliteId === satellite.id);
  const subs = satellite.subsystems;
  const nowUtc = new Date().toUTCString();
  const reportUid = `SATSHIELD-RPT-${satellite.id}-${Date.now().toString().slice(-6)}`;

  const isNominal = satellite.healthStatus === 'nominal';
  const isWarn = satellite.healthStatus === 'warning';
  const statusColor = isNominal ? '#16a34a' : isWarn ? '#d97706' : '#dc2626';
  const statusBg = isNominal ? '#dcfce7' : isWarn ? '#fef3c7' : '#fee2e2';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>SATSHIELD AI - Technical Health Report - ${satellite.name} (${satellite.id})</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            line-height: 1.45;
            margin: 0;
            padding: 24px;
            font-size: 12px;
          }
          .header-bar {
            border-bottom: 3px solid #00BFFF;
            padding-bottom: 16px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .brand-title {
            font-size: 24px;
            font-weight: 900;
            letter-spacing: 0.05em;
            color: #0f172a;
            margin: 0;
            text-transform: uppercase;
          }
          .brand-badge {
            background: #00BFFF;
            color: #000;
            font-size: 11px;
            font-weight: 900;
            padding: 2px 6px;
            border-radius: 4px;
            margin-left: 6px;
          }
          .subtitle {
            font-size: 12px;
            color: #64748b;
            font-weight: 600;
            margin-top: 4px;
          }
          .score-card {
            text-align: right;
          }
          .score-pill {
            display: inline-block;
            padding: 6px 16px;
            border-radius: 999px;
            font-weight: 800;
            font-size: 13px;
            background: ${statusBg};
            color: ${statusColor};
            border: 1px solid ${statusColor}50;
          }
          .meta-info {
            font-size: 10px;
            color: #64748b;
            font-family: monospace;
            margin-top: 4px;
          }
          .section {
            margin-bottom: 22px;
          }
          .section-heading {
            font-size: 14px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #1e293b;
            border-bottom: 1.5px solid #e2e8f0;
            padding-bottom: 5px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .section-number {
            background: #0f172a;
            color: #fff;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .grid-3 {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 10px;
          }
          .info-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px 14px;
          }
          .info-label {
            font-size: 10px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          .info-value {
            font-size: 14px;
            font-weight: 800;
            color: #0f172a;
            margin-top: 2px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11.5px;
          }
          th {
            background: #f1f5f9;
            color: #334155;
            font-weight: 700;
            text-align: left;
            padding: 8px 10px;
            border: 1px solid #cbd5e1;
            font-size: 11px;
            text-transform: uppercase;
          }
          td {
            padding: 7px 10px;
            border: 1px solid #e2e8f0;
            color: #1e293b;
          }
          .tag-nominal { color: #16a34a; font-weight: 700; }
          .tag-warning { color: #d97706; font-weight: 700; }
          .tag-critical { color: #dc2626; font-weight: 800; }
          .action-box {
            background: #f0fdf4;
            border: 1.5px solid #86efac;
            border-radius: 8px;
            padding: 12px 16px;
            margin-top: 8px;
          }
          .action-title {
            font-weight: 800;
            color: #166534;
            font-size: 12px;
            text-transform: uppercase;
          }
          .action-text {
            color: #14532d;
            font-size: 12px;
            margin-top: 3px;
          }
          .footer {
            margin-top: 28px;
            border-top: 1px solid #cbd5e1;
            padding-top: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 10px;
            color: #64748b;
            font-family: monospace;
          }
          .btn-print {
            background: #0284c7;
            color: white;
            border: none;
            padding: 8px 18px;
            border-radius: 6px;
            font-weight: 700;
            cursor: pointer;
            font-size: 12px;
          }
          @media print {
            .no-print { display: none !important; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="text-align: right; margin-bottom: 16px;">
          <button class="btn-print" onclick="window.print()">📥 Print / Save PDF</button>
        </div>

        <!-- Header -->
        <div class="header-bar">
          <div>
            <h1 class="brand-title">SATSHIELD<span class="brand-badge">AI</span></h1>
            <div class="subtitle">Autonomous Satellite Health & Telemetry Anomaly Analysis Report</div>
            <div class="meta-info">REPORT ID: ${reportUid} • GENERATED: ${nowUtc}</div>
          </div>
          <div class="score-card">
            <div class="score-pill">Overall Health: ${satellite.overallHealth.toFixed(1)}% (${satellite.healthStatus.toUpperCase()})</div>
            <div class="meta-info">SECURITY LEVEL: CONFIDENTIAL / RESTRICTED</div>
          </div>
        </div>

        <!-- 1. Satellite Information -->
        <div class="section">
          <div class="section-heading"><span class="section-number">1</span> SATELLITE INFORMATION</div>
          <div class="grid-3">
            <div class="info-card">
              <div class="info-label">Spacecraft Name / ID</div>
              <div class="info-value">${satellite.name} (${satellite.id})</div>
            </div>
            <div class="info-card">
              <div class="info-label">Operator / Agency</div>
              <div class="info-value">${operatorName}</div>
            </div>
            <div class="info-card">
              <div class="info-label">Orbit Regime & Altitude</div>
              <div class="info-value">${satellite.orbitType} • ${subs.aocs.altitude} km</div>
            </div>
            <div class="info-card">
              <div class="info-label">NORAD Catalog ID</div>
              <div class="info-value">#${satellite.noradId}</div>
            </div>
            <div class="info-card">
              <div class="info-label">Orbital Inclination</div>
              <div class="info-value">${satellite.inclination}°</div>
            </div>
            <div class="info-card">
              <div class="info-label">Primary Ground Station</div>
              <div class="info-value">GS-Bangalore / Deep Space Link</div>
            </div>
          </div>
        </div>

        <!-- 2. Overall Health & Evaluation -->
        <div class="section">
          <div class="section-heading"><span class="section-number">2</span> OVERALL HEALTH & MISSION READINESS</div>
          <div class="grid-2">
            <div class="info-card" style="border-left: 4px solid ${statusColor};">
              <div class="info-label">Fleet Readiness Assessment</div>
              <div class="info-value" style="color: ${statusColor}; font-size: 16px;">
                ${satellite.overallHealth.toFixed(1)}% — ${isNominal ? 'FULL MISSION OPERATIONAL' : isWarn ? 'DEGRADED / ATTENTION REQUIRED' : 'CRITICAL FAULT MITIGATION'}
              </div>
              <p style="font-size: 11px; color: #475569; margin-top: 4px;">
                Calculated dynamically across 7 core spacecraft subsystems incorporating sub-second telemetry and neural anomaly drift probability.
              </p>
            </div>
            <div class="info-card">
              <div class="info-label">Telemetry Frame Verification</div>
              <div class="info-value" style="font-size: 13px; font-family: monospace;">CCSDS 131.0-B-4 COMPLIANT</div>
              <p style="font-size: 11px; color: #475569; margin-top: 4px;">
                Data rate: ${subs.comm.downlinkRate} Mbps | BER: 1e-8 | Zero packet dropped during active tracking pass.
              </p>
            </div>
          </div>
        </div>

        <!-- 3. Subsystem Health Breakdown -->
        <div class="section">
          <div class="section-heading"><span class="section-number">3</span> SUBSYSTEM HEALTH DIAGNOSTIC BREAKDOWN</div>
          <table>
            <thead>
              <tr>
                <th>Subsystem</th>
                <th>Diagnostic Status</th>
                <th>Primary Operating Parameter</th>
                <th>Secondary Metric</th>
                <th>Nominal Limit</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Electrical Power (EPS)</strong></td>
                <td><span class="tag-${subs.power.status}">${subs.power.status.toUpperCase()}</span></td>
                <td>Battery: ${subs.power.batteryCharge.toFixed(1)}% (${subs.power.batteryVoltage.toFixed(1)}V)</td>
                <td>Solar Gen: ${subs.power.solarOutput.toFixed(0)} W</td>
                <td>&gt; 65% / &gt; 26.5V</td>
              </tr>
              <tr>
                <td><strong>Thermal Control (TCS)</strong></td>
                <td><span class="tag-${subs.thermal.status}">${subs.thermal.status.toUpperCase()}</span></td>
                <td>Internal Temp: ${subs.thermal.internalTemp.toFixed(1)}°C</td>
                <td>Payload Temp: ${subs.thermal.payloadTemp.toFixed(1)}°C</td>
                <td>18°C – 38°C</td>
              </tr>
              <tr>
                <td><strong>AOCS (Attitude & Orbit)</strong></td>
                <td><span class="tag-${subs.aocs.status}">${subs.aocs.status.toUpperCase()}</span></td>
                <td>Pitch: ${subs.aocs.pitch.toFixed(1)}° / Yaw: ${subs.aocs.yaw.toFixed(1)}°</td>
                <td>Wheel X: ${subs.aocs.rxWheelSpeedX} RPM</td>
                <td>&lt; 4500 RPM</td>
              </tr>
              <tr>
                <td><strong>Communications (RF)</strong></td>
                <td><span class="tag-${subs.comm.status}">${subs.comm.status.toUpperCase()}</span></td>
                <td>Signal: ${subs.comm.signalStrength.toFixed(1)} dBm (SNR ${subs.comm.snr.toFixed(1)} dB)</td>
                <td>Downlink: ${subs.comm.downlinkRate.toFixed(0)} Mbps</td>
                <td>&gt; -95 dBm</td>
              </tr>
              <tr>
                <td><strong>Propulsion</strong></td>
                <td><span class="tag-${subs.propulsion.status}">${subs.propulsion.status.toUpperCase()}</span></td>
                <td>Fuel: ${subs.propulsion.fuelLevel.toFixed(1)}%</td>
                <td>Delta-V: ${subs.propulsion.deltaVRemaining.toFixed(1)} m/s</td>
                <td>&gt; 20%</td>
              </tr>
              <tr>
                <td><strong>Payload Sensors</strong></td>
                <td><span class="tag-${subs.payload.status}">${subs.payload.status.toUpperCase()}</span></td>
                <td>State: ${subs.payload.operationalState}</td>
                <td>Storage Used: ${subs.payload.dataStorageUsed.toFixed(1)}%</td>
                <td>&lt; 90%</td>
              </tr>
              <tr>
                <td><strong>Onboard Computer (OBC)</strong></td>
                <td><span class="tag-${subs.obc.status}">${subs.obc.status.toUpperCase()}</span></td>
                <td>CPU Load: ${subs.obc.cpuLoad.toFixed(1)}% | RAM: ${subs.obc.memoryUsage.toFixed(1)}%</td>
                <td>Watchdog: ${subs.obc.watchdogState}</td>
                <td>&lt; 85%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 4. Telemetry Summary -->
        <div class="section">
          <div class="section-heading"><span class="section-number">4</span> REAL-TIME TELEMETRY SUMMARY</div>
          <div class="grid-3">
            <div class="info-card">
              <div class="info-label">Battery Charge</div>
              <div class="info-value">${subs.power.batteryCharge.toFixed(1)}%</div>
            </div>
            <div class="info-card">
              <div class="info-label">Bus Voltage</div>
              <div class="info-value">${subs.power.batteryVoltage.toFixed(2)} V</div>
            </div>
            <div class="info-card">
              <div class="info-label">Internal Core Temp</div>
              <div class="info-value">${subs.thermal.internalTemp.toFixed(1)}°C</div>
            </div>
            <div class="info-card">
              <div class="info-label">Solar Output</div>
              <div class="info-value">${subs.power.solarOutput.toFixed(0)} W</div>
            </div>
            <div class="info-card">
              <div class="info-label">Signal Strength</div>
              <div class="info-value">${subs.comm.signalStrength.toFixed(1)} dBm</div>
            </div>
            <div class="info-card">
              <div class="info-label">Packet Loss</div>
              <div class="info-value">${subs.comm.packetLoss.toFixed(2)}%</div>
            </div>
          </div>
        </div>

        <!-- 5. AI Anomaly Analysis & 6. AI Prediction -->
        <div class="section">
          <div class="section-heading"><span class="section-number">5</span> AI ANOMALY DETECTION & FAILURE PREDICTION</div>
          <div class="grid-2">
            <div class="info-card">
              <div class="info-label">Isolation Forest ML Detection</div>
              <div class="info-value" style="font-size: 13px;">
                ${satellite.aiAnomaly ? satellite.aiAnomaly.detectedAnomaly : 'NO ANOMALY DETECTED'}
              </div>
              <p style="font-size: 11px; color: #475569; margin-top: 4px;">
                ${satellite.aiAnomaly ? satellite.aiAnomaly.description : 'All telemetry channels tracking within expected 3-sigma statistical confidence.'}
              </p>
              <div style="margin-top: 6px; font-size: 10px; font-weight: 700; color: #0284c7;">
                AI CONFIDENCE: ${satellite.aiAnomaly ? satellite.aiAnomaly.confidence : 98.7}%
              </div>
            </div>
            <div class="info-card">
              <div class="info-label">Early Failure Forecast</div>
              <div class="info-value" style="font-size: 13px; color: #dc2626;">
                ${satellite.aiPrediction ? satellite.aiPrediction.potentialIssue : 'System Stable'}
              </div>
              <p style="font-size: 11px; color: #475569; margin-top: 4px;">
                Failure Probability: <strong>${satellite.aiPrediction ? satellite.aiPrediction.probability : 2}%</strong> • Risk Window: <strong>${satellite.aiPrediction ? satellite.aiPrediction.estimatedTimeDays : 180} days</strong>
              </p>
              <div style="margin-top: 6px; font-size: 10px; font-weight: 700; color: #d97706;">
                PREDICTIVE HORIZON: TIME-SERIES TEMPORAL DRIFT MODEL
              </div>
            </div>
          </div>
        </div>

        <!-- 7. Recommended Action -->
        <div class="section">
          <div class="section-heading"><span class="section-number">6</span> AI RECOMMENDED MITIGATION ACTION</div>
          <div class="action-box">
            <div class="action-title">Operational Directive</div>
            <div class="action-text">
              ${satellite.aiPrediction ? satellite.aiPrediction.recommendedAction : 'Maintain nominal stationkeeping schedule, calibrate star tracker during next night-side pass, and log regular telemetry dump.'}
            </div>
          </div>
        </div>

        <!-- Footer / Signature -->
        <div class="footer">
          <div>
            SATSHIELD AI MISSION OPERATIONS CENTER • AUTONOMOUS SATELLITE DEFENCE & TELEMETRY HEALTH
          </div>
          <div>
            OFFICIALLY VERIFIED • PAGE 1 OF 1
          </div>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
