import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Menu, Search, CheckCircle2, Megaphone, Users, Calendar, BarChart3, ChevronRight } from 'lucide-react-native';

export interface Announcement {
  id: string;
  title: string;
  sender?: string;
  time: string;
  summary?: string;
  content?: string;
  isRead?: boolean;
  type?: string;
}

interface InboxScreenProps {
  onBack: () => void;
  onSelectAnnouncement: (announcement: any) => void;
}

export const InboxScreen: React.FC<InboxScreenProps> = ({ onBack, onSelectAnnouncement }) => {
  const [activeTab, setActiveTab] = useState<'announcements' | 'notifications'>('announcements');

  const listItems = [
    {
      id: '1',
      title: 'Monthly Target Update',
      time: '10:30 AM',
      summary: 'New targets for May 2024 are now live. Check your dashboard!',
      tag: 'New',
      IconComponent: Megaphone,
      bgColor: '#EEF2FF',
      iconColor: '#4F46E5',
    },
    {
      id: '2',
      title: 'Product Training Session',
      time: 'Yesterday',
      summary: 'Join the training session on 23 May at 4:00 PM.',
      tag: 'New',
      IconComponent: Users,
      bgColor: '#DCFCE7',
      iconColor: '#16A34A',
    },
    {
      id: '3',
      title: 'Holiday Notice',
      time: '20 May 2024',
      summary: 'Office will remain closed on 25 May on account of Saturday.',
      tag: null,
      IconComponent: Calendar,
      bgColor: '#FEF3C7',
      iconColor: '#D97706',
    },
    {
      id: '4',
      title: 'New Leads Assigned',
      time: '18 May 2024',
      summary: 'You have 15 new leads assigned. Check now!',
      tag: null,
      IconComponent: Megaphone,
      bgColor: '#DBEAFE',
      iconColor: '#2563eb',
    },
    {
      id: '5',
      title: 'Weekly Performance Update',
      time: '17 May 2024',
      summary: 'Your weekly performance report is available.',
      tag: null,
      IconComponent: BarChart3,
      bgColor: '#F3E8FF',
      iconColor: '#9333EA',
    },
  ];

  return (
    <View style={styles.container}>
      {/* Top Header matching Reference UI Image 3 Screen 11 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
          <Menu size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inbox</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn}>
            <Search size={20} color="#0f172a" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <CheckCircle2 size={20} color="#0f172a" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabChip, activeTab === 'announcements' && styles.tabChipActive]}
          onPress={() => setActiveTab('announcements')}
        >
          <Text style={[styles.tabText, activeTab === 'announcements' && styles.tabTextActive]}>
            Announcements
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabChip, activeTab === 'notifications' && styles.tabChipActive]}
          onPress={() => setActiveTab('notifications')}
        >
          <Text style={[styles.tabText, activeTab === 'notifications' && styles.tabTextActive]}>
            Notifications
          </Text>
          <View style={styles.redBadge}>
            <Text style={styles.redBadgeText}>3</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.listGroup}>
          {listItems.map((item) => {
            const Icon = item.IconComponent;
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                onPress={() => onSelectAnnouncement(item)}
                activeOpacity={0.75}
              >
                <View style={[styles.iconCircle, { backgroundColor: item.bgColor }]}>
                  <Icon size={22} color={item.iconColor} />
                </View>

                <View style={styles.cardMain}>
                  <View style={styles.titleRow}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardTime}>{item.time}</Text>
                  </View>
                  <Text style={styles.cardSummary}>{item.summary}</Text>
                  {item.tag && (
                    <View style={styles.newTagBadge}>
                      <Text style={styles.newTagText}>{item.tag}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
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
  headerIcons: {
    flexDirection: 'row',
    gap: 10,
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
    gap: 12,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tabChip: {
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabChipActive: {
    borderBottomColor: '#2563eb',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  redBadge: {
    backgroundColor: '#ef4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  redBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  listGroup: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardMain: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
  cardSummary: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 18,
  },
  newTagBadge: {
    backgroundColor: '#eff6ff',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 8,
  },
  newTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563eb',
  },
});
