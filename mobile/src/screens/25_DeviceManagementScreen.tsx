import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { ArrowLeft, ShieldCheck, Smartphone, MoreVertical, AlertTriangle, LogOut } from 'lucide-react-native';

interface DeviceManagementProps {
  onBack: () => void;
}

export const DeviceManagementScreen: React.FC<DeviceManagementProps> = ({ onBack }) => {
  const otherDevices = [
    {
      id: '1',
      name: 'Redmi Note 10 Pro',
      os: 'Android 12',
      location: 'Mumbai, Maharashtra, India',
      lastActive: '19 May 2024, 06:15 PM',
    },
    {
      id: '2',
      name: 'Realme 8 5G',
      os: 'Android 11',
      location: 'Nagpur, Maharashtra, India',
      lastActive: '18 May 2024, 11:32 AM',
    },
  ];

  const handleLogoutAll = () => {
    Alert.alert(
      'Logout All Devices',
      'Are you sure you want to log out from all other active devices?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout All', style: 'destructive', onPress: () => {} },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7} accessibilityLabel="Back" accessibilityRole="button">
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Device Management</Text>
        <View style={styles.headerRightIcon}>
          <ShieldCheck size={20} color="#2563eb" />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Security Banner Card */}
        <View style={styles.securityBannerCard}>
          <View style={styles.shieldIconCircle}>
            <ShieldCheck size={28} color="#2563eb" />
          </View>
          <View style={styles.securityBannerText}>
            <Text style={styles.securityTitle}>Your Account is Secure</Text>
            <Text style={styles.securitySubtext}>You are currently logged in on the devices below.</Text>
          </View>
        </View>

        {/* Current Device Section */}
        <Text style={styles.sectionLabel}>Current Device</Text>
        <View style={styles.deviceCardActive}>
          <View style={styles.deviceHeaderRow}>
            <View style={styles.deviceIconBgActive}>
              <Smartphone size={22} color="#2563eb" />
            </View>
            <View style={styles.deviceMainInfo}>
              <View style={styles.deviceNameRow}>
                <Text style={styles.deviceName}>This Device</Text>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
              </View>
              <Text style={styles.deviceModel}>samsung SM-A546E • Android 14</Text>
            </View>
          </View>
          <View style={styles.deviceMetaRow}>
            <Text style={styles.deviceMetaText}>Pune, Maharashtra, India</Text>
            <Text style={styles.deviceMetaText}>Since 21 May 2024, 09:02 AM</Text>
          </View>
        </View>

        {/* Other Logged-in Devices Section */}
        <Text style={styles.sectionLabel}>Other Logged In Devices</Text>
        <View style={styles.otherDevicesList}>
          {otherDevices.map((device) => (
            <View key={device.id} style={styles.deviceCard}>
              <View style={styles.deviceHeaderRow}>
                <View style={styles.deviceIconBg}>
                  <Smartphone size={20} color="#64748b" />
                </View>
                <View style={styles.deviceMainInfo}>
                  <View style={styles.deviceNameRow}>
                    <Text style={styles.deviceName}>{device.name}</Text>
                    <Text style={styles.deviceOsTag}>{device.os}</Text>
                  </View>
                  <Text style={styles.deviceMetaText}>{device.location}</Text>
                  <Text style={styles.deviceLastActive}>Last active: {device.lastActive}</Text>
                </View>
                <TouchableOpacity style={styles.moreBtn} accessibilityLabel="Device Options" accessibilityRole="button">
                  <MoreVertical size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Security Warning Box */}
        <View style={styles.warningBox}>
          <AlertTriangle size={20} color="#d97706" />
          <View style={styles.warningTextContainer}>
            <Text style={styles.warningTitle}>Don't recognize a device?</Text>
            <Text style={styles.warningSubtext}>
              If you see any unfamiliar device, please logout from that device immediately.
            </Text>
          </View>
        </View>

        {/* Logout All Button */}
        <TouchableOpacity style={styles.logoutAllBtn} onPress={handleLogoutAll} activeOpacity={0.8} accessibilityLabel="Logout from All Other Devices" accessibilityRole="button">
          <LogOut size={18} color="#ef4444" />
          <Text style={styles.logoutAllBtnText}>Logout from All Other Devices</Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerRightIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  securityBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dbeafe',
    marginBottom: 24,
    gap: 14,
  },
  shieldIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  securityBannerText: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e40af',
  },
  securitySubtext: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  deviceCardActive: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#2563eb',
    marginBottom: 24,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  deviceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  deviceIconBgActive: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deviceIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deviceMainInfo: {
    flex: 1,
  },
  deviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  activeBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16a34a',
  },
  deviceModel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  deviceMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  deviceMetaText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  deviceOsTag: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  deviceLastActive: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  otherDevicesList: {
    gap: 12,
    marginBottom: 24,
  },
  deviceCard: {
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  moreBtn: {
    padding: 4,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
    gap: 12,
    marginBottom: 24,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400e',
  },
  warningSubtext: {
    fontSize: 12,
    color: '#b45309',
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 16,
  },
  logoutAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#fecaca',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
  },
  logoutAllBtnText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '800',
  },
});
