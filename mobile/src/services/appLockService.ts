import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

/**
 * Locking the app when it is left alone.
 *
 * What was here before: a lock screen whose PIN was the literal string '1234',
 * compared in the component, with the alert on a wrong entry reading "Please
 * try again (Default PIN: 1234)". Anyone who picked up the phone could read
 * the PIN off the screen that was supposed to stop them.
 *
 * It also never engaged. `isAppLocked` started false and nothing ever set it
 * true, so the screen could not be reached in normal use — which is the only
 * reason the hardcoded PIN did no harm.
 *
 * The specification asks for a 30-minute idle lock released by biometrics or a
 * PIN. That is what this is.
 */

const PIN_HASH_KEY = 'callmind.lock.pinHash';
const PIN_SALT_KEY = 'callmind.lock.pinSalt';
const ENABLED_KEY = 'callmind.lock.enabled';

/** Idle time before the app locks itself. */
export const IDLE_LOCK_MS = 30 * 60 * 1000;

async function hashPin(pin: string, salt: string): Promise<string> {
  // SHA-256 over pin+salt. Not a password KDF — a four-digit PIN has ten
  // thousand possibilities and no hash makes that large. What this stops is the
  // PIN sitting in storage as plain text, and it is why the salt is per-device.
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${pin}:${salt}`);
}

export const appLockService = {
  /** Whether the device can do fingerprint or face unlock, and has one enrolled. */
  async biometricsAvailable(): Promise<boolean> {
    try {
      const [hasHardware, isEnrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      return hasHardware && isEnrolled;
    } catch {
      return false;
    }
  },

  /**
   * Ask the OS to verify the user.
   *
   * Returns false rather than throwing on cancel or failure, because a refused
   * fingerprint is an ordinary outcome, not an error — the caller falls back to
   * the PIN.
   */
  async authenticateWithBiometrics(): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock CallMind',
        fallbackLabel: 'Use PIN',
        // Keep the PIN in our hands, so a device passcode is not an alternative
        // to the app's own lock.
        disableDeviceFallback: true,
      });
      return result.success;
    } catch {
      return false;
    }
  },

  async isLockEnabled(): Promise<boolean> {
    return (await SecureStore.getItemAsync(ENABLED_KEY)) === 'true';
  },

  async hasPin(): Promise<boolean> {
    return (await SecureStore.getItemAsync(PIN_HASH_KEY)) !== null;
  },

  /** Set or replace the PIN. Four to six digits. */
  async setPin(pin: string): Promise<void> {
    if (!/^\d{4,6}$/.test(pin)) {
      throw new Error('The PIN must be 4 to 6 digits.');
    }
    const salt = Array.from(await Crypto.getRandomBytesAsync(16))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    await SecureStore.setItemAsync(PIN_SALT_KEY, salt);
    await SecureStore.setItemAsync(PIN_HASH_KEY, await hashPin(pin, salt));
    await SecureStore.setItemAsync(ENABLED_KEY, 'true');
  },

  async verifyPin(pin: string): Promise<boolean> {
    const [hash, salt] = await Promise.all([
      SecureStore.getItemAsync(PIN_HASH_KEY),
      SecureStore.getItemAsync(PIN_SALT_KEY),
    ]);
    if (!hash || !salt) return false;
    return (await hashPin(pin, salt)) === hash;
  },

  async disableLock(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(PIN_HASH_KEY),
      SecureStore.deleteItemAsync(PIN_SALT_KEY),
      SecureStore.deleteItemAsync(ENABLED_KEY),
    ]);
  },
};
