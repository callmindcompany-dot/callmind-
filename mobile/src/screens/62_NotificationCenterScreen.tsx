import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ArrowLeft, CheckCircle2, Users, Clock, Target, Award, AlertTriangle, PhoneCall, CreditCard, Zap, Info, Pin } from 'lucide-react-native';
import { EmptyStateComponent } from '../components/EmptyStateComponent';

export interface MobileNotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  isUnread: boolean;
  isPinned?: boolean;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  type?: string;
  actionUrl?: string;
  IconComponent?: any;
  bgColor?: string;
  iconColor?: string;
}

interface NotificationCenterScreenProps {
  onBack: () => void;
  onSelectNotification?: (id: string, actionUrl?: string) => void;
  onMarkAllRead?: () => void;
  notifications?: MobileNotificationItem[];
  isLoading?: boolean;
}

export const NotificationCenterScreen: React.FC<NotificationCenterScreenProps> = ({
  onBack,
  onSelectNotification,
  onMarkAllRead,
  notifications = [],
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'urgent' | 'system'>('all');

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === 'unread') return item.isUnread;
    if (activeTab === 'urgent') return item.priority === 'urgent' || item.priority === 'high';
    if (activeTab === 'system') return item.type === 'system_alert' || item.type === 'workflow_failed';
    return true;
  });

  const getNotificationIcon = (type?: string) => {
    if (!type) return Users;
    if (type.includes('lead')) return Users;
    if (type.includes('call') || type.includes('followup')) return PhoneCall;
    if (type.includes('payment') || type.includes('invoice')) return CreditCard;
    if (type.includes('ticket') || type.includes('workflow')) return Zap;
    return Info;
  };

  const getPriorityBadgeColor = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return '#ef4444';
      case 'high':
        return '#f59e0b';
      case 'medium':
        return '#3b82f6';
      default:
        return '#94a3b8';
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={onMarkAllRead}>
          <CheckCircle2 size={20} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        {(['all', 'unread', 'urgent', 'system'] as const).map((t) => (
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

      {/* Main List */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        ) : (
          <View style={styles.listGroup}>
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((item) => {
                const Icon = item.IconComponent || getNotificationIcon(item.type);
                const priorityColor = getPriorityBadgeColor(item.priority);

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.card, 
                      item.isUnread && styles.unreadCard,
                      item.isPinned && styles.pinnedCard
                    ]}
                    onPress={() => onSelectNotification?.(item.id, item.actionUrl)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.iconCircle, { backgroundColor: item.bgColor || '#eff6ff' }]}>
                      <Icon size={20} color={item.iconColor || '#2563eb'} />
                      <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
                    </View>

                    <View style={styles.cardMain}>
                      <View style={styles.titleRow}>
                        <Text style={styles.notifTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        {item.isPinned && <Pin size={12} color="#2563eb" style={{ marginLeft: 4 }} />}
                        {item.isUnread && <View style={styles.blueDot} />}
                      </View>
                      <Text style={styles.notifDesc} numberOfLines={2}>{item.desc}</Text>
                      <Text style={styles.notifTime}>{item.time}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <EmptyStateComponent type="no_notifications" />
            )}
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  tabChipActive: {
    backgroundColor: '#2563eb',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
  },
  listGroup: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'flex-start',
  },
  unreadCard: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  pinnedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  priorityDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  cardMain: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  blueDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
    marginLeft: 6,
  },
  notifDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
    marginBottom: 6,
  },
  notifTime: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
});
