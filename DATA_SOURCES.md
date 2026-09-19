# Dataset Sources Registry

This project does not claim to use real NCRP complaint data, real Indian banking transactions, or live ATM withdrawal telemetry. The prototype uses a defensible multi-source strategy:

- public financial fraud datasets for transaction-pattern behaviour
- public geographic map data for ATM/POS spatial context
- derived rules to create complaint-to-transaction relationships where the original public data does not provide them
- synthetic demo records for complaint and withdrawal workflow coverage that cannot be publicly sourced under normal hackathon constraints

Required statement: The prototype does not use live NCRP, Indian banking, or ATM withdrawal telemetry. Public datasets are used for transaction/fraud behavioural modelling and geographic context. A reproducible synthetic cash-out simulation provides the complaint-to-withdrawal workflow and ATM ground truth required for prototype prediction experiments.

## PaySim (publicly downloadable synthetic financial transaction reference)

- Exact dataset name: PaySim1
- Official URL: https://www.kaggle.com/datasets/ealaxi/paysim1
- Publisher: Kaggle dataset publisher; based on a simulated mobile-money system
- Actual fields: step, type, amount, nameOrig, oldbalanceOrg, newbalanceOrig, nameDest, oldbalanceDest, newbalanceDest, isFraud, isFlaggedFraud
- Provides: transaction behaviour, transfer/cash-out types, amounts, relative time steps, account identifiers, and fraud labels
- Does not provide: NCRP complaints, Indian banking telemetry, ATM coordinates, or actual ATM withdrawals
- Label provenance: isFraud is original; cash_out_label is derived from type=CASH_OUT by this project
- License/access: Kaggle dataset terms; download locally before ingestion
- Public status: PUBLIC DATASET, but synthetic source data rather than real banking telemetry
- Adapter status: supported by data/pipeline/publicAdapters.mjs; no local file was present during this run

## 1) IEEE-CIS Fraud Detection (public transaction-fraud reference)

- Exact dataset name: IEEE-CIS Fraud Detection
- Official URL: https://www.kaggle.com/competitions/ieee-fraud-detection
- Publisher: Vesta Corporation and IEEE-CIS
- Dataset description: Public transaction fraud challenge dataset used for behaviour-based fraud modelling. It contains transaction-level fields with a binary fraud target.
- Actual columns: TransactionID, isFraud, TransactionDT, TransactionAmt, ProductCD, card1-card6, addr1, addr2, dist1, dist2, P_emaildomain, R_emaildomain, C1-C14, D1-D15, M1-M9, V1-V339, id_01-id_38
- Record count: approximately 590,000 transaction rows in the public competition dataset
- Fraud label availability: Yes, isFraud
- Timestamp availability: Yes, TransactionDT
- Amount availability: Yes, TransactionAmt
- Source/destination/account identifiers: Yes, card-level identifiers and transaction IDs; no complaint ID or direct ATM withdrawal ID
- Geographic information: Partial/limited address-derived fields; not ATM-level geospatial coordinates
- ATM/withdrawal information: No direct ATM withdrawal record set
- License/access: Kaggle competition terms; public for competition use but not unrestricted commercial production data
- Public status: PUBLIC
- Can it contribute to SIH26184: Yes, as a behavioural fraud reference for transaction-risk modelling and anomaly patterns

## 2) European Credit Card Fraud Dataset (public transaction-fraud pattern reference)

- Exact dataset name: Credit Card Fraud Detection
- Official URL: https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud
- Publisher: Worldline and the Université Libre de Bruxelles (via Kaggle)
- Dataset description: Public anonymized credit-card fraud dataset containing PCA-transformed transaction features and a fraud label. This is not complaint or ATM data.
- Actual columns: Time, V1 to V28, Amount, Class
- Record count: 284,807 rows
- Fraud label availability: Yes, Class
- Timestamp availability: Yes, Time (seconds since first transaction)
- Amount availability: Yes, Amount
- Source/destination/account identifiers: No direct account or complaint IDs; features are anonymized and transformed
- Geographic information: No
- ATM/withdrawal information: No
- License/access: Kaggle dataset terms; public for study use
- Public status: PUBLIC
- Can it contribute to SIH26184: Yes, as a benchmark for fraudulent transaction behaviour and anomaly patterns, but not as an NCRP/Indian ATM dataset

## 3) OpenStreetMap (public geographic context)

- Exact dataset name: OpenStreetMap
- Official URL: https://www.openstreetmap.org
- Publisher: OpenStreetMap contributors
- Dataset description: Public map/geographic base data used for place names, roads, districts, and coordinates. It is not a financial transaction dataset.
- Actual fields: map geometry, coordinates, road names, POIs, building footprints, city/area labels
- Record count: varies by region and tile/feature set; not a static transaction record set
- Fraud label availability: No
- Timestamp availability: No
- Amount availability: No
- Source/destination/account identifiers: No
- Geographic information: Yes, strongly
- ATM/withdrawal information: Not directly; it provides map context only
- License/access: Open Database License (ODbL)
- Public status: PUBLIC
- Can it contribute to SIH26184: Yes, for ATM/POS location geography, spatial routing, and hotspot visualization, but not for transactional fraud ground truth

## 4) UCI Default of Credit Card Clients (not used as fraud transaction data)

- Exact dataset name: Default of Credit Card Clients
- Official URL: https://archive.ics.uci.edu/dataset/350/default+of+credit+card+clients
- Publisher: UCI Machine Learning Repository
- Dataset description: Payment default prediction dataset for customer repayment behaviour. This is a customer-default dataset, not a transaction-fraud dataset and not an ATM withdrawal dataset.
- Actual columns: LIMIT_BAL, SEX, EDUCATION, MARRIAGE, AGE, PAY_0 to PAY_6, BILL_AMT1 to BILL_AMT6, PAY_AMT1 to PAY_AMT6, default payment next month
- Record count: 30,000 customer records
- Fraud label availability: No direct fraud label; it contains a default-payment target
- Timestamp availability: No transaction timestamps
- Amount availability: Partial payment/bill amounts, but not transaction-level fraud amounts
- Source/destination/account identifiers: Customer-level fields only; no complaint or ATM linkage
- Geographic information: No
- ATM/withdrawal information: No
- License/access: UCI repository terms for research use
- Public status: PUBLIC
- Can it contribute to SIH26184: Not as direct transactional fraud data. It is kept only as a cautionary reference to avoid mislabelling.

## 5) Synthetic Demo Dataset (used for the MVP workflow)

- Exact dataset name: SIH26184 Synthetic Demo Dataset
- Official URL: local project dataset under data/synthetic/
- Publisher: Project-generated synthetic workflow dataset
- Dataset description: Complaint-to-account-to-transaction-to-withdrawal-to-prediction workflow used to demonstrate the application end-to-end.
- Actual columns: complaint ID, account ID, transaction ID, source/destination account, amount, timestamp, risk, ATM/POS metadata, coordinates, prediction score
- Record count: 24 complaints, 50 accounts, 1,200 transactions, 150 withdrawals, 20 ATM/POS locations, 12 predictions
- Fraud label availability: synthetic fraud-status/risk flags only
- Timestamp availability: Yes
- Amount availability: Yes
- Source/destination/account identifiers: Yes
- Geographic information: Yes, via ATM/POS coordinates
- ATM/withdrawal information: Yes
- License/access: Internal project demo dataset
- Public status: SYNTHETIC
- Can it contribute to SIH26184: Yes, for application demonstration, API validation, and end-to-end workflow testing

## Final source usage in this project

The project uses:

1. Public fraud transaction datasets only as behavioural references.
2. OpenStreetMap only as geographic context for ATM/POS positions.
3. Derived rules to bridge public transaction behaviour to complaint and withdrawal workflow concepts.
4. Synthetic demo data for the actual complaint-to-withdrawal lifecycle used in the MVP.

This keeps the prototype factual, explainable, and defensible for SIH judges while avoiding false claims about NCRP or Indian banking data.

## ML pipeline artifacts

The larger synthetic ML corpus is generated separately from the small dashboard demo dataset. It is available under `data/processed/` after running `npm run generate:ml` and contains case-level ground truth, transaction sequences, withdrawal events, ATM candidates, and fixed TRAIN/VALIDATION/TEST assignments. These artifacts are SYNTHETIC and are not public NCRP, Indian banking, or ATM telemetry.
