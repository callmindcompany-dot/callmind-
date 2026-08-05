# CALLMIND CRM — INVOICE & B2B BILLING MODULE (`INVOICE_BILLING_MODULE.md`)

**Author:** Principal Billing Architect & CTO  
**Date:** July 31, 2026  
**Target System:** `invoices` Table + Razorpay Order Integration + GST Invoicing Engine

---

## ━━ 1. B2B GST TAX INVOICE SPECIFICATION ━━

- **Sequential Numbering:** Automated serial invoice numbers (`INV-2026-0001`).
- **GST Compliance:** Validates 15-character GSTIN format (`27AAAAA0000A1Z5`).
- **Tax Breakdown:** Itemized CGST, SGST, IGST totals in INR (₹).
- **PDF Generation:** Downloads signed PDF invoice directly from `BillingPage.tsx`.

---

**CTO Approval:** Invoice Billing Module specification approved.
