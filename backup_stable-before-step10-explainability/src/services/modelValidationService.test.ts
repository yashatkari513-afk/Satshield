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

  // --------------------------------------------------------------------------
  // TEST 3: Multi-Threshold Empirical Sensitivity Validation (0.30, 0.50, 0.70, 0.80, 0.90)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: Multi-Threshold Empirical Sensitivity Validation ---');
  const testThresholds = [0.30, 0.50, 0.70, 0.80, 0.90];
  const thresholdResults: Record<number, any> = {};

  for (const th of testThresholds) {
    const thReport = runModelValidation({ threshold: th });
    thresholdResults[th] = thReport;

    const cm = thReport.confusionMatrix;
    assert(cm.truePositives + cm.falseNegatives === anomalySamples.length, `Threshold ${th.toFixed(2)}: TP(${cm.truePositives}) + FN(${cm.falseNegatives}) === ${anomalySamples.length}`);
    assert(cm.trueNegatives + cm.falsePositives === normalSamples.length, `Threshold ${th.toFixed(2)}: TN(${cm.trueNegatives}) + FP(${cm.falsePositives}) === ${normalSamples.length}`);
    assert(thReport.detectionThreshold === th, `Threshold ${th.toFixed(2)}: report reflects active threshold`);

    // Verify mathematical formulation
    const calcPrec = cm.truePositives + cm.falsePositives > 0 ? cm.truePositives / (cm.truePositives + cm.falsePositives) : 0;
    const calcRec = cm.truePositives + cm.falseNegatives > 0 ? cm.truePositives / (cm.truePositives + cm.falseNegatives) : 0;
    const calcF1 = calcPrec + calcRec > 0 ? (2 * calcPrec * calcRec) / (calcPrec + calcRec) : 0;

    assert(Math.abs(thReport.precision - calcPrec) < 0.001, `Threshold ${th.toFixed(2)}: Precision (${(thReport.precision * 100).toFixed(1)}%) is exact`);
    assert(Math.abs(thReport.recall - calcRec) < 0.001, `Threshold ${th.toFixed(2)}: Recall (${(thReport.recall * 100).toFixed(1)}%) is exact`);
    assert(Math.abs(thReport.f1Score - calcF1) < 0.001, `Threshold ${th.toFixed(2)}: F1 (${thReport.f1Score.toFixed(4)}) is exact`);
  }

  // Verify that threshold sensitivity produces expected ROC monotonic progression
  // (As threshold increases from 0.30 to 0.90, false alarms decrease or stay 0, and recall transitions from high to conservative)
  assert(thresholdResults[0.30].confusionMatrix.falsePositives >= thresholdResults[0.50].confusionMatrix.falsePositives, 'FP at 0.30 >= FP at 0.50 (Sensitivity decreases FP as threshold rises)');
  assert(thresholdResults[0.30].confusionMatrix.truePositives >= thresholdResults[0.90].confusionMatrix.truePositives, 'TP at 0.30 >= TP at 0.90 (Higher threshold requires higher confidence anomaly score)');

  console.log('\n--- VERIFIED THRESHOLD TEST MATRIX ---');
  console.log('Threshold | TP | TN  | FP | FN | Precision | Recall  | F1-Score');
  for (const th of testThresholds) {
    const r = thresholdResults[th];
    const c = r.confusionMatrix;
    console.log(`  ${th.toFixed(2)}    | ${String(c.truePositives).padStart(2, ' ')} | ${String(c.trueNegatives).padStart(3, ' ')} | ${String(c.falsePositives).padStart(2, ' ')} | ${String(c.falseNegatives).padStart(2, ' ')} |   ${(r.precision * 100).toFixed(1).padStart(5, ' ')}%  |  ${(r.recall * 100).toFixed(1).padStart(5, ' ')}% |  ${r.f1Score.toFixed(4)}`);
  }

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
