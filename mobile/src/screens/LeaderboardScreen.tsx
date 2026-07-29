import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft, Trophy, Crown } from 'lucide-react-native';

interface LeaderboardScreenProps {
  onBack: () => void;
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly' | 'allTime'>('weekly');

  const top3 = [
    { rank: 1, name: 'Priya Verma', calls: '168 Calls', conv: '24 Conv.', initials: 'PV', avatarBg: '#FEF3C7', avatarColor: '#D97706', badgeColor: '#F59E0B' },
    { rank: 2, name: 'Ravi Kumar', calls: '142 Calls', conv: '18 Conv.', initials: 'RK', avatarBg: '#DBEAFE', avatarColor: '#2563eb', badgeColor: '#64748b' },
    { rank: 3, name: 'Amit Patel', calls: '128 Calls', conv: '15 Conv.', initials: 'AP', avatarBg: '#DCFCE7', avatarColor: '#16A34A', badgeColor: '#D97706' },
  ];

  const rankings = [
    { rank: 4, name: 'Neha Gupta', calls: '112 Calls', conv: '12 Conv.', initials: 'NG', avatarBg: '#EFF6FF', avatarColor: '#2563eb' },
    { rank: 5, name: 'Vikas Singh', calls: '98 Calls', conv: '10 Conv.', initials: 'VS', avatarBg: '#F8FAFC', avatarColor: '#64748b' },
    { rank: 6, name: 'Suresh Malhotra', calls: '84 Calls', conv: '8 Conv.', initials: 'SM', avatarBg: '#F8FAFC', avatarColor: '#64748b' },
  ];

  return (
    <View style={styles.container}>
      {/* Top Header matching Reference UI Image 4 Screen 15 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Trophy size={20} color="#f59e0b" />
        </TouchableOpacity>
      </View>

      {/* Segmented Filter Pills */}
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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top 3 Podium Cards */}
        <View style={styles.podiumRow}>
          {/* #2 Rank */}
          <View style={[styles.podiumCard, styles.podiumRank2]}>
            <View style={[styles.podiumAvatar, { backgroundColor: top3[1].avatarBg }]}>
              <Text style={[styles.podiumAvatarText, { color: top3[1].avatarColor }]}>{top3[1].initials}</Text>
            </View>
            <Text style={styles.podiumName}>{top3[1].name}</Text>
            <Text style={styles.podiumCalls}>{top3[1].calls}</Text>
            <Text style={styles.podiumConv}>{top3[1].conv}</Text>
            <View style={[styles.rankBadgeCircle, { backgroundColor: top3[1].badgeColor }]}>
              <Text style={styles.rankBadgeText}>2</Text>
            </View>
          </View>

          {/* #1 Rank Gold Crown */}
          <View style={[styles.podiumCard, styles.podiumRank1]}>
            <Crown size={22} color="#f59e0b" style={styles.goldCrown} />
            <View style={[styles.podiumAvatarLarge, { backgroundColor: top3[0].avatarBg }]}>
              <Text style={[styles.podiumAvatarTextLarge, { color: top3[0].avatarColor }]}>{top3[0].initials}</Text>
            </View>
            <Text style={styles.podiumNameBold}>{top3[0].name}</Text>
            <Text style={styles.podiumCallsBold}>{top3[0].calls}</Text>
            <Text style={styles.podiumConv}>{top3[0].conv}</Text>
            <View style={[styles.rankBadgeCircleLarge, { backgroundColor: top3[0].badgeColor }]}>
              <Text style={styles.rankBadgeText}>1</Text>
            </View>
          </View>

          {/* #3 Rank */}
          <View style={[styles.podiumCard, styles.podiumRank3]}>
            <View style={[styles.podiumAvatar, { backgroundColor: top3[2].avatarBg }]}>
              <Text style={[styles.podiumAvatarText, { color: top3[2].avatarColor }]}>{top3[2].initials}</Text>
            </View>
            <Text style={styles.podiumName}>{top3[2].name}</Text>
            <Text style={styles.podiumCalls}>{top3[2].calls}</Text>
            <Text style={styles.podiumConv}>{top3[2].conv}</Text>
            <View style={[styles.rankBadgeCircle, { backgroundColor: top3[2].badgeColor }]}>
              <Text style={styles.rankBadgeText}>3</Text>
            </View>
          </View>
        </View>

        {/* Team Leaderboard List */}
        <View style={styles.rankList}>
          {rankings.map((r) => (
            <View key={r.rank} style={styles.rankRowCard}>
              <Text style={styles.rankNumberText}>#{r.rank}</Text>
              <View style={[styles.avatarCircle, { backgroundColor: r.avatarBg }]}>
                <Text style={[styles.avatarText, { color: r.avatarColor }]}>{r.initials}</Text>
              </View>
              <View style={styles.rankMain}>
                <Text style={styles.rankName}>{r.name}</Text>
                <Text style={styles.rankMetaText}>{r.calls} • {r.conv}</Text>
              </View>
            </View>
          ))}
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
});
