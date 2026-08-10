import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { ArrowLeft, Target, Award, TrendingUp, CheckCircle2 } from 'lucide-react-native';
import { TelecallerStats } from '../services/targetService';
import { workspaceService, type TargetRow } from '../services/workspaceService';

interface TargetScreenProps {
  onBack: () => void;
  stats?: TelecallerStats;
  companyId?: string | null;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export const TargetScreen: React.FC<TargetScreenProps> = ({
  onBack,
  stats = {
    totalCalls: 0,
    connectedCalls: 0,
    interestedLeads: 0,
    conversions: 0,
    callTarget: 100,
    callTargetProgress: 0,
  },
  companyId,
  refreshing = false,
  onRefresh,
}) => {
  const [companyTargets, setCompanyTargets] = useState<TargetRow[] | null>(null);
  const [targetsError, setTargetsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!companyId) { setCompanyTargets([]); return; }
    (async () => {
      try {
        const rows = await workspaceService.targets(companyId);
        if (!cancelled) setCompanyTargets(rows);
      } catch (e) {
        if (!cancelled) {
          setCompanyTargets(null);
          setTargetsError(e instanceof Error ? e.message : 'Could not load your targets.');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  const callsPct = Math.min(100, Math.round((stats.totalCalls / Math.max(1, stats.callTarget)) * 100));
  const connectedPct = Math.min(100, Math.round((stats.connectedCalls / Math.max(1, stats.totalCalls || 1)) * 100));

  return (
    <View style={styles.container}>
      {/* Top Header matching Reference UI Image 5 Screen 17 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Targets</Text>
        <View style={styles.iconBtn}>
          <Target size={20} color="#2563eb" />
        </View>
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
        {/*
          The month selector here had two arrows with no handlers, so it looked
          like history was browsable and it was not. `targets` holds one figure
          per label with no period column, so there is no earlier month to move
          to.
        */}

        {/* Overall Target Status Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Overall Target Status</Text>
            <View style={styles.onTrackBadge}>
              <Text style={styles.onTrackText}>{callsPct >= 50 ? 'On Track' : 'In Progress'}</Text>
            </View>
          </View>

          {/* Big Progress Circle Representation */}
          <View style={styles.circleProgressContainer}>
            <View style={styles.circleRingOuter}>
              <Text style={styles.circlePercentageText}>{callsPct}%</Text>
              <Text style={styles.circleSubText}>{stats.totalCalls} / {stats.callTarget} Calls</Text>
            </View>
          </View>
        </View>

        {/* Target Breakdown Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Metric Breakdown</Text>

          <View style={styles.metricItem}>
            <View style={styles.metricTop}>
              <Text style={styles.metricLabel}>Calls Logged</Text>
              <Text style={styles.metricVal}>{stats.totalCalls} / {stats.callTarget}</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${callsPct}%`, backgroundColor: '#2563eb' }]} />
            </View>
          </View>

          <View style={styles.metricItem}>
            <View style={styles.metricTop}>
              <Text style={styles.metricLabel}>Connected Calls</Text>
              <Text style={styles.metricVal}>{stats.connectedCalls} ({connectedPct}%)</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${connectedPct}%`, backgroundColor: '#16a34a' }]} />
            </View>
          </View>

          <View style={styles.metricItem}>
            <View style={styles.metricTop}>
              <Text style={styles.metricLabel}>Interested Leads</Text>
              <Text style={styles.metricVal}>{stats.interestedLeads}</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.min(100, stats.interestedLeads * 10)}%`, backgroundColor: '#f59e0b' }]} />
            </View>
          </View>

          <View style={styles.metricItem}>
            <View style={styles.metricTop}>
              <Text style={styles.metricLabel}>Conversions</Text>
              <Text style={styles.metricVal}>{stats.conversions}</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.min(100, stats.conversions * 20)}%`, backgroundColor: '#9333ea' }]} />
            </View>
          </View>
        </View>

        {/*
          The company's own targets.

          A "Bonus Payout Slabs" card used to sit here promising ₹ 2,500 for
          600 calls and ₹ 5,000 for 720. There is no incentive system in this
          product -- no table, no column, nothing that would ever pay it -- so
          the app was telling every telecaller they had money coming.
        */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Set by your company</Text>
            <Award size={18} color="#f59e0b" />
          </View>

          {targetsError && <Text style={styles.stateBody}>{targetsError}</Text>}

          {!targetsError && companyTargets === null && (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#2563eb" />
            </View>
          )}

          {!targetsError && companyTargets !== null && companyTargets.length === 0 && (
            <Text style={styles.stateBody}>
              Your admin has not set a target yet. The figures above are your own count
              against the default.
            </Text>
          )}

          {companyTargets !== null && companyTargets.length > 0 && (
            <View style={styles.slabList}>
              {companyTargets.map((t) => {
                const pct = t.targetValue > 0
                  ? Math.min(100, Math.round((t.currentValue / t.targetValue) * 100))
                  : 0;
                const done = pct >= 100;
                return (
                  <View key={t.id} style={done ? styles.slabCardActive : styles.slabCardNext}>
                    <View style={styles.slabLeft}>
                      {done
                        ? <CheckCircle2 size={16} color="#16a34a" />
                        : <TrendingUp size={16} color="#2563eb" />}
                      <View>
                        <Text style={done ? styles.slabTitle : styles.slabTitleNext}>{t.label}</Text>
                        <Text style={styles.slabDesc}>
                          {t.currentValue} of {t.targetValue} {t.type}
                        </Text>
                      </View>
                    </View>
                    <Text style={done ? styles.slabAmountAchieved : styles.slabAmountNext}>{pct}%</Text>
                  </View>
                );
              })}
            </View>
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
  stateBody: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 19,
    paddingVertical: 6,
  },
  loadingBox: {
    paddingVertical: 20,
    alignItems: 'center',
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
