# Synthetic ML Dataset Validation

- Seed: 42
- Cases: 600
- Transactions: 5090
- Withdrawals: 598
- ATMs/POS: 120
- Candidate ATM records: 4800
- Fraud cases: 284
- Cash-out cases: 262
- Failed withdrawal attempts: 42

## Case-level split

| Split | Cases |
| --- | ---: |
| TRAIN | 420 |
| VALIDATION | 90 |
| TEST | 90 |

## Validation checks

All generated IDs, amounts, timestamps, coordinates, case links, transaction links, ATM references, candidate records, ground truth fields, and case-level split boundaries passed generation-time validation.

- Actual withdrawal candidate labels: 262
- Missing ground truth fields: 0
- Case split leakage: 0
