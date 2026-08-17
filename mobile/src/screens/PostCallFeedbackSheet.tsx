import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Modal, Linking } from 'react-native';
import { ArrowLeft, CheckCircle2, Calendar, Clock, WifiOff, MessageSquare, Plus, X, Zap, Send } from 'lucide-react-native';
import { followUpAt, type PostCallForm, type FormOption } from '../services/postCallForm';
import { whatsappReachoutService, DEFAULT_WHATSAPP_TEMPLATES, type WhatsAppTemplate } from '../services/whatsappReachout';

export interface PostCallFeedback {
  outcome: string;
  interest: string;
  notes: string;
  /** ISO timestamp for the follow-up, or null when none was scheduled. */
  followUpAt: string | null;
  leadPhone?: string;
  leadId?: string;
}

interface PostCallFeedbackSheetProps {
  leadName?: string;
  leadPhone?: string;
  leadId?: string;
  nextLeadName?: string;
  callDuration?: string;
  companyId?: string | null;
  /** The company's own form. Falls back to the built-in defaults upstream. */
  form: PostCallForm;
  onSubmit: (feedback: PostCallFeedback, dialNext?: boolean) => void;
  onDismiss: () => void;
}

const CONNECTED = 'Connected';

const DEFAULT_NOTE_CHIPS = [
  'Interested in Pricing',
  'Requested Callback',
  'Send Details on WhatsApp',
  'Decision Maker Busy',
  'Budget Issue',
  'Meeting Confirmed',
];

export const PostCallFeedbackSheet: React.FC<PostCallFeedbackSheetProps> = ({
  leadName = 'Lead',
  leadPhone,
  leadId,
  nextLeadName,
  callDuration = '00:00',
  companyId,
  form,
  onSubmit,
  onDismiss,
}) => {
  const feedbackOpenedAt = new Date().toLocaleString('en-IN', {
    hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', year: 'numeric',
  });

  const [outcome, setOutcome] = useState<string | null>(null);
  const [interest, setInterest] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [followUp, setFollowUp] = useState<string | null>(null);
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>(DEFAULT_WHATSAPP_TEMPLATES);

  useEffect(() => {
    whatsappReachoutService.getTemplates(companyId).then(setTemplates);
  }, [companyId]);

  // Custom date picker temporary selection states
  const [selectedDayOffset, setSelectedDayOffset] = useState(1); // 1 = Tomorrow
  const [selectedTimeHour, setSelectedTimeHour] = useState(11);
  const [selectedTimeMinute, setSelectedTimeMinute] = useState(0);

  const connected = outcome === CONNECTED;

  const followUpLabel = useMemo(() => {
    if (!followUp) return null;
    return new Date(followUp).toLocaleString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit',
    });
  }, [followUp]);

  const submit = (withOutcome: string, dialNext: boolean = false) => {
    onSubmit(
      {
        outcome: withOutcome,
        interest: withOutcome === CONNECTED ? (interest ?? '') : '',
        notes,
        followUpAt: followUp,
        leadPhone,
        leadId,
      },
      dialNext,
    );
  };

  const handleApplyCustomDate = () => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + selectedDayOffset);
    targetDate.setHours(selectedTimeHour, selectedTimeMinute, 0, 0);
    setFollowUp(targetDate.toISOString());
    setShowDatePickerModal(false);
  };

  const handleSendWhatsAppTemplate = async (tmpl: WhatsAppTemplate) => {
    if (!leadPhone) return;
    const variables: Record<string, string> = {
      lead_name: leadName,
      name: leadName,
      follow_up_time: followUpLabel || 'soon',
      followup_date: followUpLabel || 'soon',
      service: 'CallMind CRM services',
    };
    const renderedMsg = whatsappReachoutService.renderTemplate(tmpl.bodyText, variables);
    setShowWhatsAppModal(false);
    await whatsappReachoutService.openWhatsAppChat(leadPhone, renderedMsg);
  };

  const noteChips = useMemo(() => {
    if (form.noteTemplates && form.noteTemplates.length > 0) {
      return form.noteTemplates.map(t => t.label);
    }
    return DEFAULT_NOTE_CHIPS;
  }, [form.noteTemplates]);

  const chip = (
    option: FormOption,
    selected: boolean,
    onPress: () => void,
    icon?: React.ReactNode,
  ) => (
    <TouchableOpacity
      key={option.value}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={option.label}
      style={[
        styles.chip,
        selected && { backgroundColor: option.color ?? '#0f172a', borderColor: option.color ?? '#0f172a' },
      ]}
      onPress={onPress}
    >
      {icon}
      <Text style={[styles.chipText, selected && styles.chipTextSelected, icon ? { marginLeft: 6 } : null]}>
        {option.label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={onDismiss} accessibilityLabel="Close">
            <ArrowLeft size={20} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{leadName}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryCard}>
            <CheckCircle2 size={32} color="#16a34a" />
            <Text style={styles.summaryTitle}>Call Ended</Text>
            <Text style={styles.summaryDuration}>{callDuration}</Text>
            <Text style={styles.summaryLabel}>Dialer Elapsed Time (Not carrier verified)</Text>
            <Text style={styles.summaryDate}>{feedbackOpenedAt}</Text>
          </View>

          {form.stale && (
            <View style={styles.staleNote}>
              <WifiOff size={13} color="#b45309" />
              <Text style={styles.staleText}>
                Showing the saved form. Recent changes may not appear yet.
              </Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>How did it go?</Text>
          <View style={styles.chipGroup}>
            {form.outcomes.map(o => chip(o, outcome === o.value, () => {
              setOutcome(o.value);
              if (o.value !== CONNECTED) {
                // One tap and done. Saved immediately for unanswered/busy/invalid
                setInterest(null);
                submit(o.value, false);
              }
            }))}
          </View>

          {/* Everything below is asked only of a call that connected. */}
          {connected && (
            <>
              <Text style={styles.sectionTitle}>What did they say?</Text>
              <View style={styles.chipGroup}>
                {form.interests.map(o => chip(o, interest === o.value, () => setInterest(o.value)))}
              </View>

              <Text style={styles.sectionTitle}>
                Call back <Text style={styles.optionalText}>(optional)</Text>
              </Text>
              <View style={styles.chipGroup}>
                {form.followups.map(o => {
                  const iso = followUpAt(o);
                  const selected = followUp !== null &&
                    Math.abs(new Date(followUp).getTime() - new Date(iso).getTime()) < 60_000;
                  return chip(
                    o, selected,
                    () => setFollowUp(selected ? null : iso),
                    <Calendar size={13} color={selected ? '#ffffff' : '#64748b'} />,
                  );
                })}
                <TouchableOpacity
                  style={[styles.chip, styles.customDateChip]}
                  onPress={() => setShowDatePickerModal(true)}
                >
                  <Calendar size={13} color="#2563eb" />
                  <Text style={styles.customDateChipText}>Pick date…</Text>
                </TouchableOpacity>
              </View>
              {followUpLabel && (
                <View style={styles.followUpNote}>
                  <Clock size={13} color="#b45309" />
                  <Text style={styles.followUpNoteText}>{followUpLabel}</Text>
                </View>
              )}

              {/* Note Templates 1-Tap Insert */}
              <Text style={styles.sectionTitle}>Quick Note Tags (1-Tap Insert)</Text>
              <View style={styles.templatesRow}>
                {noteChips.map(tagText => (
                  <TouchableOpacity
                    key={tagText}
                    style={styles.templateChip}
                    onPress={() => setNotes(prev => prev ? `${prev} | ${tagText}` : tagText)}
                  >
                    <Plus size={11} color="#475569" />
                    <Text style={styles.templateChipText}>{tagText}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionTitle}>Notes</Text>
              <View style={styles.notesInputContainer}>
                <TextInput
                  style={styles.notesInput}
                  multiline
                  numberOfLines={4}
                  value={notes}
                  onChangeText={setNotes}
                  maxLength={200}
                  placeholder="What did they say? Anything to remember for next time."
                  placeholderTextColor="#94a3b8"
                />
                <Text style={styles.charCount}>{notes.length}/200</Text>
              </View>

              {leadPhone && (
                <TouchableOpacity
                  style={styles.whatsappActionBtn}
                  onPress={() => setShowWhatsAppModal(true)}
                >
                  <MessageSquare size={16} color="#16a34a" />
                  <Text style={styles.whatsappActionText}>Send WhatsApp Template Message</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </ScrollView>

        {connected && (
          <View style={styles.bottomFooter}>
            {nextLeadName ? (
              <View style={{ gap: 8 }}>
                <TouchableOpacity
                  style={[styles.saveAndNextBtn, !interest && styles.saveBtnDisabled]}
                  disabled={!interest}
                  onPress={() => submit(CONNECTED, true)}
                  accessibilityLabel="Save and Dial Next"
                >
                  <Zap size={16} color="#ffffff" />
                  <Text style={styles.saveBtnText}>
                    {interest ? `Save & Dial Next (${nextLeadName})` : 'Pick what they said'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, !interest && styles.saveBtnDisabled]}
                  disabled={!interest}
                  onPress={() => submit(CONNECTED, false)}
                  accessibilityLabel="Save Only"
                >
                  <Text style={[styles.saveBtnText, { color: '#0f172a' }]}>
                    Save Only
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.saveBtn, !interest && styles.saveBtnDisabled]}
                disabled={!interest}
                onPress={() => submit(CONNECTED, false)}
                accessibilityLabel="Save"
              >
                <Text style={styles.saveBtnText}>
                  {interest ? 'Save Call Feedback' : 'Pick what they said'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Custom Date & Time Picker Modal */}
      <Modal
        visible={showDatePickerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Callback Date & Time</Text>
              <TouchableOpacity onPress={() => setShowDatePickerModal(false)} style={styles.modalCloseBtn}>
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Choose Day</Text>
            <View style={styles.daySelectorRow}>
              {[
                { offset: 0, label: 'Today' },
                { offset: 1, label: 'Tomorrow' },
                { offset: 2, label: 'In 2 Days' },
                { offset: 3, label: 'In 3 Days' },
                { offset: 7, label: 'Next Week' },
              ].map(d => (
                <TouchableOpacity
                  key={d.offset}
                  style={[styles.dayChoiceBtn, selectedDayOffset === d.offset && styles.dayChoiceBtnActive]}
                  onPress={() => setSelectedDayOffset(d.offset)}
                >
                  <Text style={[styles.dayChoiceText, selectedDayOffset === d.offset && styles.dayChoiceTextActive]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalSubtitle}>Choose Time Slot</Text>
            <View style={styles.timeSelectorRow}>
              {[
                { h: 10, m: 0, label: '10:00 AM' },
                { h: 11, m: 30, label: '11:30 AM' },
                { h: 14, m: 0, label: '02:00 PM' },
                { h: 16, m: 0, label: '04:00 PM' },
                { h: 18, m: 30, label: '06:30 PM' },
              ].map(t => (
                <TouchableOpacity
                  key={t.label}
                  style={[styles.timeChoiceBtn, selectedTimeHour === t.h && selectedTimeMinute === t.m && styles.timeChoiceBtnActive]}
                  onPress={() => {
                    setSelectedTimeHour(t.h);
                    setSelectedTimeMinute(t.m);
                  }}
                >
                  <Text style={[styles.timeChoiceText, selectedTimeHour === t.h && selectedTimeMinute === t.m && styles.timeChoiceTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.confirmDateBtn} onPress={handleApplyCustomDate}>
              <Text style={styles.confirmDateBtnText}>Set Follow-up Time</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* WhatsApp Template Picker Modal */}
      <Modal
        visible={showWhatsAppModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWhatsAppModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MessageSquare size={18} color="#16a34a" />
                <Text style={styles.modalTitle}>Choose WhatsApp Template</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowWhatsAppModal(false)}
                accessibilityLabel="Close"
              >
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { marginBottom: 12 }]}>
              Pre-approved business message templates
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
              <View style={{ gap: 10, paddingBottom: 16 }}>
                {templates.map((tmpl) => {
                  const previewText = whatsappReachoutService.renderTemplate(tmpl.bodyText, {
                    lead_name: leadName,
                    name: leadName,
                    follow_up_time: followUpLabel || 'soon',
                    followup_date: followUpLabel || 'soon',
                    service: 'CallMind CRM services',
                  });

                  return (
                    <TouchableOpacity
                      key={tmpl.id}
                      style={styles.tmplCard}
                      onPress={() => handleSendWhatsAppTemplate(tmpl)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.tmplHeader}>
                        <Text style={styles.tmplIcon}>{tmpl.icon || '💬'}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.tmplName}>{tmpl.name}</Text>
                          <Text style={styles.tmplCategory}>{tmpl.category}</Text>
                        </View>
                        <Send size={14} color="#16a34a" />
                      </View>
                      <Text style={styles.tmplBody} numberOfLines={3}>
                        {previewText}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  staleNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 4,
  },
  staleText: { fontSize: 11, fontWeight: '600', color: '#b45309', flex: 1 },
  followUpNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
  },
  followUpNoteText: { fontSize: 12, fontWeight: '700', color: '#b45309' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '92%',
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 24, gap: 4 },
  summaryCard: {
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 20,
    paddingVertical: 20,
    marginBottom: 12,
    gap: 2,
  },
  summaryTitle: { fontSize: 13, fontWeight: '800', color: '#166534', marginTop: 6 },
  summaryDuration: { fontSize: 26, fontWeight: '900', color: '#0f172a' },
  summaryLabel: { fontSize: 10, fontWeight: '600', color: '#64748b' },
  summaryDate: { fontSize: 10, fontWeight: '600', color: '#94a3b8', marginTop: 2 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 16,
    marginBottom: 8,
  },
  optionalText: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  chipText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  chipTextSelected: { color: '#ffffff' },
  customDateChip: {
    borderStyle: 'dashed',
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff',
  },
  customDateChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
    marginLeft: 6,
  },
  templatesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  templateChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  notesInputContainer: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    padding: 12,
  },
  notesInput: {
    minHeight: 84,
    fontSize: 14,
    color: '#0f172a',
    textAlignVertical: 'top',
  },
  charCount: { alignSelf: 'flex-end', fontSize: 10, fontWeight: '600', color: '#94a3b8' },
  whatsappActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 12,
  },
  whatsappActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803d',
  },
  bottomFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  saveBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  saveAndNextBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: { backgroundColor: '#cbd5e1', borderColor: '#cbd5e1' },
  saveBtnText: { fontSize: 14, fontWeight: '800', color: '#ffffff' },

  // WhatsApp Template Modal Card Styles
  tmplCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  tmplHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tmplIcon: {
    fontSize: 20,
  },
  tmplName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  tmplCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16a34a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tmplBody: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
    lineHeight: 17,
  },

  // Date-Time Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#64748b',
    marginBottom: 8,
    marginTop: 4,
  },
  daySelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  dayChoiceBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dayChoiceBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  dayChoiceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  dayChoiceTextActive: {
    color: '#ffffff',
  },
  timeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 20,
  },
  timeChoiceBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  timeChoiceBtnActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  timeChoiceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  timeChoiceTextActive: {
    color: '#ffffff',
  },
  confirmDateBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmDateBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
});
