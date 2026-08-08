import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ArrowLeft, ShieldCheck } from 'lucide-react-native';
import { appLockService } from '../services/appLockService';

interface SetPinScreenProps {
  onBack: () => void;
  onDone: () => void;
}

/**
 * Choosing the PIN that unlocks the app.
 *
 * There was no way to set one. The lock screen compared against the literal
 * '1234' and the settings switch changed a local variable, so "Biometric Lock"
 * could be turned on without anything existing to turn on.
 *
 * Entered twice, because a PIN typed once and mistyped locks the agent out of
 * their own work until they reinstall.
 */
export const SetPinScreen: React.FC<SetPinScreenProps> = ({ onBack, onDone }) => {
  const [stage, setStage] = useState<'enter' | 'confirm'>('enter');
  const [first, setFirst] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const commit = async (value: string) => {
    setSaving(true);
    setError(null);
    try {
      await appLockService.setPin(value);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the PIN.');
      setStage('enter');
      setFirst('');
      setPin('');
    } finally {
      setSaving(false);
    }
  };

  const press = (digit: string) => {
    if (saving || pin.length >= 6) return;
    const next = pin + digit;
    setPin(next);
    setError(null);
  };

  const advance = () => {
    if (pin.length < 4) {
      setError('Use at least 4 digits.');
      return;
    }
    if (stage === 'enter') {
      setFirst(pin);
      setPin('');
      setStage('confirm');
      return;
    }
    if (pin !== first) {
      setError('Those did not match. Start again.');
      setStage('enter');
      setFirst('');
      setPin('');
      return;
    }
    void commit(pin);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack} accessibilityLabel="Go back">
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>App Lock</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconBg}>
          <ShieldCheck size={32} color="#2563eb" />
        </View>
        <Text style={styles.heading}>
          {stage === 'enter' ? 'Choose a PIN' : 'Enter it again'}
        </Text>
        <Text style={styles.subheading}>
          {stage === 'enter'
            ? '4 to 6 digits. You will need this if your fingerprint is not recognised.'
            : 'Type the same PIN once more to confirm.'}
        </Text>

        <View style={styles.dotsRow}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={[styles.dot, pin.length > i && styles.dotFilled]} />
          ))}
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      <View style={styles.keypad}>
        {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['', '0', '⌫']].map((row, r) => (
          <View key={r} style={styles.keypadRow}>
            {row.map((key, k) => (
              <TouchableOpacity
                key={k}
                style={[styles.key, !key && styles.emptyKey]}
                disabled={!key || saving}
                onPress={() => (key === '⌫' ? setPin(pin.slice(0, -1)) : key && press(key))}
              >
                <Text style={styles.keyText}>{key}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <TouchableOpacity
          style={[styles.continueBtn, (pin.length < 4 || saving) && styles.continueDisabled]}
          disabled={pin.length < 4 || saving}
          onPress={advance}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.continueText}>{stage === 'enter' ? 'Continue' : 'Save PIN'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', paddingTop: 50 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  iconBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8fafc',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9',
  },
  content: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 32 },
  iconBg: {
    width: 72, height: 72, borderRadius: 24, backgroundColor: '#eff6ff',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  heading: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  subheading: {
    fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 20, marginBottom: 28,
  },
  dotsRow: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#e2e8f0' },
  dotFilled: { backgroundColor: '#2563eb' },
  errorText: { color: '#dc2626', fontSize: 13, fontWeight: '700' },
  keypad: { marginTop: 'auto', paddingHorizontal: 32, paddingBottom: 32 },
  keypadRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  key: {
    width: 76, height: 62, borderRadius: 16, backgroundColor: '#f8fafc',
    justifyContent: 'center', alignItems: 'center',
  },
  emptyKey: { backgroundColor: 'transparent' },
  keyText: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  continueBtn: {
    backgroundColor: '#2563eb', paddingVertical: 16, borderRadius: 16,
    alignItems: 'center', marginTop: 8,
  },
  continueDisabled: { opacity: 0.4 },
  continueText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});
