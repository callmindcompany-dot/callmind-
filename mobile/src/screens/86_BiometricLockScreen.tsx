import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Lock, Fingerprint } from 'lucide-react-native';
import { appLockService } from '../services/appLockService';

interface BiometricLockProps {
  onUnlock: () => void;
}

/**
 * The PIN used to be the literal '1234', compared here in the component, and
 * the alert on a wrong entry read "Please try again (Default PIN: 1234)" — it
 * told whoever was holding the phone what to type. The biometric button called
 * onUnlock directly without asking the OS anything.
 *
 * Verification now happens in appLockService against a salted hash in
 * SecureStore, and the fingerprint button goes through expo-local-authentication.
 */
export const BiometricLockScreen: React.FC<BiometricLockProps> = ({ onUnlock }) => {
  const [pin, setPin] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [biometricsReady, setBiometricsReady] = useState(false);

  const tryBiometrics = useCallback(async () => {
    if (!(await appLockService.biometricsAvailable())) return;
    if (await appLockService.authenticateWithBiometrics()) onUnlock();
  }, [onUnlock]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const available = await appLockService.biometricsAvailable();
      if (cancelled) return;
      setBiometricsReady(available);
      // Offer the fingerprint straight away — an agent between calls should not
      // have to reach for a button first.
      if (available) void tryBiometrics();
    })();
    return () => { cancelled = true; };
  }, [tryBiometrics]);

  const handleKeyPress = async (num: string) => {
    if (checking || pin.length >= 6) return;
    const nextPin = [...pin, num];
    setPin(nextPin);
    setError(null);

    // 4 is the common case; 5 and 6 are allowed, so only verify once it could
    // be complete and let a longer PIN keep going.
    if (nextPin.length < 4) return;

    setChecking(true);
    try {
      if (await appLockService.verifyPin(nextPin.join(''))) {
        onUnlock();
      } else if (nextPin.length >= 6) {
        setError('Incorrect PIN.');
        setPin([]);
      }
    } finally {
      setChecking(false);
    }
  };

  const handleDelete = () => {
    setError(null);
    setPin(pin.slice(0, -1));
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Lock Icon */}
        <View style={styles.iconBg}>
          <Lock size={36} color="#2563eb" />
        </View>

        <Text style={styles.heading}>CallMind Locked</Text>
        <Text style={styles.subheading}>Enter your PIN{biometricsReady ? ' or use biometrics' : ''}</Text>

        {/* PIN Dots — six, because the PIN may be 4 to 6 digits. */}
        <View style={styles.dotsRow}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={[styles.dot, pin.length > i && styles.dotFilled]} />
          ))}
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {biometricsReady && (
          <TouchableOpacity style={styles.bioBtn} onPress={tryBiometrics}>
            <Fingerprint size={18} color="#2563eb" />
            <Text style={styles.bioText}>Use fingerprint / Face ID</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Keypad */}
      <View style={styles.keypad}>
        {[
          ['1', '2', '3'],
          ['4', '5', '6'],
          ['7', '8', '9'],
          ['', '0', '⌫'],
        ].map((row, rIdx) => (
          <View key={rIdx} style={styles.keypadRow}>
            {row.map((key, kIdx) => (
              <TouchableOpacity
                key={kIdx}
                style={[styles.key, !key && styles.emptyKey]}
                onPress={() => {
                  if (key === '⌫') handleDelete();
                  else if (key) handleKeyPress(key);
                }}
                disabled={!key}
              >
                <Text style={styles.keyText}>{key}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  errorText: { color: '#dc2626', fontSize: 13, fontWeight: '700', marginBottom: 12 },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 80,
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  content: {
    alignItems: 'center',
  },
  iconBg: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  heading: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 6,
  },
  subheading: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 28,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  dotFilled: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  bioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  bioText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },
  keypad: {
    gap: 12,
    maxWidth: 280,
    alignSelf: 'center',
    width: '100%',
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  key: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyKey: {
    backgroundColor: 'transparent',
  },
  keyText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
});
