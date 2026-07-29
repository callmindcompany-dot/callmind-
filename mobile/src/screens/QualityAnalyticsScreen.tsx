import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft, BarChart3, Star, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { EmptyStateComponent } from '../components/EmptyStateComponent';

export interface AuditedCallItem {
  id: string;
  leadName: string;
  date: string;
  score: string;
  status: string;
  statusColor: string;
  statusBg: string;
}

interface QualityAnalyticsScreenProps {
  onBack: () => void;
  auditedCalls?: AuditedCallItem[];
}

export const QualityAnalyticsScreen: React.FC<QualityAnalyticsScreenProps> = ({ onBack, auditedCalls = [] }) => {

  return (
    <View style={styles.container}>
      {/* Top Header matching Reference UI Image 6 Screen 21 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quality Analytics</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <BarChart3 size={20} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Overall Rating Banner */}
        <View style={styles.bannerCard}>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} size={20} color="#f59e0b" fill="#f59e0b" />
            ))}
          </View>
          <Text style={styles.scoreLargeText}>4.8 / 5.0</Text>
          <Text style={styles.scoreSubText}>Top 5% Telecaller Quality Rating</Text>
        </View>

        {/* Quality Dimensions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quality Dimensions</Text>

          <View style={styles.metricItem}>
            <View style={styles.metricTop}>
              <Text style={styles.metricLabel}>Script Compliance</Text>
              <Text style={styles.metricVal}>95%</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: '95%', backgroundColor: '#2563eb' }]} />
            </View>
          </View>

          <View style={styles.metricItem}>
            <View style={styles.metricTop}>
              <Text style={styles.metricLabel}>Tone & Politeness</Text>
              <Text style={styles.metricVal}>98%</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: '98%', backgroundColor: '#16a34a' }]} />
            </View>
          </View>

          <View style={styles.metricItem}>
            <View style={styles.metricTop}>
              <Text style={styles.metricLabel}>Objection Handling</Text>
              <Text style={styles.metricVal}>90%</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: '90%', backgroundColor: '#f59e0b' }]} />
            </View>
          </View>

          <View style={styles.metricItem}>
            <View style={styles.metricTop}>
              <Text style={styles.metricLabel}>Product Knowledge</Text>
              <Text style={styles.metricVal}>92%</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: '92%', backgroundColor: '#9333ea' }]} />
            </View>
          </View>
        </View>

        {/* Audited Calls List */}
        <Text style={styles.sectionTitle}>Recent Audited Calls</Text>
        <View style={styles.callList}>
          {auditedCalls.length > 0 ? (
            auditedCalls.map((call) => (
              <View key={call.id} style={styles.callCard}>
                <View style={styles.callMain}>
                  <Text style={styles.callTitle}>Call with {call.leadName}</Text>
                  <Text style={styles.callDate}>{call.date} • Score {call.score}</Text>
                </View>

                <View style={[styles.statusBadge, { backgroundColor: call.statusBg }]}>
                  {call.status === 'Approved' ? (
                    <CheckCircle2 size={12} color={call.statusColor} />
                  ) : (
                    <AlertCircle size={12} color={call.statusColor} />
                  )}
                  <Text style={[styles.statusText, { color: call.statusColor }]}>{call.status}</Text>
                </View>
              </View>
            ))
          ) : (
            <EmptyStateComponent type="no_data" />
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  bannerCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fef3c7',
    marginBottom: 16,
  },
  starRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  scoreLargeText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0f172a',
  },
  scoreSubText: {
    fontSize: 12,
    color: '#d97706',
    fontWeight: '700',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 14,
  },
  metricItem: {
    marginBottom: 14,
  },
  metricTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  metricVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  track: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
    marginTop: 4,
  },
  callList: {
    gap: 10,
  },
  callCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  callMain: {
    gap: 2,
  },
  callTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  callDate: {
    fontSize: 11,
    color: '#64748b',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
