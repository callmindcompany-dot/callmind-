import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft, Target, ChevronLeft, ChevronRight, Award, TrendingUp, CheckCircle2 } from 'lucide-react-native';

interface TargetScreenProps {
  onBack: () => void;
}

export const TargetScreen: React.FC<TargetScreenProps> = ({ onBack }) => {
  const [selectedMonth, setSelectedMonth] = useState('May 2024');

  return (
    <View style={styles.container}>
      {/* Top Header matching Reference UI Image 5 Screen 17 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Targets</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Target size={20} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Month Selector Banner */}
        <View style={styles.monthSelectorRow}>
          <TouchableOpacity style={styles.arrowBtn}>
            <ChevronLeft size={18} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.monthSelectorText}>{selectedMonth}</Text>
          <TouchableOpacity style={styles.arrowBtn}>
            <ChevronRight size={18} color="#0f172a" />
          </TouchableOpacity>
        </View>

        {/* Overall Target Status Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Overall Target Status</Text>
            <View style={styles.onTrackBadge}>
              <Text style={styles.onTrackText}>On Track</Text>
            </View>
          </View>

          {/* Big Progress Circle Representation */}
          <View style={styles.circleProgressContainer}>
            <View style={styles.circleRingOuter}>
              <Text style={styles.circlePercentageText}>75%</Text>
              <Text style={styles.circleSubText}>450 / 600 Calls</Text>
            </View>
          </View>
        </View>

        {/* Target Breakdown Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Metric Breakdown</Text>

          <View style={styles.metricItem}>
            <View style={styles.metricTop}>
              <Text style={styles.metricLabel}>Calls Made</Text>
              <Text style={styles.metricVal}>450 / 600</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: '75%', backgroundColor: '#2563eb' }]} />
            </View>
          </View>

          <View style={styles.metricItem}>
            <View style={styles.metricTop}>
              <Text style={styles.metricLabel}>Connected Calls</Text>
              <Text style={styles.metricVal}>280 / 380</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: '73%', backgroundColor: '#16a34a' }]} />
            </View>
          </View>

          <View style={styles.metricItem}>
            <View style={styles.metricTop}>
              <Text style={styles.metricLabel}>Conversions</Text>
              <Text style={styles.metricVal}>45 / 60</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: '75%', backgroundColor: '#f59e0b' }]} />
            </View>
          </View>

          <View style={styles.metricItem}>
            <View style={styles.metricTop}>
              <Text style={styles.metricLabel}>Revenue Generated</Text>
              <Text style={styles.metricVal}>₹ 4.5L / ₹ 6.0L</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: '75%', backgroundColor: '#9333ea' }]} />
            </View>
          </View>
        </View>

        {/* Bonus Payout Slabs Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Bonus Payout Slabs</Text>
            <Award size={18} color="#f59e0b" />
          </View>

          <View style={styles.slabList}>
            <View style={styles.slabCardActive}>
              <View style={styles.slabLeft}>
                <CheckCircle2 size={16} color="#16a34a" />
                <View>
                  <Text style={styles.slabTitle}>Tier 1 (100% Target)</Text>
                  <Text style={styles.slabDesc}>Complete 600 calls this month</Text>
                </View>
              </View>
              <Text style={styles.slabAmountAchieved}>₹ 2,500</Text>
            </View>

            <View style={styles.slabCardNext}>
              <View style={styles.slabLeft}>
                <TrendingUp size={16} color="#2563eb" />
                <View>
                  <Text style={styles.slabTitleNext}>Tier 2 (120% Target)</Text>
                  <Text style={styles.slabDesc}>Complete 720 calls this month</Text>
                </View>
              </View>
              <Text style={styles.slabAmountNext}>₹ 5,000</Text>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  monthSelectorRow: {
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
  arrowBtn: {
    padding: 4,
  },
  monthSelectorText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  onTrackBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  onTrackText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
  },
  circleProgressContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  circleRingOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 10,
    borderColor: '#2563eb',
    borderLeftColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circlePercentageText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0f172a',
  },
  circleSubText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
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
  slabList: {
    gap: 10,
  },
  slabCardActive: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  slabLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  slabTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  slabDesc: {
    fontSize: 11,
    color: '#64748b',
  },
  slabAmountAchieved: {
    fontSize: 14,
    fontWeight: '800',
    color: '#16a34a',
  },
  slabCardNext: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  slabTitleNext: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  slabAmountNext: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563eb',
  },
});
