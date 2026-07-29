import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft, Filter, Calendar, LogIn, Phone, Target, Megaphone, LogOut, FileText, ChevronDown } from 'lucide-react-native';
import { EmptyStateComponent } from '../components/EmptyStateComponent';

export interface ActivityItem {
  id: string;
  time: string;
  title: string;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  subtext: string;
  IconComponent?: any;
  iconColor?: string;
  iconBg?: string;
}

interface ActivityTimelineProps {
  onBack: () => void;
  activities?: ActivityItem[];
}

export const ActivityTimelineScreen: React.FC<ActivityTimelineProps> = ({ onBack, activities = [] }) => {

  const yesterdayActivities = [
    {
      id: '5',
      time: '04:30 PM',
      title: 'Logged Out',
      badge: 'Success',
      badgeColor: '#16a34a',
      badgeBg: '#dcfce7',
      subtext: 'Logged out from Redmi Note 10 Pro',
      IconComponent: LogOut,
      iconColor: '#16a34a',
      iconBg: '#dcfce7',
    },
    {
      id: '6',
      time: '03:15 PM',
      title: 'Call Made',
      badge: 'Duration: 03:12',
      badgeColor: '#2563eb',
      badgeBg: '#eff6ff',
      subtext: 'Called Priya Verma',
      IconComponent: Phone,
      iconColor: '#2563eb',
      iconBg: '#eff6ff',
    },
    {
      id: '7',
      time: '02:00 PM',
      title: 'Note Added',
      badge: 'Info',
      badgeColor: '#d97706',
      badgeBg: '#fef3c7',
      subtext: 'Added note for lead Amit Patel',
      IconComponent: FileText,
      iconColor: '#d97706',
      iconBg: '#fef3c7',
    },
  ];

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7} accessibilityLabel="Back" accessibilityRole="button">
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity Timeline</Text>
        <TouchableOpacity style={styles.filterBtn} accessibilityLabel="Filter Timeline" accessibilityRole="button">
          <Filter size={18} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Date Selector Banner */}
        <TouchableOpacity style={styles.dateSelectorBanner} activeOpacity={0.8}>
          <Calendar size={16} color="#2563eb" />
          <Text style={styles.dateSelectorText}>15 May 2024 – 21 May 2024</Text>
          <ChevronDown size={16} color="#64748b" />
        </TouchableOpacity>

        {/* 21 May 2024 Section */}
        {activities.length > 0 ? (
          <>
            <Text style={styles.sectionDateHeader}>Today</Text>
            <View style={styles.timelineList}>
              {activities.map((act) => {
                const Icon = act.IconComponent || Phone;
                return (
                  <View key={act.id} style={styles.timelineCard}>
                    <Text style={styles.activityTime}>{act.time}</Text>
                    <View style={[styles.activityIconCircle, { backgroundColor: act.iconBg || '#eff6ff' }]}>
                      <Icon size={16} color={act.iconColor || '#2563eb'} />
                    </View>
                    <View style={styles.activityContent}>
                      <View style={styles.activityTitleRow}>
                        <Text style={styles.activityTitle}>{act.title}</Text>
                        <View style={[styles.badge, { backgroundColor: act.badgeBg || '#eff6ff' }]}>
                          <Text style={[styles.badgeText, { color: act.badgeColor || '#2563eb' }]}>{act.badge}</Text>
                        </View>
                      </View>
                      <Text style={styles.activitySubtext}>{act.subtext}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        ) : (
          <EmptyStateComponent type="no_data" />
        )}

        {/* 20 May 2024 Section */}
        <Text style={styles.sectionDateHeader}>20 May 2024</Text>
        <View style={styles.timelineList}>
          {yesterdayActivities.map((act) => {
            const Icon = act.IconComponent;
            return (
              <View key={act.id} style={styles.timelineCard}>
                <Text style={styles.activityTime}>{act.time}</Text>
                <View style={[styles.activityIconCircle, { backgroundColor: act.iconBg }]}>
                  <Icon size={16} color={act.iconColor} />
                </View>
                <View style={styles.activityContent}>
                  <View style={styles.activityTitleRow}>
                    <Text style={styles.activityTitle}>{act.title}</Text>
                    <View style={[styles.badge, { backgroundColor: act.badgeBg }]}>
                      <Text style={[styles.badgeText, { color: act.badgeColor }]}>{act.badge}</Text>
                    </View>
                  </View>
                  <Text style={styles.activitySubtext}>{act.subtext}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Load More Button */}
        <TouchableOpacity style={styles.loadMoreBtn} activeOpacity={0.85} accessibilityLabel="Load More Activities" accessibilityRole="button">
          <ChevronDown size={18} color="#2563eb" />
          <Text style={styles.loadMoreText}>Load More Activities</Text>
        </TouchableOpacity>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  filterBtn: {
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
    paddingBottom: 40,
  },
  dateSelectorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
    marginBottom: 20,
  },
  dateSelectorText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionDateHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 12,
    marginTop: 8,
  },
  timelineList: {
    gap: 12,
    marginBottom: 16,
  },
  timelineCard: {
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
  activityTime: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
    width: 60,
  },
  activityIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  activitySubtext: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
    gap: 6,
    marginTop: 8,
  },
  loadMoreText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '800',
  },
});
