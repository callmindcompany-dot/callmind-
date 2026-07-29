import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface ConfirmDialogProps {
  visible: boolean;
  type: 'logout' | 'delete' | 'reassign';
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  type,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  if (!visible) return null;

  const iconMap = {
    logout: '🚪',
    delete: '🗑️',
    reassign: '🔀',
  };

  const isDanger = type === 'delete' || type === 'logout';
  const confirmBtnBg = isDanger ? '#dc2626' : '#2563eb';

  return (
    <View style={styles.overlay}>
      <View style={styles.dialog}>
        <View style={[styles.iconCircle, { backgroundColor: isDanger ? '#fef2f2' : '#eff6ff' }]}>
          <Text style={styles.icon}>{iconMap[type]}</Text>
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>{cancelText}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: confirmBtnBg }]} onPress={onConfirm}>
            <Text style={styles.confirmText}>{confirmText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30, zIndex: 99999,
  },
  dialog: {
    width: '100%', backgroundColor: '#ffffff', borderRadius: 24, padding: 24,
    alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
  },
  iconCircle: {
    width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  icon: { fontSize: 26 },
  title: { fontSize: 18, fontWeight: '900', color: '#0f172a', textAlign: 'center' },
  message: { fontSize: 13, color: '#64748b', fontWeight: '500', textAlign: 'center', marginTop: 6, lineHeight: 18 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  confirmText: { fontSize: 14, fontWeight: '800', color: '#ffffff' },
});
