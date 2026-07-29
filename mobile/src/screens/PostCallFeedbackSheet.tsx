import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { ArrowLeft, CheckCircle2, Calendar, ChevronDown, Clock } from 'lucide-react-native';

interface PostCallFeedbackSheetProps {
  leadName?: string;
  callDuration?: string;
  onSubmit: (feedback: any) => void;
  onDismiss: () => void;
}

export const PostCallFeedbackSheet: React.FC<PostCallFeedbackSheetProps> = ({
  leadName = 'Lead',
  callDuration = '00:00',
  onSubmit,
  onDismiss,
}) => {
  const [selectedOutcome, setSelectedOutcome] = useState('Connected');
  const [selectedInterest, setSelectedInterest] = useState('Interested');
  const [notes, setNotes] = useState('');

  const outcomes = ['Connected', 'Not Connected', 'Wrong Number'];
  const interestLevels = ['Interested', 'Not Interested', 'Call Back Later'];

  return (
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        {/* Top Header matching Reference UI Image 2 Screen 8 */}
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
            <Text style={styles.summaryDate}>10:30 AM, 21 May 2024</Text>
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

          {/* Schedule Callback (Optional) */}
          <Text style={styles.sectionTitle}>Schedule Callback <Text style={styles.optionalText}>(Optional)</Text></Text>
          <View style={styles.scheduleRow}>
            <TouchableOpacity style={styles.pickerBox}>
              <Calendar size={16} color="#64748b" />
              <Text style={styles.pickerText}>22 May 2024</Text>
              <ChevronDown size={14} color="#64748b" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.pickerBox}>
              <Clock size={16} color="#64748b" />
              <Text style={styles.pickerText}>11:00 AM</Text>
              <ChevronDown size={14} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Notes Textarea */}
          <Text style={styles.sectionTitle}>Notes</Text>
          <View style={styles.notesInputContainer}>
            <TextInput
              style={styles.notesInput}
              multiline
              numberOfLines={4}
              value={notes}
              onChangeText={setNotes}
              placeholderTextColor="#94a3b8"
            />
            <Text style={styles.charCount}>{notes.length}/200</Text>
          </View>
        </ScrollView>

        {/* Save Feedback CTA Button */}
        <View style={styles.bottomFooter}>
          <TouchableOpacity style={styles.saveBtn} onPress={() => onSubmit({ outcome: selectedOutcome, interest: selectedInterest, notes })}>
            <Text style={styles.saveBtnText}>Save Feedback</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
    gap: 10,
    marginBottom: 16,
  },
  chip: {
    flex: 1,
    paddingVertical: 12,
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
    fontSize: 13,
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
