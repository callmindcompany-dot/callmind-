# CALLMIND CRM — GLOBAL SEARCH ARCHITECTURE (`GLOBAL_SEARCH.md`)

**Author:** Principal Search & Database Architect & CTO  
**Date:** July 31, 2026  
**Target System:** PostgreSQL Full-Text Search (`tsvector`) + Trigram Indexes (`pg_trgm`)

---

## ━━ 1. SEARCH PIPELINE OVERVIEW ━━

```
[User Query String (e.g., "Patel Real Estate")] ──► [Query Sanitizer]
                                                           │
                                                           ▼
                             [PostgreSQL `pg_trgm` & `tsvector` Search]
                             ├── Table: `leads` (Name, Phone, Email, Company, City)
                             ├── Table: `call_logs` (Notes, Disposition)
                             └── Table: `invoices` (Invoice Number)
```

---

## ━━ 2. PERFORMANCE & KEYBOARD SHORTCUTS ━━

- **Keyboard Shortcut:** `Cmd + K` (Mac) / `Ctrl + K` (Windows) triggers floating search modal on Web CRM.
- **Debounce:** Client input debounced at 250ms to prevent excessive API requests.
- **Index Definition:** `CREATE INDEX idx_leads_search ON leads USING gin (to_tsvector('english', name || ' ' || phone || ' ' || company_name));`

---

**CTO Approval:** Global Search Architecture approved for implementation.
