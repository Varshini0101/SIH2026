# Module 5: Risk Intelligence & Explainability

## Existing architecture integration

Module 5 is implemented as an authenticated Express service and React page. It does not train a new model or replace Modules 1–4.

- **Module 1 adapter:** reads existing transaction `riskScore`, suspicious status, and the existing time-to-cash-out engine's confidence/window.
- **Module 2 adapter:** reads the Module 4 graph, PONR queue, flow velocity, and recoverable amount-at-risk.
- **Module 3 adapter:** reads existing ATM/POS candidate ranking and location probability.
- **Authoritative calculation:** all risk, priority, evidence, and simulation calculations execute on the server.

The demo fallback remains deterministic and uses the same normalized objects returned by the database service. When MongoDB is available, the existing database service supplies the upstream transactions, ATM locations, and predictions.

## Scoring

Risk is a weighted 0–100 score:

| Factor | Weight |
| --- | ---: |
| Fraud probability | 25 |
| Cash-out probability | 20 |
| Amount at risk | 15 |
| Time urgency | 15 |
| Location probability | 10 |
| PONR proximity | 10 |
| Confidence | 5 |

Risk bands are `0–20 LOW`, `21–40 MODERATE`, `41–60 HIGH`, `61–80 VERY HIGH`, and `81–100 CRITICAL`. Every score returns the factor contribution map.

Interception priority uses the same explainable factors and returns a separate contribution map. It is a decision-support score, not an autonomous enforcement decision.

## Calibration policy

The repository contains validation labels, but no persisted model probability predictions or calibration artifact. Module 5 therefore returns the raw probability and:

```json
{
  "status": "unavailable",
  "message": "Calibration unavailable: no model probability/calibration artifact is stored."
}
```

The service has a Platt-scaling adapter for a future stored artifact, but it is not enabled with fabricated parameters.

## APIs

- `GET /api/risk-intelligence/:caseId`
  - Returns heatmap locations, risk bands, confidence/calibration state, priority ranking, evidence, and upstream provenance.
  - Recomputes on every request, so new transactions/predictions flow through without a client-side risk override.
- `POST /api/risk-intelligence/:caseId/simulate`
  - Body: `predictionProbability`, `amountAtRisk`, `interventionCost`, `estimatedRecoveryIfIntervened`, `estimatedRecoveryIfMissed`.
  - Validates ranges and returns `SIMULATED ESTIMATES`.

Both endpoints use the existing JWT authentication middleware.

## Frontend

`RiskIntelligencePage.jsx` adds the Module 5 workspace to the existing navigation. It uses the existing React Leaflet dependency for the risk heatmap and the existing UI tokens for ranking cards, explainability evidence, factor bars, and the simulator. No new frontend dependency was added.
