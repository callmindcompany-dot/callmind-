import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Menu, Bell, Users, PhoneCall, MessageSquare, FileText, ChevronRight, Phone, Sparkles, Zap, TrendingUp, Award, Clock } from 'lucide-react-native';
import { useMobileAuth } from '../services/AuthContext';
import { EmptyStateComponent } from '../components/EmptyStateComponent';

/**
 * The first screen a telecaller sees, and the numbers on it are theirs.
 *
 * Every figure here used to be written into the file: 18 of 50 calls made and
 * 36% achieved, Connected 12 with "+8 today", Conversions 3 with "+1 today",
 * Follow-ups 7 pending, Avg. Talk Time 04:32 with "+12% vs avg". Above them sat
 * an "AI NEXT BEST LEAD" banner offering Rahul Sharma at a 94% conversion
 * score, whose Dial Now button opened lead id '1'. None of it came from
 * anywhere, and it was identical on every agent's phone every day.
 *
 * targetService.fetchTelecallerStats already computed real versions of most of
 * these and App.tsx already held the result; it simply was not passed in.
 *
 * Avg. Talk Time is gone rather than replaced. `calls.duration` is TEXT holding
 * dialler elapsed time, not carrier-verified talk time, and averaging it would
 * put a precise-looking number on something the app cannot measure.
 */

interface TodayStats {
  totalCalls: number;
  connectedCalls: number;
  interestedLeads: number;
  conversions: number;
  callTarget: number;
  callTargetProgress: number;
}

interface HomeScreenProps {
  onNavigateToLeads: () => void;
  onNavigateToCalls: () => void;
  onNavigateToProfile: () => void;
  onSelectLead: (leadId: string) => void;
  onCallLead?: (lead: any) => Promise<void>;
  /** In call order, from priorityQueue — not import order. */
  recentLeads?: Array<any>;
  /** Real figures for this agent. Absent while they load. */
  stats?: TodayStats | null;
  /** Follow-ups already due, counted from `callbacks`. */
  dueFollowUps?: number;
  refreshing?: boolean;
  onRefresh?: () => Promise<void>;
}

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateToLeads,
  onNavigateToCalls,
  onNavigateToProfile,
  onSelectLead,
  onCallLead,
  recentLeads = [],
  stats = null,
  dueFollowUps = 0,
}) => {
  const { user, profile } = useMobileAuth();
  const userName = profile?.name || user?.user_metadata?.full_name || 'Telecaller';
  const initials = userName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'TC';

  // The top of the call queue. Not a prediction — the same order the Leads tab
  // shows, which is what the agent is about to work down anyway.
  const nextLead = recentLeads.length > 0 ? recentLeads[0] : null;

  return (
    <View style={styles.container}>
      {/* 🌟 Top Header: Glassmorphic Executive Profile Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onNavigateToProfile}
            accessibilityLabel="Open Navigation Menu"
            accessibilityRole="button"
            activeOpacity={0.75}
          >
            <Menu size={22} color="#0f172a" />
          </TouchableOpacity>
          <View>
            <View style={styles.greetingRow}>
              {/* Said "Good Morning" at every hour of the day. */}
              <Text style={styles.greeting}>
                {greetingFor(new Date().getHours())}, {userName.split(' ')[0]}!
              </Text>
              <Sparkles size={16} color="#2563eb" />
            </View>

            {/*
              The "Online & Ready" badge that was here was a coloured dot and a
              string, not a status. Presence is written to agent_status by
              App.tsx and shown on the admin's board; repeating it here as a
              constant only made it look like a live indicator.
            */}
            <Text style={styles.statusText}>
              {stats
                ? `${stats.totalCalls} ${stats.totalCalls === 1 ? 'call' : 'calls'} logged`
                : 'Loading your day…'}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* The bell had no handler. The Inbox tab is the real one. */}
          <TouchableOpacity
            onPress={onNavigateToProfile}
            accessibilityLabel="Open User Profile"
            accessibilityRole="button"
            activeOpacity={0.75}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/*
          The next lead to call, from the same queue the Leads tab shows.

          This was an "AI NEXT BEST LEAD" banner with a 94% conversion score
          against Rahul Sharma, who exists in no company, and a Dial Now button
          that opened lead id '1'. There is no scoring model in this product.
          What there is, is an ordering — due follow-ups first, then the
          agent's own priority, oldest first — and that is what this shows.
        */}
        {nextLead && (
          <View style={styles.aiSmartBanner}>
            <View style={styles.aiBannerHeader}>
              <View style={styles.aiTagBadge}>
                <Zap size={14} color="#ffffff" />
                <Text style={styles.aiTagText}>NEXT TO CALL</Text>
              </View>
              {!!nextLead.tag && <Text style={styles.aiScoreBadge}>{nextLead.tag}</Text>}
            </View>

            <View style={styles.aiBannerBody}>
              <View style={styles.aiAvatarCircle}>
                <Text style={styles.aiAvatarInitials}>{nextLead.initials}</Text>
              </View>
              <View style={styles.aiDetails}>
                <Text style={styles.aiLeadName} numberOfLines={1}>{nextLead.name}</Text>
                <Text style={styles.aiReasonText} numberOfLines={1}>
                  {nextLead.phone || 'No number on file'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.aiCallActionBtn}
                onPress={() => (onCallLead ? void onCallLead(nextLead) : onSelectLead(nextLead.id))}
                activeOpacity={0.8}
                disabled={!nextLead.phone}
                accessibilityLabel={`Call ${nextLead.name}`}
                accessibilityRole="button"
              >
                <Phone size={16} color="#2563eb" />
                <Text style={styles.aiCallActionText}>Call</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/*
          The "Join Company" button beside this heading had no handler, and the
          agent reading it has already joined one.
        */}
        <Text style={styles.sectionHeaderTitle}>Today</Text>

        {/* 📊 Bento Grid Dashboard Metrics */}
        <View style={styles.bentoContainer}>
          {/*
            Was 18 / 50 and "36% Achieved", hardcoded, on every agent's phone.
            The target comes from the company's `targets` row and falls back to
            100 in targetService; the count is this agent's calls.
          */}
          <View style={styles.ringChartCard}>
            <View style={styles.circleRing}>
              <Text style={styles.callsCount}>
                {stats ? `${stats.totalCalls} / ${stats.callTarget}` : '—'}
              </Text>
              <Text style={styles.callsLabel}>Calls made</Text>
              <Text style={styles.targetPercent}>
                {stats ? `${stats.callTargetProgress}% of target` : 'Loading…'}
              </Text>
            </View>
          </View>

          {/*
            Four measured figures. The "↑ +8 today" and "↑ +12% vs avg" deltas
            that sat under the old ones compared against nothing — there is no
            stored history to compare with — so they are gone rather than
            recomputed from an invented baseline.
          */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIconHeader}>
                <Text style={styles.statCardTitle}>Connected</Text>
                <View style={[styles.statBadgeBg, { backgroundColor: '#dcfce7' }]}>
                  <TrendingUp size={12} color="#16a34a" />
                </View>
              </View>
              <Text style={styles.statValue}>{stats ? stats.connectedCalls : '—'}</Text>
              <Text style={styles.statSubText}>of {stats ? stats.totalCalls : '—'} calls</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconHeader}>
                <Text style={styles.statCardTitle}>Conversions</Text>
                <View style={[styles.statBadgeBg, { backgroundColor: '#fef3c7' }]}>
                  <Award size={12} color="#d97706" />
                </View>
              </View>
              <Text style={styles.statValue}>{stats ? stats.conversions : '—'}</Text>
              <Text style={styles.statSubText}>leads won</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconHeader}>
                <Text style={styles.statCardTitle}>Follow-ups</Text>
                <View style={[styles.statBadgeBg, { backgroundColor: '#fee2e2' }]}>
                  <Clock size={12} color="#ef4444" />
                </View>
              </View>
              <Text style={styles.statValue}>{dueFollowUps}</Text>
              <Text style={styles.statPendingText}>due now</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconHeader}>
                <Text style={styles.statCardTitle}>Interested</Text>
                <View style={[styles.statBadgeBg, { backgroundColor: '#eff6ff' }]}>
                  <Phone size={12} color="#2563eb" />
                </View>
              </View>
              <Text style={styles.statValue}>{stats ? stats.interestedLeads : '—'}</Text>
              <Text style={styles.statSubText}>said yes so far</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions Row */}
        <Text style={styles.sectionHeaderTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={onNavigateToLeads}
            activeOpacity={0.75}
            accessibilityLabel="Open My Leads List"
            accessibilityRole="button"
          >
            <View style={[styles.actionIconBg, { backgroundColor: '#EEF2FF' }]}>
              <Users size={22} color="#4F46E5" />
            </View>
            <Text style={styles.actionLabel}>My Leads</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={onNavigateToCalls}
            activeOpacity={0.75}
            accessibilityLabel="Open Call Log"
            accessibilityRole="button"
          >
            <View style={[styles.actionIconBg, { backgroundColor: '#F0FDF4' }]}>
              <PhoneCall size={22} color="#16A34A" />
            </View>
            <Text style={styles.actionLabel}>Call Log</Text>
          </TouchableOpacity>

          {/*
            WhatsApp and Add Note tiles sat here with no onPress at all. Tapping
            them did nothing, which reads as the app being broken rather than
            the feature being absent. They come back when there is something
            behind them to open.
          */}
        </View>

        {/* Recent Leads Feed */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>Recent Leads</Text>
          <TouchableOpacity
            onPress={onNavigateToLeads}
            style={styles.viewAllRow}
            accessibilityLabel="View All Leads"
            accessibilityRole="button"
          >
            <Text style={styles.viewAllText}>View All</Text>
            <ChevronRight size={16} color="#2563eb" />
          </TouchableOpacity>
        </View>

        <View style={styles.recentList}>
          {recentLeads.length > 0 ? (
            recentLeads.map((lead) => (
              <TouchableOpacity
                key={lead.id}
                style={styles.leadCard}
                onPress={() => onSelectLead(lead.id)}
                activeOpacity={0.75}
                accessibilityLabel={`View lead details for ${lead.name}`}
                accessibilityRole="button"
              >
                <View style={[styles.leadAvatar, { backgroundColor: lead.bgColor }]}>
                  <Text style={[styles.avatarInitials, { color: lead.color }]}>{lead.initials}</Text>
                </View>
                <View style={styles.leadInfo}>
                  <View style={styles.leadNameRow}>
                    <Text style={styles.leadName}>{lead.name}</Text>
                    <View style={[styles.tagBadge, { backgroundColor: lead.color + '15' }]}>
                      <Text style={[styles.tagText, { color: lead.color }]}>{lead.tag}</Text>
                    </View>
                  </View>
                  <Text style={styles.leadMetaText}>{lead.phone} • {lead.city}</Text>
                </View>
                <View style={styles.leadRight}>
                  <Text style={styles.leadTime}>{lead.time}</Text>
                  <TouchableOpacity
                    style={styles.callIconBtn}
                    onPress={() => onSelectLead(lead.id)}
                    accessibilityLabel={`Call ${lead.name}`}
                    accessibilityRole="button"
                  >
                    <Phone size={14} color="#2563eb" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <EmptyStateComponent type="no_leads" onAction={onNavigateToLeads} actionText="View All Leads" />
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  waveEmoji: {
    fontSize: 14,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#16a34a',
  },
  statusText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeCount: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  aiSmartBanner: {
    backgroundColor: '#2563eb',
    borderRadius: 24,
    padding: 16,
    marginBottom: 20,
    gap: 12,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  aiBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  aiTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  aiScoreBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#dbeafe',
  },
  aiBannerBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiAvatarInitials: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '800',
  },
  aiDetails: {
    flex: 1,
  },
  aiLeadName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  aiReasonText: {
    fontSize: 11,
    color: '#bfdbfe',
    fontWeight: '500',
    marginTop: 2,
  },
  aiCallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    minHeight: 40,
    borderRadius: 12,
    gap: 6,
  },
  aiCallActionText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '800',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  joinCompanyBtn: {
    paddingHorizontal: 12,
    minHeight: 32,
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  joinCompanyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  bentoContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    gap: 14,
  },
  ringChartCard: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  circleRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    borderColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  callsCount: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  callsLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  targetPercent: {
    fontSize: 10,
    color: '#2563eb',
    fontWeight: '800',
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statIconHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statCardTitle: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  statBadgeBg: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  statSubText: {
    fontSize: 10,
    color: '#16a34a',
    fontWeight: '700',
    marginTop: 2,
  },
  statPendingText: {
    fontSize: 10,
    color: '#f59e0b',
    fontWeight: '700',
    marginTop: 2,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 20,
  },
  actionCard: {
    alignItems: 'center',
    gap: 8,
  },
  actionIconBg: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  viewAllText: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '700',
  },
  recentList: {
    gap: 10,
    marginTop: 4,
  },
  leadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  leadAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 15,
    fontWeight: '800',
  },
  leadInfo: {
    flex: 1,
  },
  leadNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  leadName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  leadMetaText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  leadRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  leadTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
  callIconBtn: {
    minWidth: 36,
    minHeight: 36,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
