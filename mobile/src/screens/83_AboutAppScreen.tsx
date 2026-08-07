import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

interface AboutAppScreenProps {
  onBack: () => void;
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
  onOpenRefund: () => void;
}

export const AboutAppScreen: React.FC<AboutAppScreenProps> = ({
  onBack,
  onOpenPrivacy,
  onOpenTerms,
  onOpenRefund,
}) => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About CallMind</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Logo & Version */}
        <View style={styles.logoSection}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>📞</Text>
          </View>
          <Text style={styles.appName}>CallMind Telecaller</Text>
          <Text style={styles.versionText}>Version 2.4.0 (Build 108)</Text>
          <View style={styles.badgeRow}>
            <View style={styles.statusBadge}>
              <View style={styles.greenDot} />
              <Text style={styles.statusText}>Android 14 Ready</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>No audio recorded by this app</Text>
            </View>
          </View>
        </View>

        {/* Info Rows */}
        <View style={styles.infoGroup}>
          <Text style={styles.groupHeading}>LEGAL & POLICIES</Text>
          <TouchableOpacity style={styles.row} onPress={onOpenPrivacy}>
            <Text style={styles.rowTitle}>Privacy Policy</Text>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={onOpenTerms}>
            <Text style={styles.rowTitle}>Terms of Service</Text>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
          {/* Razorpay and the Play Store both expect a reachable refund policy,
              and there was no link to one anywhere in the app. */}
          <TouchableOpacity style={styles.row} onPress={onOpenRefund}>
            <Text style={styles.rowTitle}>Refund & Cancellation Policy</Text>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoGroup}>
          <Text style={styles.groupHeading}>SYSTEM ARCHITECTURE</Text>
          <View style={styles.rowStatic}>
            <Text style={styles.rowTitle}>Database Engine</Text>
            <Text style={styles.rowValue}>Supabase PostgreSQL + RLS</Text>
          </View>
          <View style={styles.rowStatic}>
            <Text style={styles.rowTitle}>AI Teleprompter</Text>
            <Text style={styles.rowValue}>Google Gemini Flash</Text>
          </View>
          <View style={styles.rowStatic}>
            <Text style={styles.rowTitle}>Offline Storage</Text>
            <Text style={styles.rowValue}>SQLite Local Queue</Text>
          </View>
        </View>

        <Text style={styles.copyrightText}>
          © 2026 CallMind Technologies Inc. All rights reserved. Made with ❤️ for telecallers in India.
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', paddingTop: 50 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 16 },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 20, color: '#0f172a', fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  logoSection: { alignItems: 'center', marginVertical: 20 },
  logoBadge: { width: 72, height: 72, borderRadius: 24, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  logoIcon: { fontSize: 36 },
  appName: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  versionText: { fontSize: 13, color: '#64748b', fontWeight: '600', marginTop: 4 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16a34a' },
  statusText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  infoGroup: { marginTop: 24 },
  groupHeading: { fontSize: 11, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  rowStatic: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  rowTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  rowValue: { fontSize: 12, fontWeight: '600', color: '#2563eb' },
  arrow: { fontSize: 16, color: '#94a3b8', fontWeight: '700' },
  copyrightText: { fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 36, lineHeight: 16, fontWeight: '500' },
});
