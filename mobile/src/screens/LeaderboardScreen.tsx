import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { ArrowLeft, Trophy, Crown } from 'lucide-react-native';
import {
  leaderboardService,
  type LeaderRow,
  type LeaderboardPeriod,
} from '../services/leaderboardService';

interface LeaderboardScreenProps {
  onBack: () => void;
  companyId?: string | null;
  userId?: string | null;
}

/**
 * The team ranking.
 *
 * This screen used to hold two hand-written arrays: Priya Verma with 168 calls
 * on the top step, Ravi Kumar and Amit Patel beside her, then three more below.
 * None of those people exist in any company. A telecaller opening it saw a
 * podium of strangers, found themselves nowhere on it, and had no way to tell
 * that the whole board was decoration.
 *
 * It also assumed there were always at least three team members -- top3[1] and
 * top3[2] were read unconditionally -- so on a real company with one or two
 * people it would have crashed as soon as it was given real data.
 */

const PODIUM_TINTS = [
  { bg: '#FEF3C7', fg: '#D97706', badge: '#F59E0B' },
  { bg: '#DBEAFE', fg: '#2563eb', badge: '#64748b' },
  { bg: '#DCFCE7', fg: '#16A34A', badge: '#D97706' },
];

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ onBack, companyId, userId }) => {
  const [activeTab, setActiveTab] = useState<LeaderboardPeriod>('weekly');
  const [rows, setRows] = useState<LeaderRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    setError(null);
    try {
      setRows(await leaderboardService.fetch(companyId, userId ?? '', activeTab));
    } catch (e) {
      // Told, not swallowed. An empty board after a failed query reads as
      // "nobody on your team has called anyone", which an agent would believe.
      setRows(null);
      setError(e instanceof Error ? e.message : 'Could not load the leaderboard.');
    }
  }, [companyId, userId, activeTab]);

  useEffect(() => { void load(); }, [load]);

  const podium = (rows ?? []).slice(0, 3);
  const rest = (rows ?? []).slice(3);
  // The podium layout puts second on the left and first in the middle, so it
  // only makes sense once three people have something to show for themselves.
  const showPodium = podium.length === 3 && podium[0].calls > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <View style={styles.iconBtn}>
          <Trophy size={20} color="#f59e0b" />
        </View>
      </View>

      <View style={styles.tabsContainer}>
        {(['weekly', 'monthly', 'allTime'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabChip, activeTab === t && styles.tabChipActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
              {t === 'weekly' ? 'Weekly' : t === 'monthly' ? 'Monthly' : 'All Time'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
          />
        }
      >
        {error && (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Could not load the leaderboard</Text>
            <Text style={styles.stateBody}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => void load()}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {!error && rows === null && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#2563eb" />
          </View>
        )}

        {!error && rows !== null && rows.length === 0 && (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Nobody on the board yet</Text>
            <Text style={styles.stateBody}>
              This shows your team once there are other members in your workspace.
            </Text>
          </View>
        )}

        {showPodium && (
          <View style={styles.podiumRow}>
            {[1, 0, 2].map((i) => {
              const r = podium[i];
              const tint = PODIUM_TINTS[i];
              const first = i === 0;
              return (
                <View
                  key={r.userId}
                  style={[
                    styles.podiumCard,
                    first ? styles.podiumRank1 : i === 1 ? styles.podiumRank2 : styles.podiumRank3,
                  ]}
                >
                  {first && <Crown size={22} color="#f59e0b" style={styles.goldCrown} />}
                  <View style={[first ? styles.podiumAvatarLarge : styles.podiumAvatar, { backgroundColor: tint.bg }]}>
                    <Text style={[first ? styles.podiumAvatarTextLarge : styles.podiumAvatarText, { color: tint.fg }]}>
                      {r.initials}
                    </Text>
                  </View>
                  <Text style={first ? styles.podiumNameBold : styles.podiumName} numberOfLines={1}>
                    {r.isMe ? 'You' : r.name}
                  </Text>
                  <Text style={first ? styles.podiumCallsBold : styles.podiumCalls}>
                    {r.calls} {r.calls === 1 ? 'call' : 'calls'}
                  </Text>
                  <Text style={styles.podiumConv}>{r.conversions} conv.</Text>
                  <View style={[first ? styles.rankBadgeCircleLarge : styles.rankBadgeCircle, { backgroundColor: tint.badge }]}>
                    <Text style={styles.rankBadgeText}>{i + 1}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {rows !== null && rows.length > 0 && (
          <View style={styles.rankList}>
            {(showPodium ? rest : rows).map((r, idx) => {
              const rank = (showPodium ? 3 : 0) + idx + 1;
              return (
                <View key={r.userId} style={[styles.rankRowCard, r.isMe && styles.rankRowMine]}>
                  <Text style={styles.rankNumberText}>#{rank}</Text>
                  <View style={[styles.avatarCircle, { backgroundColor: r.isMe ? '#eff6ff' : '#f8fafc' }]}>
                    <Text style={[styles.avatarText, { color: r.isMe ? '#2563eb' : '#64748b' }]}>{r.initials}</Text>
                  </View>
                  <View style={styles.rankMain}>
                    <Text style={styles.rankName} numberOfLines={1}>{r.isMe ? 'You' : r.name}</Text>
                    <Text style={styles.rankMetaText}>
                      {r.calls} {r.calls === 1 ? 'call' : 'calls'} • {r.conversions} conv.
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {rows !== null && rows.length > 0 && rows.every((r) => r.calls === 0) && (
          <Text style={styles.footnote}>
            No calls logged in this period yet. The order is by name until somebody makes one.
          </Text>
        )}
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
  podiumRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 24,
    marginTop: 12,
  },
  podiumCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
  },
  podiumRank1: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
    paddingBottom: 16,
  },
  podiumRank2: {
    paddingBottom: 12,
  },
  podiumRank3: {
    paddingBottom: 12,
  },
  goldCrown: {
    marginBottom: 4,
  },
  podiumAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  podiumAvatarLarge: {
    width: 52,
    height: 52,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  podiumAvatarText: {
    fontSize: 14,
    fontWeight: '800',
  },
  podiumAvatarTextLarge: {
    fontSize: 18,
    fontWeight: '800',
  },
  podiumName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  podiumNameBold: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  podiumCalls: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  podiumCallsBold: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563eb',
    marginTop: 2,
  },
  podiumConv: {
    fontSize: 10,
    color: '#94a3b8',
  },
  rankBadgeCircle: {
    position: 'absolute',
    bottom: -10,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankBadgeCircleLarge: {
    position: 'absolute',
    bottom: -12,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  rankList: {
    gap: 10,
    marginTop: 8,
  },
  rankRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 14,
  },
  rankNumberText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#94a3b8',
    width: 24,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
  },
  rankMain: {
    flex: 1,
  },
  rankName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  rankMetaText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  rankRowMine: {
    borderColor: '#bfdbfe',
    backgroundColor: '#f8fbff',
  },
  loadingBox: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  stateCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    marginTop: 12,
  },
  stateTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
    textAlign: 'center',
  },
  stateBody: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 19,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },
  footnote: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});
