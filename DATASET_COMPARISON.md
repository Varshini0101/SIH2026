# Dataset Comparison and Selection

## Objective

The SIH26184 prototype needs a realistic, explainable, and defensible data foundation for:

Complaint -> suspicious account -> transactions -> risk score -> likely cash-out area -> withdrawal prediction

No single public source contains the full operational chain from NCRP complaint to Indian ATM withdrawal. The project therefore uses a multi-layer approach that is documented clearly and does not misrepresent data origins.

## Dataset selection table

| Dataset                                            | Source                     | Fraud Label           | Amount                       | Timestamp     | Accounts                 | Location               | ATM/Withdrawal                 | License                  | Usage                                                               |
| -------------------------------------------------- | -------------------------- | --------------------- | ---------------------------- | ------------- | ------------------------ | ---------------------- | ------------------------------ | ------------------------ | ------------------------------------------------------------------- |
| PaySim1                                            | Kaggle                     | Yes                   | Yes                          | Relative step | Yes                      | No                     | No                             | Kaggle terms             | Public mobile-money behaviour reference; not real banking telemetry |
| IEEE-CIS Fraud Detection                           | Kaggle / IEEE-CIS          | Yes                   | Yes                          | Yes           | Partial card identifiers | Partial address fields | No                             | Kaggle competition terms | Public behavioural fraud reference                                  |
| Credit Card Fraud Detection (European cardholders) | Kaggle / ULB               | Yes                   | Yes                          | Yes           | No direct account IDs    | No                     | No                             | Kaggle terms             | Public anomaly-pattern benchmark                                    |
| Default of Credit Card Clients                     | UCI ML Repository          | No direct fraud label | Partial bill/payment amounts | No            | Customer-level           | No                     | No                             | UCI repository terms     | Not used as direct fraud source; excluded from direct model claims  |
| OpenStreetMap                                      | OpenStreetMap contributors | No                    | No                           | No            | No                       | Yes                    | No direct ATM transaction data | ODbL                     | Public map context for ATM/POS geography                            |
| SIH26184 Synthetic Demo Dataset                    | Project-generated          | Synthetic risk flag   | Yes                          | Yes           | Yes                      | Yes                    | Yes                            | Internal project demo    | Main application workflow and validation dataset                    |

## Public dataset details

### 1) IEEE-CIS Fraud Detection

- Source: Kaggle competition dataset
- Official URL: https://www.kaggle.com/competitions/ieee-fraud-detection
- Publisher: Vesta Corporation and IEEE-CIS
- Record count: ~590k transaction rows in the public competition dataset
- Actual fields: TransactionID, isFraud, TransactionDT, TransactionAmt, ProductCD, card1-card6, addr1, addr2, dist1, dist2, P_emaildomain, R_emaildomain, C1-C14, D1-D15, M1-M9, V1-V339, id_01-id_38
- Why selected: strong public transaction-fraud behaviour reference with fraud labels and timestamps
- Limitations: not NCRP complaint data; not Indian banking data; no direct ATM withdrawal linkage

### 2) European credit-card fraud dataset

- Source: Kaggle / ULB
- Official URL: https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud
- Publisher: Worldline and Université Libre de Bruxelles
- Record count: 284,807 rows
- Actual fields: Time, V1-V28, Amount, Class
- Why selected: public fraud-pattern benchmark with real transaction behaviour and fraud label
- Limitations: anonymized features only; no complaint ID, account ID, ATM ID, or geographical coordinates

### 3) OpenStreetMap

- Source: OpenStreetMap contributors
- Official URL: https://www.openstreetmap.org
- Record count: varies by region and map tile
- Actual fields: coordinates, map geometry, roads, buildings, place names, city/area labels
- Why selected: spatial context for ATM/POS markers and hotspot visualization
- Limitations: map data only; no financial transaction, fraud, or complaint records

### 4) UCI Default of Credit Card Clients

- Source: UCI ML Repository
- Official URL: https://archive.ics.uci.edu/dataset/350/default+of+credit+card+clients
- Publisher: UCI
- Record count: 30,000 customer records
- Actual fields: repayment/default indicators and bill/payment amounts
- Why not used: it is not a fraud transaction dataset and does not represent NCRP or ATM withdrawal data
- Correct interpretation: payment-default modelling reference only, not financial fraud transaction ground truth

## Synthetic/derived workflow layer

The project uses a synthetic demo workflow to make the application functional and traceable:

- Complaints: 24
- Accounts: 50
- Transactions: 1,200
- Withdrawals: 150
- ATM/POS locations: 20
- Predictions: 12

The synthetic layer intentionally does not claim to be real NCRP, real Indian bank, or real ATM data. It is labelled as:

DATA SOURCE: Synthetic Demo Dataset

PURPOSE: Application demonstration and end-to-end workflow testing.

## Recommended final combination

The defensible foundation for SIH26184 is:

1. Public transaction-fraud data for general fraud-pattern behaviour
2. OpenStreetMap for geospatial context
3. Derived rules to connect suspicious transaction patterns to complaint and withdrawal workflow concepts
4. Synthetic demo data for the operational complaint and ATM-prediction chain required by the MVP

This approach keeps the app explainable, reproducible, and compliant with the official problem statement without making false claims about the data sources.

## ML foundation corpus

The project maintains a separate generated corpus for future model experimentation: 600 cases, 5,090 transactions, 598 withdrawal events, 120 synthetic ATM/POS records, and 4,800 candidate ATM rows. It is generated with a configurable seed and split by case to prevent transaction-sequence leakage. It does not replace the smaller application demo dataset.

## Public ingestion status

Run `npm run normalize:public` after placing licensed downloads in the source drop folders. The current run found no local PaySim, IEEE-CIS, or European-card CSV files, so `data/processed/public/public_transaction_normalized.csv` contains only its schema header and the report marks each source `NO_LOCAL_FILE`. No public rows were fabricated.

When files are available, the adapters preserve source fields, leave unavailable fields null, and write descriptive amount/type/fraud/cash-out distributions to `data/processed/public/public_ingestion_report.json` and `.md`. Public data is not concatenated with synthetic cases.
