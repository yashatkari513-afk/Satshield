declare const process: any;

import {
  AIEngineAdapter,
  aiEngineAdapter,
  AIEngineOutput,
  TelemetryDataPoint
} from './AIEngineAdapter';

export async function runAIEngineTests(): Promise<boolean> {
  console.log('================================================================');
  console.log('SATSHIELD — AI Engine Adapter Comprehensive Verification Suite');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`[PASS] Test ${total}: ${testName}`);
    } else {
      console.error(`[FAIL] Test ${total}: ${testName}`);
      if (detail) console.error(`       Detail: ${detail}`);
      throw new Error(`Assertion failed: ${testName} | ${detail || ''}`);
    }
  }

  const adapter = new AIEngineAdapter();

  // --------------------------------------------------------------------------
  // TEST A: Stable Telemetry (Baseline Nominal State)
  // --------------------------------------------------------------------------
  console.log('--- TEST A: Stable Telemetry ---');
  const stableHistory: TelemetryDataPoint[] = [
    { voltage: 28.5, temperature: 24.0, solarPower: 650, communicationSignal: -80, current: 6.5 },
    { voltage: 28.5, temperature: 24.1, solarPower: 650, communicationSignal: -80, current: 6.4 },
    { voltage: 28.6, temperature: 24.0, solarPower: 650, communicationSignal: -80, current: 6.5 },
    { voltage: 28.5, temperature: 24.0, solarPower: 650, communicationSignal: -80, current: 6.5 },
  ];
  const stablePoint: TelemetryDataPoint = { voltage: 28.5, temperature: 24.0, solarPower: 650, communicationSignal: -80, current: 6.5 };
  const resA = await adapter.analyze('SAT-001', 'AGIS-3', stablePoint, stableHistory);

  assert(resA.riskLevel === 'LOW', 'Stable telemetry evaluates to riskLevel = LOW');
  assert(resA.trend === 'STABLE', 'Stable telemetry has trend = STABLE');
  assert(
    resA.estimatedTimeToThreshold.includes('Stable trend') || resA.estimatedTimeToThreshold.includes('no threshold crossing'),
    'No threshold crossing estimated for stable baseline'
  );
  assert(resA.dataQuality.isValid === true, 'Data quality is valid');
  assert(['HIGH', 'MEDIUM', 'DEGRADED'].includes(resA.dataQuality.dataQualityRating), 'Data quality rating is assigned');

  // --------------------------------------------------------------------------
  // TEST B: Gradual Battery Degradation
  // --------------------------------------------------------------------------
  console.log('\n--- TEST B: Gradual Battery Degradation ---');
  const gradualBattHistory: TelemetryDataPoint[] = [
    { voltage: 28.2, temperature: 24.0 },
    { voltage: 27.5, temperature: 24.0 },
    { voltage: 26.6, temperature: 24.1 },
    { voltage: 25.8, temperature: 24.0 },
  ];
  const gradualBattPoint: TelemetryDataPoint = { voltage: 24.9, temperature: 24.0 };
  const resB = await adapter.analyze('SAT-002', 'SENTINEL-9', gradualBattPoint, gradualBattHistory);

  assert(resB.trend === 'DEGRADING' || resB.trend === 'RAPIDLY_DEGRADING', 'Gradual degradation detected as DEGRADING/RAPIDLY_DEGRADING');
  assert(resB.subsystem === 'BATTERY', 'Subsystem classified as BATTERY');
  assert(resB.riskLevel === 'HIGH' || resB.riskLevel === 'CRITICAL' || resB.riskLevel === 'MEDIUM', 'Risk level is elevated');
  assert(resB.evidence.some((e) => e.parameter.includes('VOLTAGE')), 'Evidence includes battery voltage parameter');

  // --------------------------------------------------------------------------
  // TEST C: Rapid Battery Degradation (Severe Bus Collapse)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST C: Rapid Battery Degradation ---');
  const rapidBattHistory: TelemetryDataPoint[] = [
    { voltage: 28.0, current: 8.0 },
    { voltage: 26.2, current: 12.0 },
    { voltage: 24.1, current: 16.0 },
    { voltage: 22.0, current: 19.5 },
  ];
  const rapidBattPoint: TelemetryDataPoint = { voltage: 20.2, current: 22.0 };
  const resC = await adapter.analyze('SAT-002', 'SENTINEL-9', rapidBattPoint, rapidBattHistory);

  assert(resC.trend === 'RAPIDLY_DEGRADING' || resC.trend === 'DEGRADING', 'Rapid drop classified as RAPIDLY_DEGRADING/DEGRADING');
  assert(resC.riskLevel === 'CRITICAL', 'Rapid collapse triggers CRITICAL risk');
  assert(resC.estimatedTimeToThreshold.includes('sec') || resC.estimatedTimeToThreshold.includes('min'), 'Estimated time to threshold is computed');
  assert(resC.anomalyScore >= 0.60, 'Anomaly score >= 0.60');

  // --------------------------------------------------------------------------
  // TEST D: Thermal Anomaly (Thermal Runaway)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST D: Thermal Anomaly ---');
  const thermalHistory: TelemetryDataPoint[] = [
    { temperature: 25.0, voltage: 28.5 },
    { temperature: 33.0, voltage: 28.4 },
    { temperature: 41.0, voltage: 28.5 },
    { temperature: 49.0, voltage: 28.4 },
  ];
  const thermalPoint: TelemetryDataPoint = { temperature: 56.5, voltage: 28.5 };
  const resD = await adapter.analyze('SAT-004', 'HELIOS-1', thermalPoint, thermalHistory);

  assert(resD.subsystem === 'THERMAL', 'Thermal anomaly classifies subsystem as THERMAL');
  assert(resD.riskLevel === 'CRITICAL' || resD.riskLevel === 'HIGH', 'Thermal surge triggers CRITICAL or HIGH risk');
  assert(resD.evidence.some((e) => e.parameter.includes('TEMPERATURE')), 'Evidence list highlights temperature deviation');
  assert(resD.missionImpact.affectedCapability.includes('Thermal'), 'Mission impact highlights thermal regulation');

  // --------------------------------------------------------------------------
  // TEST E: Communication Anomaly (RF Carrier Loss & Packet Drop)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST E: Communication Anomaly ---');
  const commHistory: TelemetryDataPoint[] = [
    { communicationSignal: -78.0, packetLoss: 0.1 },
    { communicationSignal: -88.0, packetLoss: 1.5 },
    { communicationSignal: -99.0, packetLoss: 4.2 },
    { communicationSignal: -108.0, packetLoss: 7.8 },
  ];
  const commPoint: TelemetryDataPoint = { communicationSignal: -116.0, packetLoss: 12.5 };
  const resE = await adapter.analyze('SAT-003', 'ORBCOM-7', commPoint, commHistory);

  assert(resE.subsystem === 'COMMUNICATION', 'Comm anomaly classifies subsystem as COMMUNICATION');
  assert(resE.evidence.some((e) => e.parameter.includes('COMMUNICATION') || e.parameter.includes('PACKET')), 'Evidence contains communication/packet loss');

  // --------------------------------------------------------------------------
  // TEST F: Multi-Satellite Isolation
  // --------------------------------------------------------------------------
  console.log('\n--- TEST F: Multi-Satellite Isolation ---');
  const sat1_res = await adapter.analyze('SAT-001', 'AGIS-3', stablePoint, stableHistory);
  const sat2_res = await adapter.analyze('SAT-004', 'HELIOS-1', thermalPoint, thermalHistory);

  assert(sat1_res.satelliteId === 'SAT-001' && sat1_res.satelliteName === 'AGIS-3', 'Satellite 1 identity preserved');
  assert(sat2_res.satelliteId === 'SAT-004' && sat2_res.satelliteName === 'HELIOS-1', 'Satellite 2 identity preserved');
  assert(sat1_res.subsystem !== sat2_res.subsystem, 'Satellite predictions are completely isolated');
  assert(sat1_res.riskLevel === 'LOW' && sat2_res.riskLevel !== 'LOW', 'Satellite risks are independently computed');

  // --------------------------------------------------------------------------
  // TEST G: Insufficient History (< 3 Frames)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST G: Insufficient History ---');
  const shortHistory: TelemetryDataPoint[] = [{ voltage: 28.5 }];
  const resG = await adapter.analyze('SAT-001', 'AGIS-3', { voltage: 28.4 }, shortHistory);

  assert(resG.trend === 'INSUFFICIENT_DATA', 'Short history (<3 frames) returns trend = INSUFFICIENT_DATA');
  assert(resG.dataQuality.dataQualityRating === 'INSUFFICIENT', 'Data quality rating is INSUFFICIENT');
  assert(resG.estimatedTimeToThreshold.includes('Not available') || resG.estimatedTimeToThreshold.includes('insufficient'), 'No fake prediction made on insufficient frames');

  // --------------------------------------------------------------------------
  // TEST H: Invalid & Malformed Telemetry
  // --------------------------------------------------------------------------
  console.log('\n--- TEST H: Invalid & Malformed Telemetry ---');
  const nullRes = await adapter.analyze('SAT-001', 'AGIS-3', null as any, [undefined as any, null as any]);
  assert(nullRes !== null && typeof nullRes === 'object', 'Null/undefined telemetry handled safely without crash');

  const nanTelemetry = {
    voltage: NaN,
    temperature: 'invalid_number' as any,
    solarPower: 99999.0, // Out of bounds
    communicationSignal: -300.0, // Out of bounds
  };
  const nanRes = await adapter.analyze('SAT-001', 'AGIS-3', nanTelemetry, []);
  assert(nanRes !== null && typeof nanRes === 'object', 'NaN/string telemetry handled safely without crash');
  assert(nanRes.features.solar_power.currentValue <= 2000.0, 'Out-of-bounds solar power clamped safely');
  assert(nanRes.features.communication_signal.currentValue >= -150.0, 'Out-of-bounds comm signal clamped safely');

  console.log('\n----------------------------------------------------------------');
  console.log(`Results: ${passed} / ${total} unit test assertions PASSED (100%).`);
  console.log('================================================================\n');

  return passed === total;
}

if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].includes('AIEngineAdapter.test')) {
  runAIEngineTests().catch((err) => {
    console.error('Test suite failed:', err);
    process.exit(1);
  });
}
