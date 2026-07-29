import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Lock, Fingerprint } from 'lucide-react-native';

interface BiometricLockProps {
  onUnlock: () => void;
}

export const BiometricLockScreen: React.FC<BiometricLockProps> = ({ onUnlock }) => {
  const [pin, setPin] = useState<string[]>([]);

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const nextPin = [...pin, num];
      setPin(nextPin);
      if (nextPin.length === 4) {
        if (nextPin.join('') === '1234') {
          onUnlock();
        } else {
          Alert.alert('Incorrect PIN', 'Please try again (Default PIN: 1234)');
          setPin([]);
        }
      }
    }
  };

  const handleDelete = () => {
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
        <Text style={styles.subheading}>Enter your 4-digit security PIN or use Biometrics</Text>

        {/* PIN Dots */}
        <View style={styles.dotsRow}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[styles.dot, pin.length > i && styles.dotFilled]}
            />
          ))}
        </View>

        {/* Biometric Button */}
        <TouchableOpacity style={styles.bioBtn} onPress={onUnlock}>
          <Fingerprint size={18} color="#2563eb" />
          <Text style={styles.bioText}>Use Fingerprint / Face ID</Text>
        </TouchableOpacity>
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
