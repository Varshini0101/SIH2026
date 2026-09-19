# PaySim Source Drop Folder

Place the licensed/downloaded PaySim CSV here. Official source: https://www.kaggle.com/datasets/ealaxi/paysim1

PaySim is synthetic financial transaction data from a simulated mobile-money system. It is not real banking telemetry, Indian transaction data, NCRP data, or ATM withdrawal telemetry.

The adapter reads `step`, `type`, `amount`, `nameOrig`, `oldbalanceOrg`, `newbalanceOrig`, `nameDest`, `oldbalanceDest`, `newbalanceDest`, `isFraud`, and `isFlaggedFraud`. `cash_out_label` is derived only from `type == CASH_OUT`.
