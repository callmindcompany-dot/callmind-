import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Bell, MapPin, Fingerprint, Check, ShieldCheck } from 'lucide-react-native';
import * as Location from 'expo-location';
import { reminderService } from '../services/reminderService';
import { appLockService } from '../services/appLockService';

interface AppPermissionsProps {
  onContinue: () => void;
}

/**
 * What the app asks for, and why.
 *
 * The previous version listed phone, contacts, notifications, microphone and
 * camera, with phone and contacts switched on by default, under the heading
 * "CallMind requires permissions to log call durations". The app requests none
 * of phone, contacts, microphone or camera — they are not in app.json and no
 * code touches them — so the screen described a different product, and one that
 * contradicted the privacy policy, which says plainly that the app does not read
 * your call log or your contacts.
 *
 * The toggles were also decorative: they flipped local state and never asked the
 * operating system for anything.
 *
 * This lists the three permissions the app really uses, and asking is what the
 * buttons do.
 */

type PermState = 'unknown' | 'granted' | 'denied' | 'unavailable';

export const AppPermissionsScreen: React.FC<AppPermissionsProps> = ({ onContinue }) => {
  const [notifications, setNotifications] = useState<PermState>('unknown');
  const [location, setLocation] = useState<PermState>('unknown');
  const [biometrics, setBiometrics] = useState<PermState>('unknown');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const available = await appLockService.biometricsAvailable();
      if (!cancelled) setBiometrics(available ? 'granted' : 'unavailable');

      const loc = await Location.getForegroundPermissionsAsync().catch(() => null);
      if (!cancelled && loc) setLocation(loc.granted ? 'granted' : 'unknown');
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
      body: 'So the phone tells you when a follow-up is due. Without this, you have to remember to open the app and check.',
      state: notifications,
      onPress: askNotifications,
    },
    {
      key: 'location',
      icon: MapPin,
      title: 'Location — only at attendance',
      body: 'Read once when you punch in or out, and not in between. If you refuse, everything except attendance still works.',
      state: location,
      onPress: askLocation,
    },
    {
      key: 'biometrics',
      icon: Fingerprint,
      title: 'Fingerprint or Face unlock',
      body: 'Optional. Turn the app lock on in Settings and this unlocks it; otherwise you use a PIN.',
      state: biometrics,
    },
  ];

  const label = (s: PermState) =>
    s === 'granted' ? 'Allowed' : s === 'denied' ? 'Not allowed' : s === 'unavailable' ? 'Not on this device' : 'Ask';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconBg}>
          <ShieldCheck size={30} color="#2563eb" />
        </View>
        <Text style={styles.heading}>What CallMind asks for</Text>
        <Text style={styles.subheading}>
          Three things, and only these. The app does not read your call log or your contacts,
          and it does not record audio.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {rows.map(({ key, icon: Icon, title, body, state, onPress }) => (
          <TouchableOpacity
            key={key}
            style={styles.permCard}
            disabled={!onPress || state === 'granted' || busy !== null}
            onPress={onPress}
          >
            <View style={styles.permIcon}>
              <Icon size={20} color="#2563eb" />
            </View>
            <View style={styles.permMain}>
              <Text style={styles.permTitle}>{title}</Text>
              <Text style={styles.permBody}>{body}</Text>
            </View>
            {busy === key ? (
              <ActivityIndicator color="#2563eb" />
            ) : state === 'granted' ? (
              <Check size={18} color="#16a34a" />
            ) : (
              <Text style={styles.permAction}>{label(state)}</Text>
            )}
          </TouchableOpacity>
        ))}

        <Text style={styles.footnote}>
          You can change any of these later, from your phone's settings.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.continueBtn} onPress={onContinue}>
          <Text style={styles.continueText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', paddingTop: 60 },
  header: { paddingHorizontal: 28, alignItems: 'center' },
  iconBg: {
    width: 68, height: 68, borderRadius: 22, backgroundColor: '#eff6ff',
    justifyContent: 'center', alignItems: 'center', marginBottom: 18,
  },
  heading: { fontSize: 23, fontWeight: '800', color: '#0f172a', marginBottom: 8, textAlign: 'center' },
  subheading: {
    fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 20, marginBottom: 24,
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },
  permCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 18, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12,
  },
  permIcon: {
    width: 42, height: 42, borderRadius: 14, backgroundColor: '#f8fafc',
    justifyContent: 'center', alignItems: 'center',
  },
  permMain: { flex: 1 },
  permTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 3 },
  permBody: { fontSize: 12, color: '#64748b', lineHeight: 17 },
  permAction: { fontSize: 12, fontWeight: '700', color: '#2563eb' },
  footnote: { fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 8 },
  footer: { paddingHorizontal: 20, paddingBottom: 32 },
  continueBtn: {
    backgroundColor: '#2563eb', paddingVertical: 16, borderRadius: 16, alignItems: 'center',
  },
  continueText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});
