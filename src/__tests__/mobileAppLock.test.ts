import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * The mobile app lock, guarded against the state it was in.
 *
 * The lock screen compared the entered PIN against the literal '1234' inside
 * the component, and the alert shown on a wrong entry read "Please try again
 * (Default PIN: 1234)" — it told whoever was holding the phone what to type.
 * The fingerprint button called onUnlock() directly without asking the OS
 * anything. And the whole screen was unreachable: isAppLocked started false
 * and nothing ever set it true, which is the only reason none of that mattered.
 *
 * The settings switch was `useState(true)`, so it showed "on" whether or not a
 * lock existed, and toggling it changed a local variable.
 *
 * These assertions are about that specific set of mistakes, not about style.
 */

const MOBILE = path.join(process.cwd(), 'mobile');
const read = (p: string) => fs.readFileSync(path.join(MOBILE, p), 'utf8');
const code = (p: string) =>
  read(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('mobile app lock', () => {
  it('has no hardcoded PIN anywhere in the lock flow', () => {
    for (const file of [
      'src/screens/86_BiometricLockScreen.tsx',
      'src/screens/87_SetPinScreen.tsx',
      'src/services/appLockService.ts',
    ]) {
      const src = code(file);
      expect(src, `${file} compares against a literal PIN`).not.toMatch(/===\s*['"]\d{4,6}['"]/);
      expect(src, `${file} names a default PIN`).not.toMatch(/Default PIN/i);
      expect(src, `${file} contains the old default`).not.toContain("'1234'");
    }
  });

  it('verifies the PIN in the service, not in the component', () => {
    const screen = code('src/screens/86_BiometricLockScreen.tsx');
    expect(screen).toContain('appLockService.verifyPin');
  });

  it('asks the operating system before accepting a fingerprint', () => {
    const service = code('src/services/appLockService.ts');
    expect(service).toContain('LocalAuthentication.authenticateAsync');
    expect(service).toContain('hasHardwareAsync');
    expect(service).toContain('isEnrolledAsync');

    // The button used to be onPress={onUnlock} — no check at all.
    const screen = code('src/screens/86_BiometricLockScreen.tsx');
    expect(screen).not.toMatch(/bioBtn[\s\S]{0,80}onPress=\{onUnlock\}/);
  });

  it('never stores the PIN in readable form', () => {
    const service = code('src/services/appLockService.ts');
    expect(service).toContain('SecureStore');
    expect(service).toContain('digestStringAsync');
    // Salted, so the same PIN on two devices does not produce the same hash.
    expect(service).toContain('getRandomBytesAsync');
  });

  it('can actually engage', () => {
    const app = code('App.tsx');
    // Something has to set it true, or the screen is decoration.
    expect(app).toMatch(/setIsAppLocked\(true\)/);
    expect(app).toContain('IDLE_LOCK_MS');
    // Leaving for the dialer must not count as idle, or an agent gets locked
    // out between every call.
    expect(app).toMatch(/awaitingDialerReturnRef\.current.*backgroundedAtRef|backgroundedAtRef[\s\S]{0,120}awaitingDialerReturnRef/);
  });

  it('reads the settings switch from storage rather than assuming it is on', () => {
    const settings = code('src/screens/SettingsScreen.tsx');
    expect(settings).toContain('appLockService.isLockEnabled');
    expect(settings, 'the switch defaulted to true regardless of any lock existing')
      .not.toMatch(/const \[biometric, setBiometric\] = useState\(true\)/);
  });
});
