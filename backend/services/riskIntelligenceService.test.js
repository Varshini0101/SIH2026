import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateLocationRisk, calculatePriority, calibrateProbability, classifyRisk, explainAssessment, simulateFalsePositiveCost, validateSimulationInput } from './riskIntelligenceService.js'

test('classifies risk at configured boundaries', () => {
  assert.equal(classifyRisk(20), 'LOW')
  assert.equal(classifyRisk(21), 'MODERATE')
  assert.equal(classifyRisk(41), 'HIGH')
  assert.equal(classifyRisk(61), 'VERY HIGH')
  assert.equal(classifyRisk(81), 'CRITICAL')
})

test('calculates deterministic risk with missing values safely', () => {
  const result = calculateLocationRisk({ fraudProbability: 1, cashoutProbability: 1 })
  assert.equal(result.score, 45)
  assert.equal(result.level, 'HIGH')
  assert.equal(result.contribution.ponr_proximity, 0)
})

test('returns explainable priority contributions', () => {
  const result = calculatePriority({ fraudProbability: 1, cashoutProbability: 1, amountAtRisk: 1, timeUrgency: 1, locationProbability: 1, ponrProximity: 1, confidence: 1 })
  assert.equal(result.priorityScore, 100)
  assert.equal(Object.values(result.factorContributions).reduce((sum, value) => sum + value, 0), 100)
})

test('does not fabricate calibration without an artifact', () => {
  const result = calibrateProbability(0.82)
  assert.equal(result.status, 'unavailable')
  assert.equal(result.calibratedProbability, 0.82)
})

test('creates evidence linked to upstream modules', () => {
  const result = explainAssessment({ location: { id: 'atm-1', name: 'Test ATM' }, evidence: { fraudProbability: 0.9, cashoutProbability: 0.8, amountAtRisk: 1000, hopCount: 2, ponrTtlMinutes: 15, velocity: 20, timeToCashoutMinutes: 30 } })
  assert.equal(result.evidence.length, 7)
  assert.equal(result.evidence[0].sourceModule, 'Module 1')
})

test('simulates false-positive costs as estimates', () => {
  const result = simulateFalsePositiveCost({ predictionProbability: 0.8, amountAtRisk: 100000, interventionCost: 1000, estimatedRecoveryIfIntervened: 0.9, estimatedRecoveryIfMissed: 0.1 })
  assert.equal(result.simulationLabel, 'SIMULATED ESTIMATES')
  assert.equal(result.expectedRecovery, 74000)
  assert.equal(result.expectedLoss, 26000)
})

test('rejects invalid simulation input', () => {
  assert.equal(validateSimulationInput({ predictionProbability: 2 }).valid, false)
  assert.equal(validateSimulationInput({ predictionProbability: 0.5, amountAtRisk: 100, interventionCost: 10, estimatedRecoveryIfIntervened: 0.9, estimatedRecoveryIfMissed: 0.1 }).valid, true)
})
