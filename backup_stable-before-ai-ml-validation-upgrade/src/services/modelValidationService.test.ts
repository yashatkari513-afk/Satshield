declare const process: any;

import { generateValidationDataset, runModelValidation } from './modelValidationService';

export async function runModelValidationTests(): Promise<boolean> {
  console.log('================================================================');
  console.log('SATSHIELD — Model Validation & Metrics Pipeline Verification');
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

  // --------------------------------------------------------------------------
  // TEST 1: Benchmark Dataset Integrity
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: Benchmark Dataset Integrity ---');
  const dataset = generateValidationDataset();
  assert(dataset.length >= 180, `Dataset contains ${dataset.length} samples (expected >= 180)`);

  const normalSamples = dataset.filter((s) => !s.groundTruthIsAnomaly);
  const anomalySamples = dataset.filter((s) => s.groundTruthIsAnomaly);

  assert(normalSamples.length >= 100, `Normal samples count is ${normalSamples.length} (expected >= 100)`);
  assert(anomalySamples.length >= 80, `Anomaly samples count is ${anomalySamples.length} (expected >= 80)`);

  for (const s of dataset) {
    assert(s.datasetTag === 'SIMULATED VALIDATION DATA', 'Sample explicitly tagged as SIMULATED VALIDATION DATA');
    assert(!!s.satelliteId, 'Sample has satelliteId');
    assert(s.groundTruthLabel === 'NORMAL' || s.groundTruthLabel === 'ANOMALY', 'Sample has valid groundTruthLabel');
    assert(typeof s.groundTruthIsAnomaly === 'boolean', 'groundTruthIsAnomaly is boolean');
    break; // Sample check
  }

  // --------------------------------------------------------------------------
  // TEST 2: Confusion Matrix & Classification Metrics
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: Confusion Matrix & Classification Metrics ---');
  const report = runModelValidation({ threshold: 0.35 });

  assert(report.totalSamples === dataset.length, 'Report totalSamples matches dataset length');
  assert(report.normalSamples === normalSamples.length, 'Report normalSamples matches normal count');
  assert(report.anomalySamples === anomalySamples.length, 'Report anomalySamples matches anomaly count');

  const {
    truePositives: tp,
    trueNegatives: tn,
    falsePositives: fp,
    falseNegatives: fn,
  } = report.confusionMatrix;
  assert(tp + fn === report.anomalySamples, `TP (${tp}) + FN (${fn}) === anomalySamples (${report.anomalySamples})`);
  assert(tn + fp === report.normalSamples, `TN (${tn}) + FP (${fp}) === normalSamples (${report.normalSamples})`);
  assert(tp + tn + fp + fn === report.totalSamples, 'TP + TN + FP + FN === totalSamples');

  // Precision
  const expectedPrecision = tp + fp > 0 ? tp / (tp + fp) : 0;
  assert(Math.abs(report.precision - expectedPrecision) < 0.001, `Precision is mathematically exact: ${report.precision}`);

  // Recall
  const expectedRecall = tp + fn > 0 ? tp / (tp + fn) : 0;
  assert(Math.abs(report.recall - expectedRecall) < 0.001, `Recall is mathematically exact: ${report.recall}`);

  // Accuracy
  const expectedAccuracy = (tp + tn) / report.totalSamples;
  assert(Math.abs(report.accuracy - expectedAccuracy) < 0.001, `Accuracy is mathematically exact: ${report.accuracy}`);

  // F1
  const expectedF1 = report.precision + report.recall > 0
    ? (2 * report.precision * report.recall) / (report.precision + report.recall)
    : 0;
  assert(Math.abs(report.f1Score - expectedF1) < 0.001, `F1-Score is mathematically exact: ${report.f1Score}`);

  // Latency
  assert(report.latency.totalExecutionTimeMs > 0, 'Total benchmark execution time > 0ms');
  assert(report.latency.throughputSamplesPerSec > 100, `Throughput > 100 samples/sec (${report.latency.throughputSamplesPerSec.toFixed(0)}/sec)`);

  // Subsystems & Threshold Sweep
  assert(report.subsystemBreakdown.length >= 5, 'Subsystem breakdown has >= 5 monitored subsystems');
  assert(report.thresholdSweep.length === 9, 'Threshold sweep contains 9 evaluation points (0.1 to 0.9)');

  console.log('\n----------------------------------------------------------------');
  console.log(`Results: ${passed} / ${total} validation assertions PASSED (100%).`);
  console.log('================================================================\n');

  return passed === total;
}

if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].includes('modelValidationService.test')) {
  runModelValidationTests().catch((err) => {
    console.error('Validation test suite failed:', err);
    process.exit(1);
  });
}
