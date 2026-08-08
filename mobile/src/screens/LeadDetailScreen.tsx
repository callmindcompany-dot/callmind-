import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft, Star, MoreVertical, Phone, MessageSquare, Calendar, Edit3, Plus, ChevronRight } from 'lucide-react-native';

import { LeadItem } from './LeadListScreen';

interface LeadDetailScreenProps {
  leadId: string;
  lead?: LeadItem;
  onBack: () => void;
  onCall: (phone: string) => void;
}

export const LeadDetailScreen: React.FC<LeadDetailScreenProps> = ({ leadId, lead: passedLead, onBack, onCall }) => {
  const lead = {
    name: passedLead?.name || 'Rahul Sharma',
    // A lead with no number shows that it has no number.
    phone: passedLead?.phone || '',
    email: passedLead?.email || 'rahul.sharma@email.com',
    city: passedLead?.city || 'Pune, Maharashtra',
    source: passedLead?.comment || 'Facebook Ads',
    language: 'Hindi, English',
    assignedTo: 'Assigned Telecaller',
    loanAmount: '₹ 5,000,000',
    tag: passedLead?.tag || 'New',
    tagColor: passedLead?.color || '#EF4444',
    initials: passedLead?.initials || 'RS',
  };

  return (
    <View style={styles.container}>
      {/* Top Header matching Reference UI Image 2 Screen 7 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn}>
            <Star size={20} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <MoreVertical size={20} color="#0f172a" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Lead Info Profile Card */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarTextLarge}>{lead.initials}</Text>
          </View>

          <View style={styles.profileHeaderInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.leadName}>{lead.name}</Text>
              <View style={styles.hotBadge}>
                <Text style={styles.hotBadgeText}>{lead.tag}</Text>
              </View>
            </View>
            <Text style={styles.leadPhone}>{lead.phone}</Text>
          </View>

          {/* 4 Action Buttons Row matching Reference UI Image 2 Screen 7 */}
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionItem} onPress={() => onCall(lead.phone)} activeOpacity={0.8}>
              <View style={[styles.actionCircle, { backgroundColor: '#16A34A' }]}>
                <Phone size={20} color="#ffffff" />
              </View>
              <Text style={styles.actionLabel}>Call Now</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} activeOpacity={0.8}>
              <View style={[styles.actionCircle, { backgroundColor: '#22C55E' }]}>
                <MessageSquare size={20} color="#ffffff" />
              </View>
              <Text style={styles.actionLabel}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} activeOpacity={0.8}>
              <View style={[styles.actionCircle, { backgroundColor: '#2563eb' }]}>
                <Calendar size={20} color="#ffffff" />
              </View>
              <Text style={styles.actionLabel}>Schedule</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} activeOpacity={0.8}>
              <View style={[styles.actionCircle, { backgroundColor: '#3B82F6' }]}>
                <Edit3 size={20} color="#ffffff" />
              </View>
              <Text style={styles.actionLabel}>Edit Note</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Lead Information Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Lead Information</Text>
            <TouchableOpacity>
              <Text style={styles.editLink}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{lead.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>City</Text>
            <Text style={styles.infoValue}>{lead.city}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Source</Text>
            <Text style={styles.infoValue}>{lead.source}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Language</Text>
            <Text style={styles.infoValue}>{lead.language}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Assigned To</Text>
            <Text style={styles.infoValue}>{lead.assignedTo}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>Loan Amount</Text>
            <Text style={styles.infoValueBold}>{lead.loanAmount}</Text>
          </View>
        </View>

        {/* Activity Timeline Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Activity Timeline</Text>
            <TouchableOpacity style={styles.viewAllRow}>
              <Text style={styles.viewAllText}>View All</Text>
              <ChevronRight size={14} color="#2563eb" />
            </TouchableOpacity>
          </View>

          <View style={styles.timelineList}>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineIconBg, { backgroundColor: '#DCFCE7' }]}>
                <Phone size={14} color="#16A34A" />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Called</Text>
                <Text style={styles.timelineTime}>Today, 10:30 AM • 02:34</Text>
                <Text style={styles.timelineSub}>Spoke to lead, interested.</Text>
              </View>
            </View>

            <View style={styles.timelineItem}>
              <View style={[styles.timelineIconBg, { backgroundColor: '#FEF3C7' }]}>
                <Edit3 size={14} color="#D97706" />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Note Added</Text>
                <Text style={styles.timelineTime}>Today, 10:31 AM</Text>
                <Text style={styles.timelineSub}>Interested in Honda City V model.</Text>
              </View>
            </View>

            <View style={styles.timelineItem}>
              <View style={[styles.timelineIconBg, { backgroundColor: '#EFF6FF' }]}>
                <Star size={14} color="#2563eb" />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Status Changed</Text>
                <Text style={styles.timelineTime}>Today, 10:32 AM</Text>
                <Text style={styles.timelineSub}>New → Interested</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.addNoteBtn}>
            <Plus size={16} color="#2563eb" />
            <Text style={styles.addNoteText}>Add New Note</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Current Status Bar at Bottom matching Reference UI Image 2 Screen 7 */}
      <View style={styles.bottomStatusBar}>
        <View style={styles.currentStatusLeft}>
          <Text style={styles.statusLabel}>Current Status</Text>
          <View style={styles.statusBadgeRow}>
            <View style={styles.greenDot} />
            <Text style={styles.statusBadgeText}>Interested</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.changeStatusBtn}>
          <Text style={styles.changeStatusText}>Change Status</Text>
        </TouchableOpacity>
      </View>
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
  headerRight: {
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  profileHeaderCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarTextLarge: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2563eb',
  },
  profileHeaderInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  leadName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  hotBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hotBadgeText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '700',
  },
  leadPhone: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 4,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  actionItem: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  actionCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  editLink: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '700',
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  infoValueBold: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  timelineList: {
    gap: 14,
    marginBottom: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  timelineTime: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  timelineSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  addNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    gap: 6,
  },
  addNoteText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },
  bottomStatusBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  currentStatusLeft: {
    gap: 2,
  },
  statusLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16a34a',
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  changeStatusBtn: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  changeStatusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },
});
