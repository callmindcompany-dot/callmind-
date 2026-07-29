import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Sparkles, Phone, X } from 'lucide-react-native';

interface IncomingAssignedCallProps {
  leadName: string;
  leadPhone: string;
  leadSource: string;
  aiScore: number;
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingAssignedCallScreen: React.FC<IncomingAssignedCallProps> = ({
  leadName,
  leadPhone,
  leadSource,
  aiScore,
  onAccept,
  onDecline,
}) => {
  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        {/* Animated Badge */}
        <View style={styles.badge}>
          <View style={styles.pulseDot} />
          <Text style={styles.badgeText}>Incoming Lead Assignment</Text>
        </View>

        {/* Lead Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {leadName.split(' ').map((n) => n[0]).join('')}
          </Text>
        </View>

        {/* Lead Details */}
        <Text style={styles.leadName}>{leadName}</Text>
        <Text style={styles.leadPhone}>{leadPhone}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaBadge}>
            <Text style={styles.metaText}>Source: {leadSource}</Text>
          </View>
          <View style={[styles.metaBadge, styles.aiBadge]}>
            <Sparkles size={12} color="#15803d" />
            <Text style={styles.aiText}>AI Intent: {aiScore}%</Text>
          </View>
        </View>

        <Text style={styles.instruction}>
          Admin has routed a high-intent hot lead to your SIM. Dial now to claim?
        </Text>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.declineBtn} onPress={onDecline}>
            <X size={16} color="#dc2626" />
            <Text style={styles.declineText}>Skip</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.acceptBtn} onPress={onAccept}>
            <Phone size={16} color="#ffffff" />
            <Text style={styles.acceptText}>Call Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 999,
  },
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 8,
    marginBottom: 20,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
  },
  leadName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 4,
  },
  leadPhone: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  metaBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
  },
  aiText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
  },
  instruction: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  declineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  declineText: {
    color: '#dc2626',
    fontSize: 15,
    fontWeight: '700',
  },
  acceptBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
