# CallMind Mobile Application

For full architectural documentation, screen catalog, offline-sync protocols, and security rules, please refer to:
👉 [MOBILE_APP_MAP.md](../MOBILE_APP_MAP.md)

---

## Quick Start Guide

### 1. Installation
```bash
cd mobile
npm install
```

### 2. Environment Configuration
Create a `.env` file inside the `mobile/` directory:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Run Locally with Expo
```bash
# Start Expo dev server
npx expo start

# Run on Android Emulator / Physical Device
npx expo start --android
```

---

## Core Features & Screen Count
* **Total Screens:** 53 Screens fully implemented in TypeScript.
* **Role Guard:** Telecallers only (`telecaller`, `team_lead`, `floor_manager`). Admins/Founders are instructed to use the Web App.
* **Offline First:** Call logs queue automatically in AsyncStorage (`@callmind_unsynced_calls`) when disconnected and upload upon reconnecting.
* **Attendance:** GPS location + Selfie verification clock-in/out system.
* **AI Assistance:** Live talk scripts, objection battlecards, and neural lead insights.
