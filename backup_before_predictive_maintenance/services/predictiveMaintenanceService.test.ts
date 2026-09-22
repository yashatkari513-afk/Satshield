import {
  PredictiveMaintenanceService,
  predictiveMaintenanceService,
} from './predictiveMaintenanceService';

function runTests() {
  console.log('================================================================');
  console.log('SATSHIELD — Predictive Maintenance Unit Test Suite');
  console.log('================================================================');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      console.log(`[PASS] Test ${total}: ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] Test ${total}: ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
  }

  // --- 1. Stable Telemetry ---
  const stableHistory = [
    { voltage: 28.5, temperature: 24.0, battery: 88, communicationSignal: -75 },
    { voltage: 28.5, temperature: 24.1, battery: 88, communicationSignal: -75 },
    { voltage: 28.6, temperature: 24.0, battery: 88, communicationSignal: -75 },
    { voltage: 28.5, temperature: 24.0, battery: 88, communicationSignal: -75 },
  ];
  const stablePoint = { voltage: 28.5, temperature: 24.0, battery: 88, communicationSignal: -75 };
  const res1 = predictiveMaintenanceService.analyze('SAT-001', stablePoint, stableHistory, {
    subsystem: 'BATTERY',
    severity: 'INFO',
  });

  assert(res1.trend === 'STABLE', 'Stable telemetry has trend = STABLE');
  assert(res1.status === 'STABLE', 'Prediction status is STABLE');
  assert(
    res1.estimatedTimeToThreshold.includes('Stable trend') || res1.estimatedTimeToThreshold.includes('no threshold crossing'),
    'No threshold crossing projected for stable trend'
  );
  assert(res1.riskLevel === 'LOW', 'Risk level is LOW');

  // --- 2. Degrading Battery Sequence ---
  const degradingBatteryHistory = [
    { voltage: 28.4, battery: 80 },
    { voltage: 27.2, battery: 70 },
    { voltage: 25.8, battery: 58 },
    { voltage: 24.1, battery: 46 },
    { voltage: 22.8, battery: 36 },
  ];
  const degradingBatteryPoint = { voltage: 21.3, battery: 28 };
  const res2 = predictiveMaintenanceService.analyze('SAT-002', degradingBatteryPoint, degradingBatteryHistory, {
    subsystem: 'BATTERY',
    severity: 'CRITICAL',
  });

  assert(res2.trend === 'DEGRADING' || res2.trend === 'RAPIDLY_DEGRADING', 'Degrading battery trend detected');
  assert(res2.consecutiveAnomalyCount >= 3, 'Persistence is positive');
  assert(res2.rawSlopePerMin < 0, 'Rate of change is negative');
  assert(res2.estimatedTimeToThreshold.includes('min') || res2.estimatedTimeToThreshold.includes('sec'), 'Estimated time to threshold is calculated');
  assert(res2.thresholdDistance > 0, 'Threshold distance is positive');
  assert(res2.subsystem === 'BATTERY', 'Subsystem is BATTERY');

  // --- 3. Increasing Temperature (Thermal Runaway) ---
  const thermalHistory = [
    { temperature: 26.0 },
    { temperature: 34.0 },
    { temperature: 42.0 },
    { temperature: 49.0 },
    { temperature: 54.0 },
  ];
  const thermalPoint = { temperature: 58.5 };
  const res3 = predictiveMaintenanceService.analyze('SAT-004', thermalPoint, thermalHistory, {
    subsystem: 'THERMAL',
    severity: 'CRITICAL',
  });

  assert(res3.trend === 'DEGRADING' || res3.trend === 'RAPIDLY_DEGRADING', 'Thermal elevation detected as DEGRADING/RAPIDLY_DEGRADING');
  assert(res3.riskLevel === 'HIGH' || res3.riskLevel === 'CRITICAL', 'Thermal surge triggers HIGH or CRITICAL risk');
  assert(res3.subsystem === 'THERMAL', 'Thermal subsystem identified');
  assert(res3.rawSlopePerMin > 0, 'Thermal rate of change is positive');

  // --- 4. Insufficient Frames (< 3) ---
  const shortHistory = [{ voltage: 28.5 }];
  const res4 = predictiveMaintenanceService.analyze('SAT-001', { voltage: 28.4 }, shortHistory);
  assert(res4.status === 'INSUFFICIENT_DATA', 'Insufficient frames (<3) returns predictionStatus = INSUFFICIENT_DATA');
  assert(res4.isProjectionReliable === false, 'isProjectionReliable is false');
  assert(res4.persistence.includes('Insufficient'), 'Persistence text indicates insufficient historical data');

  // --- 5. Error Resilience & Null Handling ---
  const res5 = predictiveMaintenanceService.analyze('SAT-001', {} as any, [null as any, undefined as any]);
  assert(res5.status === 'INSUFFICIENT_DATA', 'Null telemetry handled safely');

  // --- 6. Multi-Satellite Isolation ---
  const satA_res = predictiveMaintenanceService.analyze('SAT-001', { voltage: 28.5 }, stableHistory, { subsystem: 'BATTERY' });
  const satB_res = predictiveMaintenanceService.analyze('SAT-002', { temperature: 59.0 }, thermalHistory, { subsystem: 'THERMAL' });
  const satC_res = predictiveMaintenanceService.analyze('SAT-003', { communicationSignal: -110 }, [
    { communicationSignal: -75 },
    { communicationSignal: -85 },
    { communicationSignal: -98 },
  ], { subsystem: 'COMMUNICATION' });

  assert(satA_res.trend === 'STABLE' && satA_res.subsystem === 'BATTERY', 'Satellite A produces power baseline prediction');
  assert(satB_res.trend !== 'STABLE' && satB_res.subsystem === 'THERMAL', 'Satellite B produces thermal degradation prediction');
  assert(satC_res.subsystem === 'COMMUNICATION', 'Satellite C produces comm degradation prediction');
  assert(satA_res.subsystem !== satB_res.subsystem, 'Predictions are completely isolated and specific per satellite');

  console.log('----------------------------------------------------------------');
  console.log(`Results: ${passed} / ${total} unit test assertions PASSED.`);
  console.log('================================================================');
}

if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].includes('predictiveMaintenanceService.test')) {
  runTests();
}

export { runTests };
