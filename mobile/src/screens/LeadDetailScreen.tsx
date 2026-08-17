import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ArrowLeft, Phone, Edit3, Star, ChevronRight, MessageSquare } from 'lucide-react-native';

import { LeadItem } from './LeadListScreen';
import { activityService, type ActivityEntry } from '../services/activityService';
import { whatsappReachoutService } from '../services/whatsappReachout';

/**
 * One lead, as recorded.
 *
 * Everything on this screen used to have a made-up fallback. A lead with no
 * name showed "Rahul Sharma"; no email showed "rahul.sharma@email.com"; no
 * city showed "Pune, Maharashtra"; the source read "Facebook Ads" whatever it
 * was. Language was always "Hindi, English", Assigned To was always the string
 * "Assigned Telecaller", and Loan Amount was always ₹ 5,000,000 -- a fifty-lakh
 * deal printed against every lead in the book.
 *
 * The timeline below them was three fixed entries: a call at 10:30 for 02:34, a
 * note reading "Interested in Honda City V model" at 10:31, and a status change
 * at 10:32. They showed under a lead nobody had ever called. The status bar at
 * the bottom said "Interested" regardless of what the lead's status was.
 *
 * Missing data now reads as missing.
 */

interface LeadDetailScreenProps {
  leadId: string;
  lead?: LeadItem;
  companyId?: string | null;
  onBack: () => void;
  onCall: (phone: string) => void;
  /**
   * Opens the lead form to correct these details.
   *
   * Both Edit controls on this screen had no handler, so an agent who learned
   * the right spelling of a name or a working email on a call could not record
   * it, and the next person to ring dialled the same wrong number.
   */
  onEdit?: () => void;
}

/** A field with nothing in it says so, rather than borrowing someone else's. */
const NOT_PROVIDED = 'Not provided';

export const LeadDetailScreen: React.FC<LeadDetailScreenProps> = ({
  leadId,
  lead: passedLead,
  companyId,
  onBack,
  onCall,
  onEdit,
}) => {
  const lead = {
    name: passedLead?.name || 'Unnamed lead',
    phone: passedLead?.phone || '',
    email: passedLead?.email || NOT_PROVIDED,
    city: passedLead?.address || passedLead?.city || NOT_PROVIDED,
    notes: passedLead?.comment || NOT_PROVIDED,
    status: passedLead?.status || 'New',
    tag: passedLead?.tag || 'New',
    tagColor: passedLead?.color || '#64748b',
    initials: passedLead?.initials || '?',
  };

  const [activity, setActivity] = useState<ActivityEntry[] | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!companyId || !leadId) { setActivity([]); return; }
    (async () => {
      try {
        const rows = await activityService.forLead(companyId, leadId);
        if (!cancelled) setActivity(rows);
      } catch (e) {
        if (!cancelled) {
          setActivity(null);
          setActivityError(e instanceof Error ? e.message : 'Could not load the history.');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [companyId, leadId]);

  const whenLabel = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const today = d.toDateString() === new Date().toDateString();
    const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return today ? `Today, ${time}` : `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${time}`;
  };

  return (
    <View style={styles.container}>
      {/* Top Header matching Reference UI Image 2 Screen 7 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        {/* The star and overflow buttons here had no handlers. */}
        <View style={styles.headerRight} />
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
            <Text style={styles.leadPhone}>{lead.phone || 'No number on file'}</Text>
          </View>

          {/*
            One button, because one of the four did anything. WhatsApp, Schedule
            and Edit Note had no onPress at all -- tapping them read as the app
            being broken rather than the feature being absent. Scheduling is on
            the post-call form, which is where an agent actually needs it.
          */}
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => onCall(lead.phone)}
              disabled={!lead.phone}
              activeOpacity={0.8}
            >
              <View style={[styles.actionCircle, { backgroundColor: lead.phone ? '#16A34A' : '#cbd5e1' }]}>
                <Phone size={20} color="#ffffff" />
              </View>
              <Text style={styles.actionLabel}>Call now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => {
                if (!lead.phone) return;
                const msg = `Hello ${lead.name}, connecting from CallMind regarding your inquiry. Please let us know if you need any assistance.`;
                whatsappReachoutService.openWhatsAppChat(lead.phone, msg);
              }}
              disabled={!lead.phone}
              activeOpacity={0.8}
            >
              <View style={[styles.actionCircle, { backgroundColor: lead.phone ? '#25D366' : '#cbd5e1' }]}>
                <MessageSquare size={20} color="#ffffff" />
              </View>
              <Text style={styles.actionLabel}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Lead Information Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Lead information</Text>
            <TouchableOpacity onPress={onEdit}>
              <Text style={styles.editLink}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={[styles.infoValue, lead.email === NOT_PROVIDED && styles.infoMissing]}>
              {lead.email}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>City</Text>
            <Text style={[styles.infoValue, lead.city === NOT_PROVIDED && styles.infoMissing]}>
              {lead.city}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={styles.infoValue}>{lead.status}</Text>
          </View>
          {/*
            Language, Assigned To and Loan Amount are gone. None of the three
            was read from anywhere: language was always "Hindi, English",
            Assigned To was the literal string "Assigned Telecaller", and Loan
            Amount was ₹ 5,000,000 against every lead in the book. The agent
            looking at this screen is the person it is assigned to anyway.
          */}
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>Notes</Text>
            <Text style={[styles.infoValue, lead.notes === NOT_PROVIDED && styles.infoMissing]}>
              {lead.notes}
            </Text>
          </View>
        </View>

        {/* Activity Timeline Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>History</Text>
          </View>

          {activityError && (
            <Text style={styles.timelineNotice}>{activityError}</Text>
          )}

          {!activityError && activity === null && (
            <View style={styles.timelineLoading}>
              <ActivityIndicator color="#2563eb" />
            </View>
          )}

          {!activityError && activity !== null && activity.length === 0 && (
            <Text style={styles.timelineNotice}>
              Nothing recorded yet. Logging a call adds a line here.
            </Text>
          )}

          {activity !== null && activity.length > 0 && (
            <View style={styles.timelineList}>
              {activity.map((entry) => {
                const isStatus = entry.type === 'status_change';
                return (
                  <View key={entry.id} style={styles.timelineItem}>
                    <View style={[styles.timelineIconBg, { backgroundColor: isStatus ? '#EFF6FF' : '#DCFCE7' }]}>
                      {isStatus
                        ? <Star size={14} color="#2563eb" />
                        : <Phone size={14} color="#16A34A" />}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineTitle}>
                        {isStatus ? 'Status changed' : entry.type.replace(/_/g, ' ')}
                      </Text>
                      <Text style={styles.timelineTime}>{whenLabel(entry.at)}</Text>
                      <Text style={styles.timelineSub}>
                        {entry.fromStatus && entry.toStatus
                          ? `${entry.fromStatus} → ${entry.toStatus}`
                          : entry.description}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* The Add New Note button had no handler; notes are written on the
              post-call form, which is the moment an agent has something to say. */}
        </View>
      </ScrollView>

      {/*
        The badge here read "Interested" for every lead, whatever its status,
        beside a Change Status button with no handler. The status is written by
        the post-call form, which is the only place it should change from -- a
        status set without a call recorded beside it is how a pipeline stops
        meaning anything.
      */}
      <View style={styles.bottomStatusBar}>
        <View style={styles.currentStatusLeft}>
          <Text style={styles.statusLabel}>Current status</Text>
          <View style={styles.statusBadgeRow}>
            <View style={[styles.greenDot, { backgroundColor: lead.tagColor }]} />
            <Text style={styles.statusBadgeText}>{lead.status}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.changeStatusBtn}
          onPress={() => onCall(lead.phone)}
          disabled={!lead.phone}
        >
          <Text style={styles.changeStatusText}>Call and update</Text>
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
  /** A field the lead does not have, so it does not read as a real value. */
  infoMissing: {
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  timelineNotice: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 19,
    paddingVertical: 8,
  },
  timelineLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
