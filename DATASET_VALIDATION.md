# Dataset Validation Report

## Summary

This report validates the current foundation dataset used by the SIH26184 MVP. The dataset is intentionally labelled as:

DATA SOURCE: Synthetic Demo Dataset

PURPOSE: Application demonstration and end-to-end workflow testing.

This synthetic dataset is used alongside public behavioural and geographic references from public datasets, but it is not described as real NCRP or Indian banking data.

## Core validation checks

| Check                                                            | Result                                   |
| ---------------------------------------------------------------- | ---------------------------------------- |
| UCI Default of Credit Card Clients mislabelled as fraud dataset  | Fixed; excluded from direct fraud claims |
| Public source list verified                                      | Yes                                      |
| OpenStreetMap described as geographic data                       | Yes                                      |
| Synthetic data clearly labelled                                  | Yes                                      |
| Derived data clearly labelled                                    | Yes                                      |
| Complaint/account/transaction/withdrawal relationships traceable | Yes                                      |
| Duplicate IDs                                                    | 0                                        |
| Invalid amounts                                                  | 0                                        |
| Invalid timestamps                                               | 0                                        |
| Invalid coordinates                                              | 0                                        |
| Foreign key consistency                                          | 100% for synthetic workflow records      |
| API compatibility with MVP                                       | Verified                                 |

## Current synthetic dataset counts

| Entity            | Count |
| ----------------- | ----: |
| Complaints        |    24 |
| Accounts          |    50 |
| Transactions      | 1,200 |
| Withdrawals       |   150 |
| ATM/POS locations |    20 |
| Predictions       |    12 |

## Transaction risk distribution

The synthetic transaction layer is designed to include both suspicious and normal activity.

| Status     |       Count |
| ---------- | ----------: |
| SUSPICIOUS | Approx. 20% |
| CLEAR      | Approx. 80% |

## Relationship validation

- Each complaint references a suspected account.
- Each account has multiple transactions.
- Each suspicious account has a plausible withdrawal pattern.
- Each withdrawal references a valid ATM/POS ID with coordinates.
- Each prediction references a complaint and candidate ATM/POS.

## Geographic validation

- ATM/POS coordinates are valid decimal lat/long values within realistic Indian metro ranges.
- Locations span multiple cities and areas, including Chennai, Bengaluru, Hyderabad, Coimbatore, and Pune.

## Final assessment

The synthetic demo dataset is valid for the MVP workflow and matches the application requirements for an explainable complaint-to-transaction-to-withdrawal decision flow. It is not misrepresented as live NCRP intelligence or real banking data, and it remains suitable for demonstration, testing, and future ML replacement without rewriting the application architecture.

## ML corpus validation

The larger model-development corpus is generated separately from the UI/demo records and independently checked by `npm run validate:data`.

| Entity                | Count |
| --------------------- | ----: |
| Cases                 |   600 |
| Transactions          | 5,090 |
| Withdrawal events     |   598 |
| ATM/POS locations     |   120 |
| Candidate ATM records | 4,800 |
| TRAIN cases           |   420 |
| VALIDATION cases      |    90 |
| TEST cases            |    90 |

The latest validation run reported zero issues for duplicate IDs, invalid amounts, invalid timestamps, invalid coordinates, broken case/transaction/ATM links, duplicate candidate records, missing cash-out ground truth, and case split leakage. The generator uses seed 42 by default and repeated runs produced identical training-file hashes.

## Public ingestion validation

`npm run normalize:public` completed without fabricated rows. PaySim, IEEE-CIS, and European-card source directories currently contain no downloaded CSV files, so all three are recorded as `NO_LOCAL_FILE`. The normalized public output contains no records; this is an honest access state, not a claim of public-data training.

When source files are supplied, `publicAdapters.mjs` validates the available source columns and preserves unavailable complaint, ATM, coordinate, and destination fields as null. PaySim `cash_out_label` is explicitly derived from its `type` field; its `isFraud` label remains original.

## Leakage and ground-truth validation

- Case-level train/validation/test assignment is preserved.
- No transaction sequence crosses split boundaries.
- `ml_training.csv` excludes actual withdrawal ATM/time/amount and time-to-cash-out fields.
- Each cash-out case has exactly one positive ATM candidate label.
- Non-cash-out cases have zero positive ATM candidate labels.
