import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft, Plus, Phone, RotateCcw } from 'lucide-react-native';
import { EmptyStateComponent } from '../components/EmptyStateComponent';

export interface CallbackItem {
  id: string;
  name: string;
  phone: string;
  time: string;
  note: string;
  initials: string;
  avatarBg: string;
  avatarColor: string;
  isToday?: boolean;
}

interface CallbacksScreenProps {
  onBack: () => void;
  onSelectLead: (leadId: string) => void;
  callbacks?: CallbackItem[];
}

export const CallbacksScreen: React.FC<CallbacksScreenProps> = ({ onBack, onSelectLead, callbacks = [] }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'today' | 'upcoming'>('all');

  const todayCallbacks = callbacks.filter(c => c.isToday !== false);
  const tomorrowCallbacks = callbacks.filter(c => c.isToday === false);

  return (
    <View style={styles.container}>
      {/* Top Header matching Reference UI Image 3 Screen 10 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Callbacks</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Plus size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {/* Segmented Filter Pills */}
      <View style={styles.tabsContainer}>
        {(['all', 'today', 'upcoming'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabChip, activeTab === t && styles.tabChipActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
              {t === 'all' ? 'All' : t === 'today' ? 'Today' : 'Upcoming'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {callbacks.length === 0 ? (
          <EmptyStateComponent type="no_callbacks" />
        ) : (
          <>
            {todayCallbacks.length > 0 && (
              <>
                <Text style={styles.sectionHeaderLabel}>Today</Text>
                <View style={styles.listGroup}>
                  {todayCallbacks.map((cb) => (
                    <View key={cb.id} style={styles.card}>
                      <View style={styles.cardTop}>
                        <View style={[styles.avatarCircle, { backgroundColor: cb.avatarBg }]}>
                          <Text style={[styles.avatarText, { color: cb.avatarColor }]}>{cb.initials}</Text>
                        </View>
                        <View style={styles.cardMain}>
                          <Text style={styles.leadName}>{cb.name}</Text>
                          <Text style={styles.phoneText}>{cb.phone}</Text>
                          <Text style={styles.noteSubText}>{cb.note}</Text>
                        </View>
                        <Text style={styles.timeBadgeText}>{cb.time}</Text>
                      </View>

                      <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.callNowBtn} onPress={() => onSelectLead(cb.id)}>
                          <Phone size={14} color="#16a34a" />
                          <Text style={styles.callNowText}>Call Now</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.rescheduleBtn}>
                          <RotateCcw size={14} color="#2563eb" />
                          <Text style={styles.rescheduleText}>Reschedule</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {tomorrowCallbacks.length > 0 && (
              <>
                <Text style={[styles.sectionHeaderLabel, { marginTop: 24 }]}>Upcoming</Text>
                <View style={styles.listGroup}>
                  {tomorrowCallbacks.map((cb) => (
                    <View key={cb.id} style={styles.card}>
                      <View style={styles.cardTop}>
                        <View style={[styles.avatarCircle, { backgroundColor: cb.avatarBg }]}>
                          <Text style={[styles.avatarText, { color: cb.avatarColor }]}>{cb.initials}</Text>
                        </View>
                        <View style={styles.cardMain}>
                          <Text style={styles.leadName}>{cb.name}</Text>
                          <Text style={styles.phoneText}>{cb.phone}</Text>
                          <Text style={styles.noteSubText}>{cb.note}</Text>
                        </View>
                        <Text style={styles.timeBadgeText}>{cb.time}</Text>
                      </View>

                      <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.callNowBtn} onPress={() => onSelectLead(cb.id)}>
                          <Phone size={14} color="#16a34a" />
                          <Text style={styles.callNowText}>Call Now</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.rescheduleBtn}>
                          <RotateCcw size={14} color="#2563eb" />
                          <Text style={styles.rescheduleText}>Reschedule</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
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
  sectionHeaderLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 12,
  },
  listGroup: {
    gap: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTop: {
    flexDirection: 'row',
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '800',
  },
  cardMain: {
    flex: 1,
  },
  leadName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  phoneText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  noteSubText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  timeBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ef4444',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  callNowBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dcfce7',
    gap: 6,
  },
  callNowText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16a34a',
  },
  rescheduleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
    gap: 6,
  },
  rescheduleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },
});
