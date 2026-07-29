import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft, Calendar, MapPin, Clock, CheckCircle2, ChevronRight } from 'lucide-react-native';

interface AttendanceScreenProps {
  onBack: () => void;
}

export const AttendanceScreen: React.FC<AttendanceScreenProps> = ({ onBack }) => {
  const [isPunchedIn, setIsPunchedIn] = useState(true);

  const history = [
    { date: '20 May 2024', punchIn: '09:01 AM', punchOut: '06:15 PM', hours: '09h 14m' },
    { date: '19 May 2024', punchIn: '09:05 AM', punchOut: '06:08 PM', hours: '09h 02m' },
    { date: '18 May 2024', punchIn: '09:00 AM', punchOut: '05:55 PM', hours: '08h 55m' },
  ];

  return (
    <View style={styles.container}>
      {/* Top Header matching Reference UI Image 4 Screen 13 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Calendar size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Box */}
        <View style={styles.card}>
          <View style={styles.todayRow}>
            <Text style={styles.todayDateText}>Today, 21 May 2024</Text>
            <View style={styles.presentBadge}>
              <Text style={styles.presentBadgeText}>Present</Text>
            </View>
          </View>

          <View style={styles.punchedInRow}>
            <View style={styles.greenDot} />
            <Text style={styles.punchedInTitle}>Punched In</Text>
          </View>
          <Text style={styles.timeValueText}>09:02 AM</Text>

          <View style={styles.locationRow}>
            <MapPin size={14} color="#2563eb" />
            <Text style={styles.locationText}>Pune, Maharashtra</Text>
          </View>

          {/* Punch In / Punch Out Buttons */}
          <View style={styles.punchActionRow}>
            <TouchableOpacity style={[styles.punchBtn, styles.punchInBtnDisabled]} disabled>
              <CheckCircle2 size={16} color="#16a34a" />
              <Text style={styles.punchInText}>Punch In</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.punchBtn, styles.punchOutBtnActive]} onPress={() => setIsPunchedIn(!isPunchedIn)}>
              <Text style={styles.punchOutText}>Punch Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Working Hours Card */}
        <View style={styles.card}>
          <Text style={styles.cardSectionLabel}>Working Hours</Text>
          <Text style={styles.sinceLabel}>Since 09:02 AM</Text>

          <View style={styles.timerDisplayRow}>
            <Text style={styles.timerLargeText}>05h 47m 32s</Text>
            <View style={styles.clockIconBg}>
              <Clock size={20} color="#2563eb" />
            </View>
          </View>
        </View>

        {/* Today's Timeline Card */}
        <View style={styles.card}>
          <Text style={styles.cardSectionLabel}>Today's Timeline</Text>
          
          <View style={styles.timelineList}>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: '#16a34a' }]} />
              <View style={styles.timelineMain}>
                <Text style={styles.timelineItemTitle}>Punched In</Text>
                <Text style={styles.timelineItemSub}>Location: Pune, Maharashtra</Text>
              </View>
              <Text style={styles.timelineTimeText}>09:02 AM</Text>
            </View>

            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: '#94a3b8' }]} />
              <View style={styles.timelineMain}>
                <Text style={styles.timelineItemTitle}>Working...</Text>
              </View>
              <Text style={styles.timelineTimeText}>05h 47m 32s</Text>
            </View>

            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: '#e2e8f0' }]} />
              <View style={styles.timelineMain}>
                <Text style={styles.timelineItemTitle}>Punched Out</Text>
              </View>
              <Text style={styles.timelineTimeText}>--:--</Text>
            </View>
          </View>
        </View>

        {/* Recent History */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>Recent History</Text>
          <TouchableOpacity style={styles.viewAllRow}>
            <Text style={styles.viewAllText}>View All</Text>
            <ChevronRight size={14} color="#2563eb" />
          </TouchableOpacity>
        </View>

        <View style={styles.historyList}>
          {history.map((h, i) => (
            <View key={i} style={styles.historyCard}>
              <View style={styles.historyLeft}>
                <Text style={styles.historyDate}>{h.date}</Text>
                <Text style={styles.historySub}>Punched In: {h.punchIn} • Punched Out: {h.punchOut}</Text>
              </View>
              <Text style={styles.historyHoursText}>{h.hours}</Text>
            </View>
          ))}
        </View>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  todayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  todayDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  presentBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  presentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
  },
  punchedInRow: {
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
  punchedInTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  timeValueText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    marginBottom: 16,
  },
  locationText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
  },
  punchActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  punchBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  punchInBtnDisabled: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  punchInText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#16a34a',
  },
  punchOutBtnActive: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#ef4444',
  },
  punchOutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ef4444',
  },
  cardSectionLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  sinceLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 12,
  },
  timerDisplayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timerLargeText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0f172a',
  },
  clockIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineList: {
    gap: 12,
    marginTop: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timelineMain: {
    flex: 1,
  },
  timelineItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  timelineItemSub: {
    fontSize: 11,
    color: '#64748b',
  },
  timelineTimeText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
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
  historyList: {
    gap: 10,
  },
  historyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  historyLeft: {
    gap: 2,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  historySub: {
    fontSize: 11,
    color: '#64748b',
  },
  historyHoursText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#16a34a',
  },
});
