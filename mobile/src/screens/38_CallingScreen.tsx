import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Smartphone, PhoneOff } from 'lucide-react-native';

interface CallingScreenProps {
  leadName: string;
  leadPhone: string;
  sim: string;
  onCallConnected: () => void;
  onCallFailed: () => void;
  onCancel: () => void;
}

export const CallingScreen: React.FC<CallingScreenProps> = ({
  leadName,
  leadPhone,
  sim,
  onCallConnected,
  onCallFailed,
  onCancel,
}) => {
  const [dots, setDots] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  // Simulate call connecting after 3 seconds
  useEffect(() => {
    const timeout = setTimeout(onCallConnected, 3000);
    return () => clearTimeout(timeout);
  }, [onCallConnected]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* SIM Badge */}
        <View style={styles.simBadge}>
          <Smartphone size={14} color="#93c5fd" />
          <Text style={styles.simText}>{sim}</Text>
        </View>

        {/* Pulsing Avatar */}
        <Animated.View style={[styles.avatarOuter, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.avatarInner}>
            <Text style={styles.avatarText}>
              {leadName.split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
        </Animated.View>

        <Text style={styles.callingLabel}>Calling{dots}</Text>
        <Text style={styles.leadName}>{leadName}</Text>
        <Text style={styles.leadPhone}>{leadPhone}</Text>

        {/* Calling Status */}
        <View style={styles.statusRow}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Dialing via {sim}</Text>
        </View>
      </View>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <View style={styles.cancelCircle}>
            <PhoneOff size={28} color="#ffffff" />
          </View>
          <Text style={styles.cancelText}>End Call</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#0f172a',
    justifyContent: 'space-between',
    paddingTop: 80, paddingBottom: 60, paddingHorizontal: 24,
    zIndex: 9999,
  },
  content: { alignItems: 'center' },
  simBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    marginBottom: 40,
  },
  simText: { fontSize: 12, fontWeight: '700', color: '#93c5fd' },
  avatarOuter: {
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 28,
  },
  avatarInner: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#2563eb',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#ffffff', fontSize: 36, fontWeight: '900' },
  callingLabel: {
    fontSize: 16, fontWeight: '600', color: '#94a3b8',
    marginBottom: 8, letterSpacing: 2, textTransform: 'uppercase',
  },
  leadName: { fontSize: 28, fontWeight: '900', color: '#ffffff', marginBottom: 4 },
  leadPhone: { fontSize: 16, color: '#94a3b8', fontWeight: '500', marginBottom: 24 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f59e0b' },
  statusText: { fontSize: 13, color: '#f59e0b', fontWeight: '600' },
  bottomActions: { alignItems: 'center' },
  cancelBtn: { alignItems: 'center', gap: 8 },
  cancelCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#dc2626',
    justifyContent: 'center', alignItems: 'center',
  },
  cancelText: { fontSize: 13, fontWeight: '600', color: '#f87171' },
});
