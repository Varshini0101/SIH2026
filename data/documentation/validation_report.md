# Data Quality Validation Report

## Validation checks

- Duplicate IDs: pass for the project dataset model
- Valid account references: pass by design in synthetic relationship rules
- Valid transaction references: pass
- Valid ATM references: pass
- Valid complaint references: pass
- Valid latitude/longitude: pass for generated ATM/POS locations
- Valid timestamps: pass for synthetic records
- Valid transaction amounts: pass
- Required fields populated: pass
- Complaint -> Account -> Transaction -> Withdrawal relationships: pass
- Withdrawal -> Account -> ATM relationships: pass

## Notes

This validation report refers to the synthetic layer used for the stable MVP foundation. It is intentionally lightweight and explainable, not a production-grade financial data warehouse.
