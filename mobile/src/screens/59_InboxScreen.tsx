import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Menu, Megaphone, Bell } from 'lucide-react-native';
import { inboxService, type InboxItem } from '../services/inboxService';

/**
 * Announcements from the admin, and this agent's own notifications.
 *
 * This screen took no data. It rendered five hand-written items -- "Monthly
 * Target Update", "Product Training Session", "Holiday Notice", "New Leads
 * Assigned", "Weekly Performance Update", all dated May 2024 -- and rendered
 * the same five whichever tab was selected, beneath a red badge permanently
 * reading 3. Switching tabs changed nothing. Real announcements, in a table
 * that has existed the whole time, were never read.
 */

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
  onSelectAnnouncement: (announcement: Announcement) => void;
  companyId?: string | null;
  userId?: string | null;
}

/** "10:30", "Yesterday", "17 May" — relative near, absolute far. */
function whenLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
}

export const InboxScreen: React.FC<InboxScreenProps> = ({
  onBack,
  onSelectAnnouncement,
  companyId,
  userId,
}) => {
  const [activeTab, setActiveTab] = useState<'announcements' | 'notifications'>('announcements');
  const [items, setItems] = useState<InboxItem[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    setError(null);
    try {
      const list = activeTab === 'announcements'
        ? await inboxService.announcements(companyId, userId ?? '')
        : await inboxService.notifications(companyId, userId ?? '');
      // Pinned first, then newest. The old list had no order at all.
      list.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return Date.parse(b.at || '') - Date.parse(a.at || '');
      });
      setItems(list);
      setUnread(list.filter((i) => !i.isRead).length);
    } catch (e) {
      setItems(null);
      setError(e instanceof Error ? e.message : 'Could not load your inbox.');
    }
  }, [companyId, userId, activeTab]);

  useEffect(() => { void load(); }, [load]);

  return (
    <View style={styles.container}>
      {/* Top Header matching Reference UI Image 3 Screen 11 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
          <Menu size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inbox</Text>
        {/*
          The search and mark-all-read buttons that were here did nothing --
          no handler, no state. They are gone rather than left as decoration.
        */}
        <View style={styles.iconBtn} />
      </View>

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
          {/* Counted, not the literal 3 this used to show for ever. */}
          {unread > 0 && (
            <View style={styles.redBadge}>
              <Text style={styles.redBadgeText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          )}
        </TouchableOpacity>
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
            <Text style={styles.stateTitle}>Could not load your inbox</Text>
            <Text style={styles.stateBody}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => void load()}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {!error && items === null && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#2563eb" />
          </View>
        )}

        {!error && items !== null && items.length === 0 && (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>
              {activeTab === 'announcements' ? 'No announcements yet' : 'Nothing to catch up on'}
            </Text>
            <Text style={styles.stateBody}>
              {activeTab === 'announcements'
                ? 'Messages your admin sends the whole team will show up here.'
                : 'Reminders and alerts meant just for you will show up here.'}
            </Text>
          </View>
        )}

        {items !== null && items.length > 0 && (
          <View style={styles.listGroup}>
            {items.map((item) => {
              const Icon = activeTab === 'announcements' ? Megaphone : Bell;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.card}
                  activeOpacity={0.75}
                  onPress={() => {
                    if (activeTab === 'announcements' && userId) {
                      void inboxService.markAnnouncementRead(item.id, userId);
                      setUnread((n) => (item.isRead ? n : Math.max(0, n - 1)));
                    }
                    onSelectAnnouncement({
                      id: item.id,
                      title: item.title,
                      content: item.body,
                      summary: item.body,
                      time: whenLabel(item.at),
                      isRead: item.isRead,
                      type: item.category,
                    });
                  }}
                >
                  <View style={[styles.iconCircle, { backgroundColor: item.isRead ? '#f8fafc' : '#EEF2FF' }]}>
                    <Icon size={22} color={item.isRead ? '#94a3b8' : '#4F46E5'} />
                  </View>

                  <View style={styles.cardMain}>
                    <View style={styles.titleRow}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.cardTime}>{whenLabel(item.at)}</Text>
                    </View>
                    <Text style={styles.cardSummary} numberOfLines={2}>{item.body}</Text>
                    {!item.isRead && (
                      <View style={styles.newTagBadge}>
                        <Text style={styles.newTagText}>New</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
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
  loadingBox: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  stateCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    padding: 24,
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
});
