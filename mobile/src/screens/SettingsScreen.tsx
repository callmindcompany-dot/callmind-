import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Edit2, RotateCcw, Moon, Globe, Fingerprint, Info, LogOut, Phone, Users, CheckCircle2, Clock, ChevronRight } from 'lucide-react-native';
import { useMobileAuth } from '../services/AuthContext';

interface SettingsScreenProps {
  onBack: () => void;
  onLogout: () => void;
  onNavigateToEditProfile?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onLogout, onNavigateToEditProfile }) => {
  const { user, profile } = useMobileAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [biometric, setBiometric] = useState(true);
  const [isPunchedIn, setIsPunchedIn] = useState(true);

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

        {/* Attendance Punch Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Attendance</Text>
            <View style={styles.punchedInBadge}>
              <Text style={styles.punchedInText}>Punched In</Text>
            </View>
          </View>

          <Text style={styles.attendanceSub}>Since 9:02 AM • 21 May 2024</Text>
          
          <View style={styles.locationRow}>
            <Text style={styles.locationText}>Location: Pune, Maharashtra</Text>
            <TouchableOpacity style={styles.refreshIconBtn}>
              <RotateCcw size={14} color="#64748b" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.punchOutBtn}
            onPress={() => setIsPunchedIn(!isPunchedIn)}
            activeOpacity={0.8}
          >
            <Text style={styles.punchOutText}>{isPunchedIn ? 'Punch Out' : 'Punch In'}</Text>
          </TouchableOpacity>
        </View>

        {/* My Performance (This Week) */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>My Performance <Text style={styles.subTextLabel}>(This Week)</Text></Text>
            <TouchableOpacity style={styles.viewAllRow}>
              <Text style={styles.viewAllText}>View All</Text>
              <ChevronRight size={14} color="#2563eb" />
            </TouchableOpacity>
          </View>

          <View style={styles.perfGrid}>
            <View style={styles.perfBox}>
              <Text style={styles.perfLabel}>Calls Made</Text>
              <Text style={styles.perfNumber}>142</Text>
              <View style={[styles.perfIconBg, { backgroundColor: '#eff6ff' }]}>
                <Phone size={14} color="#2563eb" />
              </View>
            </View>

            <View style={styles.perfBox}>
              <Text style={styles.perfLabel}>Connected</Text>
              <Text style={styles.perfNumber}>78</Text>
              <View style={[styles.perfIconBg, { backgroundColor: '#f0fdf4' }]}>
                <CheckCircle2 size={14} color="#16a34a" />
              </View>
            </View>

            <View style={styles.perfBox}>
              <Text style={styles.perfLabel}>Conversions</Text>
              <Text style={styles.perfNumber}>12</Text>
              <View style={[styles.perfIconBg, { backgroundColor: '#fef3c7' }]}>
                <Users size={14} color="#d97706" />
              </View>
            </View>

            <View style={styles.perfBox}>
              <Text style={styles.perfLabel}>Avg. Duration</Text>
              <Text style={styles.perfNumber}>03:21</Text>
              <View style={[styles.perfIconBg, { backgroundColor: '#eff6ff' }]}>
                <Clock size={14} color="#2563eb" />
              </View>
            </View>
          </View>
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
              <Text style={styles.settingRowLabel}>Biometric Lock</Text>
            </View>
            <Switch
              value={biometric}
              onValueChange={setBiometric}
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
            <Text style={styles.settingValText}>1.2.0</Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.8}>
          <LogOut size={18} color="#ef4444" />
          <Text style={styles.logoutText}>Logout</Text>
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
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  subTextLabel: {
    fontWeight: '500',
    color: '#64748b',
    fontSize: 13,
  },
  punchedInBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  punchedInText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
  },
  attendanceSub: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 14,
  },
  locationText: {
    fontSize: 12,
    color: '#64748b',
  },
  refreshIconBtn: {
    padding: 2,
  },
  punchOutBtn: {
    borderWidth: 1,
    borderColor: '#fca5a5',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  punchOutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ef4444',
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
  perfGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  perfBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    position: 'relative',
  },
  perfLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  perfNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 4,
  },
  perfIconBg: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
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
});
