import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';

interface JoinCompanyProps {
  onJoinSuccess: () => void;
  onBack: () => void;
}

export const JoinCompany: React.FC<JoinCompanyProps> = ({ onJoinSuccess, onBack }) => {
  const [joinCode, setJoinCode] = useState('');
  const [step, setStep] = useState<'input' | 'preview'>('input');

  const handleVerifyCode = () => {
    if (joinCode.trim().length < 6) {
      Alert.alert('Invalid Code', 'Please enter a valid 6-digit company join code.');
      return;
    }
    setStep('preview');
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backIcon}>←</Text>
      </TouchableOpacity>

      {step === 'input' ? (
        <View style={styles.content}>
          <View style={styles.headerIconContainer}>
            <Text style={styles.buildingIcon}>🏢</Text>
          </View>

          <Text style={styles.heading}>Join Company</Text>
          <Text style={styles.subheading}>
            Ask your admin for the 6-digit company join code or scan their QR code.
          </Text>

          {/* Code Input */}
          <View style={styles.inputCard}>
            <Text style={styles.label}>Enter Company Code</Text>
            <TextInput
              style={styles.codeInput}
              placeholder="e.g. 849201"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              maxLength={6}
              value={joinCode}
              onChangeText={setJoinCode}
            />
          </View>

          <TouchableOpacity style={styles.qrOptionButton}>
            <Text style={styles.qrOptionIcon}>📷</Text>
            <Text style={styles.qrOptionText}>Scan Admin QR Code Instead</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.headerIconContainer}>
            <Text style={styles.buildingIcon}>🏢</Text>
          </View>

          <Text style={styles.heading}>Company Found</Text>
          <Text style={styles.subheading}>
            Preview company details before submitting your join request.
          </Text>

          {/* Company Details Card */}
          <View style={styles.detailsCard}>
            <View style={styles.companyHeader}>
              <Text style={styles.companyName}>Astra Finserv Pvt. Ltd.</Text>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Industry</Text>
              <Text style={styles.detailValue}>Financial Services</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Admin</Text>
              <Text style={styles.detailValue}>Astra Admin</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Team Size</Text>
              <Text style={styles.detailValue}>120 Members</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>Pune, Maharashtra</Text>
            </View>
          </View>
        </View>
      )}

      {/* Footer Button */}
      <View style={styles.footer}>
        {step === 'input' ? (
          <TouchableOpacity style={styles.primaryButton} onPress={handleVerifyCode}>
            <Text style={styles.buttonText}>Verify Code</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryButton} onPress={onJoinSuccess}>
            <Text style={styles.buttonText}>Send Join Request</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 50,
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  backIcon: {
    fontSize: 20,
    color: '#0f172a',
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  headerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  buildingIcon: {
    fontSize: 32,
  },
  heading: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 8,
  },
  subheading: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
    lineHeight: 22,
    marginBottom: 32,
  },
  inputCard: {
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  codeInput: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 4,
  },
  qrOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
  },
  qrOptionIcon: {
    fontSize: 18,
  },
  qrOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  detailsCard: {
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 16,
  },
  companyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
  },
  companyName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  verifiedBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  footer: {
    gap: 16,
  },
  primaryButton: {
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
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
