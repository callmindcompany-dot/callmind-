import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CheckCircle2, Zap, Sparkles } from 'lucide-react-native';

interface CompanyJoinedSuccessProps {
  companyName: string;
  adminName: string;
  onGoToDashboard: () => void;
}

export const CompanyJoinedSuccess: React.FC<CompanyJoinedSuccessProps> = ({
  companyName,
  adminName,
  onGoToDashboard,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.badge}>
          <CheckCircle2 size={44} color="#ffffff" strokeWidth={2.5} />
        </View>

        <Text style={styles.title}>Company Joined!</Text>
        <Text style={styles.subtitle}>You are now an active telecaller at</Text>
        <Text style={styles.companyName}>{companyName}</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoTitleRow}>
            <Zap size={14} color="#93c5fd" />
            <Text style={styles.infoTitle}>Account Privileges</Text>
          </View>

          <View style={styles.featureRow}>
            <Text style={styles.check}>✓</Text>
            <Text style={styles.featureText}>Auto Lead Assignment Enabled</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.check}>✓</Text>
            <Text style={styles.featureText}>SIM Dialer & Feedback Sheet Active</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.check}>✓</Text>
            <Text style={styles.featureText}>AI Script Teleprompter Unlocked</Text>
          </View>
          <Text style={styles.adminNote}>Approved by {adminName}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.ctaBtn} onPress={onGoToDashboard}>
        <Sparkles size={18} color="#ffffff" />
        <Text style={styles.ctaText}>Launch Calling Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#0f172a',
    justifyContent: 'space-between', paddingHorizontal: 24,
    paddingTop: 80, paddingBottom: 50,
  },
  content: { alignItems: 'center' },
  badge: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: '#2563eb',
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
    shadowColor: '#2563eb', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  title: { fontSize: 28, fontWeight: '900', color: '#ffffff' },
  subtitle: { fontSize: 14, color: '#94a3b8', fontWeight: '500', marginTop: 4 },
  companyName: { fontSize: 20, fontWeight: '800', color: '#60a5fa', marginTop: 4 },
  infoCard: {
    width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20, padding: 20, marginTop: 32, borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)', gap: 12,
  },
  infoTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  infoTitle: { fontSize: 13, fontWeight: '800', color: '#93c5fd', textTransform: 'uppercase' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  check: { fontSize: 16, color: '#4ade80', fontWeight: '900' },
  featureText: { fontSize: 13, color: '#e2e8f0', fontWeight: '600' },
  adminNote: { fontSize: 11, color: '#64748b', fontStyle: 'italic', marginTop: 6 },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2563eb', paddingVertical: 18, borderRadius: 18,
    shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  ctaText: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
});
