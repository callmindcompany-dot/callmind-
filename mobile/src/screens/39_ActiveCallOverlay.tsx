import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface ActiveCallOverlayProps {
  leadName: string;
  leadPhone: string;
  sim: string;
  onEndCall: () => void;
  onOpenScript: () => void;
}

export const ActiveCallOverlay: React.FC<ActiveCallOverlayProps> = ({
  leadName,
  leadPhone,
  sim,
  onEndCall,
  onOpenScript,
}) => {
  const [seconds, setSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Connected Header */}
      <View style={styles.topSection}>
        <View style={styles.connectedBadge}>
          <View style={styles.greenDot} />
          <Text style={styles.connectedText}>Connected via {sim}</Text>
        </View>

        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {leadName.split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
        </View>

        <Text style={styles.name}>{leadName}</Text>
        <Text style={styles.phone}>{leadPhone}</Text>

        {/* Timer */}
        <View style={styles.timerBox}>
          <View style={styles.timerDot} />
          <Text style={styles.timerText}>{formatTime(seconds)}</Text>
        </View>
      </View>

      {/* Call Controls */}
      <View style={styles.controlsGrid}>
        <TouchableOpacity
          style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
          onPress={() => setIsMuted(!isMuted)}
        >
          <Text style={styles.controlIcon}>{isMuted ? '🔇' : '🔊'}</Text>
          <Text style={[styles.controlLabel, isMuted && styles.controlLabelActive]}>
            {isMuted ? 'Unmute' : 'Mute'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, isSpeaker && styles.controlBtnActive]}
          onPress={() => setIsSpeaker(!isSpeaker)}
        >
          <Text style={styles.controlIcon}>{isSpeaker ? '📢' : '🔈'}</Text>
          <Text style={[styles.controlLabel, isSpeaker && styles.controlLabelActive]}>
            Speaker
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlBtn} onPress={onOpenScript}>
          <Text style={styles.controlIcon}>🤖</Text>
          <Text style={styles.controlLabel}>AI Script</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlBtn}>
          <Text style={styles.controlIcon}>⌨️</Text>
          <Text style={styles.controlLabel}>Keypad</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlBtn}>
          <Text style={styles.controlIcon}>📝</Text>
          <Text style={styles.controlLabel}>Notes</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlBtn}>
          <Text style={styles.controlIcon}>⏸️</Text>
          <Text style={styles.controlLabel}>Hold</Text>
        </TouchableOpacity>
      </View>

      {/* End Call Button */}
      <View style={styles.endSection}>
        <TouchableOpacity style={styles.endBtn} onPress={onEndCall}>
          <Text style={styles.endIcon}>📵</Text>
          <Text style={styles.endText}>End Call</Text>
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
    paddingTop: 60, paddingBottom: 50, paddingHorizontal: 24,
    zIndex: 9999,
  },
  topSection: { alignItems: 'center' },
  connectedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(22, 163, 98, 0.15)',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    marginBottom: 28,
  },
  greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16a34a' },
  connectedText: { fontSize: 12, fontWeight: '700', color: '#4ade80' },
  avatarContainer: { marginBottom: 16 },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#2563eb',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#3b82f6',
  },
  avatarText: { color: '#ffffff', fontSize: 32, fontWeight: '900' },
  name: { fontSize: 24, fontWeight: '900', color: '#ffffff', marginBottom: 4 },
  phone: { fontSize: 14, color: '#94a3b8', fontWeight: '500', marginBottom: 16 },
  timerBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(22, 163, 98, 0.15)',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14,
  },
  timerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16a34a' },
  timerText: { fontSize: 22, fontWeight: '900', color: '#4ade80', fontVariant: ['tabular-nums'] },
  controlsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center', gap: 16,
    paddingHorizontal: 12,
  },
  controlBtn: {
    width: 90, height: 80, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'center', alignItems: 'center', gap: 6,
  },
  controlBtnActive: { backgroundColor: 'rgba(37, 99, 235, 0.3)' },
  controlIcon: { fontSize: 24 },
  controlLabel: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  controlLabelActive: { color: '#93c5fd' },
  endSection: { alignItems: 'center' },
  endBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#dc2626',
    paddingHorizontal: 32, paddingVertical: 16, borderRadius: 28,
    shadowColor: '#dc2626', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  endIcon: { fontSize: 20 },
  endText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});
