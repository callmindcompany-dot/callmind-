# CALLMIND CRM — FRONTEND NAVIGATION MATRIX (FNM)

**Author:** Principal Frontend Architect & CTO  
**Date:** July 31, 2026  
**Target System:** React 19 + Vite Web Application & React Native Expo Mobile App

---

## ━━ EXECUTIVE NAVIGATION MAP ━━

The **Frontend Navigation Matrix (FNM)** defines client routing, screen state transitions, modal overlays, drawer flyouts, and route protection guards across Web and Mobile platforms.

```
                    ┌──────────────┐
                    │ Landing Page │
                    └──────┬───────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
        ┌─────────┐                 ┌─────────┐
        │  Login  │                 │  Join   │
        └────┬────┘                 └────┬────┘
             │                           │
             └─────────────┬─────────────┘
                           ▼
                 ┌───────────────────┐
                 │ AuthContext Guard │
                 └─────────┬─────────┘
                           ▼
                 ┌───────────────────┐
                 │ Dashboard Layout  │
                 └─────────┬─────────┘
      ┌────────────┬───────┴───────┬────────────┐
      ▼            ▼               ▼            ▼
 ┌─────────┐  ┌─────────┐    ┌───────────┐ ┌───────────┐
 │ /leads  │  │ /calls  │    │/analytics │ │ /billing  │
 └─────────┘  └─────────┘    └───────────┘ └───────────┘
```

---

## ━━ 1. ROUTE & SCREEN ACCESS CONTROL ━━

| Route Path / Screen | Platform | Accessible Roles | Guard Component | Fallback Redirect |
| :--- | :--- | :--- | :--- | :--- |
| `/dashboard` | Web | All Authenticated | `<AuthGuard>` | `/login` |
| `/leads` | Web | All Authenticated | `<AuthGuard>` | `/login` |
| `/billing` | Web | `founder` Only | `<RoleGuard roles={['founder']}>` | `/dashboard` |
| `/audit-logs` | Web | `founder`, `sub_admin` | `<RoleGuard roles={['founder','sub_admin']}>` | `/dashboard` |
| `HomeScreen.tsx` | Mobile | `telecaller`, `team_lead`, `floor_manager`| `<MobileAuthGuard>` | `04_OTPVerify.tsx` |
| `SubscriptionLockScreen.tsx`| Mobile/Web | Accounts with Expired Subscription | `<TrialGuard>` | N/A (Full Lock) |

---

**CTO Approval:** Frontend Navigation Matrix is enforced in `src/App.tsx` and `mobile/App.tsx`.
