import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Phone, CheckCircle2, Users, Clock, TrendingUp } from 'lucide-react-native';
import { TelecallerStats } from '../services/targetService';

interface PerformanceScreenProps {
  onBack: () => void;
  stats?: TelecallerStats;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export const PerformanceScreen: React.FC<PerformanceScreenProps> = ({
  onBack,
  stats = {
    totalCalls: 0,
    connectedCalls: 0,
    interestedLeads: 0,
    conversions: 0,
    callTarget: 100,
    callTargetProgress: 0,
  },
  refreshing = false,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');

  const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <View style={styles.container}>
      {/* Top Header matching Reference UI Image 4 Screen 14 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Performance</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Calendar size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {/* Segmented Filter Pills */}
      <View style={styles.tabsContainer}>
        {(['daily', 'weekly', 'monthly', 'custom'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabChip, activeTab === t && styles.tabChipActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />
          ) : undefined
        }
      >
        {/* Date Selector Banner */}
        <View style={styles.dateSelectorRow}>
          <TouchableOpacity style={styles.dateArrowBtn}>
            <ChevronLeft size={18} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.dateSelectorText}>Today, {todayStr}</Text>
          <TouchableOpacity style={styles.dateArrowBtn}>
            <ChevronRight size={18} color="#0f172a" />
          </TouchableOpacity>
        </View>

        {/* 4 Targets Grid */}
        <View style={styles.targetGrid}>
          <View style={styles.targetCard}>
            <View style={styles.targetTop}>
              <View style={[styles.targetIconBg, { backgroundColor: '#eff6ff' }]}>
                <Phone size={16} color="#2563eb" />
              </View>
              <Text style={styles.targetValText}>{stats.totalCalls} / {stats.callTarget}</Text>
            </View>
            <Text style={styles.targetLabel}>Calls Logged</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${stats.callTargetProgress}%`, backgroundColor: '#2563eb' }]} />
            </View>
          </View>

          <View style={styles.targetCard}>
            <View style={styles.targetTop}>
              <View style={[styles.targetIconBg, { backgroundColor: '#f0fdf4' }]}>
                <CheckCircle2 size={16} color="#16a34a" />
              </View>
              <Text style={styles.targetValText}>{stats.connectedCalls}</Text>
            </View>
            <Text style={styles.targetLabel}>Connected</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(100, stats.connectedCalls * 5)}%`, backgroundColor: '#16a34a' }]} />
            </View>
          </View>

          <View style={styles.targetCard}>
            <View style={styles.targetTop}>
              <View style={[styles.targetIconBg, { backgroundColor: '#fef3c7' }]}>
                <Users size={16} color="#d97706" />
              </View>
              <Text style={styles.targetValText}>{stats.conversions}</Text>
            </View>
            <Text style={styles.targetLabel}>Conversions</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(100, stats.conversions * 20)}%`, backgroundColor: '#f59e0b' }]} />
            </View>
          </View>

          <View style={styles.targetCard}>
            <View style={styles.targetTop}>
              <View style={[styles.targetIconBg, { backgroundColor: '#f3e8ff' }]}>
                <Clock size={16} color="#9333ea" />
              </View>
              <Text style={styles.targetValText}>{stats.interestedLeads}</Text>
            </View>
            <Text style={styles.targetLabel}>Interested Leads</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(100, stats.interestedLeads * 10)}%`, backgroundColor: '#9333ea' }]} />
            </View>
          </View>
        </View>

        {/* Performance Overview Line Graph Mockup */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Performance Overview</Text>
          
          <View style={styles.graphContainer}>
            {/* Visual graph SVG simulation box */}
            <View style={styles.graphMockBox}>
              <View style={styles.graphLineWave} />
              <View style={styles.graphPointActive} />
            </View>
            <View style={styles.graphXAxisLabels}>
              <Text style={styles.axisLabel}>09 AM</Text>
              <Text style={styles.axisLabel}>12 PM</Text>
              <Text style={styles.axisLabel}>03 PM</Text>
              <Text style={styles.axisLabel}>06 PM</Text>
            </View>
          </View>
        </View>

        {/* Metric Cards List */}
        <View style={styles.card}>
          <View style={styles.metricRow}>
            <View style={styles.metricLeft}>
              <Text style={styles.metricLabel}>Avg. Call Duration</Text>
              <Text style={styles.metricValue}>03:21</Text>
            </View>
            <View style={styles.trendGreenBadge}>
              <TrendingUp size={12} color="#16a34a" />
              <Text style={styles.trendGreenText}>12%</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.metricRow}>
            <View style={styles.metricLeft}>
              <Text style={styles.metricLabel}>Connect Rate</Text>
              <Text style={styles.metricValue}>66.7%</Text>
            </View>
            <View style={styles.trendGreenBadge}>
              <TrendingUp size={12} color="#16a34a" />
              <Text style={styles.trendGreenText}>8%</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.metricRow}>
            <View style={styles.metricLeft}>
              <Text style={styles.metricLabel}>Conversion Rate</Text>
              <Text style={styles.metricValue}>19.0%</Text>
            </View>
            <View style={styles.trendGreenBadge}>
              <TrendingUp size={12} color="#16a34a" />
              <Text style={styles.trendGreenText}>5%</Text>
            </View>
          </View>
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
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  tabChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  tabChipActive: {
    backgroundColor: '#2563eb',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  dateSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 16,
  },
  dateArrowBtn: {
    padding: 4,
  },
  dateSelectorText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  targetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  targetCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  targetTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  targetIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetValText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  targetLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
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
  graphContainer: {
    gap: 10,
  },
  graphMockBox: {
    height: 120,
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  graphLineWave: {
    width: '100%',
    height: 3,
    backgroundColor: '#2563eb',
    transform: [{ rotate: '-12deg' }],
  },
  graphPointActive: {
    position: 'absolute',
    right: '30%',
    top: '40%',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2563eb',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  graphXAxisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  axisLabel: {
    fontSize: 11,
    color: '#94a3b8',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  metricLeft: {
    gap: 2,
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  trendGreenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  trendGreenText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
});
