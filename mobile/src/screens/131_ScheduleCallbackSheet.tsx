import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

interface ScheduleCallbackSheetProps {
  leadName: string;
  /**
   * The chosen moment, as an ISO timestamp, plus whatever the agent typed.
   *
   * This used to hand back the raw key and label -- ('day3', '10:00 AM') --
   * and leave the caller to work out what date 'day3' meant. Returning the
   * moment itself removes the second place that could get it wrong.
   */
  onSchedule: (isoWhen: string, note: string) => void;
  onDismiss: () => void;
}

/**
 * The next seven days, starting today.
 *
 * The list was written out by hand as Today · 29 Jul, Tomorrow · 30 Jul, Wed ·
 * 31 Jul and so on. Those dates were whenever the file was written; on any
 * other day "Today" sat above a date that was not today, and the weekday names
 * did not match the dates beside them either. An agent booking a follow-up
 * would have picked a day that had already passed.
 */
function nextSevenDays(from: Date): { key: string; label: string; sub: string; date: Date }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return {
      key: d.toISOString().slice(0, 10),
      label:
        i === 0 ? 'Today'
        : i === 1 ? 'Tomorrow'
        : d.toLocaleDateString('en-IN', { weekday: 'short' }),
      sub: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      date: d,
    };
  });
}

/** '02:30 PM' -> { hours: 14, minutes: 30 } */
function parseSlot(slot: string): { hours: number; minutes: number } {
  const [, h, m, meridiem] = /^(\d{2}):(\d{2}) (AM|PM)$/.exec(slot) ?? [];
  let hours = Number(h ?? 10);
  if (meridiem === 'PM' && hours !== 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return { hours, minutes: Number(m ?? 0) };
}

export const ScheduleCallbackSheet: React.FC<ScheduleCallbackSheetProps> = ({
  leadName,
  onSchedule,
  onDismiss,
}) => {
  const dateOptions = nextSevenDays(new Date());
  const [selectedDate, setSelectedDate] = useState(dateOptions[0].key);
  const [selectedTime, setSelectedTime] = useState('10:00 AM');
  const [note, setNote] = useState('');

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
              const day = dateOptions.find((d) => d.key === selectedDate) ?? dateOptions[0];
              const { hours, minutes } = parseSlot(selectedTime);
              const when = new Date(day.date);
              when.setHours(hours, minutes, 0, 0);
              onSchedule(when.toISOString(), note);
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
