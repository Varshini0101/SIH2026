# Public Raw Data

Place downloaded public datasets here only when their license and redistribution terms allow it. Large files are intentionally not committed.

Supported adapters:

- IEEE-CIS Fraud Detection: `data/pipeline/publicAdapters.mjs`, adapter name `ieee-cis`
- European Credit Card Fraud Detection: `data/pipeline/publicAdapters.mjs`, adapter name `european-card`

The adapters preserve fields that are unavailable in the original source as null. They do not invent account destinations, ATM IDs, complaint IDs, or coordinates.
