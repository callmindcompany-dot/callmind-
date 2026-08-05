import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Menu, Search, SlidersHorizontal, ArrowUpRight, ArrowDownLeft, Phone, MoreVertical } from 'lucide-react-native';
import { EmptyStateComponent } from '../components/EmptyStateComponent';

export interface CallLogItem {
  id: string;
  name: string;
  phone: string;
  time: string;
  duration: string;
  tag: string;
  tagColor: string;
  tagBg: string;
  direction: 'incoming' | 'outgoing' | 'missed';
  initials: string;
  avatarBg: string;
  avatarColor: string;
}

interface CallLogScreenProps {
  onBack: () => void;
  onSelectLead: (leadId: string) => void;
  callLogs?: CallLogItem[];
  refreshing?: boolean;
  onRefresh?: () => void;
}

export const CallLogScreen: React.FC<CallLogScreenProps> = ({
  onBack,
  onSelectLead,
  callLogs = [],
  refreshing = false,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'today' | 'missed' | 'scheduled'>('all');

  const tabs = [
    { key: 'all' as const, label: 'All' },
    { key: 'today' as const, label: 'Today' },
    { key: 'missed' as const, label: 'Missed' },
    { key: 'scheduled' as const, label: 'Scheduled' },
  ];

  const filteredLogs = callLogs.filter((log) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'today') return log.time.toLowerCase().includes('today') || log.time.toLowerCase().includes('recently');
    if (activeTab === 'missed') return log.direction === 'missed' || log.duration === '00:00';
    if (activeTab === 'scheduled') return log.tag.toLowerCase().includes('call back') || log.tag.toLowerCase().includes('scheduled');
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Header matching Reference UI Image 3 Screen 9 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
          <Menu size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Call Log</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn}>
            <Search size={20} color="#0f172a" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <SlidersHorizontal size={20} color="#0f172a" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Segmented Filter Pills */}
      <View style={styles.tabsContainer}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabChip, activeTab === t.key && styles.tabChipActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
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
        {filteredLogs.length > 0 ? (
          <>
            <Text style={styles.dateSectionLabel}>Recent Calls</Text>
            <View style={styles.logList}>
              {filteredLogs.map((log) => (
                <TouchableOpacity key={log.id} style={styles.logCard} onPress={() => onSelectLead(log.id)} activeOpacity={0.75}>
                  <View style={[styles.avatarCircle, { backgroundColor: log.avatarBg }]}>
                    <Text style={[styles.avatarText, { color: log.avatarColor }]}>{log.initials}</Text>
                  </View>

                  <View style={styles.logMain}>
                    <View style={styles.nameRow}>
                      {log.direction === 'outgoing' ? (
                        <ArrowUpRight size={16} color="#16a34a" />
                      ) : (
                        <ArrowDownLeft size={16} color="#ef4444" />
                      )}
                      <Text style={styles.leadName}>{log.name}</Text>
                    </View>
                    <Text style={styles.phoneText}>{log.phone}</Text>
                    <View style={[styles.tagBadge, { backgroundColor: log.tagBg }]}>
                      <Text style={[styles.tagText, { color: log.tagColor }]}>{log.tag}</Text>
                    </View>
                  </View>

                  <View style={styles.logRight}>
                    <Text style={styles.timeText}>{log.time}</Text>
                    <Text style={[styles.durationText, log.duration === '00:00' ? styles.durationRed : styles.durationGreen]}>
                      {log.duration}
                    </Text>
                    <TouchableOpacity style={styles.moreIconBtn}>
                      <MoreVertical size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <EmptyStateComponent type="no_calls" />
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
  dateSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 12,
  },
  logList: {
    gap: 12,
  },
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '800',
  },
  logMain: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  leadName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  phoneText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  tagBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 6,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  logRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  durationText: {
    fontSize: 14,
    fontWeight: '800',
  },
  durationGreen: {
    color: '#16a34a',
  },
  durationRed: {
    color: '#ef4444',
  },
  moreIconBtn: {
    padding: 2,
    marginTop: 4,
  },
});
