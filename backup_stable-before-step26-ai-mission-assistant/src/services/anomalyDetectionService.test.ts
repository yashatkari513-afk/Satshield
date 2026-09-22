/**
 * SATSHIELD — Anomaly Detection Service Test Suite
 * 
 * Verifies all 9 core operational scenarios:
 * 1. Normal telemetry
 * 2. High temperature (thermal anomaly)
 * 3. Low battery voltage (EPS undervoltage)
 * 4. Communication signal loss (RF signal degradation)
 * 5. High packet loss
 * 6. Attitude pointing deviation (AOCS anomaly)
 * 7. Sensor drift over time
 * 8. Missing telemetry fields (defensive defaults)
 * 9. Invalid telemetry (null, undefined, string numbers, NaN)
 */

declare const process: any;

import {
  AnomalyDetectionService,
  detectTelemetryAnomaly,
  DEFAULT_TELEMETRY_THRESHOLDS,
  type TelemetryFrameInput
} from './anomalyDetectionService';

export function runAnomalyDetectionTests() {
  console.log('====================================================');
  console.log('SATSHIELD — Anomaly Detection Service Verification');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`[PASS] Test ${totalTests}: ${testName}`);
    } else {
      console.error(`[FAIL] Test ${totalTests}: ${testName}`);
      if (detail) console.error(`       Detail: ${detail}`);
    }
  }

  const service = new AnomalyDetectionService();

  // --------------------------------------------------------------------------
  // TEST 1: Normal Nominal Telemetry
  // --------------------------------------------------------------------------
  const normalTelemetry: TelemetryFrameInput = {
    satelliteId: 'SAT-001',
    satelliteName: 'AGIS-3',
    voltage: 28.5,
    current: 15.0,
    temperature: 22.0,
    powerGeneration: 650.0,
    batteryLevel: 92.0,
    communicationSignal: -72.0,
    packetLoss: 0.05,
    pitch: 0.2,
    roll: -0.1,
    yaw: 0.3,
  };
  const res1 = service.detect(normalTelemetry);
  assert(!res1.isAnomaly, 'Normal telemetry produces isAnomaly = false', JSON.stringify(res1));
  assert(res1.severity === 'INFO', 'Normal telemetry has severity INFO');
  assert(res1.anomalyScore < 0.1, 'Normal telemetry has nominal anomaly score < 0.1');
  assert(res1.satelliteId === 'SAT-001', 'Satellite ID is correctly preserved');

  // --------------------------------------------------------------------------
  // TEST 2: High Temperature (Thermal Overheating)
  // --------------------------------------------------------------------------
  const highTempTelemetry: TelemetryFrameInput = {
    satelliteId: 'SAT-002',
    satelliteName: 'SENTINEL-9',
    voltage: 28.0,
    current: 16.0,
    temperature: 58.5, // > 55.0 critical threshold
    powerGeneration: 620.0,
    batteryLevel: 88.0,
    communicationSignal: -74.0,
    packetLoss: 0.1,
    pitch: 0.0,
    roll: 0.0,
    yaw: 0.0,
  };
  const res2 = service.detect(highTempTelemetry);
  assert(res2.isAnomaly, 'High temperature is detected as anomaly');
  assert(res2.subsystem === 'THERMAL', 'High temp identifies THERMAL subsystem');
  assert(res2.severity === 'CRITICAL', '58.5°C triggers CRITICAL severity');
  assert(res2.affectedParameters.includes('temperature'), 'Affected parameters includes temperature');
  assert(res2.explanation.includes('58.5°C'), 'Explanation contains actual observed temperature (58.5°C)');

  // --------------------------------------------------------------------------
  // TEST 3: Low Battery Voltage (EPS Undervoltage)
  // --------------------------------------------------------------------------
  const lowVoltageTelemetry: TelemetryFrameInput = {
    satelliteId: 'SAT-003',
    satelliteName: 'ORBCOM-7',
    voltage: 21.4, // < 22.0 critical min
    current: 38.0,
    temperature: 24.0,
    powerGeneration: 300.0,
    batteryLevel: 25.0,
    communicationSignal: -75.0,
    packetLoss: 0.0,
    pitch: 0.0,
    roll: 0.0,
    yaw: 0.0,
  };
  const res3 = service.detect(lowVoltageTelemetry);
  assert(res3.isAnomaly, 'Low battery voltage detected as anomaly');
  assert(res3.subsystem === 'POWER' || res3.subsystem === 'BATTERY', 'Identifies POWER/BATTERY subsystem');
  assert(res3.severity === 'CRITICAL', '21.4V triggers CRITICAL severity');
  assert(res3.affectedParameters.includes('voltage'), 'Affected parameters includes voltage');

  // --------------------------------------------------------------------------
  // TEST 4: Communication Signal Loss (RF Link Degradation)
  // --------------------------------------------------------------------------
  const commLossTelemetry: TelemetryFrameInput = {
    satelliteId: 'SAT-004',
    satelliteName: 'HELIOS-1',
    voltage: 28.2,
    current: 14.5,
    temperature: 21.0,
    powerGeneration: 640.0,
    batteryLevel: 90.0,
    communicationSignal: -112.0, // < -110.0 critical min
    packetLoss: 0.5,
    pitch: 0.0,
    roll: 0.0,
    yaw: 0.0,
  };
  const res4 = service.detect(commLossTelemetry);
  assert(res4.isAnomaly, 'Comm signal loss detected as anomaly');
  assert(res4.subsystem === 'COMMUNICATION', 'Identifies COMMUNICATION subsystem');
  assert(res4.affectedParameters.includes('communicationSignal'), 'Affected parameters includes communicationSignal');

  // --------------------------------------------------------------------------
  // TEST 5: High Packet Loss
  // --------------------------------------------------------------------------
  const highPacketLossTelemetry: TelemetryFrameInput = {
    satelliteId: 'SAT-001',
    voltage: 28.5,
    temperature: 22.0,
    communicationSignal: -76.0,
    packetLoss: 9.8, // > 8.0 critical max
  };
  const res5 = service.detect(highPacketLossTelemetry);
  assert(res5.isAnomaly, 'High packet loss detected as anomaly');
  assert(res5.subsystem === 'COMMUNICATION', 'Identifies COMMUNICATION subsystem');
  assert(res5.affectedParameters.includes('packetLoss'), 'Affected parameters includes packetLoss');

  // --------------------------------------------------------------------------
  // TEST 6: Attitude Pointing Deviation
  // --------------------------------------------------------------------------
  const attitudeDeviationTelemetry: TelemetryFrameInput = {
    satelliteId: 'SAT-002',
    pitch: 18.5, // > 15.0 critical max
    roll: -16.2,
    yaw: 1.0,
  };
  const res6 = service.detect(attitudeDeviationTelemetry);
  assert(res6.isAnomaly, 'Attitude deviation detected as anomaly');
  assert(res6.subsystem === 'ATTITUDE', 'Identifies ATTITUDE subsystem');
  assert(res6.affectedParameters.includes('pitch') || res6.affectedParameters.includes('roll'), 'Affected parameters includes pitch/roll');

  // --------------------------------------------------------------------------
  // TEST 7: Sensor Drift over Time
  // --------------------------------------------------------------------------
  const historyDrift: TelemetryFrameInput[] = [
    { satelliteId: 'SAT-003', temperature: 22.0 },
    { satelliteId: 'SAT-003', temperature: 25.0 },
    { satelliteId: 'SAT-003', temperature: 28.0 },
    { satelliteId: 'SAT-003', temperature: 31.0 },
    { satelliteId: 'SAT-003', temperature: 34.0 },
  ];
  const currentDrift: TelemetryFrameInput = {
    satelliteId: 'SAT-003',
    temperature: 37.0, // Z-score elevated (> 3.5 std dev above mean)
  };
  const res7 = service.detect(currentDrift, historyDrift);
  assert(res7.isAnomaly, 'Sensor drift detected as anomaly');
  assert(res7.subsystem === 'THERMAL', 'Sensor drift identifies THERMAL subsystem');

  // --------------------------------------------------------------------------
  // TEST 8: Missing Telemetry Fields (Graceful Defaults)
  // --------------------------------------------------------------------------
  const partialTelemetry = {
    satelliteId: 'SAT-PARTIAL',
    // Omit voltage, current, etc.
  };
  const res8 = service.detect(partialTelemetry);
  assert(res8 !== null && typeof res8 === 'object', 'Missing fields handled safely');
  assert(res8.satelliteId === 'SAT-PARTIAL', 'Custom satelliteId preserved');
  assert(!res8.isAnomaly, 'Missing fields default to nominal envelopes without crashing');

  // --------------------------------------------------------------------------
  // TEST 9: Invalid Telemetry (Null, Undefined, String Numbers, NaN)
  // --------------------------------------------------------------------------
  const invalid1 = service.detect(null);
  assert(invalid1 !== null && typeof invalid1 === 'object', 'Null telemetry handled safely without crash');

  const invalid2 = service.detect(undefined);
  assert(invalid2 !== null && typeof invalid2 === 'object', 'Undefined telemetry handled safely without crash');

  const stringTelemetry = {
    satelliteId: 'SAT-STR',
    voltage: '28.4' as any,
    temperature: '23.1' as any,
    batteryLevel: 'NaN' as any,
  };
  const res9 = service.detect(stringTelemetry);
  assert(res9 !== null, 'String & NaN telemetry handled safely');
  assert(res9.satelliteId === 'SAT-STR', 'String telemetry satelliteId parsed correctly');

  console.log('\n----------------------------------------------------');
  console.log(`Results: ${passedTests} / ${totalTests} assertions passed.`);
  console.log('====================================================\n');

  return passedTests === totalTests;
}

// Auto-run if executed directly
if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].includes('anomalyDetectionService.test')) {
  const ok = runAnomalyDetectionTests();
  if (!ok) {
    process.exit(1);
  }
}

