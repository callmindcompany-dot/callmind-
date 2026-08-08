import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { ArrowLeft, CheckCircle2, Calendar, ChevronDown, Clock } from 'lucide-react-native';

export interface PostCallFeedback {
  outcome: string;
  interest: string;
  notes: string;
  /** ISO timestamp for the follow-up, or null when none was scheduled. */
  followUpAt: string | null;
}

interface PostCallFeedbackSheetProps {
  leadName?: string;
  callDuration?: string;
  onSubmit: (feedback: PostCallFeedback) => void;
  onDismiss: () => void;
}

/**
 * Follow-up choices, as offsets from now.
 *
 * A picker would be better, but @react-native-community/datetimepicker is not
 * installed and adding a native module to make a follow-up time is out of
 * proportion to the job. These four cover what a telecaller actually chooses
 * between calls, and the agent has five seconds to fill this form.
 */
const FOLLOW_UP_CHOICES: { label: string; at: () => Date }[] = [
  { label: 'In 2 hours', at: () => new Date(Date.now() + 2 * 60 * 60 * 1000) },
  {
    label: 'Tomorrow 10am',
    at: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); return d; },
  },
  {
    label: 'In 3 days',
    at: () => { const d = new Date(); d.setDate(d.getDate() + 3); d.setHours(10, 0, 0, 0); return d; },
  },
  {
    label: 'Next week',
    at: () => { const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(10, 0, 0, 0); return d; },
  },
];

export const PostCallFeedbackSheet: React.FC<PostCallFeedbackSheetProps> = ({
  leadName = 'Lead',
  callDuration = '00:00',
  onSubmit,
  onDismiss,
}) => {
  const feedbackOpenedAt = new Date().toLocaleString('en-IN', {
    hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', year: 'numeric',
  });
  const [selectedOutcome, setSelectedOutcome] = useState('Connected');
  const [selectedInterest, setSelectedInterest] = useState('Interested');
  const [notes, setNotes] = useState('');
  const [followUp, setFollowUp] = useState<string | null>(null);

  const outcomes = ['Connected', 'No Answer', 'Busy', 'Invalid Number', 'Wrong Number'];
  const interestLevels = ['Interested', 'Not Interested', 'Call Back Later'];

  return (
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={onDismiss}>
            <ArrowLeft size={20} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post-Call Feedback</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Call Ended Summary Banner Card */}
          <View style={styles.summaryCard}>
            <CheckCircle2 size={32} color="#16a34a" />
            <Text style={styles.summaryTitle}>Call Ended</Text>
            <Text style={styles.summaryDuration}>{callDuration}</Text>
            <Text style={styles.summaryLabel}>Dialer Elapsed Time (Not carrier verified)</Text>
            <Text style={styles.summaryDate}>{feedbackOpenedAt}</Text>
          </View>

          {/* Outcome Section */}
          <Text style={styles.sectionTitle}>Outcome</Text>
          <View style={styles.chipGroup}>
            {outcomes.map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.chip,
                  selectedOutcome === item && styles.chipActiveBlue,
                ]}
                onPress={() => setSelectedOutcome(item)}
              >
                <Text style={[styles.chipText, selectedOutcome === item && styles.chipTextActiveBlue]}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Interest Level Section */}
          <Text style={styles.sectionTitle}>Interest Level</Text>
          <View style={styles.chipGroup}>
            {interestLevels.map((item) => {
              const isSelected = selectedInterest === item;
              let activeStyle = styles.chipActiveGreen;
              let activeTextStyle = styles.chipTextActiveGreen;
              if (item === 'Call Back Later') {
                activeStyle = styles.chipActiveAmber;
                activeTextStyle = styles.chipTextActiveAmber;
              }
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.chip, isSelected && activeStyle]}
                  onPress={() => setSelectedInterest(item)}
                >
                  <Text style={[styles.chipText, isSelected && activeTextStyle]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Schedule Callback.
              Two pickers used to sit here reading "Tomorrow" and "11:00 AM".
              Neither had an onPress, and neither value was ever sent — the
              form looked like it scheduled a follow-up and scheduled nothing. */}
          <Text style={styles.sectionTitle}>
            Schedule Callback <Text style={styles.optionalText}>(Optional)</Text>
          </Text>
          <View style={styles.chipGroup}>
            {FOLLOW_UP_CHOICES.map(({ label, at }) => {
              const iso = at().toISOString();
              const isSelected = followUp === iso;
              return (
                <TouchableOpacity
                  key={label}
                  style={[styles.chip, isSelected && styles.chipActiveAmber]}
                  onPress={() => setFollowUp(isSelected ? null : iso)}
                >
                  <Calendar size={13} color={isSelected ? '#b45309' : '#64748b'} />
                  <Text style={[styles.chipText, isSelected && styles.chipTextActiveAmber, { marginLeft: 6 }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {followUp && (
            <View style={styles.followUpNote}>
              <Clock size={13} color="#b45309" />
              <Text style={styles.followUpNoteText}>
                {new Date(followUp).toLocaleString('en-IN', {
                  weekday: 'short', day: 'numeric', month: 'short',
                  hour: '2-digit', minute: '2-digit',
                })}
              </Text>
            </View>
          )}

          {/* Notes Textarea */}
          <Text style={styles.sectionTitle}>Notes</Text>
          <View style={styles.notesInputContainer}>
            <TextInput
              style={styles.notesInput}
              multiline
              numberOfLines={4}
              value={notes}
              onChangeText={setNotes}
              placeholder="Enter call summary and next steps..."
              placeholderTextColor="#94a3b8"
            />
            <Text style={styles.charCount}>{notes.length}/200</Text>
          </View>
        </ScrollView>

        {/* Save Feedback CTA Button */}
        <View style={styles.bottomFooter}>
          <TouchableOpacity style={styles.saveBtn} onPress={() => onSubmit({ outcome: selectedOutcome, interest: selectedInterest, notes, followUpAt: followUp })}>
            <Text style={styles.saveBtnText}>Save Feedback</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  summaryCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dcfce7',
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#16a34a',
    marginTop: 8,
  },
  summaryDuration: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 2,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  summaryDate: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
    marginTop: 8,
  },
  optionalText: {
    fontWeight: '500',
    color: '#94a3b8',
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  chipActiveBlue: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  chipActiveGreen: {
    borderColor: '#16a34a',
    backgroundColor: '#f0fdf4',
  },
  chipActiveAmber: {
    borderColor: '#f59e0b',
    backgroundColor: '#fef3c7',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  chipTextActiveBlue: {
    color: '#2563eb',
  },
  chipTextActiveGreen: {
    color: '#16a34a',
  },
  chipTextActiveAmber: {
    color: '#d97706',
  },
  scheduleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  pickerBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  notesInputContainer: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  notesInput: {
    fontSize: 14,
    color: '#0f172a',
    lineHeight: 20,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  charCount: {
    fontSize: 11,
    color: '#94a3b8',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  bottomFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  saveBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
