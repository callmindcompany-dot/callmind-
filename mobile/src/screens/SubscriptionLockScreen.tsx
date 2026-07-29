import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface SubscriptionLockScreenProps {
  companyName: string;
  expiryDate: string;
  onContactAdmin: () => void;
}

export const SubscriptionLockScreen: React.FC<SubscriptionLockScreenProps> = ({
  companyName,
  expiryDate,
  onContactAdmin,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Lock Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.lockIcon}>🔒</Text>
        </View>

        {/* Title */}
        <Text style={styles.heading}>Workspace Suspended</Text>
        <Text style={styles.subheading}>
          <Text style={styles.companyName}>{companyName}</Text>'s subscription has expired or been paused by the admin.
        </Text>

        {/* Expiry Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Plan Status</Text>
            <View style={styles.expiredBadge}>
              <Text style={styles.expiredText}>Expired</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Expired On</Text>
            <Text style={styles.infoValue}>{expiryDate}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Company</Text>
            <Text style={styles.infoValue}>{companyName}</Text>
          </View>
        </View>

        {/* What You Can Do Card */}
        <View style={styles.stepsCard}>
          <Text style={styles.stepsTitle}>What You Can Do</Text>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={styles.stepText}>Contact your admin to renew the subscription</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>2</Text>
            <Text style={styles.stepText}>Wait for admin to reactivate the workspace</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={styles.stepText}>Once renewed, app will auto-unlock immediately</Text>
          </View>
        </View>
      </View>

      {/* Footer Action */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.contactButton} onPress={onContactAdmin}>
          <Text style={styles.contactButtonText}>📩 Contact Admin</Text>
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          Your data is safe. Nothing will be lost after renewal.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    paddingTop: 80,
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: 'space-between',
    zIndex: 9999,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  lockIcon: {
    fontSize: 44,
  },
  heading: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subheading: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
    marginBottom: 28,
  },
  companyName: {
    fontWeight: '700',
    color: '#0f172a',
  },
  infoCard: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  expiredBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  expiredText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },
  stepsCard: {
    width: '100%',
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#dbeafe',
    gap: 14,
  },
  stepsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e40af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 28,
    overflow: 'hidden',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  footer: {
    gap: 12,
  },
  contactButton: {
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
  contactButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
});
