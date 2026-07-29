import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Clock, CheckCircle2 } from 'lucide-react-native';

interface ApprovalPendingProps {
  onBackToHome: () => void;
  onCheckStatus?: () => void;
  checkingStatus?: boolean;
}

export const ApprovalPending: React.FC<ApprovalPendingProps> = ({
  onBackToHome,
  onCheckStatus,
  checkingStatus = false,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Pending Clock Icon */}
        <View style={styles.iconContainer}>
          <Clock size={40} color="#d97706" />
        </View>

        {/* Title */}
        <Text style={styles.heading}>Approval Pending</Text>
        <Text style={styles.subheading}>
          Your join request has been sent to your administrator.
        </Text>

        {/* What's Next Card */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>What's Next?</Text>

          <View style={styles.stepRow}>
            <CheckCircle2 size={18} color="#d97706" />
            <Text style={styles.stepText}>Admin will review your profile request</Text>
          </View>
          <View style={styles.stepRow}>
            <CheckCircle2 size={18} color="#2563eb" />
            <Text style={styles.stepText}>Your account will be activated upon approval</Text>
          </View>
          <View style={styles.stepRow}>
            <CheckCircle2 size={18} color="#16a34a" />
            <Text style={styles.stepText}>You can start dialing leads right after approval</Text>
          </View>
        </View>

        <Text style={styles.timestamp}>Status: Waiting for Admin Confirmation</Text>
      </View>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        {onCheckStatus && (
          <TouchableOpacity style={styles.primaryButton} onPress={onCheckStatus} disabled={checkingStatus}>
            <Text style={styles.primaryButtonText}>
              {checkingStatus ? 'Checking Status...' : 'Check Approval Status'}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.secondaryButton} onPress={onBackToHome}>
          <Text style={styles.buttonText}>Sign Out / Change Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 80,
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  heading: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subheading: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 12,
  },
  boldText: {
    fontWeight: '700',
    color: '#0f172a',
  },
  infoCard: {
    width: '100%',
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 16,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  footer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#334155',
    fontSize: 16,
    fontWeight: '700',
  },
});
