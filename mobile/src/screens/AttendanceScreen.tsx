import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { ArrowLeft, Calendar, MapPin, Clock, CheckCircle2, ChevronRight, Navigation } from 'lucide-react-native';
import { FormattedAttendanceDay, attendanceService, GpsLocationResult } from '../services/attendanceService';

interface AttendanceScreenProps {
  onBack: () => void;
  isPunchedIn?: boolean;
  lastPunchTime?: string;
  lastLocation?: string;
  history?: FormattedAttendanceDay[];
  onPunchIn?: (gpsResult?: GpsLocationResult) => Promise<void> | void;
  onPunchOut?: (gpsResult?: GpsLocationResult) => Promise<void> | void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export const AttendanceScreen: React.FC<AttendanceScreenProps> = ({
  onBack,
  isPunchedIn = false,
  lastPunchTime = '--:--',
  lastLocation = 'Location pending',
  history = [],
  onPunchIn,
  onPunchOut,
  refreshing = false,
  onRefresh,
}) => {
  const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const [locating, setLocating] = useState<boolean>(false);
  const [currentGps, setCurrentGps] = useState<GpsLocationResult | null>(null);

  const handlePunchAction = async (isPunchingIn: boolean) => {
    setLocating(true);
    try {
      // 1. Capture real GPS location via expo-location (Foreground permission requested on tap)
      const gpsResult = await attendanceService.getCurrentLocation();
      setLocating(false);

      if (!gpsResult.success) {
        Alert.alert('GPS Permission Required', gpsResult.error || 'Unable to capture GPS location.');
        return;
      }

      setCurrentGps(gpsResult);

      if (isPunchingIn && onPunchIn) {
        await onPunchIn(gpsResult);
      } else if (!isPunchingIn && onPunchOut) {
        await onPunchOut(gpsResult);
      }
    } catch (err: any) {
      setLocating(false);
      Alert.alert('Attendance Error', err.message || 'An error occurred during location capture.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Calendar size={20} color="#0f172a" />
        </TouchableOpacity>
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
        {/* Status Card */}
        <View style={styles.card}>
          <View style={styles.todayRow}>
            <Text style={styles.todayDateText}>Today, {todayStr}</Text>
            <View style={[styles.presentBadge, { backgroundColor: isPunchedIn ? '#f0fdf4' : '#fef2f2' }]}>
              <Text style={[styles.presentBadgeText, { color: isPunchedIn ? '#16a34a' : '#ef4444' }]}>
                {isPunchedIn ? 'Present' : 'Not Punched In'}
              </Text>
            </View>
          </View>

          <View style={styles.punchedInRow}>
            <View style={[styles.greenDot, { backgroundColor: isPunchedIn ? '#16a34a' : '#94a3b8' }]} />
            <Text style={styles.punchedInTitle}>{isPunchedIn ? 'Punched In' : 'Punched Out'}</Text>
          </View>
          <Text style={styles.timeValueText}>{lastPunchTime}</Text>

          {/* Captured Location Badge */}
          <View style={styles.locationRow}>
            <MapPin size={14} color="#2563eb" />
            <Text style={styles.locationText} numberOfLines={1}>
              {currentGps?.address || lastLocation}
            </Text>
            {currentGps?.accuracy && (
              <View style={styles.accuracyBadge}>
                <Navigation size={10} color="#16a34a" />
                <Text style={styles.accuracyText}>±{currentGps.accuracy}m</Text>
              </View>
            )}
          </View>

          {/* Punch Action Buttons */}
          <View style={styles.punchActionRow}>
            <TouchableOpacity
              style={[styles.punchBtn, isPunchedIn ? styles.punchInBtnDisabled : styles.punchInBtnActive]}
              onPress={() => handlePunchAction(true)}
              disabled={isPunchedIn || locating}
            >
              {locating ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <CheckCircle2 size={16} color={isPunchedIn ? '#16a34a' : '#ffffff'} />
                  <Text style={[styles.punchInText, !isPunchedIn && { color: '#ffffff' }]}>
                    Punch In
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.punchBtn, !isPunchedIn ? styles.punchInBtnDisabled : styles.punchOutBtnActive]}
              onPress={() => handlePunchAction(false)}
              disabled={!isPunchedIn || locating}
            >
              {locating ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <Text style={[styles.punchOutText, !isPunchedIn && { color: '#94a3b8' }]}>
                  Punch Out
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Working Hours Card */}
        <View style={styles.card}>
          <Text style={styles.cardSectionLabel}>Working Hours</Text>
          <Text style={styles.sinceLabel}>Since {lastPunchTime}</Text>

          <View style={styles.timerDisplayRow}>
            <Text style={styles.timerLargeText}>{isPunchedIn ? 'Shift In Progress' : 'Shift Completed'}</Text>
            <View style={styles.clockIconBg}>
              <Clock size={20} color="#2563eb" />
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
          {history.length > 0 ? (
            history.map((h, i) => (
              <View key={i} style={styles.historyCard}>
                <View style={styles.historyLeft}>
                  <Text style={styles.historyDate}>{h.date}</Text>
                  <Text style={styles.historySub}>Punched In: {h.punchIn} • Punched Out: {h.punchOut}</Text>
                  {h.location && (
                    <Text style={styles.historyLoc} numberOfLines={1}>📍 {h.location}</Text>
                  )}
                </View>
                <Text style={styles.historyHoursText}>{h.hours}</Text>
              </View>
            ))
          ) : (
            <View style={styles.historyCard}>
              <Text style={styles.historySub}>No attendance logs found for this user.</Text>
            </View>
          )}
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
    gap: 6,
    marginTop: 6,
    marginBottom: 16,
  },
  locationText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
    flexShrink: 1,
  },
  accuracyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  accuracyText: {
    fontSize: 10,
    color: '#16a34a',
    fontWeight: '700',
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
  punchInBtnActive: {
    backgroundColor: '#2563eb',
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
    flex: 1,
    marginRight: 8,
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
  historyLoc: {
    fontSize: 10,
    color: '#2563eb',
    fontWeight: '500',
  },
  historyHoursText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#16a34a',
  },
});
