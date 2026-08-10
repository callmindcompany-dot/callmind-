import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { ArrowLeft, Plus, Phone, RotateCcw } from 'lucide-react-native';
import { EmptyStateComponent } from '../components/EmptyStateComponent';

export interface CallbackItem {
  id: string;
  /** The lead to open when the row is tapped. */
  leadId?: string;
  name: string;
  phone: string;
  /** Human label for reminder_date — "Today, 11:00", "Overdue — 3/8 16:00". */
  time: string;
  note: string;
  initials: string;
  avatarBg: string;
  avatarColor: string;
  isToday?: boolean;
  /** Past its reminder time. Shown red, and sorted to the top. */
  isOverdue?: boolean;
  /** ISO, for sorting and for the reminder notification. */
  reminderDate?: string;
}


/**
 * One follow-up.
 *
 * Extracted because the screen had this markup twice, and both copies passed
 * the callback's own id to onSelectLead instead of the lead's — so "Call Now"
 * opened nothing. The Reschedule button had no onPress at all.
 */
const CallbackCard = ({
  cb,
  onSelectLead,
  onCallLead,
  onReschedule,
  onComplete,
}: {
  cb: CallbackItem;
  onSelectLead: (leadId: string) => void;
  /** leadId so the caller can move the lead once the call is logged. */
  onCallLead?: (phone: string, name: string, leadId?: string) => void;
  onReschedule?: (cb: CallbackItem) => void;
  onComplete?: (cb: CallbackItem) => void;
}) => (
  <View style={[styles.card, cb.isOverdue && styles.cardOverdue]}>
    <TouchableOpacity
      style={styles.cardTop}
      disabled={!cb.leadId}
      onPress={() => cb.leadId && onSelectLead(cb.leadId)}
    >
      <View style={[styles.avatarCircle, { backgroundColor: cb.avatarBg }]}>
        <Text style={[styles.avatarText, { color: cb.avatarColor }]}>{cb.initials}</Text>
      </View>
      <View style={styles.cardMain}>
        <Text style={styles.leadName}>{cb.name}</Text>
        <Text style={styles.phoneText}>{cb.phone}</Text>
        <Text style={styles.noteSubText}>{cb.note}</Text>
      </View>
      <Text style={[styles.timeBadgeText, cb.isOverdue && styles.timeOverdue]}>{cb.time}</Text>
    </TouchableOpacity>

    <View style={styles.actionRow}>
      <TouchableOpacity
        style={styles.callNowBtn}
        disabled={!cb.phone}
        onPress={() =>
          onCallLead && cb.phone
            ? onCallLead(cb.phone, cb.name, cb.leadId)
            : cb.leadId && onSelectLead(cb.leadId)
        }
      >
        <Phone size={14} color="#16a34a" />
        <Text style={styles.callNowText}>Call Now</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.rescheduleBtn} onPress={() => onReschedule?.(cb)}>
        <RotateCcw size={14} color="#2563eb" />
        <Text style={styles.rescheduleText}>Reschedule</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.doneBtn} onPress={() => onComplete?.(cb)}>
        <Text style={styles.doneText}>Done</Text>
      </TouchableOpacity>
    </View>
  </View>
);

interface CallbacksScreenProps {
  onBack: () => void;
  onSelectLead: (leadId: string) => void;
  onCallLead?: (phone: string, name: string, leadId?: string) => void;
  callbacks?: CallbackItem[];
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Push a follow-up to a later time. */
  onReschedule?: (callback: CallbackItem) => void;
  /** Mark it done without calling from here. */
  onComplete?: (callback: CallbackItem) => void;
}

export const CallbacksScreen: React.FC<CallbacksScreenProps> = ({
  onBack,
  onSelectLead,
  onCallLead,
  callbacks = [],
  refreshing = false,
  onRefresh,
  onReschedule,
  onComplete,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'today' | 'upcoming'>('all');

  // Overdue first, and separately. Previously a follow-up whose time had passed
  // sat in the "Today" list looking no different from one due at 5pm, so the
  // one the agent was already late for was the hardest to spot.
  const overdueCallbacks = callbacks.filter(c => c.isOverdue);
  const todayCallbacks = callbacks.filter(c => !c.isOverdue && c.isToday !== false);
  const upcomingCallbacks = callbacks.filter(c => !c.isOverdue && c.isToday === false);

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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />
          ) : undefined
        }
      >
        {callbacks.length === 0 ? (
          <EmptyStateComponent type="no_callbacks" />
        ) : (
          <>
            {[
              { label: 'Overdue', items: overdueCallbacks },
              { label: 'Today', items: todayCallbacks },
              { label: 'Upcoming', items: upcomingCallbacks },
            ].map(({ label, items }, i) =>
              items.length === 0 ? null : (
                <View key={label}>
                  <Text style={[styles.sectionHeaderLabel, i > 0 && { marginTop: 24 }]}>
                    {label} ({items.length})
                  </Text>
                  <View style={styles.listGroup}>
                    {items.map((cb) => (
                      <CallbackCard
                        key={cb.id}
                        cb={cb}
                        onSelectLead={onSelectLead}
                        onCallLead={onCallLead}
                        onReschedule={onReschedule}
                        onComplete={onComplete}
                      />
                    ))}
                  </View>
                </View>
              ),
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  cardOverdue: { borderColor: '#fecaca', borderWidth: 1 },
  timeOverdue: { color: '#dc2626', fontWeight: '700' },
  doneBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: { fontSize: 12, fontWeight: '700', color: '#475569' },
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
