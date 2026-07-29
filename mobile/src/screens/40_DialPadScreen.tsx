import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface DialPadScreenProps {
  onBack: () => void;
  onDial: (number: string) => void;
}

export const DialPadScreen: React.FC<DialPadScreenProps> = ({ onBack, onDial }) => {
  const [number, setNumber] = useState('');

  const handlePress = (digit: string) => {
    if (number.length < 15) setNumber(prev => prev + digit);
  };

  const handleDelete = () => {
    setNumber(prev => prev.slice(0, -1));
  };

  const formatDisplay = (raw: string) => {
    if (raw.length <= 5) return raw;
    if (raw.length <= 10) return `${raw.slice(0, 5)} ${raw.slice(5)}`;
    return `+${raw.slice(0, 2)} ${raw.slice(2, 7)} ${raw.slice(7)}`;
  };

  const keys = [
    [{ d: '1', s: '' }, { d: '2', s: 'ABC' }, { d: '3', s: 'DEF' }],
    [{ d: '4', s: 'GHI' }, { d: '5', s: 'JKL' }, { d: '6', s: 'MNO' }],
    [{ d: '7', s: 'PQRS' }, { d: '8', s: 'TUV' }, { d: '9', s: 'WXYZ' }],
    [{ d: '*', s: '' }, { d: '0', s: '+' }, { d: '#', s: '' }],
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dial Pad</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Number Display */}
      <View style={styles.displayArea}>
        <Text style={styles.numberDisplay}>
          {number ? formatDisplay(number) : 'Enter number'}
        </Text>
        {number.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={() => setNumber('')}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Keypad */}
      <View style={styles.keypad}>
        {keys.map((row, rIdx) => (
          <View key={rIdx} style={styles.keyRow}>
            {row.map((key) => (
              <TouchableOpacity
                key={key.d}
                style={styles.key}
                onPress={() => handlePress(key.d)}
              >
                <Text style={styles.keyDigit}>{key.d}</Text>
                {key.s ? <Text style={styles.keySub}>{key.s}</Text> : null}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      {/* Bottom Actions */}
      <View style={styles.bottomRow}>
        <View style={{ width: 64 }} />

        <TouchableOpacity
          style={[styles.dialBtn, !number && styles.dialBtnDisabled]}
          onPress={() => number && onDial(number)}
          disabled={!number}
        >
          <Text style={styles.dialIcon}>📞</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteIcon}>⌫</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', paddingTop: 50, justifyContent: 'space-between', paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 12 },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 20, color: '#0f172a', fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  displayArea: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16 },
  numberDisplay: { fontSize: 32, fontWeight: '300', color: '#0f172a', letterSpacing: 1, minHeight: 44 },
  clearBtn: { marginTop: 8 },
  clearText: { fontSize: 13, fontWeight: '700', color: '#2563eb' },
  keypad: { paddingHorizontal: 40, gap: 12 },
  keyRow: { flexDirection: 'row', justifyContent: 'space-between' },
  key: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: '#f8fafc',
    justifyContent: 'center', alignItems: 'center',
  },
  keyDigit: { fontSize: 28, fontWeight: '400', color: '#0f172a' },
  keySub: { fontSize: 9, fontWeight: '700', color: '#94a3b8', letterSpacing: 2, marginTop: 1 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 50 },
  dialBtn: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#16a34a',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#16a34a', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
  dialBtnDisabled: { backgroundColor: '#94a3b8', shadowColor: '#94a3b8' },
  dialIcon: { fontSize: 28 },
  deleteBtn: { width: 64, height: 64, justifyContent: 'center', alignItems: 'center' },
  deleteIcon: { fontSize: 24, color: '#64748b' },
});
