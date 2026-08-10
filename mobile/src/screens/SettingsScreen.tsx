import React, { useState, useEffect } from 'react';
import { appLockService } from '../services/appLockService';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Edit2, Moon, Globe, Fingerprint, Info, LogOut, CalendarCheck, BarChart3, Trash2, ChevronRight } from 'lucide-react-native';
import { useMobileAuth } from '../services/AuthContext';
import appJson from '../../app.json';

interface SettingsScreenProps {
  onBack: () => void;
  onLogout: () => void;
  onNavigateToEditProfile?: () => void;
  /** Opens the PIN setup flow. Turning the lock on needs a PIN to turn it on with. */
  onSetUpPin?: () => void;
  /** Opens AttendanceScreen, which reads attendance_logs. */
  onOpenAttendance?: () => void;
  /** Opens PerformanceScreen, which reads the agent's real figures. */
  onOpenPerformance?: () => void;
  /** Opens DeleteAccountScreen. Required by the Play Store. */
  onDeleteAccount?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onLogout,
  onNavigateToEditProfile,
  onSetUpPin,
  onOpenAttendance,
  onOpenPerformance,
  onDeleteAccount,
}) => {
  const { user, profile } = useMobileAuth();
  const [darkMode, setDarkMode] = useState(false);
  // Read from SecureStore rather than assumed. This was `useState(true)`, so
  // the switch showed "on" whether or not any lock existed — and toggling it
  // changed a local variable and nothing else.
  const [biometric, setBiometric] = useState(false);
  const [lockBusy, setLockBusy] = useState(false);

  useEffect(() => {
    void appLockService.isLockEnabled().then(setBiometric);
  }, []);

  const handleToggleLock = async (next: boolean) => {
    setLockBusy(true);
    try {
      if (!next) {
        await appLockService.disableLock();
        setBiometric(false);
        return;
      }
      if (await appLockService.hasPin()) {
        setBiometric(true);
        return;
      }
      // No PIN yet. Biometrics alone is not enough — a device with no enrolled
      // fingerprint would lock the agent out of their own app.
      onSetUpPin?.();
    } finally {
      setLockBusy(false);
    }
  };

  const displayName = profile?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Telecaller';
  const displayEmail = profile?.email || user?.email || 'telecaller@callmind.ai';
  const displayPhone = profile?.phone || 'Not provided';
  const displayRole = profile?.designation || 'Telecaller';

  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <View style={styles.container}>
      {/* Top Header matching Reference UI Image 3 Screen 12 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={onNavigateToEditProfile}>
          <Edit2 size={18} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card Header */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials || 'TC'}</Text>
            </View>
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.profileMeta}>
            <View style={styles.nameRow}>
              <Text style={styles.profileName}>{displayName}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{displayRole}</Text>
              </View>
            </View>
            <Text style={styles.profilePhone}>{displayPhone}</Text>
            <Text style={styles.profileEmail}>{displayEmail}</Text>
          </View>
        </View>

        {/*
          Attendance and performance used to be rendered here as cards, with
          "Since 9:02 AM • 21 May 2024", "Location: Pune, Maharashtra", and 142
          calls / 78 connected / 12 conversions / 03:21 average -- none of it
          read from anywhere. The Punch Out button flipped a local boolean and
          touched neither attendance_logs nor the agent's actual shift.

          AttendanceScreen and PerformanceScreen already read the real rows, so
          these are links to them rather than a second copy of the same figures
          that could drift from the first.
        */}
        <View style={styles.settingsGroup}>
          <TouchableOpacity style={styles.settingRow} onPress={onOpenAttendance}>
            <View style={styles.settingRowLeft}>
              <CalendarCheck size={18} color="#64748b" />
              <Text style={styles.settingRowLabel}>Attendance</Text>
            </View>
            <ChevronRight size={16} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.settingRow} onPress={onOpenPerformance}>
            <View style={styles.settingRowLeft}>
              <BarChart3 size={18} color="#64748b" />
              <Text style={styles.settingRowLabel}>My performance</Text>
            </View>
            <ChevronRight size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Settings Group List matching Reference UI Image 3 Screen 12 */}
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.settingsGroup}>
          <View style={styles.settingRow}>
            <View style={styles.settingRowLeft}>
              <Moon size={18} color="#64748b" />
              <Text style={styles.settingRowLabel}>Dark Mode</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
              thumbColor={darkMode ? '#2563eb' : '#ffffff'}
            />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingRowLeft}>
              <Globe size={18} color="#64748b" />
              <Text style={styles.settingRowLabel}>Language</Text>
            </View>
            <View style={styles.settingRowRight}>
              <Text style={styles.settingValText}>English</Text>
              <ChevronRight size={16} color="#94a3b8" />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingRowLeft}>
              <Fingerprint size={18} color="#64748b" />
              <Text style={styles.settingRowLabel}>Lock app when idle</Text>
            </View>
            <Switch
              value={biometric}
              onValueChange={handleToggleLock}
              disabled={lockBusy}
              trackColor={{ false: '#e2e8f0', true: '#86efac' }}
              thumbColor={biometric ? '#16a34a' : '#ffffff'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingRowLeft}>
              <Info size={18} color="#64748b" />
              <Text style={styles.settingRowLabel}>App Version</Text>
            </View>
            {/*
              Read from app.json, which is the number the build actually ships
              with. This said 1.2.0 while app.json said 2.4.0, so anyone
              reporting a bug quoted a version that had never existed.
            */}
            <Text style={styles.settingValText}>{appJson.expo.version}</Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.8}>
          <LogOut size={18} color="#ef4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/*
          The Play Store requires an app that creates accounts to offer deletion
          from inside the app. It is deliberately last, plain, and separated from
          Logout so the two are not mistaken for each other.
        */}
        <TouchableOpacity style={styles.deleteAccountBtn} onPress={onDeleteAccount} activeOpacity={0.8}>
          <Trash2 size={16} color="#94a3b8" />
          <Text style={styles.deleteAccountText}>Delete my account</Text>
        </TouchableOpacity>
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
  profileHeaderCard: {
    backgroundColor: '#2563eb',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2563eb',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  profileMeta: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  profilePhone: {
    fontSize: 13,
    color: '#93c5fd',
    marginTop: 2,
  },
  profileEmail: {
    fontSize: 12,
    color: '#bfdbfe',
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
    marginTop: 4,
  },
  settingsGroup: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingRowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  settingRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  settingValText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 16,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ef4444',
  },
  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    marginTop: 8,
  },
  deleteAccountText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
});
