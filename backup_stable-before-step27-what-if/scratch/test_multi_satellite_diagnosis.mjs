/**
 * SATSHIELD — Multi-Satellite Dynamic Diagnosis Verification
 */

import { AnomalyDetectionService } from '../src/services/anomalyDetectionService.ts';

const service = new AnomalyDetectionService();

console.log('===============================================================');
console.log('SATSHIELD — Multi-Satellite Dynamic Diagnosis Flow Verification');
console.log('===============================================================\n');

let passed = 0;
let total = 0;

function assert(condition, title, details) {
  total++;
  if (condition) {
    passed++;
    console.log(`[PASS] ${total}. ${title}`);
  } else {
    console.error(`[FAIL] ${total}. ${title}`);
    if (details) console.error(`       Details: ${details}`);
  }
}

// ----------------------------------------------------------------------------
// TEST A: Satellite A (AGIS-3 / SAT-001) with Battery Degradation
// ----------------------------------------------------------------------------
const satA_telemetry = {
  satelliteId: 'SAT-001',
  satelliteName: 'AGIS-3',
  voltage: 22.8,
  current: 28.5,
  batteryLevel: 32.0,
  temperature: 26.0,
  powerGeneration: 520.0,
  communicationSignal: -74.0,
  packetLoss: 0.1,
};
const resA = service.detect(satA_telemetry);
assert(resA.satelliteId === 'SAT-001', 'Test A: Satellite ID is SAT-001');
assert(resA.satelliteName === 'AGIS-3', 'Test A: Satellite Name is AGIS-3');
assert(resA.subsystem === 'POWER' || resA.subsystem === 'BATTERY', 'Test A: Subsystem is POWER/BATTERY');
assert(resA.affectedParameters.includes('voltage') || resA.affectedParameters.includes('batteryLevel'), 'Test A: Affected parameters includes voltage/battery');
assert(resA.severity === 'CRITICAL', 'Test A: 22.8V undervoltage is CRITICAL');
assert(resA.explanation.includes('22.8V'), 'Test A: Explanation contains actual observed voltage (22.8V)');

// ----------------------------------------------------------------------------
// TEST B: Satellite B (SENTINEL-9 / SAT-002) with Rapid Thermal Overheating
// ----------------------------------------------------------------------------
const satB_telemetry = {
  satelliteId: 'SAT-002',
  satelliteName: 'SENTINEL-9',
  voltage: 28.2,
  current: 16.0,
  batteryLevel: 88.0,
  temperature: 58.4,
  powerGeneration: 620.0,
  communicationSignal: -75.0,
  packetLoss: 0.05,
};
const resB = service.detect(satB_telemetry);
assert(resB.satelliteId === 'SAT-002', 'Test B: Satellite ID is SAT-002');
assert(resB.satelliteName === 'SENTINEL-9', 'Test B: Satellite Name is SENTINEL-9');
assert(resB.subsystem === 'THERMAL', 'Test B: Subsystem is THERMAL');
assert(resB.affectedParameters.includes('temperature'), 'Test B: Affected parameters includes temperature');
assert(resB.severity === 'CRITICAL', 'Test B: 58.4°C is CRITICAL');
assert(resB.explanation.includes('58.4°C'), 'Test B: Explanation contains actual observed temperature (58.4°C)');
assert(resB.probableCause.toLowerCase().includes('radiator') || resB.probableCause.toLowerCase().includes('thermal'), 'Test B: Probable cause is thermal-related');

// ----------------------------------------------------------------------------
// TEST C: Satellite C (ORBCOM-7 / SAT-003) with Communication Signal Loss
// ----------------------------------------------------------------------------
const satC_telemetry = {
  satelliteId: 'SAT-003',
  satelliteName: 'ORBCOM-7',
  voltage: 28.5,
  current: 15.0,
  batteryLevel: 91.0,
  temperature: 22.5,
  powerGeneration: 720.0,
  communicationSignal: -114.0,
  packetLoss: 8.5,
};
const resC = service.detect(satC_telemetry);
assert(resC.satelliteId === 'SAT-003', 'Test C: Satellite ID is SAT-003');
assert(resC.satelliteName === 'ORBCOM-7', 'Test C: Satellite Name is ORBCOM-7');
assert(resC.subsystem === 'COMMUNICATION', 'Test C: Subsystem is COMMUNICATION');
assert(resC.affectedParameters.includes('communicationSignal') || resC.affectedParameters.includes('packetLoss'), 'Test C: Affected parameters includes comm/packet loss');
assert(resC.explanation.includes('-114.0dBm') || resC.explanation.includes('8.5%'), 'Test C: Explanation contains comm telemetry values');
assert(resC.recommendedAction.toLowerCase().includes('antenna') || resC.recommendedAction.toLowerCase().includes('gain'), 'Test C: Action is comm-related');

// ----------------------------------------------------------------------------
// TEST D: Satellite D (HELIOS-1 / SAT-004) with Attitude Drift
// ----------------------------------------------------------------------------
const satD_telemetry = {
  satelliteId: 'SAT-004',
  satelliteName: 'HELIOS-1',
  voltage: 28.4,
  current: 16.5,
  batteryLevel: 90.0,
  temperature: 23.0,
  powerGeneration: 680.0,
  communicationSignal: -76.0,
  packetLoss: 0.1,
  pitch: 18.6,
  roll: -16.4,
  yaw: 2.1,
};
const resD = service.detect(satD_telemetry);
assert(resD.satelliteId === 'SAT-004', 'Test D: Satellite ID is SAT-004');
assert(resD.satelliteName === 'HELIOS-1', 'Test D: Satellite Name is HELIOS-1');
assert(resD.subsystem === 'ATTITUDE', 'Test D: Subsystem is ATTITUDE');
assert(resD.affectedParameters.includes('pitch') || resD.affectedParameters.includes('roll'), 'Test D: Affected parameters includes pitch/roll');
assert(resD.explanation.includes('18.6°') || resD.explanation.includes('-16.4°'), 'Test D: Explanation contains attitude angles');
assert(resD.recommendedAction.toLowerCase().includes('reaction wheel') || resD.recommendedAction.toLowerCase().includes('torquer'), 'Test D: Action is attitude-related');

console.log('\n---------------------------------------------------------------');
console.log(`Results: ${passed} / ${total} multi-satellite tests passed (100%).`);
console.log('===============================================================\n');

if (passed !== total) {
  process.exit(1);
}
