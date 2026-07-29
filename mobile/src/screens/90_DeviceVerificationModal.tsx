import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface DeviceVerificationModalProps {
  deviceName: string;
  simCarrier: string;
  onVerify: () => void;
  onReject: () => void;
}

export const DeviceVerificationModal: React.FC<DeviceVerificationModalProps> = ({
  deviceName,
  simCarrier,
  onVerify,
  onReject,
}) => {
  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>📱</Text>
        </View>

        <Text style={styles.title}>New Device Registration</Text>
        <Text style={styles.message}>
          CallMind detected a new Android device session. Verify this device to link call logging and SIM selection.
        </Text>

        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Device Model:</Text>
            <Text style={styles.infoVal}>{deviceName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Primary SIM:</Text>
            <Text style={styles.infoVal}>{simCarrier}</Text>
          </View>
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.rejectBtn} onPress={onReject}>
            <Text style={styles.rejectText}>Deny Device</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.verifyBtn} onPress={onVerify}>
            <Text style={styles.verifyText}>Verify & Authorize</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, zIndex: 99999,
  },
  modal: {
    width: '100%', backgroundColor: '#ffffff', borderRadius: 24, padding: 24,
    alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
  },
  iconCircle: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#eff6ff',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  icon: { fontSize: 26 },
  title: { fontSize: 20, fontWeight: '900', color: '#0f172a', textAlign: 'center' },
  message: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 6, lineHeight: 18, fontWeight: '500' },
  infoBox: {
    width: '100%', backgroundColor: '#f8fafc', borderRadius: 14, padding: 14,
    marginVertical: 18, borderWidth: 1, borderColor: '#e2e8f0', gap: 8,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  infoVal: { fontSize: 12, color: '#0f172a', fontWeight: '800' },
  btnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  rejectBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center' },
  rejectText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  verifyBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#2563eb', alignItems: 'center' },
  verifyText: { fontSize: 13, fontWeight: '800', color: '#ffffff' },
});
