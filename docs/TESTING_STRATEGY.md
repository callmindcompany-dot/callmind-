# CALLMIND CRM — MASTER TESTING STRATEGY (`TESTING_STRATEGY.md`)

**Author:** Principal QA Architect & CTO  
**Date:** July 31, 2026  
**Target System:** Vitest, React Testing Library, Supertest, Detox, & k6 Load Suite

---

## ━━ 1. TESTING PYRAMID & COVERAGE TARGETS ━━

```
                   /\
                  /  \     E2E Mobile Tests (Detox) -> Core Call Flow
                 /    \    ------------------------------------------
                /      \   API Integration Tests (Supertest) -> 100% Routes
               /        \  ------------------------------------------------
              /          \ Component UI Tests (React RTL) -> >80% Components
             /            \ ------------------------------------------------
            /--------------\ Unit Tests (Vitest) -> >85% Business Logic Code
```

---

## ━━ 2. AUTOMATED REGRESSION & LOAD COMMANDS ━━

- **Unit & Logic Tests:** `npm run test` (Vitest unit tests for hooks, services, & utilities).
- **Component UI Tests:** `npm run test:ui` (React Testing Library tests for Web components).
- **API Integration Tests:** `npm run test:api` (Supertest integration suite for `server.ts`).
- **Database RLS Audit:** `npm run test:db` (pgTAP suite verifying multi-tenant isolation).
- **Load & Performance Test:** `npm run test:load` (k6 load test simulating 10,000 concurrent webhooks).

---

**CTO Approval:** Testing Strategy certified for CI/CD GitHub Actions enforcement.
