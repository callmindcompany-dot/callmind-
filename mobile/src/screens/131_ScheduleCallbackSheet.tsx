import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

interface ScheduleCallbackSheetProps {
  leadName: string;
  onSchedule: (date: string, time: string, note: string) => void;
  onDismiss: () => void;
}

export const ScheduleCallbackSheet: React.FC<ScheduleCallbackSheetProps> = ({
  leadName,
  onSchedule,
  onDismiss,
}) => {
  const [selectedDate, setSelectedDate] = useState('today');
  const [selectedTime, setSelectedTime] = useState('10:00 AM');
  const [note, setNote] = useState('');

  const dateOptions = [
    { key: 'today', label: 'Today', sub: '29 Jul' },
    { key: 'tomorrow', label: 'Tomorrow', sub: '30 Jul' },
    { key: 'day3', label: 'Wed', sub: '31 Jul' },
    { key: 'day4', label: 'Thu', sub: '1 Aug' },
    { key: 'day5', label: 'Fri', sub: '2 Aug' },
    { key: 'day6', label: 'Sat', sub: '3 Aug' },
    { key: 'day7', label: 'Sun', sub: '4 Aug' },
  ];

  const timeSlots = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
    '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
    '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
    '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM',
  ];

  return (
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        <View style={styles.dragHandle} />

        <Text style={styles.title}>📅 Schedule Callback</Text>
        <Text style={styles.subtitle}>for {leadName}</Text>

        {/* Date Selector */}
        <Text style={styles.sectionLabel}>Select Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
          <View style={styles.dateRow}>
            {dateOptions.map((d) => (
              <TouchableOpacity
                key={d.key}
                style={[styles.dateCard, selectedDate === d.key && styles.dateCardActive]}
                onPress={() => setSelectedDate(d.key)}
              >
                <Text style={[styles.dateLabel, selectedDate === d.key && styles.dateLabelActive]}>
                  {d.label}
                </Text>
                <Text style={[styles.dateSub, selectedDate === d.key && styles.dateSubActive]}>
                  {d.sub}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Time Selector */}
        <Text style={styles.sectionLabel}>Select Time</Text>
        <View style={styles.timeGrid}>
          {timeSlots.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.timeChip, selectedTime === t && styles.timeChipActive]}
              onPress={() => setSelectedTime(t)}
            >
              <Text style={[styles.timeText, selectedTime === t && styles.timeTextActive]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onDismiss}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.scheduleBtn}
            onPress={() => {
              const dateLabel = dateOptions.find(d => d.key === selectedDate)?.sub || '';
              onSchedule(dateLabel, selectedTime, note);
            }}
          >
            <Text style={styles.scheduleText}>✅ Schedule Callback</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end', zIndex: 9999,
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, maxHeight: '80%',
  },
  dragHandle: { width: 40, height: 4, backgroundColor: '#cbd5e1', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '900', color: '#0f172a', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#64748b', fontWeight: '600', textAlign: 'center', marginBottom: 20 },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', marginBottom: 10, marginTop: 8 },
  dateScroll: { marginBottom: 16 },
  dateRow: { flexDirection: 'row', gap: 8 },
  dateCard: {
    width: 68, paddingVertical: 12, borderRadius: 14,
    backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0',
    alignItems: 'center', gap: 2,
  },
  dateCardActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  dateLabel: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  dateLabelActive: { color: '#ffffff' },
  dateSub: { fontSize: 10, color: '#64748b', fontWeight: '600' },
  dateSubActive: { color: '#93c5fd' },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  timeChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
  },
  timeChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  timeText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  timeTextActive: { color: '#ffffff' },
  actionsRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  scheduleBtn: { flex: 2, paddingVertical: 16, borderRadius: 14, backgroundColor: '#2563eb', alignItems: 'center' },
  scheduleText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
});
