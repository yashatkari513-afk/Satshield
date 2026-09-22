const BASE_URL = 'http://127.0.0.1:8000';

const SATELLITES = [
  {
    name: 'AGIS-3',
    payload: {
      satellite_id: 'AGIS-3',
      temperature_c: 24.5,
      voltage_v: 28.5,
      current_a: 6.5,
      battery_soc_percent: 88.0,
      solar_power_w: 705.0,
      communication_signal_db: -79.68,
      vibration_g: 0.035,
      attitude_error_deg: 0.04
    }
  },
  {
    name: 'SENTINEL-9',
    payload: {
      satellite_id: 'SENTINEL-9',
      temperature_c: 38.0,
      voltage_v: 28.4,
      current_a: 6.5,
      battery_soc_percent: 74.0,
      solar_power_w: 660.0,
      communication_signal_db: -81.36,
      vibration_g: 0.035,
      attitude_error_deg: 0.04
    }
  },
  {
    name: 'ORBCOM-7',
    payload: {
      satellite_id: 'ORBCOM-7',
      temperature_c: 22.1,
      voltage_v: 28.8,
      current_a: 6.5,
      battery_soc_percent: 92.0,
      solar_power_w: 720.0,
      communication_signal_db: -78.84,
      vibration_g: 0.035,
      attitude_error_deg: 0.04
    }
  },
  {
    name: 'HELIOS-1',
    payload: {
      satellite_id: 'HELIOS-1',
      temperature_c: 42.6,
      voltage_v: 27.2,
      current_a: 6.5,
      battery_soc_percent: 72.0,
      solar_power_w: 592.5,
      communication_signal_db: -84.72,
      vibration_g: 0.035,
      attitude_error_deg: 0.04
    }
  }
];

async function runStep9Tests() {
  console.log('====================================================');
  console.log('STEP 9 REAL ML INTEGRATION TEST SUITE');
  console.log('====================================================\n');

  // 1. Check Health & ML Engine availability
  console.log('1. Checking Backend & Isolation Forest Health...');
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const healthData = await healthRes.json();
  console.log('Health Status:', JSON.stringify(healthData, null, 2));

  if (healthData.ml_model !== 'loaded') {
    throw new Error('ML Model is not loaded on backend!');
  }

  // 2. Test Real ML Inference for each satellite
  console.log('\n2. Testing Real IsolationForest Inference for 4 Satellites:');
  for (const sat of SATELLITES) {
    const res = await fetch(`${BASE_URL}/api/anomaly/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sat.payload)
    });
    const data = await res.json();
    console.log(`\nSatellite: ${sat.name}`);
    console.log(`- Prediction: ${data.prediction} (is_anomaly: ${data.is_anomaly})`);
    console.log(`- Raw Anomaly Score: ${data.raw_anomaly_score}`);
    console.log(`- Calibrated Score: ${data.anomaly_score}`);
    console.log(`- Model Type: ${data.model_type}`);
    console.log(`- Feature Count: ${data.feature_count}`);
    console.log(`- Model Status: ${data.model_status}`);
    console.log(`- Subsystem: ${data.subsystem}`);
    console.log(`- Evidence:`, data.evidence);
    console.log(`- Explanation: ${data.explanation}`);
  }

  // 3. Test Anomaly Simulation Scenario Trigger (Thermal Overheating on SENTINEL-9)
  console.log('\n3. Testing Scenario Trigger -> Real ML Inference:');
  const simRes = await fetch(`${BASE_URL}/api/anomaly/scenarios/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scenario_id_or_key: 'overheating',
      step: 4,
      satellite_id: 'SENTINEL-9'
    })
  });
  const simData = await simRes.json();
  console.log('Scenario Detection Result:');
  console.log(`- Scenario Name: ${simData.scenario.name}`);
  console.log(`- Prediction: ${simData.detection.prediction}`);
  console.log(`- Raw Anomaly Score: ${simData.detection.raw_anomaly_score}`);
  console.log(`- Subsystem: ${simData.detection.subsystem}`);
  console.log(`- Evidence:`, simData.detection.evidence);

  console.log('\n====================================================');
  console.log('ALL STEP 9 BACKEND ML ENDPOINTS TESTED SUCCESSFULLY!');
  console.log('====================================================');
}

runStep9Tests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
