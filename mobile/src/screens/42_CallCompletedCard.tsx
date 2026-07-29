import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Check, ClipboardList, Calendar } from 'lucide-react-native';

interface CallCompletedCardProps {
  leadName: string;
  leadPhone: string;
  duration: string;
  simUsed: string;
  onLogFeedback: () => void;
  onScheduleCallback: () => void;
  onDone: () => void;
}

export const CallCompletedCard: React.FC<CallCompletedCardProps> = ({
  leadName,
  leadPhone,
  duration,
  simUsed,
  onLogFeedback,
  onScheduleCallback,
  onDone,
}) => {
  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.successBadge}>
          <Check size={32} color="#ffffff" strokeWidth={3} />
        </View>

        <Text style={styles.title}>Call Completed</Text>
        <Text style={styles.subtitle}>with {leadName}</Text>
        <Text style={styles.phone}>{leadPhone}</Text>

        {/* Stats Summary */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>DURATION</Text>
            <Text style={styles.statValue}>{duration}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>SIM USED</Text>
            <Text style={styles.statValue}>{simUsed}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.btnStack}>
          <TouchableOpacity style={styles.primaryBtn} onPress={onLogFeedback}>
            <ClipboardList size={16} color="#ffffff" />
            <Text style={styles.primaryBtnText}>Log Feedback & Status</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={onScheduleCallback}>
            <Calendar size={16} color="#2563eb" />
            <Text style={styles.secondaryBtnText}>Schedule Callback</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tertiaryBtn} onPress={onDone}>
            <Text style={styles.tertiaryBtnText}>Back to Dashboard</Text>
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
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, zIndex: 9999,
  },
  card: {
    width: '100%', backgroundColor: '#ffffff', borderRadius: 24, padding: 24,
    alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
  },
  successBadge: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#16a34a',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', fontWeight: '600', marginTop: 2 },
  phone: { fontSize: 13, color: '#94a3b8', fontWeight: '500', marginTop: 1 },
  statsRow: {
    flexDirection: 'row', width: '100%', backgroundColor: '#f8fafc',
    borderRadius: 16, padding: 16, marginVertical: 20, alignItems: 'center',
  },
  statBox: { flex: 1, alignItems: 'center' },
  divider: { width: 1, height: 30, backgroundColor: '#e2e8f0' },
  statLabel: { fontSize: 10, fontWeight: '800', color: '#64748b', textTransform: 'uppercase' },
  statValue: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginTop: 2 },
  btnStack: { width: '100%', gap: 10 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2563eb', paddingVertical: 14, borderRadius: 14 },
  primaryBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#eff6ff', paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: '#bfdbfe' },
  secondaryBtnText: { color: '#2563eb', fontSize: 14, fontWeight: '800' },
  tertiaryBtn: { paddingVertical: 12, alignItems: 'center' },
  tertiaryBtnText: { color: '#64748b', fontSize: 13, fontWeight: '700' },
});
