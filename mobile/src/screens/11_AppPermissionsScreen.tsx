import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

interface AppPermissionsProps {
  onContinue: () => void;
}

export const AppPermissionsScreen: React.FC<AppPermissionsProps> = ({ onContinue }) => {
  const [permissions, setPermissions] = useState({
    phone: true,
    contacts: true,
    notifications: true,
    microphone: false,
    camera: false,
  });

  const togglePermission = (key: keyof typeof permissions) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconBg}>
          <Text style={styles.shieldIcon}>🛡️</Text>
        </View>
        <Text style={styles.heading}>App Permissions</Text>
        <Text style={styles.subheading}>
          CallMind requires permissions to log call durations and alert you about hot leads.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Phone / Call Log */}
        <TouchableOpacity style={styles.permCard} onPress={() => togglePermission('phone')}>
          <Text style={styles.permIcon}>📞</Text>
          <View style={styles.permInfo}>
            <Text style={styles.permTitle}>Phone & Call Logs (Required)</Text>
            <Text style={styles.permSub}>To capture call duration without recording audio</Text>
          </View>
          <View style={[styles.statusBadge, permissions.phone ? styles.grantedBadge : styles.deniedBadge]}>
            <Text style={[styles.statusText, permissions.phone ? styles.grantedText : styles.deniedText]}>
              {permissions.phone ? 'Granted' : 'Allow'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Notifications */}
        <TouchableOpacity style={styles.permCard} onPress={() => togglePermission('notifications')}>
          <Text style={styles.permIcon}>🔔</Text>
          <View style={styles.permInfo}>
            <Text style={styles.permTitle}>Push Notifications</Text>
            <Text style={styles.permSub}>Receive instant alerts when admin assigns hot leads</Text>
          </View>
          <View style={[styles.statusBadge, permissions.notifications ? styles.grantedBadge : styles.deniedBadge]}>
            <Text style={[styles.statusText, permissions.notifications ? styles.grantedText : styles.deniedText]}>
              {permissions.notifications ? 'Granted' : 'Allow'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Contacts */}
        <TouchableOpacity style={styles.permCard} onPress={() => togglePermission('contacts')}>
          <Text style={styles.permIcon}>👥</Text>
          <View style={styles.permInfo}>
            <Text style={styles.permTitle}>Contacts Access</Text>
            <Text style={styles.permSub}>Identify existing client caller IDs automatically</Text>
          </View>
          <View style={[styles.statusBadge, permissions.contacts ? styles.grantedBadge : styles.deniedBadge]}>
            <Text style={[styles.statusText, permissions.contacts ? styles.grantedText : styles.deniedText]}>
              {permissions.contacts ? 'Granted' : 'Allow'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Camera */}
        <TouchableOpacity style={styles.permCard} onPress={() => togglePermission('camera')}>
          <Text style={styles.permIcon}>📷</Text>
          <View style={styles.permInfo}>
            <Text style={styles.permTitle}>Camera Access</Text>
            <Text style={styles.permSub}>Scan company admin QR code to join workspace</Text>
          </View>
          <View style={[styles.statusBadge, permissions.camera ? styles.grantedBadge : styles.deniedBadge]}>
            <Text style={[styles.statusText, permissions.camera ? styles.grantedText : styles.deniedText]}>
              {permissions.camera ? 'Granted' : 'Allow'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Microphone */}
        <TouchableOpacity style={styles.permCard} onPress={() => togglePermission('microphone')}>
          <Text style={styles.permIcon}>🎙️</Text>
          <View style={styles.permInfo}>
            <Text style={styles.permTitle}>Microphone (Voice Notes)</Text>
            <Text style={styles.permSub}>Record voice notes for lead post-call feedback</Text>
          </View>
          <View style={[styles.statusBadge, permissions.microphone ? styles.grantedBadge : styles.deniedBadge]}>
            <Text style={[styles.statusText, permissions.microphone ? styles.grantedText : styles.deniedText]}>
              {permissions.microphone ? 'Granted' : 'Allow'}
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.continueBtn} onPress={onContinue}>
          <Text style={styles.continueText}>Grant Permissions & Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconBg: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  shieldIcon: {
    fontSize: 32,
  },
  heading: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 6,
  },
  subheading: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
  scrollContent: {
    gap: 12,
  },
  permCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  permIcon: {
    fontSize: 22,
  },
  permInfo: {
    flex: 1,
  },
  permTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  permSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  grantedBadge: {
    backgroundColor: '#dcfce7',
  },
  deniedBadge: {
    backgroundColor: '#eff6ff',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  grantedText: {
    color: '#15803d',
  },
  deniedText: {
    color: '#2563eb',
  },
  footer: {
    paddingTop: 16,
  },
  continueBtn: {
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
  continueText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
