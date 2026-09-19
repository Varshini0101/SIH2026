# Derived Data

This directory is reserved for deterministic transformations that connect public transaction behaviour to the unified application schema.

Derived records must retain provenance and must not be described as original NCRP, Indian banking, or ATM telemetry. The current synthetic ML generator writes its source-labelled outputs to `data/processed/`; future public-data ingestion can write normalized derived records here before model preparation.
