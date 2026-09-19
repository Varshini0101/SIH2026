import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { demoPredictionInput } from '../data/demoData.js'

const require = createRequire(import.meta.url)
const { groupCandidatesByCase, parseCsvFile } = require('../../prediction-engine/atmRanking.js')
const { predictTimeToCashoutForCase } = require('../../prediction-engine/timeToCashout.js')

const normalizePredictionScore = (score) => Math.min(Math.max(Math.round(score), 0), 100)
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../')
const candidateCsvPath = path.join(projectRoot, 'data/processed/atm_ranking_candidates.csv')
const atmLocationsPath = path.join(projectRoot, 'data/processed/atm_locations.csv')

const caseAliasMap = new Map([
  ['CMP-1001', 'CASE-00001'],
  ['CMP-1002', 'CASE-00002'],
  ['CMP-1003', 'CASE-00003'],
  ['CMP-1004', 'CASE-00004'],
  ['CMP-1005', 'CASE-00005'],
  ['CMP-1006', 'CASE-00006']
])

const buildPredictionSummary = ({ rankedCandidates = [], totalCandidates = 0, timeToCashout = null }) => {
  const candidates = Array.isArray(rankedCandidates) ? rankedCandidates : []
  const count = Number.isFinite(Number(totalCandidates)) ? Number(totalCandidates) : candidates.length
  const topCandidate = candidates.length ? candidates.reduce((best, current) => {
    const bestScore = Number(best?.score ?? 0)
    const currentScore = Number(current?.score ?? 0)
    return currentScore > bestScore ? current : best
  }, candidates[0]) : null

  const topLocation = topCandidate?.atmId || null
  const timeWindow = timeToCashout?.timeWindow || 'Unavailable'
  const confidence = timeToCashout?.confidence ? String(timeToCashout.confidence).toUpperCase() : 'UNKNOWN'
  const topScore = Number(topCandidate?.score ?? 0)
  const estimatedMinutes = Number(timeToCashout?.estimatedMinutes ?? 0)

  let cashOutRisk = 'LOW'

  if (topScore >= 0.8 && estimatedMinutes >= 120) {
    cashOutRisk = 'HIGH'
  } else if (topScore >= 0.6 || estimatedMinutes >= 60) {
    cashOutRisk = 'MEDIUM'
  } else if (topScore > 0 || estimatedMinutes > 0) {
    cashOutRisk = 'LOW'
  } else {
    cashOutRisk = 'UNKNOWN'
  }

  return {
    cashOutRisk,
    predictedTimeWindow: timeWindow,
    confidence,
    topLocation,
    topLocationsCount: count || candidates.length
  }
}

export const generatePredictionForCase = (caseId) => {
  const targetCaseId = caseAliasMap.get(caseId) || caseId
  const candidateRows = parseCsvFile(candidateCsvPath).filter(entry => entry.case_id === targetCaseId)
  const atmRows = parseCsvFile(atmLocationsPath)
  const atmMap = new Map(atmRows.map(atm => [atm.atm_id, atm]))

  if (candidateRows.length > 0) {
    const rankedGroup = groupCandidatesByCase(candidateRows)[0]
    const ranked = rankedGroup?.ranked_candidates ?? []
    const predictions = ranked.map((cand, idx) => {
      const atm = atmMap.get(cand.candidate_atm_id)
      const score = Math.min(100, Math.max(10, Math.round(Number(cand.overall_score || 0) * 100)))
      return {
        locationName: atm ? `${atm.atm_name} (${atm.city})` : `ATM Target ${cand.candidate_atm_id}`,
        atmId: cand.candidate_atm_id,
        latitude: atm ? Number(atm.latitude) : 13.0827 + (idx * 0.01),
        longitude: atm ? Number(atm.longitude) : 80.2707 + (idx * 0.01),
        predictionScore: score,
        riskLevel: score >= 80 ? 'HIGH' : score >= 60 ? 'MEDIUM' : 'LOW',
        explanation: `Ranked #${cand.rank} candidate based on regional match (${Math.round((cand.feature_scores?.regional_match || 0)*100)}%), time compatibility (${Math.round((cand.feature_scores?.time_compatibility || 0)*100)}%), and historical area score.`
      }
    })

    return {
      caseId,
      suspiciousAccount: `SBIN000${targetCaseId.slice(-4)}`,
      predictions
    }
  }

  const caseData = demoPredictionInput.find((entry) => entry.caseId === caseId)

  if (!caseData) {
    return {
      caseId,
      predictions: [],
      message: 'No prediction data available for this case.'
    }
  }

  return {
    caseId,
    suspiciousAccount: caseData.suspiciousAccount,
    predictions: caseData.candidateLocations.map((location) => ({
      locationName: location.name,
      atmId: location.id,
      latitude: location.latitude,
      longitude: location.longitude,
      predictionScore: normalizePredictionScore(location.score),
      riskLevel: location.score >= 85 ? 'HIGH' : location.score >= 70 ? 'MEDIUM' : 'LOW',
      explanation: `${caseData.recentActivity}. Based on ${caseData.behavioralPattern} and historical withdrawal frequency.`
    }))
  }
}

export const generateAtmRankingForCase = (caseId) => {
  const rows = parseCsvFile(candidateCsvPath)
  const caseRows = rows.filter((entry) => entry.case_id === caseId)
  const timeToCashout = predictTimeToCashoutForCase(caseId)

  if (!caseRows.length) {
    const atmRows = parseCsvFile(atmLocationsPath)
    const baselineRows = atmRows.map((atm, index) => ({
      case_id: caseId,
      candidate_atm_id: atm.atm_id,
      distance_from_last_activity: index + 1,
      distance_from_previous_withdrawal: index + 1,
      regional_match: 0.5,
      time_compatibility: 0.5,
      historical_area_score: 0.5,
      is_actual_withdrawal: 0
    }))
    const rankedBaseline = groupCandidatesByCase(baselineRows)[0]?.ranked_candidates ?? []
    const normalizedBaseline = rankedBaseline.map((candidate) => ({
      atmId: candidate.candidate_atm_id,
      rank: candidate.rank,
      score: candidate.overall_score,
      featureScores: {
        distance: candidate.feature_scores.distance,
        distanceFromLastActivity: candidate.distance_from_last_activity,
        distanceFromPreviousWithdrawal: candidate.distance_from_previous_withdrawal,
        regionalMatch: candidate.feature_scores.regional_match,
        timeCompatibility: candidate.feature_scores.time_compatibility,
        historicalAreaScore: candidate.feature_scores.historical_area_score
      }
    }))

    return {
      caseId,
      rankedCandidates: normalizedBaseline,
      totalCandidates: normalizedBaseline.length,
      timeToCashout: {
        ...timeToCashout,
        estimatedMinutes: 60,
        estimatedHours: 1,
        timeWindow: '1 hour',
        confidence: 'low',
        source: 'baseline estimate for new complaint'
      },
      predictionSummary: buildPredictionSummary({
        rankedCandidates: normalizedBaseline,
        totalCandidates: normalizedBaseline.length,
        timeToCashout: {
          ...timeToCashout,
          estimatedMinutes: 60,
          timeWindow: '1 hour',
          confidence: 'low'
        }
      }),
      message: 'Baseline ATM ranking generated because this new case has no historical ML record.'
    }
  }

  const rankedCandidates = groupCandidatesByCase(caseRows)[0]?.ranked_candidates ?? []
  const normalizedCandidates = rankedCandidates.map((candidate) => ({
    atmId: candidate.candidate_atm_id,
    rank: candidate.rank,
    score: candidate.overall_score,
    featureScores: {
      distance: candidate.feature_scores.distance,
      distanceFromLastActivity: candidate.distance_from_last_activity,
      distanceFromPreviousWithdrawal: candidate.distance_from_previous_withdrawal,
      regionalMatch: candidate.feature_scores.regional_match,
      timeCompatibility: candidate.feature_scores.time_compatibility,
      historicalAreaScore: candidate.feature_scores.historical_area_score
    }
  }))

  return {
    caseId,
    rankedCandidates: normalizedCandidates,
    totalCandidates: normalizedCandidates.length,
    timeToCashout,
    predictionSummary: buildPredictionSummary({ rankedCandidates: normalizedCandidates, totalCandidates: normalizedCandidates.length, timeToCashout })
  }
}

export const getDashboardPredictions = () => demoPredictionInput
