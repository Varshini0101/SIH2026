const fs = require('fs');
const path = require('path');

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result.map((value) => value.trim());
}

function parseCsvFile(filePath) {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`CSV file not found: ${absolutePath}`);
  }

  const content = fs.readFileSync(absolutePath, 'utf8');
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] !== undefined ? values[index] : '';
    });
    return row;
  });
}

function readNumeric(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeDistance(value, minValue, maxValue, preferHigher = false) {
  if (maxValue === minValue) {
    return 1;
  }

  const numericValue = readNumeric(value, minValue);
  const normalized = (numericValue - minValue) / (maxValue - minValue);
  return preferHigher ? normalized : 1 - normalized;
}

function clamp(value, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

const DEFAULT_FEATURE_WEIGHTS = {
  distance: 0.55,
  regional_match: 0.05,
  time_compatibility: 0.25,
  historical_area_score: 0.15,
};

function getFeatureWeights() {
  return {
    ...DEFAULT_FEATURE_WEIGHTS,
  };
}

function scoreDistanceCandidate(candidates, columnName) {
  const values = candidates.map((candidate) => readNumeric(candidate[columnName], 0));
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  return candidates.map((candidate) => {
    const score = normalizeDistance(candidate[columnName], minValue, maxValue, true);
    return {
      ...candidate,
      [columnName]: readNumeric(candidate[columnName], 0),
      featureScore: clamp(score),
    };
  });
}

function rankCandidates(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return [];
  }

  const featureWeights = getFeatureWeights();
  const distanceLastValues = candidates.map((candidate) => readNumeric(candidate.distance_from_last_activity, 0));
  const distancePrevValues = candidates.map((candidate) => readNumeric(candidate.distance_from_previous_withdrawal, 0));

  const lastDistanceMin = Math.min(...distanceLastValues);
  const lastDistanceMax = Math.max(...distanceLastValues);
  const prevDistanceMin = Math.min(...distancePrevValues);
  const prevDistanceMax = Math.max(...distancePrevValues);

  const ranked = candidates.map((candidate) => {
    const distanceLast = readNumeric(candidate.distance_from_last_activity, 0);
    const distancePrevious = readNumeric(candidate.distance_from_previous_withdrawal, 0);

    const distanceLastScore = normalizeDistance(distanceLast, lastDistanceMin, lastDistanceMax, false);
    const distancePreviousScore = normalizeDistance(distancePrevious, prevDistanceMin, prevDistanceMax, false);
    const distanceScore = (distanceLastScore + distancePreviousScore) / 2;

    const regionalMatchScore = clamp(readNumeric(candidate.regional_match, 0));
    const timeCompatibilityScore = clamp(readNumeric(candidate.time_compatibility, 0));
    const historicalAreaScore = clamp(readNumeric(candidate.historical_area_score, 0));

    const overallScore = (
      featureWeights.distance * distanceScore +
      featureWeights.regional_match * regionalMatchScore +
      featureWeights.time_compatibility * timeCompatibilityScore +
      featureWeights.historical_area_score * historicalAreaScore
    );

    return {
      case_id: candidate.case_id,
      candidate_atm_id: candidate.candidate_atm_id,
      distance_from_last_activity: distanceLast,
      distance_from_previous_withdrawal: distancePrevious,
      is_actual_withdrawal: readNumeric(candidate.is_actual_withdrawal, 0),
      feature_scores: {
        distance: Number(distanceScore.toFixed(6)),
        distance_from_last_activity: Number(distanceLastScore.toFixed(6)),
        distance_from_previous_withdrawal: Number(distancePreviousScore.toFixed(6)),
        regional_match: Number(regionalMatchScore.toFixed(6)),
        time_compatibility: Number(timeCompatibilityScore.toFixed(6)),
        historical_area_score: Number(historicalAreaScore.toFixed(6)),
      },
      overall_score: Number(overallScore.toFixed(6)),
      rank: 0,
    };
  });

  ranked.sort((left, right) => right.overall_score - left.overall_score);

  return ranked.map((candidate, index) => ({
    ...candidate,
    rank: index + 1,
  }));
}

function groupCandidatesByCase(candidates) {
  const grouped = new Map();

  candidates.forEach((candidate) => {
    if (!grouped.has(candidate.case_id)) {
      grouped.set(candidate.case_id, []);
    }
    grouped.get(candidate.case_id).push(candidate);
  });

  return Array.from(grouped.entries()).map(([caseId, caseCandidates]) => ({
    case_id: caseId,
    ranked_candidates: rankCandidates(caseCandidates),
  }));
}

function calculateAccuracyAtK(caseRows, topK) {
  return caseRows.reduce((total, entry) => {
    const actualCandidateId = entry.ranked_candidates.find((candidate) => candidate.is_actual_withdrawal === 1)?.candidate_atm_id;
    if (!actualCandidateId) {
      return total;
    }

    const topCandidates = entry.ranked_candidates.slice(0, topK).map((candidate) => candidate.candidate_atm_id);
    return total + (topCandidates.includes(actualCandidateId) ? 1 : 0);
  }, 0) / caseRows.length;
}

function evaluateRanking(caseRows) {
  const validCases = caseRows.filter((entry) => entry.ranked_candidates.some((candidate) => candidate.is_actual_withdrawal === 1));

  if (validCases.length === 0) {
    return {
      total_cases: 0,
      top_1_accuracy: 0,
      top_3_accuracy: 0,
      top_5_accuracy: 0,
    };
  }

  return {
    total_cases: validCases.length,
    top_1_accuracy: Number(calculateAccuracyAtK(validCases, 1).toFixed(6)),
    top_3_accuracy: Number(calculateAccuracyAtK(validCases, 3).toFixed(6)),
    top_5_accuracy: Number(calculateAccuracyAtK(validCases, 5).toFixed(6)),
  };
}

function buildRankingReportFromCsv(csvFilePath) {
  const rows = parseCsvFile(csvFilePath);
  const grouped = groupCandidatesByCase(rows);

  return {
    total_candidates: rows.length,
    total_cases: grouped.length,
    ranked_cases: grouped,
    evaluation: evaluateRanking(grouped),
  };
}

module.exports = {
  parseCsvFile,
  normalizeDistance,
  rankCandidates,
  groupCandidatesByCase,
  evaluateRanking,
  buildRankingReportFromCsv,
};

if (require.main === module) {
  const csvPath = path.resolve(__dirname, '../data/processed/atm_ranking_candidates.csv');
  const report = buildRankingReportFromCsv(csvPath);

  console.log('Top-1 accuracy:', report.evaluation.top_1_accuracy);
  console.log('Top-3 accuracy:', report.evaluation.top_3_accuracy);
  console.log('Top-5 accuracy:', report.evaluation.top_5_accuracy);

  const firstCase = report.ranked_cases[0];
  if (firstCase) {
    console.log('\nSample ranked candidates for case', firstCase.case_id);
    console.log(JSON.stringify(firstCase.ranked_candidates.slice(0, 5), null, 2));
  }
}
