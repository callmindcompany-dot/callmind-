# CALLMIND CRM — QUOTATION & PROPOSAL MODULE (`QUOTATION_MODULE.md`)

> **Status:** Not built
> **Implemented in:** —
> **Last verified:** 2026-08-01

**Author:** Principal Enterprise Solutions Architect & CTO  
**Date:** July 31, 2026  


---

## ━━ 1. PROPOSAL GENERATION WORKFLOW ━━

1. **Itemized Scope Selection:** Select line items, quantities, unit prices, and valid product catalog items.
2. **Discount Validation:** Apply percentage or flat discount. Discounts > 15% require Founder electronic sign-off.
3. **GST Computation:** Automatically computes 9% CGST + 9% SGST (Intra-state) or 18% IGST (Inter-state).
4. **PDF Render:** Converts HTML template to PDF and stores link in `lead-attachments` bucket.
5. **Customer Dispatch:** Sends branded PDF link via WhatsApp and Email.

---

**CTO Approval:** Quotation Module specification approved.
