import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft, CheckCircle2, Users, Clock, Target, Award } from 'lucide-react-native';
import { EmptyStateComponent } from '../components/EmptyStateComponent';

export interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  isUnread: boolean;
  IconComponent?: any;
  bgColor?: string;
  iconColor?: string;
}

interface NotificationCenterScreenProps {
  onBack: () => void;
  onSelectNotification?: (id: string) => void;
  notifications?: NotificationItem[];
}

export const NotificationCenterScreen: React.FC<NotificationCenterScreenProps> = ({
  onBack,
  onSelectNotification,
  notifications = [],
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'system'>('all');

  return (
    <View style={styles.container}>
      {/* Top Header matching Reference UI Image 5 Screen 20 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <CheckCircle2 size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        {(['all', 'unread', 'system'] as const).map((t) => (
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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.listGroup}>
          {notifications.length > 0 ? (
            notifications.map((item) => {
              const Icon = item.IconComponent || Users;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.card, item.isUnread && styles.unreadCard]}
                  onPress={() => onSelectNotification?.(item.id)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.iconCircle, { backgroundColor: item.bgColor || '#eff6ff' }]}>
                    <Icon size={20} color={item.iconColor || '#2563eb'} />
                  </View>

                  <View style={styles.cardMain}>
                    <View style={styles.titleRow}>
                      <Text style={styles.notifTitle}>{item.title}</Text>
                      {item.isUnread && <View style={styles.blueDot} />}
                    </View>
                    <Text style={styles.notifDesc}>{item.desc}</Text>
                    <Text style={styles.notifTime}>{item.time}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <EmptyStateComponent type="no_notifications" />
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
  unreadCard: {
    backgroundColor: '#f8fafc',
    borderColor: '#dbeafe',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
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
  notifTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  blueDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
  },
  notifDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 3,
    lineHeight: 18,
  },
  notifTime: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 6,
  },
});
