import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { Bell, MapPin, Fingerprint, Camera as CameraIcon, Check, ShieldCheck } from 'lucide-react-native';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import { reminderService } from '../services/reminderService';
import { appLockService } from '../services/appLockService';

interface AppPermissionsProps {
  onContinue: () => void;
}

type PermState = 'unknown' | 'granted' | 'denied' | 'unavailable';

export const AppPermissionsScreen: React.FC<AppPermissionsProps> = ({ onContinue }) => {
  const [notifications, setNotifications] = useState<PermState>('unknown');
  const [location, setLocation] = useState<PermState>('unknown');
  const [camera, setCamera] = useState<PermState>('unknown');
  const [biometrics, setBiometrics] = useState<PermState>('unknown');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const available = await appLockService.biometricsAvailable();
      if (!cancelled) setBiometrics(available ? 'granted' : 'unavailable');

      const loc = await Location.getForegroundPermissionsAsync().catch(() => null);
      if (!cancelled && loc) setLocation(loc.granted ? 'granted' : 'unknown');

      const cam = await Camera.getCameraPermissionsAsync().catch(() => null);
      if (!cancelled && cam) setCamera(cam.granted ? 'granted' : 'unknown');
    })();
    return () => { cancelled = true; };
  }, []);

  const askNotifications = async () => {
    setBusy('notifications');
    setNotifications((await reminderService.setUp()) ? 'granted' : 'denied');
    setBusy(null);
  };

  const askLocation = async () => {
    setBusy('location');
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      setLocation(granted ? 'granted' : 'denied');
    } catch {
      setLocation('denied');
    }
    setBusy(null);
  };

  const askCamera = async () => {
    setBusy('camera');
    try {
      const { granted } = await Camera.requestCameraPermissionsAsync();
      setCamera(granted ? 'granted' : 'denied');
    } catch {
      setCamera('denied');
    }
    setBusy(null);
  };

  const rows: {
    key: string;
    icon: React.ElementType;
    title: string;
    body: string;
    state: PermState;
    onPress?: () => void;
  }[] = [
    {
      key: 'notifications',
      icon: Bell,
      title: 'Notifications',
      body: 'Get instant alerts when follow-ups are due and when new leads are assigned.',
      state: notifications,
      onPress: askNotifications,
    },
    {
      key: 'location',
      icon: MapPin,
      title: 'Location — attendance verification',
      body: 'Verified once when you punch in or punch out to record shift attendance.',
      state: location,
      onPress: askLocation,
    },
    {
      key: 'camera',
      icon: CameraIcon,
      title: 'Camera — scan admin QR code',
      body: 'Used to scan your company or team QR code to join your workspace.',
      state: camera,
      onPress: askCamera,
    },
    {
      key: 'biometrics',
      icon: Fingerprint,
      title: 'Fingerprint / App Lock',
      body: 'Secure your leads and customer data when the app is idle.',
      state: biometrics,
    },
  ];

  const label = (s: PermState) =>
    s === 'granted' ? 'Allowed' : s === 'denied' ? 'Denied' : s === 'unavailable' ? 'Not on device' : 'Allow';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconBg}>
          <ShieldCheck size={32} color="#2563eb" />
        </View>
        <Text style={styles.heading}>Enable App Permissions</Text>
        <Text style={styles.subheading}>
          CallMind uses these permissions only for work features (lead reminders, attendance, and QR code joining).
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {rows.map(({ key, icon: Icon, title, body, state, onPress }) => (
          <TouchableOpacity
            key={key}
            style={[styles.permCard, state === 'granted' && styles.permCardGranted]}
            disabled={!onPress || state === 'granted' || busy !== null}
            onPress={onPress}
            activeOpacity={0.8}
          >
            <View style={[styles.permIcon, state === 'granted' && styles.permIconGranted]}>
              <Icon size={20} color={state === 'granted' ? '#16a34a' : '#2563eb'} />
            </View>
            <View style={styles.permMain}>
              <Text style={styles.permTitle}>{title}</Text>
              <Text style={styles.permBody}>{body}</Text>
            </View>
            {busy === key ? (
              <ActivityIndicator color="#2563eb" size="small" />
            ) : state === 'granted' ? (
              <View style={styles.grantedBadge}>
                <Check size={14} color="#16a34a" strokeWidth={3} />
                <Text style={styles.grantedText}>Allowed</Text>
              </View>
            ) : (
              <View style={styles.allowButton}>
                <Text style={styles.allowButtonText}>{label(state)}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}

        <Text style={styles.footnote}>
          The app does not read your call log or your contacts, and it does not record audio. You can manage or modify permissions anytime in your phone Settings.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.continueBtn} onPress={onContinue} activeOpacity={0.85}>
          <Text style={styles.continueText}>Continue to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'ios' ? 56 : 46,
  },
  header: {
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBg: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 8,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  permCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  permCardGranted: {
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
  },
  permIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permIconGranted: {
    backgroundColor: '#dcfce7',
  },
  permMain: {
    flex: 1,
  },
  permTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  permBody: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  allowButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  allowButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  grantedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  grantedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
  footnote: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 12,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  continueBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  continueText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
