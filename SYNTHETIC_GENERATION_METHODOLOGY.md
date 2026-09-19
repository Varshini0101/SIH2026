# Synthetic Cash-Out Generation Methodology

## Purpose

The generated ML corpus is separate from the existing small demo dataset. It provides a reproducible foundation for later model work without changing the current dashboard or API contracts.

The prototype does not use live NCRP, Indian banking, or ATM withdrawal telemetry. Public fraud datasets provide labelled transaction behaviour, while synthetic/derived data provides the complaint-to-cash-out workflow and ground truth required for prototype prediction experiments.

## Generator

Run from the repository root:

```powershell
node data/pipeline/generateSyntheticML.mjs
npm run normalize:public
npm run validate:data
```

Configuration uses environment variables:

- `SEED=42`
- `CASES=600`
- `ACCOUNTS=1400`
- `ATMS=120`
- `FRAUD_RATIO=0.45`
- `CASHOUT_RATIO=0.9`

The generator uses a seeded PRNG and a fixed base timestamp. Running it with the same options produces the same records.

## Behaviour patterns

- `NORMAL`: normal account activity with no cash-out ground truth
- `RAPID`: fraud transfer followed by cash-out within minutes
- `MULTI_HOP`: victim to mule A to mule B/C before cash-out
- `PROXIMITY`: activity and withdrawal near the same synthetic region
- `DELAYED`: a longer waiting period before cash-out
- `MULTI_CANDIDATE`: multiple geographically plausible ATM/POS candidates

Cases include normal, suspicious, and fraudulent transactions, amount decay across hops, failed withdrawal attempts, multiple transaction time gaps, geographic variation, and different account behaviours.

## Ground truth

Every cash-out case includes:

- `case_id`
- `fraud_label`
- `cashout_label`
- `actual_withdrawal_atm_id`
- `actual_withdrawal_latitude`
- `actual_withdrawal_longitude`
- `actual_withdrawal_time`
- `actual_withdrawal_amount`
- `transaction_sequence`
- `hop_count`
- `time_to_cashout`

`atm_ranking_candidates.csv` includes eight candidates per case and `is_actual_withdrawal` as the ranking label.

Exactly one candidate is labelled `is_actual_withdrawal=1` for each cash-out case, and no candidate is positive for a non-cash-out case. Actual withdrawal ATM/time/amount and `time_to_cashout` remain ground-truth fields in `ml_cases.csv`; they are not included in the pre-withdrawal feature columns in `ml_training.csv`.

## Case-level split

Cases, not individual rows, are assigned to TRAIN, VALIDATION, or TEST using a deterministic 70/15/15 bucket. All rows belonging to a case retain that split, preventing sequence leakage.

Future-information controls: candidate features do not use the actual ATM, withdrawal time, withdrawal amount, or cash-out label; the case-level training feature file excludes actual withdrawal fields and time-to-cashout. Those values are retained only as labels/audit data in `ml_cases.csv`, `ml_withdrawals.csv`, and candidate labels.

## Outputs

- `data/processed/ml_training.csv`
- `data/processed/ml_training_train.csv`
- `data/processed/ml_training_validation.csv`
- `data/processed/ml_training_test.csv`
- `data/processed/ml_cases.csv`
- `data/processed/ml_transactions.csv`
- `data/processed/ml_withdrawals.csv`
- `data/processed/atm_locations.csv`
- `data/processed/atm_ranking_candidates.csv`
- `data/documentation/ml_validation_report.json`
- `data/documentation/ml_validation_report.md`
- `data/documentation/ml_generation_manifest.json`
- `data/processed/public/public_transaction_normalized.csv`
- `data/processed/public/public_ingestion_report.json`
- `data/processed/public/public_ingestion_report.md`
